import express from 'express'

const router = express.Router()

const LNBITS_URL = process.env.LNBITS_URL || 'https://demo.lnbits.com'
const LNBITS_WALLET_KEY = process.env.LNBITS_WALLET_KEY

/**
 * POST /api/lightning/create-invoice
 * Creates a Lightning BOLT11 invoice via LNbits for investigator bounty payment.
 * Body: { company, amount (sats, default 1000), bountyId (optional) }
 */
router.post('/create-invoice', async (req, res) => {
  const { company, amount = 1000, bountyId } = req.body

  if (!company) {
    return res.status(400).json({ error: 'company is required' })
  }

  // Sanitise memo — safe for inclusion in BOLT11
  const safeCompany = String(company).replace(/[^\w\s\-]/g, '').slice(0, 40)
  const memo = bountyId
    ? `ESG Audit - ${safeCompany} [${String(bountyId).slice(0, 20)}]`
    : `ESG Audit Bounty - ${safeCompany}`

  // Validate amount is a reasonable integer
  const sats = Math.min(Math.max(Math.floor(Number(amount) || 1000), 1), 100000)

  if (!LNBITS_WALLET_KEY) {
    // Return a demo invoice stub when no key is configured
    return res.json({
      paymentRequest: `lnbc${sats}0n1demo_${Date.now()}_unconfigured`,
      paymentHash: `demo_${Date.now()}`,
      amount: sats,
      memo,
      company,
      demo: true,
      note: 'Configure LNBITS_WALLET_KEY in .env for real invoices',
    })
  }

  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'X-Api-Key': LNBITS_WALLET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        out: false,
        amount: sats,
        memo,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[Lightning] LNbits error:', response.status, text)
      return res.status(response.status).json({ error: 'LNbits API error', detail: text })
    }

    const data = await response.json()

    return res.json({
      paymentRequest: data.payment_request,
      paymentHash: data.payment_hash,
      amount: sats,
      memo,
      company,
      demo: false,
      lnbitsUrl: LNBITS_URL,
    })
  } catch (err) {
    console.error('[Lightning] Fetch error:', err.message)
    return res.status(500).json({ error: 'Failed to reach LNbits', detail: err.message })
  }
})

/**
 * GET /api/lightning/invoice/:paymentHash
 * Check payment status of a Lightning invoice.
 */
router.get('/invoice/:paymentHash', async (req, res) => {
  const { paymentHash } = req.params

  // Basic validation - payment hashes are hex strings
  if (!/^[0-9a-fA-F]{64}$/.test(paymentHash)) {
    return res.status(400).json({ error: 'Invalid payment hash format' })
  }

  if (!LNBITS_WALLET_KEY) {
    return res.status(503).json({ error: 'Lightning not configured (no wallet key)' })
  }

  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments/${paymentHash}`, {
      headers: { 'X-Api-Key': LNBITS_WALLET_KEY },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Invoice not found' })
    }

    const data = await response.json()
    return res.json({
      paid: data.paid,
      status: data.paid ? 'paid' : 'pending',
      amount: data.amount,
    })
  } catch (err) {
    console.error('[Lightning] Status check error:', err.message)
    return res.status(500).json({ error: 'Failed to check invoice status' })
  }
})

export default router
