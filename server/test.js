#!/usr/bin/env node

/**
 * VERIDION-X Backend Testing Script
 * Tests all API integrations to ensure backend is properly configured
 */

import axios from 'axios'
import chalk from 'chalk'

const API_URL = 'http://localhost:3001'
let testsPassed = 0
let testsFailed = 0

const tests = []

async function test(name, fn) {
  try {
    process.stdout.write(`Testing ${name}... `)
    await fn()
    console.log(chalk.green('✓ PASS'))
    testsPassed++
  } catch (error) {
    console.log(chalk.red('✗ FAIL'))
    console.log(chalk.red(`  Error: ${error.message}`))
    testsFailed++
  }
}

async function runTests() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('║  VERIDION-X Backend Test Suite 🧪    ║'))
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'))

  // Test 1: Health Check
  await test('Health Check', async () => {
    const response = await axios.get(`${API_URL}/health`)
    if (response.data.status !== 'ok') throw new Error('Health check failed')
  })

  // Test 2: EIA API
  await test('EIA API - Get Renewable Capacity', async () => {
    const response = await axios.post(`${API_URL}/api/eia/renewable`, {
      state: 'CA',
      company: 'Tesla'
    })
    if (!response.data.renewablePercentage) throw new Error('No renewable data')
  })

  // Test 3: EPA API
  await test('EPA API - Get Emissions', async () => {
    const response = await axios.post(`${API_URL}/api/epa/emissions`, {
      state: 'CA',
      company: 'Tesla'
    })
    if (!response.data.co2Intensity) throw new Error('No emissions data')
  })

  // Test 4: Groq API
  await test('Groq API - Analyze Claim', async () => {
    const response = await axios.post(`${API_URL}/api/groq/analyze`, {
      company: 'Tesla',
      claim: 'We use 100% renewable energy',
      eiaData: { renewablePercentage: 45 },
      epaData: { co2Intensity: 450 }
    })
    if (!response.data.narrative) throw new Error('No narrative generated')
  })

  // Test 5: FireCrawl API
  await test('FireCrawl API - Scrape Claims', async () => {
    const response = await axios.post(`${API_URL}/api/firecrawl/scrape`, {
      company: 'Tesla',
      url: 'https://tesla.com'
    })
    if (!response.data.esgClaims) throw new Error('No claims extracted')
  })

  // Test 6: Nostr API
  await test('Nostr API - Publish Verdict', async () => {
    const response = await axios.post(`${API_URL}/api/nostr/publish`, {
      company: 'Tesla',
      verdict: { winner: false, confidence: 92 },
      narrative: 'Test narrative',
      totalCost: 250
    })
    if (!response.data.noteId) throw new Error('No Nostr note ID')
  })

  // Test 7: Audit Simulation
  await test('Audit API - Simulate Audit', async () => {
    const response = await axios.post(`${API_URL}/api/audit/simulate`, {
      company: 'Tesla',
      claim: 'We use 100% renewable energy'
    })
    if (response.data.status !== 'simulated') throw new Error('Audit simulation failed')
  })

  // Test 8: Audit Orchestration (Full Flow)
  await test('Audit API - Start Full Audit', async () => {
    const response = await axios.post(`${API_URL}/api/audit/start`, {
      company: 'Apple',
      claim: 'We use renewable energy',
      state: 'CA'
    })
    if (response.data.status !== 'complete') throw new Error('Audit start failed')
  })

  // Results Summary
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('║           Test Results 📊              ║'))
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'))

  console.log(chalk.green(`✓ Passed: ${testsPassed}`))
  console.log(chalk.red(`✗ Failed: ${testsFailed}`))
  console.log(chalk.bold(`\nTotal Tests: ${testsPassed + testsFailed}\n`))

  if (testsFailed === 0) {
    console.log(chalk.bgGreen.black(' All tests passed! Backend is ready. '))
  } else {
    console.log(chalk.bgRed.white(' Some tests failed. Check configuration. '))
  }

  console.log('\n')
}

// Run tests
try {
  await runTests()
  process.exit(testsFailed === 0 ? 0 : 1)
} catch (error) {
  console.error(chalk.red('Test suite error:', error.message))
  process.exit(1)
}
