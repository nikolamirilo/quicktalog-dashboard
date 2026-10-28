"use client"

import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  CreditCard,
  Eye,
  Layers,
  LayoutGrid,
  Mail,
  Puzzle,
  Shield,
  TrendingUp,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react"

import Backdrop from "@/components/Backdrop"
import Sidebar from "@/components/Sidebar"
import { cx } from "@/lib/utils/cx"

import {
  addDays,
  attentionOf,
  computeView,
  daysBetween,
  lastAnalyticsDay,
  previousRange,
  resolveRange,
  sourcesOf,
  withoutInternal,
} from "./clientView"
import Hero, { type Pulse } from "./Hero"
import type { DashboardData, DashboardView, RangeKey, Series } from "./types"
import { compactNumber, money, number } from "./ui"
import { useIndicator } from "./useIndicator"

import OverviewTab from "./tabs/OverviewTab"
import AcquisitionTab from "./tabs/AcquisitionTab"
import ActivationTab from "./tabs/ActivationTab"
import ContentTab from "./tabs/ContentTab"
import TrafficTab from "./tabs/TrafficTab"
import RevenueTab from "./tabs/RevenueTab"
import CustomersTab from "./tabs/CustomersTab"
import FeaturesTab from "./tabs/FeaturesTab"
import OutreachTab from "./tabs/OutreachTab"

const RANGES: RangeKey[] = ["1M", "3M", "6M", "12M", "ALL", "CUSTOM"]
const RANGE_LABEL: Record<RangeKey, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "12M": "12M",
  ALL: "All",
  CUSTOM: "Custom",
}

// One page per question, grouped in the sidebar. Overview leads: how the
// period went and what needs a look.
const TABS = [
  {
    id: "overview",
    group: null,
    label: "Overview",
    icon: LayoutGrid,
    hint: "How the period went, and what needs attention",
  },
  {
    id: "acquisition",
    group: "Users",
    label: "Acquisition",
    icon: UserPlus,
    hint: "Who signed up, when and from where",
  },
  {
    id: "activation",
    group: "Users",
    label: "Activation",
    icon: Zap,
    hint: "Did signups build a real catalogue, and where do they stop",
  },
  {
    id: "content",
    group: "Catalogues",
    label: "Content",
    icon: Layers,
    hint: "What the catalogues hold, and how many are empty",
  },
  {
    id: "traffic",
    group: "Catalogues",
    label: "Traffic",
    icon: Eye,
    hint: "Views, and which catalogues are live or dead",
  },
  {
    id: "revenue",
    group: "Money",
    label: "Revenue",
    icon: Wallet,
    hint: "MRR, revenue, refunds and checkout from Paddle",
  },
  {
    id: "customers",
    group: "Money",
    label: "Customers",
    icon: CreditCard,
    hint: "Who pays, who left and who is at risk",
  },
  {
    id: "features",
    group: "Product",
    label: "Features",
    icon: Puzzle,
    hint: "Feature adoption and how the AI assistant does",
  },
  {
    id: "outreach",
    group: "Act",
    label: "Outreach lists",
    icon: Mail,
    hint: "People to email, with a CSV export",
  },
] as const

type TabId = (typeof TABS)[number]["id"]

