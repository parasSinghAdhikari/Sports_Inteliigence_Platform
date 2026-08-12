import React, { useState, useEffect, useCallback } from 'react'

const API = '/api'

const OUTCOME_COLORS = { H: 'var(--cyan)', D: 'var(--yellow)', A: 'var(--purple)' }
const OUTCOME_LABEL = { H: 'Home', D: 'Draw', A: 'Away' }

function OutcomeBadge({ outcome }) {
  const color = OUTCOME_COLORS[outcome] || 'var(--text-2)'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 6,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px',
      background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}`, color,
    }}>
      {outcome}
    </span>
  )
}

function ConfidenceBar({ probabilities }) {
  const [h, d, a] = [probabilities?.H || 0, probabilities?.D || 0, probabilities?.A || 0]
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: 120 }}>
      <div style={{ width: `${h * 100}%`, background: OUTCOME_COLORS.H, transition: 'width .5s' }} />
      <div style={{ width: `${d * 100}%`, background: OUTCOME_COLORS.D, transition: 'width .5s' }} />
      <div style={{ width: `${a * 100}%`, background: OUTCOME_COLORS.A, transition: 'width .5s' }} />
    </div>
  )
}

function MatchResult({ data }) {
  if (!data) return null
  const exp = data.expected || {}
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-title"><span style={{ color: 'var(--cyan)' }}>🔮</span> Prediction</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right', flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{data.home_team}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Home</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <OutcomeBadge outcome={data.outcome} />
            <span style={{
              fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800,
              padding: '4px 14px', background: 'rgba(255,255,255,0.05)',
              borderRadius: 10, letterSpacing: 2,
            }}>{exp.home_goals ?? '–'}–{exp.away_goals ?? '–'}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>
            most likely: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{exp.scoreline}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{data.away_team}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Away</div>
        </div>
      </div>

      {/* Confidence bars */}
      <div style={{ marginTop: 20 }}>
        {(['H', 'D', 'A']).map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 40, fontWeight: 700, color: OUTCOME_COLORS[k] }}>{OUTCOME_LABEL[k]}</span>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(data.probabilities?.[k] || 0) * 100}%`,
                background: OUTCOME_COLORS[k], borderRadius: 4, transition: 'width .6s ease',
              }} />
            </div>
            <span style={{ width: 50, textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-2)' }}>
              {((data.probabilities?.[k] || 0) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Expected goals readout */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {[
          { label: 'Expected Goals', v1: exp.home_goals, v2: exp.away_goals },
          { label: 'Win Probability (goals model)', v1: exp.win_probs?.H, v2: exp.win_probs?.A },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Outfit', fontWeight: 800, color: 'var(--cyan)' }}>{s.v1 ?? '–'}</span>
              <span style={{ fontFamily: 'Outfit', fontWeight: 800, color: 'var(--purple)' }}>{s.v2 ?? '–'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportPanel({ report }) {
  if (!report) return null
  const c = report.classifier || {}
  const g = report.goals || {}
  return (
    <div className="card">
      <div className="card-title"><span style={{ color: 'var(--purple)' }}>📈</span> Model Report</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[
          { label: 'Accuracy', value: (c.accuracy * 100).toFixed(1) + '%', accent: true },
          { label: 'Baseline', value: (c.baseline_accuracy * 100).toFixed(1) + '%' },
          { label: 'Log Loss', value: c.log_loss?.toFixed(3) },
          { label: 'Features', value: report.feature_count },
          { label: 'Home goals MAE', value: g.home?.mae?.toFixed(2) },
          { label: 'Away goals MAE', value: g.away?.mae?.toFixed(2) },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem', color: s.accent ? 'var(--cyan)' : 'var(--text-1)' }}>{s.value ?? '–'}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: '0.74rem', color: 'var(--text-3)' }}>
        Single 2024-25 season (380 matches) — accuracy near the majority baseline is expected. Retrain via
        <code style={{ color: 'var(--cyan)' }}> scripts/train_model.py</code> when new data arrives.
      </div>
    </div>
  )
}

export default function Predictions() {
  const [teams, setTeams] = useState([])
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [result, setResult] = useState(null)
  const [report, setReport] = useState(null)
  const [upcoming, setUpcoming] = useState(null)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/teams/`).then(r => r.json()),
      fetch(`${API}/predictions/report`).then(r => r.json()).catch(() => null),
      fetch(`${API}/predictions/upcoming`).then(r => r.json()).catch(() => null),
    ]).then(([td, rep, up]) => {
      const names = (td.teams || []).map(t => t.name).sort()
      setTeams(names)
      if (names.length >= 2) { setHome(names[0]); setAway(names[1]) }
      setReport(rep)
      setUpcoming(up)
    }).catch(() => {})
  }, [])

  const predict = useCallback(() => {
    if (!home || !away || home === away) return
    setPredicting(true)
    fetch(`${API}/predictions/match?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`)
      .then(r => r.json())
      .then(d => { setResult(d); setPredicting(false) })
      .catch(() => setPredicting(false))
  }, [home, away])

  const notTrained = report && report.model_loaded === false

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Predictions</div>
          <div className="page-subtitle">Match outcome (H/D/A) + expected goals from a trained model</div>
        </div>
      </div>

      {notTrained && (
        <div className="empty" style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 20 }}>
          Model not trained yet. Run <code style={{ color: 'var(--cyan)' }}>python scripts/train_model.py</code> to enable predictions.
        </div>
      )}

      {/* Arbitrary match form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><span style={{ color: 'var(--cyan)' }}>⚔️</span> Predict Any Match</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={home} onChange={e => setHome(e.target.value)}>
            {teams.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>vs</span>
          <select className="filter-select" value={away} onChange={e => setAway(e.target.value)}>
            {teams.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={predict} disabled={predicting} style={{
            padding: '9px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            fontFamily: 'Inter', fontSize: '0.85rem', border: '1px solid rgba(0,212,255,0.3)',
            background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)',
          }}>
            {predicting ? 'Predicting…' : '🔮 Predict'}
          </button>
        </div>
      </div>

      <MatchResult data={result} />

      {/* Upcoming fixtures */}
      <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0' }} className="card-title">
          <span style={{ color: 'var(--cyan)' }}>📅</span> Upcoming Fixtures
        </div>
        {upcoming && upcoming.count > 0 ? (
          <div style={{ padding: '0 20px 20px' }}>
            {upcoming.fixtures.map((f, i) => (
              <div key={f.game_id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ width: 30, color: 'var(--text-3)', fontSize: '0.72rem' }}>W{f.matchweek}</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{f.home_team}</span>
                <OutcomeBadge outcome={f.outcome} />
                <span style={{ flex: 1, fontWeight: 600 }}>{f.away_team}</span>
                <ConfidenceBar probabilities={f.probabilities} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--cyan)', width: 40, textAlign: 'center' }}>
                  {f.expected?.scoreline}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '24px' }}>
            No unplayed fixtures in the 2024-25 season dataset. Predict any match above instead.
          </div>
        )}
      </div>

      {/* Model report */}
      {report && <div style={{ marginTop: 20 }}><ReportPanel report={report} /></div>}
    </div>
  )
}
