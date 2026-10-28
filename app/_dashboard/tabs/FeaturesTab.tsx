"use client"

import { useRef, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Layers,
  Minus,
  Radar,
  Rocket,
  Sparkles,
} from "lucide-react"

import { BarChart, Card, DonutChart, LineChart } from "@/components/charts"
import { type AvailableChartColorsKeys } from "@/lib/utils/chartColors"
import { cx } from "@/lib/utils/cx"

import {
  FEATURES,
  SECTION_TYPES,
  type FeatureGroup,
  type FeatureKey,
} from "../features"
import type {
  DashboardView,
  FeatureAdoption,
  FeatureBreakdown,
  Features,
} from "../types"
import {
  ChartCard,
  Empty,
  KpiCard,
  KpiInline,
  PartsBar,
  PartsLegend,
  RankingList,
  SERIES,
  SectionHeading,
  number,
  pct,
} from "../ui"

const round1 = (n: number) => Math.round(n * 10) / 10

// Below this many new catalogues a share swings on one or two of them, so the
// "catching on" call is not made.
const MIN_NEW_FOR_TREND = 3

// One chart per group, paired by size so the rows of the grid line up.
const GROUPS: FeatureGroup[] = [
  "Content blocks",
  "Appearance",
  "Branding",
  "Sharing & leads",
  "Integrations",
  "AI",
]

