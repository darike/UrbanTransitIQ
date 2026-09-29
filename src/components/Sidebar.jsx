import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Route as RouteIcon, Clock, Gauge, TrendingUp,
  Map, GitCompare, Lightbulb, FlaskConical, AlertTriangle, FileBarChart,
  BarChart4, LogOut, Database, Server, Home, UserCog,
} from 'lucide-react'
import Logo from './Logo.jsx'
import { canAccess } from '../permissions.js'

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { section: 'Overview' },
  { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
  { to: '/network-map', label: 'Network Map', icon: Map },
  { section: 'Analytics' },
  { to: '/passenger-flow', label: 'Passenger Flow', icon: Users },
  { to: '/routes', label: 'Route Performance', icon: RouteIcon },
  { to: '/delays', label: 'Delay Intelligence', icon: Clock },
  { to: '/occupancy', label: 'Occupancy & Crowding', icon: Gauge },
  { to: '/forecast', label: 'Demand Forecast', icon: TrendingUp },
  { section: 'Data Science' },
  { to: '/dual-pipeline', label: 'Spark vs Python', icon: GitCompare },
  { to: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
  { to: '/data-quality', label: 'Data Quality', icon: Database },
  { to: '/bigdata', label: 'HDFS & Spark Jobs', icon: Server },
  { to: '/users', label: 'User Management', icon: UserCog },
  { section: 'Decisions' },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/what-if', label: 'What-If Simulator', icon: FlaskConical },
  { to: '/reports', label: 'Reports & Export', icon: FileBarChart },
  { to: '/powerbi', label: 'Power BI', icon: BarChart4 },
]

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()

  // RBAC: keep only the pages this role may open; drop section headers whose
  // items were all filtered out (permission matrix: src/permissions.js)
  const nav = []
  for (const item of NAV) {
    if (item.section) {
      nav.push(item)                      // provisional — pruned below if empty
    } else if (canAccess(user.role, item.to)) {
      nav.push(item)
    }
  }
  for (let i = nav.length - 1; i >= 0; i--) {
    if (nav[i].section && (i === nav.length - 1 || nav[i + 1].section)) nav.splice(i, 1)
  }

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: 'var(--sidebar-w)', position: 'fixed', top: 0, bottom: 0, left: 0,
        background: 'var(--surface-1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', zIndex: 40,
      }}
    >
      <div style={{ padding: '20px 14px 14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <Logo size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
            UrbanTransit <span style={{ color: 'var(--accent-2)' }}>IQ</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TransitVerse Intelligence</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 16px' }}>
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '14px 10px 6px' }}>
              {item.section}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 3 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px',
                    borderRadius: 10, marginBottom: 3, fontSize: 12.5, fontWeight: isActive ? 700 : 480,
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    background: isActive ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent',
                    boxShadow: isActive ? '0 4px 16px rgba(37, 99, 235, 0.35)' : 'none',
                  }}
                >
                  <item.icon size={16} color={isActive ? '#fff' : 'var(--text-muted)'} />
                  {item.label}
                </motion.div>
              )}
            </NavLink>
          )
        )}
      </nav>

      <div style={{
        margin: '0 12px 10px', padding: '9px 13px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(56,189,248,0.07))',
        border: '1px solid var(--border)', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.02em', color: 'var(--text-secondary)',
      }}>
        Smarter Transit, Happier Cities 🚌
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
        }}>
          {user.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</div>
        </div>
        <button title="Sign out" onClick={() => { onLogout(); navigate('/login') }} style={{ color: 'var(--text-muted)', display: 'flex' }}>
          <LogOut size={16} />
        </button>
      </div>
    </motion.aside>
  )
}
