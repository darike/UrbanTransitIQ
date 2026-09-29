import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Bus, Gauge, Clock, Target, TrendingUp as TrendIcon, AlertTriangle, ArrowDownRight,
  ChevronRight, Sparkles, Radio, AlertOctagon, Construction, Wrench, CarFront,
} from 'lucide-react'
import {
  Page, KpiCard, ChartCard, VizTooltip, AnimatedNumber, TimeTabs, staggerParent, riseIn, SERIES, INK, STATUS,
} from '../components/ui.jsx'
import MiniMap from '../components/MiniMap.jsx'
import { hourlyDemand } from '../data/mockData'
import { useFilteredData } from '../FilterContext.jsx'
import { useApi, SourceBadge } from '../api/client.jsx'

const DAYS = { 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90, 'Last 12 months': 365 }

/* ---- derived blocks (mirror the backend executive endpoint) ---- */
const SERVICE_STATUS = [
  { name: 'On Time', value: 1226, pct: 95.4, color: '#0ca30c' },
  { name: 'Delayed', value: 42, pct: 3.3, color: '#fab219' },
  { name: 'Severely Delayed', value: 12, pct: 0.9, color: '#d03b3b' },
  { name: 'Out of Service', value: 6, pct: 0.4, color: '#3987e5' },
]

const AI_RECS = [
  { icon: Bus, color: '#199e70', title: 'Add buses on Route R12', desc: 'High demand next 2 hours (Central → Industrial). Expected occupancy 95%+.', to: '/recommendations' },
  { icon: Clock, color: '#3987e5', title: 'Adjust frequency on R27', desc: 'Delays increasing due to congestion. Increase frequency by 20%.', to: '/recommendations' },
  { icon: ArrowDownRight, color: '#9085e9', title: 'Reroute buses near Stadium', desc: 'High crowd expected near Stadium East for live event tonight.', to: '/recommendations' },
]

const INCIDENTS = [
  { icon: AlertOctagon, sev: STATUS.critical, title: 'Major delay — signal issue', where: 'Old City Gate', ago: '12 min ago', delta: '+18 min' },
  { icon: Construction, sev: STATUS.serious, title: 'Road blockage', where: 'Harbor bridge, R27', ago: '28 min ago', delta: '+12 min' },
  { icon: Wrench, sev: STATUS.warning, title: 'Vehicle breakdown', where: 'V-118 · Route R31', ago: '42 min ago', delta: '+15 min' },
  { icon: CarFront, sev: STATUS.warning, title: 'Heavy congestion', where: 'City Mall corridor', ago: '1 hr ago', delta: '+10 min' },
]

const statChip = (accent) => ({
  background: `linear-gradient(150deg, ${accent}26, transparent 60%), var(--surface-1)`,
  border: `1px solid ${accent}44`,
  borderRadius: 14,
  padding: '13px 16px',
  display: 'flex', alignItems: 'center', gap: 12,
  boxShadow: 'var(--glow)',
})

