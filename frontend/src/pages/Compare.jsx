import React, { useState } from 'react'
import RadarChart from '../components/RadarChart'
import { useRadar } from '../hooks/useRadar'

const API = '/api'

// ── Search Box ──────────────────────────────────────────────────────────────

function SearchBox({ label, color, result, setResult, index }) {
  const [q, setQ] = useState(result?.name || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  const search = (val) => {
    setQ(val)
    if (val.length < 2) { setSuggestions([]); setOpen(false); return }
    fetch(`${API}/players/?search=${encodeURIComponent(val)}&limit=8`)
      .then(r => r.json())
      .then(d => { setSuggestions(d.players || []); setOpen(true) })
  }

  const pick = (p) => { setQ(p.name); setResult(p); setOpen(false) }

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
            aria-label={`Search for ${label}`}
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

// ── Stat Bar (existing head-to-head bars) ───────────────────────────────────

function StatBar({ label, v1, v2, color1 = 'var(--green)', color2 = 'var(--purple)' }) {
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

// ── Stats definition ────────────────────────────────────────────────────────

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

// ── Radar Comparison Table ──────────────────────────────────────────────────

function RadarTable({ radarData, players }) {
  if (!radarData.length || !players?.length) return null
  const [p1, p2] = players
  return (
    <div style={{ overflowX: 'auto', marginTop: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Metric</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', color: '#10b981', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{p1.name.split(' ').pop()}</th>
            <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-3)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>vs</th>
            {p2 && <th style={{ textAlign: 'left', padding: '6px 10px', color: '#8b5cf6', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{p2.name.split(' ').pop()}</th>}
            <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Pct%</th>
          </tr>
        </thead>
        <tbody>
          {radarData.map(m => {
            const p1Wins = m.p1Pct != null && m.p2Pct != null &&
              (m.lowerIsBetter ? m.p1Pct > m.p2Pct : m.p1Pct > m.p2Pct)
            const p2Wins = m.p1Pct != null && m.p2Pct != null && !p1Wins && m.p1Pct !== m.p2Pct
            return (
              <tr key={m.key} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '7px 10px', color: 'var(--text-2)' }}>{m.label}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: p1Wins ? 800 : 400, color: p1Wins ? '#10b981' : 'var(--text-1)' }}>
                  {m.p1Value != null ? m.p1Value.toFixed(2) : '—'}{m.unit}
                </td>
                <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.6rem' }}>–</td>
                {p2 && <td style={{ padding: '7px 10px', textAlign: 'left', fontWeight: p2Wins ? 800 : 400, color: p2Wins ? '#8b5cf6' : 'var(--text-1)' }}>
                  {m.p2Value != null ? m.p2Value.toFixed(2) : '—'}{m.unit}
                </td>}
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{m.p1Pct ?? '—'}</span>
                    {p2 && <><span style={{ color: 'var(--text-3)', fontSize: '0.6rem' }}>|</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{m.p2Pct ?? '—'}</span></>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Compare() {
  const [p1, setP1] = useState(null)
  const [p2, setP2] = useState(null)
  const [d1, setD1] = useState(null)
  const [d2, setD2] = useState(null)
  const [view, setView] = useState('radar')   // 'radar' | 'bars'
  const [minMinutes, setMinMinutes] = useState(900)

  const load = (p, setD) => {
    if (!p) { setD(null); return }
    fetch(`${API}/players/${p.id}`).then(r => r.json()).then(setD)
  }

  const setPlayer1 = (p) => { setP1(p); load(p, setD1) }
  const setPlayer2 = (p) => { setP2(p); load(p, setD2) }

  const { radarData, cohort, season, warning, loading: radarLoading, error: radarError, players: radarPlayers } = useRadar(
    p1?.id, p2?.id, minMinutes
  )

  const bothSelected = p1 && p2
  const radarReady = radarData.length > 0

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">Compare Players</div>
          <div className="page-subtitle">Head-to-head statistical comparison · Percentile radar</div>
        </div>
      </div>

      {/* Player pickers */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
        <SearchBox label="Player 1" color="var(--green)"  result={p1} setResult={setPlayer1} index={1} />
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)',
            border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-3)',
          }}>VS</div>
        </div>
        <SearchBox label="Player 2" color="var(--purple)" result={p2} setResult={setPlayer2} index={2} />
      </div>

      {!p1 && !p2 && (
        <div className="empty" style={{ padding: 60 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖</div>
          <div style={{ color: 'var(--text-2)', marginBottom: 4 }}>Select two players to compare</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>Search by name above — try Salah vs Haaland</div>
        </div>
      )}

      {/* Single player radar */}
      {p1 && !p2 && radarReady && (
        <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div className="card-title">📡 <span style={{ color: 'var(--green)' }}>{p1.name}</span> — Percentile Profile</div>
          <RadarChart
            data={radarData}
            player1={{ name: p1.name, color: '#10b981' }}
            cohort={cohort}
            season={season}
            warning={warning}
          />
          <RadarTable radarData={radarData} players={radarPlayers} />
        </div>
      )}

      {/* Two-player comparison */}
      {bothSelected && d1 && d2 && (
        <div>
          {/* View toggle + min minutes control */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {['radar', 'bars'].map(v => (
              <button key={v} className={`btn ${view === v ? 'btn-green' : 'btn-ghost'}`} onClick={() => setView(v)}>
                {v === 'radar' ? '📡 Radar' : '📊 Stats Bars'}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>Cohort min mins</span>
              <select
                value={minMinutes}
                onChange={e => setMinMinutes(+e.target.value)}
                className="filter-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                aria-label="Minimum minutes for percentile cohort"
              >
                {[0, 450, 900, 1350, 1800].map(m => (
                  <option key={m} value={m}>{m === 0 ? 'All players' : `≥${m} min`}</option>
                ))}
              </select>
            </div>
          </div>

          {view === 'radar' && (
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
              <div className="card-title" style={{ textAlign: 'center', fontSize: '1.05rem' }}>
                <span style={{ color: 'var(--green)' }}>{p1.name}</span>
                <span style={{ color: 'var(--text-3)', margin: '0 12px' }}>vs</span>
                <span style={{ color: 'var(--purple)' }}>{p2.name}</span>
              </div>

              {radarLoading && <div className="loading"><div className="spinner" /> Loading radar...</div>}
              {radarError && <div style={{ padding: 20, color: 'var(--red)', fontSize: '0.8rem' }}>⚠ {radarError}</div>}

              {radarReady && !radarLoading && (
                <>
                  <RadarChart
                    data={radarData}
                    player1={{ name: p1.name, color: '#10b981' }}
                    player2={{ name: p2.name, color: '#8b5cf6' }}
                    cohort={cohort}
                    season={season}
                    warning={warning}
                  />
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                      Detailed Metrics
                    </div>
                    <RadarTable radarData={radarData} players={radarPlayers} />
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'bars' && (
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
                  { label: 'Better in Goals',   val: (d1.goals||0) >= (d2.goals||0) ? p1.name : p2.name, color: (d1.goals||0) >= (d2.goals||0) ? 'var(--green)' : 'var(--purple)' },
                  { label: 'Better in Assists',  val: (d1.assists||0) >= (d2.assists||0) ? p1.name : p2.name, color: (d1.assists||0) >= (d2.assists||0) ? 'var(--green)' : 'var(--purple)' },
                  { label: 'More Minutes',       val: (d1.minutes||0) >= (d2.minutes||0) ? p1.name : p2.name, color: (d1.minutes||0) >= (d2.minutes||0) ? 'var(--green)' : 'var(--purple)' },
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
      )}
    </div>
  )
}
