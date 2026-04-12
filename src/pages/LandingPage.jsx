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

const TAGLINES = ['FROST Oracle Consensus.', 'Taproot-Secured Verdicts.', '⚡ Lightning Bounty Payouts.', 'Unbribable AI Justice.']

const STATS = [
  { value: '3', label: 'Oracle Nodes', sub: 'FROST threshold MPC' },
  { value: '2/3', label: 'Consensus', sub: 'Schnorr threshold sigs' },
  { value: '⚡', label: 'Lightning Pay', sub: 'Instant investigator bounty' },
  { value: '1000', label: 'Sats / Audit', sub: 'Real Bitcoin payout' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: '🛰️', title: 'The Hunt', desc: '3 FROST oracle nodes query EIA, EPA, SEC EDGAR and NASA POWER satellites. Bounty investigators stake tBTC to fund the audit.' },
  { step: '02', icon: '🤖', title: 'The Consensus', desc: 'Each node runs Groq llama-3.3-70b independently. 2-of-3 threshold triggers FROST nonce commitments. A PSBT is constructed for multi-party signing.' },
  { step: '03', icon: '🔐', title: 'The Proof', desc: 'Partial signatures aggregate into BIP-340 Schnorr. Verdict inscribed via recursive OP_RETURN chain. Merkle root seals all evidence.' },
  { step: '04', icon: '⚡', title: 'Get Paid in Bitcoin', desc: 'Audit completes → real Lightning invoice auto-generated via LNbits. Any wallet pays instantly. No bank. No Stripe. No waiting. This is why Bitcoin is essential.' },
]

