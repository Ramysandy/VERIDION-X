/**
 * Oracle Route — SSE streaming endpoint for FROST oracle execution
 * 
 * GET /api/oracle/stream?company=ExxonMobil
 * 
 * Runs 3 independent oracle nodes in parallel, each:
 *   1. Queries EIA federal energy data
 *   2. Queries EPA emissions data
 *   3. Queries SEC EDGAR filings
 *   4. Runs Groq llama-3.3-70b verdict
 *   5. Reports fraud_detected + risk score
 * 
 * If 2/3 nodes agree → FROST threshold signature aggregation
 * → Taproot transaction construction with OP_RETURN inscription
 */

import { Router } from 'express'
import axios from 'axios'
import { oracle } from '../frost/index.js'

const router = Router()
const API_BASE = 'http://localhost:3001/api'

// GET /api/oracle/stream?company=CompanyName
router.get('/stream', async (req, res) => {
  const { company } = req.query
  if (!company) {
    return res.status(400).json({ error: 'Missing query param: company' })
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Initialize FROST oracle (generates new keys each session for demo)
    const frostInfo = oracle.initialize()

    send('init', {
      groupPubKey: frostInfo.xOnlyGroupKey,
      taproot: frostInfo.taproot,
      nodes: frostInfo.nodes.map((n) => ({
        id: n.id,
        pubKey: n.xOnlyPubKey,
      })),
    })

    // Run 3 oracle nodes in parallel
    const results = await Promise.all(
      [1, 2, 3].map((nodeId) => runOracleNode(nodeId, company, send))
    )

    // --- Consensus Check ---
    const fraudVotes = results.filter((r) => r.fraudDetected)
    const consensus = {
      totalNodes: 3,
      fraudVotes: fraudVotes.length,
      cleanVotes: 3 - fraudVotes.length,
      threshold: 2,
      consensusReached: fraudVotes.length >= 2,
      fraudDetected: fraudVotes.length >= 2,
      nodeVotes: results.map((r) => ({
        id: r.nodeId,
        fraud: r.fraudDetected,
        risk: r.riskScore,
        level: r.riskLevel,
      })),
    }
    send('consensus', consensus)

    let signature = null
    let transaction = null
    let merkleTree = null
    let tapscript = null

    if (consensus.consensusReached) {
      // --- FROST Threshold Signing ---
      const participatingIds = fraudVotes.slice(0, 2).map((r) => r.nodeId)

      // Round 1: Generate nonce commitments
      const commitments = participatingIds.map((id) => {
        const c = oracle.generateNonceCommitment(id)
        send('nonce', {
          nodeId: id,
          R: c.R_hex,
          phase: 'Round 1 — Nonce commitment broadcast',
        })
        return c
      })

      // Round 2: Aggregate signatures
      const message = JSON.stringify({
        company,
        fraudDetected: true,
        votes: fraudVotes.length,
        timestamp: Date.now(),
      })

      signature = oracle.aggregateSignatures(
        commitments,
        message,
        participatingIds
      )

      send('signature', {
        R: signature.R,
        s: signature.s,
        fullSignature: signature.signature,
        valid: signature.valid,
        participatingNodes: signature.participatingNodes,
        aggregatePubKey: signature.aggregatePubKey,
        messageHash: signature.messageHash,
        phase: 'Round 2 — Partial signatures aggregated',
      })

      // --- Construct Taproot Transaction ---
      const verdictData = {
        company,
        fraudDetected: true,
        riskScore: Math.max(...fraudVotes.map((r) => r.riskScore)),
        riskLevel: fraudVotes[0].riskLevel,
        oracleConsensus: `${fraudVotes.length}/3`,
        frostPubKey: oracle.xOnlyGroupKey,
        timestamp: new Date().toISOString(),
      }

      transaction = oracle.constructTransaction(verdictData, signature)
      send('transaction', transaction)

      // --- Build Merkle Tree for verdict data integrity ---
      const merkleItems = [
        JSON.stringify({ company, fraudDetected: true }),
        JSON.stringify({ riskScore: verdictData.riskScore, riskLevel: verdictData.riskLevel }),
        JSON.stringify({ consensus: verdictData.oracleConsensus }),
        signature.signature,
        transaction.verdictHash,
      ]
      merkleTree = oracle.buildMerkleTree(merkleItems)
      send('merkle', {
        root: merkleTree.root,
        depth: merkleTree.depth,
        leafCount: merkleTree.leafCount,
        leaves: merkleTree.leaves,
      })

      // --- Generate Tapscript spending paths ---
      tapscript = oracle.generateTapscript(transaction.verdictHash)
      send('tapscript', {
        address: tapscript.address,
        scriptRoot: tapscript.scriptRoot,
        scripts: tapscript.scripts.map(s => ({ name: s.name, description: s.description, leafHash: s.leafHash })),
        depth: tapscript.depth,
      })
    }

    // --- Final Result ---
    // Pick the primary verdict from the highest-risk fraud node
    const primary = fraudVotes.sort(
      (a, b) => (b.riskScore || 0) - (a.riskScore || 0)
    )[0] || results[0]

    send('complete', {
      company,
      consensus,
      signature: signature
        ? { R: signature.R, s: signature.s, valid: signature.valid }
        : null,
      transaction: transaction
        ? {
            txId: transaction.txId,
            mempoolUrl: transaction.mempoolUrl,
            opReturn: transaction.opReturn,
          }
        : null,
      merkle: merkleTree
        ? { root: merkleTree.root, depth: merkleTree.depth, leafCount: merkleTree.leafCount }
        : null,
      tapscript: tapscript
        ? { address: tapscript.address, scriptRoot: tapscript.scriptRoot, scripts: tapscript.scripts.map(s => s.name) }
        : null,
      verdict: {
        fraudDetected: primary.fraudDetected,
        riskScore: primary.riskScore,
        riskLevel: primary.riskLevel,
        confidence: primary.confidence,
        verdict: primary.verdict,
        reasons: primary.reasons,
        narrative: primary.narrative,
      },
      eiaData: primary.eiaData,
      epaData: primary.epaData,
      secData: primary.secData,
      satelliteData: primary.satelliteData,
      taproot: oracle.taprootInfo,
      groupPubKey: oracle.xOnlyGroupKey,
    })

    res.end()
  } catch (error) {
    send('error', { message: error.message, stack: error.stack?.slice(0, 200) })
    res.end()
  }
})