// The features of one group, most adopted first, on a scale shared by every
// group so bars compare across charts. The bar is the all-time share; the
// tick is the share among catalogues created in the period.
function GroupChart({
  group,
  rows,
  domain,
  selected,
  onSelect,
  showNew,
}: {
  group: FeatureGroup
  rows: FeatureAdoption[]
  domain: number
  selected: FeatureKey
  onSelect: (key: FeatureKey) => void
  showNew: boolean
}) {
  const sorted = [...rows].sort(
    (a, b) => b.pctCatalogues - a.pctCatalogues || a.label.localeCompare(b.label),
  )
  const at = (v: number) => `${(v / domain) * 100}%`
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-[14px] font-extrabold tracking-[-0.01em] text-ink">
        {group}
      </h3>
      <ul className="-mx-2 space-y-px">
        {sorted.map((r) => {
          const active = r.key === selected
          return (
            <li key={r.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(r.key)}
                title={`${r.label}: ${pct(r.pctCatalogues)} of all catalogues (${number(r.catalogues)})${showNew ? `, ${pct(r.newPct)} of those created in the period` : ""}`}
                className={cx(
                  "grid w-full grid-cols-[minmax(0,8.25rem)_minmax(0,1fr)_2.9rem] items-center gap-2.5 rounded-md px-2 py-[6px] text-left transition-colors focus-visible:outline-offset-[-2px]",
                  active ? "bg-amber-soft" : "hover:bg-ink/[0.035]",
                )}
              >
                <span
                  className={cx(
                    "truncate text-[13px] text-ink",
                    active ? "font-bold" : "font-medium",
                  )}
                >
                  {r.label}
                </span>
                <span className="relative h-2.5">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] bg-series-amber"
                    style={{ width: at(r.pctCatalogues) }}
                  />
                  {showNew && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -bottom-1 w-[3px] rounded-full bg-ink ring-2 ring-card"
                      style={{ left: `calc(${at(r.newPct)} - 1.5px)` }}
                    />
                  )}
                </span>
                <span className="text-right text-[12.5px] font-semibold text-ink tabular-nums">
                  {pct(r.pctCatalogues)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// A share of catalogues as a ring: the amber arc over a light track.
function ShareRing({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-[88px] flex-none">
      <svg viewBox="0 0 88 88" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={r} className="fill-none stroke-bg-alt" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r={r}
          className="fill-none stroke-series-amber transition-[stroke-dasharray] duration-500"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(value, 100) / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-head text-[19px] font-extrabold tracking-[-0.03em] text-ink">
        {pct(value)}
      </span>
    </div>
  )
}

function ChangePill({ change }: { change: number }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-bold text-ink tabular-nums"
  if (change === 0) {
    return (
      <span className={cx(base, "bg-bg-alt")}>
        <Minus className="size-3.5 text-ink-3" aria-hidden="true" />
        No change
      </span>
    )
  }
  const up = change > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cx(base, up ? "bg-success/15" : "bg-red/18")}>
      <Icon
        className={cx("size-3.5", up ? "text-success" : "text-red")}
        aria-hidden="true"
      />
      {up ? "+" : "−"}
      {Math.abs(change)} pts
    </span>
  )
}

function Breakdown({ breakdown }: { breakdown: FeatureBreakdown }) {
  const colors = breakdown.rows.map((_, i) => SERIES[i])
  return (
    <div>
      <p className="mb-2.5 text-[13px] font-bold text-ink">{breakdown.title}</p>
      {breakdown.kind === "parts" ? (
        breakdown.rows.every((r) => r.value === 0) ? (
          <p className="text-[13px] text-ink-3">Nothing set up yet.</p>
        ) : (
          <div className="space-y-3">
            <PartsBar rows={breakdown.rows} colors={colors} />
            <PartsLegend rows={breakdown.rows} colors={colors} />
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {breakdown.rows.map((r) => (
            <KpiInline key={r.name} label={r.name} value={number(r.value)} />
          ))}
        </div>
      )}
    </div>
  )
}

// The selected feature: how far it has spread, whether new catalogues pick it
// up, how it is set up, and who uses it.
function FeatureDetail({
  feature: f,
  newCatalogues,
  showNew,
}: {
  feature: FeatureAdoption
  newCatalogues: number
  showNew: boolean
}) {
  const change = round1(f.newPct - f.pctCatalogues)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <ShareRing value={f.pctCatalogues} />
        <div className="min-w-0">
          <p className="text-[12px] font-bold tracking-[0.06em] text-ink-3 uppercase">
            {f.group}
          </p>
          <h3 className="mt-0.5 text-[20px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
            {f.label}
          </h3>
          <p className="mt-1 text-[13px] text-ink-3">
            {number(f.catalogues)} catalogues · {number(f.owners)} owners
          </p>
        </div>
      </div>

      {showNew && (
        <div className="rounded-md bg-bg-alt/70 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-ink-2">
            New catalogues in this period
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-head text-[15px] font-extrabold text-ink tabular-nums">
              {number(f.newCatalogues)} of {number(newCatalogues)} ·{" "}
              {pct(f.newPct)}
            </span>
            {newCatalogues >= MIN_NEW_FOR_TREND && (
              <ChangePill change={change} />
            )}
          </div>
        </div>
      )}

      {f.breakdown && <Breakdown breakdown={f.breakdown} />}

      <div>
        <p className="mb-2.5 text-[13px] font-bold text-ink">Who uses it</p>
        <RankingList rows={f.topUsers.slice(0, 5)} valueLabel="Catalogues" />
      </div>
    </div>
  )
}

// Each type in use keeps its own slot, in SECTION_TYPES order; old keys and
// anything unrecognised fold into one neutral slice.
function SectionTypesPie({
  sectionTypes,
}: {
  sectionTypes: Features["sectionTypes"]
}) {
  const current = SECTION_TYPES.filter((t) => !t.replacedBy)
  const rowOf = new Map(sectionTypes.rows.map((r) => [r.type, r]))
  const known = new Set<string>(SECTION_TYPES.map((t) => t.type))
  const folded = sectionTypes.rows.filter(
    (r) => r.replacedBy || !known.has(r.type),
  )
  const hasUnknown = folded.some((r) => !r.replacedBy && r.sections > 0)
  const parts = [
    ...current.map((t) => ({
      name: t.label,
      value: rowOf.get(t.type)?.sections ?? 0,
    })),
    {
      name: hasUnknown ? "Old and other types" : "Old types",
      value: folded.reduce((s, r) => s + r.sections, 0),
    },
  ]
  const colors: AvailableChartColorsKeys[] = [
    ...current.map((_, i) => SERIES[i]),
    "gray",
  ]
  // Recharts skips empty slices, so the colours must line up with the
  // slices that are drawn.
  const drawn = parts
    .map((p, i) => ({ ...p, color: colors[i] }))
    .filter((p) => p.value > 0)
  const oldInUse = folded.filter((r) => r.replacedBy && r.sections > 0)

  if (sectionTypes.totalSections === 0) return <Empty label="No sections yet." />

  return (
    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
      <DonutChart
        data={drawn}
        category="name"
        value="value"
        variant="pie"
        colors={drawn.map((p) => p.color)}
        valueFormatter={number}
        className="mx-auto h-44 w-44 flex-none"
      />
      <div className="min-w-0 flex-1 space-y-3">
        <PartsLegend rows={parts} colors={colors} />
        <p className="border-t border-line pt-3 text-[12.5px] text-ink-3">
          {oldInUse.length === 0
            ? "No old section keys left."
            : `Old keys still stored: ${oldInUse
                .map((r) => `${r.label} ${number(r.sections)} (read as ${r.replacedBy})`)
                .join(" · ")}`}
        </p>
      </div>
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

  const ranked = [...features.adoption].sort(
    (a, b) => b.pctCatalogues - a.pctCatalogues,
  )
  const top = ranked[0]
  const [selectedKey, setSelectedKey] = useState<FeatureKey>(top.key)
  const selected = byKey.get(selectedKey) ?? top
  // Below `lg` the details sit under the charts, so bring them into view.
  const detailRef = useRef<HTMLDivElement>(null)
  const selectFeature = (key: FeatureKey) => {
    setSelectedKey(key)
    if (!window.matchMedia("(min-width: 64rem)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // With no new catalogues, or all of them new ("All"), there is nothing to
  // compare against the all-time share.
  const showNew =
    features.newCatalogues > 0 &&
    features.newCatalogues < features.totalCatalogues
  // The biggest gain among new catalogues over the all-time share.
  const rising =
    showNew && features.newCatalogues >= MIN_NEW_FOR_TREND
      ? features.adoption
          .map((f) => ({ f, change: round1(f.newPct - f.pctCatalogues) }))
          .filter((x) => x.change > 0)
          .sort((a, b) => b.change - a.change)[0]
      : undefined

  // One scale for every group chart, rounded up to the next ten.
  const peak = Math.max(
    ...features.adoption.flatMap((r) =>
      showNew ? [r.pctCatalogues, r.newPct] : [r.pctCatalogues],
    ),
    1,
  )
  const domain = Math.min(100, Math.ceil(peak / 10) * 10)

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Feature adoption"
        subtitle="Which features earn their keep? Adoption is from each catalogue's current settings; new catalogues, AI usage and activity follow the selected period."
      />

      <section
        key={`${animationKey}-feat-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Features per catalogue"
          icon={Layers}
          scope="All time"
          value={String(features.featuresPerCatalogue)}
          hint={`average, of ${FEATURES.length} tracked`}
        />
        <KpiCard
          label="Most adopted"
          icon={Award}
          scope="All time"
          value={top.catalogues ? pct(top.pctCatalogues) : "—"}
          hint={top.catalogues ? `${top.label} · ${number(top.catalogues)} catalogues` : "No catalogues yet"}
        />
        <KpiCard
          label="Catching on"
          icon={Rocket}
          scope="In range"
          value={rising ? `+${rising.change} pts` : "—"}
          hint={
            rising
              ? `${rising.f.label}: ${pct(rising.f.newPct)} of new vs ${pct(rising.f.pctCatalogues)} overall`
              : features.newCatalogues === 0
                ? "No catalogues created in this period"
                : showNew
                  ? "No feature is gaining among new catalogues"
                  : "Pick a shorter range to compare"
          }
        />
        <KpiCard
          label="Tracking integrations"
          icon={Radar}
          scope="All time"
          value={number(features.trackedCatalogues)}
          hint={`GA4 ${number(byKey.get("googleAnalytics")?.catalogues ?? 0)} · Meta Pixel ${number(byKey.get("metaPixel")?.catalogues ?? 0)}`}
        />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            Adoption by feature
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Share of all {number(features.totalCatalogues)} catalogues using each
            one. Pick a feature for details.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-2">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-4 rounded-r-[3px] bg-series-amber"
            />
            All catalogues
          </span>
          {showNew && (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3.5 w-[3px] rounded-full bg-ink"
              />
              {`Created in this period (${number(features.newCatalogues)})`}
            </span>
          )}
        </div>
      </div>

      <section
        key={`${animationKey}-feat-adoption`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:col-span-2">
          {GROUPS.map((group) => (
            <GroupChart
              key={group}
              group={group}
              rows={features.adoption.filter((f) => f.group === group)}
              domain={domain}
              selected={selected.key}
              onSelect={selectFeature}
              showNew={showNew}
            />
          ))}
        </div>

        <Card ref={detailRef} className="scroll-mt-24">
          <FeatureDetail
            feature={selected}
            newCatalogues={features.newCatalogues}
            showNew={showNew}
          />
        </Card>
      </section>

      <section
        key={`${animationKey}-feat-content`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="Section types"
          subtitle={`Share of all ${number(features.sectionTypes.totalSections)} sections, by type`}
        >
          <SectionTypesPie sectionTypes={features.sectionTypes} />
        </ChartCard>

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
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>
      </section>

      {/* The AI story gets its own glass panel around its cards. */}
      <section
        key={`${animationKey}-feat-ai`}
        className="qt-card glass glass-panel animate-chart-in rounded-cta p-5 sm:p-8"
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
              Turns, credits and the people behind them in the selected
              period. AI users are a share of the {number(ai.activeUsers)}{" "}
              users active in it (views, a new catalogue or an AI turn).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KpiInline label="AI turns" value={number(ai.turns)} />
            <KpiInline
              label="AI users"
              value={`${number(ai.users)} · ${pct(ai.userPct)}`}
            />
            <KpiInline label="Credits spent" value={number(ai.creditsSpent)} />
            <KpiInline label="Failed (refunded)" value={pct(ai.refundRate)} />
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
