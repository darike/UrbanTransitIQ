/* =====================================================================
   UrbanTransit IQ — mock analytical dataset
   Simulates outputs of the Spark / Python dual pipelines described in
   the SRS. Deterministic (seeded) so every reload shows the same story.
   Replace with API calls to the Flask/FastAPI backend when ready.
   ===================================================================== */

// --- tiny seeded PRNG (mulberry32) so data is stable across reloads ---
function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260928)
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const rf = (min, max, dp = 1) => +(rand() * (max - min) + min).toFixed(dp)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */
const ROUTE_NAMES = [
  ['R01', 'Central Station – Airport Express'],
  ['R04', 'Old City – Tech Park'],
  ['R07', 'Harbor Line – University'],
  ['R09', 'North Terminal – Mall Circuit'],
  ['R12', 'Central Station – Industrial Zone'],
  ['R15', 'Green Belt – Stadium'],
  ['R18', 'Riverside – Medical District'],
  ['R21', 'Metro Link – Suburb West'],
  ['R24', 'City Loop Clockwise'],
  ['R27', 'Suburb East – Business Bay'],
  ['R31', 'Hillside – Convention Center'],
  ['R35', 'Lakeview – Central Station'],
]

const CLASSES = ['High Performing', 'High Demand, Unreliable', 'Reliable, Underutilized', 'Overcrowded', 'Low Performing']

// hand-tuned so the classification story is coherent (incl. tricky cases)
const routeSeed = [
  //            demand  occ  onTime delayMin reliab  class
  ['R12', 118400, 94, 71, 9.6, 62, 'Overcrowded'],
  ['R01', 104200, 88, 82, 6.1, 78, 'High Performing'],
  ['R07', 98100, 91, 64, 11.8, 55, 'High Demand, Unreliable'],
  ['R04', 87300, 76, 90, 3.2, 92, 'High Performing'],
  ['R24', 76900, 83, 68, 9.1, 61, 'High Demand, Unreliable'],
  ['R09', 64500, 71, 86, 4.4, 85, 'High Performing'],
  ['R15', 52200, 58, 92, 2.8, 94, 'Reliable, Underutilized'],
  ['R21', 47800, 66, 74, 7.9, 70, 'High Performing'],
  ['R18', 41300, 49, 89, 3.6, 90, 'Reliable, Underutilized'],
  ['R27', 33600, 62, 59, 13.4, 48, 'Low Performing'],
  ['R31', 27100, 41, 67, 8.8, 58, 'Low Performing'],
  ['R35', 22400, 38, 91, 3.1, 93, 'Reliable, Underutilized'],
]

export const routes = routeSeed.map(([id, demand, occ, onTime, delay, reliability, cls], i) => ({
  id,
  name: ROUTE_NAMES.find((r) => r[0] === id)[1],
  demand,
  occupancy: occ,
  onTime,
  avgDelay: delay,
  reliability,
  classification: cls,
  trips: ri(1800, 4200),
  stops: ri(14, 32),
  distanceKm: rf(8, 34),
  headwayMin: ri(6, 22),
  score: Math.round(0.35 * (demand / 1184) / 1 + 0.25 * reliability + 0.2 * onTime + 0.2 * (100 - delay * 4)) ,
}))
// normalise score 0-100
const maxScore = Math.max(...routes.map((r) => r.score))
routes.forEach((r) => { r.score = Math.round((r.score / maxScore) * 100) })

/* ------------------------------------------------------------------ */
/* Stops                                                               */
/* ------------------------------------------------------------------ */
const STOP_NAMES = [
  'Central Station', 'Airport T1', 'Tech Park Gate', 'University Sq', 'Harbor Point',
  'North Terminal', 'City Mall', 'Industrial Zone A', 'Stadium East', 'Medical District',
  'Riverside Walk', 'Suburb West Hub', 'Business Bay', 'Convention Center', 'Lakeview Pier',
  'Old City Gate', 'Green Belt Park', 'Metro Link Xchg', 'Hillside Top', 'Suburb East Hub',
]

