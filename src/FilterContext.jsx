import React, { createContext, useContext, useMemo, useState } from 'react'
import { routes as allRoutes, kpis } from './data/mockData'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    range: 'Last 30 days',
    route: 'all',
    direction: 'all',
    period: 'all',
    occupancy: 'all',
  })
  return <FilterContext.Provider value={{ filters, setFilters }}>{children}</FilterContext.Provider>
}

export const useFilters = () => useContext(FilterContext)

/* volume multiplier vs the 30-day baseline the mock dataset represents */
const RANGE_SCALE = {
  'Last 7 days': 0.24,
  'Last 30 days': 1,
  'Last 90 days': 2.85,
  'Last 12 months': 11.3,
}

const OCC_MATCH = {
  'Overcrowded (>90%)': (o) => o >= 90,
  'High (70–90%)': (o) => o >= 70 && o < 90,
  'Low (<40%)': (o) => o < 40,
}

/* Filter-aware derived dataset — every dashboard reads from this so the
   FilterBar visibly changes the numbers (SRS Step 57). */
export function useFilteredData() {
  const { filters } = useFilters()
  return useMemo(() => {
    const scale = RANGE_SCALE[filters.range] ?? 1
    let rs = allRoutes
    if (filters.route !== 'all') rs = rs.filter((r) => r.id === filters.route)
    if (filters.occupancy !== 'all' && OCC_MATCH[filters.occupancy]) {
      rs = rs.filter((r) => OCC_MATCH[filters.occupancy](r.occupancy))
    }
    // demand-weighted network aggregates for the current selection
    const totalDemand = rs.reduce((s, r) => s + r.demand, 0)
    const allDemand = allRoutes.reduce((s, r) => s + r.demand, 0)
    const share = allDemand ? totalDemand / allDemand : 0
    const w = (fn) => (totalDemand ? rs.reduce((s, r) => s + fn(r) * r.demand, 0) / totalDemand : 0)

    const k = {
      totalPassengers: Math.round(kpis.totalPassengers * share * scale),
      totalTrips: Math.round(kpis.totalTrips * share * scale),
      avgOccupancy: +w((r) => r.occupancy).toFixed(1),
      avgDelay: +w((r) => r.avgDelay).toFixed(1),
      onTimePct: +w((r) => r.onTime).toFixed(1),
      highDemand: rs.filter((r) => r.occupancy >= 85).length,
      overcrowded: rs.filter((r) => r.classification === 'Overcrowded' || r.occupancy >= 90).length,
      underutilized: rs.filter((r) => r.classification === 'Reliable, Underutilized').length,
    }
    return { routes: rs, scale, kpi: k, filters }
  }, [filters])
}
