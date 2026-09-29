import React from 'react'
import { motion } from 'framer-motion'

/* UrbanTransit IQ mark — a "U" drawn as a transit route: start stop (white),
   mid stop, and a glowing cyan "intelligence node" at the head. */
export default function Logo({ size = 36, glow = true, animate = false }) {
  const Path = animate ? motion.path : 'path'
  const pathProps = animate
    ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } }
    : {}
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={glow ? { filter: 'drop-shadow(0 4px 14px rgba(37,99,235,0.55))' } : undefined}>
      <defs>
        <linearGradient id="utiq-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="utiq-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#101d3f" />
          <stop offset="1" stopColor="#080e20" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#utiq-bg)" />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" fill="none" stroke="url(#utiq-g)" strokeOpacity="0.45" strokeWidth="1.5" />
      {/* route halo + core */}
      <path d="M15 12v13q0 11 9 11t9-11V14" fill="none" stroke="url(#utiq-g)" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round" />
      <Path d="M15 12v13q0 11 9 11t9-11V14" fill="none" stroke="url(#utiq-g)" strokeWidth="4" strokeLinecap="round" {...pathProps} />
      {/* stops */}
      <circle cx="15" cy="12" r="2.7" fill="#fff" />
      <circle cx="24" cy="36" r="2.2" fill="#fff" opacity="0.9" />
      {/* intelligence node */}
      <circle cx="33" cy="13.5" r="6" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.5">
        {animate && <animate attributeName="r" values="4.5;7;4.5" dur="2.4s" repeatCount="indefinite" />}
      </circle>
      <circle cx="33" cy="13.5" r="3.5" fill="#38bdf8" stroke="#fff" strokeWidth="1.7" />
    </svg>
  )
}