export const stops = STOP_NAMES.map((name, i) => {
  const boarding = ri(8000, 96000)
  return {
    id: `S${String(i + 1).padStart(3, '0')}`,
    name,
    boarding,
    alighting: Math.round(boarding * rf(0.82, 1.15, 2)),
    avgDwellSec: ri(18, 95),
    avgDelay: rf(0.5, 14),
    routesServed: ri(2, 8),
    bottleneck: false,
  }
})
// mark clear bottlenecks (high delay + high boarding + long dwell)
stops.sort((a, b) => b.boarding - a.boarding)
stops[0].bottleneck = true; stops[0].avgDelay = 12.4; stops[0].avgDwellSec = 88
stops[2].bottleneck = true; stops[2].avgDelay = 10.9; stops[2].avgDwellSec = 81
stops[5].bottleneck = true; stops[5].avgDelay = 9.7; stops[5].avgDwellSec = 74

/* ------------------------------------------------------------------ */
/* Hourly demand / occupancy profile (network level)                   */
/* ------------------------------------------------------------------ */
export const hourlyDemand = Array.from({ length: 24 }, (_, h) => {
  const morning = Math.exp(-Math.pow(h - 8.2, 2) / 3.2) * 88000
  const evening = Math.exp(-Math.pow(h - 17.6, 2) / 4.0) * 96000
  const midday = Math.exp(-Math.pow(h - 13, 2) / 18) * 30000
  const base = h >= 5 && h <= 23 ? 6000 : 900
  const weekday = Math.round(base + morning + evening + midday)
  return {
    hour: `${String(h).padStart(2, '0')}:00`,
    weekday,
    weekend: Math.round(weekday * (h >= 10 && h <= 20 ? 0.62 : 0.35) + ri(0, 2500)),
  }
})

/* Day-of-week x hour heatmap for delays */
export const delayHeatmap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => ({
  day,
  values: Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-Math.pow(h - 8.2, 2) / 3.0) + Math.exp(-Math.pow(h - 17.6, 2) / 3.4)
    const weekdayFactor = di < 5 ? 1 : 0.45
    const friday = di === 4 && h >= 16 && h <= 19 ? 1.35 : 1
    return +(peak * 9.5 * weekdayFactor * friday + rf(0.2, 1.4)).toFixed(1)
  }),
}))

/* ------------------------------------------------------------------ */
/* 12-month trend (passengers, delay, on-time)                         */
/* ------------------------------------------------------------------ */
const MONTHS = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26']
export const monthlyTrend = MONTHS.map((m, i) => {
  const growth = 1 + i * 0.018
  const seasonal = i === 2 ? 0.9 : i === 8 ? 1.08 : 1
  return {
    month: m,
    passengers: Math.round(612000 * growth * seasonal + ri(-18000, 18000)),
    avgDelay: +(7.8 - i * 0.12 + (i === 2 ? 1.6 : 0) + rf(-0.4, 0.4)).toFixed(1),
    onTime: +(74 + i * 0.55 - (i === 2 ? 4 : 0) + rf(-1, 1)).toFixed(1),
  }
})

/* ------------------------------------------------------------------ */
/* Origin–Destination matrix (top stops)                               */
/* ------------------------------------------------------------------ */
const OD_STOPS = ['Central Station', 'Airport T1', 'Tech Park Gate', 'University Sq', 'City Mall', 'Business Bay', 'North Terminal', 'Stadium East']
export const odMatrix = OD_STOPS.map((o, i) => ({
  origin: o,
  flows: OD_STOPS.map((d, j) => {
    if (i === j) return 0
    const hub = (i === 0 || j === 0 ? 1.9 : 1) * (i === 2 || j === 2 ? 1.4 : 1)
    return Math.round(1400 * hub * rf(0.3, 1.6))
  }),
}))
export const odStops = OD_STOPS

