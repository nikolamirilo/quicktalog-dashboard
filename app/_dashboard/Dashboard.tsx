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
    <div className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cx(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === r
              ? "bg-gray-900 text-white shadow-sm dark:bg-gray-50 dark:text-gray-900"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
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
      className="-mb-px flex gap-1 overflow-x-auto"
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
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-gray-900 text-gray-900 dark:border-gray-50 dark:text-gray-50"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200",
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
    "rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-900 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-700"

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        From
        <input
          type="date"
          value={draftStart}
          max={draftEnd || max}
          onChange={(e) => setDraftStart(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
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
        className={cx(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          valid && dirty
            ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
            : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
        )}
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
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />

        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          {/* Top-level time range — drives every chart on every tab */}
          <section className="space-y-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Analytics
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All metrics reflect the selected period · {start} → {end}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
