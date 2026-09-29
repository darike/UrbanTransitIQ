import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Camera, BadgeCheck, ShieldAlert, KeyRound, CheckCircle2, Trash2, Lock, ChevronDown,
} from 'lucide-react'
import { apiUpdateProfile, apiVerifyNewEmail, apiChangePassword } from '../api/client.jsx'

/* Full profile settings: avatar (upload / remove, client-side 128px resize),
   display name, email (change ⇒ re-verify with code), password change. */
export default function ProfileModal({ user, onClose, onUserUpdate }) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [avatar, setAvatar] = useState(user.avatar || null)
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const fileRef = useRef(null)

  const uname = user.username || (user.name || 'user').toLowerCase()

  const pickAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const S = 128
      c.width = c.height = S
      const ctx = c.getContext('2d')
      const m = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S)
      setAvatar(c.toDataURL('image/jpeg', 0.85))
      setMsg({ kind: 'info', text: 'New photo ready — press Save changes.' })
    }
    img.src = URL.createObjectURL(file)
    e.target.value = ''
  }

  const fail = (err, fallback) => {
    const s = String(err?.message || err)
    if (s.includes('409')) return 'That email is already registered.'
    if (s.includes('422')) return 'Check the format (name 2-60 chars, valid email, password 8+).'
    if (s.includes('401')) return 'Current password is incorrect.'
    if (s.includes('400')) return 'Invalid verification code.'
    return fallback
  }

  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      const out = await apiUpdateProfile({ display_name: name, email, avatar: avatar ?? '' })
      onUserUpdate({ ...user, ...out.user, live: true })
      if (out.needs_code || out.dev_code) {
        setNeedsCode(true)
        setMsg({ kind: 'info', text: out.dev_code ? `${out.message} — demo code: ${out.dev_code}` : out.message })
      } else {
        setMsg({ kind: 'ok', text: 'Profile saved ✓' })
      }
    } catch (err) {
      setMsg({ kind: 'error', text: fail(err, 'Could not reach the backend — start the API (port 8000) and retry.') })
    }
    setBusy(false)
  }

  const verify = async () => {
    setBusy(true); setMsg(null)
    try {
      const out = await apiVerifyNewEmail(code)
      onUserUpdate({ ...user, ...out.user, live: true })
      setNeedsCode(false); setCode('')
      setMsg({ kind: 'ok', text: 'Email verified ✓' })
    } catch (err) {
      setMsg({ kind: 'error', text: fail(err, 'Verification failed — backend unreachable.') })
    }
    setBusy(false)
  }

  const changePw = async () => {
    if (newPw !== newPw2) { setMsg({ kind: 'error', text: 'New passwords do not match.' }); return }
    setBusy(true); setMsg(null)
    try {
      await apiChangePassword(curPw, newPw)
      setCurPw(''); setNewPw(''); setNewPw2(''); setShowPw(false)
      setMsg({ kind: 'ok', text: 'Password changed ✓' })
    } catch (err) {
      setMsg({ kind: 'error', text: fail(err, 'Could not change password — backend unreachable.') })
    }
    setBusy(false)
  }

  const bcolor = { ok: '#4ec44e', info: '#38bdf8', error: '#e66767' }
  const input = { width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5 }

  // portal: the animated sticky header creates a transform containing-block,
  // which would trap position:fixed — render on document.body instead
  return createPortal(
    <AnimatePresence>
      <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          className="card" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: 460, maxWidth: '100%', padding: 26, maxHeight: '92vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Profile settings</h2>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 8, background: 'var(--surface-2)' }}><X size={16} /></button>
          </div>

          {/* avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-strong)', flexShrink: 0, cursor: 'pointer', boxShadow: '0 6px 20px rgba(37,99,235,0.3)' }}>
              {avatar
                ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2563eb,#38bdf8)', fontSize: 28, fontWeight: 800, color: '#fff' }}>
                    {(name || 'U')[0].toUpperCase()}
                  </span>}
              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', padding: '4px 0', display: 'flex', justifyContent: 'center' }}>
                <Camera size={13} color="#fff" />
              </span>
            </button>
            <div style={{ display: 'grid', gap: 7 }}>
              <button className="btn btn-ghost" style={{ padding: '7px 13px', fontSize: 12 }} onClick={() => fileRef.current?.click()}>
                <Camera size={13} /> Change photo
              </button>
              {avatar && (
                <button className="btn btn-ghost" style={{ padding: '7px 13px', fontSize: 12, color: '#e66767' }}
                  onClick={() => { setAvatar(null); setMsg({ kind: 'info', text: 'Photo removed — press Save changes.' }) }}>
                  <Trash2 size={13} /> Remove photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 13 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Display name
              <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Email
                {user.verified
                  ? <span className="badge" style={{ background: 'rgba(12,163,12,0.14)', color: '#4ec44e', fontSize: 10.5 }}><BadgeCheck size={11} /> verified</span>
                  : <span className="badge" style={{ background: 'rgba(250,178,25,0.14)', color: '#fab219', fontSize: 10.5 }}><ShieldAlert size={11} /> unverified</span>}
              </span>
              <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Username <b style={{ color: 'var(--text-secondary)' }}>@{uname}</b> · Role <b style={{ color: 'var(--text-secondary)' }}>{user.role}</b>
              <span style={{ marginLeft: 6, opacity: 0.8 }}>(changing email re-triggers verification)</span>
            </div>

            {msg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: `${bcolor[msg.kind]}18`, border: `1px solid ${bcolor[msg.kind]}44`, color: bcolor[msg.kind], borderRadius: 10, padding: '9px 13px', fontSize: 12.5, lineHeight: 1.55 }}>
                {msg.kind === 'ok' && <CheckCircle2 size={13} style={{ marginRight: 5, verticalAlign: -2 }} />}{msg.text}
              </motion.div>
            )}

            {needsCode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <KeyRound size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)' }} />
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" style={{ ...input, paddingLeft: 32 }} />
                </div>
                <button className="btn btn-primary" onClick={verify} disabled={busy}>Verify</button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={save} disabled={busy} style={{ justifyContent: 'center', padding: '12px' }}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            )}

            {/* password change */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button onClick={() => setShowPw(!showPw)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', width: '100%' }}>
                <Lock size={13} color="#38bdf8" /> Change password
                <motion.span animate={{ rotate: showPw ? 180 : 0 }} style={{ marginLeft: 'auto', display: 'flex' }}><ChevronDown size={15} /></motion.span>
              </button>
              <AnimatePresence>
                {showPw && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
                      <input style={input} type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
                      <input style={input} type="password" placeholder="New password (8+ chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                      <input style={input} type="password" placeholder="Confirm new password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
                      <button className="btn btn-ghost" onClick={changePw} disabled={busy || !curPw || !newPw}
                        style={{ justifyContent: 'center', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.35)' }}>
                        {busy ? 'Updating…' : 'Update password'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