/* ------------------------------------------------------------------ */
/* Delay analysis                                                      */
/* ------------------------------------------------------------------ */
export const delaySeverityDist = [
  { name: 'On Time', value: 61.2 },
  { name: 'Minor (≤5 min)', value: 19.4 },
  { name: 'Moderate (5–10)', value: 10.8 },
  { name: 'Major (10–20)', value: 6.1 },
  { name: 'Severe (>20)', value: 2.5 },
]

export const delayByRoute = routes
  .map((r) => ({ route: r.id, avgDelay: r.avgDelay, p90Delay: +(r.avgDelay * rf(1.7, 2.3)).toFixed(1), incidents: ri(40, 380) }))
  .sort((a, b) => b.avgDelay - a.avgDelay)

export const delayPatterns = [
  { pattern: 'Morning congestion (07:30–09:30)', routes: 'R12, R07, R24', avgImpact: '+8.4 min', frequency: 'Weekdays', trend: 'stable' },
  { pattern: 'Evening congestion (17:00–19:00)', routes: 'R12, R01, R24', avgImpact: '+11.2 min', frequency: 'Weekdays', trend: 'worsening' },
  { pattern: 'Delay accumulation across stops', routes: 'R27', avgImpact: '+1.3 min / stop', frequency: 'All days', trend: 'stable' },
  { pattern: 'Bottleneck at Central Station', routes: '6 routes', avgImpact: '+4.1 min dwell', frequency: 'Peak hours', trend: 'worsening' },
  { pattern: 'Vehicle V-118 consistently late', routes: 'R27, R31', avgImpact: '+6.8 min', frequency: '73% of trips', trend: 'new' },
  { pattern: 'Friday evening surge', routes: 'Network-wide', avgImpact: '+35% delay', frequency: 'Fridays', trend: 'stable' },
]

/* ------------------------------------------------------------------ */
/* Occupancy                                                           */
/* ------------------------------------------------------------------ */
export const occupancyBands = [
  { band: 'Low (<40%)', trips: 8420 },
  { band: 'Moderate (40–70%)', trips: 14830 },
  { band: 'High (70–90%)', trips: 9110 },
  { band: 'Overcrowded (90–110%)', trips: 3860 },
  { band: 'Critical (>110%)', trips: 1240 },
]

export const highRiskTrips = [
  { trip: 'T-4812', route: 'R12', time: '08:10', dir: 'Inbound', predOcc: 128, risk: 0.94, vehicle: 'V-034 (60 cap)' },
  { trip: 'T-4820', route: 'R12', time: '08:30', dir: 'Inbound', predOcc: 121, risk: 0.91, vehicle: 'V-051 (60 cap)' },
  { trip: 'T-2214', route: 'R07', time: '17:40', dir: 'Outbound', predOcc: 117, risk: 0.88, vehicle: 'V-102 (72 cap)' },
  { trip: 'T-3305', route: 'R24', time: '18:00', dir: 'Clockwise', predOcc: 112, risk: 0.83, vehicle: 'V-077 (72 cap)' },
  { trip: 'T-4788', route: 'R12', time: '07:50', dir: 'Inbound', predOcc: 109, risk: 0.79, vehicle: 'V-029 (60 cap)' },
  { trip: 'T-1180', route: 'R01', time: '06:45', dir: 'Airport', predOcc: 104, risk: 0.72, vehicle: 'V-008 (85 cap)' },
]

export const occupancyTrend = MONTHS.map((m, i) => ({
  month: m,
  avgOccupancy: +(64 + i * 1.1 + (i === 2 ? -6 : 0) + rf(-1.5, 1.5)).toFixed(1),
  capacityUtil: +(58 + i * 0.9 + rf(-1.5, 1.5)).toFixed(1),
}))

/* ------------------------------------------------------------------ */
/* Forecast (demand)                                                   */
/* ------------------------------------------------------------------ */
// 8 weeks history + 4 weeks forecast, weekly passengers (network)
export const demandForecast = Array.from({ length: 12 }, (_, i) => {
  const isHist = i < 8
  const base = 152000 + i * 1900
  const actual = isHist ? Math.round(base + ri(-6000, 6000)) : null
  const fc = Math.round(base + (isHist ? ri(-4500, 4500) : ri(-2500, 2500)))
  return {
    week: `W${i + 1}`,
    actual,
    forecast: fc,
    lower: Math.round(fc * 0.94),
    upper: Math.round(fc * 1.06),
    phase: isHist ? 'history' : 'forecast',
  }
})

