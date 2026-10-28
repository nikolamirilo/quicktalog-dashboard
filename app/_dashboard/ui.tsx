"use client"

import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Info,
  Minus,
  XCircle,
} from "lucide-react"

import AnimatedNumber from "@/components/AnimatedNumber"
import { Card } from "@/components/charts"
import { cx } from "@/lib/utils/cx"
import {
  getColorClassName,
  type AvailableChartColorsKeys,
} from "@/lib/utils/chartColors"

import type { Attention, Ranking, Scope } from "./types"

// ── Formatters ──────────────────────────────────────────────────────────────

const intl = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact" })

export const number = (n: number) => intl.format(n)
export const compactNumber = (n: number) => compact.format(n)
export const decimal = (n: number) => n.toFixed(2)
export const pct = (n: number) => `${n}%`
// Paddle reports in the account's currency; plans are priced in USD. Cents
// only when there are some, and never on four-figure amounts.
export const money = (n: number, currency = "USD") => {
  const digits = Number.isInteger(n) || Math.abs(n) >= 1000 ? 0 : 2
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}
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
// Which slice of time a card covers.
export function ScopeChip({ scope }: { scope: Scope }) {
  return (
    <span className="inline-flex items-center rounded-full bg-bg-alt px-2 py-px text-[11.5px] font-bold whitespace-nowrap text-ink-2 ring-1 ring-line ring-inset">
      {scope}
    </span>
  )
}

// Change against the previous period. Direction always comes with a sign and
// an arrow, never colour alone. `invert` is for figures where up is bad;
// "pts" compares two percentages by their difference.
export function Delta({
  value,
  previous,
  invert = false,
  unit = "%",
}: {
  value: number
  previous: number | null
  invert?: boolean
  unit?: "%" | "pts"
}) {
  if (previous == null) return null
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-bold text-ink tabular-nums"
  const flat = (
    <span className={cx(base, "bg-bg-alt")}>
      <Minus className="size-3.5 text-ink-3" aria-hidden="true" />
      {unit === "pts" ? "0 pts" : "0%"}
    </span>
  )
  if (unit === "%" && previous === 0) {
    return value > 0 ? (
      <span className={cx(base, invert ? "bg-red/18" : "bg-success/15")}>
        <ArrowUpRight
          className={cx("size-3.5", invert ? "text-red" : "text-success")}
          aria-hidden="true"
        />
        New
      </span>
    ) : (
      flat
    )
  }
  const change =
    unit === "pts" ? value - previous : ((value - previous) / previous) * 100
  const rounded = Math.round(change * 10) / 10
  if (rounded === 0) return flat
  const up = rounded > 0
  const good = up !== invert
  const Icon = up ? ArrowUpRight : ArrowDownRight
  const size = Math.abs(rounded)
  return (
    <span className={cx(base, good ? "bg-success/15" : "bg-red/18")}>
      <Icon
        className={cx("size-3.5", good ? "text-success" : "text-red")}
        aria-hidden="true"
      />
      {up ? "+" : "−"}
      {unit === "pts" ? `${size} pts` : `${size > 999 ? "999+" : size}%`}
    </span>
  )
}

