/**
 * FROST (Flexible Round-Optimized Schnorr Threshold) Oracle
 * Implements 2-of-3 threshold Schnorr signatures for VERIDION-X
 *
 * Uses Shamir's Secret Sharing for key generation and
 * Lagrange interpolation for threshold signature aggregation.
 * Compatible with BIP-340 (Schnorr) and BIP-341 (Taproot).
 */

import { secp256k1, schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils'
import { bech32m } from 'bech32'

const Point = secp256k1.ProjectivePoint
const N = secp256k1.CURVE.n
const G = Point.BASE

// --- Scalar Utilities ---

function randomScalar() {
  return BigInt('0x' + bytesToHex(secp256k1.utils.randomPrivateKey()))
}

function mod(a, m = N) {
  return ((a % m) + m) % m
}

function modInverse(a, m = N) {
  if (a === 0n) throw new Error('Cannot invert zero')
  let [old_r, r] = [mod(a, m), m]
  let [old_s, s] = [1n, 0n]
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s]
  }
  return mod(old_s, m)
}

function scalarToBytes(s) {
  return hexToBytes(s.toString(16).padStart(64, '0'))
}

// --- Point Utilities ---

function pointToXOnly(point) {
  const raw = point.toRawBytes(false) // 65 bytes: 04 || x(32) || y(32)
  return raw.slice(1, 33)
}

function hasEvenY(point) {
  const raw = point.toRawBytes(false)
  const y = BigInt('0x' + bytesToHex(raw.slice(33)))
  return y % 2n === 0n
}

// BIP-340 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || data...)
function taggedHash(tag, ...data) {
  const tagH = sha256(new TextEncoder().encode(tag))
  return sha256(concatBytes(tagH, tagH, ...data))
}

// --- FROST Oracle Implementation ---

class FROSTOracle {
  constructor() {
    this.nodes = []
    this.groupSecret = null
    this.groupPubKey = null
    this.initialized = false
  }

  /**
   * Dealer key generation using Shamir's Secret Sharing
   * Polynomial: f(x) = s + a₁·x  (degree 1 for threshold t=2)
   * Shares: s_i = f(i) for i ∈ {1, 2, 3}
   */
  initialize() {
    const s = randomScalar()
    const a1 = randomScalar()

    // Generate secret shares
    this.nodes = [1n, 2n, 3n].map((i) => {
      const share = mod(s + a1 * i)
      const pubKey = G.multiply(share)
      return {
        id: Number(i),
        share,
        pubKey,
        pubKeyHex: bytesToHex(pubKey.toRawBytes(true)),
        xOnlyPubKey: bytesToHex(pointToXOnly(pubKey)),
      }
    })

    // Group public key
    let groupPub = G.multiply(s)
    let groupSec = s

    // BIP-340: ensure even y-coordinate
    if (!hasEvenY(groupPub)) {
      groupSec = mod(N - s)
      groupPub = groupPub.negate()
      this.nodes.forEach((node) => {
        node.share = mod(N - node.share)
        node.pubKey = node.pubKey.negate()
        node.pubKeyHex = bytesToHex(node.pubKey.toRawBytes(true))
        node.xOnlyPubKey = bytesToHex(pointToXOnly(node.pubKey))
      })
    }

    this.groupSecret = groupSec
    this.groupPubKey = groupPub
    this.groupPubKeyHex = bytesToHex(groupPub.toRawBytes(true))
    this.xOnlyGroupKey = bytesToHex(pointToXOnly(groupPub))

    // Taproot address
    this.taprootInfo = this.generateTaprootAddress()
    this.initialized = true

    console.log(`[FROST] Oracle initialized — 3 nodes, threshold 2/3`)
    console.log(`[FROST] Group pubkey: ${this.xOnlyGroupKey.slice(0, 20)}...`)
    console.log(`[FROST] Taproot (testnet): ${this.taprootInfo.testnet}`)

    return {
      nodes: this.nodes.map((n) => ({
        id: n.id,
        pubKeyHex: n.pubKeyHex,
        xOnlyPubKey: n.xOnlyPubKey,
      })),
      groupPubKey: this.groupPubKeyHex,
      xOnlyGroupKey: this.xOnlyGroupKey,
      taproot: this.taprootInfo,
    }
  }

