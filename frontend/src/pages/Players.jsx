import React, { useState, useEffect } from 'react'

const API = '/api'
const COLS = [
  { key: 'name',                    label: 'Player',  sortable: false },
  { key: 'team',                    label: 'Team',    sortable: false },
  { key: 'position',                label: 'POS',     sortable: false },
  { key: 'age',                     label: 'Age',     sortable: true  },
  { key: 'goals',                   label: 'GLS',     sortable: true  },
  { key: 'assists',                 label: 'AST',     sortable: true  },
  { key: 'minutes',                 label: 'MIN',     sortable: true  },
  { key: 'goals_per90',             label: 'G/90',    sortable: true  },
  { key: 'goals_plus_assists',      label: 'G+A',     sortable: true  },
]

function PlayerModal({ player, onClose }) {
  if (!player) return null
  const stats = [
    { label: 'Goals',          val: player.goals,               color: 'green' },
    { label: 'Assists',        val: player.assists,             color: 'cyan' },
    { label: 'Goals + Assists',val: player.goals_plus_assists,  color: '' },
    { label: 'Minutes',        val: player.minutes,             color: '' },
    { label: 'Goals / 90',     val: player.goals_per90,         color: 'green' },
    { label: 'Assists / 90',   val: player.assists_per90,       color: '' },
    { label: 'G+A / 90',       val: player.goal_contributions_per90, color: '' },
    { label: 'Non-pen Goals',  val: player.non_pen_goals,       color: '' },
    { label: 'xG',             val: player.xg,                  color: '' },
    { label: 'xA',             val: player.xa,                  color: '' },
    { label: 'Shots / 90',     val: player.shots_per90,         color: '' },
    { label: 'Shot Acc %',     val: player.shot_accuracy,       color: '' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="player-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>{player.name?.[0]}</div>
              <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem' }}>{player.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span className="player-team-badge">{player.team}</span>
                  <span className={`pos-badge ${player.position}`}>{player.position}</span>
                  <span className="player-team-badge">Age {player.age}</span>
                </div>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Key stats highlight */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Goals',   val: player.goals,   color: 'var(--green)' },
            { label: 'Assists', val: player.assists,  color: 'var(--cyan)' },
            { label: 'Min',     val: player.minutes,  color: 'var(--text-1)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val ?? '–'}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* All stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {stats.filter(s => s.val !== null && s.val !== undefined).map(s => (
            <div key={s.label} className="mini-stat-row">
              <span className="mini-stat-label">{s.label}</span>
              <span className={`mini-stat-value ${s.color}`}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('All')
  const [sortKey, setSortKey] = useState('goals')
  const [sortDesc, setSortDesc] = useState(true)
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const PER_PAGE = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 600 })
    if (search) params.set('search', search)
    if (position !== 'All') params.set('position', position)
    fetch(`${API}/players/?${params}`)
      .then(r => r.json())
      .then(d => {
        let list = (d.players || []).map(p => ({
          ...p,
          // compute G+A client-side as fallback when API doesn't return it
          goals_plus_assists: p.goals_plus_assists ?? ((p.goals || 0) + (p.assists || 0)),
        }))
        if (sortKey) {
          list = [...list].sort((a, b) => {
            const av = parseFloat(a[sortKey]) || 0
            const bv = parseFloat(b[sortKey]) || 0
            return sortDesc ? bv - av : av - bv
          })
        }
        setPlayers(list)
        setTotal(list.length)
        setLoading(false)
        setPage(1)
      }).catch(() => setLoading(false))
  }, [search, position, sortKey, sortDesc])

  const openPlayer = (p) => {
    fetch(`${API}/players/${p.id}`).then(r => r.json()).then(d => setSelected(d))
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  const paginated = players.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(players.length / PER_PAGE)

  const ratingColor = (val) => {
    if (!val) return 'avg'
    if (val >= 0.7) return 'high'
    if (val >= 0.4) return 'mid'
    return 'low'
  }

  return (
    <div className="page-enter">
      {selected && <PlayerModal player={selected} onClose={() => setSelected(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">Players</div>
          <div className="page-subtitle">{total} players · Premier League 2024-25</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search players, teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={position} onChange={e => setPosition(e.target.value)}>
            <option value="All">All Positions</option>
            <option value="FW">Forwards</option>
            <option value="MF">Midfielders</option>
            <option value="DF">Defenders</option>
            <option value="GK">Goalkeepers</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        style={{ cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                      >
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          <span style={{ marginLeft: 4, color: 'var(--green)' }}>{sortDesc ? '↓' : '↑'}</span>
                        )}
                      </th>
                    ))}
                    <th>G+A/90</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => (
                    <tr key={p.id} onClick={() => openPlayer(p)}>
                      <td className="dim">{(page - 1) * PER_PAGE + i + 1}</td>
                      <td>
                        <div className="player-name-row">
                          <div className="player-avatar">{p.name?.[0]}</div>
                          <span className="player-name">{p.name}</span>
                        </div>
                      </td>
                      <td className="dim" style={{ fontSize: '0.72rem' }}>{p.team}</td>
                      <td><span className={`pos-badge ${p.position}`}>{p.position}</span></td>
                      <td>{p.age}</td>
                      <td className="green bold">{p.goals}</td>
                      <td style={{ color: 'var(--cyan)' }}>{p.assists}</td>
                      <td className="dim">{p.minutes?.toLocaleString()}</td>
                      <td>{p.goals_per90}</td>
                      <td className="bold">{p.goals_plus_assists}</td>
                      <td>
                        <span className={`rating-badge ${ratingColor(p.goal_contributions_per90)}`}>
                          {p.goal_contributions_per90 ?? '–'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, page - 3), Math.min(totalPages, page + 2)
                  ).map(n => (
                    <button key={n} onClick={() => setPage(n)} style={{
                      width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-card)',
                      background: n === page ? 'var(--green-dim)' : 'var(--bg-card2)',
                      color: n === page ? 'var(--green)' : 'var(--text-2)',
                      cursor: 'pointer', fontSize: '0.72rem', fontWeight: n === page ? 700 : 400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
