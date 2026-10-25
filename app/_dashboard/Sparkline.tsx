"use client"

import { useId, useState } from "react"

const W = 100
const H = 36

export type SparkPoint = { date: string; value: number }

// A single-series trend for the hero tiles: a 2px line over a fading fill,
// with a hover dot; the hovered point goes to `onActive` so the tile can show
// it. Coloured by the first series slot, so it takes the night step inside
// `.night`.
export default function Sparkline({
  points,
  format,
  label,
  onActive,
}: {
  points: SparkPoint[]
  format: (n: number) => string
  label: string
  onActive?: (point: SparkPoint | null) => void
}) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  if (points.length === 0) return null

  const max = Math.max(...points.map((p) => p.value), 1)
  const x = (i: number) =>
    points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
  const y = (v: number) => H - 2 - (v / max) * (H - 6)
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`)
    .join("")
  const area = `${line}L${W},${H}L0,${H}Z`

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const i = Math.round(ratio * (points.length - 1))
    setHover(i)
    onActive?.(points[i])
  }

  const active = hover != null ? points[hover] : null
  const left = hover != null ? (x(hover) / W) * 100 : 0

  return (
    <div
      className="relative h-12 w-full touch-none text-series-amber"
      onPointerMove={onMove}
      onPointerLeave={() => {
        setHover(null)
        onActive?.(null)
      }}
      role="img"
      aria-label={`${label}: ${format(points[0].value)} at ${points[0].date}, ${format(points[points.length - 1].value)} at ${points[points.length - 1].date}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {active && (
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-[#0e0d0a]"
          style={{ left: `${left}%`, top: `${(y(active.value) / H) * 100}%` }}
        />
      )}
    </div>
  )
}
