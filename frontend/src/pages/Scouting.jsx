import React, { useState, useEffect } from 'react'

const API = '/api'

function ScoreBadge({ score }) {
  const cls = score >= 40 ? 'elite' : score >= 25 ? 'good' : 'avg'
  return <div className={`scout-badge ${cls}`}>{score}</div>
}

function SimilarModal({ player, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(`${API}/scouting/${player.id}/similar?n=8`)
      .then(r => r.json())
      .then(setData)
  }, [player.id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
              Similar Players — {player.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
              Cosine similarity on per-90 attacking stats
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {!data ? <div className="loading"><div className="spinner" /></div> : (
          <table className="data-table">
            <thead><tr><th>Player</th><th>Team</th><th>G</th><th>A</th><th>G/90</th><th>Match %</th></tr></thead>
            <tbody>
              {(data.similar || []).map(p => (
                <tr key={p.id}>
                  <td className="bold">{p.name}</td>
                  <td className="dim">{p.team}</td>
                  <td className="green">{p.goals}</td>
                  <td style={{ color: 'var(--cyan)' }}>{p.assists}</td>
                  <td>{p.goals_per90}</td>
                  <td>
                    <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'Outfit' }}>
                      {(p.similarity * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function Scouting() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [similar, setSimilar] = useState(null)

  // Filters
  const [position, setPosition] = useState('FW')
  const [maxAge, setMaxAge] = useState(27)
  const [minMins, setMinMins] = useState(900)
  const [limit, setLimit] = useState(20)

  const search = () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit,
      max_age: maxAge,
      min_minutes: minMins,
    })
    if (position !== 'All') params.set('position', position)
    fetch(`${API}/scouting/scout-score?${params}`)
      .then(r => r.json())
      .then(d => { setPlayers(d.players || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { search() }, [])

  return (
    <div className="page-enter">
      {similar && <SimilarModal player={similar} onClose={() => setSimilar(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">Scouting</div>
          <div className="page-subtitle">Find players by Scout Score · Composite 0-100 rating</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Filter Panel */}
        <div className="card">
          <div className="card-title"><span className="ct-icon">⚙</span> Search Filters</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Position</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['All', 'FW', 'MF', 'DF'].map(p => (
                <button key={p} onClick={() => setPosition(p)} style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-card)',
                  background: position === p ? 'var(--green-dim)' : 'var(--bg-card2)',
                  color: position === p ? 'var(--green)' : 'var(--text-2)',
                  cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.75rem',
                  textAlign: 'left', fontWeight: position === p ? 600 : 400,
                }}>{p === 'All' ? 'All Positions' : p === 'FW' ? '⚡ Forwards' : p === 'MF' ? '🎯 Midfielders' : '🛡 Defenders'}</button>
              ))}
            </div>
          </div>

          {[
            { label: 'Max Age',      val: maxAge,   setVal: setMaxAge,  min: 17, max: 40, step: 1 },
            { label: 'Min Minutes',  val: minMins,  setVal: setMinMins, min: 0,  max: 3420, step: 90 },
            { label: 'Results',      val: limit,    setVal: setLimit,   min: 5,  max: 50, step: 5 },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                <span>{f.label}</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{f.val}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step}
                value={f.val} onChange={e => f.setVal(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--green)' }}
              />
            </div>
          ))}

          <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={search}>
            🔍 Find Players
          </button>
        </div>

        {/* Results Panel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <span className="ct-icon">🔭</span>
              Top Matching Players
              <span className="ct-badge">{players.length} found</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
              Stats: G/90 · A/90 · Key Passes/90 | Click → Similar Players
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Scanning players...</div>
          ) : players.length === 0 ? (
            <div className="empty">No players match these filters</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th>G</th>
                  <th>A</th>
                  <th>G/90</th>
                  <th>A/90</th>
                  <th>G+A/90</th>
                  <th>Min</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id} onClick={() => setSimilar(p)}>
                    <td className="dim">{i + 1}</td>
                    <td>
                      <div className="player-name-row">
                        <div className="player-avatar">{p.name?.[0]}</div>
                        <span className="player-name">{p.name}</span>
                      </div>
                    </td>
                    <td className="dim" style={{ fontSize: '0.7rem' }}>{p.team}</td>
                    <td><span className={`pos-badge ${p.position}`}>{p.position}</span></td>
                    <td>{p.age}</td>
                    <td className="green bold">{p.goals}</td>
                    <td style={{ color: 'var(--cyan)' }}>{p.assists}</td>
                    <td>{p.goals_per90}</td>
                    <td>{p.assists_per90}</td>
                    <td style={{ color: 'var(--yellow)', fontWeight: 600 }}>{p.goal_contributions_per90}</td>
                    <td className="dim">{p.minutes?.toLocaleString()}</td>
                    <td>
                      <ScoreBadge score={p.scout_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
