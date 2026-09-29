import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Marker, Tooltip as LTooltip, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Radio, Layers } from 'lucide-react'
import { Page, PageHeader, riseIn, SERIES, STATUS } from '../components/ui.jsx'
import { MAP_CENTER, MAP_ZOOM, geoStops, geoRoutes, liveVehicles } from '../data/geoData'
import { Map as MapIcon } from 'lucide-react'

/* ---------- helpers ---------- */
const loadColor = (l) => (l >= 0.85 ? '#ff4d5e' : l >= 0.6 ? '#ff9040' : l >= 0.45 ? '#ffd23f' : '#38bdf8')
const delayColor = (d) => (d >= 10 ? '#ff4d5e' : d >= 7 ? '#ff9040' : d >= 5 ? '#ffd23f' : '#31d98c')

/* Free basemaps — none of these needs an API key. */
const BASEMAPS = {
  'Satellite · night glow (no key)': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    className: 'sat-night',
  },
  'OSM · dark filter (no key)': {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'osm-dark',
  },
  'Esri Dark Gray (no key)': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ',
    className: '',
  },
}

// distance-weighted interpolation along a polyline, t ∈ [0,1]
function pointAt(path, t) {
  const segs = []
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1])
    segs.push(d); total += d
  }
  let dist = t * total
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i]) {
      const f = segs[i] === 0 ? 0 : dist / segs[i]
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]
    }
    dist -= segs[i]
  }
  return path[path.length - 1]
}

const BUS_SVG = '<svg viewBox="0 0 24 24"><path d="M5 15.5c0 .8.35 1.5 1 1.98V19a1 1 0 0 0 2 0v-1h8v1a1 1 0 0 0 2 0v-1.52c.65-.48 1-1.18 1-1.98V6.5C19 3.9 16.5 3 12 3s-7 .9-7 3.5v9ZM7.9 16a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm8.2 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8ZM7 6.6h10V11H7V6.6Z"/></svg>'

