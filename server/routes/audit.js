import express from 'express'
import axios from 'axios'

const router = express.Router()
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001'

/**
 * POST /api/audit/start
 * Start a complete audit flow (orchestrate all APIs)
 */
router.post('/start', async (req, res, next) => {
  try {
    const { company, claim, state = 'CA' } = req.body

    if (!company || !claim) {
      return res.status(400).json({
        error: 'Missing required fields: company, claim'
      })
    }

    console.log(`[Audit] Starting audit for ${company} in state ${state}`)

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`

    try {
      // Step 1: Get EIA renewable data
      console.log(`[Audit] Step 1/5: Fetching EIA renewable data...`)
      const eiaResponse = await axios.post(`${API_BASE_URL}/api/eia/renewable`, {
        state,
        company
      })
      const eiaData = eiaResponse.data

      // Step 2: Get EPA emissions data
      console.log(`[Audit] Step 2/5: Fetching EPA emissions baseline...`)
      const epaResponse = await axios.post(`${API_BASE_URL}/api/epa/emissions`, {
        state,
        company
      })
      const epaData = epaResponse.data

      // Step 3: Verify claim against data
      console.log(`[Audit] Step 3/5: Verifying claim against federal data...`)
      const contradiction =
        eiaData.renewablePercentage < 50 && epaData.co2Intensity > 500

      const verdict = {
        winner: !contradiction,
        contradictions: contradiction ? 1 : 0,
        confidence: contradiction ? 92 : 88,
        claimedRenewable: extractRenewablePercent(claim) || 100,
        actualRenewable: eiaData.renewablePercentage,
        claimedCo2: 100,
        actualCo2: epaData.co2Intensity
      }

      // Step 4: Generate analysis
      console.log(`[Audit] Step 4/5: Generating LLM analysis...`)
      const groqResponse = await axios.post(`${API_BASE_URL}/api/groq/analyze`, {
        company,
        claim,
        eiaData,
        epaData
      })
      const narrative = groqResponse.data.narrative

      // Step 5: Publish to Nostr
      console.log(`[Audit] Step 5/5: Publishing to Nostr blockchain...`)
      const totalCost = 250 // 100 EIA + 100 EPA + 50 Groq
      const nostrResponse = await axios.post(`${API_BASE_URL}/api/nostr/publish`, {
        company,
        verdict,
        narrative,
        totalCost
      })
      const nostrNoteId = nostrResponse.data.noteId

      res.json({
        auditId,
        status: 'complete',
        company,
        claim,
        state,
        steps: {
          eiaData,
          epaData,
          verdict,
          narrative,
          nostrNoteId
        },
        totalCost,
        timestamp: new Date().toISOString(),
        success: true
      })
    } catch (stepError) {
      console.error('[Audit Step Error]:', stepError.message)

      // Partial audit result even if some APIs fail
      res.status(207).json({
        auditId,
        status: 'partial',
        company,
        claim,
        error: stepError.message,
        timestamp: new Date().toISOString(),
        success: false
      })
    }
  } catch (error) {
    console.error('[Audit Error]:', error.message)
    next({
      status: 500,
      message: `Audit Error: ${error.message}`
    })
  }
})

/**
 * POST /api/audit/simulate
 * Simulate audit with demo data (for testing)
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { company = 'Tesla', claim = 'We use 100% renewable energy' } = req.body

    console.log(`[Audit] Simulating audit for ${company}`)

    const auditId = `audit_sim_${Date.now()}`

    // Simulate data
    const eiaData = {
      state: 'CA',
      renewablePercentage: 45,
      totalCapacity: 250000,
      confidence: 0.95
    }

    const epaData = {
      state: 'CA',
      co2Intensity: 450,
      plantCount: 12,
      confidence: 0.92
    }

    const contradiction = true
    const verdict = {
      winner: false,
      contradictions: 1,
      confidence: 92,
      claimedRenewable: extractRenewablePercent(claim) || 100,
      actualRenewable: eiaData.renewablePercentage,
      claimedCo2: 100,
      actualCo2: epaData.co2Intensity
    }

    const narrative = `${company}'s claim of "${claim}" contradicts federal data. 
EPA records show CO₂ intensity of ${epaData.co2Intensity} lbs/MWh, significantly higher than renewable-heavy grids. 
EIA data shows only ${eiaData.renewablePercentage}% renewable capacity in California. Confidence: ${verdict.confidence}%.`

    const nostrNoteId = `note1${Math.random().toString(36).substring(2, 30)}`
    const totalCost = 250

    res.json({
      auditId,
      status: 'simulated',
      company,
      claim,
      state: 'CA',
      steps: {
        eiaData,
        epaData,
        verdict,
        narrative,
        nostrNoteId
      },
      totalCost,
      timestamp: new Date().toISOString(),
      success: true,
      note: 'This is a simulated audit for testing'
    })
  } catch (error) {
    console.error('[Audit Simulate Error]:', error.message)
    next({
      status: 500,
      message: `Audit Simulate Error: ${error.message}`
    })
  }
})

/**
 * Helper: Extract renewable percentage from claim text
 */
function extractRenewablePercent(text) {
  const match = text.match(/(\d+)%/)
  return match ? parseInt(match[1]) : null
}

export default router
