import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Users } from 'lucide-react'
import {
  Page, PageHeader, ChartCard, VizTooltip, TimeTabs, staggerParent, riseIn, SERIES, INK,
} from '../components/ui.jsx'
import { stops, odMatrix, odStops, hourlyDemand } from '../data/mockData'
import { useFilteredData } from '../FilterContext.jsx'

function ODMatrix() {
  const [hover, setHover] = useState(null)
  const max = Math.max(...odMatrix.flatMap((r) => r.flows))
  // sequential blue ramp (one hue, light->dark on dark surface)
  const ramp = (v) => {
    if (v === 0) return 'transparent'
    const t = v / max
    const steps = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7']
    return steps[Math.min(steps.length - 1, Math.floor(t * steps.length))]
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 2, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'left', padding: 4 }}>Origin ↓ / Dest →</th>
            {odStops.map((s) => (
              <th key={s} style={{ fontSize: 10, color: 'var(--text-muted)', padding: 4, fontWeight: 600, maxWidth: 70 }}>{s.split(' ')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {odMatrix.map((row, i) => (
            <tr key={row.origin}>
              <td style={{ fontSize: 11.5, color: 'var(--text-secondary)', padding: 4, whiteSpace: 'nowrap' }}>{row.origin}</td>
              {row.flows.map((v, j) => (
                <td key={j}
                  onMouseEnter={() => setHover({ i, j, v })}
                  onMouseLeave={() => setHover(null)}
                  style={{ padding: 0 }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (i * odStops.length + j) * 0.008, duration: 0.25 }}
                    style={{
                      height: 34, borderRadius: 6, background: ramp(v),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10.5, fontVariantNumeric: 'tabular-nums',
                      color: v / max > 0.45 ? '#fff' : 'var(--text-muted)',
                      outline: hover && hover.i === i && hover.j === j ? '2px solid #fff' : 'none',
                      cursor: v ? 'pointer' : 'default',
                      border: i === j ? '1px dashed var(--border)' : 'none',
                    }}
                  >
                    {v ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) : ''}
                  </motion.div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', minHeight: 18 }}>
        {hover && hover.v ? (
          <>
            <b style={{ color: 'var(--text-primary)' }}>{odMatrix[hover.i].origin} → {odStops[hover.j]}</b>
            {' '}· {hover.v.toLocaleString()} passengers / 30 days
          </>
        ) : 'Hover a cell for the exact origin–destination flow. Weekday, all periods.'}
      </div>
    </div>
  )
}

export default function PassengerFlow() {
  const { scale, filters } = useFilteredData()
  const topBoarding = [...stops].sort((a, b) => b.boarding - a.boarding).slice(0, 10)
    .map((s) => ({ name: s.name, Boarding: Math.round(s.boarding * scale), Alighting: Math.round(s.alighting * scale) }))

  return (
    <Page>
      <PageHeader
        title="Passenger Flow"
        subtitle={`Boarding & alighting patterns, origin–destination flows, stop-level demand · ${filters.range.toLowerCase()}`}
        icon={Users} accent="#3b82f6"
        right={<TimeTabs />}
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-2">
        <ChartCard title="Busiest stops — boarding vs alighting" sub="Top 10 stops by 30-day boardings" height={340}>
          <ResponsiveContainer>
            <BarChart data={topBoarding} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 30 }} barGap={2}>
              <CartesianGrid stroke={INK.grid} horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={{ stroke: INK.baseline }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" width={104} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<VizTooltip />} />
              <Legend />
              <Bar dataKey="Boarding" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={12} />
              <Bar dataKey="Alighting" fill={SERIES[2]} radius={[0, 4, 4, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Origin–Destination matrix" sub="Passenger flows between the 8 highest-volume stops (Spark SQL aggregation)" height={410}>
          <ODMatrix />
        </ChartCard>
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" style={{ marginTop: 16 }}>
        <ChartCard title="Network boarding profile by hour" sub="Direction-split demand — inbound dominates AM peak, outbound dominates PM peak" height={280}>
          <ResponsiveContainer>
            <BarChart data={hourlyDemand.map((h) => ({
              hour: h.hour,
              Inbound: Math.round(h.weekday * (parseInt(h.hour) < 12 ? 0.63 : 0.38)),
              Outbound: Math.round(h.weekday * (parseInt(h.hour) < 12 ? 0.37 : 0.62)),
            }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: INK.baseline }} interval={2} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
              <Tooltip content={<VizTooltip />} />
              <Legend />
              <Bar name="Inbound" dataKey="Inbound" stackId="d" fill={SERIES[0]} maxBarSize={20} />
              <Bar name="Outbound" dataKey="Outbound" stackId="d" fill={SERIES[1]} radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16 }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Stop-level performance</p>
        <p className="card-sub">All monitored stops · dwell, delay and bottleneck flags from Spark feature layer</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stop</th><th className="num">Boarding</th><th className="num">Alighting</th>
                <th className="num">Avg dwell (s)</th><th className="num">Avg delay (min)</th><th className="num">Routes</th><th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="num">{Math.round(s.boarding * scale).toLocaleString()}</td>
                  <td className="num">{Math.round(s.alighting * scale).toLocaleString()}</td>
                  <td className="num">{s.avgDwellSec}</td>
                  <td className="num">{s.avgDelay}</td>
                  <td className="num">{s.routesServed}</td>
                  <td>{s.bottleneck
                    ? <span className="badge" style={{ background: 'rgba(236,131,90,0.15)', color: '#ec835a' }}>Bottleneck</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </Page>
  )
}
