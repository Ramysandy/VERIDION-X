import { Box, HStack, Text, Button, Container, Badge } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'

const MotionBox = motion(Box)

export default function Navigation() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const claim      = useAuditStore((s) => s.claim)
  const resetAudit = useAuditStore((s) => s.resetAudit)
  const auditPhase = useAuditStore((s) => s.auditPhase)

  const isAuditing = auditPhase !== 'IDLE' && auditPhase !== 'COMPLETE' && auditPhase !== 'ERROR'

  const handleNewAudit = () => { resetAudit(); navigate('/') }

  const NavLink = ({ to, children }) => {
    const active = location.pathname === to
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(to)}
        color={active ? '#FF6B2B' : 'rgba(255,255,255,0.65)'}
        fontWeight={active ? 700 : 500}
        _hover={{ color: '#FF6B2B', bg: 'rgba(255,107,43,0.08)' }}
        transition="all 0.18s"
        letterSpacing="0.02em"
        borderBottom={active ? '2px solid #FF6B2B' : 'none'}
        borderRadius={active ? '0' : 'md'}
      >
        {children}
      </Button>
    )
  }

  return (
    <MotionBox
      className="glass-nav"
      position="sticky" top={0} zIndex={100}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Container maxW="container.xl">
        <HStack justify="space-between" py={4}>
          {/* Logo */}
          <HStack spacing={3} cursor="pointer" onClick={() => navigate('/')}
            _hover={{ opacity: 0.85 }} transition="opacity 0.2s">
            <Text
              className="gradient-text logo-font" fontWeight={900} fontSize="xl"
              letterSpacing="0.05em"
            >
              ⚡ VERIDION-X
            </Text>
            <Badge
              bg="rgba(255,107,43,0.15)" color="#FF9B51"
              fontSize="9px" px={2} py={0.5} borderRadius="full"
              textTransform="uppercase" letterSpacing="0.1em"
            >
              Beta
            </Badge>
          </HStack>

          {/* Nav links */}
          <HStack spacing={1}>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/marketplace">Bounties</NavLink>
            <NavLink to="/leaderboard">Hall of Shame</NavLink>
            {claim && <NavLink to="/results">Results</NavLink>}
          </HStack>

          {/* Right actions */}
          <HStack spacing={3}>
            {isAuditing && (
              <HStack spacing={2}>
                <Box className="pulse-dot" />
                <Text fontSize="xs" color="rgba(255,255,255,0.6)" fontWeight={600}>Auditing...</Text>
              </HStack>
            )}
            {claim && (
              <Button
                size="sm"
                bg="rgba(255,107,43,0.15)"
                color="#FF9B51"
                border="1px solid rgba(255,107,43,0.3)"
                _hover={{ bg: 'rgba(255,107,43,0.25)', borderColor: '#FF6B2B' }}
                borderRadius="10px"
                fontWeight={700}
                fontSize="xs"
                onClick={handleNewAudit}
                transition="all 0.18s"
              >
                + New Audit
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </MotionBox>
  )
}

