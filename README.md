# ⚡ VERIDION-X — ESG Greenwashing Bounty Marketplace

> **We built a bounty marketplace where investigators earn Bitcoin Lightning payments for finding ESG fraud.**
> Lightning is essential because it enables instant, trustless gig payments with no intermediary. No Stripe. No bank. Just code and Bitcoin.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Bitcoin Lightning](https://img.shields.io/badge/Bitcoin-Lightning-F7931A?logo=bitcoin&logoColor=black)](https://lightning.network)
[![LNbits](https://img.shields.io/badge/LNbits-BOLT11-FBBF24)](https://lnbits.com)
[![Groq AI](https://img.shields.io/badge/Groq_AI-llama--3.3--70b-F54D27)](https://groq.com)
[![FROST](https://img.shields.io/badge/Bitcoin-FROST_Schnorr-A78BFA)](https://eprint.iacr.org/2020/852)
[![Nostr](https://img.shields.io/badge/Nostr-Censorship--Resistant-8B5CF6)](https://nostr.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 The Problem

Every year, corporations spend billions on ESG (Environmental, Social, Governance) marketing while quietly polluting, drilling, and lying about their actual environmental footprint. The global ESG investment market is worth **$3.5 trillion** — and nearly all of it is **self-reported, unverified, and unchecked**.

Nobody is paying whistleblowers to catch this fraud. Until now.

---

## 💡 The Solution — One Sentence

**VERIDION-X is a bounty marketplace where independent investigators earn Bitcoin Lightning payments for auditing companies against real US government data.**

### Why Bitcoin Lightning is Essential

| Without Lightning | With Lightning |
|---|---|
| Need Stripe or a bank account | Need nothing but a Bitcoin wallet |
| Days to settle international payments | Settles in under 1 second |
| KYC required for payout | No KYC, no borders |
| Intermediary can block payment | Trustless, unstoppable |
| Centralised — not decentralized | Bitcoin IS the payment rails |

> Without Bitcoin Lightning, this is just a dashboard. *With* Lightning, it's a decentralized gig economy for truth.

---

## 🔄 The Core Flow

```
1. CREATE BOUNTY  →  Someone posts a company + reward (e.g. "Audit ExxonMobil for 1000 sats")
        │
        ▼
2. CLAIM & AUDIT  →  Investigator claims bounty, triggers FROST oracle network
        │
        ▼
3. ORACLE RUNS   →  3 independent nodes cross-reference EIA + EPA + SEC + NASA + Groq AI
        │
        ▼
4. FROST SIGN    →  2-of-3 threshold Schnorr signature seals the verdict (BIP-340)
        │
        ▼
5. VERDICT       →  Greenwashing detected / Clean — published to Nostr (censorship-resistant)
        │
        ▼
6. ⚡ GET PAID    →  Real Bitcoin Lightning invoice auto-generated via LNbits
                     Any wallet pays the investigator instantly. Zero intermediary.
```

---

## ⚡ Bitcoin Lightning Integration

The centrepiece of VERIDION-X is **real Lightning payment infrastructure**:

- When an audit completes, the backend calls the **LNbits API** to generate a real **BOLT11 invoice**
- The invoice is displayed on the Results page — investigators copy it into any Lightning wallet
- Settlement happens in **under 1 second**, globally, with no KYC and no bank
- Powered by [demo.lnbits.com](https://demo.lnbits.com) — free, real Bitcoin testnet infrastructure

### What a BOLT11 invoice looks like:
```
lnbc10u1p5a4hkwpp5sk7a6ydjnd40klygavwnz86thd3kjxf35h2wdm4zqm...
```
This is a real payment request. Any Lightning wallet (Phoenix, Breez, BlueWallet) can scan and pay it.

### Live endpoint:
```bash
POST /api/lightning/create-invoice
{ "company": "ExxonMobil", "amount": 1000 }
# → returns real BOLT11 paymentRequest from LNbits
```

---

## 🔐 Bitcoin Cryptography Layer

### FROST Threshold Signatures (2-of-3)
3 oracle nodes each hold a **share** of the signing key (Shamir's Secret Sharing). Any 2 must agree to produce a valid Schnorr signature — no single node controls the result.

| Concept | Plain English |
|---|---|
| FROST | Multi-party signing protocol — no single point of trust |
| 2-of-3 threshold | Like a 2-of-3 multisig — any 2 nodes can sign |
| Schnorr / BIP-340 | Bitcoin's modern signature scheme — smaller, aggregatable |
| R & s values | The two parts of every Schnorr signature (nonce point + scalar) |
| Group Key | The shared public key all 3 nodes created together |

### Bitcoin Taproot Proof (BIP-341)
- The audit verdict is embedded in a **Taproot transaction** on Bitcoin testnet
- An **OP_RETURN** output permanently stores the verdict text on-chain
- The transaction ID links to [mempool.space](https://mempool.space/testnet) for independent verification

### Nostr — Censorship-Resistant Publishing
The verdict is cryptographically signed and published to 3 Nostr relays (`relay.damus.io`, `nos.lol`, `relay.nostr.band`). **No company can take it down.**

---

## 🛰️ Data Sources — Real Government Data, Not Self-Reports

| Source | What it checks | Why it matters |
|---|---|---|
| **EIA** (Energy Info Admin) | Actual grid renewable % by state | Company claims 100% renewable; real grid is 45% |
| **EPA eGRID** | CO₂ emissions intensity by state/sector | Cross-checks carbon neutrality claims |
| **SEC EDGAR** | 10-K, 10-Q ESG disclosure filings | Official statements the company filed with regulators |
| **NASA POWER** | Satellite solar + wind irradiance data | Independent verification of renewable potential |
| **Groq AI** | llama-3.3-70b structured verdict | Finds contradictions across all data sources |

---

## ✨ Full Feature List

### ⚡ Lightning Bounty Marketplace
- Create investigation bounties for any company
- Claim bounties and trigger audits
- **Real Bitcoin Lightning invoice** generated on audit completion
- Any Lightning wallet can pay the investigator instantly

### 🔐 FROST Oracle Network
- 3 independent FROST oracle nodes run in parallel
- Each node independently queries EIA, EPA, SEC EDGAR, NASA POWER
- 2-of-3 threshold — majority verdict stands
- Animated real-time progress: CONNECTING → RUNNING → CONSENSUS → SIGNING → COMPLETE

### 📊 ESG Verdict & Visualisations
- AI verdict: `GREENWASHING DETECTED` / `VERIFIED CLEAN`
- Risk Score (0–100) with animated SVG gauge
- Bar chart: Claimed renewable % vs actual EIA grid data
- Radial confidence meter
- Key findings list (specific contradictions found)

### 🛰️ NASA Satellite Data Panel
- Real NASA POWER API data for the company's operating region
- Solar irradiance (kWh/m²/day), wind speed at 50m, ratings

### 📝 SEC EDGAR Filing Deep-Dive
- Pulls actual 10-K ESG disclosure text
- Flags disclosure risk level
- Links to the real filing on SEC.gov

### 🔗 Nostr Immutable Proof
- Verdict published to 3 censorship-resistant relays
- Cryptographically signed — cannot be altered or deleted
- Shareable Note ID links to the permanent record

### 🏆 Hall of Shame Leaderboard
- All audited companies ranked by fraud risk score
- Filter by verdict, risk level, date
- Persisted locally — every entry links to its Nostr proof

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Chakra UI 2.8 |
| **Animations** | Framer Motion 10, custom aurora CSS |
| **State** | Zustand |
| **Charts** | Recharts (BarChart, RadialBarChart) |
| **Routing** | React Router v6 |
| **Backend** | Node.js + Express (ESM) |
| **⚡ Lightning** | LNbits API — BOLT11 invoice generation |
| **Bitcoin Crypto** | FROST Schnorr, Taproot BIP-341, OP_RETURN, BIP-340 |
| **AI** | Groq Cloud `llama-3.3-70b-versatile` |
| **Web Scraping** | FireCrawl API |
| **Energy Data** | US EIA API |
| **Emissions Data** | US EPA eGRID API |
| **Satellite Data** | NASA POWER API |
| **SEC Filings** | SEC EDGAR full-text search + submissions API |
| **Decentralised Proof** | Nostr protocol (nostr-tools) |

---

## 🏗️ Architecture

```
User types company name
        │
        ▼
 ┌──────────────────────────────────────────────────────┐
 │              FROST Oracle Network (3 nodes)          │
 │                                                      │
 │  Node 1 ──┐                                          │
 │  Node 2 ──┼── each queries EIA + EPA + SEC + NASA    │
 │  Node 3 ──┘                                          │
 │                                                      │
 │  2-of-3 vote → FROST Schnorr signature (BIP-340)    │
 └────────────────────────┬─────────────────────────────┘
                          │ signed verdict
                          ▼
             ┌────────────────────────┐
             │   Groq AI Verdict      │  llama-3.3-70b
             │   riskScore, reasons   │
             └────────────┬───────────┘
                          │
            ┌─────────────┼──────────────┐
            ▼             ▼              ▼
   ┌──────────────┐ ┌──────────┐ ┌─────────────────┐
   │ Bitcoin      │ │  Nostr   │ │  ⚡ Lightning    │
   │ Taproot TX   │ │  3 relays│ │  LNbits Invoice  │
   │ OP_RETURN    │ │  proof   │ │  BOLT11 payout   │
   └──────────────┘ └──────────┘ └─────────────────┘
                                          │
                                          ▼
                              Investigator's Lightning wallet
                              receives payment in < 1 second
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Free API keys (see below)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/veridion-x.git
cd veridion-x
npm install
```

### 2. Configure Environment

Copy `.env` and fill in your keys:

```env
# AI
GROQ_API_KEY=your_groq_api_key

# Web Scraping
FIRECRAWL_API_KEY=your_firecrawl_api_key

# US Federal Energy Data
EIA_API_KEY=your_eia_api_key

# Nostr
NOSTR_PRIVATE_KEY=your_nostr_nsec_key
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band

# ⚡ Lightning (LNbits — free at demo.lnbits.com)
LNBITS_URL=https://demo.lnbits.com
LNBITS_WALLET_KEY=your_invoice_api_key
LNBITS_WALLET_ID=your_wallet_id
LIGHTNING_NETWORK=testnet
```

> **All free:**
> - Groq → [console.groq.com](https://console.groq.com)
> - FireCrawl → [firecrawl.dev](https://firecrawl.dev)
> - EIA → [eia.gov/opendata](https://www.eia.gov/opendata/)
> - LNbits → [demo.lnbits.com](https://demo.lnbits.com) — click "Create wallet", then "API keys"

### 3. Run

```bash
# Terminal 1 — Backend
node server/index.js

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Demo Flow

1. **Landing page** → type `ExxonMobil` → click **Deploy Oracle Nodes**
2. Watch 3 oracle nodes run live (EIA, EPA, SEC, NASA, Groq AI)
3. See the **ESG verdict** with risk score and contradictions
4. See the **⚡ Lightning invoice** auto-generated — copy it into any Lightning wallet
5. Share the **Nostr proof** — permanently published, cannot be deleted

---

## 📁 Project Structure

```
veridion-x/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx         # Hero, Lightning showcase section
│   │   ├── AuditFlowPage.jsx       # FROST oracle stream, real-time nodes
│   │   ├── ResultsPage.jsx         # Verdict + ⚡ Lightning invoice card
│   │   ├── BountyMarketplace.jsx   # Create/claim investigation bounties
│   │   └── LeaderboardPage.jsx     # Hall of Shame rankings
│   ├── components/
│   │   ├── Navigation.jsx          # Glass-morphism nav
│   │   └── OracleTerminal.jsx      # Live node log terminal
│   ├── store/
│   │   └── auditStore.js           # Zustand — includes lightningInvoice state
│   └── api/
│       └── client.js               # Axios API client
│
└── server/
    ├── index.js                    # Express server
    └── routes/
        ├── lightning.js            # ⚡ LNbits BOLT11 invoice generation
        ├── oracle.js               # FROST oracle SSE stream
        ├── groq.js                 # Groq AI verdict
        ├── eia.js                  # EIA energy grid data
        ├── epa.js                  # EPA eGRID emissions data
        ├── satellite.js            # NASA POWER satellite data
        ├── sec.js                  # SEC EDGAR filings
        ├── nostr.js                # Nostr proof publishing
        ├── bounty.js               # Bounty marketplace
        └── firecrawl.js            # Website claim scraping
```

---

## 🔌 API Reference

### ⚡ Lightning
```
POST /api/lightning/create-invoice
  Body: { company, amount (sats), bountyId? }
  Returns: { paymentRequest (BOLT11), paymentHash, amount, memo }

GET  /api/lightning/invoice/:paymentHash
  Returns: { paid, status, amount }
```

### Oracle
```
GET  /api/oracle/stream?company=ExxonMobil    (SSE stream)
  Events: init, node-log, consensus, nonce, signature, transaction, merkle, tapscript, complete, error
```

### Data
```
POST /api/eia/renewable        { state, company }
POST /api/epa/verify-claim     { company, claimedRenewable }
POST /api/sec/filings          { company }
POST /api/satellite/power      { lat, lon, company }
POST /api/groq/analyze         { company, eiaData, epaData, secData }
```

---

## About us

> *"ESG fraud is a $3.5 trillion problem. Billions are wasted on fake green credentials every year. We built a bounty marketplace where investigators earn Bitcoin Lightning payments for auditing companies against real government data — EIA, EPA, SEC, NASA. If they find contradictions, it's flagged as greenwashing.*
>
> *Lightning is essential because it's the only way to do trustless, instant gig payments at scale. Without it, you need Stripe, a bank account, and a compliance team. With Lightning: one invoice, one second, zero intermediary.*
>
> *This is what Bitcoin is for."*

---

## 📜 License

MIT — use freely, attribute kindly.

---

*Built at MIT Bitcoin Hackathon · Exposing corporate greenwashing, one ⚡ bounty at a time.*
