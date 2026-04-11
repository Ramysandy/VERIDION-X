import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  CardBody,
  Progress,
  Badge,
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Alert,
  AlertIcon,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react'
import { WarningIcon, CheckCircleIcon } from '@chakra-ui/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'
import { eiaAPI, epaAPI, groqAPI, nostrAPI, secAPI, firecrawlAPI } from '../api/client'

const MotionBox = motion(Box)

const phases = [
  'IDLE', 'EXTRACTING_CLAIM', 'FETCHING_EIA', 'LOADING_EPA',
  'CHECKING_SEC', 'SCORING', 'WRITING_NARRATIVE', 'COMPLETE',
]
const phaseLabels = {
  IDLE: 'Ready',
  EXTRACTING_CLAIM: 'Parsing ESG Claim...',
  FETCHING_EIA: 'Fetching EIA Grid Data',
  LOADING_EPA: 'Loading EPA Emissions',
  CHECKING_SEC: 'Checking SEC EDGAR Filings',
  SCORING: 'AI Analyzing Contradictions...',
  WRITING_NARRATIVE: 'Publishing to Blockchain',
  COMPLETE: 'Audit Complete ✓',
  ERROR: 'Error',
}

export default function AuditFlowPage() {
  const navigate = useNavigate()
  const hasStarted = useRef(false)

  const targetCompany = useAuditStore((s) => s.targetCompany)
  const claim = useAuditStore((s) => s.claim)
  const auditPhase = useAuditStore((s) => s.auditPhase)
  const eiaData = useAuditStore((s) => s.eiaData)
  const epaData = useAuditStore((s) => s.epaData)
  const secData = useAuditStore((s) => s.secData)
  const error = useAuditStore((s) => s.error)
  const setClaimData = useAuditStore((s) => s.setClaimData)
  const setEiaData = useAuditStore((s) => s.setEiaData)
  const setEpaData = useAuditStore((s) => s.setEpaData)
  const setSecData = useAuditStore((s) => s.setSecData)
  const setVerdict = useAuditStore((s) => s.setVerdict)
  const setNarrative = useAuditStore((s) => s.setNarrative)
  const setNostrNoteId = useAuditStore((s) => s.setNostrNoteId)
  const setAuditPhase = useAuditStore((s) => s.setAuditPhase)
  const addPayment = useAuditStore((s) => s.addPayment)
  const setError = useAuditStore((s) => s.setError)

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (auditPhase === 'COMPLETE') setTimeout(() => navigate('/results'), 800)
  }, [auditPhase, navigate])

  useEffect(() => {
    if (auditPhase === 'ERROR') { setProgress(0); return }
    const idx = phases.indexOf(auditPhase)
    setProgress(idx < 0 ? 0 : Math.round((idx / (phases.length - 1)) * 100))
  }, [auditPhase])

  useEffect(() => {
    if (!targetCompany || hasStarted.current) return
    const runAudit = async () => {
      hasStarted.current = true
      const company = targetCompany
      const state = 'CA'
      try {
        // Step 0: Scrape ESG claim from company website via FireCrawl + Groq
        setAuditPhase('EXTRACTING_CLAIM')
        let claimText = `${company}'s commitment to 100% renewable energy and carbon neutrality`
        let claimedRenewable = 100
        try {
          const scraped = await firecrawlAPI.scrapeClaims(company)
          if (scraped?.markdown || scraped?.content) {
            const parsed = await groqAPI.extractClaim(scraped.markdown || scraped.content, company)
            if (parsed?.claim) {
              claimText = parsed.claim
              claimedRenewable = parsed.claimedRenewable || 100
            }
          }
        } catch { /* non-fatal: use fallback claim */ }
        const claimObj = { company, claim: claimText, claimedRenewable, state }
        setClaimData(claimObj)

        // Step 1: EIA
        const eia = await eiaAPI.getRenewableCapacity(state, company)
        addPayment(100, 'EIA')
        setEiaData({ renewable: eia.renewablePercentage, capacity: Math.round((eia.totalCapacity || 250000) / 1000), state: eia.state, source: eia.dataSource, totalCapacity: eia.totalCapacity })

        // Step 2: EPA
        const epa = await epaAPI.getEmissions(state, company)
        addPayment(100, 'EPA')
        setEpaData({ co2: epa.co2Intensity, year: epa.details?.year || 2024, unit: epa.unit, source: epa.dataSource })

        // Step 3: SEC EDGAR
        setAuditPhase('CHECKING_SEC')
        let sec = null
        try {
          sec = await secAPI.getFilings(company)
          setSecData(sec)
        } catch { /* non-fatal */ }

        // Step 4: AI verdict via Groq
        setAuditPhase('SCORING')
        const groq = await groqAPI.analyzeClaim(company, claimText,
          { renewablePercentage: eia.renewablePercentage, totalCapacity: eia.totalCapacity },
          { co2Intensity: epa.co2Intensity },
          sec
        )
        addPayment(50, 'Groq AI')

        const ai = groq.aiVerdict || {}
        const verdict = {
          winner: !ai.greenwashing,
          contradictions: ai.contradictions ?? 1,
          confidence: ai.confidence ?? 88,
          riskScore: ai.riskScore ?? 50,
          riskLevel: ai.riskLevel ?? 'MEDIUM',
          claimedRenewable: claimedRenewable,
          actualRenewable: eia.renewablePercentage,
          co2Intensity: epa.co2Intensity,
          reasons: ai.reasons || [],
          aiVerdict: ai.verdict || 'ANALYZED',
        }
        setVerdict(verdict)
        setNarrative(groq.narrative)

        // Step 5: Nostr blockchain
        const nostrResult = await nostrAPI.publishVerdict(company, verdict, groq.narrative, 250)
        setNostrNoteId(nostrResult.noteId)

        // Save to leaderboard in localStorage
        const entry = { company, verdict, narrative: groq.narrative, nostrNoteId: nostrResult.noteId, timestamp: new Date().toISOString(), claim: claimText }
        const existing = JSON.parse(localStorage.getItem('veridion_leaderboard') || '[]')
        const updated = [entry, ...existing.filter(e => e.company !== company)].slice(0, 20)
        localStorage.setItem('veridion_leaderboard', JSON.stringify(updated))

      } catch (err) {
        console.error('[Audit Pipeline Error]:', err.message)
        setError(err.message)
      }
    }
    runAudit()
  }, [targetCompany])

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" py={8} position="relative" overflow="hidden">
      <Box className="orb orb-orange" w="400px" h="400px" top="-80px" right="-80px" />
      <Box className="orb orb-purple" w="280px" h="280px" bottom="60px" left="-40px" />
      <Container maxW="container.lg" position="relative" zIndex={1}>
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}>
        <VStack spacing={6} align="stretch">
          {error && (
            <Alert status="warning" borderRadius="xl"
              bg="rgba(251,191,36,0.1)" border="1px solid rgba(251,191,36,0.25)">
              <AlertIcon color="#FBBF24" />
              <AlertDescription color="rgba(255,255,255,0.8)" fontSize="sm">{error} — continuing with available data</AlertDescription>
            </Alert>
          )}

          {/* Company Info */}
          <Card className="glass" border="1px solid rgba(255,107,43,0.2)">
            <CardBody>
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={2}>
                  <Text fontSize="xs" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing="0.1em">Auditing</Text>
                  <Heading as="h2" size="lg" color="white" fontFamily="heading">{claim?.company}</Heading>
                  <Text fontSize="sm" color="rgba(255,255,255,0.55)" maxW="450px" noOfLines={2}>"{claim?.claim}"</Text>
                </VStack>
                <Badge
                  bg={auditPhase === 'COMPLETE' ? 'rgba(34,197,94,0.15)' : auditPhase === 'ERROR' ? 'rgba(239,68,68,0.15)' : 'rgba(255,107,43,0.15)'}
                  color={auditPhase === 'COMPLETE' ? '#22C55E' : auditPhase === 'ERROR' ? '#EF4444' : '#FF9B51'}
                  border="1px solid"
                  borderColor={auditPhase === 'COMPLETE' ? 'rgba(34,197,94,0.3)' : auditPhase === 'ERROR' ? 'rgba(239,68,68,0.3)' : 'rgba(255,107,43,0.3)'}
                  px={4} py={2} fontSize="xs" borderRadius="full"
                >
                  {phaseLabels[auditPhase] || auditPhase}
                </Badge>
              </HStack>
            </CardBody>
          </Card>

          {/* Progress */}
          <Card className="glass" border="1px solid rgba(255,107,43,0.15)">
            <CardBody>
              <VStack spacing={4} align="start">
                <HStack justify="space-between" w="full">
                  <Text fontWeight={700} color="rgba(255,255,255,0.8)" fontSize="xs" textTransform="uppercase" letterSpacing="0.1em">Audit Progress</Text>
                  <Text fontWeight={800} color="#FF6B2B" fontSize="lg">{progress}%</Text>
                </HStack>
                <Box w="full" h="6px" bg="rgba(255,255,255,0.08)" borderRadius="full" overflow="hidden">
                  <MotionBox
                    h="full" borderRadius="full"
                    bg="linear-gradient(to right, #FF6B2B, #FBBF24)"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </Box>
                <SimpleGrid columns={7} spacing={1} w="full">
                  {['EIA', 'EPA', 'SEC', 'AI Verdict', 'Narrative', 'Nostr', 'Done'].map((step, i) => (
                    <Text key={step} fontSize="9px" textAlign="center"
                      color={progress >= ((i + 1) / 7) * 100 ? '#FF6B2B' : 'rgba(255,255,255,0.3)'}
                      fontWeight={progress >= ((i + 1) / 7) * 100 ? 800 : 400}>
                      {step}
                    </Text>
                  ))}
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

          {/* Data Tabs */}
          <Tabs variant="soft-rounded" colorScheme="orange">
            <TabList className="glass" p={3} borderRadius="lg" gap={2} flexWrap="wrap" border="1px solid rgba(255,107,43,0.15)">
              <Tab color="rgba(255,255,255,0.6)" _selected={{ bg: '#FF6B2B', color: 'white' }}>Claim</Tab>
              <Tab color="rgba(255,255,255,0.6)" _selected={{ bg: '#FF6B2B', color: 'white' }}>EIA {eiaData && '✓'}</Tab>
              <Tab color="rgba(255,255,255,0.6)" _selected={{ bg: '#FF6B2B', color: 'white' }}>EPA {epaData && '✓'}</Tab>
              <Tab color="rgba(255,255,255,0.6)" _selected={{ bg: '#FF6B2B', color: 'white' }}>SEC EDGAR {secData && '✓'}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Card className="glass" border="1px solid rgba(255,107,43,0.15)">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Text color="white" fontWeight={700} fontSize="md">Company ESG Claim</Text>
                      <Text color="rgba(255,255,255,0.7)" lineHeight="tall">"{claim?.claim}"</Text>
                      <HStack spacing={3} flexWrap="wrap">
                        <Badge bg="rgba(255,107,43,0.15)" color="#FF9B51" borderRadius="full" px={3}>Claimed Renewable: {claim?.claimedRenewable}%</Badge>
                        <Badge bg="rgba(91,127,255,0.1)" color="#5B7FFF" borderRadius="full" px={3}>{claim?.location}</Badge>
                        <Badge bg="rgba(255,255,255,0.08)" color="rgba(255,255,255,0.6)" borderRadius="full" px={3}>{claim?.year}</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>

              {/* EIA Tab */}
              <TabPanel>
                <Card className="glass" border="1px solid rgba(255,107,43,0.15)">
                  <CardBody>
                    {eiaData ? (
                      <VStack align="start" spacing={4}>
                        <Text color="white" fontWeight={700} fontSize="md">EIA Energy Grid — Claimed vs Actual</Text>
                        <SimpleGrid columns={2} spacing={4} w="full">
                          <Stat><StatLabel color="rgba(255,255,255,0.55)" fontSize="sm">Actual Renewable %</StatLabel><StatNumber color="#FF6B2B">{eiaData.renewable}%</StatNumber></Stat>
                          <Stat><StatLabel color="rgba(255,255,255,0.55)" fontSize="sm">Grid Capacity (GW)</StatLabel><StatNumber color="#FF6B2B">{eiaData.capacity}</StatNumber></Stat>
                        </SimpleGrid>
                        <Box w="full" h="200px">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: 'Claimed', value: claim?.claimedRenewable ?? 100 }, { name: 'Actual (EIA)', value: eiaData.renewable }]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                              <YAxis domain={[0, 100]} unit="%" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                              <Tooltip contentStyle={{ background: '#0D1829', border: '1px solid rgba(255,107,43,0.3)', borderRadius: 8 }} formatter={(v) => `${v}%`} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                <Cell fill="#FF9B51" />
                                <Cell fill={eiaData.renewable >= (claim?.claimedRenewable ?? 80) ? '#48BB78' : '#FC8181'} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Text fontSize="xs" color="rgba(255,255,255,0.35)">Source: {eiaData.source} • State: {eiaData.state}</Text>
                      </VStack>
                    ) : <VStack spacing={3}><Progress size="xs" isIndeterminate colorScheme="orange" w="full" sx={{ '& > div': { bg: 'linear-gradient(to right,#FF6B2B,#FBBF24)' } }} /><Text color="rgba(255,255,255,0.4)" fontSize="sm">Fetching EIA data...</Text></VStack>}
                  </CardBody>
                </Card>
              </TabPanel>

              {/* EPA Tab */}
              <TabPanel>
                <Card className="glass" border="1px solid rgba(255,107,43,0.15)">
                  <CardBody>
                    {epaData ? (
                      <VStack align="start" spacing={4}>
                        <Text color="white" fontWeight={700} fontSize="md">EPA Emissions — CO₂ vs Benchmarks</Text>
                        <SimpleGrid columns={2} spacing={4} w="full">
                          <Stat><StatLabel color="rgba(255,255,255,0.55)" fontSize="sm">CO₂ Intensity</StatLabel><StatNumber color="#FF6B2B">{epaData.co2}</StatNumber><Text fontSize="xs" opacity={0.5} color="white">{epaData.unit}</Text></Stat>
                          <Stat><StatLabel color="rgba(255,255,255,0.55)" fontSize="sm">Data Year</StatLabel><StatNumber color="#FF6B2B">{epaData.year}</StatNumber></Stat>
                        </SimpleGrid>
                        <Box w="full" h="200px">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: 'Actual CO₂', value: epaData.co2 }, { name: 'US Avg', value: 450 }, { name: 'Clean Grid', value: 50 }]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                              <YAxis unit=" lb" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                              <Tooltip contentStyle={{ background: '#0D1829', border: '1px solid rgba(255,107,43,0.3)', borderRadius: 8 }} formatter={(v) => `${v} lbs/MWh`} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                <Cell fill={epaData.co2 > 450 ? '#EF4444' : epaData.co2 < 100 ? '#22C55E' : '#FF6B2B'} />
                                <Cell fill="rgba(255,255,255,0.2)" /><Cell fill="#22C55E" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Text fontSize="xs" color="rgba(255,255,255,0.35)">Source: {epaData.source}</Text>
                      </VStack>
                    ) : <VStack spacing={3}><Progress size="xs" isIndeterminate colorScheme="orange" w="full" /><Text color="rgba(255,255,255,0.4)" fontSize="sm">Fetching EPA data...</Text></VStack>}
                  </CardBody>
                </Card>
              </TabPanel>

              {/* SEC EDGAR Tab */}
              <TabPanel>
                <Card className="glass" border="1px solid rgba(255,107,43,0.15)">
                  <CardBody>
                    {secData ? (
                      <VStack align="start" spacing={4}>
                        <HStack justify="space-between" w="full">
                          <Text color="white" fontWeight={700} fontSize="md">SEC EDGAR Filings</Text>
                          <Badge
                            bg={secData.disclosureRisk === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'}
                            color={secData.disclosureRisk === 'HIGH' ? '#EF4444' : '#FBBF24'}
                            fontSize="xs" borderRadius="full" px={3}>
                            Disclosure Risk: {secData.disclosureRisk}
                          </Badge>
                        </HStack>
                        <Text color="rgba(255,255,255,0.6)" fontSize="sm">{secData.esgStatement}</Text>
                        {secData.esgClaims?.length > 0 && (
                          <List spacing={2} w="full">
                            {secData.esgClaims.map((c, i) => (
                              <ListItem key={i} fontSize="sm" color="rgba(255,255,255,0.7)">
                                <ListIcon as={c.formType === '10-K' ? CheckCircleIcon : WarningIcon} color="#FF6B2B" />
                                {c.excerpt}
                              </ListItem>
                            ))}
                          </List>
                        )}
                        <Text fontSize="xs" color="rgba(255,255,255,0.3)">Source: {secData.dataSource}</Text>
                        <Text as="a" href={secData.edgarUrl} target="_blank" rel="noopener noreferrer"
                          fontSize="xs" color="#5B7FFF" textDecoration="underline">
                          View on SEC EDGAR →
                        </Text>
                      </VStack>
                    ) : (
                      <VStack spacing={3}>
                        <Progress size="xs" isIndeterminate colorScheme="orange" w="full" />
                        <Text color="rgba(255,255,255,0.4)" fontSize="sm">Searching SEC EDGAR filings...</Text>
                      </VStack>
                    )}
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
        </motion.div>
      </Container>
    </Box>
  )
}
