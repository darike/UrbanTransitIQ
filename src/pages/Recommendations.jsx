import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Lightbulb, BarChart3 } from 'lucide-react'
import { Page, PageHeader, PriorityBadge, staggerParent, riseIn, SERIES } from '../components/ui.jsx'
import { recommendations as mockRecs } from '../data/mockData'
import { useApi, SourceBadge } from '../api/client.jsx'

export default function Recommendations() {
  const { data: api, live } = useApi('/api/recommendations', null)
  const recommendations = api?.recommendations?.length
    ? api.recommendations.map((r) => ({ ...r, category: r.category, impact: r.impact }))
    : mockRecs
  const [open, setOpen] = useState(null)

  return (
    <Page>
      <PageHeader
        title="Recommendation Engine"
        subtitle="Evidence-based operational recommendations — every action shows its analytical justification (SRS Step 46: no unexplained recommendations)"
        right={<SourceBadge live={live} />}
      />

      <motion.div variants={staggerParent} initial="initial" animate="animate" style={{ display: 'grid', gap: 12 }}>
        {recommendations.map((rec, i) => {
          const isOpen = open === rec.id
          return (
            <motion.div key={rec.id} variants={riseIn} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setOpen(isOpen ? null : rec.id)}
                style={{ width: '100%', textAlign: 'left', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <span style={{ background: 'var(--accent-soft)', borderRadius: 10, padding: 8, display: 'inline-flex' }}>
                  <Lightbulb size={16} color={SERIES[0]} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <PriorityBadge value={rec.priority} />
                    <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{rec.category}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{rec.id}</span>
                  </div>
                  <div style={{ fontWeight: 650, fontSize: 14, marginTop: 5, color: 'var(--text-primary)' }}>{rec.action}</div>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div style={{ padding: '0 20px 18px 20px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                          Supporting evidence
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 5 }}>
                          {rec.evidence.map((e, j) => (
                            <motion.li key={j} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}
                              style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              {e}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, alignSelf: 'start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          <BarChart3 size={13} /> Estimated impact
                        </div>
                        <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>{rec.impact}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Simulated estimate — validate in What-If before applying.</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>
    </Page>
  )
}
