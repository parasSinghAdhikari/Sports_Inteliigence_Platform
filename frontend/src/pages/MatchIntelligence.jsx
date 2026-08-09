import React, { useState, useEffect, useCallback } from 'react'

const API = '/api'

/* ── Small reusable components ───────────────────────── */

function StatCompareBar({ label, v1, v2, team1, team2, higherIsBetter = true }) {
  const total = (v1 || 0) + (v2 || 0)
  const pct1 = total > 0 ? ((v1 || 0) / total) * 100 : 50
  const pct2 = 100 - pct1
  const color1 = higherIsBetter
    ? (v1 > v2 ? 'var(--cyan)' : 'rgba(0,212,255,0.3)')
    : (v1 < v2 ? 'var(--cyan)' : 'rgba(0,212,255,0.3)')
  const color2 = higherIsBetter
    ? (v2 > v1 ? 'var(--purple)' : 'rgba(168,85,247,0.3)')
    : (v2 < v1 ? 'var(--purple)' : 'rgba(168,85,247,0.3)')

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 700, color: color1 }}>{v1 ?? '–'}</span>
        <span style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        <span style={{ fontWeight: 700, color: color2 }}>{v2 ?? '–'}</span>
      </div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        <div style={{ width: `${pct1}%`, background: color1, borderRadius: '3px 0 0 3px', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${pct2}%`, background: color2, borderRadius: '0 3px 3px 0', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.65rem', color: 'var(--text-3)' }}>
        <span>{team1}</span>
        <span>{team2}</span>
      </div>
    </div>
  )
}

function MatchCard({ match, onClick }) {
  const homeWon = match.home_score > match.away_score
  const awayWon = match.away_score > match.home_score

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card2)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
        transition: 'all 0.2s', marginBottom: 8,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-glow)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', width: 22 }}>W{match.matchweek}</span>
        <span style={{
          flex: 1, textAlign: 'right', fontWeight: homeWon ? 700 : 400,
          color: homeWon ? 'var(--text-1)' : 'var(--text-2)', fontSize: '0.85rem',
        }}>{match.home_team}</span>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem',
          padding: '2px 10px', background: 'rgba(255,255,255,0.05)',
          borderRadius: 6, letterSpacing: 1, minWidth: 52, textAlign: 'center',
        }}>{match.home_score}–{match.away_score}</span>
        <span style={{
          flex: 1, fontWeight: awayWon ? 700 : 400,
          color: awayWon ? 'var(--text-1)' : 'var(--text-2)', fontSize: '0.85rem',
        }}>{match.away_team}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', marginLeft: 4 }}>▶</span>
      </div>
    </div>
  )
}

/* ── Match Detail Modal ──────────────────────────────── */
function MatchDetailModal({ gameId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/intel/match/${gameId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [gameId])

  const home = data?.team_stats?.find(s => s.venue === 'Home')
  const away = data?.team_stats?.find(s => s.venue === 'Away')
  const m = data?.match

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 560,
        width: '100%', maxHeight: '85vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : !data ? (
          <div className="empty">Stats not yet loaded for this match.</div>
        ) : (
          <>
            {/* Score header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 8 }}>
                Matchweek {m.matchweek} · {m.match_date?.slice(0, 10)} · {m.venue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem' }}>{m.home_team}</span>
                <span style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '2rem',
                  padding: '6px 18px', background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10, letterSpacing: 2,
                }}>{m.home_score} – {m.away_score}</span>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem' }}>{m.away_team}</span>
              </div>
              {m.referee && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8 }}>Ref: {m.referee}</div>}
            </div>

            {home && away ? (
              <div>
                <div className="card-title" style={{ marginBottom: 16 }}>
                  <span style={{ color: 'var(--cyan)' }}>📊</span> Match Stats
                </div>
                <StatCompareBar label="Shots" v1={home.shots} v2={away.shots} team1={m.home_team} team2={m.away_team} />
                <StatCompareBar label="Shots on Target" v1={home.shots_on_target} v2={away.shots_on_target} team1={m.home_team} team2={m.away_team} />
                <StatCompareBar label="Fouls" v1={home.fouls} v2={away.fouls} team1={m.home_team} team2={m.away_team} higherIsBetter={false} />
                <StatCompareBar label="Yellow Cards" v1={home.yellow_cards} v2={away.yellow_cards} team1={m.home_team} team2={m.away_team} higherIsBetter={false} />

                {/* SoT % */}
                {home.shots > 0 || away.shots > 0 ? (
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    {[
                      { label: 'Shot Accuracy', val: home.shots > 0 ? ((home.shots_on_target / home.shots) * 100).toFixed(0) + '%' : '–', team: m.home_team, color: 'var(--cyan)' },
                      { label: 'Shot Accuracy', val: away.shots > 0 ? ((away.shots_on_target / away.shots) * 100).toFixed(0) + '%' : '–', team: m.away_team, color: 'var(--purple)' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        flex: 1, background: 'var(--bg-card2)', borderRadius: 10, padding: '12px 16px',
                        border: '1px solid var(--border)', textAlign: 'center',
                      }}>
                        <div style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>{s.team} SoT%</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="empty" style={{ padding: '24px' }}>
                Per-match stats not yet available. Run <code>load_match_stats.py</code> to populate.
              </div>
            )}

            <button onClick={onClose} style={{
              marginTop: 20, width: '100%', padding: '10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.85rem',
            }}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── H2H Panel ──────────────────────────────────────── */
function H2HPanel({ teams: allTeams }) {
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const search = () => {
    if (!team1 || !team2) return
    setLoading(true)
    fetch(`${API}/intel/head-to-head?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const teamNames = allTeams.map(t => t.name)

  return (
    <div>
      <div className="card-title"><span style={{ color: 'var(--purple)' }}>⚔️</span> Head-to-Head</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="filter-select" style={{ flex: 1 }} value={team1} onChange={e => setTeam1(e.target.value)}>
          <option value="">Select Team 1...</option>
          {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="filter-select" style={{ flex: 1 }} value={team2} onChange={e => setTeam2(e.target.value)}>
          <option value="">Select Team 2...</option>
          {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={search} style={{
          padding: '9px 18px', borderRadius: 8, background: 'rgba(0,212,255,0.1)',
          border: '1px solid rgba(0,212,255,0.3)', color: 'var(--cyan)',
          cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter', fontSize: '0.85rem',
        }}>Compare</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {data && !loading && (
        <>
          {/* Record bar */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 32, marginBottom: 16 }}>
            {[
              { label: `${data.record.team1_wins}W`, pct: data.record.team1_wins, color: 'var(--cyan)' },
              { label: `${data.record.draws}D`, pct: data.record.draws, color: 'rgba(255,255,255,0.15)' },
              { label: `${data.record.team2_wins}W`, pct: data.record.team2_wins, color: 'var(--purple)' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: s.pct || 0.01, background: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem', color: 'var(--bg-base)',
                transition: 'flex 0.5s ease', minWidth: s.pct > 0 ? 32 : 0,
              }}>
                {s.pct > 0 ? s.label : ''}
              </div>
            ))}
          </div>

          {/* Match list */}
          {data.matches.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>No meetings found in the 2024-25 season.</div>
          ) : (
            data.matches.map((m, i) => (
              <div key={i} className="match-row" style={{ fontSize: '0.82rem' }}>
                <span className="match-week" style={{ width: 22 }}>W{m.matchweek}</span>
                <span className="match-team home">{m.home_team}</span>
                <span className="match-score">{m.home_score}–{m.away_score}</span>
                <span className="match-team">{m.away_team}</span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

/* ── Shooting Leaders Panel ─────────────────────────── */
function ShootingLeaders() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/intel/league/shooting-leaders`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data?.teams?.length) return (
    <div className="empty" style={{ padding: 24 }}>
      Shooting data not yet loaded.<br />
      <code style={{ fontSize: '0.78rem', color: 'var(--cyan)' }}>
        python scripts/extract_match_stats.py && python scripts/load_match_stats.py
      </code>
    </div>
  )

  const maxShots = Math.max(...data.teams.map(t => parseFloat(t.avg_shots) || 0))

  return (
    <div>
      {data.teams.map((t, i) => (
        <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ color: i < 3 ? 'var(--cyan)' : 'var(--text-3)', fontWeight: 700, width: 18, fontSize: '0.75rem' }}>{i + 1}</span>
            <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>{t.team}</span>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, color: 'var(--cyan)', fontSize: '1rem' }}>{t.avg_shots}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', width: 55, textAlign: 'right' }}>{t.avg_sot} SoT</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--purple)', width: 45, textAlign: 'right' }}>{t.sot_pct}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginLeft: 28 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${((parseFloat(t.avg_shots) || 0) / maxShots) * 100}%`,
              background: i < 3 ? 'linear-gradient(90deg, var(--cyan), var(--purple))' : 'rgba(0,212,255,0.3)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function MatchIntelligence() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(null)
  const [weekFilter, setWeekFilter] = useState('All')
  const [tab, setTab] = useState('results') // 'results' | 'h2h' | 'shooting'

  useEffect(() => {
    Promise.all([
      fetch(`${API}/matches/recent?limit=380`).then(r => r.json()),
      fetch(`${API}/teams/`).then(r => r.json()),
    ]).then(([md, td]) => {
      setMatches(md.matches || [])
      setTeams(td.teams || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const weeks = ['All', ...Array.from(new Set(matches.map(m => m.matchweek))).sort((a, b) => a - b)]
  const filtered = weekFilter === 'All' ? matches : matches.filter(m => m.matchweek == weekFilter)

  if (loading) return <div className="loading"><div className="spinner" />Loading matches...</div>

  return (
    <div>
      {selectedGame && (
        <MatchDetailModal gameId={selectedGame} onClose={() => setSelectedGame(null)} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Match Intelligence</div>
          <div className="page-subtitle">Per-match stats, head-to-head records, shooting analysis</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'results', label: '📅 Results', },
          { id: 'h2h',     label: '⚔️ Head-to-Head' },
          { id: 'shooting',label: '🎯 Shooting Leaders' },
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

      {tab === 'results' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          <div>
            {/* Matchweek filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {weeks.slice(0, 40).map(w => (
                <button key={w} onClick={() => setWeekFilter(w)} style={{
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: 600,
                  border: '1px solid var(--border)',
                  background: weekFilter == w ? 'rgba(0,212,255,0.12)' : 'var(--bg-card2)',
                  color: weekFilter == w ? 'var(--cyan)' : 'var(--text-3)',
                }}>{w === 'All' ? 'All Weeks' : `W${w}`}</button>
              ))}
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
              {filtered.map(m => (
                <MatchCard key={m.game_id || m.id} match={m} onClick={() => setSelectedGame(m.game_id || m.id)} />
              ))}
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="card">
            <div className="card-title"><span style={{ color: 'var(--cyan)' }}>📊</span> Season Stats</div>
            {[
              { label: 'Total Matches', val: matches.length },
              { label: 'Matchweeks', val: Math.max(...matches.map(m => m.matchweek || 0)) },
              { label: 'Total Goals', val: matches.reduce((a, m) => a + (m.home_score || 0) + (m.away_score || 0), 0) },
              { label: 'Avg Goals/Match', val: (matches.reduce((a, m) => a + (m.home_score || 0) + (m.away_score || 0), 0) / (matches.length || 1)).toFixed(2) },
              { label: 'Home Wins', val: matches.filter(m => m.home_score > m.away_score).length },
              { label: 'Draws', val: matches.filter(m => m.home_score === m.away_score).length },
              { label: 'Away Wins', val: matches.filter(m => m.away_score > m.home_score).length },
            ].map(s => (
              <div key={s.label} className="team-stat-row">
                <span className="team-stat-label">{s.label}</span>
                <span className="team-stat-value cyan">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'h2h' && (
        <div className="card" style={{ maxWidth: 660 }}>
          <H2HPanel teams={teams} />
        </div>
      )}

      {tab === 'shooting' && (
        <div className="card" style={{ maxWidth: 660 }}>
          <div className="card-title">
            <span style={{ color: 'var(--cyan)' }}>🎯</span> Teams by Avg Shots / Match
            <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: 4 }}>· SoT = shots on target · SoT% = accuracy</span>
          </div>
          <ShootingLeaders />
        </div>
      )}
    </div>
  )
}
