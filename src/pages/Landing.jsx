import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bus, ArrowRight, Database, BrainCircuit, Map, GitCompare, Gauge, TrendingUp,
  Clock, Users, ShieldCheck, HardDrive, Cpu, Sparkles, ChevronRight,
  UserCog, Wrench, LineChart, ClipboardCheck, FolderCog, Layers, Braces, Scale, LayoutDashboard,
} from 'lucide-react'
import { AnimatedNumber } from '../components/ui.jsx'
import Logo from '../components/Logo.jsx'

const ease = [0.22, 1, 0.36, 1]
const BLUE = '#3b82f6'
const CYAN = '#38bdf8'

const glass = {
  background: 'linear-gradient(160deg, rgba(99,139,255,0.08), rgba(10,16,31,0.6) 60%)',
  border: '1px solid rgba(99,139,255,0.18)',
  borderRadius: 18,
  boxShadow: '0 20px 60px rgba(3, 10, 30, 0.6), inset 0 1px 0 rgba(148,178,255,0.12)',
  backdropFilter: 'blur(6px)',
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ================= hero network-model card ================= */
function NetworkModelCard() {
  // diagonal glowing traffic streams, like a stylised route network render
  const rows = Array.from({ length: 16 }, (_, i) => i)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease }}
      style={{ ...glass, position: 'relative', overflow: 'hidden', padding: 0, minHeight: 380 }}
    >
      {/* header row */}
      <div style={{ position: 'absolute', top: 16, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', zIndex: 3, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#cfe0ff', fontWeight: 700 }}>
          <span className="live-dot" /> Network model
        </span>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>100 routes · 500 stops</span>
      </div>

      {/* animated stream field */}
      <svg viewBox="0 0 620 420" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fadeX" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="18%" stopColor="#fff" stopOpacity="1" />
            <stop offset="82%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <mask id="edgeMask"><rect width="620" height="420" fill="url(#fadeX)" /></mask>
        </defs>
        <g transform="translate(-40, 70) rotate(-14)" mask="url(#edgeMask)">
          {rows.map((i) => {
            const y = i * 26
            const bright = i % 4 === 0
            const color = bright ? CYAN : BLUE
            const dur = 5 + (i % 5) * 1.4
            return (
              <g key={i}>
                <line x1={-100} y1={y} x2={800} y2={y} stroke={color} strokeOpacity={0.1} strokeWidth={bright ? 3 : 2} />
                <motion.line
                  x1={-100} y1={y} x2={800} y2={y}
                  stroke={color} strokeOpacity={bright ? 0.95 : 0.5}
                  strokeWidth={bright ? 3 : 2} strokeLinecap="round"
                  strokeDasharray={bright ? '46 140' : '22 110'}
                  animate={{ strokeDashoffset: [0, -372] }}
                  transition={{ duration: dur, repeat: Infinity, ease: 'linear' }}
                  style={{ filter: bright ? `drop-shadow(0 0 6px ${color})` : 'none' }}
                />
                {bright && (
                  <motion.circle
                    r={3.4} fill="#fff"
                    animate={{ cx: [-60, 780], cy: y }}
                    transition={{ duration: dur * 1.35, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
                    style={{ filter: `drop-shadow(0 0 8px ${CYAN})` }}
                  />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* floating stat chips */}
      <motion.div
        animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ ...glass, position: 'absolute', top: 74, right: 20, padding: '12px 16px', zIndex: 3, borderRadius: 14 }}
      >
        <div style={{ fontSize: 24, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em' }}>
          <AnimatedNumber value={88.9} decimals={1} suffix="%" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>crowding-risk model accuracy</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SRS target ≥ 85% · F1 0.86</div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 9, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ ...glass, position: 'absolute', bottom: 92, left: 20, padding: '12px 16px', zIndex: 3, borderRadius: 14 }}
      >
        <div style={{ fontSize: 24, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em' }}>
          <AnimatedNumber value={78.2} decimals={1} suffix="%" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>trips on time network-wide</div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ ...glass, position: 'absolute', top: 160, left: '42%', padding: '10px 14px', zIndex: 3, borderRadius: 14 }}
      >
        <div style={{ fontSize: 19, fontWeight: 850, color: '#fff' }}><AnimatedNumber value={91.7} decimals={1} suffix="%" /></div>
        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Spark ↔ Python agreement</div>
      </motion.div>

      {/* caption */}
      <div style={{ position: 'absolute', left: 18, right: 18, bottom: 14, zIndex: 3, fontSize: 10.5, color: 'var(--text-muted)', borderTop: '1px solid rgba(99,139,255,0.14)', paddingTop: 10 }}>
        Rendered from the project's route network · historical synthetic dataset (Phase-1 generator) — not live operator data
      </div>
    </motion.div>
  )
}

/* ================= data ================= */
const NAV_LINKS = [
  ['Platform', 'platform'], ['Pipeline', 'pipeline'], ['Intelligence', 'intelligence'], ['Models', 'models'], ['Roles', 'roles'],
]

const FEATURES = [
  { icon: Database, title: 'Big Data Pipeline', desc: 'Hadoop HDFS + Apache Spark ingest and clean 2.4M+ ticketing records into partitioned Parquet.' },
  { icon: BrainCircuit, title: 'Dual ML Pipelines', desc: 'Spark MLlib and an independent Python pipeline solve the same problems — every prediction cross-verified.' },
  { icon: TrendingUp, title: 'Demand Forecasting', desc: 'Chronologically-validated forecasts beat the naive baseline by 55%+ MAE, event-aware peaks included.' },
  { icon: Gauge, title: 'Crowding Intelligence', desc: 'Persistent overcrowding detection and next-24h crowding-risk per trip, direction and period.' },
  { icon: Clock, title: 'Delay Analytics', desc: 'Day×hour heatmaps, recurring-pattern mining, bottleneck stops, 5-class severity prediction.' },
  { icon: Map, title: 'Live Network Map', desc: 'Satellite night map with live vehicles, glowing segment load and pulsing delay hotspots.' },
  { icon: GitCompare, title: 'Model Comparison', desc: '120 unseen cases compared Spark-vs-Python with agreement %, probability deltas, explanations.' },
  { icon: Sparkles, title: 'Evidence-Based Actions', desc: 'Every recommendation ships with its supporting numbers — no unexplained suggestions.' },
]

const PIPELINE_STEPS = [
  { icon: FolderCog, label: 'Dataset Generator', sub: '2.41M tickets · 12 months', color: '#9085e9' },
  { icon: HardDrive, label: 'HDFS Raw Zone', sub: 'CSV · JSON · GPS events', color: '#3b82f6' },
  { icon: Layers, label: 'Spark Clean + Join', sub: '9 tables · quarantine kept', color: '#38bdf8' },
  { icon: Braces, label: 'Feature Layer', sub: '23 features · Parquet', color: '#199e70' },
  { icon: BrainCircuit, label: 'Dual ML Training', sub: 'MLlib ∥ scikit-learn/XGBoost', color: '#d55181' },
  { icon: Scale, label: 'Result Comparison', sub: '91.7% agreement · 120 cases', color: '#c98500' },
  { icon: LayoutDashboard, label: 'Dashboards + API', sub: 'FastAPI → React', color: '#0ca30c' },
]

const MODELS = [
  {
    name: 'Spark MLlib', model: 'Random Forest · delay severity', color: BLUE,
    stats: [['Accuracy', '87.2%'], ['F1-score', '0.84'], ['AUC', '0.90'], ['Version', 'v3.2']],
  },
  {
    name: 'Python DS', model: 'XGBoost · delay severity', color: '#199e70', best: true,
    stats: [['Accuracy', '88.9%'], ['F1-score', '0.86'], ['AUC', '0.92'], ['Version', 'v2.7']],
  },
  {
    name: 'Forecasting', model: 'GBT + XGBoost vs naive baseline', color: '#c98500',
    stats: [['MAPE', '3.1%'], ['R²', '0.93'], ['MAE vs baseline', '−58%'], ['Validation', 'chronological']],
  },
]

const ROLES = [
  { icon: UserCog, role: 'Administrator', creds: 'admin / admin123', desc: 'Full control — users, thresholds, audit trail, Spark job monitor.', color: '#e66767' },
  { icon: Wrench, role: 'Transport Operator', creds: 'operator / operator123', desc: 'Live operations — occupancy, delays, schedule actions.', color: '#c98500' },
  { icon: LineChart, role: 'Analyst', creds: 'analyst / analyst123', desc: 'Deep analytics — forecasting, clustering, what-if simulation.', color: '#3b82f6' },
  { icon: ClipboardCheck, role: 'Evaluator', creds: 'evaluator / evaluator123', desc: 'Read-only jury access to every dashboard, report and model result.', color: '#199e70' },
]

/* ================= page ================= */
export default function Landing({ loggedIn = false }) {
  const navigate = useNavigate()
  const enter = () => navigate(loggedIn ? '/' : '/login')

  return (
    <div style={{ background: 'var(--page)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ======= nav ======= */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease }}
        style={{
          position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 26,
          padding: '13px 34px', background: 'rgba(4,7,15,0.78)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Logo size={34} />
          <b style={{ fontSize: 15 }}>UrbanTransit <span style={{ color: CYAN }}>IQ</span></b>
        </span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 18 }}>
          {NAV_LINKS.map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 550, color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(99,139,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
            >{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={enter} style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-secondary)', padding: '8px 12px' }}>
            {loggedIn ? 'Dashboard' : 'Sign in'}
          </button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn btn-primary" onClick={enter}>
            Get started
          </motion.button>
        </div>
      </motion.nav>

      {/* ======= hero ======= */}
      <section style={{ position: 'relative', padding: '76px 34px 84px' }}>
        {/* backdrop */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(760px 420px at 22% 18%, rgba(37,99,235,0.16), transparent),
                       radial-gradient(700px 420px at 85% 60%, rgba(56,189,248,0.1), transparent)`,
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          backgroundImage: 'linear-gradient(rgba(99,139,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,139,255,0.05) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(900px 600px at 40% 30%, #000, transparent)',
        }} />

        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 54, alignItems: 'center' }}>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em',
                color: '#8fb3ff', border: '1px solid rgba(99,139,255,0.3)', background: 'rgba(59,130,246,0.08)',
                borderRadius: 999, padding: '7px 16px', marginBottom: 26, textTransform: 'uppercase',
              }}
            >
              <span className="live-dot" /> Big Data · Data Science · Public Transport
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1, ease }}
              style={{ fontSize: 'clamp(38px, 4.6vw, 62px)', lineHeight: 1.05, margin: '0 0 22px', letterSpacing: '-0.03em', fontWeight: 800 }}
            >
              Turn <span style={{ color: BLUE, textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>2.4M</span> transport
              records into <span style={{
                background: `linear-gradient(90deg, ${BLUE}, ${CYAN})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>service decisions.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22, ease }}
              style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.7, margin: '0 0 30px' }}
            >
              UrbanTransit IQ ingests ticketing, schedules, passenger counts, delays and GPS through
              <b style={{ color: '#dbe7ff' }}> Hadoop and Spark</b>, cleans and joins them, trains
              <b style={{ color: '#dbe7ff' }}> two independent ML pipelines</b> and turns the results into
              evidence-backed schedule recommendations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32, ease }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 26 }}
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-primary"
                style={{ padding: '14px 26px', fontSize: 14.5 }} onClick={enter}>
                Sign in to the workspace <ArrowRight size={16} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-ghost"
                style={{ padding: '14px 26px', fontSize: 14.5 }} onClick={() => navigate('/login')}>
                Evaluator access
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
            >
              {[[HardDrive, 'Stored on real HDFS'], [Cpu, 'Spark MLlib + scikit-learn'], [ShieldCheck, 'No generative-AI decisions']].map(([Icon, t]) => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 650,
                  color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'rgba(16,26,48,0.6)',
                  borderRadius: 999, padding: '7px 14px',
                }}>
                  <Icon size={13} color={CYAN} /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          <NetworkModelCard />
        </div>
      </section>

      {/* ======= stats band ======= */}
      <section id="intelligence" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(10,16,31,0.9), rgba(6,10,22,0.9))' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '38px 34px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 26 }}>
          {[
            { v: 2412480, label: 'Ticketing records' },
            { v: 100, label: 'Routes' },
            { v: 500, label: 'Stops' },
            { v: 250, label: 'Vehicles' },
            { v: 12, label: 'Months of history' },
            { v: 250000, label: 'Delay records' },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07, ease }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.02em', background: `linear-gradient(180deg, #fff, #9fc1ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                <AnimatedNumber value={s.v} />{s.v >= 1000 ? '+' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= platform features ======= */}
      <section id="platform" style={{ maxWidth: 1240, margin: '0 auto', padding: '78px 34px 30px' }}>
        <SectionTitle kicker="Platform" title="Insights, not just charts" sub="Every SRS capability — from HDFS ingestion to what-if simulation — in one role-aware workspace." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 16, marginTop: 38 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.08, ease }}
              whileHover={{ y: -6 }}
              style={{ ...glass, padding: 20, display: 'grid', gap: 10 }}
            >
              <span style={{ background: 'rgba(59,130,246,0.14)', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,139,255,0.25)' }}>
                <f.icon size={19} color={CYAN} />
              </span>
              <b style={{ fontSize: 14.5 }}>{f.title}</b>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= pipeline ======= */}
      <section id="pipeline" style={{ maxWidth: 1240, margin: '0 auto', padding: '78px 34px 30px' }}>
        <SectionTitle kicker="Pipeline" title="From raw tickets to decisions" sub="Phase-by-phase Big Data flow, exactly as submitted — every stage has code, logs and outputs in the repo." />
        <div style={{
          display: 'grid', gap: 14, marginTop: 38,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        }}>
          {PIPELINE_STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08, ease }}
              whileHover={{ y: -5 }}
              style={{ ...glass, padding: '18px 16px', position: 'relative', display: 'grid', gap: 9, justifyItems: 'center', textAlign: 'center' }}
            >
              <span style={{
                position: 'absolute', top: 10, left: 12, fontSize: 11, fontWeight: 850,
                color: s.color, letterSpacing: '0.08em',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight size={15} style={{
                  position: 'absolute', top: 12, right: 8, color: 'rgba(99,139,255,0.5)',
                }} />
              )}
              <span className="kpi-icon" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}55)`, boxShadow: `0 6px 20px ${s.color}55` }}>
                <s.icon size={17} color="#fff" />
              </span>
              <b style={{ fontSize: 13 }}>{s.label}</b>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= models ======= */}
      <section id="models" style={{ maxWidth: 1240, margin: '0 auto', padding: '78px 34px 30px' }}>
        <SectionTitle kicker="Models" title="Two pipelines, one truth" sub="Spark MLlib and Python solve the same problems independently — then 120 unseen cases decide who's right." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 38 }}>
          {MODELS.map((m, i) => (
            <motion.div key={m.name}
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              style={{
                ...glass, padding: 22, position: 'relative',
                borderColor: m.best ? 'rgba(25,158,112,0.5)' : glass.border.split(' ').pop(),
                boxShadow: m.best ? '0 0 0 1px rgba(25,158,112,0.3), 0 20px 60px rgba(3,10,30,0.6)' : glass.boxShadow,
              }}
            >
              {m.best && (
                <span className="badge" style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(25,158,112,0.16)', color: '#31d98c' }}>
                  best on test set
                </span>
              )}
              <div style={{ fontSize: 12, fontWeight: 800, color: m.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{m.name}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, margin: '4px 0 16px' }}>{m.model}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {m.stats.map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(16,26,48,0.75)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 22 }}>
          Chronological train/validation/test split · no future leakage · Spark predictions never reused as Python results (SRS integrity rules)
        </motion.p>
      </section>

      {/* ======= roles ======= */}
      <section id="roles" style={{ maxWidth: 1240, margin: '0 auto', padding: '78px 34px 40px' }}>
        <SectionTitle kicker="Roles" title="Built for every seat in the control room" sub="JWT + role-based access — the jury gets its own evaluator account." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 38 }}>
          {ROLES.map((r, i) => (
            <motion.div key={r.role}
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.09, ease }}
              whileHover={{ y: -5 }}
              style={{ ...glass, padding: 20, display: 'grid', gap: 9 }}
            >
              <span className="kpi-icon" style={{ background: `linear-gradient(135deg, ${r.color}, ${r.color}55)`, boxShadow: `0 6px 20px ${r.color}55` }}>
                <r.icon size={17} color="#fff" />
              </span>
              <b style={{ fontSize: 14.5 }}>{r.role}</b>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.desc}</span>
              <code style={{ fontSize: 11.5, color: CYAN, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '5px 10px', justifySelf: 'start' }}>
                {r.creds}
              </code>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= CTA ======= */}
      <section style={{ padding: '20px 34px 90px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}
          style={{
            ...glass, maxWidth: 880, margin: '0 auto', textAlign: 'center', padding: '56px 34px',
            background: `radial-gradient(640px 320px at 50% -20%, rgba(37,99,235,0.28), transparent), ${glass.background}`,
          }}
        >
          <Users size={30} color={CYAN} style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: 28, margin: '0 0 10px', letterSpacing: '-0.02em', fontWeight: 800 }}>
            The whole network. One workspace.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.65 }}>
            14 dashboards, a live map, dual-pipeline verification, downloadable reports and a Power BI layer —
            everything the SRS asks for, and the evidence behind it.
          </p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: 15 }} onClick={enter}>
            {loggedIn ? 'Back to dashboard' : 'Sign in to UrbanTransit IQ'} <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '22px 34px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        UrbanTransit IQ · TechWiz 7 — The World Tech Championship · Theme: TransitVerse Intelligence · Category: Data Science Intelligence Arena
      </footer>
    </div>
  )
}

function SectionTitle({ kicker, title, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
        style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.16em', color: '#8fb3ff', textTransform: 'uppercase', marginBottom: 12 }}
      >
        — {kicker} —
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.08 }}
        style={{ fontSize: 32, margin: '0 0 10px', letterSpacing: '-0.02em', fontWeight: 800 }}
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.16 }}
        style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14, maxWidth: 560, marginInline: 'auto', lineHeight: 1.6 }}
      >
        {sub}
      </motion.p>
    </div>
  )
}