export const forecastMetrics = {
  spark: { model: 'GBT Regressor (Spark MLlib)', mae: 4210, rmse: 5830, mape: 3.4, r2: 0.91 },
  python: { model: 'XGBoost (Python)', mae: 3980, rmse: 5510, mape: 3.1, r2: 0.93 },
  baseline: { model: 'Naive seasonal baseline', mae: 9860, rmse: 13240, mape: 8.2, r2: 0.64 },
}

export const futurePeaks = [
  { period: 'Fri 03 Oct, 17:00–19:00', demand: 'Very High', driver: 'Weekly pattern + stadium event', conf: 0.92 },
  { period: 'Mon 06 Oct, 07:30–09:30', demand: 'High', driver: 'Weekday commute peak', conf: 0.95 },
  { period: 'Sat 11 Oct, 14:00–18:00', demand: 'High', driver: 'Festival at Old City', conf: 0.81 },
  { period: 'Tue 14 Oct, 17:00–19:00', demand: 'High', driver: 'Weekday commute peak', conf: 0.94 },
]

/* ------------------------------------------------------------------ */
/* Route clustering                                                    */
/* ------------------------------------------------------------------ */
export const routeClusters = [
  { cluster: 'C1 · High-demand commuter spines', routes: ['R12', 'R01', 'R07', 'R24'], color: 1, character: 'High demand, peak-dominated, overcrowding risk', avgOcc: 89, avgDelay: 9.2 },
  { cluster: 'C2 · Balanced urban connectors', routes: ['R04', 'R09', 'R21'], color: 3, character: 'Steady all-day demand, good punctuality', avgOcc: 71, avgDelay: 5.1 },
  { cluster: 'C3 · Reliable low-load feeders', routes: ['R15', 'R18', 'R35'], color: 7, character: 'Low occupancy, excellent reliability, frequency review candidates', avgOcc: 48, avgDelay: 3.2 },
  { cluster: 'C4 · Struggling long-haul', routes: ['R27', 'R31'], color: 2, character: 'Low demand AND poor punctuality — structural issues', avgOcc: 52, avgDelay: 11.1 },
]

// scatter points for cluster viz (demand vs reliability, size = occupancy)
export const clusterScatter = routes.map((r) => ({
  route: r.id,
  demand: Math.round(r.demand / 1000),
  reliability: r.reliability,
  occupancy: r.occupancy,
  cluster: routeClusters.findIndex((c) => c.routes.includes(r.id)),
}))

/* ------------------------------------------------------------------ */
/* Passenger segments                                                  */
/* ------------------------------------------------------------------ */
export const passengerSegments = [
  { segment: 'Daily Commuters', share: 38, avgTrips: 42, peak: 'AM+PM peaks', keyRoutes: 'R12, R01, R24' },
  { segment: 'Peak-Hour Travellers', share: 21, avgTrips: 28, peak: 'AM or PM only', keyRoutes: 'R07, R12' },
  { segment: 'Occasional Travellers', share: 18, avgTrips: 6, peak: 'Midday', keyRoutes: 'R09, R04' },
  { segment: 'Weekend Travellers', share: 13, avgTrips: 9, peak: 'Sat–Sun midday', keyRoutes: 'R09, R15' },
  { segment: 'Long-Distance Travellers', share: 10, avgTrips: 12, peak: 'Early AM', keyRoutes: 'R31, R27' },
]

