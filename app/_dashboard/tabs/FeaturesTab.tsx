"use client"

import {
  Palette,
  Radar,
  Shapes,
  Sparkles,
} from "lucide-react"

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
            className={`${COLUMNS} mb-2 items-baseline text-[12.5px] text-ink-3`}
          >
            <span className="text-[13px] font-bold text-ink">{g.group}</span>
            <span className="text-right">Catalogues</span>
            <span className="text-right">Share</span>
            <span className="text-right">Owners</span>
          </div>
          <ul className="space-y-2.5">
            {g.rows.map((r) => (
              <li key={r.key}>
                <div className={`${COLUMNS} items-baseline text-sm`}>
                  <span className="break-words text-ink">
                    {r.label}
                  </span>
                  <span className="text-right tabular-nums text-ink">
                    {number(r.catalogues)}
                  </span>
                  <span className="text-right font-medium tabular-nums text-ink">
                    {pct(r.pctCatalogues)}
                  </span>
                  <span className="text-right tabular-nums text-ink-3">
                    {number(r.owners)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-alt">
                  <div
                    className="h-full rounded-full bg-series-amber"
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
          icon={Sparkles}
          value={number(ai.users)}
          hint={`${pct(ai.userPct)} of creators · ${number(ai.turns)} turns`}
        />
        <KpiCard
          label="Custom visuals"
          icon={Shapes}
          value={number(customVisual?.catalogues ?? 0)}
          hint={`${pct(customVisual?.pctCatalogues ?? 0)} of catalogues · ${number(customVisual?.owners ?? 0)} owners`}
        />
        <KpiCard
          label="Tracking integrations"
          icon={Radar}
          value={number(features.trackedCatalogues)}
          hint={`GA4 ${number(byKey.get("googleAnalytics")?.catalogues ?? 0)} · Meta Pixel ${number(byKey.get("metaPixel")?.catalogues ?? 0)}`}
        />
        <KpiCard
          label="Custom themes"
          icon={Palette}
          value={number(customTheme?.catalogues ?? 0)}
          hint={`${number(themes.savedThemes)} saved by ${number(themes.usersWithSavedThemes)} users`}
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

      {/* The design system puts the AI story on a night band. */}
      <section
        key={`${animationKey}-feat-ai`}
        className="night night-band qt-card animate-chart-in rounded-cta p-5 sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-[7px] rounded-full border border-amber/30 bg-amber/12 px-3 py-1.5 text-[12.5px] font-bold tracking-[0.06em] text-amber-ink uppercase">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI assistant
            </span>
            <h2 className="mt-3 text-card-title font-bold text-ink">
              How the AI assistant is used
            </h2>
            <p className="mt-1 text-[15px] text-ink-2">
              Turns, credits and the people behind them in the selected period
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KpiInline label="AI turns" value={number(ai.turns)} />
            <KpiInline label="Credits spent" value={number(ai.creditsSpent)} />
            <KpiInline label="Refunded turns" value={pct(ai.refundRate)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="AI assistant over time"
              subtitle="Assistant turns per period"
            >
              <LineChart
                data={ai.overTime}
                index="date"
                categories={["AI turns"]}
                colors={["amber"]}
                valueFormatter={number}
                yAxisWidth={44}
                className="h-full min-h-56 flex-1"
              />
            </ChartCard>
          </div>

          <ChartCard title="Top AI users" subtitle="Credits spent in period">
            <RankingList rows={ai.topUsers} valueLabel="Credits" />
          </ChartCard>
        </div>
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
              colors={["amber", "violet", "magenta"]}
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
          <p className="mt-3 text-[13px] text-ink-3">
            Newsletter signups follow the selected period; the rest are
            all-time totals.
          </p>
        </ChartCard>
      </section>
    </div>
  )
}
