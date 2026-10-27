"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  Activity,
  BookOpen,
  BookPlus,
  Eye,
  Lightbulb,
  Puzzle,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react"

import AuthGuard from "@/components/AuthGuard"
import Backdrop from "@/components/Backdrop"
import Sidebar from "@/components/Sidebar"
import { cx } from "@/lib/utils/cx"

import { computeView, resolveRange } from "./clientView"
import Hero, { type Pulse } from "./Hero"
import type { DashboardData, DashboardView, RangeKey } from "./types"
import { compactNumber, number } from "./ui"
import { useIndicator } from "./useIndicator"

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
    icon: Lightbulb,
    hint: "New users, their catalogues and the traffic they earned",
  },
  {
    id: "growth",
    label: "Growth",
    icon: TrendingUp,
    hint: "Signups, catalogues and pageviews over time",
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: Activity,
    hint: "Activation funnel and how alive the catalogues are",
  },
  {
    id: "catalogues",
    label: "Catalogues",
    icon: BookOpen,
    hint: "Composition, content depth and freshness",
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: Wallet,
    hint: "Subscriptions, plans and churn",
  },
  {
    id: "features",
    label: "Features",
    icon: Puzzle,
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

// The slider both pill groups share: an amber-soft pill that glides to the
// active item, across a row or, when `vertical`, down a column.
function Indicator({
  box,
  vertical = false,
  className,
}: {
  box: ReturnType<typeof useIndicator>["box"]
  vertical?: boolean
  className: string
}) {
  const style = !box
    ? undefined
    : vertical
      ? { top: box.top, height: box.height }
      : { left: box.left, width: box.width }
  return (
    <span
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute",
        vertical ? "inset-x-0" : "inset-y-0",
        box?.animate &&
          (vertical
            ? "transition-[top,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"),
        box ? "opacity-100" : "opacity-0",
        className,
      )}
      style={style}
    />
  )
}

function RangeSelector({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (v: RangeKey) => void
}) {
  const { ref, box } = useIndicator(value)
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex self-start rounded-xl border border-line bg-bg-alt p-[3px] sm:self-auto"
    >
      <div ref={ref} className="relative flex gap-0.5">
        <Indicator
          box={box}
          className="rounded-[9px] bg-ink/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
        />
        {RANGES.map((r) => (
          <button
            key={r}
            data-key={r}
            type="button"
            aria-pressed={value === r}
            onClick={() => onChange(r)}
            className={cx(
              "relative inline-flex min-h-8 items-center justify-center rounded-[9px] px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
              value === r ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>
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
  const { ref, box } = useIndicator(value)

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === value)
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? TABS.length - 1
          : (i + (e.key === "ArrowDown" ? 1 : -1) + TABS.length) % TABS.length
    onChange(TABS[next].id)
    ref.current
      ?.querySelector<HTMLElement>(`[data-key="${TABS[next].id}"]`)
      ?.focus()
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Analytics sections"
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      className="relative flex flex-col gap-1"
    >
      <Indicator
        box={box}
        vertical
        className="rounded-full border border-amber/55 bg-amber-soft shadow-[0_6px_16px_-8px_rgba(245,163,0,0.5)]"
      />
      {TABS.map((t) => {
        const active = t.id === value
        const Icon = t.icon
        return (
          <button
            key={t.id}
            data-key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active}
            aria-controls={`panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            title={t.hint}
            onClick={() => onChange(t.id)}
            className={cx(
              "relative flex h-11 w-full items-center gap-2.5 rounded-full px-3.5 text-[14.5px] whitespace-nowrap transition-colors focus-visible:outline-offset-[-3px]",
              active
                ? "font-bold text-ink"
                : "font-semibold text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
            )}
          >
            <Icon
              className={cx("size-4", active ? "text-amber-ink" : "text-ink-3")}
              aria-hidden="true"
            />
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
        className="inline-flex h-10 items-center rounded-full bg-amber px-4 text-sm font-semibold text-on-amber shadow-amber transition duration-200 hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

// The period of the same length that ends the day before `start`.
const previousRange = (start: string, end: string) => {
  const s = Date.parse(`${start}T00:00:00Z`)
  const e = Date.parse(`${end}T00:00:00Z`)
  const prevEnd = s - DAY_MS
  return {
    start: isoDay(new Date(prevEnd - (e - s))),
    end: isoDay(new Date(prevEnd)),
  }
}

const COMPARE_LABEL: Record<RangeKey, string | null> = {
  "1M": "vs the previous month",
  "3M": "vs the previous 3 months",
  "6M": "vs the previous 6 months",
  "12M": "vs the previous 12 months",
  ALL: null,
  CUSTOM: null, // filled in with the day count
}

// The four numbers the hero leads with, each with its trend series.
const pulsesOf = (view: DashboardView, prev: DashboardView | null): Pulse[] => [
  {
    label: "New users",
    icon: UserPlus,
    value: view.totals.users,
    previous: prev?.totals.users ?? null,
    points: view.growth.users.monthly.map((p) => ({ date: p.date, value: p.Users })),
    format: number,
  },
  {
    label: "New catalogues",
    icon: BookPlus,
    value: view.totals.catalogues,
    previous: prev?.totals.catalogues ?? null,
    points: view.growth.catalogues.monthly.map((p) => ({
      date: p.date,
      value: p.Catalogues,
    })),
    format: number,
  },
  {
    label: "Pageviews",
    icon: Eye,
    value: view.totals.pageviews,
    previous: prev?.totals.pageviews ?? null,
    points: view.pageviewsSeries.map((p) => ({ date: p.date, value: p.Pageviews })),
    format: (n) => (n >= 10000 ? compactNumber(n) : number(n)),
  },
  {
    label: "AI assistant turns",
    icon: Sparkles,
    value: view.features.ai.turns,
    previous: prev?.features.ai.turns ?? null,
    points: view.features.ai.overTime.map((p) => ({
      date: p.date,
      value: p["AI turns"],
    })),
    format: number,
  },
]

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

  // "All" has nothing before it to compare against.
  const prevView = useMemo(() => {
    if (range === "ALL") return null
    const prev = previousRange(start, end)
    return computeView(data, prev.start, prev.end)
  }, [data, range, start, end])

  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1
  const compareLabel =
    range === "CUSTOM" ? `vs the previous ${days} days` : COMPARE_LABEL[range]

  const animationKey =
    range === "CUSTOM" ? `custom-${customStart}-${customEnd}` : range

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <AuthGuard>
      <Backdrop />
      <div className="min-h-screen pt-[9px] lg:flex lg:pt-0">
        <Sidebar nav={<TabBar value={tab} onChange={selectTab} />} />

        <main className="min-w-0 flex-1 pb-20">
          <div className="mx-auto max-w-[1280px] space-y-10 px-5 pt-6 lg:px-8 lg:pt-3">
            {/* Top-level time range: drives every chart on every tab */}
            <Hero
              start={start}
              end={end}
              pulses={pulsesOf(view, prevView)}
              compareLabel={compareLabel}
              controls={
                <>
                  <RangeSelector value={range} onChange={setRange} />
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
                </>
              }
            />
  
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
      </div>
    </AuthGuard>
  )
}
