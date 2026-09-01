import React, { useState } from 'react'
import './index.css'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Teams from './pages/Teams'
import Compare from './pages/Compare'
import Scouting from './pages/Scouting'
import MatchIntelligence from './pages/MatchIntelligence'
import Predictions from './pages/Predictions'
import Live from './pages/Live'

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '⊞' },
  { id: 'players',     label: 'Players',            icon: '👤' },
  { id: 'teams',       label: 'Teams',              icon: '🛡' },
  { id: 'compare',     label: 'Compare',            icon: '⚖' },
  { id: 'scouting',    label: 'Scouting',           icon: '🔭' },
  { id: 'intel',       label: 'Match Intelligence', icon: '📊' },
  { id: 'predictions', label: 'Predictions',        icon: '🔮' },
  { id: 'live',        label: 'Fixtures',           icon: '📅' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard />
      case 'players':     return <Players />
      case 'teams':       return <Teams />
      case 'compare':     return <Compare />
      case 'scouting':    return <Scouting />
      case 'intel':       return <MatchIntelligence />
      case 'predictions': return <Predictions />
      case 'live':        return <Live />
      default:            return <Dashboard />
    }
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚽</div>
          <div className="sidebar-logo-text">
            SPORTS<br /><span>INTELLIGENCE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tag">
            <span className="dot" />
            <span>Live 2024-25</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content page-enter">
        {renderPage()}
      </main>
    </div>
  )
}
