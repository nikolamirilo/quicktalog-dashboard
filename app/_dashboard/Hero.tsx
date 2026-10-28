"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react"

import AnimatedNumber from "@/components/AnimatedNumber"
import { cx } from "@/lib/utils/cx"

import Sparkline, { type SparkPoint } from "./Sparkline"

export type Pulse = {
  label: string
  icon: LucideIcon
  value: number
  previous: number | null // null when there is no earlier period to compare
  points: { date: string; value: number }[]
  format: (n: number) => string
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`))

// Change against the previous period of the same length. Direction always
// comes with a sign and an arrow, never colour alone.
function Delta({
  value,
  previous,
}: {
  value: number
  previous: number | null
}) {
  if (previous == null) return null
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-bold text-ink tabular-nums"
  if (previous === 0) {
    return value > 0 ? (
      <span className={cx(base, "bg-success/15")}>
        <ArrowUpRight className="size-3.5 text-success" aria-hidden="true" />
        New
      </span>
    ) : (
      <span className={cx(base, "bg-bg-alt")}>
        <Minus className="size-3.5 text-ink-3" aria-hidden="true" />
        0%
      </span>
    )
  }
  const change = ((value - previous) / previous) * 100
  const rounded = Math.round(change * 10) / 10
  if (rounded === 0) {
    return (
      <span className={cx(base, "bg-bg-alt")}>
        <Minus className="size-3.5 text-ink-3" aria-hidden="true" />
        0%
      </span>
    )
  }
  const up = rounded > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cx(base, up ? "bg-success/15" : "bg-red/18")}>
      <Icon
        className={cx("size-3.5", up ? "text-success" : "text-red")}
        aria-hidden="true"
      />
      {up ? "+" : "−"}
      {Math.abs(rounded) > 999 ? "999+" : Math.abs(rounded)}%
    </span>
  )
}

function PulseTile({
  pulse,
  compareLabel,
}: {
  pulse: Pulse
  compareLabel: string | null
}) {
  const { icon: Icon } = pulse
  const [active, setActive] = useState<SparkPoint | null>(null)
  return (
    <div className="glass flex min-w-0 flex-col gap-3 rounded-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-[11px] border border-amber/30 bg-amber-soft text-amber-ink">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="truncate text-[13px] font-semibold text-ink-2">
          {pulse.label}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <b className="font-head text-[clamp(28px,3.2vw,38px)] leading-none font-extrabold tracking-[-0.035em] text-ink tabular-nums">
          <AnimatedNumber value={pulse.format(pulse.value)} />
        </b>
        <Delta value={pulse.value} previous={pulse.previous} />
      </div>
      <Sparkline
        points={pulse.points}
        format={pulse.format}
        label={pulse.label}
        onActive={setActive}
      />
      <p className="text-[12.5px] text-ink-3" aria-live="polite">
        {active ? (
          <>
            <b className="font-semibold text-ink">{pulse.format(active.value)}</b>{" "}
            in {active.date}
          </>
        ) : (
          (compareLabel ?? "All time, no earlier period to compare")
        )}
      </p>
    </div>
  )
}

export default function Hero({
  start,
  end,
  pulses,
  compareLabel,
  controls,
}: {
  start: string
  end: string
  pulses: Pulse[]
  compareLabel: string | null
  controls: React.ReactNode
}) {
  return (
    <section className="qt-card glass glass-panel animate-chart-in rounded-cta px-5 py-7 sm:px-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-[7px] rounded-full border border-amber/30 bg-amber/12 px-3 py-1.5 text-[12.5px] font-bold tracking-[0.06em] text-amber-ink uppercase">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Admin analytics
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-alt px-3 py-1 text-[13px] font-semibold text-ink-2">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Live data
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(34px,5.2vw,56px)] leading-[1.06] font-extrabold tracking-[-0.035em] text-ink">
            Analytics
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
            Every metric reflects{" "}
            <b className="font-semibold text-ink">
              {formatDay(start)} → {formatDay(end)}
            </b>
            , read live from the database.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {controls}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pulses.map((p) => (
          <PulseTile key={p.label} pulse={p} compareLabel={compareLabel} />
        ))}
      </div>
    </section>
  )
}
