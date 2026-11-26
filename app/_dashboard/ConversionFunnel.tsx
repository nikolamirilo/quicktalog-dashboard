"use client"

import { Fragment, useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cx } from "@/lib/utils/cx"

import type { Bucket } from "./types"
import { Empty, TabLink, number, pct } from "./ui"

// One decimal place; 0 when there is nothing to divide by.
const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

// Bar thickness in the column view, in px.
const BAR = 24

// The step where people who started a catalogue but never filled it fall out.
// Its change is flagged, and the callout under the chart links to the list.
const STALL_STEP = 2

// The "lost" part of a row in the narrow view: the series amber, hatched at
// 135° so it reads as a gap in the bar rather than a second series.
const HATCH =
  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-series-amber) 38%, transparent) 0 1.5px, transparent 1.5px 5px)"

type Step = {
  name: string
  value: number
  ofTop: number // % of the people at the first step
  height: number // bar length, % of the plot
  // Against the step before: the change in % of that step (null when it had
  // nobody), and how many fewer people got here.
  from: { name: string; change: number | null; lost: number } | null
  was: number | null // ofTop in the previous period
}

function toSteps(steps: Bucket[], prev: Bucket[] | null): Step[] {
  const top = steps[0]?.value ?? 0
  const prevTop = prev?.[0]?.value ?? 0
  return steps.map((s, i) => {
    const before = steps[i - 1]
    return {
      name: s.name,
      value: s.value,
      ofTop: share(s.value, top),
      // A step with anyone in it always shows a sliver of bar.
      height: top ? Math.max((s.value / top) * 100, s.value ? 1.5 : 0) : 0,
      from: before
        ? {
            name: before.name,
            change: before.value ? share(s.value - before.value, before.value) : null,
            lost: before.value - s.value,
          }
        : null,
      was: prev && prevTop > 0 && i > 0 ? share(prev[i]?.value ?? 0, prevTop) : null,
    }
  })
}

// The change from one step to the next, as a pill: sign and arrow, never
// colour alone. The flagged step wears the same warning as the callout.
function StepChange({ change, flagged }: { change: number | null; flagged: boolean }) {
  if (change === null) return <span className="text-[12px] text-ink-3">–</span>
  const Icon = flagged ? AlertTriangle : change > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-bold whitespace-nowrap tabular-nums",
        flagged
          ? "bg-amber-soft text-amber-ink ring-1 ring-amber/35 ring-inset"
          : "bg-bg-alt text-ink-2",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {change > 0 ? "+" : change < 0 ? "−" : ""}
      {pct(Math.abs(change))}
    </span>
  )
}