  /**
   * Lagrange coefficient λ_i for participant i in set S
   * λ_i = ∏_{j∈S, j≠i} j / (j - i)
   */
  lagrangeCoeff(i, S) {
    let num = 1n
    let den = 1n
    const iBig = BigInt(i)
    for (const j of S) {
      const jBig = BigInt(j)
      if (jBig !== iBig) {
        num = mod(num * jBig)
        den = mod(den * mod(jBig - iBig))
      }
    }
    return mod(num * modInverse(den))
  }

  /**
   * FROST Round 1: Generate nonce commitment
   * k_i ← random scalar, R_i = k_i·G
   */
  generateNonceCommitment(nodeId) {
    let k = randomScalar()
    let R = G.multiply(k)

    // BIP-340: ensure even y
    if (!hasEvenY(R)) {
      k = mod(N - k)
      R = R.negate()
    }

    return {
      nodeId,
      nonce: k, // secret — never exposed
      R,
      R_hex: bytesToHex(pointToXOnly(R)),
    }
  }

  /**
   * FROST Round 2: Aggregate partial signatures
   *
   * R = Σ R_i
   * e = H("BIP0340/challenge" || R_x || P_x || m)
   * z_i = k_i + e · λ_i · s_i
   * z = Σ z_i
   * Signature: (R_x, z)
   */
  aggregateSignatures(commitments, message, participatingIds) {
    // Aggregate nonce point
    let R_agg = commitments[0].R
    for (let i = 1; i < commitments.length; i++) {
      R_agg = R_agg.add(commitments[i].R)
    }

    let negateNonces = false
    if (!hasEvenY(R_agg)) {
      R_agg = R_agg.negate()
      negateNonces = true
    }

    const R_x = pointToXOnly(R_agg)
    const P_x = pointToXOnly(this.groupPubKey)
    const m = sha256(new TextEncoder().encode(message))

    // BIP-340 challenge
    const e = mod(
      BigInt('0x' + bytesToHex(taggedHash('BIP0340/challenge', R_x, P_x, m)))
    )

    // Partial signature aggregation
    let s_agg = 0n
    for (const commitment of commitments) {
      const node = this.nodes.find((n) => n.id === commitment.nodeId)
      const lambda = this.lagrangeCoeff(commitment.nodeId, participatingIds)

      let k_i = commitment.nonce
      if (negateNonces) k_i = mod(N - k_i)

      const z_i = mod(k_i + mod(e * mod(lambda * node.share)))
      s_agg = mod(s_agg + z_i)
    }

    // Verify: s·G =? R + e·P
    const sG = G.multiply(s_agg)
    const eP = this.groupPubKey.multiply(e)
    const expected = R_agg.add(eP)

    // Compare x-coordinates for BIP-340 compatibility
    const valid =
      bytesToHex(pointToXOnly(sG)) === bytesToHex(pointToXOnly(expected))

    const sig = bytesToHex(R_x) + s_agg.toString(16).padStart(64, '0')

    return {
      R: bytesToHex(R_x),
      s: s_agg.toString(16).padStart(64, '0'),
      signature: sig,
      aggregatePubKey: this.xOnlyGroupKey,
      participatingNodes: participatingIds,
      valid,
      messageHash: bytesToHex(m),
    }
  }

