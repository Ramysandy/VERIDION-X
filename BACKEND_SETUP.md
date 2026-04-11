# VERIDION-X Backend Setup & API Integration Guide

## 🚀 Backend Overview

The backend is a Node.js/Express server that orchestrates all API integrations:

- **EIA API** - Renewable energy capacity data
- **EPA API** - CO₂ emissions baseline
- **Groq API** - LLM-powered analysis
- **FireCrawl API** - Website scraping for claims
- **Nostr API** - Blockchain publishing
- **Lightning Network** - Bitcoin micropayments (optional)

---

## 📋 Quick Start

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

All backend packages are now included (express, cors, dotenv, axios, ws, etc.)

### 2. Set Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Then edit `.env` with your keys:
```
EIA_API_KEY=your_eia_api_key_here
EPA_API_KEY=your_epa_api_key_here
GROQ_API_KEY=your_groq_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
NUNCHUK_API_KEY=your_nunchuk_api_key_here
```

### 3. Start Backend Server

```bash
npm run server
```

Server starts on **http://localhost:3001**

Output:
```
╔═════════════════════════════════════════╗
║   VERIDION-X Backend Server Started 🚀  ║
╠═════════════════════════════════════════╣
║ Port:        3001                        ║
║ Environment: development                 ║
║ API URL:     http://localhost:3001      ║
╚═════════════════════════════════════════╝
```

### 4. Start Frontend & Backend Together (Terminal 1)

```bash
npm run dev:all
```

This runs:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3001 (Express server)

---

## 🔌 API Endpoints

### Health Check
```
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## 🌱 EIA API

### Get Renewable Capacity
```
POST /api/eia/renewable
Content-Type: application/json

