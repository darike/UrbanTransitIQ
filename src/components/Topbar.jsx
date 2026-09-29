import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, ChevronDown, CalendarDays, Filter, BadgeCheck, XCircle, UserCog, LogOut } from 'lucide-react'
import { routes, alerts } from '../data/mockData'
import { useFilters } from '../FilterContext'
import ProfileModal from './ProfileModal.jsx'

const DEFAULTS = { range: 'Last 30 days', route: 'all', direction: 'all', period: 'all', occupancy: 'all' }

const WMO = [
  [[0], '☀️', 'Clear'], [[1, 2], '⛅', 'Partly cloudy'], [[3], '☁️', 'Overcast'],
  [[45, 48], '🌫️', 'Fog'], [[51, 53, 55, 61, 63, 65, 80, 81, 82], '🌧️', 'Rain'],
  [[95, 96, 99], '⛈️', 'Storm'],
]

function WeatherChip() {
  const [w, setW] = useState({ temp: 31, icon: '⛅', label: 'Partly cloudy' })
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=24.86&longitude=67.01&current=temperature_2m,weather_code',
      { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d) => {
        const code = d.current.weather_code
        const m = WMO.find(([codes]) => codes.includes(code)) || WMO[1]
        setW({ temp: Math.round(d.current.temperature_2m), icon: m[1], label: m[2] })
      })
      .catch(() => { /* keep static fallback */ })
  }, [])
  return (
    <span title={`${w.label} · Karachi (live: open-meteo)`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(56,189,248,0.08))',
      border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px',
      fontSize: 12.5, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 15 }}>{w.icon}</span>
      <b>{w.temp}°C</b>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Karachi</span>
    </span>
  )
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="clock">
      <div className="time">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <div className="date">{now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  )
}

export default function Topbar({ user, onUserUpdate, onLogout }) {
  const { filters, setFilters } = useFilters()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // close the account menu on any outside click
  useEffect(() => {
    if (!showMenu) return
    const close = () => setShowMenu(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showMenu])
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const dirty = Object.keys(DEFAULTS).some((k) => filters[k] !== DEFAULTS[k])

  const search = (e) => {
    if (e.key !== 'Enter' || !q.trim()) return
    const term = q.trim().toUpperCase()
    const r = routes.find((x) => x.id === term || x.name.toUpperCase().includes(term))
    if (r) { setFilters((f) => ({ ...f, route: r.id })); navigate('/routes') }
    else navigate('/routes')
  }

  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="topbar"
    >
      <div className="topbar-row">
        <div className="topbar-search">
          <Search size={15} style={{ position: 'absolute', left: 13, top: 10.5, color: 'var(--text-muted)' }} />
          <input
            placeholder="Search route, stop, vehicle, or location…"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={search}
          />
        </div>

        <span className="live-pill"><span className="live-dot" /> LIVE</span>
        <WeatherChip />
        <LiveClock />

        <button className="bell" title={`${alerts.length} active alerts`} onClick={() => navigate('/anomalies')}>
          <Bell size={16} />
          <span className="dot">{alerts.length}</span>
        </button>

        <div style={{ position: 'relative' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="profile-chip" title="Account"
            onClick={(e) => { e.stopPropagation(); setShowMenu((s) => !s) }}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: 9, objectFit: 'cover' }} />
            ) : (
              <span style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13, color: '#fff',
              }}>
                {user?.name?.[0] || 'U'}
              </span>
            )}
            <span style={{ lineHeight: 1.2, textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                {user?.name || 'User'}
                {user?.verified && <BadgeCheck size={12} color="#4ec44e" />}
              </span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)' }}>{user?.role || ''}</span>
            </span>
            <motion.span animate={{ rotate: showMenu ? 180 : 0 }} style={{ display: 'flex' }}>
              <ChevronDown size={14} color="var(--text-muted)" />
            </motion.span>
          </motion.button>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 200,
                background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
                borderRadius: 12, padding: 6, zIndex: 60,
                boxShadow: '0 16px 44px rgba(0,0,0,0.55)',
              }}
            >
              <button
                onClick={() => { setShowMenu(false); setShowProfile(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,139,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <UserCog size={15} color="#38bdf8" /> Profile settings
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
              <button
                onClick={() => { setShowMenu(false); onLogout?.(); navigate('/login') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#e66767' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(230,103,103,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="filters-row">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>
          <Filter size={13} /> FILTERS
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={13} color="var(--text-muted)" />
          <select value={filters.range} onChange={set('range')}>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 12 months</option>
          </select>
        </span>
        <select value={filters.route} onChange={set('route')}>
          <option value="all">All routes</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}
        </select>
        <select value={filters.direction} onChange={set('direction')}>
          <option value="all">Both directions</option>
          <option>Inbound</option>
          <option>Outbound</option>
        </select>
        <select value={filters.period} onChange={set('period')}>
          <option value="all">All periods</option>
          <option>Peak only</option>
          <option>Off-peak only</option>
          <option>Weekend</option>
        </select>
        <select value={filters.occupancy} onChange={set('occupancy')}>
          <option value="all">Any occupancy</option>
          <option>Overcrowded (&gt;90%)</option>
          <option>High (70–90%)</option>
          <option>Low (&lt;40%)</option>
        </select>

        {dirty && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setFilters({ ...DEFAULTS })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11.5, fontWeight: 700, color: '#e66767',
              background: 'rgba(230,103,103,0.1)', border: '1px solid rgba(230,103,103,0.35)',
              borderRadius: 8, padding: '6px 11px',
            }}
          >
            <XCircle size={13} /> Clear filters
          </motion.button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          2.06M records · 12 mo · Spark
        </span>
      </div>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onUserUpdate={onUserUpdate} />
      )}
    </motion.header>
  )
}