// What flows on from one bar to the next: a wash from the top of the left bar
// to the top of the right one, 2px clear of both.
function Flow({ from, to }: { from: number; to: number }) {
  return (
    <span className="block h-full px-[2px]">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block size-full overflow-visible"
      >
        <polygon
          points={`0,${100 - from} 100,${100 - to} 100,100 0,100`}
          className="fill-series-amber"
          fillOpacity={0.13}
        />
        <line
          x1="0"
          y1={100 - from}
          x2="100"
          y2={100 - to}
          className="stroke-series-amber"
          strokeOpacity={0.5}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}

function Tooltip({ step, side }: { step: Step; side: "left" | "right" }) {
  const { from } = step
  return (
    <div
      className={cx(
        "glass pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-md px-3.5 py-2.5 text-[12.5px] leading-snug [--glass-shadow:var(--shadow-hover)] [--glass-tint:var(--glass-tint-strong)]",
        side === "right" ? "left-[calc(50%+20px)]" : "right-[calc(50%+20px)]",
      )}
    >
      <p className="font-semibold text-ink-2">{step.name}</p>
      <p className="mt-1">
        <b className="text-[16px] font-extrabold text-ink tabular-nums">
          {number(step.value)}
        </b>
        <span className="text-ink-3"> · {pct(step.ofTop)} of signups</span>
      </p>
      {from && from.change !== null && (
        <p className="mt-1 text-ink-2">
          {from.lost >= 0
            ? `${number(from.lost)} dropped off after “${from.name}”`
            : `${number(-from.lost)} more than “${from.name}”`}
        </p>
      )}
      {step.was !== null && (
        <p className="mt-0.5 text-ink-3">Previous period: {pct(step.was)}</p>
      )}
    </div>
  )
}

// From sm up: a column per step, left to right, with the flow between them
// narrowing as people drop off. Counts sit over the bars, the change from the
// step before sits over each gap.
function Columns({
  steps,
  flagged,
}: {
  steps: Step[]
  flagged: (i: number) => boolean
}) {
  const [active, setActive] = useState<number | null>(null)
  const n = steps.length
  const slots = `repeat(${n}, minmax(0, 1fr))`
  // Half a gap, then bar, gap, bar, ..., bar, half a gap: each bar lands on
  // the centre of its slot, and each gap holds the flow to the next bar.
  const flow = [
    "0.5fr",
    ...steps.flatMap((_, i) => (i < n - 1 ? [`${BAR}px`, "1fr"] : [`${BAR}px`])),
    "0.5fr",
  ].join(" ")
  // The same centres for what sits over the gaps.
  const gaps = `0.5fr repeat(${n - 1}, minmax(0, 1fr)) 0.5fr`
  const dim = (i: number) => active !== null && active !== i && "opacity-45"

  return (
    <div aria-hidden="true" className="hidden sm:block">
      <div className="grid items-start" style={{ gridTemplateColumns: slots }}>
        {steps.map((s, i) => (
          <div key={s.name} className={cx("px-1 text-center transition-opacity", dim(i))}>
            <b className="block font-head text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-ink tabular-nums">
              {number(s.value)}
            </b>
            <span className="block text-[12.5px] text-ink-3 tabular-nums">
              {pct(s.ofTop)}
            </span>
            {s.was !== null && (
              <span className="block text-[11.5px] text-ink-3 tabular-nums">
                was {pct(s.was)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid" style={{ gridTemplateColumns: gaps }}>
        <span />
        {steps.slice(1).map((s, i) => (
          <span key={s.name} className="flex justify-center">
            <StepChange change={s.from?.change ?? null} flagged={flagged(i + 1)} />
          </span>
        ))}
        <span />
      </div>

      <div className="relative mt-2.5 h-44">
        <span className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: flow }}>
          <span />
          {steps.map((s, i) => (
            <Fragment key={s.name}>
              <span />
              {i < n - 1 && <Flow from={s.height} to={steps[i + 1].height} />}
            </Fragment>
          ))}
          <span />
        </div>
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: slots }}
          onMouseLeave={() => setActive(null)}
        >
          {steps.map((s, i) => (
            <div
              key={s.name}
              className="relative flex items-end justify-center"
              onMouseEnter={() => setActive(i)}
            >
              <span
                className={cx(
                  "block rounded-t-[4px] bg-series-amber transition-opacity",
                  dim(i),
                )}
                style={{ width: BAR, height: `${s.height}%` }}
              />
              {active === i && (
                <Tooltip step={s} side={i < n / 2 ? "right" : "left"} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 grid items-start" style={{ gridTemplateColumns: slots }}>
        {steps.map((s, i) => (
          <span
            key={s.name}
            className={cx(
              "px-1 text-center text-[12.5px] leading-snug font-semibold text-ink-2 transition-opacity",
              dim(i),
            )}
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// Below sm: a row per step, top to bottom. The hatched end of each bar is
// who was at the step before and didn't get here.
function Rows({
  steps,
  flagged,
}: {
  steps: Step[]
  flagged: (i: number) => boolean
}) {
  return (
    <ol aria-hidden="true" className="space-y-3.5 sm:hidden">
      {steps.map((s, i) => {
        const lost = i > 0 ? Math.max(steps[i - 1].height - s.height, 0) : 0
        return (
          <li key={s.name}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-semibold text-ink">
                {s.name}
              </span>
              {s.from && (
                <StepChange change={s.from.change} flagged={flagged(i)} />
              )}
              <span className="text-right text-[13.5px] whitespace-nowrap tabular-nums">
                <b className="font-bold text-ink">{number(s.value)}</b>
                <span className="text-ink-3"> · {pct(s.ofTop)}</span>
              </span>
            </div>
            <div className="mt-1.5 flex h-3 rounded-r-[4px] bg-bg-alt">
              <span
                className="block h-full rounded-r-[4px] bg-series-amber"
                style={{ width: `${s.height}%` }}
              />
              {lost > 0 && (
                <span
                  className="ml-[2px] block h-full rounded-r-[4px]"
                  style={{ width: `${lost}%`, backgroundImage: HATCH }}
                />
              )}
            </div>
            {s.was !== null && (
              <small className="mt-1 block text-right text-[12px] text-ink-3">
                was {pct(s.was)}
              </small>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// The figures the two views draw, for screen readers. Hidden by a wrapper,
// not on the table itself: a table's caption sits outside the table's box, so
// Safari leaves it showing when the table is clipped.
function FunnelTable({ steps }: { steps: Step[] }) {
  return (
    <div className="sr-only">
      <table>
        <caption>Conversion funnel</caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">People</th>
            <th scope="col">Share of signups</th>
            <th scope="col">Change from the step before</th>
            <th scope="col">Share of signups, previous period</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.name}>
              <th scope="row">{s.name}</th>
              <td>{number(s.value)}</td>
              <td>{pct(s.ofTop)}</td>
              <td>
                {s.from?.change == null
                  ? "–"
                  : `${s.from.change > 0 ? "+" : ""}${pct(s.from.change)}`}
              </td>
              <td>{s.was === null ? "–" : pct(s.was)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// How far the people who signed up got, step by step, and where they dropped
// off. The stall between "Started" and "Built" gets its own callout: that is
// where most stop, and the outreach list is who to write to.
export default function ConversionFunnel({
  steps: buckets,
  prev,
  stalled,
}: {
  steps: Bucket[]
  prev: Bucket[] | null
  stalled: number
}) {
  if (!buckets[0]?.value) return <Empty label="No signups in this range." />
  const steps = toSteps(buckets, prev)
  const flagged = (i: number) => i === STALL_STEP && stalled > 0

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Columns steps={steps} flagged={flagged} />
      <Rows steps={steps} flagged={flagged} />
      <FunnelTable steps={steps} />

      <p className="text-[12px] leading-snug text-ink-3">
        Under each count: its share of everyone who signed up. Between steps: the
        change from the step before.
      </p>

      {stalled > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-amber/35 bg-amber-soft px-3 py-2.5 text-[13.5px] font-semibold text-ink">
          <AlertTriangle className="size-4 text-amber-ink" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {number(stalled)} stopped at an empty catalogue
          </span>
          <TabLink tab="outreach">Open the list</TabLink>
        </div>
      )}
    </div>
  )
}