const vehicleIcon = (occ, late) => {
  const [c, hi, glow] = occ >= 90
    ? ['#e11d48', '#ff6b81', 'rgba(255,77,94,0.6)']
    : occ >= 70
      ? ['#ea7317', '#ffb35c', 'rgba(255,144,64,0.55)']
      : ['#2563eb', '#60a5fa', 'rgba(59,130,246,0.55)']
  return L.divIcon({
    className: '',
    html: `<div class="veh2 ${late ? 'veh2-late' : ''} ${occ >= 90 ? 'veh2-critical' : ''}"
                style="--vc:${c};--vc-hi:${hi};--vc-glow:${glow};position:relative">${BUS_SVG}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const incidentIcon = () => L.divIcon({
  className: '',
  html: '<div class="incident-marker">⚠</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const INCIDENTS = [
  { pos: [24.853, 67.0], label: 'Signal issue · Old City Gate · +18 min' },
  { pos: [24.847, 67.1], label: 'Road blockage · R27 corridor · +12 min' },
  { pos: [24.9, 67.05], label: 'Heavy congestion · North corridor · +10 min' },
]

export default function NetworkMap() {
  const [mode, setMode] = useState('load') // 'load' | 'delay'
  const [live, setLive] = useState(true)
  const [basemap, setBasemap] = useState(Object.keys(BASEMAPS)[0])
  const [, setTick] = useState(0)
  const vehiclesRef = useRef(liveVehicles.map((v) => ({ ...v })))

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      vehiclesRef.current.forEach((v) => { v.t = (v.t + v.speed) % 1 })
      setTick((t) => t + 1)
    }, 100)
    return () => clearInterval(id)
  }, [live])

  const routeById = useMemo(() => Object.fromEntries(geoRoutes.map((r) => [r.id, r])), [])
  const hotspots = geoStops.filter((s) => s.delay >= 8 || s.demand >= 60000)

  return (
    <Page>
      <PageHeader
        title="Live Network Map"
        subtitle="Citywide operations — glowing segments = load, heat zones = crowding & delay hotspots"
        icon={MapIcon} accent="#38bdf8"
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn ${mode === 'load' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('load')}>
              <Layers size={14} /> Segment load
            </button>
            <button className={`btn ${mode === 'delay' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('delay')}>Delay hotspots</button>
            <button className={`btn ${live ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLive(!live)}>
              <Radio size={14} /> {live ? 'Live' : 'Paused'}
            </button>
            <select value={basemap} onChange={(e) => setBasemap(e.target.value)} style={{ fontSize: 12.5 }}>
              {Object.keys(BASEMAPS).map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        }
      />

      <motion.div variants={riseIn} initial="initial" animate="animate" className="card" style={{ padding: 8, position: 'relative' }}>
        {live && (
          <span style={{
            position: 'absolute', top: 18, right: 18, zIndex: 1000, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(6,12,28,0.88)', border: '1px solid rgba(99,139,255,0.4)', borderRadius: 999,
            padding: '5px 12px', fontSize: 11.5, fontWeight: 700, color: '#4ec44e',
          }}>
            <span className="live-dot" /> LIVE · {vehiclesRef.current.length} vehicles
          </span>
        )}
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '72vh', borderRadius: 12, background: '#04070f' }} scrollWheelZoom>
          <TileLayer
            key={basemap}
            attribution={BASEMAPS[basemap].attribution}
            url={BASEMAPS[basemap].url}
            className={BASEMAPS[basemap].className}
          />

          {/* crowding / delay heat zones (layered translucent circles = glow blobs) */}
          {hotspots.map((s) => {
            const c = mode === 'delay' ? delayColor(s.delay) : '#ff4d5e'
            const intensity = mode === 'delay' ? Math.min(s.delay / 13, 1) : Math.min(s.demand / 96000, 1)
            if (mode === 'load' && s.demand < 60000) return null
            return [1600, 950, 450].map((r, i) => (
              <Circle key={`${s.id}-${i}-${mode}`} center={s.pos} radius={r * (0.6 + intensity * 0.7)}
                pathOptions={{ stroke: false, fillColor: c, fillOpacity: 0.055 + i * 0.05 * intensity }} interactive={false} />
            ))
          })}

          {/* route polylines — halo + core for the neon glow look */}
          {geoRoutes.map((r) => {
            const color = mode === 'load' ? loadColor(r.load) : 'rgba(148, 178, 255, 0.55)'
            return (
              <React.Fragment key={r.id + mode}>
                <Polyline positions={r.path} interactive={false}
                  pathOptions={{ color, weight: mode === 'load' ? 9 + r.load * 6 : 8, opacity: 0.18, lineCap: 'round' }} />
                <Polyline positions={r.path}
                  pathOptions={{ color, weight: mode === 'load' ? 2.5 + r.load * 2.5 : 2.5, opacity: 0.95, lineCap: 'round' }}>
                  <LTooltip sticky className="map-tip">
                    <b>{r.id}</b> · {r.name}<br />Avg occupancy: {r.occupancy}% · load {(r.load * 100).toFixed(0)}%
                  </LTooltip>
                </Polyline>
              </React.Fragment>
            )
          })}

          {/* stops */}
          {geoStops.map((s) => (
            <CircleMarker
              key={s.id + mode}
              center={s.pos}
              radius={s.size === 3 ? 9 : s.size === 2 ? 6.5 : 4.5}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: mode === 'delay' ? delayColor(s.delay) : '#0a101f',
                fillOpacity: 1,
              }}
            >
              {s.size >= 2 && (
                <LTooltip permanent direction="top" offset={[0, -10]} className="hub-label">
                  {s.name.split(' ')[0]}<span className="hub-val">{(s.demand / 1000).toFixed(0)}K</span>
                </LTooltip>
              )}
              <Popup className="map-popup">
                <b style={{ fontSize: 13 }}>{s.name}</b>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Demand: {(s.demand / 1000).toFixed(0)}k boardings / 30d<br />
                  Avg delay: {s.delay} min {s.delay >= 10 ? '· ⚠ bottleneck' : ''}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* incident markers */}
          {INCIDENTS.map((inc, i) => (
            <Marker key={i} position={inc.pos} icon={incidentIcon()} zIndexOffset={800}>
              <LTooltip direction="top" offset={[0, -16]} className="map-tip">{inc.label}</LTooltip>
            </Marker>
          ))}

          {/* live vehicles */}
          {live && vehiclesRef.current.map((v) => {
            const r = routeById[v.route]
            if (!r) return null
            const pos = pointAt(r.path, v.t)
            return (
              <Marker key={v.id} position={pos} icon={vehicleIcon(v.occ, v.late)} zIndexOffset={500}>
                <LTooltip direction="top" offset={[0, -14]} className="map-tip">
                  <b>{v.id}</b> · {v.route}<br />Occupancy {v.occ}%{v.late ? ' · running late' : ''}
                </LTooltip>
              </Marker>
            )
          })}
        </MapContainer>

        {/* legend */}
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', padding: '12px 10px 6px', fontSize: 11.5, color: 'var(--text-muted)', alignItems: 'center' }}>
          {mode === 'load' ? (
            <>
              <span><i className="lg-line" style={{ background: '#38bdf8' }} /> load &lt; 45%</span>
              <span><i className="lg-line" style={{ background: '#ffd23f' }} /> 45–60%</span>
              <span><i className="lg-line" style={{ background: '#ff9040' }} /> 60–85%</span>
              <span><i className="lg-line" style={{ background: '#ff4d5e' }} /> &gt; 85% overcrowded · red glow zones = crowding hotspots</span>
            </>
          ) : (
            <>
              <span><i className="lg-dot" style={{ background: '#31d98c' }} /> &lt; 5 min</span>
              <span><i className="lg-dot" style={{ background: '#ffd23f' }} /> 5–7</span>
              <span><i className="lg-dot" style={{ background: '#ff9040' }} /> 7–10</span>
              <span><i className="lg-dot" style={{ background: '#ff4d5e' }} /> ≥ 10 min · glow zones = delay heat</span>
            </>
          )}
          <span style={{ marginLeft: 'auto' }}>⚠ = live incident · 🚌 = vehicle (color = occupancy)</span>
        </div>
      </motion.div>
    </Page>
  )
}
