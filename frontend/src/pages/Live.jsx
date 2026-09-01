import React, { useState, useEffect } from 'react'

const API = '/api'

const LEAGUES = [
  { name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', teams: 20, matches: 380, color: 'var(--purple)' },
  { name: 'La Liga',         country: 'Spain',   flag: '🇪🇸',         teams: 20, matches: 380, color: '#ef4444' },
  { name: 'Bundesliga',      country: 'Germany', flag: '🇩🇪',         teams: 18, matches: 306, color: '#f59e0b' },
  { name: 'Serie A',         country: 'Italy',   flag: '🇮🇹',         teams: 20, matches: 380, color: '#06b6d4' },
  { name: 'Ligue 1',         country: 'France',  flag: '🇫🇷',         teams: 18, matches: 306, color: '#10b981' },
  { name: 'Eredivisie',      country: 'Netherlands', flag: '🇳🇱',     teams: 18, matches: 306, color: '#f97316' },
  { name: 'MLS',             country: 'USA',     flag: '🇺🇸',         teams: 29, matches: 468, color: '#8b5cf6' },
  { name: 'Champions League',country: 'UEFA',    flag: '⭐',           teams: 32, matches: 125, color: '#3b82f6' },
]

function FixtureCard({ fixture }) {
  const date = fixture.date ? new Date(fixture.date) : null
  const dateStr = date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'
  const isFinished = fixture.status === 'FINISHED'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '9px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.78rem',
    }}>
      <span style={{ width: 90, color: 'var(--text-3)', fontSize: '0.65rem' }}>{dateStr}</span>
      <span style={{
        flex: 1, textAlign: 'right', fontWeight: 500,
        color: isFinished && fixture.score?.home > fixture.score?.away ? 'var(--text-1)' : 'var(--text-2)',
      }}>{fixture.home_team}</span>
      <span style={{
        padding: '2px 10px', margin: '0 8px',
        background: 'var(--bg-card2)', borderRadius: 5,
        fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.85rem',
        minWidth: 48, textAlign: 'center', letterSpacing: 1,
        color: isFinished ? 'var(--text-1)' : 'var(--text-3)',
      }}>
        {isFinished
          ? `${fixture.score?.home ?? '?'}–${fixture.score?.away ?? '?'}`
          : 'vs'}
      </span>
      <span style={{
        flex: 1, fontWeight: 500,
        color: isFinished && fixture.score?.away > fixture.score?.home ? 'var(--text-1)' : 'var(--text-2)',
      }}>{fixture.away_team}</span>
      <span style={{
        marginLeft: 8, padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem',
        background: isFinished ? 'var(--green-dim)' : 'var(--yellow-dim)',
        color: isFinished ? 'var(--green)' : 'var(--yellow)',
        fontWeight: 600, textTransform: 'uppercase',
      }}>{fixture.status?.replace('_', ' ')}</span>
    </div>
  )
}

export default function Live() {
  const [status, setStatus] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('SCHEDULED')

  useEffect(() => {
    fetch(`${API}/live/status`).then(r => r.json()).then(setStatus)

    fetch(`${API}/live/fixtures?status=${filter}`)
      .then(r => r.json())
      .then(d => { setFixtures(d.fixtures || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const configured = status?.configured

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">Fixtures & Leagues</div>
          <div className="page-subtitle">Live fixtures · 8 competitions · football-data.org</div>
        </div>
        {status && (
          <div style={{
            fontSize: '0.7rem', padding: '6px 12px',
            background: configured ? 'var(--green-dim)' : 'var(--yellow-dim)',
            color: configured ? 'var(--green)' : 'var(--yellow)',
            border: `1px solid ${configured ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: 6,
          }}>
            {configured ? '● Live data connected' : '⚠ Set FOOTBALL_DATA_API_KEY in .env'}
          </div>
        )}
      </div>

      {/* Leagues grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {LEAGUES.map(lg => (
          <div key={lg.name} className="card card-sm" style={{ borderLeft: `3px solid ${lg.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{lg.flag}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-1)' }}>{lg.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{lg.country} · 2024/25</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem' }}>
              <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: lg.color }}>{lg.teams}</div>
                <div style={{ color: 'var(--text-3)' }}>Teams</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text-1)' }}>{lg.matches}</div>
                <div style={{ color: 'var(--text-3)' }}>Matches</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premier League fixtures */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <span className="ct-icon">📅</span>
            Premier League Fixtures
            {fixtures.length > 0 && <span className="ct-badge">{fixtures.length} matches</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['SCHEDULED', 'FINISHED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                border: '1px solid var(--border-card)',
                background: filter === s ? 'var(--green-dim)' : 'var(--bg-card2)',
                color: filter === s ? 'var(--green)' : 'var(--text-2)',
                fontSize: '0.7rem', fontFamily: 'Inter', fontWeight: 500,
              }}>{s === 'SCHEDULED' ? 'Upcoming' : 'Results'}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading fixtures...</div>
        ) : !configured ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔑</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 6, fontSize: '0.82rem' }}>API key required for live fixtures</div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>
              Get a free key at{' '}
              <a href="https://www.football-data.org/client/register" target="_blank" rel="noreferrer" style={{ color: 'var(--green)' }}>
                football-data.org
              </a>
              {' '}then set <code>FOOTBALL_DATA_API_KEY</code> in your <code>.env</code> file.
            </div>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="empty">No {filter.toLowerCase()} fixtures found for this period.</div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {fixtures.map((f, i) => <FixtureCard key={i} fixture={f} />)}
          </div>
        )}
      </div>
    </div>
  )
}