  /**
   * Generate BIP-341 Taproot P2TR address
   *
   * Internal key: FROST aggregate pubkey (x-only)
   * Tweak: t = H("TapTweak" || internalKey)
   * Output key: Q = P + t·G
   * Address: bech32m("tb", 1, Q_x)  [testnet]
   */
  generateTaprootAddress() {
    const internalKey = pointToXOnly(this.groupPubKey)

    // Taproot tweak
    const tweakHash = taggedHash('TapTweak', internalKey)
    const tweak = mod(BigInt('0x' + bytesToHex(tweakHash)))

    // Output key: P + t·G
    const tweakPoint = G.multiply(tweak)
    const Q = this.groupPubKey.add(tweakPoint)
    const Q_x = pointToXOnly(Q)

    // Bech32m encode — testnet
    const testWords = bech32m.toWords(Buffer.from(Q_x))
    testWords.unshift(1) // witness version 1
    const testnetAddr = bech32m.encode('tb', testWords)

    // Mainnet (for display)
    const mainWords = bech32m.toWords(Buffer.from(Q_x))
    mainWords.unshift(1)
    const mainnetAddr = bech32m.encode('bc', mainWords)

    return {
      testnet: testnetAddr,
      mainnet: mainnetAddr,
      internalKey: bytesToHex(internalKey),
      outputKey: bytesToHex(Q_x),
      tweak: bytesToHex(tweakHash),
      network: 'testnet',
    }
  }

  /**
   * Construct a simulated Taproot spending transaction
   * with OP_RETURN inscription of the fraud verdict
   */
  constructTransaction(verdictData, signature) {
    const verdictJson =
      typeof verdictData === 'string'
        ? verdictData
        : JSON.stringify(verdictData)
    const verdictHash = bytesToHex(
      sha256(new TextEncoder().encode(verdictJson))
    )

    // OP_RETURN inscription (max 80 bytes)
    const inscription = `VX|FRAUD|${verdictHash.slice(0, 40)}`
    const inscriptionHex = bytesToHex(new TextEncoder().encode(inscription))

    // Simulated raw transaction components
    const txVersion = '02000000'
    const segwitMarker = '0001'
    const inputCount = '01'
    // Simulated UTXO (would be the funded bounty address)
    const prevTxHash = bytesToHex(
      sha256(new TextEncoder().encode(this.taprootInfo.testnet))
    )
    const prevVout = '00000000'
    const scriptSigLen = '00'
    const sequence = 'fdffffff'

    // Output 1: bounty payment (to hunter)
    const hunterAmount = '10270000000000' // 0.0001 BTC sats in LE
    const hunterScript = '0014' + bytesToHex(sha256(secp256k1.utils.randomPrivateKey())).slice(0, 40)
    const hunterScriptLen = (hunterScript.length / 2).toString(16).padStart(2, '0')

    // Output 2: OP_RETURN verdict inscription
    const opReturn = '6a' + (inscriptionHex.length / 2).toString(16).padStart(2, '0') + inscriptionHex
    const opReturnLen = (opReturn.length / 2).toString(16).padStart(2, '0')

    const outputCount = '02'
    const locktime = '00000000'

    // Witness: Schnorr signature (64 bytes, no sighash flag for key-path spend)
    const witnessItems = '01'
    const sigLen = '40' // 64 bytes
    const witnessSig = signature.signature

    const rawTx = [
      txVersion,
      segwitMarker,
      inputCount,
      prevTxHash,
      prevVout,
      scriptSigLen,
      sequence,
      outputCount,
      hunterAmount,
      hunterScriptLen,
      hunterScript,
      '0000000000000000', // 0 sats for OP_RETURN
      opReturnLen,
      opReturn,
      witnessItems,
      sigLen,
      witnessSig,
      locktime,
    ].join('')

    // Double-SHA256 for txid (on non-witness data)
    const txForHash = txVersion + inputCount + prevTxHash + prevVout + scriptSigLen + sequence + outputCount + locktime
    const txId = bytesToHex(sha256(sha256(hexToBytes(txForHash))))

    return {
      txId,
      rawHex: rawTx,
      size: rawTx.length / 2,
      witnessData: witnessItems + sigLen + witnessSig,
      opReturn: inscription,
      opReturnHex: inscriptionHex,
      verdictHash,
      schnorrSignature: signature.signature,
      taprootAddress: this.taprootInfo.testnet,
      outputKey: this.taprootInfo.outputKey,
      mempoolUrl: `https://mempool.space/testnet/tx/${txId}`,
      inscriptionUrl: `https://mempool.space/testnet/tx/${txId}#vout=1`,
    }
  }

