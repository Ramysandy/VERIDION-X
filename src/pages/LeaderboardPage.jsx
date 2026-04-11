import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Alert,
  AlertIcon,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  Divider,
} from '@chakra-ui/react'
import { ExternalLinkIcon, DeleteIcon } from '@chakra-ui/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const riskColor = {
  CRITICAL: 'red',
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
}

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('veridion_leaderboard') || '[]')
      return stored.sort((a, b) => (b.verdict?.riskScore ?? 0) - (a.verdict?.riskScore ?? 0))
    } catch { return [] }
  })

  const clearAll = () => {
    if (window.confirm('Clear all leaderboard entries?')) {
      localStorage.removeItem('veridion_leaderboard')
      setEntries([])
    }
  }

  const topStats = {
    total: entries.length,
    greenwashers: entries.filter(e => !e.verdict?.winner).length,
    avgRisk: entries.length ? Math.round(entries.reduce((a, e) => a + (e.verdict?.riskScore ?? 50), 0) / entries.length) : 0,
    criticalCount: entries.filter(e => e.verdict?.riskLevel === 'CRITICAL').length,
  }

  return (
    <Box bg="brand.light" minH="100vh" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <Heading as="h1" size="xl" color="brand.dark" fontFamily="heading">
                Hall of Shame
              </Heading>
              <Text color="brand.dark" opacity={0.6} fontSize="sm">
                On-chain ESG greenwashing verdicts — immutably published to Nostr
              </Text>
            </VStack>
            <HStack spacing={3}>
              <Button size="sm" variant="outline" colorScheme="orange" onClick={() => navigate('/audit')}>
                Run New Audit
              </Button>
              {entries.length > 0 && (
                <Button size="sm" variant="ghost" colorScheme="red" leftIcon={<DeleteIcon />} onClick={clearAll}>
                  Clear All
                </Button>
              )}
            </HStack>
          </HStack>

          {/* Stats */}
          {entries.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Card bg="white">
                <CardBody>
                  <Stat>
                    <StatLabel color="brand.dark" opacity={0.6} fontSize="xs">Total Audits</StatLabel>
                    <StatNumber color="brand.accent">{topStats.total}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card bg="white">
                <CardBody>
                  <Stat>
                    <StatLabel color="brand.dark" opacity={0.6} fontSize="xs">Greenwashers Caught</StatLabel>
                    <StatNumber color="red.500">{topStats.greenwashers}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card bg="white">
                <CardBody>
                  <Stat>
                    <StatLabel color="brand.dark" opacity={0.6} fontSize="xs">Avg Risk Score</StatLabel>
                    <StatNumber color="brand.accent">{topStats.avgRisk}/100</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card bg="white">
                <CardBody>
                  <Stat>
                    <StatLabel color="brand.dark" opacity={0.6} fontSize="xs">Critical Alerts</StatLabel>
                    <StatNumber color="red.500">{topStats.criticalCount}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}

          {/* Table */}
          {entries.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                No audits on record yet. <Text as="span" color="brand.accent" cursor="pointer" onClick={() => navigate('/audit')}>Run your first audit →</Text>
              </AlertDescription>
            </Alert>
          ) : (
            <Card bg="white" overflow="hidden">
              <CardBody p={0}>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead bg="brand.dark">
                      <Tr>
                        <Th color="white" fontSize="xs">#</Th>
                        <Th color="white" fontSize="xs">Company</Th>
                        <Th color="white" fontSize="xs">Verdict</Th>
                        <Th color="white" fontSize="xs">Risk Level</Th>
                        <Th color="white" fontSize="xs" isNumeric>Risk Score</Th>
                        <Th color="white" fontSize="xs" isNumeric>Confidence</Th>
                        <Th color="white" fontSize="xs">Audited</Th>
                        <Th color="white" fontSize="xs">Nostr Proof</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {entries.map((entry, i) => (
                        <Tr key={i} _hover={{ bg: 'gray.50' }}>
                          <Td>
                            <Text fontWeight={700} color={i === 0 ? 'red.500' : 'brand.dark'} fontSize="xs">
                              {i === 0 ? '🔥' : i + 1}
                            </Text>
                          </Td>
                          <Td>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight={700} color="brand.dark" fontSize="sm">{entry.company}</Text>
                              <Text color="brand.dark" opacity={0.5} fontSize="10px" noOfLines={1} maxW="200px">
                                {entry.claim}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={entry.verdict?.winner ? 'green' : 'red'} fontSize="10px">
                              {entry.verdict?.aiVerdict || (entry.verdict?.winner ? 'VERIFIED' : 'GREENWASHING')}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={riskColor[entry.verdict?.riskLevel] || 'gray'} fontSize="10px">
                              {entry.verdict?.riskLevel || 'N/A'}
                            </Badge>
                          </Td>
                          <Td isNumeric>
                            <Text fontWeight={700} color={entry.verdict?.riskScore > 70 ? 'red.500' : 'brand.dark'} fontSize="sm">
                              {entry.verdict?.riskScore ?? '—'}/100
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="sm" color="brand.dark">{entry.verdict?.confidence ?? '—'}%</Text>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color="brand.dark" opacity={0.5}>
                              {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}
                            </Text>
                          </Td>
                          <Td>
                            {entry.nostrNoteId && (
                              <Text
                                as="a"
                                href={`https://njump.me/${entry.nostrNoteId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                fontSize="xs"
                                color="brand.accent"
                                _hover={{ textDecoration: 'underline' }}
                              >
                                {entry.nostrNoteId.slice(0, 12)}…
                                <ExternalLinkIcon mx={1} boxSize={3} />
                              </Text>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          )}

          {/* Blockchain note */}
          {entries.length > 0 && (
            <>
              <Divider />
              <Text fontSize="xs" color="brand.dark" opacity={0.5} textAlign="center">
                All verdicts are cryptographically signed and published to Nostr relays (relay.damus.io, nos.lol, relay.nostr.band).
                They are immutable and cannot be edited or deleted.
              </Text>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  )
}
