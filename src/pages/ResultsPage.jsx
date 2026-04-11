import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  CardBody,
  Button,
  Box,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  useToast,
  List,
  ListItem,
  ListIcon,
  Divider,
  Progress,
} from '@chakra-ui/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { CopyIcon, ExternalLinkIcon, WarningTwoIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { motion } from 'framer-motion'
import { useAuditStore } from '../store/auditStore'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }

export default function ResultsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const claim = useAuditStore((s) => s.claim)
  const verdict = useAuditStore((s) => s.verdict)
  const narrative = useAuditStore((s) => s.narrative)
  const nostrNoteId = useAuditStore((s) => s.nostrNoteId)
  const secData = useAuditStore((s) => s.secData)
  const payments = useAuditStore((s) => s.payments)
  const resetAudit = useAuditStore((s) => s.resetAudit)
  const oracleResults = useAuditStore((s) => s.oracleResults)
  const frostSignature = useAuditStore((s) => s.frostSignature)
  const bitcoinTx = useAuditStore((s) => s.bitcoinTx)
  const taprootAddress = useAuditStore((s) => s.taprootAddress)
  const groupPubKey = useAuditStore((s) => s.groupPubKey)

  const totalCost = payments.reduce((sum, p) => sum + p.sats, 0)
  const riskScore = verdict?.riskScore ?? 50
  const riskLevel = verdict?.riskLevel ?? 'MEDIUM'

  const handleCopy = () => {
    navigator.clipboard.writeText(nostrNoteId)
    toast({ title: 'Copied!', status: 'success', duration: 2, isClosable: true })
  }

  const handleNewAudit = () => { resetAudit(); navigate('/') }

  const handleShare = () => {
    window.open(`https://njump.me/${nostrNoteId}`, '_blank', 'noopener,noreferrer')
  }

  const handleSaveLeaderboard = () => {
    const entry = { company: claim?.company, claim: claim?.claim, verdict, narrative, nostrNoteId, timestamp: new Date().toISOString() }
    const existing = JSON.parse(localStorage.getItem('veridion_leaderboard') || '[]')
    const updated = [entry, ...existing.filter((e) => e.company !== claim?.company)].slice(0, 20)
    localStorage.setItem('veridion_leaderboard', JSON.stringify(updated))
    toast({ title: 'Saved to Hall of Shame', description: `${claim?.company} added`, status: 'success', duration: 3, isClosable: true })
  }

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" py={8} position="relative">
      {/* Floating orbs */}
      <Box className="orb orb-orange" style={{ top: '5%', right: '8%', width: 280, height: 280 }} />
      <Box className="orb orb-purple" style={{ bottom: '15%', left: '3%', width: 200, height: 200 }} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <Container maxW="container.lg">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <VStack spacing={8} align="stretch">

              {/* Verdict Banner */}
              <MotionCard
                variants={fadeUp}
                className="glass"
                borderLeft="6px solid"
                borderLeftColor={verdict?.winner ? '#22C55E' : '#EF4444'}
              >
                <CardBody>
                  <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                    <VStack align="start" spacing={2}>
                      <HStack spacing={3} flexWrap="wrap">
                        <Heading as="h2" size="lg" color="white" fontFamily="heading">
                          {verdict?.aiVerdict || (verdict?.winner ? 'VERIFIED \u2713' : 'GREENWASHING \u2717')}
                        </Heading>
                        <Badge
                          bg={riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'rgba(239,68,68,0.15)' : riskLevel === 'MEDIUM' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)'}
                          color={riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#EF4444' : riskLevel === 'MEDIUM' ? '#FBBF24' : '#22C55E'}
                          fontSize="sm" px={3} py={1} borderRadius="full">
                          {riskLevel} RISK
                        </Badge>
                      </HStack>
                      <Text color="rgba(255,255,255,0.65)" fontSize="sm">
                        {claim?.company}'s ESG claims {verdict?.winner ? 'align with' : 'contradict'} federal data
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontWeight={800} fontSize="3xl"
                        color={riskScore > 70 ? '#EF4444' : riskScore > 40 ? '#FBBF24' : '#22C55E'} lineHeight={1}>
                        {riskScore}
                      </Text>
                      <Text fontSize="xs" color="rgba(255,255,255,0.45)">Risk Score / 100</Text>
                    </VStack>
                  </HStack>
                  <Box mt={4}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" color="rgba(255,255,255,0.45)">Risk Meter</Text>
                      <Text fontSize="xs" fontWeight={700}
                        color={riskScore > 70 ? '#EF4444' : riskScore > 40 ? '#FBBF24' : '#22C55E'}>
                        {riskScore}/100
                      </Text>
                    </HStack>
                    <Progress value={riskScore}
                      colorScheme={riskScore > 70 ? 'red' : riskScore > 40 ? 'orange' : 'green'}
                      borderRadius="full" size="sm"
                      sx={{ '& > div': { background: riskScore > 70 ? '#EF4444' : riskScore > 40 ? 'linear-gradient(to right,#FF6B2B,#FBBF24)' : '#22C55E' } }} />
                  </Box>
                </CardBody>
              </MotionCard>

              {/* Summary Stats */}
              <MotionBox variants={fadeUp}>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {[
                    { label: 'Company', value: claim?.company, color: '#FF6B2B' },
                    { label: 'Contradictions', value: verdict?.contradictions ?? 0, color: (verdict?.contradictions ?? 0) > 0 ? '#EF4444' : '#22C55E' },
                    { label: 'Claimed vs Actual', value: `${verdict?.claimedRenewable ?? '--'}% vs ${verdict?.actualRenewable ?? '--'}%`, color: '#FF6B2B' },
                    { label: 'Confidence', value: `${verdict?.confidence ?? 0}%`, color: '#5B7FFF' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} className="glass" border="1px solid rgba(255,107,43,0.1)">
                      <CardBody py={4}>
                        <Stat>
                          <StatLabel color="rgba(255,255,255,0.5)" fontSize="xs">{label}</StatLabel>
                          <StatNumber color={color} fontSize="md" noOfLines={1}>{value}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </MotionBox>

              {/* Charts */}
              <MotionBox variants={fadeUp}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Card className="glass" border="1px solid rgba(255,107,43,0.1)">
                    <CardBody>
                      <Text fontWeight={700} color="white" mb={4} fontSize="sm">
                        Renewable Energy — Claimed vs Actual
                      </Text>
                      <Box h="200px">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Claimed', value: verdict?.claimedRenewable ?? 100 },
                              { name: 'Actual (EIA)', value: verdict?.actualRenewable ?? 45 },
                            ]}
                            margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                            <YAxis domain={[0, 100]} unit="%" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#0D1829', border: '1px solid rgba(255,107,43,0.3)', borderRadius: 8 }} formatter={(v) => `${v}%`} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                              <Cell fill="#FF6B2B" />
                              <Cell fill={verdict?.winner ? '#22C55E' : '#EF4444'} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardBody>
                  </Card>

                  <Card className="glass" border="1px solid rgba(255,107,43,0.1)">
                    <CardBody>
                      <Text fontWeight={700} color="white" mb={4} fontSize="sm">
                        Audit Confidence Score
                      </Text>
                      <Box h="200px" position="relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            cx="50%" cy="50%" innerRadius="60%" outerRadius="90%"
                            startAngle={180} endAngle={0}
                            data={[{ name: 'Confidence', value: verdict?.confidence ?? 0, fill: verdict?.winner ? '#22C55E' : '#FF6B2B' }]}
                          >
                            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.06)' }} />
                            <Tooltip contentStyle={{ background: '#0D1829', border: '1px solid rgba(255,107,43,0.3)', borderRadius: 8 }} formatter={(v) => `${v}%`} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <Box
                          position="absolute" top="50%" left="50%"
                          transform="translate(-50%, -20%)" textAlign="center"
                        >
                          <Text fontSize="2xl" fontWeight={800} color="white">
                            {verdict?.confidence ?? 0}%
                          </Text>
                          <Text fontSize="xs" color="rgba(255,255,255,0.45)">Confidence</Text>
                        </Box>
                      </Box>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </MotionBox>

              {/* Narrative */}
              <MotionCard variants={fadeUp} className="glass" border="1px solid rgba(255,107,43,0.1)">
                <CardBody>
                  <VStack align="start" spacing={4}>
                    <Heading as="h3" size="md" color="white" fontFamily="heading">
                      Analysis
                    </Heading>
                    <Text color="rgba(255,255,255,0.75)" lineHeight={1.8}>
                      {narrative || 'Analysis pending...'}
                    </Text>
                  </VStack>
                </CardBody>
              </MotionCard>

              {/* AI Key Findings */}
              {verdict?.reasons?.length > 0 && (
                <MotionCard variants={fadeUp} className="glass" border="1px solid rgba(255,107,43,0.1)">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Heading as="h3" size="sm" color="white" fontFamily="heading">Key Findings</Heading>
                      <List spacing={2} w="full">
                        {verdict.reasons.map((reason, i) => (
                          <ListItem key={i} fontSize="sm" color="rgba(255,255,255,0.75)">
                            <ListIcon as={verdict.winner ? CheckCircleIcon : WarningTwoIcon}
                              color={verdict.winner ? '#22C55E' : '#FF6B2B'} />
                            {reason}
                          </ListItem>
                        ))}
                      </List>
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

              {/* SEC Card */}
              {secData && (
                <MotionCard variants={fadeUp} className="glass" borderLeft="4px solid #5B7FFF">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" w="full">
                        <Heading as="h3" size="sm" color="white" fontFamily="heading">SEC EDGAR Filing</Heading>
                        <Badge
                          bg={secData.disclosureRisk === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'}
                          color={secData.disclosureRisk === 'HIGH' ? '#EF4444' : '#FBBF24'}
                          fontSize="xs" borderRadius="full" px={3}>
                          Disclosure Risk: {secData.disclosureRisk}
                        </Badge>
                      </HStack>
                      <Text color="rgba(255,255,255,0.65)" fontSize="sm">{secData.esgStatement}</Text>
                      {secData.edgarUrl && (
                        <Text as="a" href={secData.edgarUrl} target="_blank" rel="noopener noreferrer"
                          fontSize="xs" color="#5B7FFF" _hover={{ textDecoration: 'underline' }}>
                          View on SEC EDGAR <ExternalLinkIcon mx={1} boxSize={3} />
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

              {/* FROST Oracle Consensus */}
              {oracleResults?.consensus && (
                <MotionCard variants={fadeUp} className="glass" borderLeft="4px solid #A78BFA">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full" flexWrap="wrap">
                        <Heading as="h3" size="sm" color="white" fontFamily="heading">FROST Oracle Consensus</Heading>
                        <Badge
                          bg={oracleResults.consensus.fraudDetected ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}
                          color={oracleResults.consensus.fraudDetected ? '#EF4444' : '#22C55E'}
                          fontSize="xs" borderRadius="full" px={3}>
                          {oracleResults.consensus.fraudVotes}/3 — {oracleResults.consensus.fraudDetected ? 'FRAUD CONSENSUS' : 'CLEAN'}
                        </Badge>
                      </HStack>
                      <SimpleGrid columns={3} spacing={3} w="full">
                        {oracleResults.nodes?.map(n => (
                          <Box key={n.id} p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)" textAlign="center">
                            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Oracle Node {n.id}</Text>
                            <Text fontSize="xl" fontWeight={800} color={n.fraud ? '#EF4444' : '#22C55E'}>{n.risk}</Text>
                            <Badge bg={n.fraud ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'} color={n.fraud ? '#EF4444' : '#22C55E'} fontSize="2xs" borderRadius="full">{n.level}</Badge>
                          </Box>
                        ))}
                      </SimpleGrid>
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">
                        Scheme: FROST 2-of-3 Schnorr Threshold · Shamir's Secret Sharing + Lagrange Interpolation
                      </Text>
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

              {/* Bitcoin Taproot Proof */}
              {(frostSignature || bitcoinTx) && (
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #FF6B2B" borderLeft="4px solid #FBBF24">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <Heading as="h3" size="md" color="white" fontFamily="heading">
                        Bitcoin Taproot Proof
                      </Heading>

                      {frostSignature && (
                        <Box w="full">
                          <Text fontSize="xs" color="#A78BFA" fontWeight={700} mb={2}>FROST Schnorr Signature (BIP-340)</Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">R (Nonce Point)</Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.7)" wordBreak="break-all">{frostSignature.R}</Text>
                            </Box>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">s (Aggregated Scalar)</Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.7)" wordBreak="break-all">{frostSignature.s}</Text>
                            </Box>
                          </SimpleGrid>
                          {frostSignature.valid && (
                            <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2} mt={2}>
                              Signature Valid ✓
                            </Badge>
                          )}
                        </Box>
                      )}

                      {bitcoinTx && (
                        <Box w="full">
                          <Text fontSize="xs" color="#FF9B51" fontWeight={700} mb={2}>Taproot Transaction (BIP-341)</Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                            <Box>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">TxID</Text>
                              <Text fontSize="2xs" fontFamily="mono" color="#FF9B51" wordBreak="break-all">{bitcoinTx.txId}</Text>
                            </Box>
                            <Box>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">OP_RETURN Inscription</Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.7)">{bitcoinTx.opReturn}</Text>
                            </Box>
                          </SimpleGrid>
                          <HStack mt={2} spacing={3}>
                            {taprootAddress?.testnet && (
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                                P2TR: <Text as="span" fontFamily="mono" color="rgba(255,255,255,0.6)">{taprootAddress.testnet.slice(0, 20)}...</Text>
                              </Text>
                            )}
                            {bitcoinTx.mempoolUrl && (
                              <Text as="a" href={bitcoinTx.mempoolUrl} target="_blank" rel="noopener noreferrer"
                                fontSize="2xs" color="#5B7FFF" _hover={{ textDecoration: 'underline' }}>
                                View on mempool.space <ExternalLinkIcon mx={1} boxSize={3} />
                              </Text>
                            )}
                          </HStack>
                        </Box>
                      )}

                      {groupPubKey && (
                        <Text fontSize="2xs" color="rgba(255,255,255,0.3)">
                          FROST Group Key: {groupPubKey.slice(0, 24)}... · BIP-340 x-only
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

              {/* Nostr Proof */}
              <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #FF6B2B">
                <CardBody>
                  <VStack align="start" spacing={4}>
                    <Heading as="h3" size="md" color="white" fontFamily="heading">
                      Immutable Nostr Proof
                    </Heading>
                    <HStack w="full" spacing={2}>
                      <Box flex={1} p={3}
                        bg="rgba(0,0,0,0.3)" border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="md" fontFamily="mono" fontSize="xs"
                        color="rgba(255,255,255,0.7)" overflowX="auto">
                        {nostrNoteId}
                      </Box>
                      <Button leftIcon={<CopyIcon />} size="sm" onClick={handleCopy}
                        bg="rgba(255,107,43,0.15)" color="#FF9B51" border="1px solid rgba(255,107,43,0.3)"
                        _hover={{ bg: 'rgba(255,107,43,0.25)' }}>
                        Copy
                      </Button>
                    </HStack>
                    <Text fontSize="xs" color="rgba(255,255,255,0.4)">
                      Published to relay.damus.io, nos.lol, relay.nostr.band. Cryptographically signed — cannot be censored or deleted.
                    </Text>
                  </VStack>
                </CardBody>
              </MotionCard>

              <Divider borderColor="rgba(255,255,255,0.08)" />

              {/* Actions */}
              <MotionBox variants={fadeUp}>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  <Button onClick={handleNewAudit} className="shimmer-btn"
                    bg="linear-gradient(135deg,#FF6B2B,#FBBF24)" color="white" fontWeight={700}
                    size="sm" _hover={{ opacity: 0.9 }}>
                    New Audit
                  </Button>
                  <Button variant="outline" size="sm"
                    borderColor="rgba(91,127,255,0.4)" color="#5B7FFF"
                    _hover={{ bg: 'rgba(91,127,255,0.08)' }}
                    rightIcon={<ExternalLinkIcon />} onClick={handleShare}>
                    View on Nostr
                  </Button>
                  <Button variant="outline" size="sm"
                    borderColor="rgba(239,68,68,0.4)" color="#EF4444"
                    _hover={{ bg: 'rgba(239,68,68,0.08)' }}
                    onClick={handleSaveLeaderboard}>
                    Hall of Shame
                  </Button>
                  <Button variant="outline" size="sm"
                    borderColor="rgba(255,255,255,0.15)" color="rgba(255,255,255,0.6)"
                    _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                    onClick={() => navigate('/leaderboard')}>
                    Leaderboard
                  </Button>
                </SimpleGrid>
              </MotionBox>

              <Text fontSize="xs" color="rgba(255,255,255,0.25)" textAlign="center">
                Audit cost: {totalCost} sats · EIA + EPA + SEC EDGAR + Groq AI
              </Text>

            </VStack>
          </motion.div>
        </Container>
      </motion.div>
    </Box>
  )
}