/* ------------------------------------------------------------------ */
/* Anomalies                                                           */
/* ------------------------------------------------------------------ */
export const anomalies = [
  { id: 'A-101', date: '2026-09-26', type: 'Passenger spike', entity: 'Stadium East (S009)', detail: '+412% boarding vs baseline — cup semifinal. Separated from normal demand model.', severity: 'warning', pipeline: 'Both' },
  { id: 'A-102', date: '2026-09-25', type: 'Abnormal delay', entity: 'Route R27', detail: 'Avg delay 31 min (baseline 13). Road closure on Harbor bridge.', severity: 'critical', pipeline: 'Both' },
  { id: 'A-103', date: '2026-09-25', type: 'Duplicate ticketing', entity: '2,140 tickets', detail: 'Same ticket ID re-scanned within 90 s at Central Station gates. Quarantined.', severity: 'serious', pipeline: 'Spark' },
  { id: 'A-104', date: '2026-09-24', type: 'Impossible occupancy', entity: 'Trip T-2996 (R09)', detail: 'Occupancy 160% of capacity with no matching boarding records. Sensor fault suspected.', severity: 'serious', pipeline: 'Spark' },
  { id: 'A-105', date: '2026-09-23', type: 'Demand drop', entity: 'Route R31', detail: '-58% demand for 3 consecutive days. Parallel metro line trial opened.', severity: 'warning', pipeline: 'Python' },
  { id: 'A-106', date: '2026-09-22', type: 'Vehicle bunching', entity: 'R24 · 3 vehicles', detail: 'Headway collapsed to 90 s (scheduled 8 min) at City Mall for 40 min.', severity: 'warning', pipeline: 'Both' },
  { id: 'A-107', date: '2026-09-21', type: 'Irregular stop activity', entity: 'Hillside Top (S019)', detail: 'Boarding at 02:00–04:00 with no scheduled service. Data-entry defect.', severity: 'info', pipeline: 'Python' },
]

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */
export const recommendations = [
  {
    id: 'REC-01', priority: 'Critical', category: 'Frequency',
    action: 'Increase Route R12 frequency between 08:00–09:00 (headway 12 → 8 min)',
    evidence: ['Average peak occupancy: 94%', 'Critical occupancy events: 18 in 30 days', 'Passenger demand growth: +21% YoY', 'Average headway: 17 min observed vs 12 scheduled', 'Repeated overload on weekdays (persistent, both directions)'],
    impact: 'Est. peak occupancy → 78%, waiting time −31%',
  },
  {
    id: 'REC-02', priority: 'High', category: 'Capacity',
    action: 'Allocate 85-seat articulated vehicles to R07 evening outbound (17:00–19:00)',
    evidence: ['6 of top-10 high-risk trips are R07 outbound', 'Current fleet: 72-seat standard', 'Crowding-risk model: 0.88 probability of >100% occupancy', 'Spark & Python models agree (Δ 2.1%)'],
    impact: 'Est. crowding-risk trips −64% on segment',
  },
  {
    id: 'REC-03', priority: 'High', category: 'Schedule',
    action: 'Shift R27 departures +7 min to decouple from Harbor bridge peak congestion',
    evidence: ['Recurring delay pattern: accumulation +1.3 min/stop', 'Delay concentrated 08:00–08:40 at 4 consecutive stops', 'Simulated shift removes overlap with traffic peak (what-if #S-22)'],
    impact: 'Est. avg delay 13.4 → 7.9 min',
  },
  {
    id: 'REC-04', priority: 'Medium', category: 'Frequency',
    action: 'Reduce R35 midday frequency (10:00–15:00) from 6 to 4 trips/hour',
    evidence: ['Avg midday occupancy: 22%', 'Reliable, Underutilized classification (reliability 93)', 'No downstream transfer dependency in OD matrix'],
    impact: 'Est. operating cost −11% with occupancy still <45%',
  },
  {
    id: 'REC-05', priority: 'Medium', category: 'Operations',
    action: 'Investigate Central Station dwell process; add second boarding door lane',
    evidence: ['Bottleneck stop: 88 s avg dwell (network avg 41 s)', 'Feeds delay into 6 routes', 'Dwell grows 2.1x during peak vs off-peak'],
    impact: 'Est. −3 min knock-on delay across 6 routes',
  },
  {
    id: 'REC-06', priority: 'Low', category: 'Fleet',
    action: 'Inspect vehicle V-118 (consistently −6.8 min vs identical trips)',
    evidence: ['73% of V-118 trips late vs 31% fleet average', 'Same routes/other vehicles run on time', 'Pattern persists across drivers'],
    impact: 'Removes a recurring single-vehicle delay source',
  },
]

