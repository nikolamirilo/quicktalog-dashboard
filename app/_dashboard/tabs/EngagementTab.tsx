"use client"

import {
  EyeOff,
  Ghost,
  Timer,
  Zap,
} from "lucide-react"

import { AreaChart, BarChart, Card, LineChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  KpiCard,
  RankingList,
  SectionHeading,
  hours,
  number,
  pct,
  toRanking,
} from "../ui"

// Are signups reaching value, and are the catalogues they publish alive?
export default function EngagementTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { activation, creators, engagement, topUsersByCatalogues } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Activation & engagement"
        subtitle="Are signups reaching value, and are catalogues alive?"
      />

      <section
        key={`${animationKey}-act-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Activation rate"
          icon={Zap}
          value={pct(activation.activationRate)}
          hint="new users who created a catalogue"
        />
        <KpiCard
          label="Time to first catalogue"
          icon={Timer}
          value={
            activation.medianTtvHours == null ? "—" : hours(activation.medianTtvHours)
          }
          hint="median, signup → first catalogue"
        />
        <KpiCard
          label="Ghost users"
          icon={Ghost}
          value={number(creators.ghostUsers)}
          hint={`${pct(creators.ghostPct)} of all users · 0 catalogues`}
        />
        <KpiCard
          label="Dead catalogues"
          icon={EyeOff}
          value={pct(engagement.deadPct)}
          hint="published, 0 views this period"
        />
      </section>

      <section
        key={`${animationKey}-act-funnel`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="Activation funnel">
          <RankingList
            rows={toRanking(activation.funnel)}
            valueLabel="Users"
          />
          <p className="mt-4 text-[13px] text-ink-3">
            {pct(activation.publishRate)} of new catalogues are published ·{" "}
            {pct(activation.visitorRate)} of publishers got a visitor
          </p>
        </ChartCard>
        <ChartCard title="Activation rate by signup cohort">
          <LineChart
            data={activation.rateByCohort}
            index="date"
            categories={["Activation %"]}
            colors={["amber"]}
            valueFormatter={pct}
            showLegend={false}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-act-dist`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Catalogues per user">
          <BarChart
            data={creators.distribution}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
        <ChartCard title="Views per published catalogue">
          <BarChart
            data={engagement.viewsBuckets}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
        <ChartCard title="Top creators" subtitle="By catalogue count in period">
          <RankingList
            rows={topUsersByCatalogues}
            valueLabel="Catalogues"
          />
        </ChartCard>
      </section>

      <div key={`${animationKey}-act-active`} className="animate-chart-in">
        <Card>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
                Active catalogues over time
              </h3>
              <p className="text-[13px] text-ink-3">
                Catalogues receiving ≥1 view per period
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-full bg-amber-soft px-3 text-[13px] font-bold text-amber-ink">
              Top 10% = {pct(engagement.paretoTopShare)} of views ·{" "}
              {engagement.repeatRatio}× views/visitor
            </span>
          </div>
          <AreaChart
            data={engagement.activeOverTime}
            index="date"
            categories={["Active catalogues"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={44}
            startEndOnly
            className="h-56"
          />
        </Card>
      </div>
    </div>
  )
}
