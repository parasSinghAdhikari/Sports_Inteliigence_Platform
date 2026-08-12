import React, { useState } from 'react'
import './index.css'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Teams from './pages/Teams'
import Compare from './pages/Compare'
import Scouting from './pages/Scouting'
import MatchIntelligence from './pages/MatchIntelligence'
import Predictions from './pages/Predictions'

const PAGES = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '⚡' },
  { id: 'players',      label: 'Players',      icon: '👤' },
  { id: 'teams',        label: 'Teams',        icon: '🛡️' },
  { id: 'compare',      label: 'Compare',      icon: '⚖️' },
  { id: 'scouting',     label: 'Scouting',     icon: '🔭' },
  { id: 'intel',        label: 'Matches',      icon: '🏆' },
  { id: 'predictions',  label: 'Predict',      icon: '🔮' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />
      case 'players':   return <Players />
      case 'teams':     return <Teams />
      case 'compare':   return <Compare />
      case 'scouting':  return <Scouting />
      case 'intel':        return <MatchIntelligence />
      case 'predictions':  return <Predictions />
      default:             return <Dashboard />
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-logo">SPORTS<span>IQ</span></div>
        <div className="navbar-links">
          {PAGES.map(p => (
            <button
              key={p.id}
              className={`nav-link ${page === p.id ? 'active' : ''}`}
              onClick={() => setPage(p.id)}
            >
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
        <div className="navbar-badge">● LIVE 2024-25</div>
      </nav>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
