import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Box,
  Card,
  CardBody,
  SimpleGrid,
  Icon,
  useToast,
  Progress,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowForwardIcon, LockIcon, WarningIcon } from '@chakra-ui/icons'
import { useAuditStore } from '../store/auditStore'
import { firecrawlAPI } from '../api/client'

const MotionBox = motion(Box)

export default function LandingPage() {
  const [searchInput, setSearchInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const setClaim = useAuditStore((state) => state.setClaim)

  const features = [
    {
      icon: WarningIcon,
      title: 'Detect Contradictions',
      desc: 'Automatically uncover greenwashing by comparing ESG claims against federal government data.',
    },
    {
      icon: LockIcon,
      title: 'Cryptographic Proof',
      desc: 'Two-of-two multisig governance ensures no single point of failure with Bitcoin security.',
    },
  ]

  const handleAudit = async (company) => {
    if (!company.trim()) {
      toast({ title: 'Enter a company name', status: 'warning', duration: 2, isClosable: true })
      return
    }

    setIsLoading(true)
    setLoadingStep('Searching for ESG claims...')

    try {
      // Try to scrape real claims via FireCrawl
      let extractedClaim = null
      try {
        setLoadingStep(`Scraping ${company}'s sustainability page...`)
        const scraped = await firecrawlAPI.scrapeClaims(
          company,
          `https://www.${company.toLowerCase().replace(/\s+/g, '')}.com/sustainability`
        )
        if (scraped.esgClaims?.length > 0) {
          extractedClaim = scraped.esgClaims[0]
        }
      } catch {
        // FireCrawl fallback — use a generic default claim
        console.log('[Landing] FireCrawl failed, using default claim')
      }

      const claim = {
        company: company.trim(),
        location: 'United States',
        claim: extractedClaim || `${company} claims to have achieved 100% renewable energy and carbon neutrality.`,
        year: 2026,
        claimedRenewable: 100,
        state: 'CA',
      }

      setClaim(claim)
      navigate('/audit')
    } catch (err) {
      toast({ title: 'Error starting audit', description: err.message, status: 'error', duration: 3, isClosable: true })
    } finally {
      setIsLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <Box bg="brand.light" minH="100vh" py={16}>
      <Container maxW="container.xl">
        <VStack spacing={16} align="center">
          {/* Hero Section */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            textAlign="center"
            w="full"
          >
            <Heading as="h2" size="2xl" color="brand.dark" mb={4} fontFamily="heading" fontSize="4xl">
              Detect Greenwashing
            </Heading>
            <Heading as="h3" size="lg" color="brand.accent" mb={6} fontFamily="heading" fontWeight={600}>
              With Real Federal Data
            </Heading>
            <Text color="brand.dark" fontSize="lg" maxW="600px" mx="auto" mb={8}>
              Automatically verify corporate ESG claims against verified government energy and emissions data using Bitcoin-secured verification.
            </Text>
          </MotionBox>

          {/* Search Input */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            w="full"
            maxW="500px"
          >
            <Card bg="white">
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight={700} color="brand.dark" fontSize="sm">
                    🔍 Enter Any Company To Audit
                  </Text>
                  <Input
                    placeholder="E.g., Amazon, Tesla, Microsoft..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleAudit(searchInput)}
                    disabled={isLoading}
                    fontSize="md"
                    p={3}
                    borderColor="brand.lighter"
                    _focusVisible={{ borderColor: 'brand.accent', boxShadow: '0 0 0 3px rgba(255, 155, 81, 0.2)' }}
                  />
                  {isLoading && (
                    <VStack w="full" spacing={2}>
                      <Progress size="xs" isIndeterminate colorScheme="orange" w="full" borderRadius="full" />
                      <Text fontSize="xs" color="brand.dark" opacity={0.6}>{loadingStep}</Text>
                    </VStack>
                  )}
                  <Button
                    w="full"
                    isLoading={isLoading}
                    loadingText="Preparing Audit..."
                    onClick={() => handleAudit(searchInput)}
                    rightIcon={<ArrowForwardIcon />}
                  >
                    Start Audit
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </MotionBox>

          {/* Features Grid */}
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            w="full"
          >
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
              {features.map((feature, idx) => (
                <Card key={idx} bg="white" borderTop="4px" borderTopColor="brand.accent">
                  <CardBody>
                    <HStack spacing={4} align="start">
                      <Icon as={feature.icon} color="brand.accent" boxSize={6} mt={1} />
                      <VStack align="start" spacing={2}>
                        <Text fontWeight={700} color="brand.dark" fontSize="lg">{feature.title}</Text>
                        <Text color="brand.dark" fontSize="sm" opacity={0.7}>{feature.desc}</Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </MotionBox>
        </VStack>
      </Container>
    </Box>
  )
}
