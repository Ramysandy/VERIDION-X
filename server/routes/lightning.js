import express from 'express'

const router = express.Router()

const LNBITS_URL = process.env.LNBITS_URL || 'https://demo.lnbits.com'
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY          // sends payments out (bounty wallet)
const LNBITS_INVESTIGATOR_KEY = process.env.LNBITS_INVESTIGATOR_KEY || process.env.LNBITS_WALLET_KEY  // receives payments (investigator wallet)
const LNBITS_WALLET_KEY = process.env.LNBITS_WALLET_KEY        // fallback invoice key

/**
 * POST /api/lightning/create-invoice
 * Creates a BOLT11 invoice on the investigator wallet.
 * Body: { company, amount (sats, default 1000), bountyId? }
 */
router.post('/create-invoice', async (req, res) => {
  const { company, amount = 1000, bountyId } = req.body

  if (!company) return res.status(400).json({ error: 'company is required' })

  const safeCompany = String(company).replace(/[^\w\s\-]/g, '').slice(0, 40)
  const memo = bountyId
    ? `ESG Audit - ${safeCompany} [${String(bountyId).slice(0, 20)}]`
    : `ESG Audit Bounty - ${safeCompany}`
  const sats = Math.min(Math.max(Math.floor(Number(amount) || 1000), 1), 100000)

  const invoiceKey = LNBITS_INVESTIGATOR_KEY || LNBITS_WALLET_KEY
  if (!invoiceKey) {
    return res.json({
      paymentRequest: `lnbc${sats}0n1demo_${Date.now()}_unconfigured`,
      paymentHash: `demo_${Date.now()}`,
      amount: sats, memo, company, demo: true,
    })
  }

  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: { 'X-Api-Key': invoiceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ out: false, amount: sats, memo }),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('[Lightning] create-invoice error:', response.status, text)
      return res.status(response.status).json({ error: 'LNbits API error', detail: text })
    }
    const data = await response.json()
    return res.json({
      paymentRequest: data.payment_request,
      paymentHash: data.payment_hash,
      amount: sats, memo, company, demo: false, lnbitsUrl: LNBITS_URL,
    })
  } catch (err) {
    console.error('[Lightning] Fetch error:', err.message)
    return res.status(500).json({ error: 'Failed to reach LNbits', detail: err.message })
  }
})

/**
 * POST /api/lightning/pay-bounty
 * Auto-pays a BOLT11 invoice from the admin/bounty wallet.
 * Body: { paymentRequest }
 * Returns: { paid, paymentHash, amount }
 */
router.post('/pay-bounty', async (req, res) => {
  const { paymentRequest } = req.body
  if (!paymentRequest) return res.status(400).json({ error: 'paymentRequest is required' })

  // Basic BOLT11 sanity check — must start with lnbc or lntb
  if (!/^ln(bc|tb|bcrt)/i.test(paymentRequest)) {
    return res.status(400).json({ error: 'Invalid BOLT11 format' })
  }

  const adminKey = LNBITS_ADMIN_KEY || LNBITS_WALLET_KEY
  if (!adminKey) return res.status(503).json({ error: 'Admin key not configured' })

  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: { 'X-Api-Key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ out: true, bolt11: paymentRequest }),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('[Lightning] pay-bounty error:', response.status, text)
      return res.status(response.status).json({ error: 'Payment failed', detail: text })
    }
    const data = await response.json()
    return res.json({
      paid: true,
      paymentHash: data.payment_hash,
      amount: data.amount,
    })
  } catch (err) {
    console.error('[Lightning] Pay error:', err.message)
    return res.status(500).json({ error: 'Failed to send payment', detail: err.message })
  }
})

/**
 * GET /api/lightning/invoice/:paymentHash
 * Check payment status.
 */
router.get('/invoice/:paymentHash', async (req, res) => {
  const { paymentHash } = req.params
  if (!/^[0-9a-fA-F]{64}$/.test(paymentHash)) {
    return res.status(400).json({ error: 'Invalid payment hash format' })
  }
  const key = LNBITS_INVESTIGATOR_KEY || LNBITS_WALLET_KEY
  if (!key) return res.status(503).json({ error: 'Lightning not configured' })

  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments/${paymentHash}`, {
      headers: { 'X-Api-Key': key },
    })
    if (!response.ok) return res.status(response.status).json({ error: 'Invoice not found' })
    const data = await response.json()
    return res.json({ paid: data.paid, status: data.paid ? 'paid' : 'pending', amount: data.amount })
  } catch (err) {
    console.error('[Lightning] Status check error:', err.message)
    return res.status(500).json({ error: 'Failed to check invoice status' })
  }
})

export default router


