import 'dotenv/config'
import express from 'express'
import cors from 'cors'

// Import routes
import eiaRoutes from './routes/eia.js'
import epaRoutes from './routes/epa.js'
import groqRoutes from './routes/groq.js'
import firecrawlRoutes from './routes/firecrawl.js'
import nostrRoutes from './routes/nostr.js'
import auditRoutes from './routes/audit.js'
import secRoutes from './routes/sec.js'
import oracleRoutes from './routes/oracle.js'

// Load environment variables
const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/eia', eiaRoutes)
app.use('/api/epa', epaRoutes)
app.use('/api/groq', groqRoutes)
app.use('/api/firecrawl', firecrawlRoutes)
app.use('/api/nostr', nostrRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/sec', secRoutes)
app.use('/api/oracle', oracleRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500,
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════╗
║   VERIDION-X Backend Server Started 🚀  ║
╠═════════════════════════════════════════╣
║ Port:        ${PORT}                        ║
║ Environment: ${process.env.NODE_ENV || 'development'}        ║
║ API URL:     http://localhost:${PORT}  ║
╚═════════════════════════════════════════╝
  `)
  console.log('Available endpoints:')
  console.log('  GET  /health')
  console.log('  POST /api/audit/start            - Start audit')
  console.log('  POST /api/eia/renewable/:state   - Get renewable capacity')
  console.log('  POST /api/epa/emissions/:state   - Get CO₂ baseline')
  console.log('  POST /api/groq/analyze           - Generate analysis')
  console.log('  POST /api/firecrawl/scrape       - Scrape claims')
  console.log('  POST /api/nostr/publish          - Publish proof')
  console.log('  GET  /api/oracle/stream          - FROST oracle SSE')
  console.log('  GET  /api/oracle/info            - Oracle status')
})

export default app
