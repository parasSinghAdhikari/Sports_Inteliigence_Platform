import React, { useState, useEffect } from 'react'

const API = '/api'

function TeamCard({ team, onClick }) {
  const pos = team.league_position || '–'
  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-card)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-1)' }}>{team.name}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>2024-25 Premier League</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: pos <= 4 ? 'var(--green)' : 'var(--text-1)' }}>{pos}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>Position</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
        {[
          { label: 'Pts', val: team.points, color: 'var(--green)' },
          { label: 'GD',  val: team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff, color: team.goal_diff > 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'GF',  val: team.goals, color: 'var(--text-1)' },
          { label: 'GA',  val: team.goals_against, color: 'var(--text-2)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card2)', borderRadius: 6, padding: '6px 4px' }}>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem', color: s.color }}>{s.val ?? '–'}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {team.avg_possession && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${team.avg_possession}%`, height: '100%', background: 'var(--green)', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{team.avg_possession}% poss</span>
        </div>
      )}
    </div>
  )
}

function TeamModal({ teamId, onClose }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/teams/${teamId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId])

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal"><div className="loading"><div className="spinner" /></div></div>
    </div>
  )

  const t = data?.team || {}
  const squad = data?.squad || []
  const matches = data?.recent_matches || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem' }}>{t.name}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.72rem', color: 'var(--text-3)' }}>
              <span>League #{t.league_position}</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{t.points} pts</span>
              <span>GD {t.goal_diff > 0 ? '+' : ''}{t.goal_diff}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Goals For',     val: t.goals,           color: 'var(--green)' },
            { label: 'Goals Against', val: t.goals_against,   color: 'var(--red)' },
            { label: 'Clean Sheets',  val: t.clean_sheets,    color: 'var(--cyan)' },
            { label: 'Possession',    val: `${t.avg_possession}%`, color: 'var(--text-1)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val ?? '–'}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['overview','squad','matches'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Wins',          val: t.wins },
              { label: 'Draws',         val: t.draws },
              { label: 'Losses',        val: t.losses },
              { label: 'Avg Shots/Gm',  val: t.avg_shots },
              { label: 'Avg SoT/Gm',    val: t.avg_sot },
              { label: 'xG',            val: t.xg },
            ].map(s => (
              <div key={s.label} className="mini-stat-row">
                <span className="mini-stat-label">{s.label}</span>
                <span className="mini-stat-value">{s.val ?? '–'}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'squad' && (
          <table className="data-table">
            <thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>G</th><th>A</th><th>Min</th></tr></thead>
            <tbody>
              {squad.map(p => (
                <tr key={p.id}>
                  <td className="bold">{p.name}</td>
                  <td><span className={`pos-badge ${p.position}`}>{p.position}</span></td>
                  <td>{p.age}</td>
                  <td className="green">{p.goals}</td>
                  <td style={{ color: 'var(--cyan)' }}>{p.assists}</td>
                  <td className="dim">{p.minutes?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'matches' && (
          <div>
            {matches.slice(0, 8).map((m, i) => {
              const homeWon = m.home_score > m.away_score
              const awayWon = m.away_score > m.home_score
              return (
                <div key={i} className="match-row">
                  <span className="match-week">W{m.matchweek}</span>
                  <span className="match-team home" style={{ fontWeight: homeWon ? 700 : 400 }}>{m.home_team}</span>
                  <span className="match-score">{m.home_score}–{m.away_score}</span>
                  <span className="match-team" style={{ fontWeight: awayWon ? 700 : 400 }}>{m.away_team}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [table, setTable] = useState([])
  const [view, setView] = useState('cards')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/teams/`).then(r => r.json()),
      fetch(`${API}/teams/table`).then(r => r.json()),
    ]).then(([td, tbl]) => {
      const tableData = tbl.table || []
      const mergedTeams = (td.teams || []).map(t => {
        const tr = tableData.find(row => row.team === t.name)
        return {
          ...t,
          points: tr?.points,
          goal_diff: tr?.goal_diff,
          goals_against: tr?.goals_against,
          league_position: tr ? tableData.indexOf(tr) + 1 : null
        }
      })
      setTeams(mergedTeams)
      setTable(tableData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>

  return (
    <div className="page-enter">
      {selected && <TeamModal teamId={selected} onClose={() => setSelected(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">Teams</div>
          <div className="page-subtitle">20 Premier League clubs · 2024-25</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['cards','table'].map(v => (
            <button key={v} className={`btn ${view === v ? 'btn-green' : 'btn-ghost'}`} onClick={() => setView(v)}>
              {v === 'cards' ? '⊞ Cards' : '☰ Table'}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {teams.map(t => (
            <TeamCard key={t.id} team={t} onClick={() => setSelected(t.id)} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={row.team} onClick={() => {
                  const t = teams.find(t => t.name === row.team)
                  if (t) setSelected(t.id)
                }}>
                  <td><span className={`rank-num ${i < 4 ? 'top3' : ''}`}>{i + 1}</span></td>
                  <td className="bold">{row.team}</td>
                  <td>{row.played}</td>
                  <td className="green">{row.wins}</td>
                  <td>{row.draws}</td>
                  <td className="red">{row.losses}</td>
                  <td>{row.goals_for}</td>
                  <td className="dim">{row.goals_against}</td>
                  <td className={row.goal_diff >= 0 ? 'green' : 'red'}>{row.goal_diff > 0 ? '+' : ''}{row.goal_diff}</td>
                  <td className="bold green">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
