import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import { FilterProvider } from './FilterContext.jsx'
import { canAccess } from './permissions.js'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import BigDataInfra from './pages/BigDataInfra.jsx'
import Users from './pages/Users.jsx'
import Executive from './pages/Executive.jsx'
import PassengerFlow from './pages/PassengerFlow.jsx'
import RoutePerformance from './pages/RoutePerformance.jsx'
import Delays from './pages/Delays.jsx'
import Occupancy from './pages/Occupancy.jsx'
import Forecast from './pages/Forecast.jsx'
import NetworkMap from './pages/NetworkMap.jsx'
import DualPipeline from './pages/DualPipeline.jsx'
import Anomalies from './pages/Anomalies.jsx'
import DataQuality from './pages/DataQuality.jsx'
import Recommendations from './pages/Recommendations.jsx'
import WhatIf from './pages/WhatIf.jsx'
import Reports from './pages/Reports.jsx'
import PowerBI from './pages/PowerBI.jsx'

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('utiq-user')) } catch { return null }
  })
  const location = useLocation()

  const login = (u) => {
    setUser(u)
    try { sessionStorage.setItem('utiq-user', JSON.stringify(u)) } catch { /* ignore */ }
  }
  const updateUser = (u) => {
    setUser(u)
    try { sessionStorage.setItem('utiq-user', JSON.stringify(u)) } catch { /* ignore */ }
  }
  const logout = () => {
    setUser(null)
    try { sessionStorage.removeItem('utiq-user') } catch { /* ignore */ }
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    )
  }

  // logged-in users can still visit the public landing page via the Home icon
  if (location.pathname === '/home') {
    return <Landing loggedIn />
  }

  return (
    <FilterProvider>
      <div className="app-shell">
        <Sidebar user={user} onLogout={logout} />
        <div className="main-area">
          <Topbar user={user} onUserUpdate={updateUser} onLogout={logout} />
          <main className="page-content">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                {[
                  ['/', Executive], ['/passenger-flow', PassengerFlow],
                  ['/routes', RoutePerformance], ['/delays', Delays],
                  ['/occupancy', Occupancy], ['/forecast', Forecast],
                  ['/network-map', NetworkMap], ['/dual-pipeline', DualPipeline],
                  ['/anomalies', Anomalies], ['/data-quality', DataQuality],
                  ['/bigdata', BigDataInfra], ['/recommendations', Recommendations],
                  ['/what-if', WhatIf], ['/reports', Reports], ['/powerbi', PowerBI],
                  ['/users', Users],
                ].map(([path, Page]) => (
                  <Route key={path} path={path} element={
                    // RBAC route guard — a typed URL is redirected, not rendered
                    canAccess(user.role, path) ? <Page /> : <Navigate to="/" replace />
                  } />
                ))}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </FilterProvider>
  )
}
