"use client"

import { Fragment } from "react"
import { AlertTriangle } from "lucide-react"

import { LineChart } from "@/components/charts"

import type { Attention, Bucket, TabProps } from "../types"
import {
  ChartCard,
  Empty,
  LevelPill,
  SectionHeading,
  TabLink,
  number,
  pct,
} from "../ui"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

// Each step of the signup funnel against the number who signed up. The drop
// from "Started" to "Built" gets its own row: that is where most stop.
function Funnel({
  steps,
  prev,
  stalled,
}: {
  steps: Bucket[]
  prev: Bucket[] | null
  stalled: number
}) {
  const top = steps[0]?.value ?? 0
  const prevTop = prev?.[0]?.value ?? 0
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => (
        <Fragment key={s.name}>
          {i === 2 && stalled > 0 && (
            <li className="my-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-amber/35 bg-amber-soft px-3 py-2.5 text-[13.5px] font-semibold text-ink">
              <AlertTriangle className="size-4 text-amber-ink" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {number(stalled)} stopped at an empty catalogue
              </span>
              <TabLink tab="outreach">Open the list</TabLink>
            </li>
          )}
          <li className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-1 py-1.5 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_6.5rem]">
            <span className="text-[13.5px] font-semibold text-ink">{s.name}</span>
            <span className="col-span-2 row-start-2 h-3 rounded-r-[4px] bg-bg-alt sm:col-span-1 sm:row-start-auto">
              <span
                className="block h-full rounded-r-[4px] bg-series-amber"
                style={{ width: `${top ? Math.max((s.value / top) * 100, s.value ? 1 : 0) : 0}%` }}
              />
            </span>
            <span className="text-right text-[13.5px] tabular-nums">
              <b className="font-bold text-ink">{number(s.value)}</b>
              <span className="text-ink-3"> · {pct(share(s.value, top))}</span>
              {prev && prevTop > 0 && i > 0 && (
                <small className="block text-[12px] text-ink-3">
                  was {pct(share(prev[i]?.value ?? 0, prevTop))}
                </small>
              )}
            </span>
          </li>
        </Fragment>
      ))}
    </ol>
  )
}

function AttentionList({ items }: { items: Attention[] }) {
  if (items.length === 0) return <Empty label="Nothing needs a look right now." />
  return (
    <ul className="-my-1 divide-y divide-line">
      {items.map((a) => (
        <li
          key={a.title}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3"
        >
          <LevelPill level={a.level} />
          <span className="text-[13.5px] leading-snug font-semibold text-ink">
            {a.title}
          </span>
          {a.detail && (
            <span className="col-start-2 text-[12.5px] leading-snug text-ink-3">
              {a.detail}
            </span>
          )}
          <TabLink tab={a.tab} className="col-start-2 justify-self-start">
            {a.link}
          </TabLink>
        </li>
      ))}
    </ul>
  )
}

// How the period went for the people who signed up in it, and what needs a
// look across the whole product.
export default function OverviewTab({
  view,
  prev,
  animationKey,
  attention,
}: TabProps & { attention: Attention[] }) {
  const { activation } = view
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Overview"
        subtitle="How the people who signed up in this period got on, and what needs a look"
      />

      <section
        key={`${animationKey}-ov-funnel`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Signup funnel"
            subtitle={`The ${number(view.signups)} people who signed up in range, and how far each has got`}
            scope="Signups in range"
          >
            <Funnel
              steps={activation.funnel}
              prev={prev?.activation.funnel ?? null}
              stalled={activation.stalledEmpty}
            />
          </ChartCard>
        </div>
        <ChartCard title="Needs attention" subtitle="Checked on every load" scope="Right now">
          <AttentionList items={attention} />
        </ChartCard>
      </section>

      <section key={`${animationKey}-ov-trend`} className="animate-chart-in">
        <ChartCard
          title="Signups and activated users"
          subtitle="By signup period. Activated: built a catalogue with content, counted to date"
          scope="Signups in range"
        >
          <LineChart
            data={view.signupSeries}
            index="date"
            categories={["Activated", "Signups"]}
            colors={["amber", "violet"]}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-64"
          />
        </ChartCard>
      </section>
    </div>
  )
}