/* ------------------------------------------------------------------ */
/* Dual pipeline comparison                                            */
/* ------------------------------------------------------------------ */
export const pipelineSummary = {
  task: 'Delay severity classification (5 classes)',
  cases: 120,
  agreement: 91.7,
  spark: { model: 'Random Forest (Spark MLlib)', accuracy: 87.2, f1: 0.84, version: 'v3.2' },
  python: { model: 'XGBoost Classifier (Python)', accuracy: 88.9, f1: 0.86, version: 'v2.7' },
}

const sevClasses = ['On Time', 'Minor', 'Moderate', 'Major', 'Severe']
export const comparisonRows = Array.from({ length: 14 }, (_, i) => {
  const actualIdx = ri(0, 4)
  const agree = rand() > 0.21
  let sparkIdx = rand() > 0.15 ? actualIdx : Math.min(4, actualIdx + 1)
  let pyIdx = agree ? sparkIdx : Math.max(0, Math.min(4, sparkIdx + (rand() > 0.5 ? 1 : -1)))
  const sparkP = rf(0.62, 0.97, 2)
  const pyP = rf(0.62, 0.97, 2)
  return {
    trip: `T-${ri(1000, 4999)}`,
    route: pick(routes).id,
    actual: sevClasses[actualIdx],
    spark: sevClasses[sparkIdx],
    sparkProb: sparkP,
    python: sevClasses[pyIdx],
    pyProb: pyP,
    match: sparkIdx === pyIdx,
    diff: Math.abs(sparkP - pyP).toFixed(2),
    note: sparkIdx === pyIdx ? '—' : 'Boundary case: features near class threshold; XGBoost weighs recent-delay feature higher',
  }
})

export const disagreementByClass = sevClasses.map((c) => ({
  class: c,
  agree: ri(14, 26),
  disagree: ri(0, 4),
}))

/* ------------------------------------------------------------------ */
/* Network map (schematic)                                             */
/* ------------------------------------------------------------------ */
// positions on 1000x640 canvas
export const mapStops = [
  { id: 'S001', name: 'Central Station', x: 480, y: 330, size: 3, delay: 12.4, demand: 96000 },
  { id: 'S002', name: 'Airport T1', x: 870, y: 120, size: 2, delay: 4.2, demand: 61000 },
  { id: 'S003', name: 'Tech Park Gate', x: 760, y: 420, size: 2, delay: 10.9, demand: 72000 },
  { id: 'S004', name: 'University Sq', x: 300, y: 150, size: 2, delay: 5.5, demand: 54000 },
  { id: 'S005', name: 'Harbor Point', x: 120, y: 420, size: 2, delay: 8.1, demand: 38000 },
  { id: 'S006', name: 'North Terminal', x: 520, y: 80, size: 2, delay: 9.7, demand: 47000 },
  { id: 'S007', name: 'City Mall', x: 610, y: 250, size: 1, delay: 6.8, demand: 43000 },
  { id: 'S008', name: 'Industrial Zone A', x: 900, y: 520, size: 1, delay: 7.2, demand: 29000 },
  { id: 'S009', name: 'Stadium East', x: 700, y: 560, size: 1, delay: 3.9, demand: 31000 },
  { id: 'S010', name: 'Medical District', x: 340, y: 520, size: 1, delay: 3.1, demand: 26000 },
  { id: 'S011', name: 'Business Bay', x: 630, y: 180, size: 1, delay: 5.9, demand: 35000 },
  { id: 'S012', name: 'Suburb West Hub', x: 90, y: 240, size: 1, delay: 4.4, demand: 22000 },
  { id: 'S013', name: 'Old City Gate', x: 380, y: 240, size: 1, delay: 6.1, demand: 30000 },
  { id: 'S014', name: 'Lakeview Pier', x: 180, y: 580, size: 1, delay: 2.8, demand: 15000 },
  { id: 'S015', name: 'Hillside Top', x: 830, y: 300, size: 1, delay: 8.8, demand: 14000 },
]

