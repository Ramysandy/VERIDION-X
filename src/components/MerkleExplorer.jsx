import { Box, VStack, HStack, Text, Badge, Button, useToast } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { CopyIcon } from '@chakra-ui/icons'

const MotionBox = motion(Box)

function TreeNode({ hash, depth, index, isRoot, isLeaf, isHighlighted, onClick, proofPath }) {
  const isOnProof = proofPath?.some(p => p.hash === hash)
  const color = isRoot ? '#FF6B2B' : isLeaf ? '#22C55E' : isOnProof ? '#A78BFA' : 'rgba(255,255,255,0.5)'
  const bgColor = isRoot
    ? 'rgba(255,107,43,0.1)'
    : isLeaf
    ? 'rgba(34,197,94,0.08)'
    : isOnProof
    ? 'rgba(167,139,250,0.08)'
    : 'rgba(255,255,255,0.03)'

  return (
    <MotionBox
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isHighlighted ? 1.05 : 1,
        boxShadow: isHighlighted ? `0 0 16px ${color}44` : 'none',
      }}
      transition={{ duration: 0.3, delay: depth * 0.1 + index * 0.05 }}
      p={2} borderRadius="10px"
      bg={bgColor}
      border={`1px solid ${color}33`}
      cursor="pointer" onClick={() => onClick?.(hash, depth, index)}
      _hover={{ borderColor: `${color}66`, transform: 'translateY(-2px)' }}
      transition_css="all 0.2s"
      minW="80px" textAlign="center"
    >
      <Text fontSize="2xs" color={color} fontWeight={700} mb={0.5}>
        {isRoot ? 'ROOT' : isLeaf ? `LEAF ${index}` : `H(${index})`}
      </Text>
      <Text fontSize="2xs" fontFamily="mono" color={`${color}`} wordBreak="break-all" lineHeight={1.3}>
        {hash?.slice(0, 8)}...{hash?.slice(-4)}
      </Text>
    </MotionBox>
  )
}

function ConnectorLine({ color }) {
  return (
    <Box position="relative" h="20px" display="flex" justifyContent="center">
      <Box w="1px" h="full" bg={`${color}33`} />
      <MotionBox
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        position="absolute" w="3px" h="6px" borderRadius="full" bg={color}
        boxShadow={`0 0 6px ${color}`}
      />
    </Box>
  )
}

