import React, { useState, useEffect } from 'react'

const API = '/api'
const TEAMS = [
  'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton',
  'Chelsea','Crystal Palace','Everton','Fulham','Ipswich Town',
  'Leicester City','Liverpool','Manchester City','Manchester Utd',
  'Newcastle','Nottingham','Southampton','Tottenham','West Ham','Wolves',
]

function DonutChart({ homeProb, drawProb, awayProb, homeTeam, awayTeam }) {
  const h = Math.round(homeProb * 100)
  const d = Math.round(drawProb * 100)
  const a = Math.round(awayProb * 100)

  // SVG donut segments
  const r = 50, cx = 60, cy = 60, stroke = 18
  const circ = 2 * Math.PI * r
  const segments = [
    { pct: h/100, color: 'var(--green)',  label: `${homeTeam.split(' ')[0]}` },
    { pct: d/100, color: 'var(--yellow)', label: 'Draw' },
    { pct: a/100, color: 'var(--purple)', label: `${awayTeam.split(' ')[0]}` },
  ]
  let offset = 0
  const arcs = segments.map(s => {
    const dash = s.pct * circ
    const gap = circ - dash
    const arc = { dash, gap, offset, ...s }
    offset += dash
    return arc
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
        <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          {arcs.map((arc, i) => (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              opacity={0.85}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-1)' }}>{h}%</div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>Home Win</div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {[
          { label: homeTeam, pct: h, color: 'var(--green)' },
          { label: 'Draw',   pct: d, color: 'var(--yellow)' },
          { label: awayTeam, pct: a, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 700 }}>{s.pct}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 2, transition: 'width 0.6s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Predictions() {
  const [home, setHome] = useState('Arsenal')
  const [away, setAway] = useState('Liverpool')
  const [result, setResult] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modelOk, setModelOk] = useState(true)

  useEffect(() => {
    fetch(`${API}/predictions/report`)
      .then(r => r.json())
      .then(d => setReport(d))
      .catch(() => setModelOk(false))
    predict('Arsenal', 'Liverpool')
  }, [])

  const predict = (h, a) => {
    setLoading(true)
    fetch(`${API}/predictions/match?home=${encodeURIComponent(h)}&away=${encodeURIComponent(a)}`)
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const probs = result?.probabilities || {}
  const exp = result?.expected || {}

  const keyFactors = [
    { label: 'Home Advantage',   pct: 56, bar: 56 },
    { label: 'Attack Strength',  pct: Math.round((probs.H || 0.5) * 100), bar: Math.round((probs.H || 0.5) * 100) },
    { label: 'Recent Form',      pct: 60, bar: 60 },
    { label: 'Defense Strength', pct: 45, bar: 45 },
    { label: 'Head-to-head',     pct: 50, bar: 50 },
  ]

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div className="page-title">Predictions</div>
          <div className="page-subtitle">ML match-outcome model · GradientBoosting + calibration</div>
        </div>
        {report && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'right' }}>
            <div>Model: {report.classifier?.model?.replace('(calibrated)', '')}</div>
            <div>Features: {report.feature_count} · Acc: {((report.classifier?.accuracy||0)*100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      {!modelOk && (
        <div style={{ padding: 16, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16, fontSize: '0.8rem', color: 'var(--red)' }}>
          Model not trained. Run: <code>python scripts/train_model.py</code>
        </div>
      )}

      {/* Match Picker */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><span className="ct-icon">🔮</span> Upcoming Match</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Home Team</div>
            <select className="filter-select" style={{ width: '100%' }} value={home} onChange={e => setHome(e.target.value)}>
              {TEAMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'center', paddingTop: 18 }}>
            <div style={{
              fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.1rem',
              color: 'var(--text-3)', padding: '6px 12px',
              background: 'var(--bg-card2)', borderRadius: 8,
            }}>VS</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Away Team</div>
            <select className="filter-select" style={{ width: '100%' }} value={away} onChange={e => setAway(e.target.value)}>
              {TEAMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-green" onClick={() => predict(home, away)} disabled={loading}>
              {loading ? '...' : '🔮 Predict'}
            </button>
          </div>
        </div>
      </div>

      {result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Probability card */}
          <div className="card">
            <div className="card-title"><span className="ct-icon">📊</span> Win Probability</div>
            <DonutChart
              homeProb={probs.H || 0}
              drawProb={probs.D || 0}
              awayProb={probs.A || 0}
              homeTeam={home}
              awayTeam={away}
            />

            {/* Predicted scoreline */}
            <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-card2)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Predicted Score</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.9rem' }}>{home}</span>
                <span style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.6rem',
                  padding: '4px 14px', background: 'var(--bg-base)', borderRadius: 8, letterSpacing: 2,
                  color: result.outcome === 'H' ? 'var(--green)' : result.outcome === 'A' ? 'var(--purple)' : 'var(--yellow)',
                }}>{exp.scoreline || '?-?'}</span>
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.9rem' }}>{away}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--text-3)' }}>
                {result.outcome === 'H' ? `${home} Win` : result.outcome === 'A' ? `${away} Win` : 'Draw'} predicted ·{' '}
                <span style={{ color: 'var(--green)' }}>{((exp.scoreline_prob||0)*100).toFixed(0)}%</span> most likely score
              </div>
            </div>

            {/* xG */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: 'var(--green)' }}>{exp.home_goals}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 2 }}>xG {home}</div>
              </div>
              <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: 'var(--purple)' }}>{exp.away_goals}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 2 }}>xG {away}</div>
              </div>
            </div>
          </div>

          {/* Key factors + model info */}
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title"><span className="ct-icon">⚡</span> Key Factors</div>
              {keyFactors.map(f => (
                <div key={f.label} className="bar-row">
                  <span className="bar-label">{f.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${f.bar}%`, background: 'var(--green)' }} />
                  </div>
                  <span className="bar-value">{f.pct}%</span>
                </div>
              ))}
            </div>

            {report && (
              <div className="card">
                <div className="card-title"><span className="ct-icon">🤖</span> Model Info</div>
                {[
                  { label: 'Algorithm', val: report.classifier?.model?.split('(')[0]?.trim() },
                  { label: 'Features',  val: report.feature_count },
                  { label: 'Training',  val: `${report.n_train} matches` },
                  { label: 'Accuracy',  val: `${((report.classifier?.accuracy||0)*100).toFixed(0)}%` },
                ].map(s => (
                  <div key={s.label} className="mini-stat-row">
                    <span className="mini-stat-label">{s.label}</span>
                    <span className="mini-stat-value">{s.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
