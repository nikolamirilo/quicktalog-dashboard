"use client"

import { useState } from "react"
import {
  Palette,
  Radar,
  Shapes,
  Sparkles,
} from "lucide-react"

import { BarChart, Card, DonutChart, LineChart } from "@/components/charts"
import { cx } from "@/lib/utils/cx"

import type {
  DashboardView,
  FeatureAdoption,
  SectionTypeUsage,
  Spotlight,
  SpotlightKey,
} from "../types"
import {
  ChartCard,
  DonutLegend,
  Empty,
  KpiCard,
  KpiInline,
  RankingList,
  SERIES,
  SectionHeading,
  number,
  pct,
  toRanking,
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

// One feature at a time: how far it has spread, whether new catalogues pick
// it up, how it is set up, and the people using it.
function FeatureSpotlight({ spotlights }: { spotlights: Spotlight[] }) {
  const [key, setKey] = useState<SpotlightKey>(spotlights[0].key)
  const s = spotlights.find((x) => x.key === key) ?? spotlights[0]

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            Feature spotlight
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            How far a feature has spread, whether new catalogues pick it up,
            and who uses it
          </p>
        </div>
        <div
          role="group"
          aria-label="Feature"
          className="flex flex-wrap gap-1.5"
        >
          {spotlights.map((x) => (
            <button
              key={x.key}
              type="button"
              aria-pressed={x.key === s.key}
              onClick={() => setKey(x.key)}
              className={cx(
                "inline-flex h-9 items-center rounded-full border px-3.5 text-[13.5px] whitespace-nowrap transition-colors",
                x.key === s.key
                  ? "border-amber/55 bg-amber-soft font-bold text-ink"
                  : "border-line font-semibold text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-2 content-start gap-3">
          <KpiInline label="Catalogues" value={number(s.catalogues)} />
          <KpiInline label="Share of all" value={pct(s.pctCatalogues)} />
          <KpiInline label="Owners" value={number(s.owners)} />
          <KpiInline
            label="New in period"
            value={`${number(s.newCatalogues)} · ${pct(s.newPct)}`}
          />
          <p className="col-span-2 text-[13px] text-ink-3">
            All-time, from each catalogue&apos;s current settings. New in
            period counts the catalogues created in the selected range that use
            it now, and their share of that range.
          </p>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-bold text-ink">
            {s.breakdownTitle}
          </p>
          <RankingList
            rows={toRanking(s.breakdown)}
            valueLabel={s.breakdownUnit}
          />
        </div>
        <div>
          <p className="mb-3 text-[13px] font-bold text-ink">Who uses it</p>
          <RankingList rows={s.topUsers} valueLabel="Catalogues" />
        </div>
      </div>
    </Card>
  )
}

const SECTION_COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_4.5rem] gap-2"

function SectionTypeRows({
  title,
  rows,
  max,
}: {
  title: string
  rows: SectionTypeUsage[]
  max: number
}) {
  return (
    <div>
      <div
        className={`${SECTION_COLUMNS} mb-2 items-baseline text-[12.5px] text-ink-3`}
      >
        <span className="text-[13px] font-bold text-ink">{title}</span>
        <span className="text-right">Sections</span>
        <span className="text-right">Share</span>
        <span className="text-right">Catalogues</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.type}>
            <div className={`${SECTION_COLUMNS} items-baseline text-sm`}>
              <span className="break-words text-ink">
                {r.label}
                {r.replacedBy && (
                  <span className="block text-[12.5px] text-ink-3">
                    now read as {r.replacedBy}
                  </span>
                )}
              </span>
              <span className="text-right tabular-nums text-ink">
                {number(r.sections)}
              </span>
              <span className="text-right font-medium tabular-nums text-ink">
                {pct(r.pctSections)}
              </span>
              <span className="text-right tabular-nums text-ink-3">
                {number(r.catalogues)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-alt">
              <div
                className="h-full rounded-full bg-series-amber"
                style={{ width: `${(r.pctSections / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
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

  const { sectionTypes } = features
  const currentTypes = sectionTypes.rows.filter((r) => !r.replacedBy)
  const oldTypes = sectionTypes.rows.filter((r) => r.replacedBy)
  const maxSectionPct = Math.max(...sectionTypes.rows.map((r) => r.pctSections), 1)
  // Each type in use gets a slice; the old keys share one, in neutral grey.
  const oldSections = oldTypes.reduce((s, r) => s + r.sections, 0)
  const sectionShare = [
    ...currentTypes
      .filter((r) => r.sections > 0)
      .map((r) => ({ name: r.label, value: r.sections })),
    ...(oldSections > 0 ? [{ name: "Old types", value: oldSections }] : []),
  ]
  const sectionColors = sectionShare.map((r, i) =>
    r.name === "Old types" ? "gray" : SERIES[i % SERIES.length],
  )

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

      <section key={`${animationKey}-feat-spotlight`} className="animate-chart-in">
        <FeatureSpotlight spotlights={features.spotlights} />
      </section>

      <section
        key={`${animationKey}-feat-sections`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Section types"
            subtitle={`How often each type is used across all ${number(sectionTypes.totalSections)} sections · old types were saved before a rename or merge`}
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
              <SectionTypeRows
                title="In use"
                rows={currentTypes}
                max={maxSectionPct}
              />
              <SectionTypeRows
                title="Old types"
                rows={oldTypes}
                max={maxSectionPct}
              />
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Share of sections" subtitle="By type, old types together">
          {sectionShare.length === 0 ? (
            <Empty label="No sections yet." />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={sectionShare}
                    category="name"
                    value="value"
                    colors={sectionColors}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[13px] text-ink-3">Sections</p>
                    <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                      {number(sectionTypes.totalSections)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend
                  data={sectionShare}
                  colors={sectionColors}
                  columns={1}
                />
              </div>
            </>
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
              title="AI usage over time"
              subtitle="Turns, credits spent and the people using it, per period"
            >
              <LineChart
                data={ai.overTime}
                index="date"
                categories={["AI turns", "Credits spent", "AI users"]}
                colors={["amber", "violet", "magenta"]}
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
