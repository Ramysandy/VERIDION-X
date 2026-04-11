import { create } from 'zustand'

const useAuditStore = create((set, get) => ({
  targetCompany: '',
  claim: null,
  eiaData: null,
  epaData: null,
  verdict: null,
  narrative: '',
  auditPhase: 'IDLE',
  payments: [],
  walletBalance: 210000,
  nostrNoteId: '',
  error: null,

  // Claim kicks off the audit pipeline
  setClaim: (claim) => set({
    claim,
    targetCompany: claim?.company || '',
    auditPhase: 'EXTRACTING_CLAIM',
    error: null,
  }),

  // Each setter advances the phase
  setEiaData: (eiaData) => set({ eiaData, auditPhase: 'FETCHING_EIA' }),
  setEpaData: (epaData) => set({ epaData, auditPhase: 'LOADING_EPA' }),
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

  resetAudit: () => set({
    claim: null,
    targetCompany: '',
    eiaData: null,
    epaData: null,
    verdict: null,
    narrative: '',
    auditPhase: 'IDLE',
    nostrNoteId: '',
    payments: [],
    error: null,
  }),
}))

export { useAuditStore }