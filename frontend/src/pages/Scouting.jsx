import React, { useState, useEffect, useCallback } from 'react'

const API = '/api'
const POSITIONS = ['All', 'FW', 'MF', 'DF', 'GK']

function ScoutScoreRing({ score }) {
  const radius = 32
  const circ = 2 * Math.PI * radius
  const fill = (score / 100) * circ
  const color = score >= 70 ? '#00d4ff' : score >= 45 ? '#a855f7' : score >= 25 ? '#eab308' : '#ef4444'

  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCOUT</span>
      </div>
    </div>
  )
}

function SimilarPlayersPanel({ playerId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/scouting/${playerId}/similar?n=6`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [playerId])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 680,
        width: '100%', maxHeight: '85vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="loading"><div className="spinner" />Finding similar players...</div>
        ) : !data ? (
          <div className="empty">Error loading similar players.</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800 }}>
                  Similar to {data.player.name}
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 2 }}>
                  {data.player.team} · {data.player.position} · Cosine similarity on per-90 stats
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-2)', padding: '6px 12px',
                cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.85rem',
              }}>✕</button>
            </div>

            {data.similar.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', width: 20, textAlign: 'center' }}>
                  {i + 1}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg-base)',
                }}>
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{p.team} · {p.position} · Age {p.age}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem' }}>{p.goals}G {p.assists}A</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{p.goals_per90}/90</div>
                </div>
                <div style={{
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem',
                  fontWeight: 700, color: 'var(--cyan)', flexShrink: 0,
                }}>
                  {p.similarity}%
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default function Scouting() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState('All')
  const [maxAge, setMaxAge] = useState(30)
  const [minMinutes, setMinMinutes] = useState(500)
  const [similarTarget, setSimilarTarget] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const pos = position !== 'All' ? `&position=${position}` : ''
    fetch(`${API}/scouting/scout-score?limit=50&max_age=${maxAge}&min_minutes=${minMinutes}${pos}`)
      .then(r => r.json())
      .then(d => { setPlayers(d.players); setLoading(false) })
      .catch(() => setLoading(false))
  }, [position, maxAge, minMinutes])

  useEffect(() => { load() }, [load])

  const scoreColor = (s) => s >= 70 ? '#00d4ff' : s >= 45 ? '#a855f7' : s >= 25 ? '#eab308' : '#ef4444'

  return (
    <div>
      {similarTarget && (
        <SimilarPlayersPanel playerId={similarTarget} onClose={() => setSimilarTarget(null)} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Scouting</div>
          <div className="page-subtitle">Scout Score ranks players by per-90 output, age, and fitness</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Position</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {POSITIONS.map(p => (
                <button key={p} onClick={() => setPosition(p)} style={{
                  padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: '0.8rem', fontWeight: 600,
                  border: '1px solid var(--border)',
                  background: position === p ? 'rgba(0,212,255,0.1)' : 'var(--bg-card2)',
                  color: position === p ? 'var(--cyan)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              Max Age: <span style={{ color: 'var(--text-1)' }}>{maxAge}</span>
            </div>
            <input type="range" min={18} max={40} value={maxAge}
              onChange={e => setMaxAge(Number(e.target.value))}
              style={{ width: 140, accentColor: 'var(--cyan)' }} />
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              Min Minutes: <span style={{ color: 'var(--text-1)' }}>{minMinutes}</span>
            </div>
            <input type="range" min={90} max={3000} step={90} value={minMinutes}
              onChange={e => setMinMinutes(Number(e.target.value))}
              style={{ width: 140, accentColor: 'var(--cyan)' }} />
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-3)' }}>
            {!loading && <span>{players.length} players found</span>}
          </div>
        </div>
      </div>

      {/* Rankings */}
      {loading ? (
        <div className="loading"><div className="spinner" />Computing scout scores...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="players-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th style={{ textAlign: 'left' }}>Team</th>
                <th>Pos</th>
                <th>Age</th>
                <th>Min</th>
                <th>G</th>
                <th>A</th>
                <th>G/90</th>
                <th>A/90</th>
                <th>GA/90</th>
                <th>Scout Score</th>
                <th>Similar</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: i < 3 ? 'var(--cyan)' : 'var(--text-3)', fontWeight: i < 3 ? 700 : 400 }}>
                    {i + 1}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg-base)', flexShrink: 0,
                      }}>
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                      {p.name}
                    </span>
                  </td>
                  <td style={{ textAlign: 'left', color: 'var(--text-2)', fontSize: '0.78rem' }}>{p.team}</td>
                  <td>
                    <span className={`pos-badge pos-${p.position ?? 'DF'}`}>{p.position ?? '–'}</span>
                  </td>
                  <td>{p.age ?? '–'}</td>
                  <td>{p.minutes ?? '–'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>{p.goals ?? '–'}</td>
                  <td>{p.assists ?? '–'}</td>
                  <td>{Number(p.goals_per90 ?? 0).toFixed(2)}</td>
                  <td>{Number(p.assists_per90 ?? 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--purple)', fontWeight: 600 }}>
                    {Number(p.goal_contributions_per90 ?? 0).toFixed(2)}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem',
                      color: scoreColor(p.scout_score),
                    }}>
                      {p.scout_score}
                      <span style={{
                        width: 40, height: 5, borderRadius: 3,
                        background: 'rgba(255,255,255,0.07)', overflow: 'hidden', display: 'inline-block',
                      }}>
                        <span style={{
                          display: 'block', height: '100%',
                          width: `${p.scout_score}%`,
                          background: scoreColor(p.scout_score),
                          borderRadius: 3,
                        }} />
                      </span>
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSimilarTarget(p.id)}
                      style={{
                        background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                        borderRadius: 6, color: 'var(--purple)', padding: '4px 10px',
                        cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.1)' }}
                    >
                      ≈ Similar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="empty">No players match your filters. Try adjusting min minutes or max age.</div>
          )}
        </div>
      )}

      {/* Score explanation */}
      <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Scout Score</span> = weighted per-90 rates (G+A efficiency 55%, NP goals 15%, assists 20%, minutes confidence, age peak bonus for 23-28y)
        &nbsp;·&nbsp;
        <span style={{ color: '#00d4ff' }}>■</span> 70+ Elite &nbsp;
        <span style={{ color: '#a855f7' }}>■</span> 45-70 Good &nbsp;
        <span style={{ color: '#eab308' }}>■</span> 25-45 Average &nbsp;
        <span style={{ color: '#ef4444' }}>■</span> &lt;25 Low
      </div>
    </div>
  )
}
