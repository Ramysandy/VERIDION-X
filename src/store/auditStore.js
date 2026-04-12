import { create } from 'zustand'

const useAuditStore = create((set, get) => ({
  targetCompany: '',
  claim: null,
  eiaData: null,
  epaData: null,
  secData: null,
  aiVerdict: null,
  verdict: null,
  narrative: '',
  auditPhase: 'IDLE',
  payments: [],
  walletBalance: 210000,
  nostrNoteId: '',
  error: null,

  // FROST Oracle state
  oracleResults: null,    // { nodes, consensus, signature, transaction }
  frostSignature: null,   // { R, s, valid, participatingNodes }
  bitcoinTx: null,        // { txId, rawHex, mempoolUrl, opReturn }
  taprootAddress: null,   // { testnet, mainnet, outputKey }
  groupPubKey: null,      // x-only FROST aggregate pubkey
  satelliteData: null,    // NASA POWER solar/wind data
  merkleTree: null,       // { root, depth, leafCount, leaves }
  tapscriptInfo: null,    // { address, scriptRoot, scripts }

  // Bounty marketplace state
  bountyWallet: null,       // { address, balance, funded }
  activeBounties: [],       // marketplace bounties
  currentBounty: null,      // active bounty being investigated
  psbtState: null,          // { id, status, signatures, requiredSignatures }
  opReturnChain: [],        // recursive verdict chain
  ceremonyState: null,      // FROST ceremony visualization data
  lightningInvoice: null,   // { paymentRequest, paymentHash, amount, memo, company, demo }

  // Claim kicks off the audit pipeline
  setClaim: (claim) => set({
    claim,
    targetCompany: claim?.company || '',
    auditPhase: 'EXTRACTING_CLAIM',
    error: null,
  }),

  // Set company name from landing page — resets all state, triggers audit flow
  setAuditCompany: (company) => set({
    targetCompany: company,
    claim: null,
    eiaData: null,
    epaData: null,
    secData: null,
    aiVerdict: null,
    verdict: null,
    narrative: '',
    auditPhase: 'EXTRACTING_CLAIM',
    nostrNoteId: '',
    payments: [],
    error: null,
    oracleResults: null,
    frostSignature: null,
    bitcoinTx: null,
    taprootAddress: null,
    groupPubKey: null,
    satelliteData: null,
    merkleTree: null,
    tapscriptInfo: null,
    bountyWallet: null,
    activeBounties: [],
    currentBounty: null,
    psbtState: null,
    opReturnChain: [],
    ceremonyState: null,
    lightningInvoice: null,
  }),

  // Update claim data mid-pipeline without resetting phase
  setClaimData: (claim) => set({ claim }),

  // Each setter advances the phase
  setEiaData: (eiaData) => set({ eiaData, auditPhase: 'FETCHING_EIA' }),
  setEpaData: (epaData) => set({ epaData, auditPhase: 'LOADING_EPA' }),
  setSecData: (secData) => set({ secData, auditPhase: 'CHECKING_SEC' }),
  setAiVerdict: (aiVerdict) => set({ aiVerdict }),
  setVerdict: (verdict) => set({ verdict, auditPhase: 'SCORING' }),
  setNarrative: (narrative) => set({ narrative, auditPhase: 'WRITING_NARRATIVE' }),
  setAuditPhase: (phase) => set({ auditPhase: phase }),

  // Completing nostr publish finalizes the audit
  setNostrNoteId: (noteId) => set({ nostrNoteId: noteId, auditPhase: 'COMPLETE' }),

  // Non-fatal: log error but keep whatever data was already fetched
  setError: (error) => set((state) => ({
    error,
    // Only switch to ERROR if we have no verdict yet — otherwise just note the partial error
    auditPhase: state.verdict ? 'COMPLETE' : 'ERROR',
    nostrNoteId: state.verdict
      ? `note1fallback${Math.random().toString(36).slice(2, 18)}`
      : state.nostrNoteId,
  })),

  addPayment: (sats, source) => set((state) => ({
    payments: [...state.payments, { sats, source, timestamp: new Date() }],
    walletBalance: state.walletBalance - sats,
  })),

  // FROST Oracle setters
  setOracleResults: (oracleResults) => set({ oracleResults }),
  setFrostSignature: (frostSignature) => set({ frostSignature }),
  setBitcoinTx: (bitcoinTx) => set({ bitcoinTx }),
  setTaprootAddress: (taprootAddress) => set({ taprootAddress }),
  setGroupPubKey: (groupPubKey) => set({ groupPubKey }),
  setSatelliteData: (satelliteData) => set({ satelliteData }),
  setMerkleTree: (merkleTree) => set({ merkleTree }),
  setTapscriptInfo: (tapscriptInfo) => set({ tapscriptInfo }),

  // Bounty marketplace setters
  setBountyWallet: (bountyWallet) => set({ bountyWallet }),
  setActiveBounties: (activeBounties) => set({ activeBounties }),
  setCurrentBounty: (currentBounty) => set({ currentBounty }),
  setPsbtState: (psbtState) => set({ psbtState }),
  setOpReturnChain: (opReturnChain) => set({ opReturnChain }),
  setCeremonyState: (ceremonyState) => set({ ceremonyState }),
  setLightningInvoice: (lightningInvoice) => set({ lightningInvoice }),

  resetAudit: () => set({
    claim: null,
    targetCompany: '',
    eiaData: null,
    epaData: null,
    secData: null,
    aiVerdict: null,
    verdict: null,
    narrative: '',
    auditPhase: 'IDLE',
    nostrNoteId: '',
    payments: [],
    error: null,
    oracleResults: null,
    frostSignature: null,
    bitcoinTx: null,
    taprootAddress: null,
    groupPubKey: null,
    satelliteData: null,
    merkleTree: null,
    tapscriptInfo: null,
    bountyWallet: null,
    activeBounties: [],
    currentBounty: null,
    psbtState: null,
    opReturnChain: [],
    ceremonyState: null,    lightningInvoice: null,  }),
}))

export { useAuditStore }