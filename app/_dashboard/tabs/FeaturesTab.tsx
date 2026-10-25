"use client"

import { BarChart, LineChart } from "@/components/charts"

import type { DashboardView, FeatureAdoption } from "../types"
import {
  ChartCard,
  Empty,
  KpiCard,
  KpiInline,
  RankingList,
  SectionHeading,
  number,
  pct,
} from "../ui"

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_3.5rem] gap-2"

// Every tracked feature, grouped, with its share of catalogues. Bars are
// scaled to the most adopted feature so the small ones stay readable.
function AdoptionTable({ rows }: { rows: FeatureAdoption[] }) {
  const groups: { group: string; rows: FeatureAdoption[] }[] = []
  for (const r of rows) {
    const last = groups[groups.length - 1]
    if (last?.group === r.group) last.rows.push(r)
    else groups.push({ group: r.group, rows: [r] })
  }
  const max = Math.max(...rows.map((r) => r.pctCatalogues), 1)

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.group}>
          <div
            className={`${COLUMNS} mb-2 text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400`}
          >
            <span>{g.group}</span>
            <span className="text-right">Catalogues</span>
            <span className="text-right">Share</span>
            <span className="text-right">Owners</span>
          </div>
          <ul className="space-y-2.5">
            {g.rows.map((r) => (
              <li key={r.key}>
                <div className={`${COLUMNS} items-baseline text-sm`}>
                  <span className="truncate text-gray-800 dark:text-gray-200">
                    {r.label}
                  </span>
                  <span className="text-right tabular-nums text-gray-900 dark:text-gray-50">
                    {number(r.catalogues)}
                  </span>
                  <span className="text-right font-medium tabular-nums text-gray-900 dark:text-gray-50">
                    {pct(r.pctCatalogues)}
                  </span>
                  <span className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {number(r.owners)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-pink-500"
                    style={{ width: `${(r.pctCatalogues / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// Which features earn their keep.
export default function FeaturesTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { features } = view
  const { ai, themes, leads } = features
  const byKey = new Map(features.adoption.map((f) => [f.key, f]))
  const customVisual = byKey.get("customVisual")
  const customTheme = byKey.get("customTheme")

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Feature adoption"
        subtitle="Which features earn their keep? (adoption is all-time, from each catalogue's current settings; AI usage and activity follow the selected period)"
      />

      <section
        key={`${animationKey}-feat-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="AI assistant users"
          value={number(ai.users)}
          hint={`${pct(ai.userPct)} of creators · ${number(ai.turns)} turns`}
          accent="violet"
        />
        <KpiCard
          label="Custom visuals"
          value={number(customVisual?.catalogues ?? 0)}
          hint={`${pct(customVisual?.pctCatalogues ?? 0)} of catalogues · ${number(customVisual?.owners ?? 0)} owners`}
          accent="pink"
        />
        <KpiCard
          label="Tracking integrations"
          value={number(features.trackedCatalogues)}
          hint={`GA4 ${number(byKey.get("googleAnalytics")?.catalogues ?? 0)} · Meta Pixel ${number(byKey.get("metaPixel")?.catalogues ?? 0)}`}
          accent="cyan"
        />
        <KpiCard
          label="Custom themes"
          value={number(customTheme?.catalogues ?? 0)}
          hint={`${number(themes.savedThemes)} saved by ${number(themes.usersWithSavedThemes)} users`}
          accent="amber"
        />
      </section>

      <section
        key={`${animationKey}-feat-adoption`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Adoption by feature"
            subtitle={`Share of all ${number(features.totalCatalogues)} catalogues · owners are distinct users`}
          >
            <AdoptionTable rows={features.adoption} />
          </ChartCard>
        </div>

        <ChartCard title="Theme popularity" subtitle="Catalogues per theme">
          {themes.popularity.length === 0 ? (
            <Empty label="No catalogues yet." />
          ) : (
            <BarChart
              data={themes.popularity}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={96}
              className="h-full min-h-72 flex-1"
            />
          )}
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-feat-ai`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="AI & import over time"
            subtitle="Assistant turns, and catalogues created with AI or from an OCR scan"
          >
            <div className="mb-3 flex flex-wrap gap-3">
              <KpiInline label="AI turns" value={number(ai.turns)} />
              <KpiInline label="Credits spent" value={number(ai.creditsSpent)} />
              <KpiInline label="Refunded turns" value={pct(ai.refundRate)} />
            </div>
            <LineChart
              data={ai.overTime}
              index="date"
              categories={["AI turns", "AI catalogues", "OCR imports"]}
              colors={["violet", "pink", "cyan"]}
              valueFormatter={number}
              yAxisWidth={44}
              className="h-full min-h-56 flex-1"
            />
          </ChartCard>
        </div>

        <ChartCard title="Top AI users" subtitle="Credits spent in period">
          <RankingList
            rows={ai.topUsers}
            valueLabel="Credits"
            colorClass="bg-violet-500"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-feat-activity`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Feature activity over time"
            subtitle="QR codes designed, themes saved and newsletter signups on catalogues"
          >
            <LineChart
              data={features.activityOverTime}
              index="date"
              categories={["QR codes", "Saved themes", "Newsletter signups"]}
              colors={["blue", "amber", "emerald"]}
              valueFormatter={number}
              yAxisWidth={44}
              className="h-full min-h-56 flex-1"
            />
          </ChartCard>
        </div>

        <ChartCard title="Sharing & leads">
          <div className="grid grid-cols-2 gap-3">
            <KpiInline
              label="Newsletter signups"
              value={number(leads.subscribers)}
            />
            <KpiInline
              label="Newsletter catalogues"
              value={number(byKey.get("newsletter")?.catalogues ?? 0)}
            />
            <KpiInline label="QR codes" value={number(leads.qrCodes)} />
            <KpiInline
              label="Quicktalog newsletter"
              value={number(leads.marketingSignups)}
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Newsletter signups follow the selected period; the rest are
            all-time totals.
          </p>
        </ChartCard>
      </section>
    </div>
  )
}
