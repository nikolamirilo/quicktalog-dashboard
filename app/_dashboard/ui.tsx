"use client"

import type { LucideIcon } from "lucide-react"

import AnimatedNumber from "@/components/AnimatedNumber"
import { Card } from "@/components/charts"
import { cx } from "@/lib/utils/cx"
import {
  getColorClassName,
  type AvailableChartColorsKeys,
} from "@/lib/utils/chartColors"

import type { Ranking } from "./types"

// ── Formatters ──────────────────────────────────────────────────────────────

const intl = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact" })
const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export const number = (n: number) => intl.format(n)
export const compactNumber = (n: number) => compact.format(n)
export const decimal = (n: number) => n.toFixed(2)
export const pct = (n: number) => `${n}%`
export const money = (n: number) => moneyFmt.format(n)
// Whole hours, with days split off from a day up: "<1h", "5h", "1d 2h".
export const hours = (n: number) => {
  const total = Math.round(n)
  if (total < 1) return "<1h"
  const d = Math.floor(total / 24)
  return d ? `${d}d ${total % 24}h` : `${total}h`
}

export const toRanking = (rows: { name: string; value: number }[]): Ranking[] =>
  rows.map((b) => ({ id: b.name, name: b.name, value: b.value }))

// ── Chart colours ───────────────────────────────────────────────────────────

// Categorical slots in order; see the series tokens in app/globals.css.
// Single-series charts use the first one.
export const SERIES: AvailableChartColorsKeys[] = [
  "amber",
  "violet",
  "magenta",
  "green",
  "blue",
  "aqua",
]

// Each known value of a dimension owns a slot, so a segment keeps its colour
// when the range changes which values are present. Anything else (a custom
// plan, "None") is neutral.
const SLOTS = {
  status: ["Active", "Draft", "Inactive", "In Preparation", "Error"],
  plan: ["Starter", "Basic", "Pro", "Growth", "Premium"],
  subscription: ["Active", "Trialing", "Past Due", "Paused", "Canceled"],
} satisfies Record<string, string[]>

export const colorsFor = (
  rows: { name: string }[],
  dimension: keyof typeof SLOTS,
): AvailableChartColorsKeys[] =>
  rows.map((r) => {
    const i = (SLOTS[dimension] as string[]).indexOf(r.name)
    return i >= 0 ? SERIES[i] : "gray"
  })

// ── Building blocks ─────────────────────────────────────────────────────────

// The app's KPI tile (quicktalog-app src/components/analytics/KpiCards.tsx):
// label, big number and a note, with the icon in an amber tile top right.
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-4">
      {Icon && (
        <span
          aria-hidden="true"
          className="absolute top-3.5 right-3.5 grid size-[34px] place-items-center rounded-[11px] border border-amber/35 bg-amber-soft text-amber-ink"
        >
          <Icon className="size-4" />
        </span>
      )}
      <span
        className={cx(
          "text-[13px] leading-snug font-semibold text-ink-2",
          Icon && "pr-10",
        )}
      >
        {label}
      </span>
      <b className="mt-1.5 truncate font-head text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-[-0.03em] text-ink tabular-nums">
        <AnimatedNumber value={value} />
      </b>
      {hint && (
        <small className="text-[12.5px] leading-snug text-ink-3">{hint}</small>
      )}
    </Card>
  )
}

export function KpiInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-alt/70 px-3 py-2">
      <p className="text-[12.5px] leading-snug font-semibold text-ink-2">
        {label}
      </p>
      <p className="font-head text-[15px] font-extrabold text-ink tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div>
      <h2 className="text-card-title font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3.5">
        <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  )
}

export function Empty({ label = "No data in this range." }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-ink-3">{label}</p>
}

export function RankingList({
  rows,
  valueLabel,
  format = number,
}: {
  rows: Ranking[]
  valueLabel: string
  format?: (n: number) => string
}) {
  if (rows.length === 0) {
    return <Empty label="No data yet." />
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      <li className="flex items-baseline justify-between text-[13px] text-ink-3">
        <span>Name</span>
        <span>{valueLabel}</span>
      </li>
      {rows.map((r) => {
        const width = (r.value / max) * 100
        return (
          <li key={r.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">
                {r.name}
                {r.meta && (
                  <span className="ml-2 text-[13px] text-ink-3">{r.meta}</span>
                )}
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                {format(r.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-alt">
              <div
                className="h-full rounded-full bg-series-amber"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function DonutLegend({
  data,
  colors,
  columns = 2,
}: {
  data: { name: string; value: number }[]
  colors: AvailableChartColorsKeys[]
  columns?: 1 | 2 // 1 when the names are long
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ul
      className={cx(
        "grid w-full grid-cols-1 gap-x-6 gap-y-2 text-sm",
        columns === 2 && "sm:grid-cols-2",
      )}
    >
      {data.map((d, i) => {
        const share = total ? ((d.value / total) * 100).toFixed(1) : "0.0"
        return (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${getColorClassName(colors[i] ?? "gray", "bg")}`}
              aria-hidden
            />
            <span className="flex-1 truncate text-ink-2">{d.name}</span>
            <span className="text-ink tabular-nums">{number(d.value)}</span>
            <span className="w-10 text-right text-[13px] text-ink-3 tabular-nums">
              {share}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
