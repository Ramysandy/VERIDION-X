# ⚡ VERIDION-X — Autonomous ESG Greenwashing Court

> *The world's first decentralized, on-chain ESG fraud detection system powered by real US federal data, AI verdicts, and Nostr cryptographic proofs.*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.8-319795?logo=chakraui)](https://chakra-ui.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10-0055FF?logo=framer)](https://www.framer.com/motion)
[![Groq AI](https://img.shields.io/badge/Groq_AI-llama--3.3--70b-F54D27)](https://groq.com)
[![Nostr](https://img.shields.io/badge/Nostr-Decentralized-8B5CF6)](https://nostr.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 What Is VERIDION-X?

Every year, corporations spend billions on ESG (Environmental, Social, Governance) marketing while quietly polluting, drilling, and lying about their actual environmental footprint. The global ESG investment market is worth **$3.5 trillion** — and nearly all of it is self-reported.

**VERIDION-X is an autonomous ESG fraud court.** You type a company name. VERIDION-X:

1. Extracts the company's public ESG claims from their website
2. Cross-references them against **3 federal US databases** (EIA, EPA, SEC EDGAR)
3. Runs a structured AI verdict via **Groq llama-3.3-70b**
4. Publishes the immutable result to **Nostr** — the censorship-resistant decentralized network
5. Adds the offenders to a permanent **Hall of Shame** leaderboard

No self-reporting. No greenwashing. Just math and federal data.

---

## ✨ Features

### 🔍 7-Step Autonomous Audit Pipeline
Real-time 7-stage pipeline with animated progress tracking:
| Step | What Happens |
|------|-------------|
| 1. Scrape | FireCrawl extracts ESG claims from the company's live website |
| 2. AI Parse | Groq extracts structured claim data (renewable %, location, year) |
| 3. EIA Check | Cross-references against US Energy Information Administration grid data |
| 4. EPA Check | Compares CO₂ emissions against EPA national benchmarks |
| 5. SEC EDGAR | Searches corporate filings for ESG disclosure statements and risk flags |
| 6. AI Verdict | Groq llama-3.3-70b produces a structured greenwashing verdict with risk score |
| 7. Nostr Proof | Cryptographically signs and publishes the verdict to Nostr relays |

### 🤖 Groq AI Structured Verdict
- **AI Verdict text** (e.g. "HIGH CONFIDENCE GREENWASHING DETECTED")
- **Risk Score** (0–100)
- **Risk Level** (CRITICAL / HIGH / MEDIUM / LOW)
- **Contradictions count**
- **Confidence percentage**
- **Key findings** (bullet list of specific discrepancies)

### 📊 Live Data Visualizations
- **Bar charts** — Claimed vs actual renewable % (EIA comparison)
- **CO₂ benchmark bars** — Company emissions vs US average vs clean grid
- **Radial confidence meter** — AI certainty score

### 🏛️ Hall of Shame Leaderboard
- Ranks all audited companies by risk score (highest = most fraudulent)
- Shows verdict badges, risk levels, confidence, and Nostr proof links
- Stats dashboard: total audits, greenwashers caught, avg risk, critical alerts
- Persisted in localStorage; every entry links to its Nostr proof

### 🔗 Nostr Immutable Proof
Every verdict is cryptographically signed and broadcast to:
- `relay.damus.io`
- `nos.lol`
- `relay.nostr.band`

These proofs **cannot be edited or deleted** — creating a permanent public record of corporate ESG fraud.

### 💎 Premium Aceternity UI
- Dark aurora backgrounds with floating orbs and dot-grid overlays
- Glassmorphism cards with `backdrop-filter: blur(24px)`  
- Framer Motion entrance animations (fade-up, stagger, whileInView)
- Animated gradient progress bars
- TypeWriter hero with cycling taglines
- Shimmer buttons and neon glow effects
- Gradient text headings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Chakra UI 2.8 |
| **Animations** | Framer Motion 10, custom Aceternity-style CSS |
| **State** | Zustand (auditStore) |
| **Charts** | Recharts (BarChart, RadialBarChart) |
| **Routing** | React Router v6 |
| **Backend** | Node.js + Express |
| **AI** | Groq Cloud (`llama-3.3-70b-versatile`) |
| **Web Scraping** | FireCrawl API |
| **Energy Data** | US EIA (Energy Information Administration) API |
| **Emissions Data** | US EPA (Environmental Protection Agency) eGRID API |
| **SEC Filings** | SEC EDGAR full-text search + submissions API |
| **Decentralized Proof** | Nostr protocol (nostr-tools) |

---

## 🏗️ Architecture

```
User Input (company name)
        │
        ▼
 ┌─────────────────┐
 │  FireCrawl API  │  ← Scrapes live website for ESG claims
 └────────┬────────┘
          │ raw claim text
          ▼
 ┌─────────────────┐
 │   Groq AI       │  ← Parses structured claim (renewable%, location, year)
 └────────┬────────┘
          │ {claim, claimedRenewable, location}
          ▼
 ┌─────────────────────────────────────────────────────┐
 │              Parallel Federal Verification           │
 │  ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
 │  │   EIA   │    │   EPA   │    │   SEC EDGAR     │  │
 │  │ Grid %  │    │ CO₂/MWh │    │ 10-K ESG filings│  │
 │  └─────────┘    └─────────┘    └─────────────────┘  │
 └────────────────────────┬────────────────────────────┘
                          │ federal data
                          ▼
                 ┌─────────────────┐
                 │   Groq AI       │  ← Structured verdict
                 │ llama-3.3-70b   │     (riskScore, riskLevel,
                 └────────┬────────┘      aiVerdict, reasons)
                          │
                          ▼
                 ┌─────────────────┐
                 │  Nostr Protocol │  ← Cryptographic proof
                 │  3 relays       │     (immutable, censorship-resistant)
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Hall of Shame   │  ← On-chain leaderboard
                 │ Leaderboard     │
                 └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- API keys for: Groq, FireCrawl, EIA

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/veridion-x.git
cd veridion-x
npm install
```

### 2. Configure Environment

Create `server/.env`:

```env
# AI
GROQ_API_KEY=your_groq_api_key

# Web Scraping
FIRECRAWL_API_KEY=your_firecrawl_api_key

# US Federal Energy Data
EIA_API_KEY=your_eia_api_key

# Nostr (optional — generates ephemeral key if not set)
NOSTR_PRIVATE_KEY=your_nostr_nsec_key
```

> **Get free API keys:**
> - Groq: [console.groq.com](https://console.groq.com) — free tier, fast inference
> - FireCrawl: [firecrawl.dev](https://firecrawl.dev) — free tier available
> - EIA: [eia.gov/opendata](https://www.eia.gov/opendata/) — completely free

### 3. Run

```bash
# Terminal 1 — Backend
cd server && node index.js

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Run an Audit

1. Type a company name (e.g. `ExxonMobil`, `Amazon`, `Shell`)
2. Watch the 7-step pipeline in real-time
3. View the AI verdict, data charts, and SEC filings
4. Save to the Hall of Shame
5. Share the immutable Nostr proof

---

## 📁 Project Structure

```
veridion-x/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx       # Dark aurora hero, TypeWriter, search
│   │   ├── AuditFlowPage.jsx     # Live 7-step pipeline with charts
│   │   ├── ResultsPage.jsx       # Full verdict, AI analysis, Nostr proof
│   │   └── LeaderboardPage.jsx   # Hall of Shame rankings
│   ├── components/
│   │   └── Navigation.jsx        # Glass-morphism nav with live indicator
│   ├── store/
│   │   └── auditStore.js         # Zustand global state
│   ├── api/
│   │   └── client.js             # Axios API client
│   ├── styles/
│   │   └── premium.css           # Aceternity-style design system
│   ├── theme.js                  # Chakra UI dark theme extensions
│   └── main.jsx
│
└── server/
    ├── index.js                  # Express server
    └── routes/
        ├── firecrawl.js          # Website scraping
        ├── groq.js               # AI claim parsing + verdict
        ├── eia.js                # EIA energy grid API
        ├── epa.js                # EPA emissions data
        ├── audit.js              # Orchestrated pipeline
        └── nostr.js              # Nostr proof publishing
```

---

## 🌐 Live Demo

> Coming soon — deploying to Vercel + Railway

---

## 🤝 Contributing

This project was built for a hackathon. PRs welcome for:
- Additional data sources (CDPQ, Bloomberg ESG, CDP database)
- More company coverage and fallback data
- Mobile-optimized layout
- Wallet integration for Lightning payments

---

## 📜 License

MIT — use freely, attribute kindly.

---

*Built with ⚡ at [MIT Hackathon] — exposing corporate greenwashing one company at a time.*
