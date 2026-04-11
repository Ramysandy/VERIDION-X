import express from 'express'
import axios from 'axios'

const router = express.Router()

// SEC EDGAR full-text search + company facts API — completely free, no key needed
const EDGAR_SEARCH = 'https://efts.sec.gov/LATEST/search-index?q='
const EDGAR_COMPANY = 'https://data.sec.gov/submissions/'
const EDGAR_FULL_SEARCH = 'https://efts.sec.gov/LATEST/search-index?dateRange=custom&startdt=2022-01-01&q='

/**
 * POST /api/sec/filings
 * Pull ESG-related claims from SEC EDGAR 10-K / sustainability filings
 */
router.post('/filings', async (req, res, next) => {
  try {
    const { company } = req.body
    if (!company) return res.status(400).json({ error: 'Missing required field: company' })

    console.log(`[SEC] Searching EDGAR for ${company}`)

    // Step 1: Search for company CIK
    let cik = null
    let entityName = company
    try {
      const searchRes = await axios.get(
        `https://efts.sec.gov/LATEST/search-index?q="${encodeURIComponent(company)}"&dateRange=custom&startdt=2023-01-01&forms=10-K`,
        { headers: { 'User-Agent': 'VERIDION-X audit@veridion-x.com' }, timeout: 10000 }
      )
      const hits = searchRes.data?.hits?.hits || []
      if (hits.length > 0) {
        cik = hits[0]?._source?.entity_id
        entityName = hits[0]?._source?.display_names?.[0] || company
      }
    } catch (e) {
      console.log('[SEC] Search failed:', e.message)
    }

    // Step 2: If we have CIK, get actual filings metadata
    let filingInfo = null
    if (cik) {
      try {
        const paddedCik = String(cik).padStart(10, '0')
        const subRes = await axios.get(`${EDGAR_COMPANY}CIK${paddedCik}.json`, {
          headers: { 'User-Agent': 'VERIDION-X audit@veridion-x.com' },
          timeout: 10000
        })
        const filings = subRes.data?.filings?.recent
        const tenKIdx = filings?.form?.findIndex(f => f === '10-K')
        if (tenKIdx !== undefined && tenKIdx >= 0) {
          filingInfo = {
            filingType: '10-K',
            filedAt: filings.filingDate?.[tenKIdx],
            accession: filings.accessionNumber?.[tenKIdx],
            cik,
          }
        }
      } catch (e) {
        console.log('[SEC] Filings fetch failed:', e.message)
      }
    }

    // Step 3: Search for ESG/renewables mentions in recent filings
    let esgClaims = []
    let esgStatement = null
    try {
      const esgSearchRes = await axios.get(
        `https://efts.sec.gov/LATEST/search-index?q="${encodeURIComponent(company)}+renewable+energy"&forms=10-K&dateRange=custom&startdt=2023-01-01`,
        { headers: { 'User-Agent': 'VERIDION-X audit@veridion-x.com' }, timeout: 10000 }
      )
      const esgHits = esgSearchRes.data?.hits?.hits || []
      esgClaims = esgHits.slice(0, 3).map(h => ({
        excerpt: h._source?.file_date
          ? `SEC 10-K filed ${h._source.file_date}: ${h.highlight?.['file_date']?.[0] || 'ESG/renewable energy discussed'}`
          : 'Renewable energy commitments mentioned in filing',
        filingDate: h._source?.file_date || '',
        formType: h._source?.form_type || '10-K',
        url: h._source?.file_date
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(company)}&type=10-K`
          : null
      }))

      if (esgHits.length > 0) {
        esgStatement = `${company} has ${esgHits.length} ESG/renewable energy disclosures in recent SEC 10-K filings`
      }
    } catch (e) {
      console.log('[SEC] ESG search failed:', e.message)
    }

    // Determine disclosure risk
    const hasDisclosure = esgClaims.length > 0
    const disclosureRisk = !hasDisclosure ? 'HIGH' : 'MEDIUM'

    res.json({
      company: entityName,
      cik: cik || null,
      filingInfo,
      esgClaims,
      esgStatement: esgStatement || `No recent ESG disclosures found for ${company} in SEC EDGAR`,
      disclosureCount: esgClaims.length,
      disclosureRisk,
      dataSource: 'SEC EDGAR (Free API)',
      edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(company)}&type=10-K&dateb=&owner=include&count=5`,
      timestamp: new Date().toISOString(),
      note: hasDisclosure
        ? `Found ${esgClaims.length} ESG-related 10-K filings on SEC EDGAR`
        : 'No ESG disclosures found — possible undisclosed greenwashing risk'
    })
  } catch (error) {
    console.error('[SEC Error]:', error.message)
    next({ status: 500, message: `SEC EDGAR Error: ${error.message}` })
  }
})

export default router
