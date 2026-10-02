import React, { useState } from 'react'

const API = '/api'

const STATS = [
  { key: 'goals',                     label: 'Goals',           format: v => v },
  { key: 'assists',                   label: 'Assists',         format: v => v },
  { key: 'goals_plus_assists',        label: 'G + A',           format: v => v },
  { key: 'goals_per90',               label: 'Goals / 90',      format: v => v },
  { key: 'assists_per90',             label: 'Assists / 90',    format: v => v },
  { key: 'goal_contributions_per90',  label: 'G+A / 90',        format: v => v },
  { key: 'non_pen_goals',             label: 'Non-pen Goals',   format: v => v },
  { key: 'shots_per90',               label: 'Shots / 90',      format: v => v },
  { key: 'shot_accuracy',             label: 'Shot Acc %',      format: v => v },
  { key: 'minutes',                   label: 'Minutes',         format: v => v?.toLocaleString() },
]

function SearchBox({ label, color, value, setValue, result, setResult, index }) {
  const [q, setQ] = useState(value?.name || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  const search = (val) => {
    setQ(val)
    if (val.length < 2) { setSuggestions([]); setOpen(false); return }
    fetch(`${API}/players/?search=${encodeURIComponent(val)}&limit=8`)
      .then(r => r.json())
      .then(d => { setSuggestions(d.players || []); setOpen(true) })
  }

  const pick = (p) => {
    setQ(p.name)
    setResult(p)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{
        background: 'var(--bg-card2)', border: `1px solid ${color}40`,
        borderRadius: 10, padding: 14, marginBottom: 8,
      }}>
        <div style={{ fontSize: '0.62rem', color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
          Player {index}
        </div>
        {result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="player-avatar" style={{ width: 40, height: 40, fontSize: 16, borderColor: color }}>{result.name?.[0]}</div>
            <div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem' }}>{result.name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{result.team} · {result.position} · Age {result.age}</div>
            </div>
            <button onClick={() => { setResult(null); setQ('') }} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer', fontSize: 16,
            }}>✕</button>
          </div>
        ) : (
          <input
            value={q}
            onChange={e => search(e.target.value)}
            placeholder={`Search ${label}...`}
            style={{
              background: 'var(--bg-base)', border: '1px solid var(--border-card)',
              borderRadius: 6, padding: '7px 10px', color: 'var(--text-1)',
              fontSize: '0.8rem', outline: 'none', width: '100%',
              fontFamily: 'Inter',
            }}
          />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-card)',
          borderRadius: 8, zIndex: 50, overflow: 'hidden', marginTop: 4,
        }}>
          {suggestions.map(p => (
            <div key={p.id} onClick={() => pick(p)} style={{
              padding: '9px 12px', cursor: 'pointer', fontSize: '0.78rem',
              borderBottom: '1px solid var(--border)', display: 'flex',
              alignItems: 'center', gap: 8,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div className="player-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{p.name?.[0]}</div>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{p.team}</span>
              <span className={`pos-badge ${p.position}`} style={{ marginLeft: 'auto' }}>{p.position}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBar({ label, v1, v2, color1 = 'var(--green)', color2 = 'var(--purple)' }) {
  // Strip commas before parsing (e.g., "2,756" -> 2756)
  const n1 = parseFloat(String(v1).replace(/,/g, '')) || 0
  const n2 = parseFloat(String(v2).replace(/,/g, '')) || 0
  const total = n1 + n2
  const pct1 = total > 0 ? (n1 / total) * 100 : 50
  const pct2 = 100 - pct1
  const winner = n1 > n2 ? 1 : n2 > n1 ? 2 : 0

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
        <span style={{ fontWeight: winner === 1 ? 800 : 500, color: winner === 1 ? color1 : 'var(--text-1)' }}>{v1 ?? '–'}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{label}</span>
        <span style={{ fontWeight: winner === 2 ? 800 : 500, color: winner === 2 ? color2 : 'var(--text-1)' }}>{v2 ?? '–'}</span>
      </div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 3, background: 'var(--bg-card2)' }}>
        <div style={{ width: `${pct1}%`, background: color1, opacity: winner === 1 || winner === 0 ? 1 : 0.25, transition: 'width 0.5s' }} />
        <div style={{ width: `${pct2}%`, background: color2, opacity: winner === 2 || winner === 0 ? 1 : 0.25, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function Compare() {
  const [p1, setP1] = useState(null)
  const [p2, setP2] = useState(null)
  const [d1, setD1] = useState(null)
  const [d2, setD2] = useState(null)

  const load = (p, setD) => {
    if (!p) { setD(null); return }
    fetch(`${API}/players/${p.id}`).then(r => r.json()).then(setD)
  }

  const setPlayer1 = (p) => { setP1(p); load(p, setD1) }
  const setPlayer2 = (p) => { setP2(p); load(p, setD2) }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">Compare Players</div>
          <div className="page-subtitle">Head-to-head statistical comparison</div>
        </div>
      </div>

      {/* Player pickers */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
        <SearchBox label="Player 1" color="var(--green)"  value={p1} setValue={setP1} result={p1} setResult={setPlayer1} index={1} />
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)',
            border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-3)',
          }}>VS</div>
        </div>
        <SearchBox label="Player 2" color="var(--purple)" value={p2} setValue={setP2} result={p2} setResult={setPlayer2} index={2} />
      </div>

      {(!p1 || !p2) && (
        <div className="empty" style={{ padding: 60 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖</div>
          <div style={{ color: 'var(--text-2)', marginBottom: 4 }}>Select two players to compare</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>Search by name above — try Salah vs Haaland</div>
        </div>
      )}

      {p1 && p2 && d1 && d2 && (
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="card-title" style={{ textAlign: 'center', marginBottom: 24, fontSize: '1.1rem' }}>
            <span style={{ color: 'var(--green)' }}>{p1.name}</span>
            <span style={{ color: 'var(--text-3)', margin: '0 12px' }}>vs</span>
            <span style={{ color: 'var(--purple)' }}>{p2.name}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STATS.map(s => (
              <StatBar key={s.key} label={s.label} v1={s.format(d1[s.key])} v2={s.format(d2[s.key])} />
            ))}
          </div>

          {/* Summary */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card2)', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
            {[
              { label: 'Better in Goals', val: (d1.goals || 0) >= (d2.goals || 0) ? p1.name : p2.name, color: (d1.goals || 0) >= (d2.goals || 0) ? 'var(--green)' : 'var(--purple)' },
              { label: 'Better in Assists', val: (d1.assists || 0) >= (d2.assists || 0) ? p1.name : p2.name, color: (d1.assists || 0) >= (d2.assists || 0) ? 'var(--green)' : 'var(--purple)' },
              { label: 'More Minutes', val: (d1.minutes || 0) >= (d2.minutes || 0) ? p1.name : p2.name, color: (d1.minutes || 0) >= (d2.minutes || 0) ? 'var(--green)' : 'var(--purple)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: 800, fontSize: '0.9rem' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
