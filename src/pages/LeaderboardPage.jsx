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
import { motion } from 'framer-motion'

const MotionBox = motion(Box)
const MotionTr = motion(Tr)

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

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

  const rankIcon = (i) => i === 0 ? '\uD83D\uDD25' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `${i + 1}`

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" py={8} position="relative">
      {/* Floating orbs */}
      <Box className="orb orb-orange" style={{ top: '8%', right: '5%', width: 240, height: 240 }} />
      <Box className="orb orb-purple" style={{ bottom: '20%', left: '2%', width: 180, height: 180 }} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">

            {/* Header */}
            <MotionBox variants={fadeUp} initial="hidden" animate="show">
              <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
                <VStack align="start" spacing={1}>
                  <HStack spacing={3}>
                    <Heading as="h1" size="xl" className="gradient-text" fontFamily="heading">
                      Hall of Shame
                    </Heading>
                    <Badge bg="rgba(239,68,68,0.15)" color="#FCA5A5" borderRadius="full" px={3} fontSize="xs">
                      LIVE
                    </Badge>
                  </HStack>
                  <Text color="rgba(255,255,255,0.5)" fontSize="sm">
                    On-chain ESG greenwashing verdicts — immutably published to Nostr
                  </Text>
                </VStack>
                <HStack spacing={3}>
                  <Button size="sm" className="shimmer-btn"
                    bg="linear-gradient(135deg,#FF6B2B,#FBBF24)" color="white" fontWeight={700}
                    _hover={{ opacity: 0.9 }}
                    onClick={() => navigate('/audit')}>
                    Run New Audit
                  </Button>
                  {entries.length > 0 && (
                    <Button size="sm" variant="outline"
                      borderColor="rgba(239,68,68,0.3)" color="#FCA5A5"
                      _hover={{ bg: 'rgba(239,68,68,0.08)' }}
                      leftIcon={<DeleteIcon />} onClick={clearAll}>
                      Clear All
                    </Button>
                  )}
                </HStack>
              </HStack>
            </MotionBox>

            {/* Stats */}
            {entries.length > 0 && (
              <motion.div variants={stagger} initial="hidden" animate="show">
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {[
                    { label: 'Total Audits', value: topStats.total, color: '#FF6B2B' },
                    { label: 'Greenwashers Caught', value: topStats.greenwashers, color: '#FCA5A5' },
                    { label: 'Avg Risk Score', value: `${topStats.avgRisk}/100`, color: '#FF6B2B' },
                    { label: 'Critical Alerts', value: topStats.criticalCount, color: '#FCA5A5' },
                  ].map(({ label, value, color }) => (
                    <MotionBox key={label} variants={fadeUp}>
                      <Card className="glass" border="1px solid rgba(255,107,43,0.1)">
                        <CardBody py={4}>
                          <Stat>
                            <StatLabel color="rgba(255,255,255,0.45)" fontSize="xs">{label}</StatLabel>
                            <StatNumber color={color} fontSize="xl">{value}</StatNumber>
                          </Stat>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </SimpleGrid>
              </motion.div>
            )}

            {/* Table or Empty State */}
            {entries.length === 0 ? (
              <Card className="glass" border="1px solid rgba(255,255,255,0.08)">
                <CardBody>
                  <VStack spacing={4} py={8}>
                    <Text fontSize="4xl">🔍</Text>
                    <Heading size="md" color="white">No audits on record yet</Heading>
                    <Text color="rgba(255,255,255,0.5)" textAlign="center">
                      Run your first audit to expose ESG greenwashing
                    </Text>
                    <Button className="shimmer-btn"
                      bg="linear-gradient(135deg,#FF6B2B,#FBBF24)" color="white" fontWeight={700}
                      onClick={() => navigate('/audit')}>
                      Start Audit →
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <Card className="glass" border="1px solid rgba(255,107,43,0.15)" overflow="hidden">
                <CardBody p={0}>
                  <TableContainer>
                    <Table variant="unstyled" size="sm">
                      <Thead>
                        <Tr bg="rgba(255,107,43,0.08)" borderBottom="1px solid rgba(255,107,43,0.2)">
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs" py={3}>#</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs">Company</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs">Verdict</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs">Risk Level</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs" isNumeric>Risk Score</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs" isNumeric>Confidence</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs">Audited</Th>
                          <Th color="rgba(255,255,255,0.5)" fontSize="xs">Nostr Proof</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {entries.map((entry, i) => (
                          <MotionTr
                            key={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="show"
                            transition={{ delay: i * 0.06 }}
                            borderBottom="1px solid rgba(255,255,255,0.04)"
                            _hover={{ bg: 'rgba(255,107,43,0.05)' }}
                          >
                            <Td width="40px">
                              <Text fontWeight={700}
                                color={i === 0 ? '#FF6B2B' : 'rgba(255,255,255,0.5)'}
                                fontSize="sm">
                                {rankIcon(i)}
                              </Text>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight={700} color="white" fontSize="sm">{entry.company}</Text>
                                <Text color="rgba(255,255,255,0.35)" fontSize="10px" noOfLines={1} maxW="200px">
                                  {entry.claim}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Badge
                                bg={entry.verdict?.winner ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}
                                color={entry.verdict?.winner ? '#22C55E' : '#FCA5A5'}
                                borderRadius="full" fontSize="9px" px={2}>
                                {entry.verdict?.aiVerdict || (entry.verdict?.winner ? 'VERIFIED' : 'GREENWASHING')}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge
                                bg={entry.verdict?.riskLevel === 'CRITICAL' || entry.verdict?.riskLevel === 'HIGH'
                                  ? 'rgba(239,68,68,0.12)'
                                  : entry.verdict?.riskLevel === 'MEDIUM'
                                  ? 'rgba(251,191,36,0.12)'
                                  : 'rgba(34,197,94,0.12)'}
                                color={entry.verdict?.riskLevel === 'CRITICAL' || entry.verdict?.riskLevel === 'HIGH'
                                  ? '#FCA5A5'
                                  : entry.verdict?.riskLevel === 'MEDIUM'
                                  ? '#FBBF24'
                                  : '#22C55E'}
                                borderRadius="full" fontSize="9px" px={2}>
                                {entry.verdict?.riskLevel || 'N/A'}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <Text fontWeight={800}
                                color={entry.verdict?.riskScore > 70 ? '#FCA5A5' : entry.verdict?.riskScore > 40 ? '#FBBF24' : '#22C55E'}
                                fontSize="sm">
                                {entry.verdict?.riskScore ?? '\u2014'}/100
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text fontSize="sm" color="rgba(255,255,255,0.7)">{entry.verdict?.confidence ?? '\u2014'}%</Text>
                            </Td>
                            <Td>
                              <Text fontSize="xs" color="rgba(255,255,255,0.35)">
                                {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '\u2014'}
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
                                  color="#5B7FFF"
                                  _hover={{ textDecoration: 'underline' }}
                                >
                                  {entry.nostrNoteId.slice(0, 10)}\u2026
                                  <ExternalLinkIcon mx={1} boxSize={3} />
                                </Text>
                              )}
                            </Td>
                          </MotionTr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            )}

            {entries.length > 0 && (
              <>
                <Divider borderColor="rgba(255,255,255,0.06)" />
                <Text fontSize="xs" color="rgba(255,255,255,0.25)" textAlign="center">
                  All verdicts are cryptographically signed and published to Nostr relays (relay.damus.io, nos.lol, relay.nostr.band).
                  They are immutable and cannot be edited or deleted.
                </Text>
              </>
            )}

          </VStack>
        </Container>
      </motion.div>
    </Box>
  )
}