{
  "state": "CA",
  "company": "Tesla"
}
```

Response:
```json
{
  "state": "CA",
  "company": "Tesla",
  "renewablePercentage": 45,
  "totalCapacity": 250000,
  "renewableCapacity": 112500,
  "dataSource": "EIA API",
  "confidence": 0.95,
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Get Facilities
```
POST /api/eia/facilities
{
  "state": "CA"
}
```

---

## 🌍 EPA API

### Get Emissions Baseline
```
POST /api/epa/emissions
{
  "state": "CA",
  "company": "Tesla"
}
```

Response:
```json
{
  "state": "CA",
  "company": "Tesla",
  "co2Intensity": 450,
  "unit": "lbs CO₂/MWh",
  "plantCount": 12,
  "dataSource": "EPA Power Plant API",
  "confidence": 0.92,
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Verify Claim
```
POST /api/epa/verify-claim
{
  "company": "Tesla",
  "claimedRenewable": 100,
  "state": "CA"
}
```

---

## 🤖 Groq API (LLM)

### Generate Analysis
```
POST /api/groq/analyze
{
  "company": "Tesla",
  "claim": "We use 100% renewable energy",
  "eiaData": {
    "renewablePercentage": 45,
    "totalCapacity": 250000
  },
  "epaData": {
    "co2Intensity": 450
  }
}
```

Response:
```json
{
  "company": "Tesla",
  "narrative": "Tesla's claim of 100% renewable energy contradicts federal data...",
  "model": "mixtral-8x7b-32768",
  "dataSource": "Groq API",
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Extract Claim
```
POST /api/groq/extract-claim
{
  "company": "Tesla",
  "companyText": "We are committed to 100% renewable energy by 2030..."
}
```

---

## 🕷️ FireCrawl API (Web Scraping)

### Scrape Claims
```
POST /api/firecrawl/scrape
{
  "company": "Tesla",
  "url": "https://tesla.com/esg"
}
```

Response:
```json
{
  "company": "Tesla",
  "url": "https://tesla.com/esg",
  "esgClaims": [
    "Tesla is committed to 100% renewable energy",
    "We support sustainable practices"
  ],
  "claimCount": 2,
  "dataSource": "FireCrawl API",
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

---

## 📡 Nostr API (Blockchain)

### Publish Verdict
```
POST /api/nostr/publish
{
  "company": "Tesla",
  "verdict": {
    "winner": false,
    "confidence": 92,
    "contradictions": 1
  },
  "narrative": "Analysis text here...",
  "totalCost": 250
}
```

Response:
```json
{
  "success": true,
  "company": "Tesla",
  "noteId": "note1abc123def456...",
  "relays": ["wss://relay.damus.io", "wss://nos.lol"],
  "published": true,
  "nostrLink": "https://snort.social/n/note1abc123...",
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Verify Note
```
GET /api/nostr/verify/note1abc123def456
```

---

## 🔄 Audit Orchestration

### Start Complete Audit
```
POST /api/audit/start
{
  "company": "Tesla",
  "claim": "We use 100% renewable energy",
  "state": "CA"
}
```

This runs all steps:
1. ✅ Fetch EIA renewable data
2. ✅ Fetch EPA emissions
3. ✅ Compare claim vs data
4. ✅ Generate LLM analysis
5. ✅ Publish to Nostr

Response:
```json
{
  "auditId": "audit_1712873400000_abc123",
  "status": "complete",
  "company": "Tesla",
  "totalCost": 250,
  "steps": {
    "eiaData": { ... },
    "epaData": { ... },
    "verdict": { ... },
    "narrative": "...",
    "nostrNoteId": "note1abc..."
  },
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Simulate Audit (for testing)
```
POST /api/audit/simulate
{
  "company": "Tesla",
  "claim": "We use 100% renewable energy"
}
```

---

## 🧪 Testing with cURL

### Test Health
```bash
curl http://localhost:3001/health
```

### Test EIA API
```bash
curl -X POST http://localhost:3001/api/eia/renewable \
  -H "Content-Type: application/json" \
  -d '{"state":"CA","company":"Tesla"}'
```

### Test Complete Audit
```bash
curl -X POST http://localhost:3001/api/audit/simulate \
  -H "Content-Type: application/json" \
  -d '{"company":"Tesla","claim":"We use 100% renewable energy"}'
```

---

## 🔗 Frontend Integration

The frontend now calls the backend API instead of using mocked data.

### Using API Client

```javascript
import { auditAPI, eiaAPI, epaAPI, groqAPI } from '@/api/client'

// Start audit
const result = await auditAPI.startAudit('Tesla', 'We use green energy')

// Or individual APIs
const eiaData = await eiaAPI.getRenewableCapacity('CA', 'Tesla')
const epaData = await epaAPI.getEmissions('CA', 'Tesla')
```

---

## 📁 Server File Structure

```
server/
├── index.js              (Main Express server)
├── routes/
│   ├── eia.js           (Renewable energy data)
│   ├── epa.js           (Emissions baseline)
│   ├── groq.js          (LLM analysis)
│   ├── firecrawl.js     (Web scraping)
│   ├── nostr.js         (Blockchain publishing)
│   └── audit.js         (Audit orchestration)
└── .env                 (API keys & config)
```

---

## 🚨 Troubleshooting

### Server Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process on port 3001
kill -9 <PID>

# Try again
npm run server
```

### API Keys Missing
```bash
# Make sure .env file exists with all keys
cat .env
```

### CORS Errors
- Frontend running on `http://localhost:5173`
- Backend running on `http://localhost:3001`
- CORS is enabled in server/index.js

Update `.env`:
```
VITE_API_URL=http://localhost:3001
```

### API Timeouts
- Increase timeout in `src/api/client.js`
- Check internet connection
- Verify API keys are valid

---

## 📊 Cost Breakdown (Micropayments)

Each audit charges:
- EIA data: 100 sats
- EPA data: 100 sats
- Groq analysis: 50 sats
- **Total: 250 sats per audit**

Costs are tracked in `auditStore.js` → `payments[]`

---

## 🔐 Security Considerations

⚠️ **IMPORTANT**: Never commit `.env` file to GitHub
- `.env` is in `.gitignore`
- Use `.env.example` as template
- Never share API keys

---

## 📈 Production Deployment

For production, you'll want:
1. ✅ Database (MongoDB/PostgreSQL)
2. ✅ Authentication (JWT/OAuth)
3. ✅ Rate limiting
4. ✅ Error logging (Sentry/DataDog)
5. ✅ Payment processing (real Lightning)
6. ✅ Nostr publishing (real event signing)

---

**Version: 1.0.0 | Status: Ready for Development ✅**

For questions or issues, check `README.md` and `QUICK_START.md`.
