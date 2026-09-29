import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive, Folder, FileText, ChevronRight, CheckCircle2, XCircle, Loader2, Server, Database,
} from 'lucide-react'
import { Page, PageHeader, KpiCard, staggerParent, riseIn, SERIES, STATUS } from '../components/ui.jsx'
import { useApi, SourceBadge } from '../api/client.jsx'

/* Mirrors `hdfs dfs -ls -R /urbantransit` + Spark History Server output.
   In production: GET /api/admin/hdfs-status and GET /api/admin/spark-jobs. */

const HDFS_TREE = [
  {
    name: '/urbantransit/raw_data', type: 'dir', children: [
      { name: 'tickets_2025_10.csv … tickets_2026_09.csv', type: 'file', size: '1.94 GB', repl: 1, note: '12 monthly files · 2.41M rows' },
      { name: 'passenger_counts.csv', type: 'file', size: '412 MB', repl: 1, note: '500k trip-level records' },
      { name: 'delays.json', type: 'file', size: '188 MB', repl: 1, note: '250k delay events' },
      { name: 'routes.csv · stops.csv · vehicles.csv · schedules.csv', type: 'file', size: '9.4 MB', repl: 1, note: 'master tables' },
      { name: 'gps_events/', type: 'dir', size: '640 MB', repl: 1, note: 'simulated AVL pings' },
    ],
  },
  {
    name: '/urbantransit/processed_data', type: 'dir', children: [
      { name: 'clean_tickets/', type: 'dir', size: '1.71 GB', repl: 1, note: 'post data-quality rules' },
      { name: 'quarantine/', type: 'dir', size: '38 MB', repl: 1, note: 'invalid + duplicate records kept for audit' },
    ],
  },
  {
    name: '/urbantransit/parquet_data', type: 'dir', children: [
      { name: 'trips_enriched.parquet', type: 'file', size: '412 MB', repl: 1, note: 'partitioned by month, route — 23 features' },
      { name: 'od_matrix.parquet', type: 'file', size: '31 MB', repl: 1, note: 'origin-destination flows' },
      { name: 'route_scores.parquet', type: 'file', size: '2.1 MB', repl: 1, note: 'performance scoring output' },
      { name: 'forecasts.parquet', type: 'file', size: '5.8 MB', repl: 1, note: 'demand + occupancy predictions' },
    ],
  },
]

const SPARK_JOBS = [
  { id: 'app-20260928-0041', name: 'ingest_raw_to_hdfs', stage: 'Ingestion', status: 'success', duration: '3m 41s', records: '2,412,480', started: '06:00' },
  { id: 'app-20260928-0042', name: 'data_quality_checks', stage: 'Quality', status: 'success', duration: '2m 12s', records: '34,131 issues', started: '06:05' },
  { id: 'app-20260928-0043', name: 'clean_and_quarantine', stage: 'Cleaning', status: 'success', duration: '4m 03s', records: '2,379,204', started: '06:08' },
  { id: 'app-20260928-0044', name: 'spark_sql_joins_9_tables', stage: 'Integration', status: 'success', duration: '6m 27s', records: '9 tables', started: '06:13' },
  { id: 'app-20260928-0045', name: 'feature_engineering', stage: 'Features', status: 'success', duration: '5m 55s', records: '23 features', started: '06:20' },
  { id: 'app-20260928-0046', name: 'write_parquet_partitioned', stage: 'Storage', status: 'success', duration: '1m 48s', records: '412 MB', started: '06:26' },
  { id: 'app-20260928-0047', name: 'mllib_delay_classifier_train', stage: 'MLlib', status: 'success', duration: '11m 32s', records: 'RF · GBT · LR', started: '06:30' },
  { id: 'app-20260928-0048', name: 'demand_forecast_batch', stage: 'MLlib', status: 'running', duration: '4m 10s…', records: '—', started: '07:02' },
  { id: 'app-20260927-0038', name: 'mllib_kmeans_route_clusters', stage: 'MLlib', status: 'success', duration: '3m 05s', records: 'k=4 · silhouette 0.61', started: 'yesterday' },
  { id: 'app-20260927-0031', name: 'ingest_raw_to_hdfs', stage: 'Ingestion', status: 'failed', duration: '0m 44s', records: 'OOM — executor 2g→4g fixed', started: 'yesterday' },
]

const statusIcon = {
  success: <CheckCircle2 size={15} color={STATUS.good} />,
  running: <Loader2 size={15} color={SERIES[0]} className="spin" />,
  failed: <XCircle size={15} color={STATUS.critical} />,
}

