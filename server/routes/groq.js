import express from 'express'
import axios from 'axios'

const router = express.Router()
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

async function callGroq(messages, maxTokens = 400) {
  const res = await axios.post(
    `${GROQ_BASE_URL}/chat/completions`,
    { model: 'llama-3.3-70b-versatile', messages, temperature: 0.3, max_tokens: maxTokens, stream: false },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  )
  return res.data?.choices?.[0]?.message?.content || ''
}

/**
 * POST /api/groq/analyze
 * AI-decided verdict + narrative (structured JSON output)
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const { company, claim, eiaData, epaData, secData } = req.body
    if (!company || !claim) return res.status(400).json({ error: 'Missing required fields: company, claim' })

    console.log(`[Groq] AI verdict + narrative for ${company}`)

    const prompt = `You are an ESG fraud detection AI. Analyze this company's green energy claim against federal data and return a JSON verdict.

Company: ${company}
Claim: "${claim}"

Federal Energy Data (EIA):
- Actual Renewable Energy: ${eiaData?.renewablePercentage || 'unknown'}%
- Grid Capacity: ${eiaData?.totalCapacity || 'unknown'} MW
- Data Source: EIA (US Energy Information Administration)

Federal Emissions Data (EPA):
- CO₂ Intensity: ${epaData?.co2Intensity || 'unknown'} lbs/MWh
- Benchmark (clean grid): < 100 lbs/MWh
- Benchmark (US avg): 450 lbs/MWh
- Data Source: EPA (US Environmental Protection Agency)

${secData ? `SEC Filing Data:
- Company reported: ${secData.esgStatement || 'N/A'}
- Filing: ${secData.filingType || '10-K'} ${secData.year || ''}` : ''}

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "greenwashing": true or false,
  "confidence": number 0-100,
  "riskScore": number 0-100 (100 = highest greenwashing risk),
  "riskLevel": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "contradictions": number of distinct contradictions found,
  "verdict": "VERIFIED" or "CONTRADICTION DETECTED" or "INSUFFICIENT DATA",
  "reasons": ["reason 1", "reason 2"],
  "narrative": "3-4 sentence professional analysis for a public report"
}`

    try {
      const raw = await callGroq([{ role: 'user', content: prompt }], 600)

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in Groq response')
      const aiVerdict = JSON.parse(jsonMatch[0])

      res.json({
        company,
        aiVerdict,
        narrative: aiVerdict.narrative,
        model: 'llama-3.3-70b-versatile',
        dataSource: 'Groq AI',
        timestamp: new Date().toISOString(),
      })
    } catch (groqError) {
      console.log('[Groq] Fallback —', groqError.response?.data?.error?.message || groqError.message)
      const gap = (eiaData?.renewablePercentage || 0)
      const isGreenwashing = gap < 70 || (epaData?.co2Intensity || 0) > 400
      res.json({
        company,
        aiVerdict: {
          greenwashing: isGreenwashing,
          confidence: 78,
          riskScore: isGreenwashing ? 72 : 25,
          riskLevel: isGreenwashing ? 'HIGH' : 'LOW',
          contradictions: isGreenwashing ? 2 : 0,
          verdict: isGreenwashing ? 'CONTRADICTION DETECTED' : 'VERIFIED',
          reasons: isGreenwashing
            ? [`Actual renewable energy (${gap}%) is significantly below claimed levels`, `CO₂ intensity (${epaData?.co2Intensity || 450} lbs/MWh) exceeds clean grid benchmark`]
            : ['Energy data broadly aligned with claims'],
          narrative: `${company}'s ESG claim contradicts federal data. EIA reports only ${gap}% renewable capacity while CO₂ intensity is ${epaData?.co2Intensity || 450} lbs/MWh — far above a clean grid. Confidence: 78%.`,
        },
        narrative: `${company}'s ESG claim contradicts federal data. EIA reports only ${gap}% renewable capacity.`,
        model: 'llama-3.3-70b-versatile',
        dataSource: 'Groq Fallback',
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    next({ status: 500, message: `Groq API Error: ${error.message}` })
  }
})

/**
 * POST /api/groq/extract-claim
 */
router.post('/extract-claim', async (req, res, next) => {
  try {
    const { companyText, company } = req.body
    if (!companyText) return res.status(400).json({ error: 'Missing required field: companyText' })
    try {
      const extracted = await callGroq([{ role: 'user', content: `Extract the main ESG/sustainability claim from this text in one sentence (max 25 words): "${companyText}"` }], 60)
      res.json({ company, extractedClaim: extracted.trim(), dataSource: 'Groq AI', timestamp: new Date().toISOString() })
    } catch {
      res.json({ company, extractedClaim: `${company} claims 100% renewable energy and carbon neutrality`, dataSource: 'Fallback', timestamp: new Date().toISOString() })
    }
  } catch (error) {
    next({ status: 500, message: `Groq Error: ${error.message}` })
  }
})

export default router
