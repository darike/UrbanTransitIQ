/* UrbanTransit IQ — API client.
   Talks to the FastAPI backend (port 8000). Every call degrades gracefully to
   the bundled mock dataset so the UI keeps working when the backend is down —
   pages show a live/demo source flag from `useApi`. */

import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

let token = null
try { token = sessionStorage.getItem('utiq-token') } catch { /* ignore */ }

export function setToken(t) {
  token = t
  try { t ? sessionStorage.setItem('utiq-token', t) : sessionStorage.removeItem('utiq-token') } catch { /* ignore */ }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

export async function apiLogin(username, password) {
  const out = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(out.token)
  return out.user
}

const post = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) })

export const apiRegister = (username, email, password) => post('/api/auth/register', { username, email, password })
export async function apiVerify(username, code) {
  const out = await post('/api/auth/verify', { username, code })
  setToken(out.token)
  return out.user
}
export const apiRequestReset = (identifier) => post('/api/auth/request-reset', { identifier })
export const apiResetPassword = (username, code, new_password) => post('/api/auth/reset-password', { username, code, new_password })
export const apiUpdateProfile = (fields) => post('/api/auth/profile', fields)
export const apiVerifyNewEmail = (code) => post('/api/auth/profile/verify-email', { code })
export const apiChangePassword = (current_password, new_password) => post('/api/auth/profile/change-password', { current_password, new_password })
export const apiListUsers = () => apiFetch('/api/admin/users')
export const apiSetRole = (username, role) => post('/api/admin/users/role', { username, role })
export const apiDeleteUser = (username) => apiFetch(`/api/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' })

/* fetch with mock fallback: const { data, live } = useApi('/api/...', fallback) */
export function useApi(path, fallback, deps = []) {
  const [state, setState] = useState({ data: fallback, live: false, loading: true })
  useEffect(() => {
    let on = true
    setState((s) => ({ ...s, loading: true }))
    apiFetch(path)
      .then((data) => on && setState({ data, live: true, loading: false }))
      .catch(() => on && setState({ data: fallback, live: false, loading: false }))
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  return state
}

/* small badge used by pages to disclose the data source */
export function SourceBadge({ live }) {
  return (
    <span className="badge" style={{
      background: live ? 'rgba(12,163,12,0.14)' : 'rgba(250,178,25,0.12)',
      color: live ? '#4ec44e' : '#fab219', fontSize: 10.5,
    }}>
      {live ? '● live API' : '○ demo data (backend offline)'}
    </span>
  )
}
