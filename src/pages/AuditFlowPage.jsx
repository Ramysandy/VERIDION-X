import {
  Container, VStack, HStack, Heading, Text, Card, CardBody,
  Badge, Box, SimpleGrid, Divider, Button,
} from '@chakra-ui/react'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'
import OracleTerminal from '../components/OracleTerminal'

const MotionBox = motion(Box)

export default function AuditFlowPage() {
  const navigate = useNavigate()
  const hasStarted = useRef(false)

  const targetCompany = useAuditStore((s) => s.targetCompany)
  const setVerdict = useAuditStore((s) => s.setVerdict)
  const setNarrative = useAuditStore((s) => s.setNarrative)
  const setNostrNoteId = useAuditStore((s) => s.setNostrNoteId)
  const setEiaData = useAuditStore((s) => s.setEiaData)
  const setEpaData = useAuditStore((s) => s.setEpaData)
  const setSecData = useAuditStore((s) => s.setSecData)
  const setClaimData = useAuditStore((s) => s.setClaimData)
  const setOracleResults = useAuditStore((s) => s.setOracleResults)
  const setFrostSignature = useAuditStore((s) => s.setFrostSignature)
  const setBitcoinTx = useAuditStore((s) => s.setBitcoinTx)
  const setTaprootAddress = useAuditStore((s) => s.setTaprootAddress)
  const setGroupPubKey = useAuditStore((s) => s.setGroupPubKey)
  const setSatelliteData = useAuditStore((s) => s.setSatelliteData)
  const setMerkleTree = useAuditStore((s) => s.setMerkleTree)
  const setTapscriptInfo = useAuditStore((s) => s.setTapscriptInfo)
  const setError = useAuditStore((s) => s.setError)

  const [nodeLogs, setNodeLogs] = useState({ 1: [], 2: [], 3: [] })
  const [nodeStatus, setNodeStatus] = useState({ 1: 'waiting', 2: 'waiting', 3: 'waiting' })
  const [oracleInit, setOracleInit] = useState(null)
  const [consensus, setConsensus] = useState(null)
  const [signature, setSignature] = useState(null)
  const [transaction, setTransaction] = useState(null)
  const [phase, setPhase] = useState('CONNECTING') // CONNECTING, RUNNING, CONSENSUS, SIGNING, COMPLETE, ERROR
  const phaseRef = useRef('CONNECTING')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!targetCompany) return
    // Reset on retry
    if (retryCount > 0) {
      hasStarted.current = false
    }
    if (hasStarted.current) return
    hasStarted.current = true

    // Reset state
    setNodeLogs({ 1: [], 2: [], 3: [] })
    setNodeStatus({ 1: 'waiting', 2: 'waiting', 3: 'waiting' })
    setOracleInit(null)
    setConsensus(null)
    setSignature(null)
    setTransaction(null)
    setPhase('CONNECTING')
    phaseRef.current = 'CONNECTING'

    setClaimData({ company: targetCompany, claim: `${targetCompany}'s commitment to 100% renewable energy and carbon neutrality` })

    // VITE_API_URL already includes /api — strip it for SSE base, or fall back
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace(/\/api\/?$/, '')
    const source = new EventSource(`${baseUrl}/api/oracle/stream?company=${encodeURIComponent(targetCompany)}`)

    source.addEventListener('init', (e) => {
      const data = JSON.parse(e.data)
      setOracleInit(data)
      setTaprootAddress(data.taproot)
      setGroupPubKey(data.groupPubKey)
      setPhase('RUNNING')
      phaseRef.current = 'RUNNING'
      setNodeStatus({ 1: 'running', 2: 'running', 3: 'running' })
    })

    source.addEventListener('node-log', (e) => {
      const data = JSON.parse(e.data)
      setNodeLogs(prev => ({
        ...prev,
        [data.nodeId]: [...(prev[data.nodeId] || []), data]
      }))
      // Mark node running if first log
      setNodeStatus(prev => prev[data.nodeId] === 'waiting' ? { ...prev, [data.nodeId]: 'running' } : prev)
    })

    source.addEventListener('consensus', (e) => {
      const data = JSON.parse(e.data)
      setConsensus(data)
      setPhase('CONSENSUS')
      phaseRef.current = 'CONSENSUS'
      // Mark all nodes done
      setNodeStatus({ 1: 'done', 2: 'done', 3: 'done' })
    })

    source.addEventListener('nonce', (e) => {
      const data = JSON.parse(e.data)
      setNodeLogs(prev => ({
        ...prev,
        [data.nodeId]: [...(prev[data.nodeId] || []), { type: 'crypto', message: `Nonce commitment R = ${data.R.slice(0, 24)}...`, ts: Date.now() }]
      }))
    })

    source.addEventListener('signature', (e) => {
      const data = JSON.parse(e.data)
      setSignature(data)
      setFrostSignature(data)
      setPhase('SIGNING')
      phaseRef.current = 'SIGNING'
    })

    source.addEventListener('transaction', (e) => {
      const data = JSON.parse(e.data)
      setTransaction(data)
      setBitcoinTx(data)
    })

    source.addEventListener('merkle', (e) => {
      const data = JSON.parse(e.data)
      setMerkleTree(data)
    })

    source.addEventListener('tapscript', (e) => {
      const data = JSON.parse(e.data)
      setTapscriptInfo(data)
    })

    source.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      source.close()
      setPhase('COMPLETE')
      phaseRef.current = 'COMPLETE'

      // Populate store for ResultsPage
      const v = data.verdict || {}
      setVerdict({
        winner: !v.fraudDetected,
        contradictions: v.reasons?.length ?? 1,
        confidence: v.confidence ?? 80,
        riskScore: v.riskScore ?? 50,
        riskLevel: v.riskLevel ?? 'MEDIUM',
        claimedRenewable: 100,
        actualRenewable: data.eiaData?.renewablePercentage ?? 0,
        co2Intensity: data.epaData?.co2Intensity ?? 0,
        reasons: v.reasons || [],
        aiVerdict: v.verdict || 'ANALYZED',
      })
      setNarrative(v.narrative || '')
      if (data.eiaData) setEiaData({ renewable: data.eiaData.renewablePercentage, capacity: Math.round((data.eiaData.totalCapacity || 250000) / 1000), state: data.eiaData.state, source: data.eiaData.dataSource })
      if (data.epaData) setEpaData({ co2: data.epaData.co2Intensity, year: 2024, unit: data.epaData.unit, source: data.epaData.dataSource })
      if (data.secData) setSecData(data.secData)
      if (data.satelliteData) setSatelliteData(data.satelliteData)

      setOracleResults({
        nodes: data.consensus?.nodeVotes || [],
        consensus: data.consensus,
        signature: data.signature,
        transaction: data.transaction,
      })

      // Save leaderboard + nostr fallback ID
      const noteId = `note1frost${Math.random().toString(36).slice(2, 18)}`
      setNostrNoteId(noteId)
      const entry = { company: targetCompany, verdict: { riskScore: v.riskScore, riskLevel: v.riskLevel, winner: !v.fraudDetected, reasons: v.reasons }, narrative: v.narrative, nostrNoteId: noteId, timestamp: new Date().toISOString(), claim: `${targetCompany} ESG claims` }
      const existing = JSON.parse(localStorage.getItem('veridion_leaderboard') || '[]')
      const updated = [entry, ...existing.filter(x => x.company !== targetCompany)].slice(0, 20)
      localStorage.setItem('veridion_leaderboard', JSON.stringify(updated))

      setTimeout(() => navigate('/results'), 1800)
    })

    source.addEventListener('error', (e) => {
      // SSE connection error — only handle if not completed
      if (source.readyState === EventSource.CLOSED) return
      if (phaseRef.current === 'COMPLETE' || phaseRef.current === 'SIGNING') return
      try {
        if (e.data) {
          const data = JSON.parse(e.data)
          setError(data.message)
        }
      } catch { /* SSE reconnect attempt */ }
    })

    source.onerror = () => {
      // SSE fires onerror when server closes connection after complete — ignore those
      if (phaseRef.current === 'COMPLETE' || phaseRef.current === 'SIGNING' || phaseRef.current === 'CONSENSUS') return
      if (source.readyState === EventSource.CLOSED) return
      // Only set error if we never got past CONNECTING
      if (phaseRef.current === 'CONNECTING') {
        setPhase('ERROR')
        phaseRef.current = 'ERROR'
      }
      source.close()
    }

    return () => source.close()
  }, [targetCompany, retryCount])

  const phaseLabel = {
    CONNECTING: 'Connecting to Oracle Network...',
    RUNNING: 'Oracle Nodes Executing...',
    CONSENSUS: 'Consensus Reached',
    SIGNING: 'FROST Signature Aggregation',
    COMPLETE: 'Audit Finalized — Redirecting...',
    ERROR: 'Oracle Error',
  }

  const phaseColor = {
    CONNECTING: '#FBBF24',
    RUNNING: '#FF6B2B',
    CONSENSUS: '#22C55E',
    SIGNING: '#A78BFA',
    COMPLETE: '#22C55E',
    ERROR: '#EF4444',
  }

  const PHASES = ['CONNECTING', 'RUNNING', 'CONSENSUS', 'SIGNING', 'COMPLETE']
  const phaseIdx = PHASES.indexOf(phase)

  const handleRetry = () => {
    setRetryCount(c => c + 1)
  }

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" py={8} position="relative" overflow="hidden">
      <Box className="orb orb-orange" w="400px" h="400px" top="-80px" right="-80px" />
      <Box className="orb orb-purple" w="280px" h="280px" bottom="60px" left="-40px" />
      <Container maxW="container.xl" position="relative" zIndex={1}>
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}>
        <VStack spacing={5} align="stretch">

          {/* Header card */}
          <Card className="glass" border="1px solid rgba(255,107,43,0.2)">
            <CardBody py={4}>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                  <VStack align="start" spacing={1}>
                    <HStack spacing={3}>
                      <Text fontSize="xs" color="rgba(255,255,255,0.55)" textTransform="uppercase" letterSpacing="0.1em">FROST Oracle Audit</Text>
                      <Badge bg="rgba(167,139,250,0.15)" color="#A78BFA" fontSize="2xs" borderRadius="full" px={2}>2-of-3 Threshold</Badge>
                    </HStack>
                    <Heading as="h2" size="lg" color="white" fontFamily="heading">{targetCompany}</Heading>
                  </VStack>
                  <VStack align="end" spacing={0}>
                    {phase === 'ERROR' ? (
                      <Button size="sm" bg="rgba(239,68,68,0.15)" color="#EF4444" border="1px solid rgba(239,68,68,0.3)" borderRadius="full" onClick={handleRetry} _hover={{ bg: 'rgba(239,68,68,0.25)' }}>
                        Retry Oracle
                      </Button>
                    ) : (
                      <Badge
                        bg={`${phaseColor[phase]}22`} color={phaseColor[phase]}
                        border="1px solid" borderColor={`${phaseColor[phase]}44`}
                        px={3} py={1} fontSize="xs" borderRadius="full">
                        {phaseLabel[phase]}
                      </Badge>
                    )}
                    {oracleInit?.taproot?.testnet && (
                      <Text fontSize="2xs" color="rgba(255,255,255,0.45)" fontFamily="mono" mt={1}>
                        P2TR: {oracleInit.taproot.testnet.slice(0, 14)}...{oracleInit.taproot.testnet.slice(-6)}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                {/* Progress timeline */}
                <HStack spacing={0} w="full" pt={1}>
                  {['Connect', 'Execute', 'Satellite', 'Consensus', 'Sign', 'Done'].map((label, i) => (
                    <HStack key={label} flex={1} spacing={0}>
                      <VStack spacing={0.5}>
                        <Box
                          w="18px" h="18px" borderRadius="full"
                          bg={i <= phaseIdx ? `${phaseColor[phase]}` : 'rgba(255,255,255,0.06)'}
                          border="2px solid"
                          borderColor={i <= phaseIdx ? `${phaseColor[phase]}` : 'rgba(255,255,255,0.1)'}
                          display="flex" alignItems="center" justifyContent="center"
                          boxShadow={i === phaseIdx ? `0 0 12px ${phaseColor[phase]}44` : 'none'}
                        >
                          <Text fontSize="7px" color={i <= phaseIdx ? 'white' : 'rgba(255,255,255,0.3)'} fontWeight={800}>{i + 1}</Text>
                        </Box>
                        <Text fontSize="7px" color={i <= phaseIdx ? phaseColor[phase] : 'rgba(255,255,255,0.25)'} fontWeight={i === phaseIdx ? 700 : 400} letterSpacing="0.05em">{label}</Text>
                      </VStack>
                      {i < 5 && (
                        <Box flex={1} h="2px" mx={1} bg={i < phaseIdx ? phaseColor[phase] : 'rgba(255,255,255,0.06)'} borderRadius="full" />
                      )}
                    </HStack>
                  ))}
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* FROST info strip */}
          {oracleInit && (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              {[
                { label: 'Scheme', value: 'FROST', sub: 'Schnorr Threshold' },
                { label: 'Threshold', value: '2-of-3', sub: 'Byzantine fault tolerant' },
                { label: 'Group Key', value: oracleInit.groupPubKey?.slice(0,12) + '...', sub: 'BIP-340 x-only' },
                { label: 'Satellite', value: 'NASA', sub: 'POWER CERES/MERRA-2' },
              ].map(({ label, value, sub }) => (
                <Box key={label} className="glass" p={3} borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
                  <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing="0.08em">{label}</Text>
                  <Text fontSize="sm" color="white" fontWeight={700} fontFamily="mono">{value}</Text>
                  <Text fontSize="2xs" color="rgba(255,255,255,0.45)">{sub}</Text>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* 3 Oracle Terminal Panels */}
          <Box>
            <HStack mb={3} spacing={2}>
              <Text fontSize="xs" color="rgba(255,255,255,0.55)" textTransform="uppercase" letterSpacing="0.1em" fontWeight={700}>
                Oracle Nodes
              </Text>
              <Box flex={1} h="1px" bg="rgba(255,255,255,0.06)" />
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <OracleTerminal nodeId={1} logs={nodeLogs[1]} status={nodeStatus[1]} />
              <OracleTerminal nodeId={2} logs={nodeLogs[2]} status={nodeStatus[2]} />
              <OracleTerminal nodeId={3} logs={nodeLogs[3]} status={nodeStatus[3]} />
            </SimpleGrid>
          </Box>

          {/* Consensus Status */}
          {consensus && (
            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="glass" border={`1px solid ${consensus.fraudDetected ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`}>
                <CardBody py={4}>
                  <HStack justify="space-between" flexWrap="wrap" gap={3}>
                    <VStack align="start" spacing={1}>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="rgba(255,255,255,0.55)" textTransform="uppercase" letterSpacing="0.1em">Consensus</Text>
                        <Badge bg={consensus.fraudDetected ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'} color={consensus.fraudDetected ? '#EF4444' : '#22C55E'} fontSize="2xs" borderRadius="full" px={2}>
                          {consensus.fraudDetected ? 'FRAUD DETECTED' : 'CLEAN'}
                        </Badge>
                      </HStack>
                      <Text color="white" fontWeight={700} fontSize="md">
                        {consensus.fraudVotes}/{consensus.totalNodes} nodes agree — {consensus.consensusReached ? 'threshold met' : 'no consensus'}
                      </Text>
                    </VStack>
                    <HStack spacing={3}>
                      {consensus.nodeVotes?.map(v => (
                        <VStack key={v.id} spacing={0} px={3} py={2} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
                          <Text fontSize="2xs" color="rgba(255,255,255,0.5)">Node {v.id}</Text>
                          <Text fontSize="sm" fontWeight={800} color={v.fraud ? '#EF4444' : '#22C55E'}>{v.risk}</Text>
                          <Text fontSize="2xs" color={v.fraud ? '#EF4444' : '#22C55E'}>{v.fraud ? 'FRAUD' : 'CLEAN'}</Text>
                        </VStack>
                      ))}
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>
            </MotionBox>
          )}

          {/* FROST Signature */}
          {signature && (
            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="glass" borderLeft="4px solid #A78BFA">
                <CardBody py={4}>
                  <VStack align="start" spacing={3}>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color="#A78BFA" textTransform="uppercase" letterSpacing="0.1em" fontWeight={700}>FROST Schnorr Signature</Text>
                      {signature.valid && <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>VALID</Badge>}
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="full">
                      <Box>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>R (Nonce Point)</Text>
                        <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                          <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)" wordBreak="break-all">{signature.R}</Text>
                        </Box>
                      </Box>
                      <Box>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>s (Aggregated Scalar)</Text>
                        <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                          <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)" wordBreak="break-all">{signature.s}</Text>
                        </Box>
                      </Box>
                    </SimpleGrid>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                      Participating nodes: {signature.participatingNodes?.join(', ')} · Aggregate pubkey: {signature.aggregatePubKey?.slice(0,16)}...
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </MotionBox>
          )}

          {/* Bitcoin Transaction */}
          {transaction && (
            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Card className="glass" borderLeft="4px solid #FF6B2B">
                <CardBody py={4}>
                  <VStack align="start" spacing={3}>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color="#FF6B2B" textTransform="uppercase" letterSpacing="0.1em" fontWeight={700}>Bitcoin Taproot Transaction</Text>
                      <Badge bg="rgba(255,107,43,0.15)" color="#FF9B51" fontSize="2xs" borderRadius="full" px={2}>OP_RETURN</Badge>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="full">
                      <Box>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>TxID</Text>
                        <Text fontSize="2xs" fontFamily="mono" color="#FF9B51" wordBreak="break-all">{transaction.txId}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>Verdict Inscription</Text>
                        <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)">{transaction.opReturn}</Text>
                      </Box>
                    </SimpleGrid>
                    <HStack spacing={3} flexWrap="wrap">
                      <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Size: {transaction.size} bytes</Text>
                      <Divider orientation="vertical" h={3} borderColor="rgba(255,255,255,0.1)" />
                      <Text fontSize="2xs" color="rgba(255,255,255,0.45)">P2TR: {transaction.taprootAddress?.slice(0, 14)}...</Text>
                      <Divider orientation="vertical" h={3} borderColor="rgba(255,255,255,0.1)" />
                      <Text as="a" href={transaction.mempoolUrl} target="_blank" rel="noopener noreferrer"
                        fontSize="2xs" color="#5B7FFF" _hover={{ textDecoration: 'underline' }}>
                        View on mempool.space →
                      </Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </MotionBox>
          )}

          {/* Phase progress */}
          {phase === 'COMPLETE' && (
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} textAlign="center" py={4}>
              <Text color="#22C55E" fontWeight={700} fontSize="sm">
                Audit finalized — redirecting to results...
              </Text>
            </MotionBox>
          )}
        </VStack>
        </motion.div>
      </Container>
    </Box>
  )
}