const FEATURES = [
  { icon: '⚡', title: 'Lightning Bounty Payments', desc: 'When an audit completes, a real BOLT11 Lightning invoice is auto-generated via LNbits. Any wallet pays the investigator instantly. No bank, no KYC, no waiting.', tag: 'Lightning', highlight: true },
  { icon: '🔐', title: 'FROST Threshold Signatures', desc: '2-of-3 Schnorr threshold via Shamir\'s Secret Sharing. The secret key is split across 3 oracle nodes — no single party can forge a result.', tag: 'Cryptography' },
  { icon: '₿', title: 'Bounty Marketplace', desc: 'Post investigation bounties. Claim them, run audits, earn Bitcoin Lightning payouts. A real economic protocol where truth is incentivized.', tag: 'Economy' },
  { icon: '🔗', title: 'Recursive OP_RETURN Chain', desc: 'Immutable linked list of verdicts on Bitcoin — each OP_RETURN references the previous txid. Trustless, permanent audit trail.', tag: 'Settlement' },
  { icon: '🌳', title: 'Interactive Merkle Proofs', desc: 'SHA-256 Merkle tree with clickable leaf verification. Trace proof paths from any data leaf to the root hash in real-time.', tag: 'Integrity' },
  { icon: '🛰️', title: 'NASA Satellite + Federal', desc: 'EIA energy, EPA eGRID CO₂, SEC EDGAR filings, and NASA POWER satellite data — real government + space data, not self-reports.', tag: 'Data Sources' },
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
                Investigators earn <strong style={{ color: '#FBBF24' }}>⚡ Bitcoin Lightning payouts</strong> instantly.
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
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} w="full">
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

      {/* ── LIGHTNING SHOWCASE ──────────────────────────────────────── */}
      <Box py={24} position="relative" overflow="hidden" borderTop="1px solid rgba(251,191,36,0.1)">
        <Box position="absolute" inset="0" bg="linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(255,107,43,0.04) 50%, rgba(0,0,0,0) 100%)" />
        <Box position="absolute" top="50%" left="60%" transform="translate(-50%,-50%)" w="700px" h="700px" borderRadius="full" bg="rgba(251,191,36,0.05)" filter="blur(100px)" pointerEvents="none" />
        <Container maxW="container.xl" position="relative" zIndex={1}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 12, md: 20 }} alignItems="center">

            {/* Left: the pitch */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <VStack align="start" spacing={6}>
                <Box px={3} py={1} bg="rgba(251,191,36,0.12)" borderRadius="full" border="1px solid rgba(251,191,36,0.35)" display="inline-flex">
                  <Text fontSize="xs" color="#FBBF24" fontWeight={700} letterSpacing="widest">⚡ BITCOIN LIGHTNING</Text>
                </Box>
                <Text fontSize={{ base: '3xl', md: '5xl' }} fontWeight={900} color="white" lineHeight={1.1}>
                  Investigators get paid.{' '}
                  <Text as="span" bgGradient="linear(to-r, #FBBF24, #FF6B2B)" bgClip="text">Instantly.</Text>
                </Text>
                <Text color="rgba(255,255,255,0.7)" fontSize="lg" lineHeight={1.9}>
                  Every completed audit auto-generates a real{' '}
                  <Text as="span" color="#FBBF24" fontWeight={700}>Bitcoin Lightning invoice</Text>{' '}
                  via LNbits. Any wallet on earth can pay it in under a second.{' '}
                  <Text as="span" color="rgba(255,255,255,0.5)">No bank. No Stripe. No waiting. Just code and Bitcoin.</Text>
                </Text>
                <VStack align="start" spacing={3} pt={2}>
                  {[
                    { icon: '⚡', text: 'Settles in under 1 second', color: '#FBBF24' },
                    { icon: '🌍', text: 'Works for anyone, anywhere on Earth', color: '#22C55E' },
                    { icon: '🔒', text: 'No KYC, no intermediary required', color: '#A78BFA' },
                    { icon: '₿', text: 'Real Bitcoin — not a token or point', color: '#FF9B51' },
                  ].map(({ icon, text, color }) => (
                    <HStack key={text} spacing={3}>
                      <Box w="30px" h="30px" borderRadius="full" bg={`${color}1A`} flexShrink={0}
                        display="flex" alignItems="center" justifyContent="center"
                        border={`1px solid ${color}44`} boxShadow={`0 0 8px ${color}22`}>
                        <Text fontSize="sm">{icon}</Text>
                      </Box>
                      <Text color="rgba(255,255,255,0.85)" fontSize="sm" fontWeight={600}>{text}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </motion.div>

            {/* Right: live invoice card */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
              <Box
                className="glass"
                p={7} borderRadius="24px"
                border="1px solid rgba(251,191,36,0.35)"
                boxShadow="0 0 60px rgba(251,191,36,0.12), 0 0 120px rgba(251,191,36,0.06), inset 0 1px 0 rgba(251,191,36,0.15)"
                position="relative" overflow="hidden"
              >
                {/* Glow bar top */}
                <Box position="absolute" top={0} left={0} right={0} h="2px" bg="linear-gradient(90deg, transparent, #FBBF24, transparent)" />

                <VStack align="start" spacing={5}>
                  {/* Header */}
                  <HStack justify="space-between" w="full">
                    <HStack spacing={2}>
                      <Text fontSize="2xl" lineHeight={1}>⚡</Text>
                      <VStack align="start" spacing={0}>
                        <Text color="white" fontWeight={800} fontSize="md">Investigator Payment</Text>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.45)">Bitcoin Lightning Network</Text>
                      </VStack>
                    </HStack>
                    <HStack spacing={2}>
                      <Box w="6px" h="6px" borderRadius="full" bg="#22C55E" boxShadow="0 0 6px #22C55E" />
                      <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" borderRadius="full" px={3} fontSize="2xs">LIVE</Badge>
                    </HStack>
                  </HStack>

                  {/* Amount block */}
                  <Box w="full" p={5} bg="rgba(251,191,36,0.06)" borderRadius="16px" border="1px solid rgba(251,191,36,0.2)">
                    <HStack justify="space-between" align="flex-end">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.45)" textTransform="uppercase" letterSpacing="0.08em">Bounty Amount</Text>
                        <HStack align="baseline" spacing={1}>
                          <Text fontSize="5xl" fontWeight={900} color="#FBBF24" lineHeight={1}>1,000</Text>
                          <Text fontSize="lg" color="rgba(251,191,36,0.7)" fontWeight={700}>sats</Text>
                        </HStack>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.35)">≈ $0.65 USD · testnet demo</Text>
                      </VStack>
                      <VStack align="end" spacing={1}>
                        <Badge bg="rgba(251,191,36,0.1)" color="#FBBF24" fontSize="2xs" borderRadius="full" px={2}>ESG Audit</Badge>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.35)">Auto-generated</Text>
                      </VStack>
                    </HStack>
                  </Box>

                  {/* BOLT11 invoice */}
                  <Box w="full">
                    <HStack mb={2} justify="space-between">
                      <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing="0.08em">BOLT11 Invoice</Text>
                      <Text fontSize="2xs" color="#FBBF24">Scan with any Lightning wallet</Text>
                    </HStack>
                    <Box p={3} bg="rgba(0,0,0,0.45)" borderRadius="12px" border="1px solid rgba(251,191,36,0.25)"
                      boxShadow="inset 0 1px 4px rgba(0,0,0,0.3)">
                      <Text fontSize="2xs" fontFamily="mono" wordBreak="break-all">
                        <Text as="span" color="#FBBF24" fontWeight={700}>lnbc10u1</Text>
                        <Text as="span" color="rgba(255,255,255,0.6)">p5a4hkwpp5sk7a6ydjnd40kly</Text>
                        <Text as="span" color="rgba(255,255,255,0.35)">gavwnz86thd3kjxf35h2wdm4zqmc8q</Text>
                        <Text as="span" color="rgba(255,255,255,0.2)">pp5jhejvg5kzlem9kcb...</Text>
                      </Text>
                    </Box>
                  </Box>

                  {/* Stats row */}
                  <SimpleGrid columns={3} spacing={3} w="full">
                    {[
                      { label: 'Settlement', value: '< 1s', color: '#22C55E' },
                      { label: 'Network', value: 'Lightning', color: '#FBBF24' },
                      { label: 'Custody', value: 'None', color: '#A78BFA' },
                    ].map(({ label, value, color }) => (
                      <Box key={label} p={3} bg="rgba(0,0,0,0.3)" borderRadius="10px"
                        border="1px solid rgba(255,255,255,0.06)" textAlign="center">
                        <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{label}</Text>
                        <Text fontSize="sm" color={color} fontWeight={800}>{value}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>

                  {/* Footer note */}
                  <Box w="full" p={3} bg="rgba(251,191,36,0.05)" borderRadius="10px" border="1px solid rgba(251,191,36,0.12)">
                    <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textAlign="center">
                      ✓ Generated by <Text as="span" color="#FBBF24" fontWeight={600}>LNbits</Text> · Real Bitcoin infrastructure · Paste into Phoenix, Breez, or BlueWallet
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </motion.div>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <Box bg="rgba(0,0,0,0.2)" py={24} borderTop="1px solid rgba(255,255,255,0.04)">
        <Container maxW="container.xl">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <VStack spacing={12}>
              <MotionBox variants={fadeUp} textAlign="center">
                <Text fontSize="xs" color="#5B7FFF" fontWeight={700} letterSpacing="widest" mb={2}>CAPABILITIES</Text>
                <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight={900} color="white">Built for Truth</Text>
              </MotionBox>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} w="full">
                {FEATURES.map(({ icon, title, desc, tag, highlight }) => (
                  <MotionBox key={title} variants={fadeUp}>
                    <Box className="glass card-hover" p={6} borderRadius="16px"
                      border={highlight ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)'}
                      h="full"
                      bg={highlight ? 'rgba(251,191,36,0.04)' : 'undefined'}
                      boxShadow={highlight ? '0 0 30px rgba(251,191,36,0.08)' : 'none'}
                      position="relative" overflow="hidden">
                      {highlight && (
                        <Box position="absolute" top={0} left={0} right={0} h="2px" bg="linear-gradient(90deg, transparent, #FBBF24, transparent)" />
                      )}
                      <VStack align="start" spacing={3}>
                        <Text fontSize="2xl">{icon}</Text>
                        <Badge
                          bg={highlight ? 'rgba(251,191,36,0.15)' : 'rgba(255,107,43,0.1)'}
                          color={highlight ? '#FBBF24' : '#FF9B51'}
                          borderRadius="full" px={2} fontSize="9px">
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
              {['⚡ Lightning Pay', '🔐 FROST Schnorr', '₿ Bitcoin Taproot', '🛠️ PSBT Signing', '🛰️ NASA POWER', '🏛️ EIA + EPA + SEC', '🤖 Groq AI', '🔗 Nostr', '🌳 Merkle Proofs'].map((src, i) => (
                <Text key={src} color={i === 0 ? '#FBBF24' : 'rgba(255,255,255,0.6)'} fontSize="sm" fontWeight={i === 0 ? 700 : 600}>{src}</Text>
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
              <Text fontSize="xs" color="#FF9B51" fontWeight={700} letterSpacing="widest">DECENTRALIZED FRAUD COURT + LIGHTNING PAYMENTS</Text>
              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight={900} color="white" lineHeight={1.2}>
                Stake. Investigate. Get Paid in Bitcoin.
              </Text>
              <Text color="rgba(255,255,255,0.6)" maxW="460px">
                Fund investigation bounties. Run FROST oracle audits. Earn instant{' '}
                <Text as="span" color="#FBBF24" fontWeight={700}>⚡ Bitcoin Lightning payouts</Text>{' '}
                the moment your audit completes. No intermediary. No waiting.
              </Text>
              <HStack spacing={3}>
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
                <Button
                  variant="outline"
                  borderColor="rgba(167,139,250,0.4)" color="#A78BFA"
                  px={8} py={7} borderRadius="14px" fontWeight={700}
                  _hover={{ bg: 'rgba(167,139,250,0.08)', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  onClick={() => navigate('/marketplace')}>
                  Bounty Marketplace
                </Button>
              </HStack>
            </VStack>
          </Box>
        </motion.div>
      </Container>

    </Box>
  )
}
