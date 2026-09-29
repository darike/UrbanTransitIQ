import React from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, Legend,
} from 'recharts'
import { Gauge, AlertOctagon, Bus, Percent } from 'lucide-react'
import {
  Page, PageHeader, KpiCard, ChartCard, VizTooltip, Meter, TimeTabs, staggerParent, riseIn, SERIES, INK, STATUS,
} from '../components/ui.jsx'
import { occupancyBands, highRiskTrips, occupancyTrend } from '../data/mockData'
import { useFilteredData } from '../FilterContext.jsx'

const BAND_COLORS = [SERIES[0], SERIES[2], SERIES[3], STATUS.serious, STATUS.critical]

export default function Occupancy() {
  const { routes: frs, kpi, scale, filters } = useFilteredData()
  const ids = new Set(frs.map((r) => r.id))
  const overcrowded = frs.filter((r) => r.occupancy >= 85)
  const riskTrips = highRiskTrips.filter((t) => ids.has(t.route))
  return (
    <Page>
      <PageHeader
        title="Occupancy & Crowding"
        subtitle={`Occupancy bands, persistent overcrowding, and crowding-risk prediction${filters.route !== 'all' ? ` · filtered: ${filters.route}` : ''}`}
        icon={Gauge} accent="#9085e9"
        right={<TimeTabs />}
      />

      <motion.div key={`${filters.range}-${filters.route}-${filters.occupancy}`} variants={staggerParent} initial="initial" animate="animate" className="grid kpi-grid">
        <KpiCard label="Avg Occupancy (selection)" value={kpi.avgOccupancy} decimals={1} suffix="%" delta={2.9} icon={Gauge} accent="#9085e9" />
        <KpiCard label="Capacity Utilization" value={+(kpi.avgOccupancy * 0.93).toFixed(1)} decimals={1} suffix="%" delta={1.4} icon={Percent} accent={SERIES[2]} />
        <KpiCard label="Overcrowded Trips" value={Math.round(5100 * scale * (frs.length / 12))} delta={8.2} deltaGood={false} icon={AlertOctagon} accent={STATUS.critical} vsLabel={filters.range} />
        <KpiCard label="High-Risk Trips (next 24h)" value={riskTrips.length} icon={Bus} accent={STATUS.serious} />
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-2" style={{ marginTop: 16 }}>
        <ChartCard title="Trips by occupancy band" sub="30-day distribution — categorisation: Low / Moderate / High / Overcrowded / Critical" height={280}>
          <ResponsiveContainer>
            <BarChart data={occupancyBands} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="band" tickLine={false} axisLine={{ stroke: INK.baseline }} tick={{ fontSize: 10.5 }} interval={0} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={34} />
              <Tooltip content={<VizTooltip />} />
              <Bar dataKey="trips" name="Trips" radius={[4, 4, 0, 0]} maxBarSize={44}
                label={{ position: 'top', fill: INK.secondary, fontSize: 11, formatter: (v) => `${(v / 1000).toFixed(1)}k` }}>
                {occupancyBands.map((_, i) => <Cell key={i} fill={BAND_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Occupancy trend — 12 months" sub="Average occupancy vs capacity utilization (same % scale)" height={280}>
          <ResponsiveContainer>
            <LineChart data={occupancyTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: INK.baseline }} interval={1} />
              <YAxis domain={[40, 90]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={38} />
              <Tooltip content={<VizTooltip formatter={(v) => `${v}%`} />} />
              <Legend />
              <Line name="Avg occupancy" type="monotone" dataKey="avgOccupancy" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line name="Capacity utilization" type="monotone" dataKey="capacityUtil" stroke={SERIES[2]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-2" style={{ marginTop: 16 }}>
        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Persistently overcrowded routes</p>
          <p className="card-sub">Repeated overload across days & direction — single-event spikes excluded</p>
          <table className="data-table">
            <thead>
              <tr><th>Route</th><th>Peak occupancy</th><th className="num">Critical events (30d)</th><th className="num">Persistence</th></tr>
            </thead>
            <tbody>
              {overcrowded.map((r) => (
                <tr key={r.id}>
                  <td>{r.id} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {r.name}</span></td>
                  <td><Meter pct={Math.min(r.occupancy + 18, 128)} color={STATUS.critical} /></td>
                  <td className="num">{r.id === 'R12' ? 18 : r.id === 'R07' ? 11 : 6}</td>
                  <td className="num">{r.id === 'R12' ? '87%' : r.id === 'R07' ? '64%' : '41%'} of weekdays</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Persistence = share of weekdays with ≥1 overload event in the same period+direction window.
          </p>
        </motion.div>

        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Crowding-risk prediction — next 24 h</p>
          <p className="card-sub">P(occupancy &gt; 90%) — GBT classifier, chronological validation, AUC 0.92</p>
          <table className="data-table">
            <thead>
              <tr><th>Trip</th><th>Route · time</th><th className="num">Pred. occ</th><th className="num">Risk</th></tr>
            </thead>
            <tbody>
              {riskTrips.map((t, i) => (
                <motion.tr key={t.trip} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <td>{t.trip}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.route} · {t.time} {t.dir}</td>
                  <td className="num" style={{ color: t.predOcc > 110 ? STATUS.critical : STATUS.serious, fontWeight: 700 }}>{t.predOcc}%</td>
                  <td className="num">{(t.risk * 100).toFixed(0)}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </Page>
  )
}
