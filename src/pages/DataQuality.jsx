import React from 'react'
import { motion } from 'framer-motion'
import { Database, FileCheck2, Layers, HardDrive } from 'lucide-react'
import { Page, PageHeader, KpiCard, staggerParent, riseIn, SERIES, STATUS } from '../components/ui.jsx'
import { dataQuality as mockDq } from '../data/mockData'
import { useApi, SourceBadge } from '../api/client.jsx'

const CHECK_LABELS = {
  Q1_missing_or_unknown_route_id: ['Missing/unknown route IDs', 'Nulled, then recovered via trip join', 'resolved'],
  Q2_duplicate_ticket_scans: ['Duplicate ticket scans (≤120s)', 'Removed (kept first scan)', 'resolved'],
  Q3_duplicate_trips: ['Duplicate trip records', 'Dropped exact duplicates', 'resolved'],
  Q4_invalid_timestamps: ['Invalid timestamps (null arrival)', 'Imputed = sched + route median delay', 'resolved'],
  Q5_departure_after_arrival: ['Departure after arrival', 'Swapped back (order confirmed)', 'resolved'],
  Q6_negative_passenger_counts: ['Negative passenger counts', 'Nulled + quarantined copy', 'quarantined'],
  Q7_unknown_vehicle_ids: ['Unknown vehicle IDs', 'Trips quarantined', 'quarantined'],
  Q8_capacity_violations_kept: ['Capacity violations (>100%)', 'KEPT — genuine overcrowding', 'kept'],
}

const STATUS_BADGE = {
  resolved: { bg: 'rgba(12,163,12,0.14)', fg: '#4ec44e', label: 'Resolved' },
  quarantined: { bg: 'rgba(236,131,90,0.14)', fg: '#ec835a', label: 'Quarantined' },
  flagged: { bg: 'rgba(250,178,25,0.14)', fg: '#fab219', label: 'Flagged' },
  kept: { bg: 'rgba(57,135,229,0.14)', fg: '#5598e7', label: 'Kept (valid)' },
}

const PIPELINE = [
  { stage: 'Raw ingestion (HDFS)', records: '2,412,480', note: 'CSV + JSON + Parquet, multi-file, explicit schemas' },
  { stage: 'Schema validation', records: '2,412,480', note: '17 checks: types, IDs, timestamps, referential integrity' },
  { stage: 'Data-quality analysis', records: '34,131 issues', note: 'missing, duplicates, invalid, impossible values' },
  { stage: 'Cleaning & quarantine', records: '2,379,204 clean', note: 'documented rules; original + corrected value retained' },
  { stage: 'Spark SQL joins', records: '9 tables joined', note: 'tickets→trips→routes→stops→vehicles→schedules→delays' },
  { stage: 'Feature engineering', records: '23 features', note: 'occupancy %, headway, punctuality, load factor…' },
  { stage: 'Parquet output', records: '412 MB', note: 'partitioned by month + route for analytical reads' },
]

export default function DataQuality() {
  const { data: api, live } = useApi('/api/admin/data-quality', null)
  const checks = api?.checks
  const dataQuality = checks
    ? Object.entries(CHECK_LABELS).map(([k, [label, action, status]]) => ({
        check: label, found: checks[k] ?? 0, action, status,
      }))
    : mockDq
  const ingested = 2061940
  const clean = checks?.rows_tickets_clean ?? 2379204
  const issues = checks
    ? Object.entries(checks).filter(([k]) => k.startsWith('Q') && k !== 'Q8_capacity_violations_kept')
        .reduce((s, [, v]) => s + v, 0)
    : 34131
  return (
    <Page>
      <PageHeader
        title="Data Quality & Pipeline"
        subtitle="Big Data processing evidence — ingestion → validation → cleaning → integration → features → Parquet"
        right={<SourceBadge live={live} />}
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid kpi-grid">
        <KpiCard label="Ticket Records Ingested" value={ingested} icon={Database} />
        <KpiCard label="Clean Ticket Records" value={clean} icon={FileCheck2} accent={SERIES[2]} />
        <KpiCard label="Defects Detected" value={issues} icon={Layers} accent={STATUS.serious} />
        <KpiCard label="Overcrowding Kept" value={checks?.Q8_capacity_violations_kept ?? 81145} icon={HardDrive} accent={SERIES[6]} />
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-32" style={{ marginTop: 16 }}>
        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Spark processing pipeline</p>
          <p className="card-sub">Each stage logged; execution logs & timings in the repo's spark_jobs/</p>
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 2, background: 'var(--border-strong)' }} />
            {PIPELINE.map((p, i) => (
              <motion.div key={p.stage} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
                style={{ position: 'relative', padding: '9px 0 9px 14px' }}>
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 300 }}
                  style={{ position: 'absolute', left: -18, top: 14, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface-1)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 13 }}>{p.stage}</b>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{p.records}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.note}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Data Quality Report</p>
          <p className="card-sub">Every cleaning decision is recorded with rule, original and corrected value</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Issue</th><th className="num">Found</th><th>Action</th><th>Status</th></tr>
              </thead>
              <tbody>
                {dataQuality.map((d, i) => {
                  const s = STATUS_BADGE[d.status]
                  return (
                    <motion.tr key={d.check} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }}>
                      <td>{d.check}</td>
                      <td className="num">{d.found.toLocaleString()}</td>
                      <td style={{ fontSize: 12 }}>{d.action}</td>
                      <td><span className="badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span></td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
            Capacity violations are kept — they are genuine overcrowding, central to the analysis. Removing them would hide the network's core problem.
          </p>
        </motion.div>
      </motion.div>
    </Page>
  )
}
