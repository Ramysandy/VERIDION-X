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
  Legend,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { CopyIcon, ExternalLinkIcon, WarningTwoIcon, CheckCircleIcon } from '@chakra-ui/icons'

const riskColors = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'orange', LOW: 'green' }
import { useAuditStore } from '../store/auditStore'

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
    <Box bg="brand.light" minH="100vh" py={8}>
      <Container maxW="container.lg">
        <VStack spacing={8} align="stretch">
          {/* Verdict Banner */}
          <Card
            bg={verdict?.winner ? '#c6f6d5' : '#fbd38d'}
            borderLeft="6px solid"
            borderLeftColor={verdict?.winner ? 'green.500' : 'red.500'}
          >
            <CardBody>
              <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                <VStack align="start" spacing={2}>
                  <HStack spacing={3} flexWrap="wrap">
                    <Heading as="h2" size="lg" color="brand.dark" fontFamily="heading">
                      {verdict?.aiVerdict || (verdict?.winner ? 'VERIFIED \u2713' : 'GREENWASHING \u2717')}
                    </Heading>
                    <Badge colorScheme={riskColors[riskLevel]} fontSize="sm" px={3} py={1}>
                      {riskLevel} RISK
                    </Badge>
                  </HStack>
                  <Text color="brand.dark" fontSize="sm">
                    {claim?.company}'s ESG claims {verdict?.winner ? 'align with' : 'contradict'} federal data
                  </Text>
                </VStack>
                <VStack align="end" spacing={1}>
                  <Text fontWeight={800} fontSize="3xl" color="brand.dark" lineHeight={1}>{riskScore}</Text>
                  <Text fontSize="xs" color="brand.dark" opacity={0.6}>Risk Score / 100</Text>
                </VStack>
              </HStack>
              <Box mt={4}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="brand.dark" opacity={0.6}>Risk Meter</Text>
                  <Text fontSize="xs" fontWeight={700}
                    color={riskScore > 70 ? 'red.600' : riskScore > 40 ? 'orange.600' : 'green.600'}>
                    {riskScore}/100
                  </Text>
                </HStack>
                <Progress value={riskScore}
                  colorScheme={riskScore > 70 ? 'red' : riskScore > 40 ? 'orange' : 'green'}
                  borderRadius="full" size="sm" />
              </Box>
            </CardBody>
          </Card>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">Company</StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg" noOfLines={1}>{claim?.company}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">Contradictions Found</StatLabel>
                  <StatNumber color={verdict?.contradictions > 0 ? 'red.500' : 'green.500'} fontSize="lg">{verdict?.contradictions ?? 0}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">Claimed vs Actual</StatLabel>
                  <StatNumber color="brand.accent" fontSize="md">
                    {verdict?.claimedRenewable ?? '--'}% vs {verdict?.actualRenewable ?? '--'}%
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">Confidence</StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg">{verdict?.confidence ?? 0}%</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Charts */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {/* Renewable % Comparison */}
            <Card bg="white">
              <CardBody>
                <Text fontWeight={700} color="brand.dark" mb={4}>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#BFC9D1" />
                      <XAxis dataKey="name" tick={{ fill: '#25343F', fontSize: 12 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#25343F', fontSize: 12 }} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        <Cell fill="#FF9B51" />
                        <Cell fill={verdict?.winner ? '#48BB78' : '#FC8181'} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>

            {/* Confidence Radial */}
            <Card bg="white">
              <CardBody>
                <Text fontWeight={700} color="brand.dark" mb={4}>
                  Audit Confidence Score
                </Text>
                <Box h="200px" position="relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      startAngle={180}
                      endAngle={0}
                      data={[{ name: 'Confidence', value: verdict?.confidence ?? 0, fill: verdict?.winner ? '#48BB78' : '#FF9B51' }]}
                    >
                      <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#EAEFEF' }} />
                      <Tooltip formatter={(v) => `${v}%`} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -20%)"
                    textAlign="center"
                  >
                    <Text fontSize="2xl" fontWeight={800} color="brand.dark">
                      {verdict?.confidence ?? 0}%
                    </Text>
                    <Text fontSize="xs" color="brand.dark" opacity={0.6}>Confidence</Text>
                  </Box>
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Narrative */}
          <Card bg="white">
            <CardBody>
              <VStack align="start" spacing={4}>
                <Heading as="h3" size="md" color="brand.dark" fontFamily="heading">
                  Analysis
                </Heading>
                <Text color="brand.dark" lineHeight={1.8}>
                  {narrative || 'Analysis pending...'}
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* AI Reasons */}
          {verdict?.reasons?.length > 0 && (
            <Card bg="white">
              <CardBody>
                <VStack align="start" spacing={3}>
                  <Heading as="h3" size="sm" color="brand.dark" fontFamily="heading">Key Findings</Heading>
                  <List spacing={2} w="full">
                    {verdict.reasons.map((reason, i) => (
                      <ListItem key={i} fontSize="sm" color="brand.dark">
                        <ListIcon as={verdict.winner ? CheckCircleIcon : WarningTwoIcon}
                          color={verdict.winner ? 'green.500' : 'orange.500'} />
                        {reason}
                      </ListItem>
                    ))}
                  </List>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* SEC Card */}
          {secData && (
            <Card bg="white" borderLeft="4px solid" borderLeftColor="blue.400">
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Heading as="h3" size="sm" color="brand.dark" fontFamily="heading">SEC EDGAR Filing</Heading>
                    <Badge colorScheme={secData.disclosureRisk === 'HIGH' ? 'red' : 'yellow'} fontSize="xs">
                      Disclosure Risk: {secData.disclosureRisk}
                    </Badge>
                  </HStack>
                  <Text color="brand.dark" fontSize="sm">{secData.esgStatement}</Text>
                  {secData.edgarUrl && (
                    <Text as="a" href={secData.edgarUrl} target="_blank" rel="noopener noreferrer"
                      fontSize="xs" color="blue.500" _hover={{ textDecoration: 'underline' }}>
                      View on SEC EDGAR <ExternalLinkIcon mx={1} boxSize={3} />
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Nostr Proof */}
          <Card bg="white" borderTop="4px" borderTopColor="brand.accent">
            <CardBody>
              <VStack align="start" spacing={4}>
                <Heading as="h3" size="md" color="brand.dark" fontFamily="heading">
                  Immutable Nostr Proof
                </Heading>
                <HStack w="full" spacing={2}>
                  <Box flex={1} p={3} bg="brand.light" borderRadius="md"
                    fontFamily="mono" fontSize="sm" color="brand.dark" overflowX="auto">
                    {nostrNoteId}
                  </Box>
                  <Button leftIcon={<CopyIcon />} size="sm" onClick={handleCopy}>Copy</Button>
                </HStack>
                <Text fontSize="sm" color="brand.dark" opacity={0.7}>
                  Published to relay.damus.io, nos.lol, relay.nostr.band. Cryptographically signed — cannot be censored or deleted.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Divider />

          {/* Actions */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            <Button onClick={handleNewAudit} variant="solid" size="sm">New Audit</Button>
            <Button variant="outline" colorScheme="orange" size="sm"
              rightIcon={<ExternalLinkIcon />} onClick={handleShare}>
              View on Nostr
            </Button>
            <Button variant="outline" colorScheme="red" size="sm" onClick={handleSaveLeaderboard}>
              Save to Hall of Shame
            </Button>
            <Button variant="ghost" colorScheme="blue" size="sm"
              onClick={() => navigate('/leaderboard')}>
              Hall of Shame
            </Button>
          </SimpleGrid>

          <Text fontSize="xs" color="brand.dark" opacity={0.4} textAlign="center">
            Audit cost: {totalCost} sats · EIA + EPA + SEC EDGAR + Groq AI
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}
