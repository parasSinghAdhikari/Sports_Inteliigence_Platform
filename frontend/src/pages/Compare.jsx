import React, { useState, useEffect, useCallback } from 'react'

const API = '/api'

const STAT_KEYS = [
  { key: 'goals',                       label: 'Goals' },
  { key: 'assists',                     label: 'Assists' },
  { key: 'goals_plus_assists',          label: 'G + A' },
  { key: 'goals_per90',                 label: 'Goals / 90' },
  { key: 'assists_per90',               label: 'Assists / 90' },
  { key: 'goal_contributions_per90',    label: 'G+A / 90' },
  { key: 'minutes',                     label: 'Minutes' },
  { key: 'non_pen_goals',               label: 'Non-Pen Goals' },
  { key: 'yellow_cards',                label: 'Yellow Cards' },
  { key: 'red_cards',                   label: 'Red Cards' },
]

function PlayerSearchBox({ label, value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value || value.length < 2) { setSuggestions([]); return }
    const t = setTimeout(() => {
      fetch(`${API}/players/?search=${encodeURIComponent(value)}&limit=8`)
        .then(r => r.json())
        .then(d => { setSuggestions(d.players); setOpen(true) })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div style={{ position: 'relative' }}>
      <div className="compare-search">
        <label>{label}</label>
        <input
          className="search-input"
          style={{ width: '100%' }}
          placeholder="Type player name..."
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => suggestions.length && setOpen(true)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-card2)', border: '1px solid var(--border-glow)',
          borderRadius: 10, overflow: 'hidden', marginTop: 4,
        }}>
          {suggestions.map(p => (
            <div
              key={p.id}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
                fontSize: '0.85rem',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={() => { onSelect(p); setOpen(false) }}
            >
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                {p.team} · {p.position}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBar({ label, v1, v2, max }) {
  const pct1 = max > 0 ? Math.min((v1 / max) * 100, 100) : 0
  const pct2 = max > 0 ? Math.min((v2 / max) * 100, 100) : 0
  const winner1 = v1 > v2
  const winner2 = v2 > v1

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6, fontSize: '0.8rem',
      }}>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem',
          color: winner1 ? 'var(--cyan)' : 'var(--text-1)',
        }}>
          {v1 != null ? v1 : '–'}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem',
          color: winner2 ? 'var(--cyan)' : 'var(--text-1)',
        }}>
          {v2 != null ? v2 : '–'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* P1 bar (grows left to right, but reversed) */}
        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', transform: 'scaleX(-1)' }}>
          <div style={{
            height: '100%', width: `${pct1}%`,
            background: winner1 ? 'var(--cyan)' : 'rgba(0,212,255,0.3)',
            borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct2}%`,
            background: winner2 ? 'var(--purple)' : 'rgba(168,85,247,0.3)',
            borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

export default function Compare() {
  const [search1, setSearch1] = useState('')
  const [search2, setSearch2] = useState('')
  const [player1, setPlayer1] = useState(null)
  const [player2, setPlayer2] = useState(null)
  const [p1data, setP1data] = useState(null)
  const [p2data, setP2data] = useState(null)

  const loadPlayer = useCallback((id, setter) => {
    fetch(`${API}/players/${id}`)
      .then(r => r.json())
      .then(setter)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (player1) { setSearch1(player1.name); loadPlayer(player1.id, setP1data) }
  }, [player1])

  useEffect(() => {
    if (player2) { setSearch2(player2.name); loadPlayer(player2.id, setP2data) }
  }, [player2])

  const getMax = (key) => {
    const v1 = p1data?.[key] ?? 0
    const v2 = p2data?.[key] ?? 0
    return Math.max(Number(v1), Number(v2), 1)
  }

  const Avatar = ({ name, gradient }) => (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.6rem', fontWeight: 800, color: 'var(--bg-base)',
      margin: '0 auto 12px',
    }}>
      {(name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Compare Players</div>
          <div className="page-subtitle">Head-to-head stats comparison</div>
        </div>
      </div>

      {/* Search inputs */}
      <div className="compare-layout" style={{ marginBottom: 24 }}>
        <PlayerSearchBox
          label="Player 1"
          value={search1}
          onChange={setSearch1}
          onSelect={p => { setPlayer1(p); setP1data(null) }}
        />
        <div className="compare-vs">VS</div>
        <PlayerSearchBox
          label="Player 2"
          value={search2}
          onChange={setSearch2}
          onSelect={p => { setPlayer2(p); setP2data(null) }}
        />
      </div>

      {!player1 && !player2 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚖️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Compare Any Two Players</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            Type a player's name above to search. Try "Salah" vs "Haaland".
          </div>
        </div>
      )}

      {(player1 || player2) && (
        <>
          {/* Player headers */}
          <div className="compare-layout" style={{ marginBottom: 0, alignItems: 'stretch' }}>
            <div className="compare-card">
              {p1data ? (
                <div className="compare-player-header">
                  <Avatar name={p1data.name} gradient="linear-gradient(135deg, var(--cyan), #0099bb)" />
                  <div className="compare-name">{p1data.name}</div>
                  <div className="compare-meta">{p1data.team} · {p1data.position} · Age {p1data.age}</div>
                </div>
              ) : player1 ? (
                <div className="loading" style={{ minHeight: 100 }}>
                  <div className="spinner" />
                </div>
              ) : (
                <div className="empty" style={{ padding: 40 }}>Search for Player 1</div>
              )}
            </div>

            <div className="compare-vs">VS</div>

            <div className="compare-card">
              {p2data ? (
                <div className="compare-player-header">
                  <Avatar name={p2data.name} gradient="linear-gradient(135deg, var(--purple), #6b21a8)" />
                  <div className="compare-name">{p2data.name}</div>
                  <div className="compare-meta">{p2data.team} · {p2data.position} · Age {p2data.age}</div>
                </div>
              ) : player2 ? (
                <div className="loading" style={{ minHeight: 100 }}>
                  <div className="spinner" />
                </div>
              ) : (
                <div className="empty" style={{ padding: 40 }}>Search for Player 2</div>
              )}
            </div>
          </div>

          {/* Stats comparison */}
          {p1data && p2data && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-title">
                <span style={{ color: 'var(--cyan)' }}>📊</span> Head-to-Head Stats
              </div>
              {STAT_KEYS.map(({ key, label }) => (
                <StatBar
                  key={key}
                  label={label}
                  v1={p1data[key] != null ? Number(p1data[key]) : null}
                  v2={p2data[key] != null ? Number(p2data[key]) : null}
                  max={getMax(key)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
