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
}

// Singleton instance
const oracle = new FROSTOracle()

export { oracle, FROSTOracle }
