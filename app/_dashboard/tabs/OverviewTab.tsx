"use client"

import { LineChart } from "@/components/charts"

import ConversionFunnel from "../ConversionFunnel"
import type { Attention, TabProps } from "../types"
import {
  ChartCard,
  Empty,
  LevelPill,
  SectionHeading,
  TabLink,
  number,
} from "../ui"

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
            title="Conversion funnel"
            subtitle={`The ${number(view.signups)} people who signed up in range, and how far each has got`}
            scope="Signups in range"
          >
            <ConversionFunnel
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
