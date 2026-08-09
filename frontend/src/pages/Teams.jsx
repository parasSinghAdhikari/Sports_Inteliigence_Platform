import React, { useState, useEffect } from 'react'

const API = '/api'

function TeamDetailModal({ teamId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/teams/${teamId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 760,
          width: '100%', maxHeight: '85vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading...</div>
        ) : !data ? (
          <div className="empty">Failed to load team data.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800 }}>
                  {data.team.name}
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>
                  Premier League · 2024-25 Season
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-2)', padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'Inter', fontSize: '0.85rem',
              }}>✕ Close</button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Goals', value: data.team.goals, accent: true },
                { label: 'Assists', value: data.team.assists },
                { label: 'Possession', value: `${data.team.avg_possession}%`, accent: true },
                { label: 'G/90', value: data.team.goals_per90 },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg-card2)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 800,
                    color: s.accent ? 'var(--cyan)' : 'var(--text-1)',
                  }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Possession bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 6 }}>
                Avg Possession: {data.team.avg_possession}%
              </div>
              <div className="poss-bar">
                <div className="poss-bar-fill" style={{ width: `${data.team.avg_possession}%` }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Recent results */}
              <div>
                <div className="card-title" style={{ marginBottom: 12 }}>Recent Results</div>
                {data.recent_results.map((r, i) => (
                  <div key={i} className="match-row">
                    <span className="match-team home" style={{ fontSize: '0.78rem' }}>{r.home_team}</span>
                    <span className="match-score">{r.home_score}–{r.away_score}</span>
                    <span className="match-team" style={{ fontSize: '0.78rem' }}>{r.away_team}</span>
                  </div>
                ))}
              </div>

              {/* Squad */}
              <div>
                <div className="card-title" style={{ marginBottom: 12 }}>Top Players by Minutes</div>
                {data.squad.slice(0, 8).map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    fontSize: '0.82rem',
                  }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                      {p.goals ?? 0}G {p.assists ?? 0}A
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [table, setTable] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [view, setView] = useState('grid') // 'grid' | 'table'

  useEffect(() => {
    Promise.all([
      fetch(`${API}/teams/`).then(r => r.json()),
      fetch(`${API}/teams/table`).then(r => r.json()),
    ]).then(([td, tbl]) => {
      setTeams(td.teams)
      setTable(tbl.table)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading"><div className="spinner" /> Loading teams...</div>
  )

  return (
    <div>
      {selectedTeam && (
        <TeamDetailModal teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Teams</div>
          <div className="page-subtitle">All 20 Premier League clubs · 2024-25</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['grid', 'table'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter',
              fontSize: '0.85rem', fontWeight: 500, border: '1px solid var(--border)',
              background: view === v ? 'rgba(0,212,255,0.1)' : 'var(--bg-card)',
              color: view === v ? 'var(--cyan)' : 'var(--text-2)',
              transition: 'all 0.2s',
            }}>
              {v === 'grid' ? '⊞ Grid' : '☰ Table'}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="teams-grid">
          {teams.map(t => (
            <div key={t.id} className="team-card" onClick={() => setSelectedTeam(t.id)}>
              <div className="team-card-name">{t.name}</div>
              <div className="team-stat-row">
                <span className="team-stat-label">Goals</span>
                <span className="team-stat-value cyan">{t.goals ?? '–'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Assists</span>
                <span className="team-stat-value">{t.assists ?? '–'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Players Used</span>
                <span className="team-stat-value">{t.players_used ?? '–'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Avg Age</span>
                <span className="team-stat-value">{t.avg_age ?? '–'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Goals/90</span>
                <span className="team-stat-value">{t.goals_per90 ?? '–'}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 4 }}>
                  Possession {t.avg_possession}%
                </div>
                <div className="poss-bar">
                  <div className="poss-bar-fill" style={{ width: `${t.avg_possession}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="league-table" style={{ padding: '0 20px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={r.team}
                  onClick={() => setSelectedTeam(r.id)}
                  style={{ cursor: 'pointer' }}
                  className={i < 4 ? 'ucl' : i < 6 ? 'uel' : i >= 17 ? 'rel' : ''}
                >
                  <td>{i + 1}</td>
                  <td>{r.team}</td>
                  <td>{r.played}</td>
                  <td>{r.wins}</td>
                  <td>{r.draws}</td>
                  <td>{r.losses}</td>
                  <td>{r.goals_for}</td>
                  <td>{r.goals_against}</td>
                  <td style={{ color: r.goal_diff > 0 ? '#22c55e' : r.goal_diff < 0 ? '#ef4444' : '#8b9cc8' }}>
                    {r.goal_diff > 0 ? '+' : ''}{r.goal_diff}
                  </td>
                  <td className="pts">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
