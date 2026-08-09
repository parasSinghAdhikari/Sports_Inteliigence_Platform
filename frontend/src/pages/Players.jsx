import React, { useState, useEffect, useMemo } from 'react'

const API = '/api'
const POSITIONS = ['All', 'FW', 'MF', 'DF', 'GK']

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('All')
  const [sortKey, setSortKey] = useState('goals')
  const [sortDir, setSortDir] = useState(-1) // -1 = desc

  useEffect(() => {
    fetch(`${API}/players/?limit=100`)
      .then(r => r.json())
      .then(d => { setPlayers(d.players); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return players
      .filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                            p.team?.toLowerCase().includes(search.toLowerCase())
        const matchPos = posFilter === 'All' || p.position === posFilter
        return matchSearch && matchPos
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? -1
        const bv = b[sortKey] ?? -1
        return (av - bv) * sortDir
      })
  }, [players, search, posFilter, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  const sortArrow = (key) => sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''

  const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d) : '–'

  if (loading) return (
    <div className="loading"><div className="spinner" /> Loading players...</div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Players</div>
          <div className="page-subtitle">{filtered.length} players · Premier League 2024-25</div>
        </div>
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="🔍  Search name or team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={posFilter}
            onChange={e => setPosFilter(e.target.value)}
          >
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="players-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Team</th>
                <th>Pos</th>
                <th>Age</th>
                <th className={sortKey==='minutes' ? 'sorted' : ''} onClick={() => handleSort('minutes')}>Min{sortArrow('minutes')}</th>
                <th className={sortKey==='goals' ? 'sorted' : ''} onClick={() => handleSort('goals')}>G{sortArrow('goals')}</th>
                <th className={sortKey==='assists' ? 'sorted' : ''} onClick={() => handleSort('assists')}>A{sortArrow('assists')}</th>
                <th className={sortKey==='goals_plus_assists' ? 'sorted' : ''} onClick={() => handleSort('goals_plus_assists')}>G+A{sortArrow('goals_plus_assists')}</th>
                <th className={sortKey==='goals_per90' ? 'sorted' : ''} onClick={() => handleSort('goals_per90')}>G/90{sortArrow('goals_per90')}</th>
                <th className={sortKey==='assists_per90' ? 'sorted' : ''} onClick={() => handleSort('assists_per90')}>A/90{sortArrow('assists_per90')}</th>
                <th className={sortKey==='goal_contributions_per90' ? 'sorted' : ''} onClick={() => handleSort('goal_contributions_per90')}>GA/90{sortArrow('goal_contributions_per90')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg-base)', flexShrink: 0
                      }}>
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                      {p.name}
                    </span>
                  </td>
                  <td>{p.team}</td>
                  <td>
                    <span className={`pos-badge pos-${p.position ?? 'DF'}`}>
                      {p.position ?? '–'}
                    </span>
                  </td>
                  <td>{p.age ?? '–'}</td>
                  <td>{p.minutes ?? '–'}</td>
                  <td className="stat-highlight">{p.goals ?? '–'}</td>
                  <td>{p.assists ?? '–'}</td>
                  <td>{p.goals_plus_assists ?? '–'}</td>
                  <td>{fmt(p.goals_per90)}</td>
                  <td>{fmt(p.assists_per90)}</td>
                  <td style={{ color: 'var(--purple)', fontWeight: 600 }}>
                    {fmt(p.goal_contributions_per90)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty">No players found matching your search.</div>
        )}
      </div>
    </div>
  )
}
