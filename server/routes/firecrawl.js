import express from 'express'
import axios from 'axios'

const router = express.Router()
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1'

/**
 * POST /api/firecrawl/scrape
 * Scrape ESG claims from company website
 */
router.post('/scrape', async (req, res, next) => {
  try {
    const { company, url } = req.body

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url'
      })
    }

    console.log(`[FireCrawl] Scraping ESG claims from ${url}`)

    try {
      // Call FireCrawl API
      const firecrawlResponse = await axios.post(
        `${FIRECRAWL_BASE_URL}/scrape`,
        {
          url,
          includeHtmlTags: false,
          pageOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const scrapedContent = firecrawlResponse.data?.markdown || ''

      // Extract ESG-related claims
      const esgKeywords = [
        'renewable',
        'sustainable',
        'carbon',
        'emissions',
        'green',
        'clean energy',
        'net zero',
        'ESG'
      ]

      const esgClaims = scrapedContent
        .split('\n')
        .filter((line) =>
          esgKeywords.some((keyword) => line.toLowerCase().includes(keyword))
        )
        .slice(0, 5)

      res.json({
        company,
        url,
        scrapedText: scrapedContent.slice(0, 1000), // First 1000 chars
        esgClaims,
        claimCount: esgClaims.length,
        dataSource: 'FireCrawl API',
        timestamp: new Date().toISOString(),
        status: 'success'
      })
    } catch (crawlError) {
      // Fallback mock data
      console.log('[FireCrawl] Using fallback data')

      res.json({
        company,
        url,
        scrapedText: 'Mock company ESG statement...',
        esgClaims: [
          `${company} is committed to 100% renewable energy by 2030`,
          `We support ESG initiatives and sustainable practices`,
          `Carbon neutrality is a core company value`
        ],
        claimCount: 3,
        dataSource: 'FireCrawl Fallback',
        timestamp: new Date().toISOString(),
        status: 'fallback'
      })
    }
  } catch (error) {
    console.error('[FireCrawl Error]:', error.message)
    next({
      status: 500,
      message: `FireCrawl API Error: ${error.message}`
    })
  }
})

/**
 * POST /api/firecrawl/extract-claims
 * Extract and summarize ESG claims from scraped content
 */
router.post('/extract-claims', async (req, res, next) => {
  try {
    const { company, content } = req.body

    if (!content) {
      return res.status(400).json({
        error: 'Missing required field: content'
      })
    }

    console.log(`[FireCrawl] Extracting claims for ${company}`)

    // Parse claims from content
    const lines = content.split('\n')
    const claims = lines
      .filter(
        (line) =>
          line.length > 50 &&
          /renewable|sustainable|carbon|clean|green|net zero|ESG/.test(line.toLowerCase())
      )
      .slice(0, 5)

    res.json({
      company,
      extractedClaims: claims,
      claimCount: claims.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[FireCrawl Error]:', error.message)
    next({
      status: 500,
      message: `FireCrawl API Error: ${error.message}`
    })
  }
})

export default router
