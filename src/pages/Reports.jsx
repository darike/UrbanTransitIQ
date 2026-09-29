import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Check } from 'lucide-react'
import { Page, PageHeader, staggerParent, riseIn, SERIES } from '../components/ui.jsx'
import {
  routes, stops, delayByRoute, comparisonRows, recommendations, anomalies, dataQuality,
} from '../data/mockData'

function toCSV(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' || rows[0][k] === null)
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}

function download(name, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const REPORTS = [
  { name: 'Route performance report', file: 'route_performance.csv', desc: 'Ranking, score, occupancy, punctuality, classification for every route', rows: () => routes, tag: 'Routes' },
  { name: 'Stop performance report', file: 'stop_performance.csv', desc: 'Boarding, alighting, dwell, delay and bottleneck flags per stop', rows: () => stops, tag: 'Stops' },
  { name: 'Delay analysis report', file: 'delay_analysis.csv', desc: 'Average and P90 delay with incident counts by route', rows: () => delayByRoute, tag: 'Delays' },
  { name: 'Spark vs Python comparison', file: 'dual_pipeline_comparison.csv', desc: 'Case-level model comparison with probabilities and match status', rows: () => comparisonRows, tag: 'Models' },
  { name: 'Recommendations export', file: 'recommendations.csv', desc: 'All evidence-based recommendations with priority and impact', rows: () => recommendations.map((r) => ({ ...r, evidence: r.evidence.join(' | ') })), tag: 'Decisions' },
  { name: 'Anomaly log', file: 'anomalies.csv', desc: 'Detected anomalies with severity, entity and detecting pipeline', rows: () => anomalies, tag: 'Anomalies' },
  { name: 'Data quality report', file: 'data_quality.csv', desc: 'Issue counts, cleaning actions and final status per check', rows: () => dataQuality, tag: 'Data' },
]

export default function Reports() {
  const [done, setDone] = useState({})
  const handle = (r) => {
    download(r.file, r.rows())
    setDone((d) => ({ ...d, [r.file]: true }))
    setTimeout(() => setDone((d) => ({ ...d, [r.file]: false })), 2000)
  }

  return (
    <Page>
      <PageHeader
        title="Reports & Export"
        subtitle="Downloadable analytical reports in CSV (Excel-compatible) — role-gated in production"
      />
      <motion.div variants={staggerParent} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {REPORTS.map((r, i) => (
          <motion.div key={r.file} variants={riseIn} whileHover={{ y: -3 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'var(--accent-soft)', borderRadius: 10, padding: 8, display: 'inline-flex' }}>
                <FileText size={16} color={SERIES[0]} />
              </span>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.tag}</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="btn btn-ghost"
              style={{ marginTop: 'auto', justifyContent: 'center', color: done[r.file] ? 'var(--status-good)' : undefined }}
              onClick={() => handle(r)}
            >
              {done[r.file] ? <><Check size={15} /> Downloaded</> : <><Download size={15} /> Download CSV</>}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16 }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Report coverage vs SRS</p>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
          Passenger demand ✓ · Route performance ✓ · Delays ✓ · Occupancy ✓ (route report) · Stop performance ✓ ·
          Forecasting ✓ (forecast dashboard export) · Route clustering ✓ (route report, cluster column) ·
          Recommendations ✓ · Spark vs Python comparison ✓. PDF report generation is handled by the backend in production.
        </p>
      </motion.div>
    </Page>
  )
}
