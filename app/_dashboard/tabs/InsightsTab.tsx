"use client"

import { AreaChart, BarChart, Card, DonutChart, LineChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  colorsFor,
  DonutLegend,
  Empty,
  KpiCard,
  KpiInline,
  RankingList,
  SectionHeading,
  compactNumber,
  decimal,
  number,
  pct,
} from "../ui"

// Everything on this tab answers one question: what did the users who signed
// up inside the selected period actually do? Signups → catalogues → ratio →
// the traffic those catalogues earned, then the same story cut by category,
// source, language and plan.
export default function InsightsTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { insights } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="New user insights"
        subtitle="Signups in the selected period, the catalogues they created, and the traffic those catalogues earned"
      />

      {/* Headline cohort KPIs */}
      <section
        key={`${animationKey}-ins-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New users"
          value={number(insights.newUsers)}
          hint={`${number(insights.activatedUsers)} created a catalogue (${pct(insights.activationRate)})`}
        />
        <KpiCard
          label="Catalogues created"
          value={number(insights.cataloguesCreated)}
          hint={`${number(insights.publishedCatalogues)} published (${pct(insights.publishRate)})`}
        />
        <KpiCard
          label="Catalogues per user"
          value={decimal(insights.cataloguesPerUser)}
          hint="their catalogues ÷ new users · existing users excluded"
        />
        <KpiCard
          label="Total views"
          value={compactNumber(insights.totalViews)}
          hint={`${compactNumber(insights.uniqueVisitors)} unique visitors`}
        />
      </section>

      {/* Secondary cohort KPIs */}
      <section
        key={`${animationKey}-ins-kpi2`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Views per catalogue"
          value={number(insights.viewsPerCatalogue)}
          hint="average across their catalogues"
        />
        <KpiCard
          label="Views per user"
          value={number(insights.viewsPerUser)}
          hint="average across the cohort"
        />
        <KpiCard
          label="Time to first catalogue"
          value={
            insights.medianTtvDays == null
              ? "—"
              : `${insights.medianTtvDays} d`
          }
          hint="median, signup → first catalogue"
        />
        <KpiCard
          label="Converted to paid"
          value={number(insights.subscribedUsers)}
          hint={`${pct(insights.paidConversionRate)} of new users`}
        />
      </section>

      {/* Signups vs catalogues + the ratio behind them */}
      <section
        key={`${animationKey}-ins-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Signups vs catalogues created"
            subtitle="New users and the catalogues they created, per period"
          >
            <LineChart
              data={insights.overTime}
              index="date"
              categories={["New users", "New catalogues"]}
              colors={["amber", "violet"]}
              valueFormatter={number}
              yAxisWidth={44}
              className="h-full min-h-64 flex-1"
            />
          </ChartCard>
        </div>
        <ChartCard
          title="Catalogues per new user"
          subtitle="Running ratio across the period"
        >
          <AreaChart
            data={insights.ratioOverTime}
            index="date"
            categories={["Catalogues per user"]}
            colors={["amber"]}
            valueFormatter={decimal}
            showLegend={false}
            yAxisWidth={44}
            startEndOnly
            className="h-full min-h-64 flex-1"
          />
        </ChartCard>
      </section>

      {/* Breakdown of what they built */}
      <SectionHeading
        title="What they created"
        subtitle="Catalogues from the new cohort, broken down by category, source and language"
      />
      <section
        key={`${animationKey}-ins-mix`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="By category" subtitle="Business type">
          {insights.byCategory.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={insights.byCategory}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={96}
              className="h-full min-h-64 flex-1"
            />
          )}
        </ChartCard>

        <ChartCard title="By source" subtitle="How the catalogue was created">
          {insights.bySource.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={insights.bySource}
                    category="name"
                    value="value"
                    colors={colorsFor(insights.bySource, "source")}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[13px] text-ink-3">
                      Total
                    </p>
                    <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                      {number(insights.cataloguesCreated)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend data={insights.bySource} colors={colorsFor(insights.bySource, "source")} />
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="By status" subtitle="Published vs everything else">
          {insights.byStatus.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <DonutChart
                  data={insights.byStatus}
                  category="name"
                  value="value"
                  colors={colorsFor(insights.byStatus, "status")}
                  valueFormatter={number}
                  className="h-44 w-44"
                />
              </div>
              <div className="pt-4">
                <DonutLegend
                  data={insights.byStatus}
                  colors={colorsFor(insights.byStatus, "status")}
                />
              </div>
            </>
          )}
        </ChartCard>
      </section>

      {/* Where the traffic actually came from */}
      <SectionHeading
        title="Where the views land"
        subtitle="Traffic on the cohort's catalogues, attributed by catalogue"
      />
      <section
        key={`${animationKey}-ins-views`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Views by category" subtitle="Business type">
          <div className="mb-3 flex flex-wrap gap-3">
            <KpiInline
              label="Attributed"
              value={compactNumber(insights.attributedViews)}
            />
            <KpiInline
              label="Total"
              value={compactNumber(insights.totalViews)}
            />
          </div>
          {insights.viewsByCategory.length === 0 ? (
            <Empty label="No attributed views in this range." />
          ) : (
            <BarChart
              data={insights.viewsByCategory}
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

        <ChartCard title="Views by source" subtitle="Creation path of the catalogue">
          {insights.viewsBySource.length === 0 ? (
            <Empty label="No attributed views in this range." />
          ) : (
            <BarChart
              data={insights.viewsBySource}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={48}
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>

        <ChartCard title="By language" subtitle="Catalogues from the new cohort">
          {insights.byLanguage.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={insights.byLanguage}
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

      {/* Who and what stands out */}
      <section
        key={`${animationKey}-ins-top`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Top new creators" subtitle="Catalogues created in period">
          <RankingList
            rows={insights.topCreators}
            valueLabel="Catalogues"
          />
        </ChartCard>

        <ChartCard title="Top catalogues from new users" subtitle="By pageviews">
          <RankingList
            rows={insights.topCatalogues}
            valueLabel="Pageviews"
          />
        </ChartCard>

        <ChartCard title="New users by plan" subtitle="Plan at signup">
          {insights.byPlan.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={insights.byPlan}
                    category="name"
                    value="value"
                    colors={colorsFor(insights.byPlan, "plan")}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[13px] text-ink-3">
                      Users
                    </p>
                    <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                      {number(insights.newUsers)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend data={insights.byPlan} colors={colorsFor(insights.byPlan, "plan")} />
              </div>
            </>
          )}
        </ChartCard>
      </section>

      <Card>
        <p className="text-[13px] text-ink-3">
          Views are counted from analytics rows owned by users who signed up in
          this period. The category and source breakdowns only include views
          recorded against a specific catalogue, which is why they can total
          less than the headline figure.
        </p>
      </Card>
    </div>
  )
}
