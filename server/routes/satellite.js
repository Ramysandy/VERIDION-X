/**
 * NASA POWER Satellite Route — Solar Irradiance & Wind Speed Data
 * 
 * Uses NASA POWER (Prediction of Worldwide Energy Resources) API
 * Completely free, no API key required
 * 
 * Returns solar irradiance (kWh/m²/day) and wind speed (m/s)
 * at a company's HQ coordinates — used to validate renewable energy claims
 */

import { Router } from 'express'
import axios from 'axios'

const router = Router()

// Company HQ coordinates (lat, lon)
const COMPANY_COORDS = {
  exxonmobil:   { lat: 29.76, lon: -95.37, city: 'Houston, TX' },
  shell:        { lat: 29.76, lon: -95.37, city: 'Houston, TX' },
  chevron:      { lat: 37.76, lon: -122.25, city: 'San Ramon, CA' },
  bp:           { lat: 51.51, lon: -0.13, city: 'London, UK' },
  totalenergies:{ lat: 48.77, lon: 2.30, city: 'Courbevoie, France' },
  amazon:       { lat: 47.62, lon: -122.34, city: 'Seattle, WA' },
  microsoft:    { lat: 47.64, lon: -122.13, city: 'Redmond, WA' },
  google:       { lat: 37.42, lon: -122.08, city: 'Mountain View, CA' },
  apple:        { lat: 37.33, lon: -122.01, city: 'Cupertino, CA' },
  meta:         { lat: 37.48, lon: -122.15, city: 'Menlo Park, CA' },
  tesla:        { lat: 30.22, lon: -97.77, city: 'Austin, TX' },
  walmart:      { lat: 36.37, lon: -94.21, city: 'Bentonville, AR' },
  jpmorgan:     { lat: 40.76, lon: -73.98, city: 'New York, NY' },
  nestle:       { lat: 46.46, lon: 6.84, city: 'Vevey, Switzerland' },
  toyota:       { lat: 35.08, lon: 137.15, city: 'Toyota City, Japan' },
  samsung:      { lat: 37.24, lon: 127.00, city: 'Suwon, South Korea' },
  default:      { lat: 38.90, lon: -77.04, city: 'Washington, DC' },
}

function getCoordinates(company) {
  const key = company.toLowerCase().replace(/[^a-z]/g, '')
  for (const [name, coords] of Object.entries(COMPANY_COORDS)) {
    if (name === 'default') continue
    if (key.includes(name) || name.includes(key)) return coords
  }
  return COMPANY_COORDS.default
}

// POST /api/satellite/power
router.post('/power', async (req, res) => {
  const { company, lat, lon } = req.body
  if (!company && !lat) {
    return res.status(400).json({ error: 'Missing company name or coordinates' })
  }

  const coords = (lat && lon) ? { lat, lon, city: 'Custom' } : getCoordinates(company)

  try {
    // NASA POWER API — monthly climatology for renewable energy
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?` +
      `parameters=ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,WS10M,WS50M,T2M&` +
      `community=RE&longitude=${coords.lon}&latitude=${coords.lat}&format=json`

    const response = await axios.get(url, { timeout: 15000 })
    const params = response.data?.properties?.parameter || {}

    // Extract annual averages
    const solarAll = params.ALLSKY_SFC_SW_DWN?.ANN ?? null   // kWh/m²/day (all sky)
    const solarClr = params.CLRSKY_SFC_SW_DWN?.ANN ?? null   // kWh/m²/day (clear sky)
    const wind10m  = params.WS10M?.ANN ?? null                 // m/s at 10m
    const wind50m  = params.WS50M?.ANN ?? null                 // m/s at 50m
    const temp     = params.T2M?.ANN ?? null                   // °C at 2m

    // Monthly breakdown for solar
    const monthlyNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    const monthlySolar = monthlyNames.map(m => ({
      month: m,
      solar: params.ALLSKY_SFC_SW_DWN?.[m] ?? 0,
      wind: params.WS10M?.[m] ?? 0,
    }))

    // Solar potential rating
    let solarRating = 'LOW'
    let solarViability = 'Poor'
    if (solarAll >= 5.0) { solarRating = 'EXCELLENT'; solarViability = 'Excellent — ideal for solar farms' }
    else if (solarAll >= 4.0) { solarRating = 'GOOD'; solarViability = 'Good — viable for commercial solar' }
    else if (solarAll >= 3.0) { solarRating = 'MODERATE'; solarViability = 'Moderate — supplementary solar possible' }
    else { solarViability = 'Poor — limited solar potential' }

    // Wind potential rating
    let windRating = 'LOW'
    let windViability = 'Poor'
    if (wind50m >= 7.0) { windRating = 'EXCELLENT'; windViability = 'Excellent — utility-scale wind viable' }
    else if (wind50m >= 5.5) { windRating = 'GOOD'; windViability = 'Good — commercial wind feasible' }
    else if (wind50m >= 4.0) { windRating = 'MODERATE'; windViability = 'Moderate — small-scale wind possible' }
    else { windViability = 'Poor — insufficient wind resource' }

    // Estimated annual solar energy potential (kWh/m²/year)
    const annualSolarPotential = solarAll ? Math.round(solarAll * 365) : 0
    // Estimated capacity factor for solar (assuming 1kW peak panel)
    const solarCapacityFactor = solarAll ? Math.round((solarAll / 24) * 100) : 0

    res.json({
      company: company || 'Custom Location',
      coordinates: { lat: coords.lat, lon: coords.lon },
      location: coords.city,
      dataSource: 'NASA POWER (Prediction of Worldwide Energy Resources)',
      satellite: 'CERES/MERRA-2',
      solar: {
        irradiance: solarAll,           // kWh/m²/day
        clearSkyIrradiance: solarClr,   // kWh/m²/day
        annualPotential: annualSolarPotential, // kWh/m²/year
        capacityFactor: solarCapacityFactor,   // %
        rating: solarRating,
        viability: solarViability,
        unit: 'kWh/m²/day',
      },
      wind: {
        speed10m: wind10m,    // m/s at 10m height
        speed50m: wind50m,    // m/s at 50m (hub height)
        rating: windRating,
        viability: windViability,
        unit: 'm/s',
      },
      temperature: temp,      // °C annual average
      monthly: monthlySolar,  // monthly breakdown
      fetched: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[SATELLITE] NASA POWER API error:', error.message)
    // Return graceful fallback — don't break the pipeline
    res.json({
      company: company || 'Unknown',
      coordinates: { lat: coords.lat, lon: coords.lon },
      location: coords.city,
      dataSource: 'NASA POWER (unavailable)',
      solar: { irradiance: null, rating: 'UNKNOWN', viability: 'Data unavailable' },
      wind: { speed10m: null, speed50m: null, rating: 'UNKNOWN', viability: 'Data unavailable' },
      fetched: false,
      error: error.message,
    })
  }
})

export default router
