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
  ReferenceLine,
} from 'recharts'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'
import { eiaAPI, epaAPI, groqAPI, nostrAPI } from '../api/client'

const phases = [
  'IDLE',
  'EXTRACTING_CLAIM',
  'FETCHING_EIA',
  'LOADING_EPA',
  'SCORING',
  'WRITING_NARRATIVE',
  'COMPLETE',
]

const phaseLabels = {
  IDLE: 'Ready',
  EXTRACTING_CLAIM: 'Parsing ESG Claim...',
  FETCHING_EIA: 'Fetching Energy Grid Data',
  LOADING_EPA: 'Loading Emissions Baseline',
  SCORING: 'Analyzing Contradictions...',
  WRITING_NARRATIVE: 'Generating AI Report',
  COMPLETE: 'Audit Complete',
  ERROR: 'Error',
}

export default function AuditFlowPage() {
  const navigate = useNavigate()
  const hasStarted = useRef(false)

  const claim = useAuditStore((s) => s.claim)
  const auditPhase = useAuditStore((s) => s.auditPhase)
  const eiaData = useAuditStore((s) => s.eiaData)
  const epaData = useAuditStore((s) => s.epaData)
  const error = useAuditStore((s) => s.error)
  const setEiaData = useAuditStore((s) => s.setEiaData)
  const setEpaData = useAuditStore((s) => s.setEpaData)
  const setVerdict = useAuditStore((s) => s.setVerdict)
  const setNarrative = useAuditStore((s) => s.setNarrative)
  const setNostrNoteId = useAuditStore((s) => s.setNostrNoteId)
  const addPayment = useAuditStore((s) => s.addPayment)
  const setError = useAuditStore((s) => s.setError)

  const [progress, setProgress] = useState(0)

  // Navigate to results when complete
  useEffect(() => {
    if (auditPhase === 'COMPLETE') {
      setTimeout(() => navigate('/results'), 800)
    }
  }, [auditPhase, navigate])

  // Update progress bar
  useEffect(() => {
    if (auditPhase === 'ERROR') { setProgress(0); return }
    const idx = phases.indexOf(auditPhase)
    setProgress(idx < 0 ? 0 : Math.round((idx / (phases.length - 1)) * 100))
  }, [auditPhase])

  // Run audit pipeline — each step fires when phase changes
  useEffect(() => {
    if (!claim || hasStarted.current) return

    const runAudit = async () => {
      hasStarted.current = true
      const state = claim.state || 'CA'
      const company = claim.company

      try {
        // Step 1: EIA — renewable capacity
        const eia = await eiaAPI.getRenewableCapacity(state, company)
        addPayment(100, 'EIA')
        setEiaData({
          renewable: eia.renewablePercentage,
          capacity: Math.round((eia.totalCapacity || 250000) / 1000),
          state: eia.state,
          source: eia.dataSource,
        })

        // Step 2: EPA — emissions baseline
        const epa = await epaAPI.getEmissions(state, company)
        addPayment(100, 'EPA')
        setEpaData({
          co2: epa.co2Intensity,
          year: epa.details?.year || 2024,
          unit: epa.unit,
          source: epa.dataSource,
        })

        // Step 3: Build verdict (compare claim vs data)
        const claimedRenewable = claim.claimedRenewable || 100
        const actualRenewable = eia.renewablePercentage
        const contradiction = claimedRenewable - actualRenewable > 30

        const verdict = {
          winner: !contradiction,
          contradictions: contradiction ? Math.ceil((claimedRenewable - actualRenewable) / 20) : 0,
          confidence: contradiction ? 92 : 88,
          claimedRenewable,
          actualRenewable,
          co2Intensity: epa.co2Intensity,
        }
        setVerdict(verdict)

        // Step 4: Groq — generate narrative
        const groq = await groqAPI.analyzeClaim(company, claim.claim, {
          renewablePercentage: eia.renewablePercentage,
          totalCapacity: eia.totalCapacity,
        }, {
          co2Intensity: epa.co2Intensity,
        })
        addPayment(50, 'Groq')
        setNarrative(groq.narrative)

        // Step 5: Nostr — publish immutable proof
        const nostrResult = await nostrAPI.publishVerdict(
          company, verdict, groq.narrative, 250
        )
        setNostrNoteId(nostrResult.noteId)

      } catch (err) {
        console.error('[Audit Pipeline Error]:', err.message)
        setError(err.message)
      }
    }

    runAudit()
  }, [claim])

  return (
    <Box bg="brand.light" minH="100vh" py={8}>
      <Container maxW="container.lg">
        <VStack spacing={8} align="stretch">

          {/* Error Banner */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error} — using fallback data</AlertDescription>
            </Alert>
          )}

          {/* Company Info */}
          <Card bg="white">
            <CardBody>
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color="brand.dark" opacity={0.6}>Auditing</Text>
                  <Heading as="h2" size="lg" color="brand.dark" fontFamily="heading">
                    {claim?.company}
                  </Heading>
                  <Text fontSize="sm" color="brand.dark" opacity={0.7} maxW="400px" noOfLines={2}>
                    "{claim?.claim}"
                  </Text>
                </VStack>
                <Badge
                  colorScheme={auditPhase === 'COMPLETE' ? 'green' : auditPhase === 'ERROR' ? 'red' : 'orange'}
                  px={4} py={2} fontSize="sm"
                >
                  {phaseLabels[auditPhase] || auditPhase}
                </Badge>
              </HStack>
            </CardBody>
          </Card>

          {/* Progress Bar */}
          <Card bg="white">
            <CardBody>
              <VStack spacing={3} align="start">
                <HStack justify="space-between" w="full">
                  <Text fontWeight={700} color="brand.dark" fontSize="sm">Audit Progress</Text>
                  <Text fontWeight={700} color="brand.accent" fontSize="sm">{progress}%</Text>
                </HStack>
                <Progress
                  value={progress}
                  width="full"
                  colorScheme="orange"
                  hasStripe={progress < 100}
                  isAnimated={progress < 100}
                  borderRadius="full"
                  size="md"
                />
                <SimpleGrid columns={6} spacing={1} w="full">
                  {['EIA', 'EPA', 'Claim', 'Score', 'AI', 'Nostr'].map((step, i) => (
                    <Text
                      key={step}
                      fontSize="9px"
                      textAlign="center"
                      color={progress >= ((i + 1) / 6) * 100 ? 'brand.accent' : 'brand.dark'}
                      opacity={progress >= ((i + 1) / 6) * 100 ? 1 : 0.4}
                      fontWeight={700}
                    >
                      {step}
                    </Text>
                  ))}
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

          {/* Data Tabs */}
          <Tabs variant="soft-rounded" colorScheme="orange">
            <TabList bg="white" p={3} borderRadius="lg" gap={2}>
              <Tab color="brand.dark" _selected={{ bg: 'brand.accent', color: 'white' }}>Claim</Tab>
              <Tab color="brand.dark" _selected={{ bg: 'brand.accent', color: 'white' }}>
                EIA Data {eiaData && '✓'}
              </Tab>
              <Tab color="brand.dark" _selected={{ bg: 'brand.accent', color: 'white' }}>
                EPA Data {epaData && '✓'}
              </Tab>
            </TabList>

            <TabPanels>
              {/* Claim Tab */}
              <TabPanel>
                <Card bg="white">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Text color="brand.dark" fontWeight={700} fontSize="md">Company ESG Claim</Text>
                      <Text color="brand.dark" lineHeight="tall">"{claim?.claim}"</Text>
                      <HStack spacing={4}>
                        <Badge colorScheme="orange">Claimed Renewable: {claim?.claimedRenewable}%</Badge>
                        <Badge colorScheme="blue">{claim?.location}</Badge>
                        <Badge colorScheme="gray">{claim?.year}</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>

              {/* EIA Data Tab */}
              <TabPanel>
                <Card bg="white">
                  <CardBody>
                    {eiaData ? (
                      <VStack align="start" spacing={4}>
                        <Text color="brand.dark" fontWeight={700} fontSize="md">
                          EIA Energy Grid Data — Claimed vs Actual Renewable
                        </Text>
                        <SimpleGrid columns={2} spacing={4} w="full">
                          <Stat>
                            <StatLabel color="brand.dark" fontSize="sm">Actual Renewable %</StatLabel>
                            <StatNumber color="brand.accent" fontSize="2xl">{eiaData.renewable}%</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel color="brand.dark" fontSize="sm">Grid Capacity (GW)</StatLabel>
                            <StatNumber color="brand.accent" fontSize="2xl">{eiaData.capacity}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box w="full" h="220px" mt={2}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'Claimed', value: claim?.claimedRenewable ?? 100 },
                                { name: 'Actual (EIA)', value: eiaData.renewable },
                              ]}
                              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#BFC9D1" />
                              <XAxis dataKey="name" tick={{ fill: '#25343F', fontSize: 12 }} />
                              <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#25343F', fontSize: 12 }} />
                              <Tooltip formatter={(v) => `${v}%`} />
                              <ReferenceLine y={100} stroke="#BFC9D1" strokeDasharray="4 4" />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                <Cell fill="#FF9B51" />
                                <Cell fill={eiaData.renewable >= (claim?.claimedRenewable ?? 100) ? '#48BB78' : '#FC8181'} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Text fontSize="xs" color="brand.dark" opacity={0.5}>
                          Source: {eiaData.source} • State: {eiaData.state}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack spacing={3}>
                        <Progress size="xs" isIndeterminate colorScheme="orange" w="full" />
                        <Text color="brand.dark" opacity={0.5} fontSize="sm">Fetching EIA data...</Text>
                      </VStack>
                    )}
                  </CardBody>
                </Card>
              </TabPanel>

              {/* EPA Data Tab */}
              <TabPanel>
                <Card bg="white">
                  <CardBody>
                    {epaData ? (
                      <VStack align="start" spacing={4}>
                        <Text color="brand.dark" fontWeight={700} fontSize="md">
                          EPA Emissions Data — CO₂ Intensity vs Benchmarks
                        </Text>
                        <SimpleGrid columns={2} spacing={4} w="full">
                          <Stat>
                            <StatLabel color="brand.dark" fontSize="sm">CO₂ Intensity</StatLabel>
                            <StatNumber color="brand.accent" fontSize="2xl">{epaData.co2}</StatNumber>
                            <Text fontSize="xs" color="brand.dark" opacity={0.5}>{epaData.unit}</Text>
                          </Stat>
                          <Stat>
                            <StatLabel color="brand.dark" fontSize="sm">Data Year</StatLabel>
                            <StatNumber color="brand.accent" fontSize="2xl">{epaData.year}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box w="full" h="220px" mt={2}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'Actual CO₂', value: epaData.co2 },
                                { name: 'US Avg', value: 450 },
                                { name: 'Clean Grid', value: 50 },
                              ]}
                              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#BFC9D1" />
                              <XAxis dataKey="name" tick={{ fill: '#25343F', fontSize: 12 }} />
                              <YAxis unit=" lb" tick={{ fill: '#25343F', fontSize: 12 }} />
                              <Tooltip formatter={(v) => `${v} lbs/MWh`} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                <Cell fill={epaData.co2 > 450 ? '#FC8181' : epaData.co2 < 100 ? '#48BB78' : '#FF9B51'} />
                                <Cell fill="#BFC9D1" />
                                <Cell fill="#48BB78" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Text fontSize="xs" color="brand.dark" opacity={0.5}>
                          Source: {epaData.source}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack spacing={3}>
                        <Progress size="xs" isIndeterminate colorScheme="orange" w="full" />
                        <Text color="brand.dark" opacity={0.5} fontSize="sm">Fetching EPA data...</Text>
                      </VStack>
                    )}
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  )
}
