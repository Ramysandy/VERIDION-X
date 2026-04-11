import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)

const LOG_COLORS = {
  system: 'rgba(255,255,255,0.5)',
  crypto: '#A78BFA',    // purple
  fetch: '#60A5FA',     // blue
  data: '#34D399',      // green
  ai: '#FBBF24',        // amber
  alert: '#EF4444',     // red
  success: '#22C55E',   // bright green
  warn: '#F59E0B',      // orange
  error: '#EF4444',     // red
  detail: 'rgba(255,255,255,0.4)',
}

const STATUS_COLORS = {
  waiting: '#6B7280',
  running: '#FBBF24',
  done: '#22C55E',
  error: '#EF4444',
}

export default function OracleTerminal({ nodeId, logs = [], status = 'waiting' }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length])

  const borderColor =
    status === 'done'
      ? 'rgba(34,197,94,0.3)'
      : status === 'running'
      ? 'rgba(251,191,36,0.3)'
      : 'rgba(255,255,255,0.08)'

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: nodeId * 0.1 }}
      bg="rgba(0,0,0,0.5)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
      backdropFilter="blur(12px)"
      h={{ base: '220px', md: '300px' }}
    >
      {/* Terminal header */}
      <HStack
        px={3}
        py={2}
        bg="rgba(0,0,0,0.4)"
        borderBottom="1px solid rgba(255,255,255,0.05)"
        spacing={2}
      >
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg={STATUS_COLORS[status]}
          boxShadow={status === 'running' ? `0 0 8px ${STATUS_COLORS[status]}` : 'none'}
          className={status === 'running' ? 'pulse-dot' : ''}
        />
        <Text
          color="rgba(255,255,255,0.45)"
          fontSize="2xs"
          fontWeight={700}
          letterSpacing="0.1em"
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        >
          ORACLE NODE {nodeId}
        </Text>
        <Box flex={1} />
        <Text
          color={STATUS_COLORS[status]}
          fontSize="2xs"
          fontFamily="'JetBrains Mono', monospace"
        >
          {status === 'waiting'
            ? 'STANDBY'
            : status === 'running'
            ? 'EXECUTING'
            : status === 'done'
            ? 'COMPLETE'
            : 'ERROR'}
        </Text>
      </HStack>

      {/* Terminal body */}
      <Box
        ref={scrollRef}
        px={3}
        py={2}
        overflowY="auto"
        h="calc(100% - 36px)"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
          },
        }}
      >
        <VStack align="start" spacing={0}>
          {logs.length === 0 && (
            <Text
              color="rgba(255,255,255,0.2)"
              fontSize="2xs"
              fontFamily="'JetBrains Mono', monospace"
            >
              Awaiting execution...
            </Text>
          )}
          {logs.map((log, i) => (
            <HStack key={i} spacing={2} align="start" w="full">
              <Text
                color="rgba(255,255,255,0.2)"
                fontSize="2xs"
                fontFamily="'JetBrains Mono', monospace"
                flexShrink={0}
                minW="70px"
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
                fontSize="2xs"
                fontFamily="'JetBrains Mono', monospace"
                lineHeight={1.6}
                wordBreak="break-all"
              >
                {log.type === 'alert' && '⚠ '}
                {log.type === 'success' && '✓ '}
                {log.type === 'crypto' && '🔑 '}
                {log.type === 'ai' && '🤖 '}
                {log.message}
              </Text>
            </HStack>
          ))}
          {status === 'running' && (
            <Text
              color="rgba(255,255,255,0.3)"
              fontSize="2xs"
              fontFamily="'JetBrains Mono', monospace"
              className="cursor-blink"
            >
              █
            </Text>
          )}
        </VStack>
      </Box>
    </MotionBox>
  )
}
