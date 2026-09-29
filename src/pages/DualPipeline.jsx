import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { GitCompare, Check, X } from 'lucide-react'
import {
  Page, PageHeader, ChartCard, VizTooltip, AnimatedNumber, staggerParent, riseIn, SERIES, INK, STATUS,
} from '../components/ui.jsx'
import { pipelineSummary, comparisonRows, disagreementByClass } from '../data/mockData'
import { useApi, SourceBadge } from '../api/client.jsx'

export default function DualPipeline() {
  const [onlyMismatch, setOnlyMismatch] = useState(false)
  const { data: api, live } = useApi('/api/dashboards/comparison', null)

  const liveRows = api?.cases?.map((c) => ({
    trip: c.trip_id, route: c.route_id, actual: c.actual,
    spark: c.pipeline_a_pred, sparkProb: c.pipeline_a_prob,
    python: c.pipeline_b_pred, pyProb: c.pipeline_b_prob,
    match: c.match, diff: c.prob_diff, note: c.note || '—',
  }))
  const allRows = liveRows || comparisonRows
  const summary = api?.summary
    ? { ...pipelineSummary, cases: api.summary.cases, agreement: api.summary.agreement_pct }
    : pipelineSummary
  const rows = onlyMismatch ? allRows.filter((r) => !r.match) : allRows

  return (
    <Page>
      <PageHeader
        title="Dual-Pipeline Comparison"
        subtitle={`${summary.task} · ${summary.cases} unseen cases · two independently trained pipelines`}
        right={<SourceBadge live={live} />}
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-3">
        <motion.div variants={riseIn} className="card" style={{ textAlign: 'center', borderTop: `2px solid ${SERIES[0]}` }}>
          <p className="card-title">Spark MLlib</p>
          <div style={{ fontSize: 30, fontWeight: 800 }}><AnimatedNumber value={summary.spark.accuracy} decimals={1} suffix="%" /></div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {summary.spark.model} · F1 {summary.spark.f1} · {summary.spark.version}
          </p>
        </motion.div>
        <motion.div variants={riseIn} className="card" style={{ textAlign: 'center', borderTop: `2px solid ${STATUS.good}` }}>
          <p className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <GitCompare size={14} /> Agreement
          </p>
          <div style={{ fontSize: 30, fontWeight: 800, color: STATUS.good }}>
            <AnimatedNumber value={summary.agreement} decimals={1} suffix="%" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {Math.round(summary.cases * summary.agreement / 100)} of {summary.cases} cases match · exact equality not required
          </p>
        </motion.div>
        <motion.div variants={riseIn} className="card" style={{ textAlign: 'center', borderTop: `2px solid ${SERIES[2]}` }}>
          <p className="card-title">Python Data Science</p>
          <div style={{ fontSize: 30, fontWeight: 800 }}><AnimatedNumber value={summary.python.accuracy} decimals={1} suffix="%" /></div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {summary.python.model} · F1 {summary.python.f1} · {summary.python.version}
          </p>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-32" style={{ marginTop: 16 }}>
        <ChartCard title="Agreement by predicted class" sub="Where the two pipelines disagree, it is concentrated at class boundaries" height={260}>
          <ResponsiveContainer>
            <BarChart data={disagreementByClass} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="class" tickLine={false} axisLine={{ stroke: INK.baseline }} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<VizTooltip />} />
              <Legend />
              <Bar name="Agree" dataKey="agree" stackId="a" fill={SERIES[0]} maxBarSize={34} />
              <Bar name="Disagree" dataKey="disagree" stackId="a" fill={SERIES[1]} radius={[3, 3, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Why do they disagree?</p>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'grid', gap: 10, lineHeight: 1.55 }}>
            <div><b style={{ color: 'var(--text-primary)' }}>Feature weighting.</b> XGBoost assigns ~1.8× more importance to the rolling 7-day delay feature than Spark's Random Forest, so near-threshold trips tip differently.</div>
            <div><b style={{ color: 'var(--text-primary)' }}>Class boundaries.</b> 78% of mismatches are adjacent classes (Minor ↔ Moderate), never 2+ classes apart.</div>
            <div><b style={{ color: 'var(--text-primary)' }}>Training independence.</b> Same underlying records, separate preprocessing and training — Spark predictions are never copied into the Python pipeline (SRS integrity rule).</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Case-level comparison</p>
            <p className="card-sub">Sample of the 120-case report · full CSV on the Reports page</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Mismatches only
          </label>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip</th><th>Route</th><th>Actual</th>
                <th>Spark</th><th className="num">p</th>
                <th>Python</th><th className="num">p</th>
                <th className="num">Δp</th><th>Match</th><th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.trip + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td>{r.trip}</td>
                  <td>{r.route}</td>
                  <td>{r.actual}</td>
                  <td style={{ color: r.spark === r.actual ? 'inherit' : STATUS.serious }}>{r.spark}</td>
                  <td className="num">{r.sparkProb}</td>
                  <td style={{ color: r.python === r.actual ? 'inherit' : STATUS.serious }}>{r.python}</td>
                  <td className="num">{r.pyProb}</td>
                  <td className="num">{r.diff}</td>
                  <td>
                    {r.match
                      ? <span className="badge" style={{ background: 'rgba(12,163,12,0.14)', color: '#4ec44e' }}><Check size={11} /> Match</span>
                      : <span className="badge" style={{ background: 'rgba(208,59,59,0.14)', color: '#e66767' }}><X size={11} /> Mismatch</span>}
                  </td>
                  <td style={{ maxWidth: 260, fontSize: 12 }}>{r.note}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </Page>
  )
}
