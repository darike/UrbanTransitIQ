import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip as LTooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SERIES, STATUS } from './ui.jsx'
import { MAP_CENTER, geoStops, geoRoutes, liveVehicles } from '../data/geoData'

const loadColor = (l) => (l >= 0.85 ? '#ff4d5e' : l >= 0.6 ? '#ff9040' : l >= 0.45 ? '#ffd23f' : '#38bdf8')

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

const vehIcon = (occ) => {
  const [c, hi, glow] = occ >= 90
    ? ['#e11d48', '#ff6b81', 'rgba(255,77,94,0.6)']
    : occ >= 70
      ? ['#ea7317', '#ffb35c', 'rgba(255,144,64,0.55)']
      : ['#2563eb', '#60a5fa', 'rgba(59,130,246,0.55)']
  return L.divIcon({
    className: '',
    html: `<div class="veh2" style="--vc:${c};--vc-hi:${hi};--vc-glow:${glow};width:22px;height:22px;border-width:2px">${BUS_SVG}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/* Compact embedded live map for the Executive dashboard */
export default function MiniMap({ height = 380 }) {
  const [, setTick] = useState(0)
  const vehicles = useRef(liveVehicles.slice(0, 8).map((v) => ({ ...v })))
  const routeById = useRef(Object.fromEntries(geoRoutes.map((r) => [r.id, r])))

  useEffect(() => {
    const id = setInterval(() => {
      vehicles.current.forEach((v) => { v.t = (v.t + v.speed * 1.4) % 1 })
      setTick((t) => t + 1)
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <MapContainer center={MAP_CENTER} zoom={11} style={{ height, borderRadius: 12 }}
      zoomControl={false} scrollWheelZoom={false} dragging={true} attributionControl={false}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" className="sat-night" />
      {geoRoutes.map((r) => (
        <React.Fragment key={r.id}>
          <Polyline positions={r.path} interactive={false}
            pathOptions={{ color: loadColor(r.load), weight: 7 + r.load * 5, opacity: 0.18, lineCap: 'round' }} />
          <Polyline positions={r.path}
            pathOptions={{ color: loadColor(r.load), weight: 1.8 + r.load * 2.2, opacity: 0.95, lineCap: 'round' }}>
            <LTooltip sticky className="map-tip"><b>{r.id}</b> · occupancy {r.occupancy}%</LTooltip>
          </Polyline>
        </React.Fragment>
      ))}
      {geoStops.filter((s) => s.size >= 2).map((s) => (
        <CircleMarker key={s.id} center={s.pos} radius={s.size === 3 ? 7 : 5}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#0a101f', fillOpacity: 1 }}>
          <LTooltip direction="top" className="map-tip"><b>{s.name}</b> · {(s.demand / 1000).toFixed(0)}k demand</LTooltip>
        </CircleMarker>
      ))}
      {vehicles.current.map((v) => {
        const r = routeById.current[v.route]
        if (!r) return null
        return <Marker key={v.id} position={pointAt(r.path, v.t)} icon={vehIcon(v.occ)} interactive={false} />
      })}
    </MapContainer>
  )
}
