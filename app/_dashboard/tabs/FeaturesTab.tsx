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

import { Card, DonutChart, LineChart } from "@/components/charts"
import { type AvailableChartColorsKeys } from "@/lib/utils/chartColors"
import { cx } from "@/lib/utils/cx"

import {
  FEATURES,
  SECTION_TYPES,
  type FeatureGroup,
  type FeatureKey,
} from "../features"
import type {
  Bucket,
  DashboardView,
  FeatureAdoption,
  FeatureBreakdown,
  Features,
} from "../types"
import {
  BarValue,
  ChartCard,
  type Column,
  DataTable,
  Delta,
  Empty,
  KpiCard,
  KpiInline,
  Num,
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

// The groups in the order the adoption table lists them.
const GROUPS: FeatureGroup[] = [
  "Content blocks",
  "Appearance",
  "Branding",
  "Sharing & leads",
  "Integrations",
  "AI",
]

// Above this many themes the rest fold into one neutral slice, so every
// colour in the donut stays tellable apart.
const MAX_THEME_SLICES = 5

// A donut with its total in the middle and a legend beside it. Zero rows
// are left to the caller to drop or explain.
function DonutWithLegend({
  rows,
  colors,
  total,
  unit,
  detail,
  footnote,
}: {
  rows: Bucket[]
  colors: AvailableChartColorsKeys[]
  total: number
  unit: string
  detail?: (i: number) => string
  footnote?: React.ReactNode
}) {
  // Recharts skips empty slices, so the colours must line up with the
  // slices that are drawn.
  const drawn = rows
    .map((r, i) => ({ ...r, color: colors[i] }))
    .filter((r) => r.value > 0)
  return (
    <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-44 flex-none">
        <DonutChart
          data={drawn}
          category="name"
          value="value"
          colors={drawn.map((d) => d.color)}
          valueFormatter={number}
          className="size-44"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-head text-[26px] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
            {number(total)}
          </span>
          <span className="mt-1 text-[12.5px] text-ink-3">{unit}</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3">
        <PartsLegend rows={rows} colors={colors} detail={detail} />
        {footnote}
      </div>
    </div>
  )
}

// Every feature in use, grouped, with its share of built catalogues. The
// ones nobody uses yet fold into a single line instead of rows of zeros.
function AdoptionTable({
  adoption,
  selected,
  onSelect,
  showNew,
  showTrend,
}: {
  adoption: FeatureAdoption[]
  selected: FeatureKey
  onSelect: (key: FeatureKey) => void
  showNew: boolean
  showTrend: boolean
}) {
  const used = adoption
    .filter((f) => f.catalogues > 0)
    .sort(
      (a, b) =>
        GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) ||
        b.pctCatalogues - a.pctCatalogues,
    )
  const unused = adoption.filter((f) => f.catalogues === 0)
  const columns: Column<FeatureAdoption>[] = [
    {
      key: "feature",
      header: "Feature",
      cell: (f) => (
        <button
          type="button"
          aria-pressed={f.key === selected}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(f.key)
          }}
          className="text-left font-semibold whitespace-nowrap text-ink decoration-amber decoration-2 underline-offset-4 hover:underline"
        >
          {f.label}
        </button>
      ),
    },
    {
      key: "catalogues",
      header: "Catalogues",
      align: "right",
      cell: (f) => <Num value={f.catalogues} />,
    },
    {
      key: "share",
      header: "Share",
      align: "right",
      className: "w-[34%]",
      cell: (f) => <BarValue value={f.pctCatalogues} label={pct(f.pctCatalogues)} />,
    },
    ...(showNew
      ? [
          {
            key: "new",
            header: "New in range",
            align: "right",
            cell: (f) => (
              <span className="inline-flex items-center justify-end gap-2">
                <span className="text-ink-2">{pct(f.newPct)}</span>
                {showTrend && (
                  <Delta value={f.newPct} previous={f.pctCatalogues} unit="pts" />
                )}
              </span>
            ),
          } satisfies Column<FeatureAdoption>,
        ]
      : []),
    {
      key: "owners",
      header: "Owners",
      align: "right",
      cell: (f) => <Num value={f.owners} />,
    },
  ]
  return (
    <>
      {used.length === 0 ? (
        <Empty label="No built catalogues use a tracked feature yet." />
      ) : (
        <DataTable
          columns={columns}
          rows={used}
          rowKey={(f) => f.key}
          groupOf={(f) => f.group}
          onRowClick={(f) => onSelect(f.key)}
          isSelected={(f) => f.key === selected}
          minWidth={showNew ? 600 : 480}
        />
      )}
      {unused.length > 0 && (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
          <span className="font-semibold text-ink-2">
            Not used by any built catalogue yet:
          </span>{" "}
          {unused.map((f) => f.label).join(", ")}.
        </p>
      )}
    </>
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
      <span className="absolute inset-0 grid place-items-center font-head text-[16px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">
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
            {number(f.catalogues)} built catalogues · {number(f.owners)} owners
          </p>
        </div>
      </div>

      {showNew && (
        <div className="rounded-md bg-bg-alt/70 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-ink-2">
            Built in this period
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

// Each type keeps its own slot, in SECTION_TYPES order; old keys and
// anything unrecognised fold into one neutral slice. Types nobody uses are
// named under the legend rather than listed at zero.
function SectionTypesDonut({
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
  const all = [
    ...current.map((t, i) => ({
      name: t.label,
      value: rowOf.get(t.type)?.sections ?? 0,
      catalogues: rowOf.get(t.type)?.catalogues ?? 0,
      color: SERIES[i],
    })),
    {
      name: hasUnknown ? "Old and other types" : "Old types",
      value: folded.reduce((s, r) => s + r.sections, 0),
      catalogues: 0,
      color: "gray" as AvailableChartColorsKeys,
    },
  ]
  const shown = all.filter((p) => p.value > 0)
  const unused = all.filter((p) => p.value === 0 && p.color !== "gray")
  const oldInUse = folded.filter((r) => r.replacedBy && r.sections > 0)

  if (sectionTypes.totalSections === 0) return <Empty label="No sections yet." />

  return (
    <DonutWithLegend
      rows={shown}
      colors={shown.map((p) => p.color)}
      total={sectionTypes.totalSections}
      unit="sections"
      detail={(i) =>
        shown[i].color === "gray"
          ? "keys saved before a rename"
          : `in ${number(shown[i].catalogues)} catalogues`
      }
      footnote={
        (unused.length > 0 || oldInUse.length > 0) && (
          <p className="border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-3">
            {unused.length > 0 &&
              `Not used yet: ${unused.map((p) => p.name).join(", ")}. `}
            {oldInUse.length > 0 &&
              `Old keys still stored: ${oldInUse
                .map((r) => `${r.label} ${number(r.sections)} (read as ${r.replacedBy})`)
                .join(" · ")}.`}
          </p>
        )
      }
    />
  )
}

// Built catalogues by theme: each has exactly one, so the parts add up.
function ThemesDonut({
  popularity,
  total,
}: {
  popularity: Bucket[]
  total: number
}) {
  if (total === 0) return <Empty label="No built catalogues yet." />
  const top = popularity.slice(0, MAX_THEME_SLICES)
  const rest = popularity.slice(MAX_THEME_SLICES)
  const rows = rest.length
    ? [
        ...top,
        {
          name: `${rest.length} other ${rest.length === 1 ? "theme" : "themes"}`,
          value: rest.reduce((s, r) => s + r.value, 0),
        },
      ]
    : top
  const colors: AvailableChartColorsKeys[] = [
    ...top.map((_, i) => SERIES[i]),
    ...(rest.length ? (["gray"] as const) : []),
  ]
  return (
    <DonutWithLegend
      rows={rows}
      colors={colors}
      total={total}
      unit="catalogues"
      footnote={
        rest.length > 0 && (
          <p className="border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-3">
            Other: {rest.map((r) => `${r.name} ${number(r.value)}`).join(" · ")}
          </p>
        )
      }
    />
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
    features.newCatalogues < features.builtCatalogues
  // The biggest gain among new catalogues over the all-time share.
  const rising =
    showNew && features.newCatalogues >= MIN_NEW_FOR_TREND
      ? features.adoption
          .map((f) => ({ f, change: round1(f.newPct - f.pctCatalogues) }))
          .filter((x) => x.change > 0)
          .sort((a, b) => b.change - a.change)[0]
      : undefined

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Feature adoption"
        subtitle="Which features earn their keep? Shares are of built catalogues, from their current settings; empty drafts can't use a feature. New catalogues, AI usage and activity follow the selected period."
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
          hint={`average per built catalogue, of ${FEATURES.length} tracked`}
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

      <section
        key={`${animationKey}-feat-mix`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="Content blocks"
          subtitle={`All ${number(features.sectionTypes.totalSections)} sections, by type`}
          scope="All time"
        >
          <SectionTypesDonut sectionTypes={features.sectionTypes} />
        </ChartCard>
        <ChartCard
          title="Appearance"
          subtitle={`The ${number(features.builtCatalogues)} built catalogues, by theme`}
          scope="All time"
        >
          <ThemesDonut
            popularity={themes.popularity}
            total={features.builtCatalogues}
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-feat-adoption`}
        className="animate-chart-in grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ChartCard
            title="Adoption by feature"
            subtitle={`Share of the ${number(features.builtCatalogues)} built catalogues using each one${
              showNew
                ? `, and of the ${number(features.newCatalogues)} built in range`
                : ""
            }. Pick a feature for details.`}
            scope="All time"
          >
            <AdoptionTable
              adoption={features.adoption}
              selected={selected.key}
              onSelect={selectFeature}
              showNew={showNew}
              showTrend={features.newCatalogues >= MIN_NEW_FOR_TREND}
            />
          </ChartCard>
        </div>

        <Card ref={detailRef} className="scroll-mt-24">
          <FeatureDetail
            feature={selected}
            newCatalogues={features.newCatalogues}
            showNew={showNew}
          />
        </Card>
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
