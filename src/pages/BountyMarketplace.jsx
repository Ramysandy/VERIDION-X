import {
  Box, Container, VStack, HStack, Text, Button, Badge, SimpleGrid,
  Card, CardBody, Input, Heading, Divider, useToast, Spinner, Progress,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { ExternalLinkIcon, CopyIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'
import apiClient from '../api/client'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

function PSBTSigningFlow({ psbt, onUpdate }) {
  const [signing, setSigning] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const toast = useToast()

  const handleSign = async (nodeId) => {
    setSigning(true)
    try {
      const res = await apiClient.post('/bounty/psbt/sign', { psbtId: psbt.id, nodeId })
      onUpdate(res.data)
      toast({ title: `Node ${nodeId} signed`, status: 'success', duration: 2 })
    } catch (err) {
      toast({ title: 'Sign error', description: err.response?.data?.error || err.message, status: 'error', duration: 3 })
    } finally {
      setSigning(false)
    }
  }

  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      const res = await apiClient.post('/bounty/psbt/finalize', { psbtId: psbt.id })
      onUpdate(res.data)
      toast({ title: 'PSBT Finalized!', description: `TxID: ${res.data.txId?.slice(0, 16)}...`, status: 'success', duration: 4 })
    } catch (err) {
      toast({ title: 'Finalize error', description: err.response?.data?.error || err.message, status: 'error', duration: 3 })
    } finally {
      setFinalizing(false)
    }
  }

  const sigNodes = psbt.signatures?.map(s => s.nodeId) || []
  const progress = ((psbt.signatures?.length || 0) / psbt.requiredSignatures) * 100

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight={700} color="white">Multi-Party Signing</Text>
        <Badge bg="rgba(167,139,250,0.15)" color="#A78BFA" fontSize="xs" borderRadius="full" px={3}>
          {psbt.signatures?.length || 0}/{psbt.requiredSignatures} Signatures
        </Badge>
      </HStack>

      <Progress value={progress} size="sm" borderRadius="full"
        sx={{ '& > div': { bg: 'linear-gradient(90deg, #A78BFA, #FF6B2B)' }, bg: 'rgba(255,255,255,0.06)' }} />

      {/* Node signing cards */}
      <SimpleGrid columns={3} spacing={3}>
        {[1, 2, 3].map(nodeId => {
          const signed = sigNodes.includes(nodeId)
          return (
            <Box key={nodeId} p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg"
              border={`1px solid ${signed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`}
              textAlign="center">
              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Node {nodeId}</Text>
              <Box my={2}>
                {signed ? (
                  <Text fontSize="xl" color="#22C55E">✓</Text>
                ) : (
                  <Button size="xs" onClick={() => handleSign(nodeId)} isLoading={signing}
                    bg="rgba(167,139,250,0.15)" color="#A78BFA" border="1px solid rgba(167,139,250,0.3)"
                    _hover={{ bg: 'rgba(167,139,250,0.25)' }} fontSize="2xs">
                    Sign
                  </Button>
                )}
              </Box>
              <Text fontSize="2xs" color={signed ? '#22C55E' : 'rgba(255,255,255,0.35)'}>
                {signed ? 'Committed' : 'Awaiting'}
              </Text>
            </Box>
          )
        })}
      </SimpleGrid>

      {psbt.status === 'READY_TO_FINALIZE' && (
        <Button onClick={handleFinalize} isLoading={finalizing}
          className="shimmer-btn" bg="linear-gradient(135deg, #A78BFA, #FF6B2B)"
          color="white" fontWeight={700} size="sm" borderRadius="10px">
          Finalize & Aggregate Signatures →
        </Button>
      )}

      {psbt.status === 'FINALIZED' && psbt.finalizedTx && (
        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(34,197,94,0.2)">
          <HStack spacing={2} mb={2}>
            <Text fontSize="xs" color="#22C55E" fontWeight={700}>Finalized Transaction</Text>
            <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full">BIP-340</Badge>
          </HStack>
          <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.7)" wordBreak="break-all">
            TxID: {psbt.finalizedTx.txId}
          </Text>
          <Text fontSize="2xs" color="rgba(255,255,255,0.5)" mt={1}>
            Size: {psbt.finalizedTx.size} bytes · Signature valid: {psbt.finalizedTx.valid ? '✓' : '✗'}
          </Text>
        </Box>
      )}
    </VStack>
  )
}

