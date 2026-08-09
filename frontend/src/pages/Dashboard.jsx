import React, { useState, useEffect } from 'react'

const API = '/api'

function LeagueTable({ rows }) {
  const zoneClass = (i) => {
    if (i < 4) return 'ucl'
    if (i < 6) return 'uel'
    if (i >= 17) return 'rel'
    return ''
  }

  return (
    <table className="league-table">
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
        {rows.map((r, i) => (
          <tr key={r.team} className={zoneClass(i)}>
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
  )
}

function ScorerList({ players, label }) {
  return (
    <div>
      {players.map((p, i) => (
        <div className="scorer-row" key={p.id}>
          <div className={`scorer-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
          <div className="scorer-avatar">
            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="scorer-info">
            <div className="scorer-name">{p.name}</div>
            <div className="scorer-team">{p.team} · {p.position}</div>
          </div>
          <div className="scorer-stat">
            <div className="scorer-goals">{p[label]}</div>
            <div className="scorer-per90">{p.goals_per90 ?? p.assists_per90}/90</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchList({ matches }) {
  return (
    <div>
      {matches.map((m, i) => (
        <div className="match-row" key={i}>
          <span className="match-week">W{m.matchweek}</span>
          <span className="match-team home">{m.home_team}</span>
          <span className="match-score">{m.home_score} – {m.away_score}</span>
          <span className="match-team">{m.away_team}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/dashboard/`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Loading dashboard...
    </div>
  )

  if (!data) return <div className="empty">Failed to load data.</div>

  const s = data.summary

  return (
    <div>
      {/* Hero stats */}
      <div className="hero-stats">
        <div className="stat-hero">
          <div className="stat-hero-icon">⚽</div>
          <div className="stat-hero-label">Total Goals</div>
          <div className="stat-hero-value">{s.total_goals}</div>
          <div className="stat-hero-sub">{s.avg_goals_per_match} per match avg</div>
        </div>
        <div className="stat-hero">
          <div className="stat-hero-icon">🏆</div>
          <div className="stat-hero-label">Top Scorer</div>
          <div className="stat-hero-value" style={{ fontSize: '1.2rem' }}>
            {data.top_scorers[0]?.name.split(' ').pop()}
          </div>
          <div className="stat-hero-sub">{data.top_scorers[0]?.goals} goals · {data.top_scorers[0]?.goals_per90}/90</div>
        </div>
        <div className="stat-hero">
          <div className="stat-hero-icon">🎯</div>
          <div className="stat-hero-label">Matches Played</div>
          <div className="stat-hero-value">{s.total_matches}</div>
          <div className="stat-hero-sub">Premier League 2024-25</div>
        </div>
        <div className="stat-hero">
          <div className="stat-hero-icon">🔥</div>
          <div className="stat-hero-label">Highest Scoring</div>
          <div className="stat-hero-value">{s.highest_scoring_match}</div>
          <div className="stat-hero-sub">goals in one match</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* League Table */}
        <div className="card" style={{ gridRow: 'span 2' }}>
          <div className="card-title">
            <span style={{ color: 'var(--cyan)' }}>📊</span> League Table
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '12px', display: 'flex', gap: '12px' }}>
            <span><span style={{ color: 'var(--cyan)', fontWeight: 700 }}>━</span> UCL</span>
            <span><span style={{ color: 'var(--purple)', fontWeight: 700 }}>━</span> UEL</span>
            <span><span style={{ color: 'var(--red)', fontWeight: 700 }}>━</span> Relegation</span>
          </div>
          <LeagueTable rows={data.table_top6 || []} />
        </div>

        {/* Top Scorers */}
        <div className="card">
          <div className="card-title">
            <span style={{ color: 'var(--cyan)' }}>⚽</span> Top Scorers
          </div>
          <ScorerList players={data.top_scorers} label="goals" />
        </div>

        {/* Top Assists */}
        <div className="card">
          <div className="card-title">
            <span style={{ color: 'var(--purple)' }}>🎯</span> Top Assists
          </div>
          <ScorerList
            players={data.top_assists.map(p => ({
              ...p,
              goals_per90: p.assists_per90,
            }))}
            label="assists"
          />
        </div>

        {/* Recent Results */}
        <div className="card" style={{ gridColumn: '2 / -1' }}>
          <div className="card-title">
            <span style={{ color: 'var(--green)' }}>🕐</span> Recent Results
          </div>
          <MatchList matches={data.recent_results} />
        </div>
      </div>
    </div>
  )
}
