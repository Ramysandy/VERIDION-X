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

    const prompt = `You are an ESG fraud detection AI. Analyze this company's green energy claim against real US federal data and return a JSON verdict. Be SPECIFIC to this company — different companies MUST get different scores based on their actual data.

Company: ${company}
Claim: "${claim}"

Federal Energy Data (EIA — US Energy Information Administration):
- State Grid Renewable Energy: ${eiaData?.renewablePercentage || 'unknown'}%
- Total Grid Generation: ${eiaData?.totalCapacity || 'unknown'} thousand MWh
- Fossil Fuel Percentage: ${eiaData?.fossilPercentage || 'unknown'}%
${eiaData?.details ? `- Solar: ${eiaData.details.solar || 0} | Wind: ${eiaData.details.wind || 0} | Natural Gas: ${eiaData.details.naturalGas || 0} | Coal: ${eiaData.details.coal || 0} thousand MWh` : ''}
- Data Year: ${eiaData?.year || eiaData?.details?.year || '2024'}
- Source: EIA v2 API

Federal Emissions Data (EPA eGRID):
- CO₂ Emission Rate: ${epaData?.co2Intensity || 'unknown'} lbs/MWh
- State Baseline: ${epaData?.stateBaseline || epaData?.co2Intensity || 'unknown'} lbs/MWh
- National Average: ${epaData?.nationalAverage || 818} lbs/MWh
- Clean Grid Threshold: < 200 lbs/MWh
- Sector Multiplier: ${epaData?.sectorMultiplier || 1.0}x
- Source: EPA eGRID 2022

${secData ? `SEC EDGAR Filing Data:
- ESG Disclosure: ${secData.esgStatement || 'No ESG disclosures found'}
- Disclosure Count: ${secData.disclosureCount || 0} filings
- Disclosure Risk: ${secData.disclosureRisk || 'UNKNOWN'}
- CIK: ${secData.cik || 'Not found'}` : 'SEC Filing Data: No EDGAR data available'}

IMPORTANT: Score this company SPECIFICALLY based on:
1. GAP between claimed vs actual renewable % (bigger gap = higher risk)
2. CO₂ intensity vs clean grid benchmark (<200 = clean, >800 = dirty)
3. Whether SEC filings mention ESG (no disclosure = higher risk)
4. Industry context (oil/gas companies claiming green = high risk; tech companies with clean grid = low risk)

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "greenwashing": true or false,
  "confidence": number 0-100,
  "riskScore": number 0-100 (100 = highest greenwashing risk),
  "riskLevel": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "contradictions": number of distinct contradictions found,
  "verdict": "VERIFIED" or "CONTRADICTION DETECTED" or "INSUFFICIENT DATA",
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "narrative": "3-4 sentence professional analysis referencing specific numbers from the data"
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
      const renewPct = eiaData?.renewablePercentage || 0
      const co2 = epaData?.co2Intensity || 450
      const co2Threshold = 200
      const nationalAvg = epaData?.nationalAverage || 818

      // Compute risk score from real data
      const renewGap = Math.max(0, 100 - renewPct) // how far from 100% renewable
      const co2Severity = co2 > co2Threshold ? Math.min(100, Math.round((co2 / nationalAvg) * 50)) : 10
      const riskScore = Math.min(100, Math.round(renewGap * 0.5 + co2Severity * 0.5))
      const isGreenwashing = riskScore > 40
      const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW'
      const confidence = Math.min(95, 60 + Math.round(Math.abs(renewGap - 50) * 0.6))

      res.json({
        company,
        aiVerdict: {
          greenwashing: isGreenwashing,
          confidence,
          riskScore,
          riskLevel,
          contradictions: isGreenwashing ? Math.ceil(riskScore / 30) : 0,
          verdict: isGreenwashing ? 'CONTRADICTION DETECTED' : 'VERIFIED',
          reasons: isGreenwashing
            ? [`State grid renewable energy is only ${renewPct}% vs claimed 100%`, `CO₂ intensity (${co2} lbs/MWh) is ${co2 > co2Threshold ? 'above' : 'near'} the clean grid threshold of ${co2Threshold} lbs/MWh`, `${secData?.disclosureCount || 0} ESG disclosures found in SEC EDGAR`]
            : [`Renewable energy at ${renewPct}% aligned with clean grid standards`, `CO₂ intensity (${co2} lbs/MWh) is within acceptable range`],
          narrative: `${company}'s ESG claims were analyzed against federal data. EIA reports ${renewPct}% renewable energy in the operating region, while EPA eGRID shows a CO₂ emission rate of ${co2} lbs/MWh (national average: ${nationalAvg}). ${isGreenwashing ? 'Significant contradictions detected between claims and actual environmental performance.' : 'Data broadly supports the company\'s environmental claims.'} Risk score: ${riskScore}/100.`,
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