export default function BountyMarketplace() {
  const navigate = useNavigate()
  const toast = useToast()
  const [wallet, setWallet] = useState(null)
  const [bounties, setBounties] = useState([])
  const [stats, setStats] = useState(null)
  const [chain, setChain] = useState([])
  const [newCompany, setNewCompany] = useState('')
  const [newStake, setNewStake] = useState('50000')
  const [creating, setCreating] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [activePSBT, setActivePSBT] = useState(null)
  const [creatingPSBT, setCreatingPSBT] = useState(false)

  const setAuditCompany = useAuditStore((s) => s.setAuditCompany)

  // Load marketplace data
  const loadMarketplace = useCallback(async () => {
    try {
      const [mktRes, chainRes] = await Promise.all([
        apiClient.get('/bounty/marketplace'),
        apiClient.get('/bounty/opreturn/chain'),
      ])
      setBounties(mktRes.data.bounties || [])
      setStats(mktRes.data.stats)
      setChain(chainRes.data.chain || [])
    } catch {
      // Marketplace not loaded yet is ok
    }
  }, [])

  useEffect(() => { loadMarketplace() }, [loadMarketplace])

  const handleCreateWallet = async () => {
    setLoadingWallet(true)
    try {
      const res = await apiClient.post('/bounty/wallet/create')
      setWallet(res.data)
      // Check balance
      const balRes = await apiClient.get(`/bounty/wallet/${res.data.address}/balance`)
      setWallet(w => ({ ...w, ...balRes.data }))
      toast({ title: 'Wallet created', description: `P2TR: ${res.data.address.slice(0, 20)}...`, status: 'success', duration: 3 })
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3 })
    } finally {
      setLoadingWallet(false)
    }
  }

  const handleCreateBounty = async () => {
    if (!newCompany.trim()) {
      toast({ title: 'Enter a company name', status: 'warning', duration: 2 })
      return
    }
    if (!wallet) {
      toast({ title: 'Wallet required', description: 'Generate a Taproot wallet first to stake sats', status: 'warning', duration: 3 })
      return
    }
    setCreating(true)
    try {
      const res = await apiClient.post('/bounty/create', {
        company: newCompany.trim(),
        stakeAmount: parseInt(newStake) || 50000,
        creatorAddress: wallet?.address,
      })
      toast({ title: 'Bounty created!', description: `${res.data.id} — ${res.data.stakeAmount} sats staked`, status: 'success', duration: 3 })
      setNewCompany('')
      loadMarketplace()
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3 })
    } finally {
      setCreating(false)
    }
  }

  const handleClaimBounty = async (bountyId, company) => {
    if (!wallet) {
      toast({ title: 'Wallet required', description: 'Generate a Taproot wallet first (left panel)', status: 'warning', duration: 3 })
      return
    }
    try {
      await apiClient.post('/bounty/claim', { bountyId, investigatorAddress: wallet?.address })
      toast({ title: 'Bounty claimed!', description: 'Starting audit...', status: 'success', duration: 2 })
      setAuditCompany(company)
      navigate('/audit')
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3 })
    }
  }

  const handleCreatePSBT = async () => {
    if (!wallet) {
      toast({ title: 'Wallet required', description: 'Generate a Taproot wallet first', status: 'warning', duration: 3 })
      return
    }
    setCreatingPSBT(true)
    try {
      const res = await apiClient.post('/bounty/psbt/create', {
        inputAddress: wallet?.address,
        amount: 10000,
      })
      setActivePSBT(res.data)
      toast({ title: 'PSBT created', description: `${res.data.id} — awaiting signatures`, status: 'info', duration: 3 })
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3 })
    } finally {
      setCreatingPSBT(false)
    }
  }

  const copyAddr = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address)
      toast({ title: 'Address copied', status: 'success', duration: 2 })
    }
  }

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" py={8} position="relative" overflow="hidden">
      <Box className="orb orb-orange" style={{ top: '5%', right: '10%', width: 300, height: 300 }} />
      <Box className="orb orb-purple" style={{ bottom: '20%', left: '-3%', width: 250, height: 250 }} />

      <Container maxW="container.xl">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <VStack spacing={8} align="stretch">

            {/* Header */}
            <MotionBox variants={fadeUp}>
              <VStack spacing={3} textAlign="center">
                <Badge bg="rgba(167,139,250,0.15)" color="#A78BFA" borderRadius="full" px={4} py={1}
                  border="1px solid rgba(167,139,250,0.3)" fontSize="xs" letterSpacing="widest">
                  BOUNTY MARKETPLACE
                </Badge>
                <Heading size="xl" className="gradient-text logo-font" letterSpacing="0.04em">
                  Investigation Bounties
                </Heading>
                <Text color="rgba(255,255,255,0.6)" maxW="600px" fontSize="sm">
                  Stake tBTC to fund ESG fraud investigations. Investigators earn bounties by completing
                  FROST oracle audits. Payouts via Tapscript timelock claims.
                </Text>
              </VStack>
            </MotionBox>

            {/* How It Works Guide */}
            <MotionBox variants={fadeUp}>
              <Card className="glass" border="1px solid rgba(167,139,250,0.15)">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack spacing={2}>
                      <Text fontWeight={700} color="white" fontSize="sm">How It Works</Text>
                      <Badge bg="rgba(91,127,255,0.15)" color="#5B7FFF" fontSize="2xs" borderRadius="full" px={2}>GUIDE</Badge>
                    </HStack>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                      {[
                        { step: '1', title: 'Create Wallet', desc: 'Generate a P2TR (Taproot) testnet wallet to hold your tBTC', color: '#FBBF24' },
                        { step: '2', title: 'Post a Bounty', desc: 'Name a company & stake sats as reward for the investigation', color: '#FF6B2B' },
                        { step: '3', title: 'Claim & Audit', desc: 'Pick an open bounty, run a full FROST oracle audit on the company', color: '#22C55E' },
                        { step: '4', title: 'Earn Payout', desc: 'When a bounty is claimed, 1000 sats are locked in the Lightning escrow wallet. On audit completion, they auto-release to the investigator via Bitcoin Lightning — instant, no intermediary.', color: '#A78BFA' },
                      ].map(({ step, title, desc, color }) => (
                        <Box key={step} p={3} bg="rgba(0,0,0,0.25)" borderRadius="lg" border={`1px solid ${color}25`}>
                          <HStack spacing={2} mb={1}>
                            <Box w="20px" h="20px" borderRadius="full" bg={`${color}22`}
                              display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                              <Text fontSize="xs" fontWeight={800} color={color}>{step}</Text>
                            </Box>
                            <Text fontSize="xs" fontWeight={700} color="white">{title}</Text>
                          </HStack>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.55)" lineHeight={1.5}>{desc}</Text>
                        </Box>
                      ))}
                    </SimpleGrid>

                    {/* Jargon Glossary */}
                    <Accordion allowToggle>
                      <AccordionItem border="none">
                        <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                          <Text fontSize="xs" color="rgba(255,255,255,0.5)" flex={1} textAlign="left">
                            Glossary — What do these terms mean?
                          </Text>
                          <AccordionIcon color="rgba(255,255,255,0.4)" />
                        </AccordionButton>
                        <AccordionPanel px={0} pt={2}>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                            {[
                              { term: 'tBTC', def: 'Test Bitcoin — fake BTC on testnet for development, no real money involved' },
                              { term: 'Sats', def: 'Satoshis — the smallest unit of Bitcoin (1 BTC = 100,000,000 sats)' },
                              { term: 'PSBT', def: 'Partially Signed Bitcoin Transaction — allows multiple parties to sign a tx before broadcasting' },
                              { term: 'FROST', def: 'Flexible Round-Optimized Schnorr Threshold — multi-party signature scheme (2-of-3 nodes must agree)' },
                              { term: 'P2TR', def: 'Pay-to-Taproot — Bitcoin address type supporting advanced scripting (BIP-341)' },
                              { term: 'Tapscript', def: 'Smart contract-like spending conditions on Bitcoin (e.g., timelocks, multi-sig recovery)' },
                              { term: 'OP_RETURN', def: 'Bitcoin output that stores arbitrary data on-chain, used here for verdict inscriptions' },
                              { term: 'Escrow', def: 'Funds held in a locked address until audit conditions are met' },
                            ].map(({ term, def }) => (
                              <HStack key={term} spacing={2} align="start" p={1.5} bg="rgba(0,0,0,0.15)" borderRadius="md">
                                <Badge bg="rgba(255,107,43,0.15)" color="#FF9B51" fontSize="2xs" borderRadius="sm" px={1.5} flexShrink={0}>{term}</Badge>
                                <Text fontSize="2xs" color="rgba(255,255,255,0.5)" lineHeight={1.4}>{def}</Text>
                              </HStack>
                            ))}
                          </SimpleGrid>
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  </VStack>
                </CardBody>
              </Card>
            </MotionBox>

            {/* Stats Bar */}
            {stats && (
              <MotionBox variants={fadeUp}>
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
                  {[
                    { label: 'Total Bounties', value: stats.total, color: '#FF6B2B' },
                    { label: 'Open', value: stats.open, color: '#22C55E' },
                    { label: 'Claimed', value: stats.claimed, color: '#FBBF24' },
                    { label: 'Completed', value: stats.completed, color: '#A78BFA' },
                    { label: 'Total Staked', value: `${(stats.totalStaked / 1e8).toFixed(6)} tBTC`, color: '#FF9B51' },
                  ].map(({ label, value, color }) => (
                    <Box key={label} className="glass" p={4} borderRadius="16px" textAlign="center">
                      <Text fontSize="2xs" color="rgba(255,255,255,0.55)">{label}</Text>
                      <Text fontSize="xl" fontWeight={900} color={color}>{value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </MotionBox>
            )}

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              {/* Left: Wallet + Create Bounty */}
              <VStack spacing={5} align="stretch">
                {/* Wallet Card */}
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #FBBF24">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <Text fontWeight={700} color="white" fontSize="sm">Testnet Wallet</Text>
                        <Badge bg="rgba(251,191,36,0.15)" color="#FBBF24" fontSize="2xs" borderRadius="full" px={2}>P2TR</Badge>
                      </HStack>

                      {!wallet ? (
                        <Button onClick={handleCreateWallet} isLoading={loadingWallet}
                          bg="rgba(251,191,36,0.15)" color="#FBBF24" border="1px solid rgba(251,191,36,0.3)"
                          _hover={{ bg: 'rgba(251,191,36,0.25)' }} size="sm" borderRadius="10px" fontWeight={700}>
                          Generate Taproot Wallet
                        </Button>
                      ) : (
                        <VStack align="stretch" spacing={3}>
                          <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(251,191,36,0.15)">
                            <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>Address</Text>
                            <HStack>
                              <Text fontSize="2xs" fontFamily="mono" color="#FBBF24" wordBreak="break-all" flex={1}>
                                {wallet.address}
                              </Text>
                              <Button size="xs" variant="ghost" onClick={copyAddr} color="rgba(255,255,255,0.5)">
                                <CopyIcon />
                              </Button>
                            </HStack>
                          </Box>
                          <SimpleGrid columns={2} spacing={2}>
                            <Box p={2} bg="rgba(0,0,0,0.2)" borderRadius="md" textAlign="center">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Balance</Text>
                              <Text fontSize="md" fontWeight={800} color="#FBBF24">{wallet.totalSats || 0}</Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">sats</Text>
                            </Box>
                            <Box p={2} bg="rgba(0,0,0,0.2)" borderRadius="md" textAlign="center">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">UTXOs</Text>
                              <Text fontSize="md" fontWeight={800} color="white">{wallet.utxoCount || 0}</Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">unspent</Text>
                            </Box>
                          </SimpleGrid>
                          <Text as="a" href={wallet.explorerUrl} target="_blank" rel="noopener noreferrer"
                            fontSize="2xs" color="#5B7FFF" _hover={{ textDecoration: 'underline' }} textAlign="center">
                            View on mempool.space <ExternalLinkIcon mx={1} boxSize={3} />
                          </Text>
                        </VStack>
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>

                {/* Create Bounty Card */}
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #FF6B2B">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Text fontWeight={700} color="white" fontSize="sm">Create Investigation Bounty</Text>
                      <Input placeholder="Company to investigate" value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        bg="rgba(0,0,0,0.3)" border="1px solid rgba(255,107,43,0.2)"
                        color="white" _placeholder={{ color: 'rgba(255,255,255,0.35)' }}
                        borderRadius="10px" size="sm" _focus={{ borderColor: '#FF6B2B' }} />
                      <Input placeholder="Stake amount (sats)" value={newStake} type="number"
                        onChange={(e) => setNewStake(e.target.value)}
                        bg="rgba(0,0,0,0.3)" border="1px solid rgba(255,107,43,0.2)"
                        color="white" _placeholder={{ color: 'rgba(255,255,255,0.35)' }}
                        borderRadius="10px" size="sm" _focus={{ borderColor: '#FF6B2B' }} />
                      <Button onClick={handleCreateBounty} isLoading={creating}
                        className="shimmer-btn" bg="linear-gradient(135deg, #FF6B2B, #FBBF24)"
                        color="white" fontWeight={700} size="sm" borderRadius="10px">
                        Stake & Create Bounty
                      </Button>
                    </VStack>
                  </CardBody>
                </MotionCard>

                {/* PSBT Card */}
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #A78BFA">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <Text fontWeight={700} color="white" fontSize="sm">PSBT Multi-Party Signing</Text>
                        <Badge bg="rgba(167,139,250,0.15)" color="#A78BFA" fontSize="2xs" borderRadius="full" px={2}>BIP-174</Badge>
                      </HStack>

                      {!activePSBT ? (
                        <VStack spacing={2}>
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">
                            Create a Partially Signed Bitcoin Transaction for FROST multi-party approval.
                          </Text>
                          <Button onClick={handleCreatePSBT} isLoading={creatingPSBT}
                            bg="rgba(167,139,250,0.15)" color="#A78BFA" border="1px solid rgba(167,139,250,0.3)"
                            _hover={{ bg: 'rgba(167,139,250,0.25)' }} size="sm" borderRadius="10px" fontWeight={700} w="full">
                            Create PSBT
                          </Button>
                        </VStack>
                      ) : (
                        <PSBTSigningFlow psbt={activePSBT} onUpdate={setActivePSBT} />
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>
              </VStack>

              {/* Center: Active Bounties */}
              <VStack spacing={5} align="stretch">
                <MotionBox variants={fadeUp}>
                  <Text fontWeight={700} color="white" fontSize="sm" mb={3}>Active Bounties</Text>
                  <VStack spacing={3}>
                    {bounties.length === 0 ? (
                      <Box className="glass" p={8} borderRadius="16px" textAlign="center" w="full">
                        <Text color="rgba(255,255,255,0.45)" fontSize="sm">No bounties yet — create one to start</Text>
                      </Box>
                    ) : (
                      bounties.map(bounty => (
                        <Box key={bounty.id} className="glass card-hover" p={5} borderRadius="16px" w="full"
                          border={`1px solid ${bounty.status === 'OPEN' ? 'rgba(34,197,94,0.2)' : bounty.status === 'COMPLETED' ? 'rgba(167,139,250,0.2)' : 'rgba(251,191,36,0.2)'}`}>
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontWeight={700} color="white" fontSize="sm">{bounty.company}</Text>
                                <Badge
                                  bg={bounty.status === 'OPEN' ? 'rgba(34,197,94,0.15)' : bounty.status === 'COMPLETED' ? 'rgba(167,139,250,0.15)' : 'rgba(251,191,36,0.15)'}
                                  color={bounty.status === 'OPEN' ? '#22C55E' : bounty.status === 'COMPLETED' ? '#A78BFA' : '#FBBF24'}
                                  fontSize="2xs" borderRadius="full" px={2}>
                                  {bounty.status}
                                </Badge>
                              </HStack>
                              <Text fontSize="xs" fontFamily="mono" color="rgba(255,255,255,0.4)">{bounty.id}</Text>
                            </HStack>

                            <Text fontSize="xs" color="rgba(255,255,255,0.6)">{bounty.description}</Text>

                            <HStack justify="space-between">
                              <HStack spacing={4}>
                                <VStack spacing={0}>
                                  <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Stake</Text>
                                  <Text fontSize="sm" fontWeight={800} color="#FBBF24">{bounty.stakeAmount.toLocaleString()} sats</Text>
                                </VStack>
                                <VStack spacing={0}>
                                  <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Escrow</Text>
                                  <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.6)">
                                    {bounty.escrowAddress?.slice(0, 14)}...
                                  </Text>
                                </VStack>
                              </HStack>
                              {bounty.status === 'OPEN' && (
                                <Button size="sm" onClick={() => handleClaimBounty(bounty.id, bounty.company)}
                                  bg="rgba(34,197,94,0.15)" color="#22C55E" border="1px solid rgba(34,197,94,0.3)"
                                  _hover={{ bg: 'rgba(34,197,94,0.3)', transform: 'scale(1.02)' }}
                                  transition="all 0.2s" cursor="pointer"
                                  borderRadius="8px" fontWeight={700} px={5}>
                                  Claim & Audit →
                                </Button>
                              )}
                            </HStack>

                            {bounty.result && (
                              <HStack spacing={2} pt={1}>
                                <Badge bg={bounty.result.fraudDetected ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}
                                  color={bounty.result.fraudDetected ? '#FCA5A5' : '#22C55E'} fontSize="2xs" borderRadius="full" px={2}>
                                  {bounty.result.fraudDetected ? 'FRAUD' : 'CLEAN'}
                                </Badge>
                                <Text fontSize="2xs" color="rgba(255,255,255,0.5)">Risk: {bounty.result.riskScore}/100</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>
                      ))
                    )}
                  </VStack>
                </MotionBox>
              </VStack>

              {/* Right: OP_RETURN Chain */}
              <VStack spacing={5} align="stretch">
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #22C55E">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <Text fontWeight={700} color="white" fontSize="sm">Recursive OP_RETURN Chain</Text>
                        <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>
                          {chain.length} entries
                        </Badge>
                      </HStack>

                      <Text fontSize="xs" color="rgba(255,255,255,0.55)">
                        Immutable linked list of verdicts — each OP_RETURN references the previous txid.
                      </Text>

                      {chain.length === 0 ? (
                        <Box p={4} bg="rgba(0,0,0,0.2)" borderRadius="lg" textAlign="center">
                          <Text fontSize="xs" color="rgba(255,255,255,0.4)">Chain empty — complete a bounty to start</Text>
                        </Box>
                      ) : (
                        <VStack spacing={2}>
                          {chain.map((entry, i) => (
                            <Box key={i} w="full" position="relative">
                              {i > 0 && (
                                <Box position="absolute" top="-8px" left="16px" w="2px" h="8px" bg="rgba(34,197,94,0.3)" />
                              )}
                              <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg"
                                border="1px solid rgba(34,197,94,0.15)" position="relative">
                                <HStack spacing={2} mb={1}>
                                  <Box w="8px" h="8px" borderRadius="full"
                                    bg={entry.chainIndex === 'GENESIS' ? '#FF6B2B' : '#22C55E'} flexShrink={0} />
                                  <Text fontSize="2xs" fontWeight={700} color={entry.chainIndex === 'GENESIS' ? '#FF6B2B' : '#22C55E'}>
                                    {entry.chainIndex === 'GENESIS' ? 'GENESIS' : `BLOCK ${i}`}
                                  </Text>
                                </HStack>
                                <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.6)" wordBreak="break-all">
                                  {entry.inscription}
                                </Text>
                                <HStack mt={1} spacing={2}>
                                  <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                                    TxID: {entry.txId?.slice(0, 16)}...
                                  </Text>
                                  {entry.linkedTo && (
                                    <Text fontSize="2xs" color="rgba(167,139,250,0.7)">
                                      ← {entry.linkedTo}
                                    </Text>
                                  )}
                                </HStack>
                              </Box>
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>

                {/* Tapscript Paths Info */}
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #F59E0B">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Text fontWeight={700} color="white" fontSize="sm">Escrow Tapscript Paths</Text>
                      <Text fontSize="xs" color="rgba(255,255,255,0.55)">
                        BIP-342 spending conditions for bounty payouts
                      </Text>
                      {[
                        { name: 'Key-Path Spend', desc: 'FROST 2/3 aggregate key (default)', icon: '🔐', color: '#A78BFA' },
                        { name: 'Timelock Claim', desc: 'After 144 blocks (~24h) with key sig', icon: '⏱️', color: '#FBBF24' },
                        { name: 'Multi-Sig Recovery', desc: '2-of-3 oracle node recovery', icon: '🔑', color: '#FF6B2B' },
                        { name: 'Hash Lock', desc: 'Reveal verdict preimage + signature', icon: '🔒', color: '#22C55E' },
                      ].map(({ name, desc, icon, color }) => (
                        <HStack key={name} p={2} bg="rgba(0,0,0,0.2)" borderRadius="md" spacing={3}
                          border={`1px solid ${color}22`}>
                          <Text fontSize="lg">{icon}</Text>
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="xs" color="white" fontWeight={600}>{name}</Text>
                            <Text fontSize="2xs" color="rgba(255,255,255,0.5)">{desc}</Text>
                          </VStack>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </MotionCard>
              </VStack>
            </SimpleGrid>

          </VStack>
        </motion.div>
      </Container>
    </Box>
  )
}
