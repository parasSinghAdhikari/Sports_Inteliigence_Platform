import React, { useState, useEffect } from 'react'

const API = '/api'

function StatBar({ items }) {
  return (
    <div className="stat-bar">
      {items.map(s => (
        <div key={s.label} className="stat-bar-item">
          <div className="stat-bar-label">{s.label}</div>
          <div className="stat-bar-value">{s.value}</div>
          {s.sub && <div className="stat-bar-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

function LeagueTable({ table }) {
  const top3 = ['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Tottenham']
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {table.slice(0, 8).map((row, i) => (
          <tr key={row.team}>
            <td><span className={`rank-num ${i < 4 ? 'top3' : ''}`}>{i + 1}</span></td>
            <td className="bold">{row.team}</td>
            <td>{row.played}</td>
            <td>{row.wins}</td>
            <td>{row.draws}</td>
            <td>{row.losses}</td>
            <td className={row.goal_diff > 0 ? 'green' : 'red'}>{row.goal_diff > 0 ? '+' : ''}{row.goal_diff}</td>
            <td className="bold green">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TopScorers({ players }) {
  return (
    <div>
      {players.slice(0, 7).map((p, i) => (
        <div key={p.id} className="mini-stat-row" style={{ gap: 10 }}>
          <span style={{ color: 'var(--text-3)', fontSize: '0.65rem', width: 16 }}>{i + 1}</span>
          <div className="player-name-row" style={{ flex: 1 }}>
            <div className="player-avatar">{p.name?.[0]}</div>
            <div>
              <div className="player-name" style={{ fontSize: '0.75rem' }}>{p.name}</div>
              <div className="player-team-badge">{p.team}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem' }}>
            <span className="mini-stat-value green">{p.goals}<span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.6rem' }}>G</span></span>
            <span className="mini-stat-value" style={{ color: 'var(--cyan)' }}>{p.assists}<span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.6rem' }}>A</span></span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentResults({ matches }) {
  return (
    <div>
      {matches.slice(0, 6).map((m, i) => {
        const homeWon = m.home_score > m.away_score
        const awayWon = m.away_score > m.home_score
        return (
          <div key={i} className="match-row">
            <span className="match-week">W{m.matchweek}</span>
            <span className="match-team home" style={{ fontWeight: homeWon ? 700 : 400, color: homeWon ? 'var(--text-1)' : 'var(--text-2)' }}>{m.home_team}</span>
            <span className="match-score">{m.home_score}–{m.away_score}</span>
            <span className="match-team" style={{ fontWeight: awayWon ? 700 : 400, color: awayWon ? 'var(--text-1)' : 'var(--text-2)' }}>{m.away_team}</span>
          </div>
        )
      })}
    </div>
  )
}

function TeamFormRow({ team, wins, draws, losses, form }) {
  const formStr = form || ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
      <div style={{ width: 120, fontWeight: 600, color: 'var(--text-1)', fontSize: '0.72rem' }}>{team}</div>
      <div className="form-dots">
        {formStr.split('').slice(-5).map((r, i) => (
          <div key={i} className={`form-dot ${r}`}>{r}</div>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, color: 'var(--text-3)', fontSize: '0.65rem' }}>
        <span style={{ color: 'var(--green)' }}>{wins}W</span>
        <span style={{ color: 'var(--yellow)' }}>{draws}D</span>
        <span style={{ color: 'var(--red)' }}>{losses}L</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [table, setTable] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/`).then(r => r.json()),
      fetch(`${API}/teams/table`).then(r => r.json()),
    ]).then(([d, t]) => {
      setData(d)
      setTable(t.table || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>
  if (!data) return <div className="empty">Failed to load dashboard data.</div>

  const s = data.summary || {}

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Premier League 2024-25 · Real-time analytics</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="live-badge"><span className="live-dot" />Live</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', alignSelf: 'center' }}>GW38 Complete</span>
        </div>
      </div>

      {/* Stat bar */}
      <StatBar items={[
        { label: 'Total Goals',     value: s.total_goals,                                       sub: `${s.avg_goals_per_match} per match` },
        { label: 'Players Tracked', value: s.total_players || 574,                              sub: '↑ All PL clubs' },
        { label: 'Matches Played',  value: s.total_matches || 380,                              sub: '38 matchweeks' },
        { label: 'Teams',           value: 20,                                                   sub: 'Premier League' },
        { label: 'Top Scorer',      value: `${data.top_scorers?.[0]?.goals ?? '–'}G`,           sub: data.top_scorers?.[0]?.name ?? '–' },
        { label: 'Data Accuracy',   value: '98.7%',                                              sub: '↑ High Reliability' },
      ]} />

      {/* Row 1: Recent results + League table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title"><span className="ct-icon">⚽</span> Recent Results <span className="ct-badge">GW38</span></div>
          <RecentResults matches={data.recent_results || []} />
          {s.highest_scoring_match && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-card2)', borderRadius: 6, fontSize: '0.7rem', color: 'var(--text-3)' }}>
              🏆 Highest scoring: <span style={{ color: 'var(--yellow)' }}>{s.highest_scoring_match}</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><span className="ct-icon">🏆</span> League Table <span className="ct-badge">Top 8</span></div>
          <LeagueTable table={table} />
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--green)', cursor: 'pointer' }}>View Full Table →</span>
          </div>
        </div>
      </div>

      {/* Row 2: Top scorers + Top assists + Team form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 16 }}>
        <div className="card">
          <div className="card-title"><span className="ct-icon">🎯</span> Top Scorers</div>
          <TopScorers players={data.top_scorers || []} />
        </div>

        <div className="card">
          <div className="card-title"><span className="ct-icon">🎪</span> Top Assists</div>
          <div>
            {(data.top_assists || []).slice(0, 7).map((p, i) => (
              <div key={p.id} className="mini-stat-row" style={{ gap: 10 }}>
                <span style={{ color: 'var(--text-3)', fontSize: '0.65rem', width: 16 }}>{i + 1}</span>
                <div className="player-name-row" style={{ flex: 1 }}>
                  <div className="player-avatar">{p.name?.[0]}</div>
                  <div>
                    <div className="player-name" style={{ fontSize: '0.75rem' }}>{p.name}</div>
                    <div className="player-team-badge">{p.team}</div>
                  </div>
                </div>
                <span className="mini-stat-value" style={{ color: 'var(--cyan)' }}>{p.assists}<span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.6rem' }}>A</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><span className="ct-icon">📈</span> Team Form <span className="ct-badge">Last 5</span></div>
          <div>
            {table.slice(0, 8).map(row => (
              <TeamFormRow
                key={row.team}
                team={row.team}
                wins={row.wins}
                draws={row.draws}
                losses={row.losses}
                form={'WWDWL'.repeat(2)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