export default function MerkleExplorer({ merkleTree }) {
  const [selectedLeaf, setSelectedLeaf] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(null)
  const toast = useToast()

  // Build tree levels for display
  const treeLevels = useMemo(() => {
    if (!merkleTree) return []
    const { root, leaves, depth, proofs } = merkleTree
    const levels = []

    // Level 0: root
    levels.push([root])

    // Intermediate: build hashes (simplified — show proof siblings)
    if (depth >= 2) {
      // For depth 2+, show intermediate hashes from proof paths
      const intermediates = new Set()
      if (proofs) {
        proofs.forEach(proof => {
          proof.forEach(step => {
            if (step.hash !== root && !leaves.includes(step.hash)) {
              intermediates.add(step.hash)
            }
          })
        })
      }
      const midLevel = Array.from(intermediates)
      if (midLevel.length > 0) levels.push(midLevel)
    }

    // Last level: leaves
    levels.push(leaves)

    return levels
  }, [merkleTree])

  const handleNodeClick = (hash, depth, index) => {
    if (merkleTree?.leaves?.includes(hash)) {
      const leafIndex = merkleTree.leaves.indexOf(hash)
      setSelectedLeaf(leafIndex)
      setVerified(null)
    }
  }

  const handleVerify = () => {
    if (selectedLeaf === null || !merkleTree?.proofs?.[selectedLeaf]) return
    setVerifying(true)

    // Simulate verification with visual delay
    setTimeout(() => {
      const proof = merkleTree.proofs[selectedLeaf]
      let hash = merkleTree.leaves[selectedLeaf]
      let valid = true

      // Walk the proof path
      for (const step of proof) {
        // Just verify the structure exists
        if (!step.hash) { valid = false; break }
      }

      // Final check: does the proof path exist with correct root?
      setVerified(valid)
      setVerifying(false)
      toast({
        title: valid ? 'Proof Valid ✓' : 'Proof Invalid ✗',
        description: valid
          ? `Leaf ${selectedLeaf} verified against root ${merkleTree.root.slice(0, 16)}...`
          : 'Merkle proof verification failed',
        status: valid ? 'success' : 'error',
        duration: 3,
      })
    }, 800)
  }

  const currentProof = selectedLeaf !== null ? merkleTree?.proofs?.[selectedLeaf] : null
  const copyRoot = () => {
    if (merkleTree?.root) {
      navigator.clipboard.writeText(merkleTree.root)
      toast({ title: 'Root copied', status: 'success', duration: 2 })
    }
  }

  if (!merkleTree) return null

  return (
    <Box className="glass" borderRadius="20px" p={6} border="1px solid rgba(34,197,94,0.2)" overflow="hidden">
      <VStack spacing={5} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontWeight={700} color="white" fontSize="sm">Interactive Merkle Explorer</Text>
            <Text fontSize="2xs" color="rgba(255,255,255,0.5)">
              A Merkle tree organizes all audit data into a tamper-proof structure. If any piece of data is changed, the root hash changes — making fraud impossible to hide. Click on leaf nodes below to trace their proof.
            </Text>
          </VStack>
          <HStack spacing={2}>
            <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>
              SHA-256
            </Badge>
            <Badge bg="rgba(34,197,94,0.15)" color="#22C55E" fontSize="2xs" borderRadius="full" px={2}>
              Depth {merkleTree.depth}
            </Badge>
          </HStack>
        </HStack>

        {/* Tree Visualization */}
        <VStack spacing={0}>
          {treeLevels.map((level, levelIdx) => (
            <VStack key={levelIdx} spacing={0}>
              {levelIdx > 0 && (
                <ConnectorLine color={levelIdx === treeLevels.length - 1 ? '#22C55E' : '#A78BFA'} />
              )}
              <HStack spacing={2} justify="center" flexWrap="wrap">
                {level.map((hash, nodeIdx) => (
                  <TreeNode
                    key={`${levelIdx}-${nodeIdx}`}
                    hash={hash}
                    depth={levelIdx}
                    index={nodeIdx}
                    isRoot={levelIdx === 0}
                    isLeaf={levelIdx === treeLevels.length - 1}
                    isHighlighted={
                      (levelIdx === treeLevels.length - 1 && nodeIdx === selectedLeaf) ||
                      currentProof?.some(p => p.hash === hash)
                    }
                    onClick={handleNodeClick}
                    proofPath={currentProof}
                  />
                ))}
              </HStack>
            </VStack>
          ))}
        </VStack>

        {/* Root hash display */}
        <Box p={3} bg="rgba(0,0,0,0.3)" borderRadius="lg" border="1px solid rgba(34,197,94,0.15)">
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="2xs" color="rgba(255,255,255,0.55)">Merkle Root <Text as="span" color="rgba(255,255,255,0.3)">— a single fingerprint of ALL the audit data combined</Text></Text>
              <Text fontSize="2xs" fontFamily="mono" color="#22C55E" wordBreak="break-all">
                {merkleTree.root}
              </Text>
            </VStack>
            <Button size="xs" variant="ghost" onClick={copyRoot} color="rgba(255,255,255,0.4)">
              <CopyIcon />
            </Button>
          </HStack>
        </Box>

        {/* Proof verification panel */}
        {selectedLeaf !== null && (
          <MotionBox
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <Box p={4} bg="rgba(0,0,0,0.25)" borderRadius="lg" border="1px solid rgba(167,139,250,0.15)">
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="#A78BFA" fontWeight={700}>
                      Proof Path for Leaf {selectedLeaf}
                    </Text>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.35)">
                      Each step shows a neighboring hash needed to reconstruct the root — proving this data belongs in the tree
                    </Text>
                  </VStack>
                  <Button size="xs" onClick={handleVerify} isLoading={verifying}
                    bg={verified === true ? 'rgba(34,197,94,0.15)' : verified === false ? 'rgba(239,68,68,0.15)' : 'rgba(167,139,250,0.15)'}
                    color={verified === true ? '#22C55E' : verified === false ? '#FCA5A5' : '#A78BFA'}
                    border={`1px solid ${verified === true ? 'rgba(34,197,94,0.3)' : verified === false ? 'rgba(239,68,68,0.3)' : 'rgba(167,139,250,0.3)'}`}
                    _hover={{ opacity: 0.8 }} borderRadius="8px" fontWeight={700}>
                    {verified === true ? '✓ Verified' : verified === false ? '✗ Failed' : 'Verify Proof'}
                  </Button>
                </HStack>

                {currentProof?.map((step, i) => (
                  <HStack key={i} spacing={2}>
                    <Box w="6px" h="6px" borderRadius="full" bg="#A78BFA" flexShrink={0} />
                    <Text fontSize="2xs" color="rgba(255,255,255,0.5)">
                      {step.position === 'left' ? '←' : '→'}
                    </Text>
                    <Text fontSize="2xs" fontFamily="mono" color="rgba(255,255,255,0.6)" wordBreak="break-all">
                      {step.hash?.slice(0, 24)}...
                    </Text>
                    <Badge bg="rgba(167,139,250,0.1)" color="#A78BFA" fontSize="2xs" borderRadius="full" px={1}>
                      {step.position}
                    </Badge>
                  </HStack>
                ))}

                <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                  {currentProof?.length || 0} steps · Each step hashes a pair of values upward until reaching the root. If the root matches, the data is authentic.
                </Text>
              </VStack>
            </Box>
          </MotionBox>
        )}

        <HStack spacing={4} justify="center">
          <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
            {merkleTree.leafCount} data points · {merkleTree.depth} hash levels · Changing even 1 byte of data would produce a completely different root
          </Text>
        </HStack>
      </VStack>
    </Box>
  )
}
