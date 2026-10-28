"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Sparkles } from "lucide-react"

import AnimatedNumber from "@/components/AnimatedNumber"
import { cx } from "@/lib/utils/cx"

import Sparkline, { type SparkPoint } from "./Sparkline"
import type { SourceStatus } from "./types"
import { Delta } from "./ui"

export type Pulse = {
  label: string
  icon: LucideIcon
  value: number
  previous: number | null // null when there is no earlier figure to compare
  points: { date: string; value: number }[]
  format: (n: number) => string
  // Replaces the comparison line, e.g. "Right now" for a snapshot.
  note?: string
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`))

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
      <p className="mt-auto text-[12.5px] text-ink-3" aria-live="polite">
        {active ? (
          <>
            <b className="font-semibold text-ink">{pulse.format(active.value)}</b>{" "}
            in {active.date}
          </>
        ) : (
          (pulse.note ?? compareLabel ?? "All time, no earlier period to compare")
        )}
      </p>
    </div>
  )
}

// Where the figures come from and how fresh each source is. A stale source
// turns amber with a warning icon, never colour alone.
function SourceChip({ source }: { source: SourceStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-semibold whitespace-nowrap",
        source.state === "warn"
          ? "border-amber/40 bg-amber-soft text-amber-ink"
          : "border-line bg-bg-alt text-ink-2",
      )}
    >
      {source.state === "warn" ? (
        <AlertTriangle className="size-3.5" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className={cx(
            "size-2 rounded-full",
            source.state === "good" ? "bg-success" : "bg-ink-3/50",
          )}
        />
      )}
      {source.label}: {source.detail}
    </span>
  )
}

export default function Hero({
  start,
  end,
  analyticsUntil,
  pulses,
  compareLabel,
  sources,
  controls,
}: {
  start: string
  end: string
  analyticsUntil: string | null // set when traffic stops before `end`
  pulses: Pulse[] | null // the headline tiles, on Overview only
  compareLabel: string | null
  sources: SourceStatus[]
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
            {sources.map((s) => (
              <SourceChip key={s.label} source={s} />
            ))}
          </div>
          <h1 className="mt-4 text-[clamp(34px,5.2vw,56px)] leading-[1.06] font-extrabold tracking-[-0.035em] text-ink">
            Analytics
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
            Figures cover{" "}
            <b className="font-semibold text-ink">
              {formatDay(start)} → {formatDay(end)}
            </b>
            .
            {analyticsUntil && (
              <>
                {" "}
                Traffic stops at{" "}
                <b className="font-semibold text-ink">{formatDay(analyticsUntil)}</b>
                , the newest day with data, and is compared over the same number
                of days.
              </>
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {controls}
        </div>
      </div>

      {pulses && (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pulses.map((p) => (
            <PulseTile key={p.label} pulse={p} compareLabel={compareLabel} />
          ))}
        </div>
      )}
    </section>
  )
}