function Tree() {
  const [open, setOpen] = useState(() => new Set(HDFS_TREE.map((d) => d.name)))
  const toggle = (n) => setOpen((s) => { const c = new Set(s); c.has(n) ? c.delete(n) : c.add(n); return c })
  return (
    <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5 }}>
      {HDFS_TREE.map((dir) => (
        <div key={dir.name} style={{ marginBottom: 6 }}>
          <button onClick={() => toggle(dir.name)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', width: '100%', textAlign: 'left', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 12.5 }}>
            <motion.span animate={{ rotate: open.has(dir.name) ? 90 : 0 }} style={{ display: 'inline-flex' }}>
              <ChevronRight size={14} />
            </motion.span>
            <Folder size={14} color={SERIES[3]} /> {dir.name}
          </button>
          <AnimatePresence initial={false}>
            {open.has(dir.name) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                {dir.children.map((f) => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 34px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    {f.type === 'dir' ? <Folder size={13} color={SERIES[3]} /> : <FileText size={13} color={SERIES[0]} />}
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{f.note}</span>
                    <b style={{ width: 66, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontSize: 12 }}>{f.size}</b>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

export default function BigDataInfra() {
  const { data: api, live } = useApi('/api/admin/pipeline-log', null)
  return (
    <Page>
      <PageHeader
        title="HDFS & Spark Jobs"
        subtitle="Big Data infrastructure monitor — HDFS storage layout and pipeline job status (SRS: HDFS Storage, Spark Job Monitoring)"
        right={<SourceBadge live={live} />}
      />

      {live && api?.stages?.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Latest pipeline run (live from reports/processing_log.txt)</p>
          <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gap: 3 }}>
            {api.stages.map((s, i) => <div key={i}>{s}</div>)}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '10px 0 0' }}>{api.note}</p>
        </div>
      )}

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid kpi-grid">
        <KpiCard label="HDFS Used" value={5.4} decimals={1} suffix=" GB" icon={HardDrive} />
        <KpiCard label="Files / Dirs" value={128} icon={Folder} accent={SERIES[3]} />
        <KpiCard label="Spark Jobs (24h)" value={8} icon={Server} accent={SERIES[2]} />
        <KpiCard label="Parquet Datasets" value={4} icon={Database} accent={SERIES[6]} />
      </motion.div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-2" style={{ marginTop: 16 }}>
        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>HDFS storage browser</p>
          <p className="card-sub">hdfs dfs -ls -R /urbantransit · single-node pseudo-distributed (replication 1)</p>
          <Tree />
          <div style={{ marginTop: 12, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>
            $ hdfs dfsadmin -report → Live datanodes: 1 · Capacity used: 5.4 GB · Under-replicated: 0
          </div>
        </motion.div>

        <motion.div variants={riseIn} className="card">
          <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Spark job monitor</p>
          <p className="card-sub">Latest pipeline runs · full logs in reports/ingestion_log.txt</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Job</th><th>Stage</th><th></th><th className="num">Duration</th><th className="num">Output</th></tr>
              </thead>
              <tbody>
                {SPARK_JOBS.map((j, i) => (
                  <motion.tr key={j.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{j.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.id} · {j.started}</div>
                    </td>
                    <td><span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{j.stage}</span></td>
                    <td>{statusIcon[j.status]}</td>
                    <td className="num">{j.duration}</td>
                    <td className="num" style={{ fontSize: 12 }}>{j.records}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ marginTop: 16, borderLeft: `3px solid ${SERIES[0]}` }}>
        <p className="card-title" style={{ color: 'var(--text-primary)', fontSize: 14 }}>Storage strategy (SRS Step 2–3 evidence)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div><b style={{ color: 'var(--text-primary)' }}>Raw zone (CSV/JSON):</b> immutable as-generated files, one folder per source, loaded with explicit Spark schemas + schema inference demo.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Processed zone:</b> cleaned data plus a quarantine folder — every rejected record is kept with its rule ID for the audit trail.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Parquet zone:</b> the large analytical dataset partitioned by <code>month</code> and <code>route_id</code> — dashboard queries read only the partitions they need.</div>
          <div><b style={{ color: 'var(--text-primary)' }}>Ingestion:</b> multi-file reads, partition handling and large-file loading demonstrated in <code>spark_jobs/ingest_raw_to_hdfs.py</code>.</div>
        </div>
      </motion.div>
    </Page>
  )
}
