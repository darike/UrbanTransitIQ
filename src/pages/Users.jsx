import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users as UsersIcon, ShieldCheck, BadgeCheck, ShieldAlert, Trash2 } from 'lucide-react'
import { Page, PageHeader, riseIn, staggerParent } from '../components/ui.jsx'
import { apiListUsers, apiSetRole, apiDeleteUser, SourceBadge } from '../api/client.jsx'

const ROLES = ['Administrator', 'Operator', 'Analyst', 'Evaluator']
const ROLE_COLOR = { Administrator: '#e66767', Operator: '#c98500', Analyst: '#3b82f6', Evaluator: '#199e70' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [live, setLive] = useState(false)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState('')

  const load = () => apiListUsers()
    .then((u) => { setUsers(u); setLive(true) })
    .catch(() => { setUsers([]); setLive(false) })

  useEffect(() => { load() }, [])

  const changeRole = async (username, role) => {
    setSaving(username); setMsg(null)
    try {
      await apiSetRole(username, role)
      setUsers((us) => us.map((u) => (u.username === username ? { ...u, role } : u)))
      setMsg({ kind: 'ok', text: `${username} is now ${role}` })
    } catch (err) {
      setMsg({ kind: 'error', text: String(err.message || err).includes('400')
        ? 'You cannot demote your own admin account.' : 'Change failed — is the backend running?' })
      load()
    }
    setSaving('')
  }

  const removeUser = async (username) => {
    if (!window.confirm(`Delete account "${username}"? This cannot be undone.`)) return
    setSaving(username); setMsg(null)
    try {
      await apiDeleteUser(username)
      setUsers((us) => us.filter((u) => u.username !== username))
      setMsg({ kind: 'ok', text: `${username} deleted` })
    } catch (err) {
      setMsg({ kind: 'error', text: String(err.message || err).includes('400')
        ? 'You cannot delete your own account.' : 'Delete failed — is the backend running?' })
    }
    setSaving('')
  }

  return (
    <Page>
      <PageHeader
        title="User Management"
        subtitle="Administrator-only — grant or restrict access by changing a user's role (server-enforced, audit-logged)"
        icon={UsersIcon} accent="#e66767"
        right={<SourceBadge live={live} />}
      />

      {msg && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: msg.kind === 'ok' ? 'rgba(12,163,12,0.14)' : 'rgba(230,103,103,0.14)',
            color: msg.kind === 'ok' ? '#4ec44e' : '#e66767',
            border: `1px solid ${msg.kind === 'ok' ? 'rgba(12,163,12,0.35)' : 'rgba(230,103,103,0.35)'}` }}>
          {msg.text}
        </motion.div>
      )}

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="card">
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>
          <ShieldCheck size={15} color="#38bdf8" style={{ verticalAlign: -3, marginRight: 6 }} />
          {users.length} registered accounts
        </p>
        <p className="card-sub">Role change takes effect on the user's next page load / login</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Status</th><th>Current role</th><th>Change role</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <motion.tr key={u.username} variants={riseIn}>
                  <td>
                    <b>{u.name || u.username}</b>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{u.email || '—'}</td>
                  <td>
                    {u.verified
                      ? <span className="badge" style={{ background: 'rgba(12,163,12,0.14)', color: '#4ec44e', fontSize: 10.5 }}><BadgeCheck size={11} /> verified</span>
                      : <span className="badge" style={{ background: 'rgba(250,178,25,0.14)', color: '#fab219', fontSize: 10.5 }}><ShieldAlert size={11} /> unverified</span>}
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role] }}>{u.role}</span>
                  </td>
                  <td>
                    <select value={u.role} disabled={saving === u.username}
                      onChange={(e) => changeRole(u.username, e.target.value)}
                      style={{ fontSize: 12.5, padding: '6px 10px' }}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <button title="Delete user" disabled={saving === u.username}
                      onClick={() => removeUser(u.username)}
                      style={{ display: 'inline-flex', padding: 7, borderRadius: 8, color: '#e66767',
                        background: 'rgba(230,103,103,0.1)', border: '1px solid rgba(230,103,103,0.3)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {!users.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                  {live ? 'No users found.' : 'Backend offline — start the API to manage users.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 14, borderLeft: '3px solid #e66767' }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Access levels (SRS Functional Req ii)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div><b style={{ color: '#e66767' }}>Administrator</b> — full control incl. infrastructure, audit trail, user management.</div>
          <div><b style={{ color: '#c98500' }}>Operator</b> — live operations only (delays, occupancy, recommendations, what-if).</div>
          <div><b style={{ color: '#3b82f6' }}>Analyst</b> — all analytics + model lab + reports; no infrastructure/audit.</div>
          <div><b style={{ color: '#199e70' }}>Evaluator</b> — read-everything jury account.</div>
        </div>
      </motion.div>
    </Page>
  )
}
