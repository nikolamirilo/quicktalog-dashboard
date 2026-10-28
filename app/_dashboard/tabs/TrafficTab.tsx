"use client"

import { BookOpen, Eye, EyeOff, Users } from "lucide-react"

import { AreaChart, BarChart } from "@/components/charts"

import type { TabProps } from "../types"
import {
  ChartCard,
  Delta,
  Empty,
  KpiCard,
  KpiInline,
  Note,
  RankingList,
  SectionHeading,
  compactNumber,
  number,
  pct,
} from "../ui"

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })

// Views on the catalogues: how many, where they land, and which published
// catalogues get none.
export default function TrafficTab({ view, prev, animationKey }: TabProps) {
  const { traffic: t } = view
  const p = prev?.traffic
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Traffic"
        subtitle="Views on the catalogues, which ones are live, and which get nothing"
      />

      {view.analyticsClamped && (
        <Note tone="amber">
          Analytics data stops at {shortDay(view.analyticsUntil)}. Traffic covers
          the range up to that day, and the comparison uses the same number of
          days from the previous period.
        </Note>
      )}

      <section
        key={`${animationKey}-tr-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Pageviews"
          icon={Eye}
          value={t.pageviews >= 10000 ? compactNumber(t.pageviews) : number(t.pageviews)}
          delta={<Delta value={t.pageviews} previous={p?.pageviews ?? null} />}
          hint={p ? `was ${number(p.pageviews)}` : undefined}
          scope="In range"
        />
        <KpiCard
          label="Visitor-days"
          icon={Users}
          value={number(t.visitorDays)}
          delta={<Delta value={t.visitorDays} previous={p?.visitorDays ?? null} />}
          hint="daily visitors summed; a return visit counts again"
          scope="In range"
        />
        <KpiCard
          label="Catalogues with views"
          icon={BookOpen}
          value={number(t.cataloguesWithViews)}
          delta={
            <Delta
              value={t.cataloguesWithViews}
              previous={p?.cataloguesWithViews ?? null}
            />
          }
          hint={`${number(t.ownersWithViews)} owners`}
          scope="In range"
        />
        <KpiCard
          label="Published, no views"
          icon={EyeOff}
          value={pct(t.deadPct)}
          delta={<Delta value={t.deadPct} previous={p?.deadPct ?? null} unit="pts" invert />}
          hint={`${number(t.dead)} of ${number(t.eligible)} live for a week or more`}
          scope="In range"
        />
      </section>

      <section
        key={`${animationKey}-tr-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="Pageviews and visitor-days"
          subtitle="Per period. Periods after the newest data are left blank."
          scope="In range"
        >
          <AreaChart
            data={t.series}
            index="date"
            categories={["Pageviews", "Visitor-days"]}
            colors={["amber", "violet"]}
            valueFormatter={number}
            yAxisWidth={52}
            startEndOnly
            className="h-60"
          />
        </ChartCard>
        <ChartCard
          title="Catalogues with views"
          subtitle="Catalogues that got at least one view, per period"
          scope="In range"
        >
          <AreaChart
            data={t.activeOverTime}
            index="date"
            categories={["Catalogues with views"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={44}
            startEndOnly
            className="h-60"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-tr-dist`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Views per published catalogue"
          subtitle="Published with content, live for a week or more"
          scope="In range"
        >
          <BarChart
            data={t.viewsBuckets}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
        <ChartCard title="Concentration" subtitle="How evenly the views spread" scope="In range">
          <div className="grid grid-cols-2 gap-3">
            <KpiInline label="Top 10% of catalogues" value={`${pct(t.paretoTopShare)} of views`} />
            <KpiInline label="Median published catalogue" value={`${number(t.medianViews)} views`} />
            <KpiInline label="Owners with views" value={number(t.ownersWithViews)} />
            <KpiInline label="Views not tied to a catalogue" value={number(t.unattributed)} />
          </div>
        </ChartCard>
        <ChartCard title="Views by category" subtitle="Business type of the catalogue" scope="In range">
          {t.viewsByCategory.length === 0 ? (
            <Empty label="No views in this range." />
          ) : (
            <BarChart
              data={t.viewsByCategory}
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
      </section>

      <section
        key={`${animationKey}-tr-top`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Top catalogues" subtitle="By pageviews" scope="In range">
          <RankingList rows={t.top} valueLabel="Pageviews" />
        </ChartCard>
        <ChartCard
          title="Top catalogues from new users"
          subtitle="Owners who signed up in range"
          scope="Signups in range"
        >
          <RankingList rows={t.topFromNewUsers} valueLabel="Pageviews" />
        </ChartCard>
        <ChartCard title="Views by language" subtitle="Language of the catalogue" scope="In range">
          {t.viewsByLanguage.length === 0 ? (
            <Empty label="No views in this range." />
          ) : (
            <BarChart
              data={t.viewsByLanguage}
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
    </div>
  )
}
