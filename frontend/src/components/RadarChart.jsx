/**
 * RadarChart — pure SVG spider/radar chart.
 *
 * Props:
 *   data        [{ key, label, p1Value, p1Pct, p2Value, p2Pct }]
 *   player1     { name, color }
 *   player2     { name, color } | null  (single-player mode)
 *   season      string
 *   cohort      { position, min_minutes, size }
 *   warning     string | null
 */
import React, { useState } from 'react'

const COLORS = {
  p1:         '#10b981',   // green
  p1Fill:     'rgba(16,185,129,0.18)',
  p2:         '#8b5cf6',   // purple
  p2Fill:     'rgba(139,92,246,0.18)',
  axis:       'rgba(255,255,255,0.08)',
  ring:       'rgba(255,255,255,0.05)',
  label:      '#7c8fa6',
  labelHover: '#e2e8f0',
  bg:         '#0f1923',
}

const N_RINGS = 5  // concentric rings at 20%, 40%, 60%, 80%, 100%

function polarToCart(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

export default function RadarChart({
  data = [],
  player1,
  player2 = null,
  season,
  cohort,
  warning,
}) {
  const [tooltip, setTooltip] = useState(null)
  if (!data.length) return null

  const CX = 200, CY = 200, R = 140, LABEL_R = R + 26
  const n = data.length
  const angles = data.map((_, i) => (360 / n) * i)

  // Build polygon points for a player (using percentiles 0-100 → radius 0-R)
  function polyPoints(pctKey) {
    return angles
      .map((ang, i) => {
        const pct = data[i][pctKey]
        const r = pct != null ? (pct / 100) * R : 0
        return polarToCart(CX, CY, r, ang)
      })
      .map(([x, y]) => `${x},${y}`)
      .join(' ')
  }

  // Axis endpoints
  const axisEndpoints = angles.map(ang => polarToCart(CX, CY, R, ang))

  // Ring radii
  const rings = Array.from({ length: N_RINGS }, (_, i) => ((i + 1) / N_RINGS) * R)

  // Label position (pushed outward a bit further)
  function labelPos(i) {
    const [x, y] = polarToCart(CX, CY, LABEL_R, angles[i])
    const textAnchor = x < CX - 4 ? 'end' : x > CX + 4 ? 'start' : 'middle'
    return { x, y, textAnchor }
  }

  return (
    <div style={{ fontFamily: 'Inter' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.p1 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{player1?.name}</span>
        </div>
        {player2 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.p2 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{player2?.name}</span>
          </div>
        )}
        <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
          Percentile vs {cohort?.size} {cohort?.position}s ≥{cohort?.min_minutes} min · {season}
        </span>
      </div>

      {warning && (
        <div style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, fontSize: '0.68rem', color: 'var(--yellow)', marginBottom: 10 }}>
          ⚠ {warning}
        </div>
      )}

      {/* SVG Radar */}
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: 420, height: 'auto' }}
          role="img" aria-label="Radar chart of player statistics">
          {/* Ring labels at 20/40/60/80/100 */}
          {rings.map((r, i) => (
            <text key={i} x={CX + 4} y={CY - r + 4} fontSize={9} fill={COLORS.label} opacity={0.6}>{(i + 1) * 20}</text>
          ))}
          {/* Concentric rings */}
          {rings.map((r, i) => {
            const pts = angles.map(ang => polarToCart(CX, CY, r, ang)).map(([x, y]) => `${x},${y}`).join(' ')
            return <polygon key={i} points={pts} fill="none" stroke={COLORS.ring} strokeWidth={1} />
          })}
          {/* Axis lines */}
          {axisEndpoints.map(([x, y], i) => (
            <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={COLORS.axis} strokeWidth={1} />
          ))}

          {/* Player 2 polygon (drawn first so P1 is on top) */}
          {player2 && (
            <>
              <polygon points={polyPoints('p2Pct')} fill={COLORS.p2Fill} stroke={COLORS.p2} strokeWidth={2} />
              {/* P2 dots */}
              {angles.map((ang, i) => {
                const pct = data[i].p2Pct
                if (pct == null) return null
                const [x, y] = polarToCart(CX, CY, (pct / 100) * R, ang)
                return (
                  <circle key={i} cx={x} cy={y} r={4} fill={COLORS.p2} stroke={COLORS.bg} strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ x, y, player: player2.name, ...data[i], pctKey: 'p2Pct', valKey: 'p2Value' })}
                    onMouseLeave={() => setTooltip(null)} />
                )
              })}
            </>
          )}

          {/* Player 1 polygon */}
          <polygon points={polyPoints('p1Pct')} fill={COLORS.p1Fill} stroke={COLORS.p1} strokeWidth={2} />
          {/* P1 dots */}
          {angles.map((ang, i) => {
            const pct = data[i].p1Pct
            if (pct == null) return null
            const [x, y] = polarToCart(CX, CY, (pct / 100) * R, ang)
            return (
              <circle key={i} cx={x} cy={y} r={4} fill={COLORS.p1} stroke={COLORS.bg} strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x, y, player: player1.name, ...data[i], pctKey: 'p1Pct', valKey: 'p1Value' })}
                onMouseLeave={() => setTooltip(null)} />
            )
          })}

          {/* Axis labels */}
          {data.map((d, i) => {
            const { x, y, textAnchor } = labelPos(i)
            return (
              <text key={i} x={x} y={y + 4} textAnchor={textAnchor}
                fontSize={11} fontWeight={600} fill={COLORS.label} fontFamily="Inter">
                {d.label}
              </text>
            )
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const val = tooltip[tooltip.valKey]
            const pct = tooltip[tooltip.pctKey]
            const lines = [
              tooltip.player,
              `${tooltip.label}: ${val != null ? val.toFixed(2) : 'N/A'}${tooltip.unit || ''}`,
              pct != null ? `${pct}th percentile` : 'Percentile unavailable',
            ]
            const boxW = 180, boxH = 58
            const tx = Math.min(Math.max(tooltip.x - boxW / 2, 8), 400 - boxW - 8)
            const ty = tooltip.y < CY ? tooltip.y + 12 : tooltip.y - boxH - 12
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={boxW} height={boxH} rx={6}
                  fill="#1a2639" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                {lines.map((l, i) => (
                  <text key={i} x={tx + 10} y={ty + 16 + i * 16}
                    fontSize={10} fill={i === 0 ? '#e2e8f0' : i === 2 ? '#10b981' : '#7c8fa6'}
                    fontWeight={i === 0 ? 700 : 400} fontFamily="Inter">
                    {l}
                  </text>
                ))}
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
