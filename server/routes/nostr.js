import express from 'express'
import WebSocket from 'ws'
import { finalizeEvent, nip19 } from 'nostr-tools'

const router = express.Router()
const NOSTR_RELAYS = (process.env.NOSTR_RELAYS || 'wss://relay.damus.io').split(',').filter(Boolean)

/**
 * Decode nsec private key and sign + broadcast a Nostr event.
 * Returns the signed event with its real ID.
 */
async function publishToNostr(eventTemplate) {
  const nsec = process.env.NOSTR_PRIVATE_KEY
  if (!nsec) throw new Error('NOSTR_PRIVATE_KEY not set in environment')

  // Decode nsec → raw 32-byte private key (nip19.decode returns Uint8Array for nsec)
  const { type, data: secretKey } = nip19.decode(nsec)
  if (type !== 'nsec') throw new Error('NOSTR_PRIVATE_KEY must be an nsec-encoded private key')

  // Sign the event (also computes id, pubkey, sig)
  const signedEvent = finalizeEvent(eventTemplate, secretKey)

  // Broadcast to all configured relays and collect results
  const results = await Promise.allSettled(
    NOSTR_RELAYS.map((relayUrl) =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl)
        const timeout = setTimeout(() => {
          ws.terminate()
          reject(new Error(`Relay ${relayUrl} timed out`))
        }, 8000)

        ws.on('open', () => {
          ws.send(JSON.stringify(['EVENT', signedEvent]))
        })

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg[0] === 'OK') {
              clearTimeout(timeout)
              ws.close()
              resolve({ relay: relayUrl, accepted: msg[2] === true, message: msg[3] || '' })
            }
          } catch {
            // ignore non-JSON messages
          }
        })

        ws.on('error', (err) => {
          clearTimeout(timeout)
          reject(new Error(`${relayUrl}: ${err.message}`))
        })
      })
    )
  )

  const accepted = results.filter((r) => r.status === 'fulfilled' && r.value.accepted).map((r) => r.value.relay)
  const failed = results.filter((r) => r.status === 'rejected').map((r) => r.reason?.message)

  console.log(`[Nostr] Accepted by ${accepted.length}/${NOSTR_RELAYS.length} relays`)
  if (failed.length) console.warn('[Nostr] Relay errors:', failed)

  return { signedEvent, accepted, failed }
}

/**
 * POST /api/nostr/publish
 * Publish audit verdict to Nostr blockchain
 */
router.post('/publish', async (req, res, next) => {
  try {
    const { company, verdict, narrative, totalCost } = req.body

    if (!company || !verdict) {
      return res.status(400).json({
        error: 'Missing required fields: company, verdict'
      })
    }

    console.log(`[Nostr] Publishing verdict for ${company} to Nostr`)

    const eventTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'veridion-audit'],
        ['t', 'esg'],
        ['company', company],
        ['verdict', verdict.winner ? 'verified' : 'contradiction'],
        ['confidence', String(verdict.confidence)]
      ],
      content: `📊 ESG Audit Report: ${company}
${verdict.winner ? '✅ VERIFIED' : '❌ CONTRADICTION DETECTED'}

${narrative || ''}

Renewable claimed: ${verdict.claimedRenewable ?? '?'}% | Actual: ${verdict.actualRenewable ?? '?'}%
CO₂ intensity: ${verdict.co2Intensity ?? '?'} lbs/MWh
Confidence: ${verdict.confidence}% | Cost: ${totalCost} sats

#ESG #Greenwashing #VeridionX`
    }

    const { signedEvent, accepted, failed } = await publishToNostr(eventTemplate)

    // Encode real event ID as note1... bech32
    const noteId = nip19.noteEncode(signedEvent.id)

    res.json({
      success: true,
      company,
      noteId,
      eventId: signedEvent.id,
      pubkey: signedEvent.pubkey,
      event: signedEvent,
      relays: NOSTR_RELAYS,
      accepted,
      failed,
      published: accepted.length > 0,
      timestamp: new Date().toISOString(),
      nostrLink: `https://snort.social/n/${noteId}`,
      details: {
        eventKind: signedEvent.kind,
        eventTags: signedEvent.tags.length,
        contentLength: signedEvent.content.length,
        relaysAccepted: accepted.length,
        relaysFailed: failed.length
      }
    })
  } catch (error) {
    console.error('[Nostr Error]:', error.message)
    next({
      status: 500,
      message: `Nostr API Error: ${error.message}`
    })
  }
})

/**
 * GET /api/nostr/verify/:noteId
 * Verify a published Nostr note
 */
router.get('/verify/:noteId', async (req, res, next) => {
  try {
    const { noteId } = req.params

    console.log(`[Nostr] Verifying note: ${noteId}`)

    // Mock verification (in production, would query Nostr relays)
    const verified = noteId.startsWith('note1')

    res.json({
      noteId,
      verified,
      relays: NOSTR_RELAYS,
      timestamp: new Date().toISOString(),
      status: verified ? 'found' : 'not_found'
    })
  } catch (error) {
    console.error('[Nostr Error]:', error.message)
    next({
      status: 500,
      message: `Nostr API Error: ${error.message}`
    })
  }
})

/**
 * POST /api/nostr/relay-stats
 * Get stats from Nostr relays
 */
router.post('/relay-stats', async (req, res, next) => {
  try {
    console.log('[Nostr] Fetching relay stats')

    // Mock relay stats
    const relayStats = NOSTR_RELAYS.map((relay) => ({
      url: relay,
      status: 'online',
      events: Math.floor(Math.random() * 100000),
      users: Math.floor(Math.random() * 10000),
      latency: Math.floor(Math.random() * 200) + 50
    }))

    res.json({
      relays: relayStats,
      timestamp: new Date().toISOString(),
      activeRelays: relayStats.length
    })
  } catch (error) {
    console.error('[Nostr Error]:', error.message)
    next({
      status: 500,
      message: `Nostr API Error: ${error.message}`
    })
  }
})

export default router
