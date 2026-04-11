import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)

const LOG_COLORS = {
  system: 'rgba(255,255,255,0.7)',
  crypto: '#C4B5FD',    // lighter purple
  fetch: '#93C5FD',     // lighter blue
  data: '#6EE7B7',      // lighter green
  ai: '#FCD34D',        // lighter amber
  alert: '#FCA5A5',     // lighter red
  success: '#4ADE80',   // bright green
  warn: '#FBBF24',      // orange
  error: '#FCA5A5',     // lighter red
  detail: 'rgba(255,255,255,0.6)',
}

const LOG_PREFIX = {
  system: '│',
  crypto: '🔐',
  fetch: '→',
  data: '←',
  ai: '◆',
  alert: '⚠',
  success: '✓',
  warn: '!',
  error: '✗',
  detail: '·',
}

const STATUS_COLORS = {
  waiting: '#6B7280',
  running: '#FBBF24',
  done: '#22C55E',
  error: '#EF4444',
}

const NODE_COLORS = {
  1: '#FF6B2B',
  2: '#A78BFA',
  3: '#22D3EE',
}

export default function OracleTerminal({ nodeId, logs = [], status = 'waiting' }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length])

  const nodeColor = NODE_COLORS[nodeId] || '#FF6B2B'

  const borderColor =
    status === 'done'
      ? 'rgba(34,197,94,0.35)'
      : status === 'running'
      ? `${nodeColor}44`
      : 'rgba(255,255,255,0.06)'

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: (nodeId - 1) * 0.12 }}
      bg="rgba(0,0,0,0.6)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
      backdropFilter="blur(16px)"
      h={{ base: '240px', md: '320px' }}
      position="relative"
      _before={status === 'running' ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        h: '2px',
        bg: `linear-gradient(90deg, transparent, ${nodeColor}, transparent)`,
        animation: 'shimmer 2s infinite',
      } : {}}
    >
      {/* Terminal header */}
      <HStack
        px={3}
        py={2}
        bg="rgba(0,0,0,0.5)"
        borderBottom="1px solid rgba(255,255,255,0.05)"
        spacing={2}
      >
        {/* Mac-style dots */}
        <HStack spacing={1}>
          <Box w="6px" h="6px" borderRadius="full" bg={status === 'done' ? '#22C55E' : status === 'running' ? nodeColor : 'rgba(255,255,255,0.15)'} />
          <Box w="6px" h="6px" borderRadius="full" bg={status === 'running' ? `${nodeColor}88` : 'rgba(255,255,255,0.08)'} />
          <Box w="6px" h="6px" borderRadius="full" bg="rgba(255,255,255,0.08)" />
        </HStack>
        <Text
          color={status === 'running' ? nodeColor : 'rgba(255,255,255,0.4)'}
          fontSize="2xs"
          fontWeight={700}
          letterSpacing="0.12em"
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        >
          NODE-{nodeId}
        </Text>
        <Box flex={1} />
        {logs.length > 0 && (
          <Text fontSize="2xs" color="rgba(255,255,255,0.2)" fontFamily="'JetBrains Mono', monospace">
            {logs.length} ops
          </Text>
        )}
        <Box
          px={2} py={0.5}
          borderRadius="sm"
          bg={status === 'done' ? 'rgba(34,197,94,0.15)' : status === 'running' ? `${nodeColor}15` : 'rgba(255,255,255,0.05)'}
          border="1px solid"
          borderColor={status === 'done' ? 'rgba(34,197,94,0.25)' : status === 'running' ? `${nodeColor}30` : 'rgba(255,255,255,0.08)'}
        >
          <Text
            color={status === 'done' ? '#22C55E' : status === 'running' ? nodeColor : '#6B7280'}
            fontSize="2xs"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={600}
          >
            {status === 'waiting' ? 'IDLE' : status === 'running' ? 'LIVE' : status === 'done' ? 'DONE' : 'ERR'}
          </Text>
        </Box>
      </HStack>

      {/* Terminal body */}
      <Box
        ref={scrollRef}
        px={3}
        py={2}
        overflowY="auto"
        h="calc(100% - 36px)"
        css={{
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '4px',
          },
        }}
      >
        <VStack align="start" spacing={0}>
          {logs.length === 0 && (
            <VStack align="start" spacing={1} w="full" py={4}>
              <Text color="rgba(255,255,255,0.25)" fontSize="2xs" fontFamily="'JetBrains Mono', monospace">
                $ frost-oracle --node {nodeId} --threshold 2/3
              </Text>
              <Text color="rgba(255,255,255,0.18)" fontSize="2xs" fontFamily="'JetBrains Mono', monospace">
                Waiting for audit trigger...
              </Text>
            </VStack>
          )}
          {logs.map((log, i) => (
            <HStack key={i} spacing={0} align="start" w="full" py="1px">
              <Text
                color="rgba(255,255,255,0.3)"
                fontSize="10px"
                fontFamily="'JetBrains Mono', monospace"
                flexShrink={0}
                w="52px"
                lineHeight={1.7}
              >
                {new Date(log.ts).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
              <Text
                color={LOG_COLORS[log.type] || 'rgba(255,255,255,0.5)'}
                fontSize="10px"
                fontFamily="'JetBrains Mono', monospace"
                w="16px"
                flexShrink={0}
                textAlign="center"
                lineHeight={1.7}
              >
                {LOG_PREFIX[log.type] || '│'}
              </Text>
              <Text
                color={LOG_COLORS[log.type] || 'rgba(255,255,255,0.5)'}
                fontSize="10px"
                fontFamily="'JetBrains Mono', monospace"
                lineHeight={1.7}
                wordBreak="break-word"
              >
                {log.message}
              </Text>
            </HStack>
          ))}
          {status === 'running' && (
            <Text
              color={`${nodeColor}66`}
              fontSize="10px"
              fontFamily="'JetBrains Mono', monospace"
              className="cursor-blink"
              mt={1}
            >
              █
            </Text>
          )}
        </VStack>
      </Box>
    </MotionBox>
  )
}
