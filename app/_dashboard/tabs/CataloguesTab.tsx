"use client"

import {
  BookPlus,
  Globe,
  Hourglass,
  LayoutList,
} from "lucide-react"

import { BarChart, DonutChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  colorsFor,
  DonutLegend,
  Empty,
  KpiCard,
  RankingList,
  SectionHeading,
  number,
  pct,
} from "../ui"

// The catalogue itself: how it was made, what shape it is in, and whether it
// is still being maintained.
export default function CataloguesTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const {
    totals,
    catalogues,
    content,
    freshness,
    engagement,
    topCataloguesByPageviews,
  } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Catalogues"
        subtitle="Composition, content depth and freshness of the catalogues in this period"
      />

      <section
        key={`${animationKey}-cat-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New catalogues"
          icon={BookPlus}
          value={number(totals.catalogues)}
          hint="created in the selected period"
        />
        <KpiCard
          label="Published (all time)"
          icon={Globe}
          value={number(engagement.publishedCatalogues)}
          hint={`${number(engagement.cataloguesWithTraffic)} received traffic`}
        />
        <KpiCard
          label="Avg content"
          icon={LayoutList}
          value={`${content.avgSections} / ${content.avgItems}`}
          hint="sections / items per catalogue"
        />
        <KpiCard
          label="Stale catalogues"
          icon={Hourglass}
          value={pct(freshness.pctStale)}
          hint="published, untouched for >90 days"
        />
      </section>

      <section
        key={`${animationKey}-dist`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="Catalogues by status">
          {catalogues.byStatus.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={catalogues.byStatus}
                    category="name"
                    value="value"
                    colors={colorsFor(catalogues.byStatus, "status")}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[13px] text-ink-3">
                      Total
                    </p>
                    <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                      {number(totals.catalogues)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend
                  data={catalogues.byStatus}
                  colors={colorsFor(catalogues.byStatus, "status")}
                />
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Catalogues by language">
          {catalogues.byLanguage.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={catalogues.byLanguage}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={56}
              className="h-full min-h-64 flex-1"
            />
          )}
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-cat-quality`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Content completeness"
          subtitle={`% of new catalogues · avg ${content.avgSections} sections, ${content.avgItems} items`}
        >
          <BarChart
            data={content.completeness}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            layout="vertical"
            showLegend={false}
            valueFormatter={pct}
            yAxisWidth={88}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>

        <ChartCard
          title="Catalogue freshness"
          subtitle={`${pct(freshness.pctEdited)} edited after creation${
            freshness.medianDaysSinceEdit != null
              ? ` · median ${freshness.medianDaysSinceEdit}d since edit`
              : ""
          }`}
        >
          <BarChart
            data={freshness.recencyBuckets}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>

        <ChartCard title="Catalogues by business type">
          {catalogues.byBusinessType.length === 0 ? (
            <Empty />
          ) : (
            <RankingList
              rows={catalogues.byBusinessType.map((b) => ({
                id: b.name,
                name: b.name,
                value: b.value,
              }))}
              valueLabel="Catalogues"
            />
          )}
        </ChartCard>
      </section>

      <section key={`${animationKey}-cat-top`} className="animate-chart-in">
        <ChartCard
          title="Top catalogues by pageviews"
          subtitle="Across all catalogues receiving traffic in the selected period"
        >
          <RankingList
            rows={topCataloguesByPageviews}
            valueLabel="Pageviews"
          />
        </ChartCard>
      </section>
    </div>
  )
}
