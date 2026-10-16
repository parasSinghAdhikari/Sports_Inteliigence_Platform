/**
 * useRadar — fetches radar percentile data and transforms it into the
 * format expected by RadarChart.
 *
 * Returns { radarData, metrics, cohort, season, warning, loading, error }
 */
import { useState, useEffect } from 'react'

const API = '/api'

export function useRadar(player1Id, player2Id = null, minMinutes = 900) {
  const [state, setState] = useState({
    radarData: [],
    metrics: [],
    cohort: null,
    season: '',
    warning: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!player1Id) {
      setState(s => ({ ...s, radarData: [], metrics: [], loading: false, error: null }))
      return
    }

    setState(s => ({ ...s, loading: true, error: null }))

    const params = new URLSearchParams({ player1_id: player1Id, min_minutes: minMinutes })
    if (player2Id) params.set('player2_id', player2Id)

    fetch(`${API}/radar/radar?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const [p1, p2] = d.players
        const radarData = d.metrics.map(m => ({
          key:      m.key,
          label:    m.label,
          unit:     m.unit,
          lowerIsBetter: m.lower_is_better,
          p1Value:  p1?.stats[m.key]?.value ?? null,
          p1Pct:    p1?.stats[m.key]?.percentile ?? null,
          p2Value:  p2?.stats[m.key]?.value ?? null,
          p2Pct:    p2?.stats[m.key]?.percentile ?? null,
        }))

        setState({
          radarData,
          metrics:  d.metrics,
          cohort:   d.cohort,
          season:   d.season,
          warning:  d.warning,
          players:  d.players,
          loading:  false,
          error:    null,
        })
      })
      .catch(err => setState(s => ({ ...s, loading: false, error: err.message })))
  }, [player1Id, player2Id, minMinutes])

  return state
}
