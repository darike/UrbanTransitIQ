import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Page, PageHeader, SeverityBadge, staggerParent, riseIn } from '../components/ui.jsx'
import { anomalies } from '../data/mockData'

const TYPES = ['All', ...new Set(anomalies.map((a) => a.type))]

export default function Anomalies() {
  const [type, setType] = useState('All')
  const rows = type === 'All' ? anomalies : anomalies.filter((a) => a.type === type)

  return (
    <Page>
      <PageHeader
        title="Anomaly Detection"
        subtitle="Unusual passenger, delay, route, stop and ticketing behavior — statistical rules + isolation forest, cross-checked by both pipelines"
        right={
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ fontSize: 12.5 }}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        }
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" style={{ display: 'grid', gap: 12 }}>
        <AnimatePresence mode="popLayout">
          {rows.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              variants={riseIn}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="card"
              style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
            >
              <div style={{ minWidth: 88 }}>
                <SeverityBadge level={a.severity} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{a.date}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{a.type}</span>
                  <span style={{ color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>{a.entity}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                    detected by: <b style={{ color: 'var(--text-secondary)' }}>{a.pipeline}</b> pipeline{a.pipeline === 'Both' ? 's' : ''}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{a.detail}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16 }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Detection rules in effect</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <div><b style={{ color: 'var(--text-primary)' }}>Demand spikes/drops:</b> |z| ≥ 3 vs same day-of-week rolling baseline (28 days).</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Special events:</b> spikes matched against the events calendar are labelled, and excluded from normal-demand model retraining.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Duplicate ticketing:</b> same ticket ID scanned twice within 120 s at any gate.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Impossible occupancy:</b> passenger count &gt; 130% capacity without matching boardings.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Bunching:</b> observed headway &lt; 25% of scheduled for ≥ 15 min.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Ghost activity:</b> boardings outside the service calendar window.</div>
        </div>
      </motion.div>
    </Page>
  )
}