// A link to another page of the dashboard; the URL hash picks the tab.
export function TabLink({
  tab,
  children,
  className,
}: {
  tab: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={`#${tab}`}
      className={cx(
        "inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-ink underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </a>
  )
}

const LEVELS = {
  broken: { label: "Broken", icon: XCircle, className: "bg-red-soft text-red" },
  act: { label: "Act", icon: AlertTriangle, className: "bg-amber-soft text-amber-ink" },
  check: { label: "Check", icon: Info, className: "bg-bg-alt text-ink-2" },
} satisfies Record<Attention["level"], { label: string; icon: LucideIcon; className: string }>

export function LevelPill({ level }: { level: Attention["level"] }) {
  const { label, icon: Icon, className } = LEVELS[level]
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Note({
  children,
  tone = "plain",
}: {
  children: React.ReactNode
  tone?: "plain" | "amber"
}) {
  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-md px-3.5 py-3 text-[13.5px] leading-relaxed",
        tone === "amber"
          ? "border border-amber/35 bg-amber-soft text-ink"
          : "bg-bg-alt/70 text-ink-2",
      )}
    >
      <Info
        className={cx(
          "mt-[3px] size-4 flex-none",
          tone === "amber" ? "text-amber-ink" : "text-ink-3",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// The app's KPI tile (quicktalog-app src/components/analytics/KpiCards.tsx):
// label, big number and a note, with the icon in an amber tile top right.
// Every tile names its scope; `warn` outlines one that needs action.
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  scope,
  delta,
  action,
  tone,
  pending = false,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  scope?: Scope
  delta?: React.ReactNode
  action?: React.ReactNode
  tone?: "warn"
  pending?: boolean // the figure needs data that isn't there yet
}) {
  return (
    <Card
      className={cx(
        "flex min-w-0 flex-col gap-1 p-4",
        tone === "warn" && "ring-[1.5px] ring-amber ring-inset",
      )}
    >
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
      <b
        className={cx(
          "mt-1.5 truncate font-head text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-[-0.03em] tabular-nums",
          pending ? "text-ink-3" : "text-ink",
        )}
      >
        <AnimatedNumber value={value} />
      </b>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta}
          {hint && (
            <small className="text-[12.5px] leading-snug text-ink-3">{hint}</small>
          )}
        </div>
      )}
      {(scope || action) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
          {scope && <ScopeChip scope={scope} />}
          {action}
        </div>
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
  scope,
  action,
  children,
}: {
  title: string
  subtitle?: string
  scope?: Scope
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>
          )}
        </div>
        {(scope || action) && (
          <div className="flex flex-wrap items-center gap-2">
            {action}
            {scope && <ScopeChip scope={scope} />}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  )
}

// A part-to-whole as one bar: fixed colour per part, 2px gaps between them.
export function PartsBar({
  rows,
  colors,
}: {
  rows: { name: string; value: number }[]
  colors: AvailableChartColorsKeys[]
}) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) return null
  return (
    <div className="flex h-3 w-full gap-[2px]">
      {rows.map((r, i) =>
        r.value > 0 ? (
          <span
            key={r.name}
            title={`${r.name}: ${number(r.value)} (${pct(Math.round((r.value / total) * 1000) / 10)})`}
            className={cx(
              "h-full min-w-[3px] first:rounded-l-[4px] last:rounded-r-[4px]",
              getColorClassName(colors[i] ?? "gray", "bg"),
            )}
            style={{ flexGrow: r.value, flexBasis: 0 }}
          />
        ) : null,
      )}
    </div>
  )
}

export function PartsLegend({
  rows,
  colors,
  detail,
}: {
  rows: { name: string; value: number }[]
  colors: AvailableChartColorsKeys[]
  detail?: (i: number) => string
}) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="grid grid-cols-1 gap-y-2">
      {rows.map((r, i) => (
        <li key={r.name} className="flex min-w-0 items-baseline gap-2 text-sm">
          <span
            aria-hidden="true"
            className={cx(
              "size-2.5 flex-none translate-y-[1px] rounded-full",
              getColorClassName(colors[i] ?? "gray", "bg"),
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="text-ink-2">{r.name}</span>
            {detail && (
              <span className="block text-[12.5px] text-ink-3">{detail(i)}</span>
            )}
          </span>
          <span className="text-ink tabular-nums">{number(r.value)}</span>
          <span className="w-11 text-right text-[13px] text-ink-3 tabular-nums">
            {pct(total ? Math.round((r.value / total) * 1000) / 10 : 0)}
          </span>
        </li>
      ))}
    </ul>
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
}: {
  data: { name: string; value: number }[]
  colors: AvailableChartColorsKeys[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
