import { Box, HStack, Heading, Button, Container } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { useAuditStore } from '../store/auditStore'

export default function Navigation() {
  const navigate = useNavigate()
  const claim = useAuditStore((state) => state.claim)
  const resetAudit = useAuditStore((state) => state.resetAudit)

  const handleNewAudit = () => {
    resetAudit()
    navigate('/')
  }

  return (
    <Box bg="white" borderBottom="2px" borderColor="brand.lighter" boxShadow="sm">
      <Container maxW="container.xl">
        <HStack justify="space-between" py={4}>
          <Heading 
            as="h1" 
            size="lg" 
            color="brand.accent"
            fontFamily="heading"
            cursor="pointer"
            onClick={() => navigate('/')}
          >
            ⚡ VERIDION-X
          </Heading>
          <HStack spacing={4}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/leaderboard')}
              color="brand.dark"
              _hover={{ color: 'brand.accent' }}
            >
              Hall of Shame
            </Button>
            {claim && (
              <Button
                variant="ghost"
                onClick={handleNewAudit}
                color="brand.dark"
                _hover={{ color: 'brand.accent' }}
              >
                New Audit
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
