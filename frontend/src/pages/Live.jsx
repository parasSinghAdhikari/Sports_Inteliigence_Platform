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
          <tr key={r.team + i} className={zoneClass(i)}>
            <td>{r.position ?? i + 1}</td>
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

function MatchRow({ m }) {
  const score = m.score?.home != null ? `${m.score.home}–${m.score.away}` : 'vs'
  return (
    <div className="match-row" style={{ fontSize: '0.85rem' }}>
      <span className="match-week">W{m.matchday}</span>
      <span className="match-team home">{m.home_team}</span>
      <span className="match-score">{score}</span>
      <span className="match-team">{m.away_team}</span>
      <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
        {m.date ? new Date(m.date).toLocaleDateString() : ''}
      </span>
    </div>
  )
}

export default function Live() {
  const [status, setStatus] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [results, setResults] = useState([])
  const [table, setTable] = useState([])
  const [tab, setTab] = useState('fixtures')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/live/status`)
      .then(r => r.json())
      .then(s => {
        setStatus(s)
        if (!s.configured) { setLoading(false); return }
        return Promise.all([
          fetch(`${API}/live/fixtures?status=SCHEDULED`).then(r => r.json()),
          fetch(`${API}/live/results?limit=15`).then(r => r.json()),
          fetch(`${API}/live/table`).then(r => r.json()),
        ]).then(([f, res, t]) => {
          setFixtures(f.fixtures || [])
          setResults(res.results || [])
          setTable(t.table || [])
          setLoading(false)
        })
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading"><div className="spinner" /> Loading live data...</div>
  )

  if (status && !status.configured) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Fixtures</div>
            <div className="page-subtitle">Upcoming fixtures, delayed scores &amp; live league table</div>
          </div>
        </div>
        <div className="empty" style={{ padding: 32, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>🔌 Live data not configured</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
            Add <code style={{ color: 'var(--cyan)' }}>FOOTBALL_DATA_API_KEY</code> to your{' '}
            <code style={{ color: 'var(--cyan)' }}>.env</code> file (free key at{' '}
            <a href="https://www.football-data.org/client/register" style={{ color: 'var(--cyan)' }} target="_blank" rel="noreferrer">football-data.org</a>),
            then restart the backend.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fixtures &amp; Scores</div>
          <div className="page-subtitle">
            Delayed scores &amp; schedules · football-data.org free tier
          </div>
        </div>
      </div>

      <div className="empty" style={{ padding: '10px 16px', marginBottom: 20, fontSize: '0.75rem', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        ⓘ The free plan provides <strong style={{ color: 'var(--text-2)' }}>delayed</strong> scores and schedules — not real-time. Live scores require a paid plan.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'fixtures', label: '📅 Upcoming Fixtures' },
          { id: 'results',  label: '🏁 Recent Results' },
          { id: 'table',    label: '📊 League Table' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Inter', fontSize: '0.85rem', fontWeight: 500,
            border: '1px solid var(--border)',
            background: tab === t.id ? 'rgba(0,212,255,0.1)' : 'var(--bg-card)',
            color: tab === t.id ? 'var(--cyan)' : 'var(--text-2)',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'fixtures' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }} className="card-title">
            <span style={{ color: 'var(--cyan)' }}>📅</span> Upcoming Fixtures
          </div>
          {fixtures.length === 0 ? (
            <div className="empty" style={{ padding: 28 }}>No upcoming fixtures right now.</div>
          ) : (
            <div style={{ padding: '8px 20px 20px' }}>
              {fixtures.map((m, i) => <MatchRow key={m.id ?? i} m={m} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }} className="card-title">
            <span style={{ color: 'var(--green)' }}>🏁</span> Recent Results <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 400 }}>· delayed</span>
          </div>
          {results.length === 0 ? (
            <div className="empty" style={{ padding: 28 }}>No finished matches yet.</div>
          ) : (
            <div style={{ padding: '8px 20px 20px' }}>
              {results.map((m, i) => <MatchRow key={m.id ?? i} m={m} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }} className="card-title">
            <span style={{ color: 'var(--cyan)' }}>📊</span> League Table
          </div>
          {table.length === 0 ? (
            <div className="empty" style={{ padding: 28 }}>League table unavailable.</div>
          ) : (
            <div style={{ padding: '8px 20px 20px' }}>
              <LeagueTable rows={table} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
