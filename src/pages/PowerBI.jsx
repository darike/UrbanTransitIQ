import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart4, Link2, ExternalLink } from 'lucide-react'
import { Page, PageHeader, riseIn, SERIES } from '../components/ui.jsx'

/* Paste a "Publish to web" or workspace embed URL from Power BI.
   File > Embed report > Publish to web (public) — or use secure embed
   for org-only access. The URL is remembered in this browser. */

export default function PowerBI() {
  const [url, setUrl] = useState(() => {
    try { return localStorage.getItem('utiq-powerbi-url') || '' } catch { return '' }
  })
  const [input, setInput] = useState(url)

  const save = () => {
    setUrl(input.trim())
    try { localStorage.setItem('utiq-powerbi-url', input.trim()) } catch { /* ignore */ }
  }

  const valid = url.startsWith('https://app.powerbi.com/')

  return (
    <Page>
      <PageHeader
        title="Power BI Reports"
        subtitle="Embedded Power BI visualization layer — complements the built-in dashboards for evaluator walkthroughs"
      />

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginBottom: 16 }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={15} color={SERIES[0]} /> Report embed URL
        </p>
        <p className="card-sub">
          Power BI Desktop → Publish → app.powerbi.com → File → Embed report → <b>Publish to web</b> → copy the iframe URL and paste it here.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 260 }}
            placeholder="https://app.powerbi.com/view?r=..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" onClick={save}>Embed report</button>
        </div>
        {url && !valid && (
          <p style={{ color: 'var(--status-warning)', fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>
            URL app.powerbi.com se shuru honi chahiye — "Publish to web" ya secure-embed link use karein.
          </p>
        )}
      </motion.div>

      {valid ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="card" style={{ padding: 8 }}
        >
          <iframe
            title="Power BI report"
            src={url}
            style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 10, background: '#fff' }}
            allowFullScreen
          />
        </motion.div>
      ) : (
        <motion.div variants={riseIn} initial="initial" animate="animate" className="card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <motion.div
            animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'var(--accent-soft)', borderRadius: 18, padding: 18, marginBottom: 16 }}
          >
            <BarChart4 size={34} color={SERIES[0]} />
          </motion.div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No report embedded yet</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 460, lineHeight: 1.6 }}>
            Apni team ki Power BI report publish kar ke embed URL upar paste karein.
            Suggested pages for the competition: Network Overview, Route Deep-Dive, Delay Analysis, Forecast vs Actual.
          </p>
          <a
            className="btn btn-ghost"
            href="https://app.powerbi.com"
            target="_blank" rel="noreferrer"
            style={{ textDecoration: 'none', marginTop: 8 }}
          >
            Open Power BI <ExternalLink size={14} />
          </a>
        </motion.div>
      )}
    </Page>
  )
}
