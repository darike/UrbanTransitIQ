import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { Page, PageHeader, AnimatedNumber, riseIn, staggerParent, SERIES, STATUS } from '../components/ui.jsx'
import { whatIfBase, routes } from '../data/mockData'

/* Simple response-surface model for the simulator.
   In production these deltas come from the backend simulation endpoint. */
function simulate({ frequency, capacity, demandShift }) {
  const base = whatIfBase
  const supplyBase = base.frequency * base.capacity
  const supplyNew = frequency * capacity
  const demandNew = base.demand * (1 + demandShift / 100)

  const occupancy = Math.min(160, +(100 * demandNew / supplyNew).toFixed(1))
  const waitMin = +(Math.max(1.2, 60 / (frequency * 2) * (occupancy > 100 ? 1.35 : 1)).toFixed(1))
  const coverage = Math.min(100, +(100 * supplyNew / demandNew).toFixed(1))
  // logistic-ish crowding risk around 90% occupancy
  const risk = +(1 / (1 + Math.exp(-(occupancy - 90) / 7))).toFixed(2)
  const loadPerTrip = Math.round(demandNew / frequency)
  return { occupancy, waitMin, coverage, risk, loadPerTrip, demandNew: Math.round(demandNew) }
}

function Slider({ label, value, min, max, step = 1, unit, onChange, base }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontWeight: 700 }}>
          {value}{unit} {value !== base && <span style={{ color: 'var(--accent)', fontWeight: 500 }}>(base {base}{unit})</span>}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: 'var(--accent)', padding: 0 }}
      />
    </div>
  )
}

function Metric({ label, value, decimals = 0, suffix, danger, note }) {
  return (
    <motion.div variants={riseIn} className="card" style={{ textAlign: 'center', borderTop: `2px solid ${danger ? STATUS.critical : SERIES[0]}` }}>
      <p className="card-title">{label}</p>
      <div style={{ fontSize: 26, fontWeight: 800, color: danger ? STATUS.critical : 'var(--text-primary)' }}>
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
    </motion.div>
  )
}

export default function WhatIf() {
  const [route, setRoute] = useState(whatIfBase.route)
  const [frequency, setFrequency] = useState(whatIfBase.frequency)
  const [capacity, setCapacity] = useState(whatIfBase.capacity)
  const [demandShift, setDemandShift] = useState(0)

  const sim = useMemo(() => simulate({ frequency, capacity, demandShift }), [frequency, capacity, demandShift])
  const baseSim = useMemo(() => simulate({ frequency: whatIfBase.frequency, capacity: whatIfBase.capacity, demandShift: 0 }), [])

  const reset = () => { setFrequency(whatIfBase.frequency); setCapacity(whatIfBase.capacity); setDemandShift(0) }

  return (
    <Page>
      <PageHeader
        title="What-If Scenario Simulator"
        subtitle="Simulate frequency, capacity and demand changes — all outputs are estimates, not actual results (SRS Step 49)"
        right={<button className="btn btn-ghost" onClick={reset}><RotateCcw size={14} /> Reset</button>}
      />

      <div className="grid grid-32">
        <motion.div variants={riseIn} initial="initial" animate="animate" className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={16} color={SERIES[0]} /> Scenario controls
          </p>
          <p className="card-sub">Peak hour (08:00–09:00), inbound direction</p>
          <div style={{ display: 'grid', gap: 18, marginTop: 6 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Route
              <select value={route} onChange={(e) => setRoute(e.target.value)}>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}
              </select>
            </label>
            <Slider label="Trips per hour" value={frequency} min={2} max={12} unit="" base={whatIfBase.frequency} onChange={setFrequency} />
            <Slider label="Vehicle capacity" value={capacity} min={40} max={120} step={5} unit=" seats" base={whatIfBase.capacity} onChange={setCapacity} />
            <Slider label="Demand change" value={demandShift} min={-30} max={40} step={5} unit="%" base={0} onChange={setDemandShift} />
          </div>
          <div style={{ marginTop: 18, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Baseline {route}: {whatIfBase.demand.toLocaleString()} peak-hour passengers,
            {' '}{whatIfBase.frequency} trips/h × {whatIfBase.capacity} seats → occupancy {baseSim.occupancy}%.
          </div>
        </motion.div>

        <div>
          <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }} key={`${frequency}-${capacity}-${demandShift}`}>
            <Metric label="Est. Occupancy" value={sim.occupancy} decimals={1} suffix="%" danger={sim.occupancy >= 95} note={`base ${baseSim.occupancy}%`} />
            <Metric label="Est. Avg Wait" value={sim.waitMin} decimals={1} suffix=" min" danger={sim.waitMin > 8} note={`base ${baseSim.waitMin} min`} />
            <Metric label="Crowding Risk" value={sim.risk * 100} decimals={0} suffix="%" danger={sim.risk >= 0.6} note="P(occ > 90%)" />
            <Metric label="Demand Coverage" value={sim.coverage} decimals={0} suffix="%" danger={sim.coverage < 95} note="supply ÷ demand" />
            <Metric label="Passengers / Trip" value={sim.loadPerTrip} note={`capacity ${capacity}`} danger={sim.loadPerTrip > capacity} />
            <Metric label="Peak Demand" value={sim.demandNew} note="passengers 08–09h" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="card" style={{ marginTop: 16, borderLeft: `3px solid ${sim.occupancy >= 95 ? STATUS.critical : sim.occupancy <= 70 ? STATUS.good : STATUS.warning}` }}
          >
            <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Scenario reading</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {sim.occupancy >= 95
                ? `Supply is insufficient: estimated occupancy ${sim.occupancy}% with ${Math.round(sim.risk * 100)}% crowding risk. Add trips or larger vehicles.`
                : sim.occupancy <= 55
                  ? `Service is over-supplied for this demand (occupancy ${sim.occupancy}%). Frequency could be reduced with limited passenger impact — verify off-peak transfer dependencies first.`
                  : `Balanced scenario: occupancy ${sim.occupancy}%, wait ${sim.waitMin} min, crowding risk ${Math.round(sim.risk * 100)}%. Within comfort and efficiency bands.`}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
              ⚠ Simulated estimate from the response-surface model — not an observed result.
            </p>
          </motion.div>
        </div>
      </div>
    </Page>
  )
}
