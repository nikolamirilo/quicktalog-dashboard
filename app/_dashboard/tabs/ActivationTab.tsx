"use client"

import { Clock, Inbox, UserX, Zap } from "lucide-react"

import { BarChart, LineChart } from "@/components/charts"
import type { AvailableChartColorsKeys } from "@/lib/utils/chartColors"

import type { TabProps } from "../types"
import {
  ChartCard,
  Delta,
  KpiCard,
  KpiInline,
  Note,
  PartsBar,
  PartsLegend,
  RankingList,
  SectionHeading,
  TabLink,
  decimal,
  number,
  pct,
} from "../ui"

// Published, built but not live, empty, never started: in the order a
// signup moves through them.
const STOP_COLORS: AvailableChartColorsKeys[] = ["amber", "violet", "magenta", "gray"]

// Did the people who signed up build a real catalogue, and where did the
// rest stop? A catalogue counts once it has content; an empty draft doesn't.
export default function ActivationTab({ view, prev, animationKey }: TabProps) {
  const { activation: act } = view
  const p = prev?.activation
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Activation"
        subtitle="Did the people who signed up build a catalogue with content, and where did the rest stop?"
      />

      <section
        key={`${animationKey}-act-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Activation rate"
          icon={Zap}
          value={pct(act.rate)}
          delta={<Delta value={act.rate} previous={p?.rate ?? null} unit="pts" />}
          hint={`${number(act.activated)} of ${number(view.signups)} built a catalogue`}
          scope="Signups in range"
        />
        <KpiCard
          label="Stalled at an empty catalogue"
          icon={Inbox}
          value={number(act.stalledEmpty)}
          delta={
            <Delta value={act.stalledEmpty} previous={p?.stalledEmpty ?? null} invert />
          }
          hint="named a catalogue, added nothing"
          scope="Signups in range"
          tone={act.stalledEmpty > 0 ? "warn" : undefined}
          action={<TabLink tab="outreach">Email them</TabLink>}
        />
        <KpiCard
          label="Never started"
          icon={UserX}
          value={number(act.neverStarted)}
          delta={
            <Delta value={act.neverStarted} previous={p?.neverStarted ?? null} invert />
          }
          hint="no catalogue at all"
          scope="Signups in range"
        />
        <KpiCard
          label="Time to first content"
          icon={Clock}
          value="—"
          pending
          hint="needs a first_content_at column on catalogues"
          scope="Signups in range"
        />
      </section>

      <section
        key={`${animationKey}-act-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Activation rate by signup month"
            subtitle="Built a catalogue with content, counted to date. A month under 30 days old is still maturing."
            scope="Signups in range"
          >
            <LineChart
              data={act.rateByCohort}
              index="date"
              categories={["Activation %", "Still maturing"]}
              colors={["amber", "gray"]}
              valueFormatter={pct}
              yAxisWidth={48}
              className="h-full min-h-60 flex-1"
            />
          </ChartCard>
        </div>
        <ChartCard
          title="Where they stop"
          subtitle={`The furthest step each of the ${number(view.signups)} reached`}
          scope="Signups in range"
        >
          <div className="space-y-4">
            <PartsBar rows={act.stops} colors={STOP_COLORS} />
            <PartsLegend rows={act.stops} colors={STOP_COLORS} />
          </div>
          <div className="mt-auto pt-4">
            <TabLink tab="outreach">Email the people with an empty catalogue</TabLink>
          </div>
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-act-split`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Built catalogues: new vs existing users"
            subtitle="Catalogues with content created in range, by whether the owner signed up in it"
            scope="In range"
          >
            <div className="mb-3 flex flex-wrap gap-3">
              <KpiInline
                label="Per new user"
                value={`${decimal(act.split.perNewUser)} · ${number(act.split.byNewUsers)}`}
              />
              <KpiInline
                label="Per existing user"
                value={`${decimal(act.split.perExistingUser)} · ${number(act.split.byExistingUsers)}`}
              />
              <KpiInline
                label="Existing users who built one"
                value={number(act.split.activeExistingCreators)}
              />
            </div>
            <BarChart
              data={act.split.overTime}
              index="date"
              categories={["By new users", "By existing users"]}
              colors={["amber", "violet"]}
              type="stacked"
              valueFormatter={number}
              yAxisWidth={40}
              className="h-56"
            />
          </ChartCard>
        </div>
        <ChartCard
          title="Top new creators"
          subtitle="Built catalogues by people who signed up in range"
          scope="Signups in range"
        >
          <RankingList rows={act.topCreators} valueLabel="Built" />
        </ChartCard>
      </section>

      <Note>
        Signup to first catalogue row can&apos;t stand in for time to value: a new
        user can save an empty draft a minute after signing up and never come
        back. Time to first content needs each catalogue to record when its
        content first arrived.
      </Note>
    </div>
  )
}
