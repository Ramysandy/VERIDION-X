import {
  Box, Container, VStack, HStack, Text, Input, Button,
  SimpleGrid, Badge, Progress, useToast,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { useAuditStore } from '../store/auditStore'

const MotionBox  = motion(Box)
const MotionText = motion(Text)

/* ── TypeWriter component ─────────────────────────────────────── */
function TypeWriter({ words, color }) {
  const [idx, setIdx]      = useState(0)
  const [chars, setChars]  = useState(0)
  const [deleting, setDel] = useState(false)
  useEffect(() => {
    const cur = words[idx]
    let t
    if (!deleting && chars < cur.length)       t = setTimeout(() => setChars(c => c + 1), 75)
    else if (!deleting && chars === cur.length) t = setTimeout(() => setDel(true), 2200)
    else if (deleting  && chars > 0)           t = setTimeout(() => setChars(c => c - 1), 38)
    else { setDel(false); setIdx(i => (i + 1) % words.length) }
    return () => clearTimeout(t)
  }, [chars, deleting, idx, words])
  return (
    <Text as="span" color={color || 'white'} fontWeight={700}>
      {words[idx].slice(0, chars)}<span className="cursor-blink">|</span>
    </Text>
  )
}

const TAGLINES = ['FROST Oracle Consensus.', 'Taproot-Secured Verdicts.', 'Unbribable AI Justice.']

const STATS = [
  { value: '3', label: 'Oracle Nodes', sub: 'FROST threshold MPC' },
  { value: '2/3', label: 'Consensus', sub: 'Schnorr threshold sigs' },
  { value: 'P2TR', label: 'Taproot', sub: 'BIP-341 key-path spend' },
  { value: '∞', label: 'Immutable', sub: 'Bitcoin + Nostr proofs' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: '🛰️', title: 'The Hunt', desc: '3 independent FROST oracle nodes query EIA, EPA & SEC EDGAR federal databases simultaneously.' },
  { step: '02', icon: '🤖', title: 'The Consensus', desc: 'Each node runs Groq llama-3.3-70b independently. If 2-of-3 detect fraud, they exchange Schnorr nonce commitments.' },
  { step: '03', icon: '⚡', title: 'The Strike', desc: 'Partial signatures aggregate into one BIP-340 Schnorr signature. The verdict is inscribed on Bitcoin via Taproot OP_RETURN.' },
]

const FEATURES = [
  { icon: '🔐', title: 'FROST Threshold', desc: '2-of-3 Schnorr threshold signatures via Shamir\'s Secret Sharing and Lagrange interpolation. No single point of failure.', tag: 'Cryptography' },
  { icon: '₿', title: 'Bitcoin Taproot', desc: 'BIP-341 P2TR addresses with Tapscript spending paths. Verdicts inscribed on-chain via OP_RETURN with Merkle proofs.', tag: 'Settlement' },
  { icon: '🛰️', title: 'NASA Satellite + Federal', desc: 'EIA energy, EPA eGRID CO₂, SEC EDGAR, and NASA POWER satellite data — real government + space data, not self-reports.', tag: 'Data Sources' },
  { icon: '🔗', title: 'Nostr + Bitcoin', desc: 'Dual-layer immutability: Nostr censorship-resistant relay broadcast and Bitcoin blockchain inscription.', tag: 'Decentralized' },
]

const QUICK_COMPANIES = ['ExxonMobil', 'Amazon', 'Shell', 'BP', 'Tesla']

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

export default function LandingPage() {
  const navigate  = useNavigate()
  const toast     = useToast()
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuditCompany = useAuditStore((s) => s.setAuditCompany)
  const setClaimData    = useAuditStore((s) => s.setClaimData)

  const handleAudit = async (name) => {
    const target = (name || company).trim()
    if (!target) {
      toast({ title: 'Enter a company name', status: 'warning', duration: 2, isClosable: true })
      return
    }
    setLoading(true)
    try {
      setAuditCompany(target)
      navigate('/audit')
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 4, isClosable: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="aurora-bg grid-bg" minH="100vh" position="relative" overflow="hidden">
      {/* Floating orbs */}
      <Box className="orb orb-orange" style={{ top: '10%', right: '8%',  width: 380, height: 380 }} />
      <Box className="orb orb-purple" style={{ top: '40%', left: '-5%',  width: 320, height: 320 }} />
      <Box className="orb orb-cyan"   style={{ bottom: '10%', right: '15%', width: 240, height: 240 }} />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <Container maxW="container.xl" pt={{ base: 24, md: 32 }} pb={20}>
        <motion.div variants={stagger} initial="hidden" animate="show">
          <VStack spacing={8} align="center" textAlign="center">

            {/* Live badge */}
            <MotionBox variants={fadeUp}>
              <Badge
                bg="rgba(255,107,43,0.15)" color="#FF9B51"
                borderRadius="full" px={4} py={1}
                border="1px solid rgba(255,107,43,0.3)"
                fontSize="xs" letterSpacing="widest" fontWeight={700}>
                <HStack spacing={2}>
                  <span className="pulse-dot" />
                  <span>LIVE · FROST ORACLE NETWORK</span>
                </HStack>
              </Badge>
            </MotionBox>

            {/* Main heading */}
            <MotionBox variants={fadeUp}>
              <VStack spacing={2}>
                <Text
                  fontSize={{ base: '3.5rem', md: '6.5rem' }}
                  fontWeight={900} lineHeight={1}
                  className="gradient-text logo-font"
                  letterSpacing="0.04em">
                  VERIDION-X
                </Text>
                <Text fontSize={{ base: 'xl', md: '2xl' }} color="rgba(255,255,255,0.65)" fontWeight={400} minH="2rem">
                  <TypeWriter words={TAGLINES} />
                </Text>
              </VStack>
            </MotionBox>

            <MotionBox variants={fadeUp} maxW="600px">
              <Text color="rgba(255,255,255,0.65)" fontSize="lg" lineHeight={1.8}>
                A decentralized fraud court where <strong style={{ color: '#FF9B51' }}>3 independent AI oracle nodes</strong> cross-reference
                ESG claims against federal data — and seal the verdict with <strong style={{ color: '#A78BFA' }}>FROST threshold Schnorr signatures</strong> on Bitcoin.
              </Text>
            </MotionBox>

            {/* Search card */}
            <MotionBox variants={fadeUp} w="full" maxW="580px">
              <Box
                className="glass glow-orange"
                borderRadius="20px"
                p={6}
                border="1px solid rgba(255,107,43,0.25)">
                <VStack spacing={4}>
                  <input
                    className="neon-input"
                    style={{
                      width: '100%', padding: '14px 18px',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,107,43,0.3)',
                      borderRadius: '12px', color: 'white',
                      fontSize: '16px', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    placeholder="Enter company name — e.g. ExxonMobil"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                  />
                  <Button
                    w="full" h="52px"
                    className="shimmer-btn"
                    bg="linear-gradient(135deg, #FF6B2B 0%, #FBBF24 100%)"
                    color="white" fontWeight={800} fontSize="md"
                    borderRadius="12px"
                    rightIcon={<ArrowForwardIcon />}
                    isLoading={loading}
                    loadingText="Starting..."
                    onClick={() => handleAudit()}
                    _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }}
                    transition="all 0.2s">
                    Deploy Oracle Nodes
                  </Button>
                  {/* Quick picks */}
                  <HStack spacing={2} flexWrap="wrap" justify="center">
                    <Text fontSize="xs" color="rgba(255,255,255,0.35)">Quick audit:</Text>
                    {QUICK_COMPANIES.map(co => (
                      <Button key={co} size="xs" variant="ghost"
                        color="rgba(255,255,255,0.5)"
                        border="1px solid rgba(255,255,255,0.1)"
                        borderRadius="full"
                        _hover={{ color: '#FF9B51', borderColor: 'rgba(255,107,43,0.4)', bg: 'rgba(255,107,43,0.06)' }}
                        onClick={() => handleAudit(co)}>
                        {co}
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              </Box>
            </MotionBox>

          </VStack>
        </motion.div>
      </Container>

      {/* ── STATS BAR ───────────────────────────────────────────────── */}
      <Box py={12} borderTop="1px solid rgba(255,255,255,0.06)" borderBottom="1px solid rgba(255,255,255,0.06)">
        <Container maxW="container.xl">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
              {STATS.map(({ value, label, sub }) => (
                <MotionBox key={label} variants={fadeUp} textAlign="center">
                  <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight={900} className="gradient-text">{value}</Text>
                  <Text color="white" fontWeight={700} fontSize="sm">{label}</Text>
                  <Text color="rgba(255,255,255,0.45)" fontSize="xs">{sub}</Text>
                </MotionBox>
              ))}
            </SimpleGrid>
          </motion.div>
        </Container>
      </Box>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <Container maxW="container.xl" py={24}>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <VStack spacing={12}>
            <MotionBox variants={fadeUp} textAlign="center">
              <Text fontSize="xs" color="#FF9B51" fontWeight={700} letterSpacing="widest" mb={2}>THE PIPELINE</Text>
              <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight={900} color="white">How It Works</Text>
            </MotionBox>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
                <MotionBox key={step} variants={fadeUp}>
                  <Box className="glass card-hover" p={7} borderRadius="20px"
                    border="1px solid rgba(255,107,43,0.12)" h="full">
                    <VStack align="start" spacing={3}>
                      <HStack>
                        <Text fontSize="2xl">{icon}</Text>
                        <Text fontSize="xs" color="rgba(255,107,43,0.7)" fontWeight={700} letterSpacing="widest">STEP {step}</Text>
                      </HStack>
                      <Text color="white" fontWeight={700} fontSize="lg">{title}</Text>
                      <Text color="rgba(255,255,255,0.7)" fontSize="sm" lineHeight={1.7}>{desc}</Text>
                    </VStack>
                  </Box>
                </MotionBox>
              ))}
            </SimpleGrid>
          </VStack>
        </motion.div>
      </Container>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <Box bg="rgba(0,0,0,0.2)" py={24} borderTop="1px solid rgba(255,255,255,0.04)">
        <Container maxW="container.xl">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <VStack spacing={12}>
              <MotionBox variants={fadeUp} textAlign="center">
                <Text fontSize="xs" color="#5B7FFF" fontWeight={700} letterSpacing="widest" mb={2}>CAPABILITIES</Text>
                <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight={900} color="white">Built for Truth</Text>
              </MotionBox>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} w="full">
                {FEATURES.map(({ icon, title, desc, tag }) => (
                  <MotionBox key={title} variants={fadeUp}>
                    <Box className="glass card-hover" p={6} borderRadius="16px"
                      border="1px solid rgba(255,255,255,0.06)" h="full">
                      <VStack align="start" spacing={3}>
                        <Text fontSize="2xl">{icon}</Text>
                        <Badge bg="rgba(255,107,43,0.1)" color="#FF9B51" borderRadius="full" px={2} fontSize="9px">
                          {tag}
                        </Badge>
                        <Text color="white" fontWeight={700}>{title}</Text>
                        <Text color="rgba(255,255,255,0.65)" fontSize="xs" lineHeight={1.7}>{desc}</Text>
                      </VStack>
                    </Box>
                  </MotionBox>
                ))}
              </SimpleGrid>
            </VStack>
          </motion.div>
        </Container>
      </Box>

      {/* ── DATA SOURCES STRIP ──────────────────────────────────────── */}
      <Box py={10} borderTop="1px solid rgba(255,255,255,0.06)">
        <Container maxW="container.xl">
          <VStack spacing={4}>
            <Text fontSize="xs" color="rgba(255,255,255,0.4)" letterSpacing="widest">POWERED BY</Text>
            <HStack spacing={8} flexWrap="wrap" justify="center">
              {['🔐 FROST Schnorr', '₿ Bitcoin Taproot', '🛰️ NASA POWER', '🏛️ EIA + EPA + SEC', '🤖 Groq AI', '🔗 Nostr'].map(src => (
                <Text key={src} color="rgba(255,255,255,0.6)" fontSize="sm" fontWeight={600}>{src}</Text>
              ))}
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <Container maxW="container.md" py={24}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <Box className="gradient-border glass" p={10} borderRadius="24px" textAlign="center">
            <VStack spacing={6}>
              <Text fontSize="xs" color="#FF9B51" fontWeight={700} letterSpacing="widest">GET STARTED</Text>
              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight={900} color="white" lineHeight={1.2}>
                No single oracle.<br />No single point of failure.
              </Text>
              <Text color="rgba(255,255,255,0.6)" maxW="420px">
                One company name. Three independent AI oracles. One FROST-signed Bitcoin verdict.
              </Text>
              <Button
                className="shimmer-btn"
                bg="linear-gradient(135deg, #FF6B2B, #FBBF24)"
                color="white" fontWeight={800}
                px={10} py={7} borderRadius="14px"
                onClick={() => navigate('/audit')}
                _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }}
                transition="all 0.2s">
                Start Free Audit →
              </Button>
            </VStack>
          </Box>
        </motion.div>
      </Container>

    </Box>
  )
}
