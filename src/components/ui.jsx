import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, AlertOctagon, Info, ShieldAlert, ChevronRight } from 'lucide-react'
import { useFilters } from '../FilterContext.jsx'

/* ---------- theme constants (chart palette, dark-surface validated) ---------- */
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b', info: '#3987e5' }
export const INK = { primary: '#ffffff', secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', baseline: '#383835' }

/* ---------- motion presets ---------- */
export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

export const staggerParent = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export const riseIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

export function Page({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, subtitle, right, icon: Icon, accent = '#3b82f6' }) {
  return (
    <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        {Icon && (
          <motion.span
            initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="kpi-icon"
            style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${accent}, ${accent}55)`, boxShadow: `0 6px 22px ${accent}55` }}
          >
            <Icon size={21} color="#fff" />
          </motion.span>
        )}
        <div>
          <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>{title}</motion.h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

/* ---------- segmented time-range tabs (wired to global filters) ---------- */
const RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months']
const RANGE_SHORT = { 'Last 7 days': '7 Days', 'Last 30 days': '30 Days', 'Last 90 days': '90 Days', 'Last 12 months': '12 Months' }

export function TimeTabs() {
  const { filters, setFilters } = useFilters()
  return (
    <div className="seg-tabs">
      {RANGES.map((r) => (
        <button
          key={r}
          className={`seg-tab ${filters.range === r ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, range: r }))}
        >
          {RANGE_SHORT[r]}
        </button>
      ))}
    </div>
  )
}

/* ---------- animated number ---------- */
export function AnimatedNumber({ value, decimals = 0, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value])
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-US')
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>
}

/* ---------- sparkline (tiny inline trend) ---------- */
export function Sparkline({ data, color = SERIES[0], height = 26 }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - 3 - ((v - min) / span) * (height - 6)}`).join(' ')
  const id = React.useId()
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${id})`} />
      <motion.polyline
        points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/* deterministic pseudo-random spark data seeded by label */
function sparkFrom(label, up = true) {
  let h = 0
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) % 997
  return Array.from({ length: 14 }, (_, i) => {
    h = (h * 137 + 71) % 997
    const noise = (h / 997) * 30
    const trend = up ? i * 3 : (13 - i) * 3
    return 20 + trend + noise
  })
}

/* ---------- KPI tile (command-center style) ---------- */
export function KpiCard({ label, value, decimals = 0, suffix = '', prefix = '', delta, deltaGood, icon: Icon, accent = SERIES[0], vsLabel = 'vs last period' }) {
  const up = delta != null && delta >= 0
  const good = deltaGood == null ? up : deltaGood
  const spark = sparkFrom(label, delta == null ? true : up)
  return (
    <motion.div
      variants={riseIn}
      className="kpi-tile"
      whileHover={{ y: -3 }}
      style={{
        borderColor: `${accent}3d`,
        boxShadow: `0 0 0 1px ${accent}22, 0 10px 30px rgba(4, 10, 30, 0.6), inset 0 1px 0 ${accent}1a`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {Icon && (
          <span className="kpi-icon" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)`, boxShadow: `0 4px 16px ${accent}66` }}>
            <Icon size={17} color="#fff" />
          </span>
        )}
        <p className="card-title" style={{ margin: 0, fontSize: 12.5, flex: 1 }}>{label}</p>
        <ChevronRight size={15} color="var(--text-muted)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} prefix={prefix} />
        </span>
        {delta != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: good ? '#4ec44e' : '#e66767', fontWeight: 700 }}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {delta != null && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>{vsLabel}</div>}
      <div style={{ margin: '8px -4px -2px' }}>
        <Sparkline data={spark} color={accent} />
      </div>
    </motion.div>
  )
}

/* ---------- chart card ---------- */
export function ChartCard({ title, sub, children, height = 300, actions }) {
  return (
    <motion.div variants={riseIn} className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>{title}</p>
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {actions}
      </div>
      <div style={{ width: '100%', height }}>{children}</div>
    </motion.div>
  )
}

/* ---------- recharts tooltip ---------- */
export function VizTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tooltip">
      {label != null && <div className="tt-label">{label}</div>}
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}</span>
          <b>{formatter ? formatter(p.value, p.name) : (typeof p.value === 'number' ? p.value.toLocaleString('en-US') : p.value)}</b>
        </div>
      ))}
    </div>
  )
}

/* ---------- badges ---------- */
const CLASS_COLORS = {
  'High Performing': { bg: 'rgba(12,163,12,0.14)', fg: '#4ec44e' },
  'High Demand, Unreliable': { bg: 'rgba(236,131,90,0.14)', fg: '#ec835a' },
  'Reliable, Underutilized': { bg: 'rgba(144,133,233,0.14)', fg: '#9085e9' },
  'Overcrowded': { bg: 'rgba(208,59,59,0.16)', fg: '#e66767' },
  'Low Performing': { bg: 'rgba(137,135,129,0.16)', fg: '#c3c2b7' },
}

export function ClassBadge({ value }) {
  const c = CLASS_COLORS[value] || CLASS_COLORS['Low Performing']
  return <span className="badge" style={{ background: c.bg, color: c.fg }}>{value}</span>
}

const SEV = {
  critical: { icon: AlertOctagon, color: STATUS.critical, label: 'Critical' },
  serious: { icon: ShieldAlert, color: STATUS.serious, label: 'Serious' },
  warning: { icon: AlertTriangle, color: STATUS.warning, label: 'Warning' },
  info: { icon: Info, color: STATUS.info, label: 'Info' },
}

export function SeverityBadge({ level }) {
  const s = SEV[level] || SEV.info
  const Icon = s.icon
  return (
    <span className="badge" style={{ background: `${s.color}22`, color: s.color }}>
      <Icon size={12} /> {s.label}
    </span>
  )
}

export function PriorityBadge({ value }) {
  const map = { Critical: STATUS.critical, High: STATUS.serious, Medium: STATUS.warning, Low: STATUS.info }
  const c = map[value] || STATUS.info
  return <span className="badge" style={{ background: `${c}22`, color: c }}>{value}</span>
}

/* ---------- occupancy bar (inline meter) ---------- */
export function Meter({ pct, color }) {
  const c = color || (pct >= 90 ? STATUS.critical : pct >= 70 ? STATUS.warning : SERIES[0])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(pct, 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: c, borderRadius: 4 }}
        />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', width: 38, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}
