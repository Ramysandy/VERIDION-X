import { ChakraProvider, Box, VStack } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import theme from './theme'
import LandingPage from './pages/LandingPage'
import AuditFlowPage from './pages/AuditFlowPage'
import ResultsPage from './pages/ResultsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import BountyMarketplace from './pages/BountyMarketplace'
import Navigation from './components/Navigation'
import { useAuditStore } from './store/auditStore'

function AppContent() {
  const targetCompany = useAuditStore((state) => state.targetCompany)
  const claim = useAuditStore((state) => state.claim)
  const auditPhase = useAuditStore((state) => state.auditPhase)
  const navigate = useNavigate()

  // Only redirect if no audit is active AND not on a public page
  useEffect(() => {
    const path = window.location.pathname
    if (!targetCompany && !claim && path !== '/' && path !== '/leaderboard' && path !== '/marketplace') {
      navigate('/')
    }
  }, [targetCompany, claim, navigate])

  const showResults = auditPhase === 'COMPLETE' || auditPhase === 'ERROR' || !!useAuditStore.getState().verdict
  const hasAudit = !!(targetCompany || claim)

  return (
    <Box minH="100vh" bg="brand.light">
      <Navigation />
      <VStack spacing={0} align="stretch" w="full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={hasAudit ? <AuditFlowPage /> : <LandingPage />} />
          <Route path="/results" element={showResults && hasAudit ? <ResultsPage /> : <LandingPage />} />
          <Route path="/marketplace" element={<BountyMarketplace />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </VStack>
    </Box>
  )
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ChakraProvider>
  )
}

export default App
