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
import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { useAuditStore } from '../store/auditStore'

export default function ResultsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const claim = useAuditStore((state) => state.claim)
  const verdict = useAuditStore((state) => state.verdict)
  const narrative = useAuditStore((state) => state.narrative)
  const nostrNoteId = useAuditStore((state) => state.nostrNoteId)
  const payments = useAuditStore((state) => state.payments)
  const resetAudit = useAuditStore((state) => state.resetAudit)

  const totalCost = payments.reduce((sum, p) => sum + p.sats, 0)

  const handleCopy = () => {
    navigator.clipboard.writeText(nostrNoteId)
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2,
      isClosable: true,
    })
  }

  const handleNewAudit = () => {
    resetAudit()
    navigate('/')
  }

  return (
    <Box bg="brand.light" minH="100vh" py={8}>
      <Container maxW="container.lg">
        <VStack spacing={8} align="stretch">
          {/* Verdict Banner */}
          <Card
            bg={verdict?.winner ? '#c6f6d5' : '#fbd38d'}
            borderLeft="6px"
            borderLeftColor={verdict?.winner ? 'green.500' : 'brand.accent'}
          >
            <CardBody>
              <HStack justify="space-between">
                <VStack align="start" spacing={2}>
                  <Heading
                    as="h2"
                    size="lg"
                    color="brand.dark"
                    fontFamily="heading"
                  >
                    {verdict?.winner ? 'VERIFIED ✓' : 'CONTRADICTION DETECTED ✗'}
                  </Heading>
                  <Text color="brand.dark">
                    {claim?.company}'s ESG Claims {verdict?.winner ? 'Align With' : 'Contradict'} Federal Data
                  </Text>
                </VStack>
                <Badge
                  fontSize="md"
                  px={4}
                  py={2}
                  colorScheme={verdict?.winner ? 'green' : 'orange'}
                >
                  {verdict?.confidence}% Confidence
                </Badge>
              </HStack>
            </CardBody>
          </Card>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">
                    Company
                  </StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg">
                    {claim?.company}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">
                    Contradictions
                  </StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg">
                    {verdict?.contradictions}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">
                    Claimed vs Actual
                  </StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg">
                    {verdict?.claimedRenewable ?? 100}% vs {verdict?.actualRenewable ?? 45}%
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card bg="white">
              <CardBody>
                <Stat>
                  <StatLabel color="brand.dark" fontSize="sm">
                    Total Cost
                  </StatLabel>
                  <StatNumber color="brand.accent" fontSize="lg">
                    {totalCost} Sats
                  </StatNumber>
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

          {/* Nostr Proof */}
          <Card bg="white" borderTop="4px" borderTopColor="brand.accent">
            <CardBody>
              <VStack align="start" spacing={4}>
                <Heading as="h3" size="md" color="brand.dark" fontFamily="heading">
                  🔐 Immutable Nostr Proof
                </Heading>
                <HStack w="full" spacing={2}>
                  <Box
                    flex={1}
                    p={3}
                    bg="brand.light"
                    borderRadius="md"
                    fontFamily="mono"
                    fontSize="sm"
                    color="brand.dark"
                    overflowX="auto"
                  >
                    {nostrNoteId}
                  </Box>
                  <Button
                    leftIcon={<CopyIcon />}
                    size="sm"
                    onClick={handleCopy}
                  >
                    Copy
                  </Button>
                </HStack>
                <Text fontSize="sm" color="brand.dark" opacity={0.7}>
                  This audit report is permanently published to Nostr and cannot be censored or deleted.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Actions */}
          <HStack justify="center" spacing={4} pt={4}>
            <Button onClick={handleNewAudit} variant="solid">
              Start New Audit
            </Button>
            <Button
              variant="outline"
              borderColor="brand.accent"
              color="brand.accent"
              rightIcon={<ExternalLinkIcon />}
            >
              View on Nostr
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