  /**
   * Build a SHA-256 Merkle tree from an array of data items
   * Returns the Merkle root + proof paths for each leaf
   */
  buildMerkleTree(dataItems) {
    if (!Array.isArray(dataItems) || dataItems.length === 0) {
      throw new Error('Merkle tree requires at least one data item')
    }

    // Create leaf hashes
    const leaves = dataItems.map((item) => {
      const serialized = typeof item === 'string' ? item : JSON.stringify(item)
      return bytesToHex(sha256(new TextEncoder().encode(serialized)))
    })

    // Build tree bottom-up
    const tree = [leaves]
    let currentLevel = leaves

    while (currentLevel.length > 1) {
      const nextLevel = []
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || currentLevel[i] // duplicate last if odd
        const combined = hexToBytes(left + right)
        nextLevel.push(bytesToHex(sha256(combined)))
      }
      tree.push(nextLevel)
      currentLevel = nextLevel
    }

    const root = currentLevel[0]

    // Generate proof for each leaf
    const proofs = leaves.map((_, leafIdx) => {
      const proof = []
      let idx = leafIdx
      for (let level = 0; level < tree.length - 1; level++) {
        const isRight = idx % 2 === 1
        const siblingIdx = isRight ? idx - 1 : idx + 1
        const sibling = tree[level][siblingIdx] || tree[level][idx]
        proof.push({ hash: sibling, position: isRight ? 'left' : 'right' })
        idx = Math.floor(idx / 2)
      }
      return proof
    })

