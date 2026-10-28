"use client"

import { BookPlus, CalendarDays, Tag, UserPlus } from "lucide-react"

import { AreaChart, BarChart } from "@/components/charts"

import type { CohortRow, TabProps } from "../types"
import {
  BarValue,
  ChartCard,
  type Column,
  DataTable,
  Delta,
  Empty,
  KpiCard,
  Note,
  Num,
  SectionHeading,
  decimal,
  number,
  pct,
} from "../ui"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

// Each month's signups and how far they have got. Built is the share that
// counts: it is the activation rate of that month.
const COHORT_COLUMNS: Column<CohortRow>[] = [
  {
    key: "cohort",
    header: "Signed up",
    className: "w-[22%]",
    cell: (c) => <span className="font-semibold text-ink">{c.cohort}</span>,
  },
  { key: "signups", header: "People", align: "right", cell: (c) => <Num value={c.signups} /> },
  {
    key: "started",
    header: "Started",
    align: "right",
    cell: (c) => (
      <span>
        <Num value={c.started} />
        <span className="ml-1.5 text-[12px] font-normal text-ink-3">
          {pct(share(c.started, c.signups))}
        </span>
      </span>
    ),
  },
  { key: "built", header: "Built", align: "right", cell: (c) => <Num value={c.built} /> },
  {
    key: "rate",
    header: "Activation",
    align: "right",
    className: "w-[32%]",
    cell: (c) =>
      c.signups ? (
        <BarValue value={share(c.built, c.signups)} label={pct(share(c.built, c.signups))} />
      ) : (
        <span className="text-ink-3">—</span>
      ),
  },
  { key: "paying", header: "Ever paid", align: "right", cell: (c) => <Num value={c.paying} /> },
]

// Who signed up, when, and from where.
export default function AcquisitionTab({ view, prev, animationKey }: TabProps) {
  const { acquisition: acq } = view
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Acquisition"
        subtitle="Who signed up in this period, when, and from where"
      />

      <section
        key={`${animationKey}-acq-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New signups"
          icon={UserPlus}
          value={number(view.signups)}
          delta={<Delta value={view.signups} previous={prev?.signups ?? null} />}
          hint={prev ? `was ${number(prev.signups)}` : undefined}
          scope="In range"
        />
        <KpiCard
          label="Signups per week"
          icon={CalendarDays}
          value={decimal(acq.weeklyAvg)}
          delta={
            <Delta
              value={acq.weeklyAvg}
              previous={prev?.acquisition.weeklyAvg ?? null}
            />
          }
          hint={prev ? `was ${decimal(prev.acquisition.weeklyAvg)}` : undefined}
          scope="In range"
        />
        <KpiCard
          label="Started a catalogue"
          icon={BookPlus}
          value={pct(acq.startedPct)}
          delta={
            <Delta
              value={acq.startedPct}
              previous={prev?.acquisition.startedPct ?? null}
              unit="pts"
            />
          }
          hint="of signups, empty ones included"
          scope="Signups in range"
        />
        <KpiCard
          label="Source recorded"
          icon={Tag}
          value={number(acq.sourceRecorded)}
          hint={`of ${number(acq.totalUsers)} users; the question is new`}
          scope="All time"
        />
      </section>

      <section
        key={`${animationKey}-acq-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="New signups" subtitle="Per period" scope="In range">
          <BarChart
            data={view.signupSeries}
            index="date"
            categories={["Signups"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-56"
          />
        </ChartCard>
        <ChartCard
          title="Users"
          subtitle="Running total from the start of the range"
          scope="In range"
        >
          <AreaChart
            data={view.cumulativeUsers}
            index="date"
            categories={["Users"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={48}
            startEndOnly
            className="h-56"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-acq-mix`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Where signups come from"
          subtitle="From the signup question"
          scope="Signups in range"
        >
          {acq.sources.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={acq.sources}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={104}
              className="h-full min-h-48 flex-1"
            />
          )}
          <div className="pt-3">
            <Note>
              Users who signed up before the question existed show as “Not
              recorded”, so read this for recent periods.
            </Note>
          </div>
        </ChartCard>
        <ChartCard
          title="Business type"
          subtitle="Of catalogues started in range, empty ones included"
          scope="In range"
        >
          {acq.byBusinessType.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={acq.byBusinessType}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={96}
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>
        <ChartCard
          title="Language"
          subtitle="Of catalogues started in range"
          scope="In range"
        >
          {acq.byLanguage.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={acq.byLanguage}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={56}
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>
      </section>

      <section key={`${animationKey}-acq-cohorts`} className="animate-chart-in">
        <ChartCard
          title="Signup cohorts"
          subtitle="Where each month's signups are today"
          scope="Signups in range"
        >
          {acq.cohorts.length === 0 ? (
            <Empty />
          ) : (
            <DataTable
              columns={COHORT_COLUMNS}
              rows={acq.cohorts}
              rowKey={(c) => c.cohort}
              foot={[
                acq.cohorts.reduce(
                  (t, c) => ({
                    ...t,
                    signups: t.signups + c.signups,
                    started: t.started + c.started,
                    built: t.built + c.built,
                    paying: t.paying + c.paying,
                  }),
                  { cohort: "Range total", signups: 0, started: 0, built: 0, paying: 0 },
                ),
              ]}
              minWidth={560}
            />
          )}
        </ChartCard>
      </section>
    </div>
  )
}