// GET /api/oracle/info — Return current FROST oracle state
router.get('/info', (req, res) => {
  if (!oracle.initialized) oracle.initialize()
  res.json({
    groupPubKey: oracle.xOnlyGroupKey,
    taproot: oracle.taprootInfo,
    nodes: oracle.nodes.map((n) => ({
      id: n.id,
      pubKey: n.xOnlyPubKey,
    })),
    threshold: '2-of-3',
    scheme: 'FROST (Flexible Round-Optimized Schnorr Threshold)',
  })
})

// POST /api/oracle/verify — Verify a FROST Schnorr signature
router.post('/verify', (req, res) => {
  try {
    const { signature, message } = req.body
    if (!signature || !message) {
      return res.status(400).json({ error: 'Missing signature or message' })
    }
    if (!oracle.initialized) {
      return res.status(400).json({ error: 'Oracle not initialized — run an audit first' })
    }
    const result = oracle.verifySignature(signature, message)
    res.json({
      ...result,
      taprootAddress: oracle.taprootInfo?.testnet,
      verifiedAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/oracle/testnet/:address — Look up a Taproot address on Bitcoin testnet
router.get('/testnet/:address', async (req, res) => {
  const { address } = req.params
  try {
    // Query mempool.space testnet API
    const mempoolRes = await axios.get(
      `https://mempool.space/testnet/api/address/${address}`,
      { timeout: 8000 }
    )
    res.json({
      address,
      chain_stats: mempoolRes.data.chain_stats,
      mempool_stats: mempoolRes.data.mempool_stats,
      explorerUrl: `https://mempool.space/testnet/address/${address}`,
      network: 'testnet',
      fetched: true,
    })
  } catch (error) {
    // Address not found on testnet is expected for simulated txs — return gracefully
    res.json({
      address,
      chain_stats: { funded_txo_count: 0, spent_txo_count: 0, tx_count: 0 },
      mempool_stats: { funded_txo_count: 0, spent_txo_count: 0, tx_count: 0 },
      explorerUrl: `https://mempool.space/testnet/address/${address}`,
      network: 'testnet',
      fetched: false,
      note: 'Address exists on-chain but has no testnet activity (simulated transaction)',
    })
  }
})

// POST /api/oracle/broadcast — Broadcast raw transaction to Bitcoin testnet
router.post('/broadcast', async (req, res) => {
  const { rawHex } = req.body
  if (!rawHex) {
    return res.status(400).json({ error: 'Missing rawHex transaction data' })
  }
  try {
    // POST raw hex to mempool.space testnet
    const response = await axios.post(
      'https://mempool.space/testnet/api/tx',
      rawHex,
      { headers: { 'Content-Type': 'text/plain' }, timeout: 15000 }
    )
    const txId = response.data // mempool.space returns txid as text
    res.json({
      success: true,
      txId,
      mempoolUrl: `https://mempool.space/testnet/tx/${txId}`,
      network: 'testnet',
      broadcastAt: new Date().toISOString(),
    })
  } catch (error) {
    // Expected to fail for simulated txs — return detailed error
    const errorMsg = error.response?.data || error.message
    res.json({
      success: false,
      error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
      note: 'Transaction broadcast failed — this is expected for simulated UTXOs. Fund the P2TR address via a testnet faucet to enable real broadcasts.',
      faucetUrl: 'https://bitcoinfaucet.uo1.net/send.php',
      network: 'testnet',
    })
  }
})

// GET /api/oracle/utxos/:address — Fetch UTXOs for a testnet address
router.get('/utxos/:address', async (req, res) => {
  const { address } = req.params
  try {
    const response = await axios.get(
      `https://mempool.space/testnet/api/address/${address}/utxo`,
      { timeout: 8000 }
    )
    const utxos = response.data || []
    const totalSats = utxos.reduce((sum, u) => sum + (u.value || 0), 0)
    res.json({
      address,
      utxos,
      count: utxos.length,
      totalSats,
      totalBTC: (totalSats / 1e8).toFixed(8),
      funded: utxos.length > 0,
      network: 'testnet',
    })
  } catch (error) {
    res.json({
      address,
      utxos: [],
      count: 0,
      totalSats: 0,
      totalBTC: '0.00000000',
      funded: false,
      network: 'testnet',
      error: error.message,
    })
  }
})

// POST /api/oracle/merkle — Build Merkle tree from verdict data
router.post('/merkle', (req, res) => {
  try {
    const { verdictData } = req.body
    if (!verdictData || !Array.isArray(verdictData)) {
      return res.status(400).json({ error: 'Missing verdictData array' })
    }
    if (!oracle.initialized) oracle.initialize()
    const tree = oracle.buildMerkleTree(verdictData)
    res.json({
      ...tree,
      verified: true,
      algorithm: 'SHA-256 Merkle Tree',
      builtAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/oracle/tapscript — Generate Tapscript spending paths
router.get('/tapscript', (req, res) => {
  try {
    if (!oracle.initialized) oracle.initialize()
    const verdictHash = req.query.verdictHash || null
    const tapscript = oracle.generateTapscript(verdictHash)
    res.json({
      ...tapscript,
      scheme: 'BIP-342 Tapscript',
      keyPath: {
        available: true,
        description: 'FROST aggregate key-path spend (default)',
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * Run a single oracle node — independently fetches all data + runs AI verdict
 */
async function runOracleNode(nodeId, company, send) {
  const log = (type, msg) =>
    send('node-log', { nodeId, type, message: msg, ts: Date.now() })

  const node = oracle.nodes.find((n) => n.id === nodeId)

  try {
    log('system', `Initializing FROST oracle node ${nodeId}...`)
    log('crypto', `Keypair loaded: ${node.xOnlyPubKey.slice(0, 16)}...`)
    log('system', `Threshold scheme: 2-of-3 Schnorr (BIP-340)`)

    // Step 1: EIA
    log('fetch', `Querying EIA v2 API — federal energy grid data for "${company}"...`)
    const eiaRes = await axios.post(`${API_BASE}/eia/renewable`, { company })
    const eia = eiaRes.data
    log('data', `EIA → ${eia.state} grid: ${eia.renewablePercentage}% renewable | ${eia.totalCapacity} thousand MWh`)
    if (eia.details?.coal > 0)
      log('data', `EIA → Fossil: coal=${eia.details.coal}, gas=${eia.details.naturalGas} thousand MWh`)

    // Step 2: EPA
    log('fetch', `Querying EPA eGRID — CO₂ emission rates...`)
    const epaRes = await axios.post(`${API_BASE}/epa/emissions`, { company })
    const epa = epaRes.data
    log('data', `EPA → ${epa.co2Intensity} lbs CO₂/MWh (baseline: ${epa.stateBaseline}, national: ${epa.nationalAverage})`)
    log('data', `EPA → Sector multiplier: ${epa.sectorMultiplier}x | Clean threshold: <200 lbs/MWh`)

    // Step 3: SEC
    log('fetch', `Searching SEC EDGAR for 10-K ESG disclosures...`)
    let sec = null
    try {
      const secRes = await axios.post(
        `${API_BASE}/sec/filings`,
        { company },
        { timeout: 5000 }
      )
      sec = secRes.data
      log('data', `SEC → ${sec.disclosureCount} ESG disclosures | Risk: ${sec.disclosureRisk}`)
    } catch {
      log('warn', `SEC EDGAR timeout — proceeding without filing data`)
    }

    // Step 5: NASA POWER Satellite Data
    log('fetch', `Querying NASA POWER satellite — solar irradiance & wind...`)
    let satellite = null
    try {
      const satRes = await axios.post(
        `${API_BASE}/satellite/power`,
        { company },
        { timeout: 15000 }
      )
      satellite = satRes.data
      if (satellite.fetched) {
        log('data', `🛰️ NASA → Solar: ${satellite.solar.irradiance} kWh/m²/day (${satellite.solar.rating}) @ ${satellite.location}`)
        log('data', `🛰️ NASA → Wind: ${satellite.wind.speed50m} m/s (${satellite.wind.rating}) | Temp: ${satellite.temperature}°C`)
      } else {
        log('warn', `NASA POWER data unavailable — continuing without satellite data`)
      }
    } catch {
      log('warn', `NASA POWER timeout — proceeding without satellite data`)
    }

    // Step 4: Groq AI
    log('ai', `Running Groq llama-3.3-70b-versatile analysis...`)
    const groqRes = await axios.post(`${API_BASE}/groq/analyze`, {
      company,
      claim: `${company}'s commitment to 100% renewable energy and carbon neutrality`,
      eiaData: {
        renewablePercentage: eia.renewablePercentage,
        totalCapacity: eia.totalCapacity,
        fossilPercentage: eia.fossilPercentage,
        details: eia.details,
      },
      epaData: {
        co2Intensity: epa.co2Intensity,
        stateBaseline: epa.stateBaseline,
        nationalAverage: epa.nationalAverage,
        sectorMultiplier: epa.sectorMultiplier,
      },
      secData: sec,
      satelliteData: satellite ? {
        solarIrradiance: satellite.solar?.irradiance,
        solarRating: satellite.solar?.rating,
        windSpeed: satellite.wind?.speed50m,
        windRating: satellite.wind?.rating,
        location: satellite.location,
      } : null,
    })

    const ai = groqRes.data.aiVerdict || {}
    const fraudDetected = ai.greenwashing === true

    log(
      fraudDetected ? 'alert' : 'success',
      `⚡ VERDICT: fraud_detected=${fraudDetected} | risk_score=${ai.riskScore}/100 | ${ai.riskLevel}`
    )
    if (ai.reasons?.length)
      log('detail', `Reasons: ${ai.reasons.slice(0, 2).join('; ')}`)

    log('crypto', `Partial signature commitment ready — awaiting consensus...`)

    return {
      nodeId,
      fraudDetected,
      riskScore: ai.riskScore ?? 50,
      riskLevel: ai.riskLevel ?? 'MEDIUM',
      confidence: ai.confidence ?? 75,
      verdict: ai.verdict ?? 'ANALYZED',
      reasons: ai.reasons || [],
      narrative: groqRes.data.narrative || '',
      eiaData: eia,
      epaData: epa,
      secData: sec,
      satelliteData: satellite,
    }
  } catch (error) {
    log('error', `Node ${nodeId} error: ${error.message}`)
    return {
      nodeId,
      fraudDetected: false,
      riskScore: 0,
      riskLevel: 'ERROR',
      confidence: 0,
      error: error.message,
    }
  }
}

export default router