export const mapLinks = [
  { from: 'S001', to: 'S007', route: 'R12', load: 0.94 },
  { from: 'S007', to: 'S003', route: 'R12', load: 0.91 },
  { from: 'S003', to: 'S008', route: 'R12', load: 0.72 },
  { from: 'S001', to: 'S011', route: 'R01', load: 0.82 },
  { from: 'S011', to: 'S002', route: 'R01', load: 0.86 },
  { from: 'S001', to: 'S013', route: 'R04', load: 0.6 },
  { from: 'S013', to: 'S004', route: 'R04', load: 0.55 },
  { from: 'S005', to: 'S013', route: 'R07', load: 0.88 },
  { from: 'S013', to: 'S006', route: 'R07', load: 0.79 },
  { from: 'S006', to: 'S011', route: 'R09', load: 0.5 },
  { from: 'S001', to: 'S010', route: 'R18', load: 0.42 },
  { from: 'S010', to: 'S014', route: 'R18', load: 0.3 },
  { from: 'S012', to: 'S004', route: 'R21', load: 0.58 },
  { from: 'S004', to: 'S006', route: 'R21', load: 0.52 },
  { from: 'S007', to: 'S009', route: 'R15', load: 0.38 },
  { from: 'S009', to: 'S008', route: 'R15', load: 0.3 },
  { from: 'S015', to: 'S003', route: 'R31', load: 0.4 },
  { from: 'S015', to: 'S002', route: 'R31', load: 0.35 },
  { from: 'S001', to: 'S006', route: 'R24', load: 0.83 },
]

/* ------------------------------------------------------------------ */
/* Executive KPIs & alerts                                             */
/* ------------------------------------------------------------------ */
export const kpis = {
  totalPassengers: 2412480,
  totalTrips: 37460,
  avgOccupancy: 72.4,
  avgDelay: 6.8,
  onTimePct: 78.2,
  activeRoutes: 12,
  overcrowdedRoutes: 2,
  underutilizedRoutes: 3,
}

export const alerts = [
  { level: 'critical', text: 'R12 peak occupancy exceeded 110% on 4 of last 5 weekdays', link: '/occupancy' },
  { level: 'serious', text: 'Central Station dwell time degrading — feeds delay into 6 routes', link: '/delays' },
  { level: 'warning', text: 'R31 demand down 58% — parallel metro trial detected as special event', link: '/anomalies' },
  { level: 'info', text: 'Forecast: stadium event Fri 3 Oct — very high demand 17:00–19:00', link: '/forecast' },
]

/* ------------------------------------------------------------------ */
/* What-if model coefficients (simple linear response surface)         */
/* ------------------------------------------------------------------ */
export const whatIfBase = {
  route: 'R12',
  frequency: 5, // trips/hour
  capacity: 60,
  demand: 4200, // peak-hour passengers
  occupancy: 94,
  waitMin: 6.0,
  overcrowdRisk: 0.86,
}

export const dataQuality = [
  { check: 'Missing ticket records', found: 18240, action: 'Imputed from gate counts', status: 'resolved' },
  { check: 'Duplicate ticket transactions', found: 9412, action: 'Removed (kept first scan)', status: 'resolved' },
  { check: 'Invalid timestamps', found: 3105, action: 'Quarantined', status: 'quarantined' },
  { check: 'Departure before arrival', found: 1288, action: 'Swapped where GPS confirms', status: 'resolved' },
  { check: 'Negative passenger counts', found: 402, action: 'Set to null + flagged', status: 'flagged' },
  { check: 'Vehicle capacity violations', found: 1240, action: 'Kept — real overcrowding', status: 'kept' },
  { check: 'Broken stop sequences', found: 356, action: 'Rebuilt from route master', status: 'resolved' },
  { check: 'Unknown vehicle IDs', found: 88, action: 'Quarantined', status: 'quarantined' },
]