// Links to the old tabs keep working.
const ALIASES: Record<string, TabId> = {
  insights: "overview",
  growth: "acquisition",
  engagement: "activation",
  catalogues: "content",
}

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
  badges,
}: {
  value: TabId
  onChange: (v: TabId) => void
  badges: Partial<Record<TabId, number>>
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
      {TABS.map((t, i) => {
        const active = t.id === value
        const Icon = t.icon
        const badge = badges[t.id]
        return (
          <Fragment key={t.id}>
            {t.group && t.group !== TABS[i - 1]?.group && (
              <p
                aria-hidden="true"
                className="px-3.5 pt-3 pb-0.5 text-[11.5px] font-bold tracking-[0.08em] text-ink-3 uppercase"
              >
                {t.group}
              </p>
            )}
            <button
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
              {badge ? (
                <span className="ml-auto rounded-full bg-amber-soft px-2 py-px text-[12px] font-bold text-amber-ink tabular-nums ring-1 ring-amber/40 ring-inset">
                  {number(badge)}
                </span>
              ) : null}
            </button>
          </Fragment>
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

// Internal and test accounts (INTERNAL_EMAILS) are left out unless switched
// back in. With none listed there is nothing to switch.
function InternalSwitch({
  count,
  on,
  onChange,
}: {
  count: number
  on: boolean
  onChange: (on: boolean) => void
}) {
  if (count === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 self-start text-[12.5px] text-ink-3 sm:self-auto"
        title="List internal and test accounts in INTERNAL_EMAILS to leave them out of every figure."
      >
        <Shield className="size-3.5" aria-hidden="true" />
        No internal accounts listed
      </span>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 self-start rounded-full py-1 text-[13px] font-semibold text-ink-2 hover:text-ink sm:self-auto"
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative h-5 w-9 rounded-full transition-colors",
          on ? "bg-amber" : "bg-line-strong",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 size-4 rounded-full bg-card shadow-sm transition-[left]",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      Include {number(count)} internal {count === 1 ? "account" : "accounts"}
    </button>
  )
}

const COMPARE_LABEL: Record<RangeKey, string | null> = {
  "1M": "vs the previous month",
  "3M": "vs the previous 3 months",
  "6M": "vs the previous 6 months",
  "12M": "vs the previous 12 months",
  ALL: null,
  CUSTOM: null, // filled in with the day count
}

const pointsOf = (series: Series, key: string) =>
  series.flatMap((r) =>
    typeof r[key] === "number" ? [{ date: String(r.date), value: r[key] as number }] : [],
  )

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

// The four numbers Overview leads with, each with its trend.
const pulsesOf = (
  view: DashboardView,
  prev: DashboardView | null,
  compareLabel: string | null,
): Pulse[] => {
  const { revenue, customers } = view
  return [
    {
      label: "New signups",
      icon: UserPlus,
      value: view.signups,
      previous: prev?.signups ?? null,
      points: pointsOf(view.signupSeries, "Signups"),
      format: number,
    },
    {
      label: "Activated users",
      icon: Zap,
      value: view.activation.activated,
      previous: prev?.activation.activated ?? null,
      points: pointsOf(view.signupSeries, "Activated"),
      format: number,
      note: "Signups in range who built a catalogue",
    },
    {
      label: "Pageviews",
      icon: Eye,
      value: view.traffic.pageviews,
      previous: prev?.traffic.pageviews ?? null,
      points: pointsOf(view.traffic.series, "Pageviews"),
      format: (n) => (n >= 10000 ? compactNumber(n) : number(n)),
      note:
        view.analyticsClamped && compareLabel
          ? `${compareLabel}, both cut at ${shortDay(view.analyticsUntil)}`
          : undefined,
    },
    revenue.mrrSource === "metrics"
      ? {
          label: "MRR",
          icon: TrendingUp,
          value: revenue.mrr,
          previous: revenue.mrrStart,
          points: pointsOf(revenue.mrrSeries ?? [], "MRR"),
          format: (n) => money(n, revenue.currency),
          note: "vs the start of the range",
        }
      : {
          label: "Paying customers",
          icon: CreditCard,
          value: customers.paying,
          previous: null,
          points: [],
          format: number,
          note: revenue.connected
            ? "Right now"
            : "Right now · MRR shows here once Paddle is connected",
        },
  ]
}

export default function Dashboard({
  data,
  username,
}: {
  data: DashboardData
  username: string
}) {
  const [range, setRange] = useState<RangeKey>("12M")
  const [customStart, setCustomStart] = useState<string>(monthsAgo(6))
  const [customEnd, setCustomEnd] = useState<string>(today())
  const [withInternal, setWithInternal] = useState(false)

  // The URL hash is the single source of truth for the active tab, so a
  // section can be linked to, survives a reload, and follows the back button.
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
  const tab: TabId = isTabId(hash) ? hash : (ALIASES[hash] ?? TABS[0].id)
  const selectTab = (next: TabId) => {
    // Assigning the hash (rather than replaceState) is what emits hashchange.
    window.location.hash = next
  }

  const internalCount = useMemo(
    () => data.users.filter((u) => u.internal).length,
    [data],
  )
  const scoped = useMemo(
    () => (withInternal ? data : withoutInternal(data)),
    [data, withInternal],
  )
  const lastDay = useMemo(() => lastAnalyticsDay(scoped), [scoped])

  const { start, end } = useMemo(
    () => resolveRange(range, customStart, customEnd, data),
    [range, customStart, customEnd, data],
  )
  // Traffic stops at the newest analytics day, and the previous period is cut
  // to the same number of days, so a late import can't fake a drop.
  const until = lastDay && lastDay < end ? lastDay : end

  const view = useMemo(
    () => computeView(scoped, start, end, until),
    [scoped, start, end, until],
  )

  // "All" has nothing before it to compare against.
  const prevView = useMemo(() => {
    if (range === "ALL") return null
    const prev = previousRange(start, end)
    return computeView(
      scoped,
      prev.start,
      prev.end,
      addDays(prev.start, daysBetween(start, until)),
    )
  }, [scoped, range, start, end, until])

  const sources = useMemo(() => sourcesOf(data, lastDay), [data, lastDay])
  const attention = useMemo(
    () => attentionOf(scoped, view, lastDay),
    [scoped, view, lastDay],
  )

  const days = daysBetween(start, end) + 1
  const compareLabel =
    range === "CUSTOM" ? `vs the previous ${days} days` : COMPARE_LABEL[range]

  const animationKey = `${range === "CUSTOM" ? `custom-${customStart}-${customEnd}` : range}-${withInternal}`

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]
  const emptyOwners =
    data.segments.find((s) => s.id === "empty-catalogue")?.count ?? 0
  const props = { view, prev: prevView, animationKey }

  return (
    <>
      <Backdrop />
      <div className="min-h-screen pt-[9px] lg:flex lg:pt-0">
        <Sidebar
          username={username}
          nav={
            <TabBar
              value={tab}
              onChange={selectTab}
              badges={{ outreach: emptyOwners }}
            />
          }
        />

        <main className="min-w-0 flex-1 pb-20">
          <div className="mx-auto max-w-[1280px] space-y-10 px-5 pt-6 lg:px-8 lg:pt-3">
            {/* Top-level time range: drives every chart on every tab */}
            <Hero
              start={start}
              end={end}
              analyticsUntil={view.analyticsClamped ? view.analyticsUntil : null}
              pulses={tab === "overview" ? pulsesOf(view, prevView, compareLabel) : null}
              compareLabel={compareLabel}
              sources={sources}
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
                  <InternalSwitch
                    count={internalCount}
                    on={withInternal}
                    onChange={setWithInternal}
                  />
                </>
              }
            />

            <div
              role="tabpanel"
              id={`panel-${activeTab.id}`}
              aria-labelledby={`tab-${activeTab.id}`}
            >
              {tab === "overview" && <OverviewTab {...props} attention={attention} />}
              {tab === "acquisition" && <AcquisitionTab {...props} />}
              {tab === "activation" && <ActivationTab {...props} />}
              {tab === "content" && <ContentTab {...props} />}
              {tab === "traffic" && <TrafficTab {...props} />}
              {tab === "revenue" && <RevenueTab {...props} />}
              {tab === "customers" && <CustomersTab {...props} />}
              {tab === "features" && (
                <FeaturesTab view={view} animationKey={animationKey} />
              )}
              {tab === "outreach" && (
                <OutreachTab
                  segments={data.segments}
                  paddleConnected={data.paddle != null}
                  animationKey={animationKey}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
