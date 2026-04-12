import { Box, VStack, HStack, Text, Badge, SimpleGrid } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

const MotionBox = motion(Box)

const NODE_COLORS = ['#FF6B2B', '#A78BFA', '#22C55E']
const NODE_LABELS = ['Alpha', 'Beta', 'Gamma']

const CEREMONY_PHASES = [
  { id: 'keygen', label: 'Key Generation', desc: "The master key is split into 3 pieces — like tearing a password into parts so no one person has it all" },
  { id: 'shares', label: 'Share Distribution', desc: 'Each node gets its own piece of the key — they can\'t see each other\'s pieces' },
  { id: 'nonce', label: 'Nonce Commitment', desc: 'Each node picks a random secret number and shares a locked version of it (like sealing it in an envelope)' },
  { id: 'partial', label: 'Partial Signatures', desc: 'Each node signs the verdict with its key piece — like each judge stamping a document' },
  { id: 'aggregate', label: 'Signature Aggregation', desc: 'The individual stamps are combined into one final signature — as if all judges signed together' },
  { id: 'verify', label: 'Verification', desc: 'Anyone can verify the combined signature is valid — proving at least 2 nodes agreed' },
]

function NodeCircle({ index, phase, active }) {
  const color = NODE_COLORS[index]
  const isActive = active
  return (
    <MotionBox
      animate={{
        scale: isActive ? [1, 1.15, 1] : 1,
        boxShadow: isActive ? `0 0 24px ${color}55` : `0 0 8px ${color}22`,
      }}
      transition={{ duration: 1.2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
      w="72px" h="72px" borderRadius="full"
      bg={`radial-gradient(circle, ${color}33, ${color}11)`}
      border={`2px solid ${color}${isActive ? '88' : '44'}`}
      display="flex" alignItems="center" justifyContent="center"
      flexDirection="column" position="relative"
    >
      <Text fontSize="lg" fontWeight={900} color={color}>{index + 1}</Text>
      <Text fontSize="2xs" color={`${color}`} fontWeight={600}>{NODE_LABELS[index]}</Text>
      {isActive && (
        <Box position="absolute" top="-4px" right="-4px" w="12px" h="12px"
          borderRadius="full" bg={color} className="pulse-dot"
          style={{ background: color }} />
      )}
    </MotionBox>
  )
}

function DataFlow({ from, to, color, active, label }) {
  if (!active) return null
  return (
    <MotionBox
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      transition={{ duration: 0.5 }}
      position="relative" h="2px" flex={1} mx={1}
      bg={`linear-gradient(90deg, transparent, ${color}, transparent)`}
      overflow="visible"
    >
      <MotionBox
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        position="absolute" top="-2px" w="8px" h="6px" borderRadius="full" bg={color}
        boxShadow={`0 0 12px ${color}`}
      />
      {label && (
        <Text position="absolute" top="-16px" left="50%" transform="translateX(-50%)"
          fontSize="2xs" color={color} fontWeight={600} whiteSpace="nowrap">
          {label}
        </Text>
      )}
    </MotionBox>
  )
}

export default function FROSTCeremony({ frostSignature, oracleResults }) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const timerRef = useRef(null)

  // Auto-advance phases
  useEffect(() => {
    if (!autoPlay) return
    timerRef.current = setInterval(() => {
      setCurrentPhase(p => (p + 1) % CEREMONY_PHASES.length)
    }, 2500)
    return () => clearInterval(timerRef.current)
  }, [autoPlay])

  const phase = CEREMONY_PHASES[currentPhase]
  const participatingNodes = frostSignature?.participatingNodes || [1, 2]
  const allNodes = [1, 2, 3]

  return (
    <Box className="glass" borderRadius="20px" p={6} border="1px solid rgba(167,139,250,0.2)" overflow="hidden">
      <VStack spacing={5} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontWeight={700} color="white" fontSize="sm">FROST Ceremony Visualization</Text>
            <Text fontSize="2xs" color="rgba(255,255,255,0.5)">
              Watch how 3 oracle nodes create a joint digital signature — at least 2 must participate
            </Text>
          </VStack>
          <Badge bg="rgba(167,139,250,0.15)" color="#A78BFA" fontSize="2xs" borderRadius="full" px={3}
            cursor="pointer" onClick={() => setAutoPlay(a => !a)}
            border="1px solid rgba(167,139,250,0.3)">
            {autoPlay ? '⏸ Auto' : '▶ Play'}
          </Badge>
        </HStack>

        {/* Phase timeline */}
        <HStack spacing={1} justify="center">
          {CEREMONY_PHASES.map((p, i) => (
            <Box key={p.id} flex={1} h="3px" borderRadius="full" cursor="pointer"
              onClick={() => { setCurrentPhase(i); setAutoPlay(false) }}
              bg={i <= currentPhase ? `linear-gradient(90deg, #A78BFA, #FF6B2B)` : 'rgba(255,255,255,0.08)'}
              transition="background 0.3s" />
          ))}
        </HStack>

        {/* Current phase label */}
        <AnimatePresence mode="wait">
          <MotionBox key={phase.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}>
            <VStack spacing={1} textAlign="center">
              <Text fontSize="xs" color="#A78BFA" fontWeight={700} letterSpacing="widest">
                PHASE {currentPhase + 1}: {phase.label.toUpperCase()}
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.6)">{phase.desc}</Text>
            </VStack>
          </MotionBox>
        </AnimatePresence>

        {/* Node visualization */}
        <HStack justify="center" spacing={0} py={4}>
          {allNodes.map((nodeId, i) => (
            <HStack key={nodeId} spacing={0}>
              <NodeCircle
                index={i}
                phase={currentPhase}
                active={
                  currentPhase < 2
                    ? true
                    : participatingNodes.includes(nodeId)
                }
              />
              {i < allNodes.length - 1 && (
                <DataFlow
                  from={i} to={i + 1}
                  color={NODE_COLORS[i]}
                  active={currentPhase >= 2 && currentPhase <= 4}
                  label={currentPhase === 2 ? 'R_i' : currentPhase === 3 ? 'z_i' : currentPhase === 4 ? 'Σz' : ''}
                />
              )}
            </HStack>
          ))}
        </HStack>

        {/* Math display */}
        <Box p={3} bg="rgba(0,0,0,0.4)" borderRadius="lg" border="1px solid rgba(167,139,250,0.1)">
          <AnimatePresence mode="wait">
            <MotionBox key={currentPhase}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <VStack spacing={1}>
                <Text fontSize="xs" fontFamily="mono" color="rgba(255,255,255,0.7)" textAlign="center">
                  {currentPhase === 0 && 'f(x) = s + a₁·x  mod n  |  threshold t = 2, parties n = 3'}
                  {currentPhase === 1 && 's₁ = f(1), s₂ = f(2), s₃ = f(3)  |  P_i = s_i·G'}
                  {currentPhase === 2 && 'k_i ← random  |  R_i = k_i·G  |  broadcast R_i to peers'}
                  {currentPhase === 3 && 'e = H("BIP0340/challenge" ‖ R ‖ P ‖ m)  |  z_i = k_i + e·λ_i·s_i'}
                  {currentPhase === 4 && 'R = ΣR_i  |  z = Σz_i  |  σ = (R_x, z)  ← 64 bytes BIP-340'}
                  {currentPhase === 5 && 'Verify: z·G ≟ R + e·P  |  ✓ Valid BIP-340 Schnorr signature'}
                </Text>
                <Text fontSize="2xs" color="rgba(255,255,255,0.35)" textAlign="center">
                  {currentPhase === 0 && 'A math formula splits the secret key into 3 shares'}
                  {currentPhase === 1 && 'Each node gets its own share and creates a public key from it'}
                  {currentPhase === 2 && 'Nodes pick random numbers and share commitments (sealed envelopes)'}
                  {currentPhase === 3 && 'Each node combines its random number + key share to create a partial signature'}
                  {currentPhase === 4 && 'All partial signatures are added together into one 64-byte final signature'}
                  {currentPhase === 5 && 'Anyone can check: does the math add up? If yes, the signature is legit'}
                </Text>
              </VStack>
            </MotionBox>
          </AnimatePresence>
        </Box>

        {/* Signature result (if available) */}
        {frostSignature && (
          <SimpleGrid columns={2} spacing={2}>
            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.12)">
              <Text fontSize="2xs" color="rgba(255,255,255,0.5)">R (Nonce) <Text as="span" color="rgba(255,255,255,0.3)">— random lock value</Text></Text>
              <Text fontSize="2xs" fontFamily="mono" color="#A78BFA" wordBreak="break-all">
                {frostSignature.R?.slice(0, 32)}...
              </Text>
            </Box>
            <Box p={2} bg="rgba(0,0,0,0.3)" borderRadius="md" border="1px solid rgba(167,139,250,0.12)">
              <Text fontSize="2xs" color="rgba(255,255,255,0.5)">s (Scalar) <Text as="span" color="rgba(255,255,255,0.3)">— combined signature value</Text></Text>
              <Text fontSize="2xs" fontFamily="mono" color="#A78BFA" wordBreak="break-all">
                {frostSignature.s?.slice(0, 32)}...
              </Text>
            </Box>
          </SimpleGrid>
        )}
      </VStack>
    </Box>
  )
}