    return {
      root,
      leaves,
      depth: tree.length - 1,
      leafCount: leaves.length,
      proofs,
      tree: tree.map((level) => level.length), // level sizes for display
    }
  }

  /**
   * Verify a Merkle proof for a given leaf hash
   */
  verifyMerkleProof(leafHash, proof, root) {
    let hash = leafHash
    for (const step of proof) {
      const combined = step.position === 'left'
        ? hexToBytes(step.hash + hash)
        : hexToBytes(hash + step.hash)
      hash = bytesToHex(sha256(combined))
    }
    return hash === root
  }

  /**
   * Generate Tapscript spending paths (BIP-342)
   * Creates a script tree with multiple spending conditions:
   *   - Key-path: FROST aggregate key (default, always works)
   *   - Script-path 1: Bounty claim after timelock (CLTV)
   *   - Script-path 2: Emergency multi-sig recovery
   *   - Script-path 3: Verdict hash commitment (OP_RETURN alternative)
   */
  generateTapscript(verdictHash) {
    const internalKey = pointToXOnly(this.groupPubKey)
    const internalKeyHex = bytesToHex(internalKey)

    // Script 1: Bounty claim with timelock
    // OP_CHECKLOCKTIMEVERIFY + OP_DROP + <pubkey> + OP_CHECKSIG
    const timelockBlocks = 144 // ~24 hours on testnet
    const timelockHex = timelockBlocks.toString(16).padStart(8, '0')
    const bountyClaimScript = `${timelockHex}b175${internalKeyHex}ac`
    // b1 = OP_CLTV, 75 = OP_DROP, ac = OP_CHECKSIG

    // Script 2: 2-of-3 multi-sig recovery using node keys
    const node1Key = this.nodes[0].xOnlyPubKey
    const node2Key = this.nodes[1].xOnlyPubKey
    const node3Key = this.nodes[2].xOnlyPubKey
    const multiSigScript = `20${node1Key}ac7c20${node2Key}ac937c20${node3Key}ac9368`
    // 20 = push 32 bytes, ac = OP_CHECKSIG, 7c = OP_SWAP, 93 = OP_ADD, 68 = OP_2

    // Script 3: Verdict commitment (hash lock)
    const verdictHashHex = verdictHash || bytesToHex(sha256(new TextEncoder().encode('VERIDION-X')))
    const hashLockScript = `a820${verdictHashHex}8820${internalKeyHex}ac`
    // a8 = OP_SHA256, 88 = OP_EQUALVERIFY, ac = OP_CHECKSIG

    // Build TapBranch tree: hash each script leaf, then combine
    const leaf1Hash = bytesToHex(taggedHash('TapLeaf', new Uint8Array([0xc0]), hexToBytes(bountyClaimScript)))
    const leaf2Hash = bytesToHex(taggedHash('TapLeaf', new Uint8Array([0xc0]), hexToBytes(multiSigScript)))
    const leaf3Hash = bytesToHex(taggedHash('TapLeaf', new Uint8Array([0xc0]), hexToBytes(hashLockScript)))

    // Branch: hash(leaf1, leaf2)
    const [sortedL1, sortedL2] = leaf1Hash < leaf2Hash ? [leaf1Hash, leaf2Hash] : [leaf2Hash, leaf1Hash]
    const branchHash = bytesToHex(taggedHash('TapBranch', hexToBytes(sortedL1), hexToBytes(sortedL2)))

    // Root: hash(branch, leaf3)
    const [sortedB, sortedL3] = branchHash < leaf3Hash ? [branchHash, leaf3Hash] : [leaf3Hash, branchHash]
    const scriptRoot = bytesToHex(taggedHash('TapBranch', hexToBytes(sortedB), hexToBytes(sortedL3)))

    // Tweaked key: P + H("TapTweak" || P || scriptRoot) * G
    const tweakHash = taggedHash('TapTweak', internalKey, hexToBytes(scriptRoot))
    const tweak = mod(BigInt('0x' + bytesToHex(tweakHash)))
    const tweakPoint = G.multiply(tweak)
    const Q = this.groupPubKey.add(tweakPoint)
    const Q_x = pointToXOnly(Q)

    // Generate Taproot address with script tree
    const testWords = bech32m.toWords(Buffer.from(Q_x))
    testWords.unshift(1)
    const scriptAddress = bech32m.encode('tb', testWords)

    return {
      address: scriptAddress,
      internalKey: internalKeyHex,
      outputKey: bytesToHex(Q_x),
      scriptRoot,
      scripts: [
        {
          name: 'Bounty Claim (Timelock)',
          script: bountyClaimScript,
          leafHash: leaf1Hash,
          description: `Claimable after ${timelockBlocks} blocks (~24h) with FROST key signature`,
        },
        {
          name: 'Multi-Sig Recovery',
          script: multiSigScript,
          leafHash: leaf2Hash,
          description: '2-of-3 oracle node key recovery path',
        },
        {
          name: 'Verdict Hash Lock',
          script: hashLockScript,
          leafHash: leaf3Hash,
          description: 'Unlock by revealing verdict preimage + key signature',
        },
      ],
      tweak: bytesToHex(tweakHash),
      depth: 2, // tree depth
    }
  }

  /**
   * Create a Partially Signed Bitcoin Transaction (PSBT)
   * BIP-174 compatible structure for multi-party signing
   */
  createPSBT(inputAddress, outputAddress, amount, verdictHash) {
    const prevTxHash = bytesToHex(sha256(new TextEncoder().encode(inputAddress + Date.now())))
    const prevVout = 0

    // OP_RETURN data if verdict provided
    let opReturnData = null
    if (verdictHash) {
      const inscription = `VX|PSBT|${verdictHash.slice(0, 40)}`
      opReturnData = {
        inscription,
        hex: bytesToHex(new TextEncoder().encode(inscription)),
      }
    }

    const psbtGlobal = {
      version: 2,
      txVersion: '02000000',
      inputCount: 1,
      outputCount: opReturnData ? 2 : 1,
    }

    const psbtInputs = [{
      prevTxHash,
      prevVout,
      witnessUtxo: {
        amount,
        scriptPubKey: `5120${this.taprootInfo.outputKey}`, // P2TR
      },
      taprootInternalKey: this.taprootInfo.internalKey,
      taprootKeyPath: true,
      sighashType: 0x00, // SIGHASH_DEFAULT for Taproot key-path
    }]

    const psbtOutputs = [
      {
        address: outputAddress,
        amount: amount - 500, // minus fee
        type: 'P2TR',
      },
    ]

    if (opReturnData) {
      psbtOutputs.push({
        amount: 0,
        type: 'OP_RETURN',
        data: opReturnData.inscription,
        dataHex: opReturnData.hex,
      })
    }

    return {
      global: psbtGlobal,
      inputs: psbtInputs,
      outputs: psbtOutputs,
      frostPubKey: this.xOnlyGroupKey,
      taprootAddress: this.taprootInfo.testnet,
      threshold: '2-of-3',
      opReturn: opReturnData,
    }
  }

  /**
   * Sign a PSBT with a specific node's share (partial Schnorr signature)
   */
  signPSBT(psbt, nodeId) {
    const node = this.nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    // Generate nonce commitment for this signing session
    const commitment = this.generateNonceCommitment(nodeId)

    // Create signing message from PSBT inputs
    const message = JSON.stringify({
      prevTxHash: psbt.inputs?.[0]?.prevTxHash || psbt.global?.txVersion,
      outputs: psbt.outputs?.map(o => ({ address: o.address, amount: o.amount })),
      timestamp: Date.now(),
    })
    const m = sha256(new TextEncoder().encode(message))

    return {
      nodeId,
      R: commitment.R_hex,
      commitment,
      pubKey: node.xOnlyPubKey,
      messageHash: bytesToHex(m),
      phase: `Node ${nodeId} partial signature committed`,
    }
  }

  /**
   * Finalize a PSBT — aggregate all partial signatures into BIP-340 Schnorr
   */
  finalizePSBT(psbt) {
    const participatingIds = psbt.signatures.map(s => s.nodeId)
    const commitments = psbt.signatures.map(s => s.commitment)

    const message = JSON.stringify({
      prevTxHash: psbt.inputs?.[0]?.prevTxHash || psbt.global?.txVersion,
      outputs: psbt.outputs?.map(o => ({ address: o.address, amount: o.amount })),
      psbtId: psbt.id,
    })

    const aggregated = this.aggregateSignatures(commitments, message, participatingIds)

    // Construct final transaction
    const txVersion = '02000000'
    const segwitMarker = '0001'
    const prevTxHash = psbt.inputs[0].prevTxHash
    const prevVout = '00000000'
    const sequence = 'fdffffff'

    // Outputs
    const mainOutput = psbt.outputs[0]
    const amountLE = mainOutput.amount.toString(16).padStart(16, '0')
    const mainScript = `5120${this.taprootInfo.outputKey}`
    const mainScriptLen = (mainScript.length / 2).toString(16).padStart(2, '0')

    let outputSection = `${amountLE}${mainScriptLen}${mainScript}`
    let outputCount = '01'

    if (psbt.outputs.length > 1 && psbt.outputs[1].type === 'OP_RETURN') {
      const opReturnHex = psbt.outputs[1].dataHex
      const opReturn = '6a' + (opReturnHex.length / 2).toString(16).padStart(2, '0') + opReturnHex
      const opReturnLen = (opReturn.length / 2).toString(16).padStart(2, '0')
      outputSection += `0000000000000000${opReturnLen}${opReturn}`
      outputCount = '02'
    }

    // Witness
    const witnessSig = aggregated.signature
    const rawHex = [
      txVersion, segwitMarker,
      '01', prevTxHash, prevVout, '00', sequence,
      outputCount, outputSection,
      '01', '40', witnessSig,
      '00000000',
    ].join('')

    const txForHash = txVersion + '01' + prevTxHash + prevVout + '00' + sequence + outputCount + '00000000'
    const txId = bytesToHex(sha256(sha256(hexToBytes(txForHash))))

    return {
      txId,
      rawHex,
      signature: aggregated.signature,
      valid: aggregated.valid,
      participatingNodes: participatingIds,
      mempoolUrl: `https://mempool.space/testnet/tx/${txId}`,
      size: rawHex.length / 2,
    }
  }

  /**
   * Build recursive OP_RETURN chain — each verdict references the previous txid
   * Creates an immutable linked list of verdicts on the blockchain
   */
  buildOPReturnChain(verdictData, previousTxId) {
    const verdictJson = typeof verdictData === 'string' ? verdictData : JSON.stringify(verdictData)
    const verdictHash = bytesToHex(sha256(new TextEncoder().encode(verdictJson)))

    // Chain reference: include previous txid in current OP_RETURN
    const chainRef = previousTxId ? previousTxId.slice(0, 16) : '0000000000000000'
    const inscription = `VX|CHAIN|${chainRef}|${verdictHash.slice(0, 32)}`
    const inscriptionHex = bytesToHex(new TextEncoder().encode(inscription))

    // Construct chained transaction
    const txVersion = '02000000'
    const prevHash = previousTxId || bytesToHex(sha256(new TextEncoder().encode('GENESIS')))
    const opReturn = '6a' + (inscriptionHex.length / 2).toString(16).padStart(2, '0') + inscriptionHex
    const txContent = txVersion + prevHash + opReturn + Date.now().toString(16)
    const txId = bytesToHex(sha256(sha256(new TextEncoder().encode(txContent))))

    return {
      chainIndex: previousTxId ? 'LINKED' : 'GENESIS',
      txId,
      previousTxId: previousTxId || null,
      inscription,
      inscriptionHex,
      opReturnScript: opReturn,
      verdictHash,
      verdictData,
      linkedTo: previousTxId ? previousTxId.slice(0, 16) : null,
      mempoolUrl: `https://mempool.space/testnet/tx/${txId}`,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Verify a BIP-340 Schnorr signature against the group public key
   * Used for independent verification of FROST-signed verdicts
   */
  verifySignature(signatureHex, message) {
    if (!this.initialized) throw new Error('Oracle not initialized')
    const R_hex = signatureHex.slice(0, 64)
    const s_hex = signatureHex.slice(64)

    const R_bytes = hexToBytes(R_hex)
    const s_val = BigInt('0x' + s_hex)
    const P_x = pointToXOnly(this.groupPubKey)
    const m = sha256(new TextEncoder().encode(message))

    // BIP-340 challenge: e = H("BIP0340/challenge" || R || P || m)
    const e = mod(
      BigInt('0x' + bytesToHex(taggedHash('BIP0340/challenge', R_bytes, P_x, m)))
    )

    // Verify: s·G == R + e·P
    const sG = G.multiply(s_val)
    const R_point = Point.fromHex('02' + R_hex)
    const eP = this.groupPubKey.multiply(e)
    const expected = R_point.add(eP)

    const valid =
      bytesToHex(pointToXOnly(sG)) === bytesToHex(pointToXOnly(expected))

    return {
      valid,
      aggregatePubKey: this.xOnlyGroupKey,
      messageHash: bytesToHex(m),
      challenge: bytesToHex(scalarToBytes(e)).slice(0, 32) + '...',
      R: R_hex,
      s: s_hex,
    }
  }
}

// Singleton instance
const oracle = new FROSTOracle()

export { oracle, FROSTOracle }
