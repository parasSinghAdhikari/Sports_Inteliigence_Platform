import React, { useState, useEffect } from 'react'

const API = '/api'

function MatchDetailModal({ gameId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(`${API}/intel/match/${gameId}`)
      .then(r => r.json()).then(setData).catch(() => {})
  }, [gameId])

  const m = data?.match
  const home = data?.team_stats?.find(s => s.venue === 'Home')
  const away = data?.team_stats?.find(s => s.venue === 'Away')

  const CompareRow = ({ label, v1, v2 }) => {
    const n1 = Number(v1) || 0, n2 = Number(v2) || 0
    const total = n1 + n2
    const p1 = total ? (n1/total)*100 : 50
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
          <span style={{ fontWeight: n1 > n2 ? 700 : 400, color: n1 > n2 ? 'var(--green)' : 'var(--text-2)' }}>{v1 ?? '–'}</span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.62rem' }}>{label}</span>
          <span style={{ fontWeight: n2 > n1 ? 700 : 400, color: n2 > n1 ? 'var(--purple)' : 'var(--text-2)' }}>{v2 ?? '–'}</span>
        </div>
        <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2 }}>
          <div style={{ width: `${p1}%`, background: n1 >= n2 ? 'var(--green)' : 'rgba(16,185,129,0.3)', borderRadius: '2px 0 0 2px' }} />
          <div style={{ width: `${100-p1}%`, background: n2 > n1 ? 'var(--purple)' : 'rgba(139,92,246,0.3)', borderRadius: '0 2px 2px 0' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {!data ? <div className="loading"><div className="spinner" /></div> : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 8 }}>
                Matchweek {m?.matchweek} · {m?.match_date?.slice(0,10)} · {m?.venue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem' }}>{m?.home_team}</span>
                <span style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.8rem',
                  padding: '4px 16px', background: 'var(--bg-card2)', borderRadius: 8, letterSpacing: 2,
                }}>{m?.home_score} – {m?.away_score}</span>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem' }}>{m?.away_team}</span>
              </div>
              {m?.referee && <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 6 }}>Ref: {m.referee}</div>}
            </div>

            {home && away ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 10 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{m?.home_team}</span>
                  <span>Match Stats</span>
                  <span style={{ color: 'var(--purple)', fontWeight: 700 }}>{m?.away_team}</span>
                </div>
                <CompareRow label="Shots"          v1={home.shots}           v2={away.shots} />
                <CompareRow label="Shots on Target" v1={home.shots_on_target} v2={away.shots_on_target} />
                <CompareRow label="Fouls"           v1={home.fouls}           v2={away.fouls} />
                <CompareRow label="Yellow Cards"    v1={home.yellow_cards}    v2={away.yellow_cards} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                  {[
                    { label: `${m?.home_team} Acc`, val: home.shots ? `${((home.shots_on_target/home.shots)*100).toFixed(0)}%` : '–', color: 'var(--green)' },
                    { label: `${m?.away_team} Acc`, val: away.shots ? `${((away.shots_on_target/away.shots)*100).toFixed(0)}%` : '–', color: 'var(--purple)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 2 }}>Shot Accuracy</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty">No per-match stats. Run <code>load_match_stats.py</code></div>
            )}
            <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MatchIntelligence() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [shootingLeaders, setShootingLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('results')
  const [weekFilter, setWeekFilter] = useState('All')
  const [selectedGame, setSelectedGame] = useState(null)
  const [h2hT1, setH2hT1] = useState('')
  const [h2hT2, setH2hT2] = useState('')
  const [h2hData, setH2hData] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/matches/recent?limit=380`).then(r => r.json()),
      fetch(`${API}/teams/`).then(r => r.json()),
      fetch(`${API}/intel/league/shooting-leaders`).then(r => r.json()),
    ]).then(([m, t, s]) => {
      setMatches(m.matches || [])
      setTeams(t.teams || [])
      setShootingLeaders(s.teams || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const weeks = ['All', ...Array.from(new Set(matches.map(m => m.matchweek))).sort((a,b) => a-b)]
  const filtered = weekFilter === 'All' ? matches : matches.filter(m => m.matchweek == weekFilter)

  const fetchH2H = () => {
    if (!h2hT1 || !h2hT2) return
    fetch(`${API}/intel/head-to-head?team1=${encodeURIComponent(h2hT1)}&team2=${encodeURIComponent(h2hT2)}`)
      .then(r => r.json()).then(setH2hData)
  }

  const maxShots = Math.max(...shootingLeaders.map(t => parseFloat(t.avg_shots)||0), 1)

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>

  return (
    <div className="page-enter">
      {selectedGame && <MatchDetailModal gameId={selectedGame} onClose={() => setSelectedGame(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">Match Intelligence</div>
          <div className="page-subtitle">Per-match stats · Head-to-head · Shooting analysis</div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
          {matches.length} matches · {matches.reduce((a,m) => a+(m.home_score||0)+(m.away_score||0), 0)} goals
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'results', label: '📅 Results' },
          { id: 'h2h',     label: '⚔ Head-to-Head' },
          { id: 'shooting',label: '🎯 Shooting Leaders' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {weeks.map(w => (
                <button key={w} onClick={() => setWeekFilter(w)} style={{
                  padding: '3px 9px', borderRadius: 5, cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: '0.68rem', fontWeight: 600,
                  border: '1px solid var(--border-card)',
                  background: weekFilter == w ? 'var(--green-dim)' : 'var(--bg-card2)',
                  color: weekFilter == w ? 'var(--green)' : 'var(--text-3)',
                }}>{w === 'All' ? 'All' : `W${w}`}</button>
              ))}
            </div>
            <div className="card" style={{ padding: '4px 0', maxHeight: '70vh', overflowY: 'auto' }}>
              {filtered.map((m, i) => {
                const hw = m.home_score > m.away_score, aw = m.away_score > m.home_score
                return (
                  <div key={i} className="match-row" onClick={() => setSelectedGame(m.game_id || m.id)}>
                    <span className="match-week">W{m.matchweek}</span>
                    <span className="match-team home" style={{ fontWeight: hw?700:400, color: hw?'var(--text-1)':'var(--text-2)' }}>{m.home_team}</span>
                    <span className="match-score">{m.home_score}–{m.away_score}</span>
                    <span className="match-team" style={{ fontWeight: aw?700:400, color: aw?'var(--text-1)':'var(--text-2)' }}>{m.away_team}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--green)', marginLeft: 4 }}>▶</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="ct-icon">📊</span> Season Summary</div>
            {[
              { label: 'Total Matches', val: matches.length },
              { label: 'Total Goals',   val: matches.reduce((a,m) => a+(m.home_score||0)+(m.away_score||0), 0) },
              { label: 'Goals/Match',   val: (matches.reduce((a,m) => a+(m.home_score||0)+(m.away_score||0), 0) / (matches.length||1)).toFixed(2) },
              { label: 'Home Wins',     val: matches.filter(m => m.home_score > m.away_score).length },
              { label: 'Draws',         val: matches.filter(m => m.home_score === m.away_score).length },
              { label: 'Away Wins',     val: matches.filter(m => m.away_score > m.home_score).length },
            ].map(s => (
              <div key={s.label} className="mini-stat-row">
                <span className="mini-stat-label">{s.label}</span>
                <span className="mini-stat-value green">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'h2h' && (
        <div className="card" style={{ maxWidth: 580 }}>
          <div className="card-title"><span className="ct-icon">⚔</span> Head-to-Head</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="filter-select" style={{ flex: 1 }} value={h2hT1} onChange={e => setH2hT1(e.target.value)}>
              <option value="">Select Team 1...</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <select className="filter-select" style={{ flex: 1 }} value={h2hT2} onChange={e => setH2hT2(e.target.value)}>
              <option value="">Select Team 2...</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <button className="btn btn-green" onClick={fetchH2H}>Compare</button>
          </div>
          {h2hData && (
            <>
              {(() => {
                const r = h2hData.record;
                const total = r.team1_wins + r.draws + r.team2_wins;
                if (total === 0) return <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-3)' }}>No previous matches between these teams.</div>;
                
                return (
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 28, marginBottom: 20 }}>
                    {[
                      { val: r.team1_wins, label: `${r.team1_wins} W`, bg: 'var(--green)', color: '#fff' },
                      { val: r.draws,      label: `${r.draws} D`,      bg: 'var(--bg-hover)', color: 'var(--text-2)' },
                      { val: r.team2_wins, label: `${r.team2_wins} W`, bg: 'var(--purple)', color: '#fff' },
                    ].map((s, i) => (
                      s.val > 0 && (
                        <div key={i} style={{ 
                          width: `${(s.val / total) * 100}%`, background: s.bg, color: s.color, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '0.75rem', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}>
                          {s.label}
                        </div>
                      )
                    ))}
                  </div>
                )
              })()}
              {h2hData.matches.map((m, i) => {
                const hw = m.home_score > m.away_score, aw = m.away_score > m.home_score
                const hColor = m.home_team === h2hT1 ? 'var(--green)' : m.home_team === h2hT2 ? 'var(--purple)' : 'var(--text-1)'
                const aColor = m.away_team === h2hT1 ? 'var(--green)' : m.away_team === h2hT2 ? 'var(--purple)' : 'var(--text-1)'
                return (
                  <div key={i} className="match-row">
                    <span className="match-week">W{m.matchweek}</span>
                    <span className="match-team home" style={{ fontWeight: hw?700:400, color: hColor }}>{m.home_team}</span>
                    <span className="match-score">{m.home_score}–{m.away_score}</span>
                    <span className="match-team" style={{ fontWeight: aw?700:400, color: aColor }}>{m.away_team}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {tab === 'shooting' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-title"><span className="ct-icon">🎯</span> Teams by Avg Shots / Match</div>
          {shootingLeaders.length === 0 ? (
            <div className="empty">Run <code>load_match_stats.py</code> to load shooting data</div>
          ) : shootingLeaders.map((t, i) => (
            <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <span style={{ color: i<3?'var(--green)':'var(--text-3)', fontWeight: 700, width: 18, fontSize: '0.72rem' }}>{i+1}</span>
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{t.team}</span>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, color: 'var(--green)', fontSize: '0.95rem' }}>{t.avg_shots}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', width: 48, textAlign: 'right' }}>{t.avg_sot} SoT</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--purple)', width: 36, textAlign: 'right' }}>{t.sot_pct}%</span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', marginLeft: 28 }}>
                <div style={{ width: `${((parseFloat(t.avg_shots)||0)/maxShots)*100}%`, height: '100%', background: i<3?'var(--green)':'rgba(16,185,129,0.3)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
