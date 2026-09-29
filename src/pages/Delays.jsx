import React from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts'
import { Clock } from 'lucide-react'
import {
  Page, PageHeader, ChartCard, VizTooltip, TimeTabs, staggerParent, riseIn, SERIES, INK, STATUS,
} from '../components/ui.jsx'
import { delayByRoute, delaySeverityDist, delayHeatmap, delayPatterns } from '../data/mockData'
import { useFilteredData } from '../FilterContext.jsx'

// sequential single-hue ramp for the heatmap (dark surface)
const HEAT_STEPS = ['#16233a', '#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7']
const heat = (v, max) => HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.floor((v / max) * HEAT_STEPS.length))]

function Heatmap() {
  const max = Math.max(...delayHeatmap.flatMap((d) => d.values))
  const [tip, setTip] = React.useState(null)
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 4 }}>
        <div />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, fontSize: 9.5, color: 'var(--text-muted)' }}>
          {Array.from({ length: 24 }, (_, h) => <div key={h} style={{ textAlign: 'center' }}>{h % 4 === 0 ? `${h}` : ''}</div>)}
        </div>
        {delayHeatmap.map((row) => (
          <React.Fragment key={row.day}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{row.day}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
              {row.values.map((v, h) => (
                <motion.div key={h}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: h * 0.012 }}
                  onMouseEnter={() => setTip({ day: row.day, h, v })}
                  onMouseLeave={() => setTip(null)}
                  style={{ height: 22, borderRadius: 4, background: heat(v, max), cursor: 'pointer',
                    outline: tip && tip.day === row.day && tip.h === h ? '2px solid #fff' : 'none' }}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', minHeight: 16 }}>
          {tip ? <><b style={{ color: 'var(--text-primary)' }}>{tip.day} {String(tip.h).padStart(2, '0')}:00</b> · avg delay {tip.v} min</> : 'Hover a cell — average delay (min) by day and hour'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--text-muted)' }}>
          low {HEAT_STEPS.map((c) => <span key={c} style={{ width: 14, height: 8, background: c, borderRadius: 2, display: 'inline-block' }} />)} high
        </span>
      </div>
    </div>
  )
}

export default function Delays() {
  const sevColors = [SERIES[5], SERIES[0], SERIES[3], STATUS.serious, STATUS.critical]
  const { routes: frs, filters } = useFilteredData()
  const ids = new Set(frs.map((r) => r.id))
  const rows = delayByRoute.filter((d) => ids.has(d.route))
  return (
    <Page>
      <PageHeader
        title="Delay Intelligence"
        subtitle={`Delay distribution, recurring patterns, and severity — Spark SQL over 250k delay records${filters.route !== 'all' ? ` · filtered: ${filters.route}` : ''}`}
        icon={Clock} accent="#e66767"
        right={<TimeTabs />}
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-23">
        <ChartCard title="Delay heatmap — day × hour" sub="Average delay in minutes; the two weekday congestion ridges are clearly visible, Friday evening worst" height={240}>
          <Heatmap />
        </ChartCard>

        <ChartCard title="Trip punctuality distribution" sub="Share of trips by delay severity class" height={240}>
          <ResponsiveContainer>
            <BarChart data={delaySeverityDist} layout="vertical" margin={{ top: 4, right: 30, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={INK.grid} horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={{ stroke: INK.baseline }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<VizTooltip formatter={(v) => `${v}%`} />} />
              <Bar dataKey="value" name="Share" radius={[0, 4, 4, 0]} maxBarSize={18}
                label={{ position: 'right', fill: INK.secondary, fontSize: 11, formatter: (v) => `${v}%` }}>
                {delaySeverityDist.map((_, i) => <Cell key={i} fill={sevColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-2" style={{ marginTop: 16 }}>
        <ChartCard title="Average delay by route" sub="Mean and 90th percentile delay (min) — respects the route/occupancy filters" height={320}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="route" tickLine={false} axisLine={{ stroke: INK.baseline }} />
              <YAxis tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<VizTooltip formatter={(v) => `${v} min`} />} />
              <Legend />
              <Bar name="Avg delay" dataKey="avgDelay" fill={SERIES[0]} radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar name="P90 delay" dataKey="p90Delay" fill={SERIES[1]} radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Recurring delay patterns</p>
          <p className="card-sub">Detected by pattern-mining over trip-level delay records</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Pattern</th><th>Routes</th><th className="num">Impact</th><th>Frequency</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {delayPatterns.map((p, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                    <td style={{ maxWidth: 220 }}>{p.pattern}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.routes}</td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{p.avgImpact}</td>
                    <td>{p.frequency}</td>
                    <td>
                      <span className="badge" style={{
                        background: p.trend === 'worsening' ? 'rgba(208,59,59,0.16)' : p.trend === 'new' ? 'rgba(57,135,229,0.16)' : 'rgba(137,135,129,0.16)',
                        color: p.trend === 'worsening' ? '#e66767' : p.trend === 'new' ? '#5598e7' : '#c3c2b7',
                      }}>{p.trend}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16 }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Delay prediction — next 24 h high-risk trips</p>
        <p className="card-sub">Random Forest (Spark MLlib) vs XGBoost (Python) — both flag the same morning R12/R07 window; full comparison on the Spark vs Python page</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { trip: 'T-4812 · R12 · 08:10', risk: 'Severe', p: 0.91 },
            { trip: 'T-2214 · R07 · 17:40', risk: 'Major', p: 0.84 },
            { trip: 'T-3305 · R24 · 18:00', risk: 'Major', p: 0.79 },
            { trip: 'T-1180 · R01 · 06:45', risk: 'Moderate', p: 0.66 },
          ].map((t, i) => (
            <motion.div key={t.trip} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.07 }}
              style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 650 }}>{t.trip}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                <span style={{ color: t.risk === 'Severe' ? STATUS.critical : t.risk === 'Major' ? STATUS.serious : STATUS.warning, fontWeight: 700 }}>{t.risk}</span>
                <span style={{ color: 'var(--text-muted)' }}>p = {t.p}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Page>
  )
}
