import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, User, ChevronRight, Mail, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Home,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import {
  apiLogin, apiRegister, apiVerify, apiRequestReset, apiResetPassword,
} from '../api/client.jsx'

const ease = [0.22, 1, 0.36, 1]

// offline fallback only — real auth is FastAPI JWT + bcrypt
const DEMO = {
  admin: ['admin123', 'Administrator'], operator: ['operator123', 'Operator'],
  analyst: ['analyst123', 'Analyst'], evaluator: ['evaluator123', 'Evaluator'],
}

/* ---------- shared field ---------- */
function Field({ icon: Icon, label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
      {label}
      <div style={{ position: 'relative' }}>
        <Icon size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
        <input
          type={type} value={value} placeholder={placeholder} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', paddingLeft: 36, padding: '11px 12px 11px 36px', borderRadius: 10, fontSize: 14 }}
        />
      </div>
    </label>
  )
}

function Banner({ kind, children }) {
  const c = kind === 'error' ? '#e66767' : kind === 'info' ? '#38bdf8' : '#4ec44e'
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: `${c}18`, border: `1px solid ${c}44`, color: c, borderRadius: 10, padding: '9px 13px', fontSize: 12.5, lineHeight: 1.55 }}>
      {children}
    </motion.div>
  )
}

function Submit({ busy, children }) {
  return (
    <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} className="btn btn-primary"
      type="submit" disabled={busy}
      style={{ justifyContent: 'center', padding: '13px 16px', marginTop: 4, opacity: busy ? 0.7 : 1, fontSize: 14.5 }}>
      {busy ? 'Please wait…' : children} <ChevronRight size={16} />
    </motion.button>
  )
}

/* ---------- brand panel (left) ---------- */
function BrandPanel() {
  const rows = Array.from({ length: 11 }, (_, i) => i)
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '48px 46px',
      background: 'radial-gradient(700px 500px at 20% 0%, rgba(37,99,235,0.25), transparent), linear-gradient(160deg, #0c1733, #060b18)',
    }}>
      {/* animated route streams */}
      <svg viewBox="0 0 600 700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }} preserveAspectRatio="xMidYMid slice">
        <g transform="rotate(-16 300 350)">
          {rows.map((i) => (
            <motion.line key={i} x1={-120} y1={i * 64} x2={760} y2={i * 64}
              stroke={i % 3 === 0 ? '#38bdf8' : '#3b82f6'} strokeWidth={i % 3 === 0 ? 2.6 : 1.6}
              strokeOpacity={i % 3 === 0 ? 0.8 : 0.4} strokeLinecap="round"
              strokeDasharray={i % 3 === 0 ? '40 130' : '18 100'}
              animate={{ strokeDashoffset: [0, -340] }}
              transition={{ duration: 6 + (i % 5) * 1.3, repeat: Infinity, ease: 'linear' }}
              style={i % 3 === 0 ? { filter: 'drop-shadow(0 0 6px #38bdf8)' } : undefined}
            />
          ))}
        </g>
      </svg>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={46} animate />
          <div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>UrbanTransit <span style={{ color: '#38bdf8' }}>IQ</span></div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TransitVerse Intelligence</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }}
          style={{ fontSize: 34, lineHeight: 1.15, margin: '0 0 14px', letterSpacing: '-0.02em', fontWeight: 800 }}>
          The city's transit network,<br />
          <span style={{ background: 'linear-gradient(90deg,#3b82f6,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            decoded by Big Data.
          </span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7, maxWidth: 380, margin: '0 0 22px' }}>
          2.06M ticketing records → Hadoop + Spark → dual ML pipelines →
          evidence-backed schedule decisions.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['86.7%', 'model accuracy'], ['+31%', 'vs naive forecast'], ['99.2%', 'pipeline agreement']].map(([v, l]) => (
            <span key={l} style={{
              background: 'rgba(16,26,48,0.8)', border: '1px solid var(--border-strong)', borderRadius: 11,
              padding: '8px 13px', fontSize: 11.5, color: 'var(--text-secondary)',
            }}>
              <b style={{ color: '#fff', fontSize: 14, marginRight: 6 }}>{v}</b>{l}
            </span>
          ))}
        </motion.div>
      </div>

      <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-muted)' }}>
        TechWiz 7 · Data Science Intelligence Arena · role-based access, JWT-secured
      </div>
    </div>
  )
}

