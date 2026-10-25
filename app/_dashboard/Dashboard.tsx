"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"

import { cx } from "@/lib/utils/cx"

import { computeView, resolveRange } from "./clientView"
import type { DashboardData, RangeKey } from "./types"
import Header from "@/components/Header"
import AuthGuard from "@/components/AuthGuard"

import InsightsTab from "./tabs/InsightsTab"
import GrowthTab from "./tabs/GrowthTab"
import EngagementTab from "./tabs/EngagementTab"
import CataloguesTab from "./tabs/CataloguesTab"
import RevenueTab from "./tabs/RevenueTab"
import FeaturesTab from "./tabs/FeaturesTab"

const RANGES: RangeKey[] = ["1M", "3M", "6M", "12M", "ALL", "CUSTOM"]
const RANGE_LABEL: Record<RangeKey, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "12M": "12M",
  ALL: "All",
  CUSTOM: "Custom",
}

// Tabs group the charts by the question they answer, rather than by the table
// they come from. `Insights` leads because it is the cohort view most often
// asked for: who signed up, what they built, and what it earned.
const TABS = [
  {
    id: "insights",
    label: "Insights",
    hint: "New users, their catalogues and the traffic they earned",
  },
  { id: "growth", label: "Growth", hint: "Signups, catalogues and pageviews over time" },
  {
    id: "engagement",
    label: "Engagement",
    hint: "Activation funnel and how alive the catalogues are",
  },
  {
    id: "catalogues",
    label: "Catalogues",
    hint: "Composition, content depth and freshness",
  },
  { id: "revenue", label: "Revenue", hint: "Subscriptions, plans and churn" },
  {
    id: "features",
    label: "Features",
    hint: "AI, content blocks, integrations and themes",
  },
] as const

type TabId = (typeof TABS)[number]["id"]

const isTabId = (v: string): v is TabId => TABS.some((t) => t.id === v)

const readHash = () => window.location.hash.replace(/^#/, "")

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const today = () => isoDay(new Date())
const monthsAgo = (n: number) => {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - n)
  return isoDay(d)
}

function RangeSelector({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (v: RangeKey) => void
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex gap-0.5 rounded-xl border border-line bg-bg-alt p-[3px]"
    >
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={cx(
            "inline-flex min-h-8 items-center justify-center rounded-[9px] px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
            value === r
              ? "bg-card text-ink shadow-[0_1px_2px_rgba(22,20,15,0.08),0_2px_6px_rgba(22,20,15,0.06)]"
              : "text-ink-2 hover:text-ink",
          )}
        >
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  )
}

function TabBar({
  value,
  onChange,
}: {
  value: TabId
  onChange: (v: TabId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Analytics sections"
      className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active}
            aria-controls={`panel-${t.id}`}
            title={t.hint}
            onClick={() => onChange(t.id)}
            className={cx(
              "inline-flex h-10 flex-none items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-amber bg-amber-soft font-bold text-ink"
                : "border-line bg-card font-semibold text-ink-2 hover:bg-bg-alt hover:text-ink",
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function DatePicker({
  start,
  end,
  onApply,
}: {
  start: string
  end: string
  onApply: (start: string, end: string) => void
}) {
  const max = today()
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)

  // Reset the drafts whenever the committed range changes externally
  // (e.g. switching between range presets and back to Custom).
  useEffect(() => {
    setDraftStart(start)
    setDraftEnd(end)
  }, [start, end])

  const validYear = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const valid =
    validYear(draftStart) &&
    validYear(draftEnd) &&
    draftStart <= draftEnd &&
    draftEnd <= max
  const dirty = draftStart !== start || draftEnd !== end

  const inputCls =
    "h-10 rounded-md border-[1.5px] border-line-strong bg-card px-3 text-[15px] text-ink transition-[border-color,box-shadow] hover:border-line-hover focus-visible:border-amber focus-visible:ring-4 focus-visible:ring-amber/25 focus-visible:outline-none"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        From
        <input
          type="date"
          value={draftStart}
          max={draftEnd || max}
          onChange={(e) => setDraftStart(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        To
        <input
          type="date"
          value={draftEnd}
          min={draftStart}
          max={max}
          onChange={(e) => setDraftEnd(e.target.value)}
          className={inputCls}
        />
      </label>
      <button
        type="button"
        disabled={!valid || !dirty}
        onClick={() => onApply(draftStart, draftEnd)}
        className="inline-flex h-9 items-center rounded-full bg-amber px-4 text-sm font-semibold text-ink shadow-amber transition duration-200 hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  )
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const [range, setRange] = useState<RangeKey>("12M")
  const [customStart, setCustomStart] = useState<string>(monthsAgo(6))
  const [customEnd, setCustomEnd] = useState<string>(today())

  // The URL hash is the single source of truth for the active tab, so a
  // section can be linked to, survives a reload, and follows the back button.
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
  const tab: TabId = isTabId(hash) ? hash : TABS[0].id
  const selectTab = (next: TabId) => {
    // Assigning the hash (rather than replaceState) is what emits hashchange.
    window.location.hash = next
  }

  const { start, end } = useMemo(
    () => resolveRange(range, customStart, customEnd, data),
    [range, customStart, customEnd, data],
  )

  const view = useMemo(() => computeView(data, start, end), [data, start, end])

  const animationKey =
    range === "CUSTOM" ? `custom-${customStart}-${customEnd}` : range

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <AuthGuard>
      <main className="min-h-screen bg-bg pt-[9px] pb-16">
        <Header />

        <div className="mx-auto max-w-[1280px] space-y-6 px-5 pt-8">
          {/* Top-level time range — drives every chart on every tab */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-amber-ink">
                  Quicktalog admin
                </span>
                <h1 className="mt-1 text-title-app font-extrabold text-ink">
                  Analytics
                </h1>
                <p className="mt-1.5 text-[15px] text-ink-2">
                  All metrics reflect the selected period · {start} → {end}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {range === "CUSTOM" && (
                  <DatePicker
                    start={customStart}
                    end={customEnd}
                    onApply={(s, e) => {
                      setCustomStart(s)
                      setCustomEnd(e)
                    }}
                  />
                )}
                <RangeSelector value={range} onChange={setRange} />
              </div>
            </div>
            <TabBar value={tab} onChange={selectTab} />
          </section>

          <div
            role="tabpanel"
            id={`panel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
          >
            {tab === "insights" && (
              <InsightsTab view={view} animationKey={animationKey} />
            )}
            {tab === "growth" && (
              <GrowthTab view={view} animationKey={animationKey} />
            )}
            {tab === "engagement" && (
              <EngagementTab view={view} animationKey={animationKey} />
            )}
            {tab === "catalogues" && (
              <CataloguesTab view={view} animationKey={animationKey} />
            )}
            {tab === "revenue" && (
              <RevenueTab view={view} animationKey={animationKey} />
            )}
            {tab === "features" && (
              <FeaturesTab view={view} animationKey={animationKey} />
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
