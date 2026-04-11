/**
 * API Client for VERIDION-X Backend
 * Handles all communication with the backend server
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create Axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]:', error.message)
    throw error
  }
)

/**
 * EIA API Endpoints
 */
export const eiaAPI = {
  getRenewableCapacity: async (state, company) => {
    const response = await apiClient.post('/eia/renewable', { state, company })
    return response.data
  },
  getFacilities: async (state) => {
    const response = await apiClient.post('/eia/facilities', { state })
    return response.data
  }
}

/**
 * EPA API Endpoints
 */
export const epaAPI = {
  getEmissions: async (state, company) => {
    const response = await apiClient.post('/epa/emissions', { state, company })
    return response.data
  },
  getPlants: async (state) => {
    const response = await apiClient.post('/epa/plants', { state })
    return response.data
  },
  verifyClaim: async (company, claimedRenewable, state) => {
    const response = await apiClient.post('/epa/verify-claim', {
      company,
      claimedRenewable,
      state
    })
    return response.data
  }
}

/**
 * Groq API Endpoints (LLM)
 */
export const groqAPI = {
  analyzeClaim: async (company, claim, eiaData, epaData) => {
    const response = await apiClient.post('/groq/analyze', {
      company,
      claim,
      eiaData,
      epaData
    })
    return response.data
  },
  extractClaim: async (companyText, company) => {
    const response = await apiClient.post('/groq/extract-claim', {
      companyText,
      company
    })
    return response.data
  }
}

/**
 * FireCrawl API Endpoints (Web Scraping)
 */
export const firecrawlAPI = {
  scrapeClaims: async (company, url) => {
    const response = await apiClient.post('/firecrawl/scrape', {
      company,
      url
    })
    return response.data
  },
  extractClaims: async (company, content) => {
    const response = await apiClient.post('/firecrawl/extract-claims', {
      company,
      content
    })
    return response.data
  }
}

/**
 * Nostr API Endpoints (Blockchain Publishing)
 */
export const nostrAPI = {
  publishVerdict: async (company, verdict, narrative, totalCost) => {
    const response = await apiClient.post('/nostr/publish', {
      company,
      verdict,
      narrative,
      totalCost
    })
    return response.data
  },
  verifyNote: async (noteId) => {
    const response = await apiClient.get(`/nostr/verify/${noteId}`)
    return response.data
  },
  getRelayStats: async () => {
    const response = await apiClient.post('/nostr/relay-stats')
    return response.data
  }
}

/**
 * Audit Orchestration Endpoints
 */
export const auditAPI = {
  startAudit: async (company, claim, state = 'CA') => {
    const response = await apiClient.post('/audit/start', {
      company,
      claim,
      state
    })
    return response.data
  },
  simulateAudit: async (company = 'Tesla', claim = 'We use 100% renewable energy') => {
    const response = await apiClient.post('/audit/simulate', {
      company,
      claim
    })
    return response.data
  }
}

/**
 * Health Check
 */
export const checkHealth = async () => {
  try {
    const response = await axios.get('http://localhost:3001/health')
    return response.data
  } catch (error) {
    console.error('[Health Check Failed]:', error.message)
    return { status: 'offline', error: error.message }
  }
}

export default apiClient