/* ================================ page ================================ */
export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')   // signin|register|verify|forgot|reset
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)   // {kind, text}

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [pendingUser, setPendingUser] = useState('')

  const go = (m) => { setMode(m); setError(''); setNotice(null); setCode('') }

  const wrap = (fn) => async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try { await fn() } catch (err) {
      const msg = String(err.message || err)
      if (msg.includes('403')) { setPendingUser(username.trim().toLowerCase()); go('verify'); setNotice({ kind: 'info', text: 'Your email is not verified yet — enter the code that was sent to you.' }) }
      else if (msg.includes('401')) setError('Invalid username or password.')
      else if (msg.includes('409')) setError('Username or email already registered.')
      else if (msg.includes('422')) setError('Check your input: username 3-24 chars, valid email, password 8+ chars.')
      else if (msg.includes('400')) setError('Invalid or expired code.')
      else {
        // backend unreachable → offline demo fallback for sign-in only
        const u = username.trim().toLowerCase()
        if (mode === 'signin' && DEMO[u] && DEMO[u][0] === password) {
          onLogin({ name: u.charAt(0).toUpperCase() + u.slice(1), role: DEMO[u][1], live: false }); return
        }
        setError('Backend offline — account features need the API. Demo sign-in: admin / admin123.')
      }
    }
    setBusy(false)
  }

  const doSignin = wrap(async () => {
    const user = await apiLogin(username.trim(), password)
    onLogin({ ...user, live: true })
  })

  const doRegister = wrap(async () => {
    if (password !== confirm) { setError('Passwords do not match.'); return }
    const out = await apiRegister(username.trim(), email.trim(), password)
    setPendingUser(out.username)
    go('verify')
    setNotice({ kind: 'info', text: out.dev_code ? `${out.message}. Demo code: ${out.dev_code}` : out.message })
  })

  const doVerify = wrap(async () => {
    const user = await apiVerify(pendingUser || username.trim(), code)
    onLogin({ ...user, live: true })
  })

  const doForgot = wrap(async () => {
    const out = await apiRequestReset(username.trim() || email.trim())
    setPendingUser(out.username || username.trim())
    go('reset')
    setNotice({ kind: 'info', text: out.dev_code ? `${out.message}. Demo code: ${out.dev_code}` : out.message })
  })

  const doReset = wrap(async () => {
    if (password !== confirm) { setError('Passwords do not match.'); return }
    const out = await apiResetPassword(pendingUser, code, password)
    go('signin')
    setNotice({ kind: 'ok', text: out.message })
    setPassword(''); setConfirm('')
  })

  const flows = {
    signin: {
      title: 'Welcome back', sub: 'Sign in to your workspace',
      form: (
        <form onSubmit={doSignin} style={{ display: 'grid', gap: 14 }}>
          <Field icon={User} label="Username or email" value={username} onChange={setUsername} placeholder="admin" autoFocus />
          <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <div style={{ textAlign: 'right', marginTop: -6 }}>
            <button type="button" onClick={() => go('forgot')} style={{ fontSize: 12, color: 'var(--accent-2)', fontWeight: 650 }}>
              Forgot password?
            </button>
          </div>
          <Submit busy={busy}>Sign in</Submit>
        </form>
      ),
      footer: <>New here? <button onClick={() => go('register')} style={{ color: 'var(--accent-2)', fontWeight: 700 }}>Create an account</button></>,
    },
    register: {
      title: 'Create your account', sub: 'Analyst access — verified by email',
      form: (
        <form onSubmit={doRegister} style={{ display: 'grid', gap: 14 }}>
          <Field icon={User} label="Username" value={username} onChange={setUsername} placeholder="your_username" autoFocus />
          <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field icon={Lock} label="Password (8+ chars)" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <Field icon={Lock} label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
          <Submit busy={busy}>Create account</Submit>
        </form>
      ),
      footer: <>Already registered? <button onClick={() => go('signin')} style={{ color: 'var(--accent-2)', fontWeight: 700 }}>Sign in</button></>,
    },
    verify: {
      title: 'Verify your email', sub: `Enter the 6-digit code sent to your inbox`,
      icon: ShieldCheck,
      form: (
        <form onSubmit={doVerify} style={{ display: 'grid', gap: 14 }}>
          <Field icon={KeyRound} label="Verification code" value={code} onChange={setCode} placeholder="123456" autoFocus />
          <Submit busy={busy}>Verify & sign in</Submit>
        </form>
      ),
      footer: <button onClick={() => go('signin')} style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={13} /> Back to sign in</button>,
    },
    forgot: {
      title: 'Reset your password', sub: 'We will email you a reset code',
      form: (
        <form onSubmit={doForgot} style={{ display: 'grid', gap: 14 }}>
          <Field icon={User} label="Username or email" value={username} onChange={setUsername} placeholder="admin or you@example.com" autoFocus />
          <Submit busy={busy}>Send reset code</Submit>
        </form>
      ),
      footer: <button onClick={() => go('signin')} style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={13} /> Back to sign in</button>,
    },
    reset: {
      title: 'Choose a new password', sub: 'Code is valid for 15 minutes',
      form: (
        <form onSubmit={doReset} style={{ display: 'grid', gap: 14 }}>
          <Field icon={KeyRound} label="Reset code" value={code} onChange={setCode} placeholder="123456" autoFocus />
          <Field icon={Lock} label="New password (8+ chars)" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <Field icon={Lock} label="Confirm new password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
          <Submit busy={busy}>Update password</Submit>
        </form>
      ),
      footer: <button onClick={() => go('signin')} style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={13} /> Back to sign in</button>,
    },
  }
  const f = flows[mode]

  return (
    <div className="login-grid" style={{ minHeight: '100vh', display: 'grid', background: 'var(--page)' }}>
      <div className="login-brand"><BrandPanel /></div>

      {/* form side */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <motion.button
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className="btn btn-ghost" onClick={() => navigate('/')}
          style={{ position: 'absolute', top: 22, right: 24, padding: '8px 14px', fontSize: 12.5 }}
        >
          <Home size={14} /> Home
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="card" style={{ width: 420, maxWidth: '100%', padding: '34px 32px' }}
        >
          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.28, ease }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {f.icon ? <f.icon size={22} color="#38bdf8" /> : <Sparkles size={20} color="#38bdf8" />}
                <h1 style={{ margin: 0, fontSize: 23, letterSpacing: '-0.01em' }}>{f.title}</h1>
              </div>
              <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>{f.sub}</p>

              <div style={{ display: 'grid', gap: 12 }}>
                {notice && <Banner kind={notice.kind}>{notice.kind === 'ok' && <CheckCircle2 size={13} style={{ marginRight: 5, verticalAlign: -2 }} />}{notice.text}</Banner>}
                {error && <Banner kind="error">{error}</Banner>}
                {f.form}
              </div>

              <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>{f.footer}</p>

              {mode === 'signin' && (
                <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  Evaluator demo — admin/admin123 · operator/operator123 · analyst/analyst123 · evaluator/evaluator123
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
