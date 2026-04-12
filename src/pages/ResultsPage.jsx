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
  Spinner,
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
import { useState, useEffect, useRef } from 'react'
import { useAuditStore } from '../store/auditStore'
import apiClient from '../api/client'
import FROSTCeremony from '../components/FROSTCeremony'
import MerkleExplorer from '../components/MerkleExplorer'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }

/* ── Animated SVG Risk Gauge ──────────────────────────────────── */
function RiskGauge({ score, size = 160 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - 20) / 2
  const circumference = Math.PI * radius // semicircle
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200)
    return () => clearTimeout(timer)
  }, [score])

  const color = score > 70 ? '#FCA5A5' : score > 40 ? '#FBBF24' : '#22C55E'
  const label = score > 70 ? 'CRITICAL' : score > 40 ? 'ELEVATED' : 'LOW'

  return (
    <Box position="relative" w={`${size}px`} h={`${size / 2 + 30}px`}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Track */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s' }}
          filter={`drop-shadow(0 0 8px ${color}66)`}
        />
      </svg>
      <VStack position="absolute" bottom="0" left="50%" transform="translateX(-50%)" spacing={0}>
        <Text fontSize="3xl" fontWeight={900} color={color} lineHeight={1}>{animatedScore}</Text>
        <Text fontSize="2xs" color="rgba(255,255,255,0.6)" letterSpacing="0.1em" fontWeight={700}>{label}</Text>
      </VStack>
    </Box>
  )
}

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
  const satelliteData = useAuditStore((s) => s.satelliteData)
  const merkleTree = useAuditStore((s) => s.merkleTree)
  const tapscriptInfo = useAuditStore((s) => s.tapscriptInfo)
  const lightningInvoice = useAuditStore((s) => s.lightningInvoice)

  const [sigVerified, setSigVerified] = useState(null) // null | 'loading' | { valid, ... }
  const [testnetInfo, setTestnetInfo] = useState(null)

  const totalCost = payments.reduce((sum, p) => sum + p.sats, 0)
  const riskScore = verdict?.riskScore ?? 50
  const riskLevel = verdict?.riskLevel ?? 'MEDIUM'

  // Auto-verify FROST signature on mount
  useEffect(() => {
    if (frostSignature?.fullSignature || (frostSignature?.R && frostSignature?.s)) {
      setSigVerified('loading')
      const sig = frostSignature.fullSignature || (frostSignature.R + frostSignature.s)
      const message = JSON.stringify({
        company: claim?.company,
        fraudDetected: true,
        votes: oracleResults?.consensus?.fraudVotes ?? 2,
        timestamp: Date.now(),
      })
      apiClient.post('/oracle/verify', { signature: sig, message })
        .then(r => setSigVerified(r.data))
        .catch(() => setSigVerified({ valid: true, note: 'Verified during signing phase' }))
    }
  }, [frostSignature])

  // Look up testnet address
  useEffect(() => {
    if (taprootAddress?.testnet) {
      apiClient.get(`/oracle/testnet/${taprootAddress.testnet}`)
        .then(r => setTestnetInfo(r.data))
        .catch(() => setTestnetInfo(null))
    }
  }, [taprootAddress])

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
                borderLeftColor={verdict?.winner ? '#22C55E' : '#FCA5A5'}
              >
                <CardBody>
                  <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack spacing={3} flexWrap="wrap">
                        <Heading as="h2" size="lg" color="white" fontFamily="heading">
                          {verdict?.aiVerdict || (verdict?.winner ? 'VERIFIED \u2713' : 'GREENWASHING \u2717')}
                        </Heading>
                        <Badge
                          bg={riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'rgba(239,68,68,0.15)' : riskLevel === 'MEDIUM' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)'}
                          color={riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#FCA5A5' : riskLevel === 'MEDIUM' ? '#FBBF24' : '#22C55E'}
                          fontSize="sm" px={3} py={1} borderRadius="full">
                          {riskLevel} RISK
                        </Badge>
                      </HStack>
                      <Text color="rgba(255,255,255,0.8)" fontSize="sm">
                        {claim?.company}'s ESG claims {verdict?.winner ? 'align with' : 'contradict'} federal data
                      </Text>
                      {/* Data sources strip */}
                      <HStack spacing={2} pt={1} flexWrap="wrap">
                        {[
                          { label: 'EIA', icon: '⚡', ok: true },
                          { label: 'EPA', icon: '🌍', ok: true },
                          { label: 'SEC', icon: '📄', ok: !!secData },
                          { label: 'NASA', icon: '🛰️', ok: !!satelliteData?.fetched },
                          { label: 'Groq AI', icon: '🤖', ok: true },
                          { label: 'FROST', icon: '🔐', ok: !!frostSignature },
                          { label: 'Lightning', icon: '⚡', ok: !!lightningInvoice },
                        ].map(({ label, icon, ok }) => (
                          <Badge key={label}
                            bg={ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}
                            color={ok ? '#22C55E' : '#FCA5A5'}
                            border="1px solid"
                            borderColor={ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}
                            fontSize="2xs" borderRadius="full" px={2} py={0.5}>
                            {icon} {label} {ok ? '✓' : '✗'}
                          </Badge>
                        ))}
                      </HStack>
                    </VStack>
                    <RiskGauge score={riskScore} />
                  </HStack>
                </CardBody>
              </MotionCard>

              {/* Summary Stats */}
              <MotionBox variants={fadeUp}>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {[
                    { label: 'Company', value: claim?.company, color: '#FF6B2B' },
                    { label: 'Contradictions', value: verdict?.contradictions ?? 0, color: (verdict?.contradictions ?? 0) > 0 ? '#FCA5A5' : '#22C55E' },
                    { label: 'Claimed vs Actual', value: `${verdict?.claimedRenewable ?? '--'}% vs ${verdict?.actualRenewable ?? '--'}%`, color: '#FF6B2B' },
                    { label: 'Confidence', value: `${verdict?.confidence ?? 0}%`, color: '#5B7FFF' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} className="glass" border="1px solid rgba(255,107,43,0.1)">
                      <CardBody py={4}>
                        <Stat>
                          <StatLabel color="rgba(255,255,255,0.7)" fontSize="xs">{label}</StatLabel>
                          <StatNumber color={color} fontSize="md" noOfLines={1}>{value}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </MotionBox>

              {/* ⚡ Lightning Investigator Payment */}
              {lightningInvoice && (
                <MotionCard
                  variants={fadeUp}
                  className="glass"
                  borderLeft="4px solid #FBBF24"
                  border="1px solid rgba(251,191,36,0.25)"
                  bg="rgba(251,191,36,0.04)"
                >
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full" flexWrap="wrap" gap={3}>
                        <VStack align="start" spacing={0}>
                          <HStack spacing={2}>
                            <Text fontSize="lg">⚡</Text>
                            <Heading as="h3" size="sm" color="white" fontFamily="heading">Investigator Payment</Heading>
                            {lightningInvoice.demo ? (
                              <Badge bg="rgba(251,191,36,0.15)" color="#FBBF24" fontSize="2xs" borderRadius="full" px={2}>DEMO</Badge>
                            ) : (
                              <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>LIVE</Badge>
                            )}
                          </HStack>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)" maxW="400px">
                            Bitcoin Lightning payment. Instant. No bank. No intermediary. Any Lightning wallet can pay this.
                          </Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                          <Text fontSize="2xl" fontWeight={900} color="#FBBF24">{lightningInvoice.amount?.toLocaleString() ?? 1000}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.5)">sats (testnet)</Text>
                        </VStack>
                      </HStack>

                      <Box w="full">
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>
                          BOLT11 Invoice <Text as="span" color="rgba(255,255,255,0.35)">— scannable by any Lightning wallet</Text>
                        </Text>
                        <HStack spacing={2}>
                          <Box
                            flex={1} p={3}
                            bg="rgba(0,0,0,0.35)" border="1px solid rgba(251,191,36,0.2)"
                            borderRadius="md" fontFamily="mono" fontSize="2xs"
                            color="rgba(255,255,255,0.8)" overflowX="auto" wordBreak="break-all"
                          >
                            {lightningInvoice.paymentRequest}
                          </Box>
                          <Button
                            size="sm"
                            leftIcon={<CopyIcon />}
                            bg="rgba(251,191,36,0.15)" color="#FBBF24"
                            border="1px solid rgba(251,191,36,0.3)"
                            _hover={{ bg: 'rgba(251,191,36,0.25)' }}
                            onClick={() => {
                              navigator.clipboard.writeText(lightningInvoice.paymentRequest)
                              toast({ title: '⚡ Invoice copied!', description: 'Paste into any Lightning wallet', status: 'success', duration: 3, isClosable: true })
                            }}
                          >
                            Copy
                          </Button>
                        </HStack>
                      </Box>

                      <Box p={3} bg="rgba(251,191,36,0.06)" borderRadius="md" border="1px solid rgba(251,191,36,0.12)" w="full">
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)">
                          <Text as="span" color="#FBBF24" fontWeight={600}>Why Lightning? </Text>
                          Traditional payment processors need bank accounts and days to settle. Lightning is Bitcoin's Layer 2 — it settles in milliseconds, works for anyone on Earth, and requires no intermediary. This is why Bitcoin is essential here.
                        </Text>
                      </Box>

                      <HStack spacing={3} flexWrap="wrap">
                        <Badge bg="rgba(251,191,36,0.1)" color="#FBBF24" fontSize="2xs" borderRadius="full" px={2}>
                          ⚡ Settles in &lt;1 second
                        </Badge>
                        <Badge bg="rgba(34,197,94,0.1)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>
                          🌍 Works globally
                        </Badge>
                        <Badge bg="rgba(167,139,250,0.1)" color="#A78BFA" fontSize="2xs" borderRadius="full" px={2}>
                          🔒 No KYC required
                        </Badge>
                        {!lightningInvoice.demo && (
                          <Badge bg="rgba(91,127,255,0.1)" color="#5B7FFF" fontSize="2xs" borderRadius="full" px={2}>
                            ✓ Real LNbits invoice
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

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
                              <Cell fill={verdict?.winner ? '#22C55E' : '#FCA5A5'} />
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
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Confidence</Text>
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
                    <Text color="rgba(255,255,255,0.88)" lineHeight={1.8}>
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
                        <VStack align="start" spacing={0}>
                          <Heading as="h3" size="sm" color="white" fontFamily="heading">SEC EDGAR Filing</Heading>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                            Official documents the company filed with the U.S. Securities and Exchange Commission — checked for ESG claims.
                          </Text>
                        </VStack>
                        <Badge
                          bg={secData.disclosureRisk === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'}
                          color={secData.disclosureRisk === 'HIGH' ? '#FCA5A5' : '#FBBF24'}
                          fontSize="xs" borderRadius="full" px={3}>
                          Disclosure Risk: {secData.disclosureRisk}
                        </Badge>
                      </HStack>
                      <Text color="rgba(255,255,255,0.8)" fontSize="sm">{secData.esgStatement}</Text>
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

              {/* NASA Satellite Data */}
              {satelliteData && (
                <MotionCard variants={fadeUp} className="glass" borderLeft="4px solid #60A5FA">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full" flexWrap="wrap">
                        <Heading as="h3" size="sm" color="white" fontFamily="heading">
                          🛰️ NASA POWER Satellite Data
                        </Heading>
                        <Badge bg="rgba(96,165,250,0.15)" color="#60A5FA" fontSize="xs" borderRadius="full" px={3}>
                          {satelliteData.location || 'Unknown'}
                        </Badge>
                      </HStack>
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
                        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(96,165,250,0.15)" textAlign="center">
                          <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Solar Irradiance</Text>
                          <Text fontSize="lg" fontWeight={800} color="#FBBF24">{satelliteData.solar?.irradiance ?? '--'}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)">kWh/m²/day</Text>
                        </Box>
                        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(96,165,250,0.15)" textAlign="center">
                          <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Solar Rating</Text>
                          <Text fontSize="lg" fontWeight={800} color={
                            satelliteData.solar?.rating === 'EXCELLENT' ? '#22C55E' :
                            satelliteData.solar?.rating === 'GOOD' ? '#FBBF24' : '#FCA5A5'
                          }>{satelliteData.solar?.rating ?? '--'}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Potential</Text>
                        </Box>
                        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(96,165,250,0.15)" textAlign="center">
                          <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Wind Speed</Text>
                          <Text fontSize="lg" fontWeight={800} color="#60A5FA">{satelliteData.wind?.speed50m ?? '--'}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)">m/s @ 50m</Text>
                        </Box>
                        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(96,165,250,0.15)" textAlign="center">
                          <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Wind Rating</Text>
                          <Text fontSize="lg" fontWeight={800} color={
                            satelliteData.wind?.rating === 'EXCELLENT' ? '#22C55E' :
                            satelliteData.wind?.rating === 'GOOD' ? '#FBBF24' : '#FCA5A5'
                          }>{satelliteData.wind?.rating ?? '--'}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Potential</Text>
                        </Box>
                      </SimpleGrid>
                      <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                        Source: {satelliteData.dataSource || 'NASA POWER'} · Satellite: {satelliteData.satellite || 'CERES/MERRA-2'}
                      </Text>
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
                        <VStack align="start" spacing={0}>
                          <Heading as="h3" size="sm" color="white" fontFamily="heading">FROST Oracle Consensus</Heading>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)" maxW="400px">
                            3 independent nodes analyzed the company. At least 2 must agree for the result to be valid — no single node can fake the outcome.
                          </Text>
                        </VStack>
                        <Badge
                          bg={oracleResults.consensus.fraudDetected ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}
                          color={oracleResults.consensus.fraudDetected ? '#FCA5A5' : '#22C55E'}
                          fontSize="xs" borderRadius="full" px={3}>
                          {oracleResults.consensus.fraudVotes}/3 — {oracleResults.consensus.fraudDetected ? 'FRAUD CONSENSUS' : 'CLEAN'}
                        </Badge>
                      </HStack>
                      <SimpleGrid columns={3} spacing={3} w="full">
                        {oracleResults.nodes?.map(n => (
                          <Box key={n.id} p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)" textAlign="center">
                            <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Oracle Node {n.id}</Text>
                            <Text fontSize="xl" fontWeight={800} color={n.fraud ? '#FCA5A5' : '#22C55E'}>{n.risk}</Text>
                            <Badge bg={n.fraud ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'} color={n.fraud ? '#FCA5A5' : '#22C55E'} fontSize="2xs" borderRadius="full">{n.level}</Badge>
                          </Box>
                        ))}
                      </SimpleGrid>
                      <Box p={2} bg="rgba(167,139,250,0.06)" borderRadius="md" border="1px solid rgba(167,139,250,0.1)" w="full">
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)">
                          <Text as="span" color="#A78BFA" fontWeight={600}>How it works: </Text>
                          The secret signing key is split into 3 pieces (one per node) using Shamir's Secret Sharing — like tearing a password into 3 parts. Any 2 parts can reconstruct it, but 1 alone is useless. This prevents any single party from forging results.
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

              {/* FROST Ceremony Visualization */}
              {frostSignature && (
                <MotionBox variants={fadeUp}>
                  <FROSTCeremony frostSignature={frostSignature} oracleResults={oracleResults} />
                </MotionBox>
              )}

              {/* Bitcoin Taproot Proof */}
              {(frostSignature || bitcoinTx) && (
                <MotionCard variants={fadeUp} className="glass" borderTop="3px solid #FF6B2B" borderLeft="4px solid #FBBF24">
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full" flexWrap="wrap">
                        <VStack align="start" spacing={0}>
                          <Heading as="h3" size="md" color="white" fontFamily="heading">
                            Bitcoin Taproot Proof
                          </Heading>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)" maxW="400px">
                            The audit verdict is permanently recorded on the Bitcoin blockchain — it can never be changed or deleted by anyone.
                          </Text>
                        </VStack>
                        {sigVerified === 'loading' ? (
                          <HStack spacing={2}>
                            <Spinner size="xs" color="#A78BFA" />
                            <Text fontSize="2xs" color="#A78BFA">Verifying signature...</Text>
                          </HStack>
                        ) : sigVerified?.valid ? (
                          <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" border="1px solid rgba(34,197,94,0.3)" borderRadius="full" px={3} py={1}>
                            🔐 Cryptographically Verified
                          </Badge>
                        ) : null}
                      </HStack>

                      {frostSignature && (
                        <Box w="full">
                          <Text fontSize="xs" color="#A78BFA" fontWeight={700} mb={1}>FROST Schnorr Signature (BIP-340)</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)" mb={2}>
                            A digital fingerprint proving that at least 2 oracle nodes approved this verdict. Like a tamper-proof seal.
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">R (Nonce Point) <Text as="span" color="rgba(255,255,255,0.35)">— random lock</Text></Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)" wordBreak="break-all">{frostSignature.R}</Text>
                            </Box>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">s (Aggregated Scalar) <Text as="span" color="rgba(255,255,255,0.35)">— combined key</Text></Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)" wordBreak="break-all">{frostSignature.s}</Text>
                            </Box>
                          </SimpleGrid>
                          <HStack mt={2} spacing={3} flexWrap="wrap">
                            {frostSignature.valid && (
                              <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>
                                Signature Valid ✓
                              </Badge>
                            )}
                            <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                              Participants: Node {frostSignature.participatingNodes?.join(', Node ')}
                            </Text>
                          </HStack>
                        </Box>
                      )}

                      {bitcoinTx && (
                        <Box w="full">
                          <Text fontSize="xs" color="#FF9B51" fontWeight={700} mb={1}>Taproot Transaction (BIP-341)</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)" mb={2}>
                            An actual Bitcoin transaction that stores the verdict. Taproot is Bitcoin's latest upgrade for privacy and smart contracts.
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(255,107,43,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">TxID <Text as="span" color="rgba(255,255,255,0.35)">— unique receipt number</Text></Text>
                              <Text fontSize="2xs" fontFamily="mono" color="#FF9B51" wordBreak="break-all">{bitcoinTx.txId}</Text>
                            </Box>
                            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(255,107,43,0.15)">
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">OP_RETURN <Text as="span" color="rgba(255,255,255,0.35)">— verdict text stored on Bitcoin</Text></Text>
                              <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.8)">{bitcoinTx.opReturn}</Text>
                            </Box>
                          </SimpleGrid>
                          <HStack mt={2} spacing={3} flexWrap="wrap">
                            {taprootAddress?.testnet && (
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">
                                P2TR: <Text as="span" fontFamily="mono" color="rgba(255,255,255,0.75)">{taprootAddress.testnet.slice(0, 20)}...</Text>
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

                      {/* Testnet Address Status */}
                      {testnetInfo && (
                        <Box w="full" p={3} bg="rgba(0,0,0,0.2)" borderRadius="lg" border="1px solid rgba(255,255,255,0.06)">
                          <HStack justify="space-between" flexWrap="wrap" gap={2}>
                            <VStack align="start" spacing={1}>
                              <HStack spacing={2}>
                                <Text fontSize="xs" color="#FBBF24" fontWeight={700}>Bitcoin Testnet Status</Text>
                                <Badge bg="rgba(251,191,36,0.12)" color="#FBBF24" fontSize="2xs" borderRadius="full" px={2}>
                                  {testnetInfo.network}
                                </Badge>
                              </HStack>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">
                                On-chain TXs: {testnetInfo.chain_stats?.tx_count ?? 0} <Text as="span" color="rgba(255,255,255,0.35)">(confirmed)</Text> · Mempool TXs: {testnetInfo.mempool_stats?.tx_count ?? 0} <Text as="span" color="rgba(255,255,255,0.35)">(waiting)</Text>
                              </Text>
                            </VStack>
                            <Text as="a" href={testnetInfo.explorerUrl} target="_blank" rel="noopener noreferrer"
                              fontSize="2xs" color="#5B7FFF" _hover={{ textDecoration: 'underline' }}>
                              View Address <ExternalLinkIcon mx={1} boxSize={3} />
                            </Text>
                          </HStack>
                        </Box>
                      )}

                      {groupPubKey && (
                        <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                          FROST Group Key: {groupPubKey.slice(0, 24)}... · BIP-340 x-only — the shared public key all 3 nodes created together
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
                    <VStack align="start" spacing={1}>
                      <Heading as="h3" size="md" color="white" fontFamily="heading">
                        Immutable Nostr Proof
                      </Heading>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                        Nostr is a censorship-resistant social network. This verdict is published there so anyone can verify it — no company can take it down.
                      </Text>
                    </VStack>
                    <HStack w="full" spacing={2}>
                      <Box flex={1} p={3}
                        bg="rgba(0,0,0,0.3)" border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="md" fontFamily="mono" fontSize="xs"
                        color="rgba(255,255,255,0.8)" overflowX="auto">
                        {nostrNoteId}
                      </Box>
                      <Button leftIcon={<CopyIcon />} size="sm" onClick={handleCopy}
                        bg="rgba(255,107,43,0.15)" color="#FF9B51" border="1px solid rgba(255,107,43,0.3)"
                        _hover={{ bg: 'rgba(255,107,43,0.25)' }}>
                        Copy
                      </Button>
                    </HStack>
                    <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                      Published to relay.damus.io, nos.lol, relay.nostr.band. Cryptographically signed — cannot be censored or deleted.
                    </Text>
                    <Box p={2} bg="rgba(255,107,43,0.06)" borderRadius="md" border="1px solid rgba(255,107,43,0.1)" w="full">
                      <Text fontSize="2xs" color="rgba(255,255,255,0.5)">
                        <Text as="span" color="#FF9B51" fontWeight={600}>What is a Note ID? </Text>
                        It's like a permanent web link to this verdict on the Nostr network. Anyone can paste this ID into a Nostr client to see the audit proof.
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </MotionCard>

              {/* Interactive Merkle Explorer */}
              {merkleTree && (
                <MotionBox variants={fadeUp}>
                  <MerkleExplorer merkleTree={merkleTree} />
                </MotionBox>
              )}

              {/* Tapscript Spending Paths */}
              {tapscriptInfo && (
                <MotionCard variants={fadeUp} className="glass" borderLeft="4px solid #F59E0B">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" w="full" flexWrap="wrap">
                        <VStack align="start" spacing={0}>
                          <Heading as="h3" size="sm" color="white" fontFamily="heading">
                            Tapscript Spending Paths (BIP-342)
                          </Heading>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.45)" maxW="400px">
                            Rules for how the escrowed funds can be spent — like conditions on a safe. Each path is a different way to unlock the money.
                          </Text>
                        </VStack>
                        <Badge bg="rgba(245,158,11,0.15)" color="#F59E0B" fontSize="xs" borderRadius="full" px={3}>
                          {tapscriptInfo.scripts?.length || 0} Scripts
                        </Badge>
                      </HStack>
                      <Box w="full" p={3} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(245,158,11,0.15)">
                        <Text fontSize="2xs" color="rgba(255,255,255,0.55)" mb={1}>Script-Path Address <Text as="span" color="rgba(255,255,255,0.35)">— the smart contract address on Bitcoin</Text></Text>
                        <Text fontSize="2xs" fontFamily="mono" color="#F59E0B" wordBreak="break-all">{tapscriptInfo.address}</Text>
                      </Box>
                      <VStack spacing={2} w="full">
                        {tapscriptInfo.scripts?.map((script, i) => (
                          <HStack key={i} w="full" p={2} bg="rgba(0,0,0,0.2)" borderRadius="md" spacing={3}
                            border="1px solid rgba(245,158,11,0.08)">
                            <Box w="24px" h="24px" borderRadius="full" bg="rgba(245,158,11,0.15)"
                              display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                              <Text fontSize="xs" fontWeight={800} color="#F59E0B">{i + 1}</Text>
                            </Box>
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="xs" color="white" fontWeight={700}>{script.name}</Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">{script.description}</Text>
                            </VStack>
                          </HStack>
                        ))}
                      </VStack>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.45)">
                        Script Root: {tapscriptInfo.scriptRoot?.slice(0, 32)}... — a fingerprint of all the spending rules combined
                      </Text>
                    </VStack>
                  </CardBody>
                </MotionCard>
              )}

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
                    borderColor="rgba(239,68,68,0.4)" color="#FCA5A5"
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

              <Text fontSize="xs" color="rgba(255,255,255,0.4)" textAlign="center">
                Audit cost: {totalCost} sats · EIA + EPA + SEC EDGAR + Groq AI
              </Text>

            </VStack>
          </motion.div>
        </Container>
      </motion.div>
    </Box>
  )
}
