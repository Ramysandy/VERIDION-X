/**
 * Bounty Marketplace Route — Testnet wallet, staking, PSBT, OP_RETURN chain
 * 
 * Economic protocol for ESG fraud investigation bounties
 * - Wallet management (P2TR Taproot addresses)
 * - Bounty staking to escrow Tapscript addresses
 * - PSBT multi-party signing flow
 * - Recursive OP_RETURN verdict chain
 */

import { Router } from 'express'
import axios from 'axios'
import { oracle } from '../frost/index.js'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

const router = Router()

// In-memory bounty marketplace state (production: use DB)
const marketplace = {
  bounties: [],
  psbts: {},
  opReturnChain: [],
}

// POST /api/bounty/wallet/create — Generate a Taproot wallet from FROST keys
router.post('/wallet/create', (req, res) => {
  try {
    if (!oracle.initialized) oracle.initialize()
    const info = oracle.taprootInfo
    res.json({
      address: info.testnet,
      mainnetAddress: info.mainnet,
      internalKey: info.internalKey,
      outputKey: info.outputKey,
      network: 'testnet',
      type: 'P2TR (BIP-341)',
      frostControlled: true,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/bounty/wallet/:address/balance — Check wallet via mempool.space
router.get('/wallet/:address/balance', async (req, res) => {
  const { address } = req.params
  try {
    const [addrRes, utxoRes] = await Promise.all([
      axios.get(`https://mempool.space/testnet/api/address/${address}`, { timeout: 8000 }),
      axios.get(`https://mempool.space/testnet/api/address/${address}/utxo`, { timeout: 8000 }),
    ])
    const utxos = utxoRes.data || []
    const totalSats = utxos.reduce((sum, u) => sum + (u.value || 0), 0)
    const confirmedSats = utxos.filter(u => u.status?.confirmed).reduce((sum, u) => sum + (u.value || 0), 0)

    res.json({
      address,
      totalSats,
      confirmedSats,
      pendingSats: totalSats - confirmedSats,
      totalBTC: (totalSats / 1e8).toFixed(8),
      utxoCount: utxos.length,
      txCount: addrRes.data.chain_stats?.tx_count || 0,
      funded: totalSats > 0,
      network: 'testnet',
      explorerUrl: `https://mempool.space/testnet/address/${address}`,
    })
  } catch (error) {
    res.json({
      address,
      totalSats: 0,
      confirmedSats: 0,
      pendingSats: 0,
      totalBTC: '0.00000000',
      utxoCount: 0,
      txCount: 0,
      funded: false,
      network: 'testnet',
      error: error.message,
    })
  }
})

// POST /api/bounty/create — Create a new investigation bounty
router.post('/create', (req, res) => {
  try {
    const { company, stakeAmount, description, creatorAddress } = req.body
    if (!company) return res.status(400).json({ error: 'Missing company name' })

    if (!oracle.initialized) oracle.initialize()

    // Generate escrow address via Tapscript (timelock + multisig recovery)
    const bountyHash = bytesToHex(sha256(new TextEncoder().encode(
      `${company}:${Date.now()}:${Math.random()}`
    )))
    const tapscript = oracle.generateTapscript(bountyHash)

    const bounty = {
      id: `BNT-${bountyHash.slice(0, 8).toUpperCase()}`,
      company,
      description: description || `Investigate ${company}'s ESG claims for greenwashing`,
      stakeAmount: stakeAmount || 50000, // default 50k sats
      escrowAddress: tapscript.address,
      escrowScriptRoot: tapscript.scriptRoot,
      creatorAddress: creatorAddress || oracle.taprootInfo.testnet,
      status: 'OPEN',
      verdictTxId: null,
      opReturnChainId: null,
      claims: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      tapscriptPaths: tapscript.scripts.map(s => ({ name: s.name, description: s.description })),
    }

    marketplace.bounties.push(bounty)

    res.json({
      ...bounty,
      marketplace: {
        totalBounties: marketplace.bounties.length,
        openBounties: marketplace.bounties.filter(b => b.status === 'OPEN').length,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/bounty/marketplace — List all bounties
router.get('/marketplace', (req, res) => {
  const { status } = req.query
  let bounties = marketplace.bounties
  if (status) bounties = bounties.filter(b => b.status === status)

  const totalStaked = bounties.reduce((sum, b) => sum + b.stakeAmount, 0)

  res.json({
    bounties: bounties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    stats: {
      total: marketplace.bounties.length,
      open: marketplace.bounties.filter(b => b.status === 'OPEN').length,
      claimed: marketplace.bounties.filter(b => b.status === 'CLAIMED').length,
      completed: marketplace.bounties.filter(b => b.status === 'COMPLETED').length,
      totalStaked,
      totalStakedBTC: (totalStaked / 1e8).toFixed(8),
    },
  })
})

// POST /api/bounty/claim — Claim a bounty (investigator starts audit)
router.post('/claim', (req, res) => {
  try {
    const { bountyId, investigatorAddress } = req.body
    if (!bountyId) return res.status(400).json({ error: 'Missing bountyId' })

    const bounty = marketplace.bounties.find(b => b.id === bountyId)
    if (!bounty) return res.status(404).json({ error: 'Bounty not found' })
    if (bounty.status !== 'OPEN') return res.status(400).json({ error: `Bounty is ${bounty.status}` })

    bounty.status = 'CLAIMED'
    bounty.claims.push({
      investigator: investigatorAddress || 'anonymous',
      claimedAt: new Date().toISOString(),
    })

    res.json({
      ...bounty,
      message: 'Bounty claimed — run audit to complete investigation',
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/bounty/complete — Complete bounty with audit results
router.post('/complete', (req, res) => {
  try {
    const { bountyId, verdictTxId, fraudDetected, riskScore } = req.body
    if (!bountyId) return res.status(400).json({ error: 'Missing bountyId' })

    const bounty = marketplace.bounties.find(b => b.id === bountyId)
    if (!bounty) return res.status(404).json({ error: 'Bounty not found' })

    bounty.status = 'COMPLETED'
    bounty.verdictTxId = verdictTxId || null
    bounty.completedAt = new Date().toISOString()
    bounty.result = { fraudDetected, riskScore }

    // Build OP_RETURN chain entry
    const previousTxId = marketplace.opReturnChain.length > 0
      ? marketplace.opReturnChain[marketplace.opReturnChain.length - 1].txId
      : null

    if (!oracle.initialized) oracle.initialize()
    const chainEntry = oracle.buildOPReturnChain(
      { company: bounty.company, fraudDetected, riskScore, bountyId },
      previousTxId
    )
    marketplace.opReturnChain.push(chainEntry)
    bounty.opReturnChainId = chainEntry.chainIndex

    res.json({
      ...bounty,
      opReturnChain: chainEntry,
      payoutInfo: {
        amount: bounty.stakeAmount,
        destination: bounty.claims[0]?.investigator || bounty.creatorAddress,
        method: 'Tapscript timelock claim (144 blocks)',
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/bounty/psbt/create — Create PSBT for multi-party signing
router.post('/psbt/create', (req, res) => {
  try {
    const { inputAddress, outputAddress, amount, verdictHash } = req.body
    if (!oracle.initialized) oracle.initialize()

    const psbt = oracle.createPSBT(
      inputAddress || oracle.taprootInfo.testnet,
      outputAddress || oracle.taprootInfo.testnet,
      amount || 10000,
      verdictHash
    )

    const psbtId = `PSBT-${bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(psbt)))).slice(0, 12)}`
    marketplace.psbts[psbtId] = {
      ...psbt,
      id: psbtId,
      signatures: [],
      status: 'AWAITING_SIGNATURES',
      requiredSignatures: 2,
      createdAt: new Date().toISOString(),
    }

    res.json(marketplace.psbts[psbtId])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/bounty/psbt/sign — Add partial signature to PSBT
router.post('/psbt/sign', (req, res) => {
  try {
    const { psbtId, nodeId } = req.body
    if (!psbtId) return res.status(400).json({ error: 'Missing psbtId' })

    const psbt = marketplace.psbts[psbtId]
    if (!psbt) return res.status(404).json({ error: 'PSBT not found' })
    if (psbt.status === 'FINALIZED') return res.status(400).json({ error: 'PSBT already finalized' })

    if (!oracle.initialized) oracle.initialize()

    const sigNodeId = nodeId || (psbt.signatures.length + 1)
    if (psbt.signatures.find(s => s.nodeId === sigNodeId)) {
      return res.status(400).json({ error: `Node ${sigNodeId} already signed` })
    }

    const partialSig = oracle.signPSBT(psbt, sigNodeId)
    psbt.signatures.push({
      nodeId: sigNodeId,
      ...partialSig,
      signedAt: new Date().toISOString(),
    })

    psbt.status = psbt.signatures.length >= psbt.requiredSignatures
      ? 'READY_TO_FINALIZE'
      : 'AWAITING_SIGNATURES'

    res.json({
      ...psbt,
      progress: `${psbt.signatures.length}/${psbt.requiredSignatures}`,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/bounty/psbt/finalize — Finalize PSBT with aggregated signature
router.post('/psbt/finalize', (req, res) => {
  try {
    const { psbtId } = req.body
    if (!psbtId) return res.status(400).json({ error: 'Missing psbtId' })

    const psbt = marketplace.psbts[psbtId]
    if (!psbt) return res.status(404).json({ error: 'PSBT not found' })
    if (psbt.signatures.length < psbt.requiredSignatures) {
      return res.status(400).json({ error: `Need ${psbt.requiredSignatures - psbt.signatures.length} more signatures` })
    }

    if (!oracle.initialized) oracle.initialize()
    const finalized = oracle.finalizePSBT(psbt)

    psbt.status = 'FINALIZED'
    psbt.finalizedTx = finalized
    psbt.finalizedAt = new Date().toISOString()

    res.json({
      ...psbt,
      broadcastReady: true,
      rawHex: finalized.rawHex,
      txId: finalized.txId,
      mempoolUrl: finalized.mempoolUrl,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/bounty/opreturn/chain — Get the full OP_RETURN verdict chain
router.get('/opreturn/chain', (req, res) => {
  res.json({
    chain: marketplace.opReturnChain,
    length: marketplace.opReturnChain.length,
    headTxId: marketplace.opReturnChain.length > 0
      ? marketplace.opReturnChain[marketplace.opReturnChain.length - 1].txId
      : null,
    scheme: 'Recursive OP_RETURN — each verdict references the previous txid',
  })
})

// POST /api/bounty/opreturn/append — Append to OP_RETURN chain
router.post('/opreturn/append', (req, res) => {
  try {
    const { company, fraudDetected, riskScore } = req.body
    if (!company) return res.status(400).json({ error: 'Missing company' })

    if (!oracle.initialized) oracle.initialize()

    const previousTxId = marketplace.opReturnChain.length > 0
      ? marketplace.opReturnChain[marketplace.opReturnChain.length - 1].txId
      : null

    const entry = oracle.buildOPReturnChain(
      { company, fraudDetected, riskScore },
      previousTxId
    )
    marketplace.opReturnChain.push(entry)

    res.json({
      entry,
      chain: {
        length: marketplace.opReturnChain.length,
        headTxId: entry.txId,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
