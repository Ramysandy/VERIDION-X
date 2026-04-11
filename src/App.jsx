import { ChakraProvider, Box, VStack } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import theme from './theme'
import LandingPage from './pages/LandingPage'
import AuditFlowPage from './pages/AuditFlowPage'
import ResultsPage from './pages/ResultsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import Navigation from './components/Navigation'
import { useAuditStore } from './store/auditStore'

function AppContent() {
  const claim = useAuditStore((state) => state.claim)
  const auditPhase = useAuditStore((state) => state.auditPhase)
  const navigate = useNavigate()

  useEffect(() => {
    const path = window.location.pathname
    if (!claim && path !== '/') {
      navigate('/')
    }
  }, [claim, navigate])

  const showResults = auditPhase === 'COMPLETE' || auditPhase === 'ERROR'

  return (
    <Box minH="100vh" bg="brand.light">
      <Navigation />
      <VStack spacing={0} align="stretch" w="full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={claim ? <AuditFlowPage /> : <LandingPage />} />
          <Route path="/results" element={showResults && claim ? <ResultsPage /> : <LandingPage />} />
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