export default function Executive() {
  const { routes: frs, kpi: mockKpi, filters } = useFilteredData()
  const qs = `?days=${DAYS[filters.range] || 30}${filters.route !== 'all' ? `&route_id=${filters.route.replace('R', 'R0')}` : ''}`
  const { data: api, live } = useApi(`/api/dashboards/executive${qs}`, null, [qs])

  // live backend numbers when available, filtered mock otherwise
  const kpi = api?.kpi ? {
    totalPassengers: api.kpi.total_passengers,
    totalTrips: api.kpi.total_trips,
    avgOccupancy: api.kpi.avg_occupancy,
    avgDelay: api.kpi.avg_delay,
    onTimePct: api.kpi.on_time_pct,
    highDemand: api.kpi.high_demand_routes,
    overcrowded: api.kpi.overcrowded_routes,
    underutilized: api.kpi.underutilized_routes,
  } : mockKpi
  const topRoutes = api?.top_routes
    ? api.top_routes.map((r) => ({ id: r.route_id, name: r.route_name, demand: r.demand, onTime: r.on_time, occupancy: r.occupancy, score: r.score, classification: r.classification }))
    : [...frs].sort((a, b) => b.score - a.score).slice(0, 7)
  const vs = filters.range.replace('Last ', 'prev. ')
  return (
    <Page>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>Executive Command Center</motion.h1>
          <p>
            Network-wide intelligence for a safer, smarter and more connected city
            {filters.route !== 'all' && <span style={{ color: 'var(--accent-2)', fontWeight: 700 }}> · filtered: {filters.route}</span>}
            {' '}<SourceBadge live={live} />
          </p>
          {api?.insight && live && (
            <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
              {api.insight}
            </p>
          )}
        </div>
        <TimeTabs />
      </div>

      {/* KPI row — reacts to the global filters */}
      <motion.div key={`${filters.range}-${filters.route}-${filters.occupancy}`} variants={staggerParent} initial="initial" animate="animate" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <KpiCard label="Total Passengers" value={kpi.totalPassengers} delta={6.8} icon={Users} accent="#3b82f6" vsLabel={vs} />
        <KpiCard label="Total Trips" value={kpi.totalTrips} delta={4.3} icon={Bus} accent="#199e70" vsLabel={vs} />
        <KpiCard label="Avg Occupancy" value={kpi.avgOccupancy} decimals={1} suffix="%" delta={12} icon={Gauge} accent="#9085e9" vsLabel={vs} />
        <KpiCard label="Avg Delay" value={kpi.avgDelay} decimals={1} suffix=" min" delta={-32} deltaGood icon={Clock} accent="#e66767" vsLabel={vs} />
        <KpiCard label="On-Time Performance" value={kpi.onTimePct} decimals={1} suffix="%" delta={5.2} icon={Target} accent="#0ca30c" vsLabel={vs} />
      </motion.div>

      {/* alert stat chips */}
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: 14 }}>
        {[
          { icon: TrendIcon, accent: '#3b82f6', label: 'High-Demand Routes', value: kpi.highDemand, sub: '> 85% avg. occupancy', to: '/routes' },
          { icon: Users, accent: '#e66767', label: 'Overcrowded Routes', value: kpi.overcrowded, sub: '> 100% peak occupancy', to: '/occupancy' },
          { icon: ArrowDownRight, accent: '#38bdf8', label: 'Underutilized Routes', value: kpi.underutilized, sub: 'reliable but < 60% occupancy', to: '/routes' },
          { icon: AlertTriangle, accent: '#fab219', label: 'Critical Alerts', value: 5, sub: 'require immediate attention', to: '/anomalies' },
        ].map((s) => (
          <motion.div key={s.label} variants={riseIn}>
            <Link to={s.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={statChip(s.accent)}>
                <span className="kpi-icon" style={{ background: `linear-gradient(135deg, ${s.accent}, ${s.accent}55)` }}>
                  <s.icon size={17} color="#fff" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}><AnimatedNumber value={s.value} /></div>
                  <div style={{ fontSize: 12, fontWeight: 650, color: 'var(--text-secondary)' }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.sub}</div>
                </div>
                <ChevronRight size={17} color="var(--text-muted)" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* network overview + right column */}
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid" style={{ gridTemplateColumns: '1.9fr 1fr', marginTop: 14 }}>
        <motion.div variants={riseIn} className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 10px' }}>
            <div>
              <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Network Overview</p>
              <p className="card-sub" style={{ margin: 0 }}>Live citywide transit operations · color = segment load</p>
            </div>
            <Link to="/network-map" className="btn btn-ghost" style={{ textDecoration: 'none', padding: '7px 12px', fontSize: 12 }}>
              <Radio size={13} /> Full live map
            </Link>
          </div>
          <MiniMap height={392} />
        </motion.div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          {/* service status donut */}
          <motion.div variants={riseIn} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Service Status</p>
              <span className="live-pill" style={{ padding: '3px 10px', fontSize: 11 }}><span className="live-dot" /> Live</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 130, height: 130, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={SERVICE_STATUS} dataKey="value" innerRadius={44} outerRadius={60} paddingAngle={3} strokeWidth={0} startAngle={90} endAngle={-270}>
                      {SERVICE_STATUS.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <b style={{ fontSize: 17 }}>95.4%</b>
                  <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>On Schedule</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                {SERVICE_STATUS.map((s) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.name}</span>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value.toLocaleString()}</b>
                    <span style={{ color: 'var(--text-muted)', width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI recommendations */}
          <motion.div variants={riseIn} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={15} color="#38bdf8" /> AI Recommendations
              </p>
              <Link to="/recommendations" style={{ fontSize: 11.5, color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {AI_RECS.map((r, i) => (
                <motion.div key={r.title} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.09 }}>
                  <Link to={r.to} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 11, border: '1px solid var(--border)' }}>
                      <span className="kpi-icon" style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${r.color}, ${r.color}55)` }}>
                        <r.icon size={15} color="#fff" />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>{r.desc}</div>
                      </div>
                      <ChevronRight size={15} color="var(--text-muted)" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* bottom row */}
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid" style={{ gridTemplateColumns: '1.4fr 1.2fr 1fr', marginTop: 14 }}>
        <ChartCard title="Passenger & Service Trends" sub="Hourly boardings — weekday vs weekend" height={252}>
          <ResponsiveContainer>
            <AreaChart data={hourlyDemand} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gW1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gW2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d55181" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#d55181" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: INK.baseline }} interval={3} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={34} />
              <Tooltip content={<VizTooltip />} />
              <Legend iconType="plainline" />
              <Area name="Weekday" type="monotone" dataKey="weekday" stroke="#3b82f6" strokeWidth={2} fill="url(#gW1)" dot={false} activeDot={{ r: 4 }} />
              <Area name="Weekend" type="monotone" dataKey="weekend" stroke="#d55181" strokeWidth={2} fill="url(#gW2)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* route health ranking */}
        <motion.div variants={riseIn} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Route Health Ranking</p>
            <Link to="/routes" style={{ fontSize: 11.5, color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Route</th><th className="num">On-time</th><th className="num">Occ</th><th>Health</th></tr>
            </thead>
            <tbody>
              {topRoutes.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td>{r.id}</td>
                  <td className="num" style={{ color: r.onTime < 70 ? STATUS.serious : 'inherit' }}>{r.onTime}%</td>
                  <td className="num">{r.occupancy}%</td>
                  <td style={{ minWidth: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(99,139,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.score}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                          style={{ height: '100%', borderRadius: 4, background: r.score >= 75 ? 'linear-gradient(90deg,#0ca30c,#4ec44e)' : r.score >= 50 ? 'linear-gradient(90deg,#c98500,#fab219)' : 'linear-gradient(90deg,#d03b3b,#e66767)' }} />
                      </div>
                      <b style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{r.score}</b>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* incidents */}
        <motion.div variants={riseIn} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Recent Incidents</p>
            <Link to="/anomalies" style={{ fontSize: 11.5, color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {INCIDENTS.map((inc, i) => (
              <motion.div key={inc.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.08 }}
                style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 11, border: '1px solid var(--border)' }}>
                <inc.icon size={16} color={inc.sev} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{inc.where} · {inc.ago}</div>
                </div>
                <span className="badge" style={{ background: `${inc.sev}1e`, color: inc.sev, fontSize: 10.5 }}>{inc.delta}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Page>
  )
}
