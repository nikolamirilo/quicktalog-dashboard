"use client"

import { BookPlus, CalendarDays, Tag, UserPlus } from "lucide-react"

import { AreaChart, BarChart } from "@/components/charts"

import { ALL_SOURCES, NOT_TRACKED, channelLabel, sourceKey, type SourceKey } from "../channels"
import type { CampaignRow, ChannelRow, CohortRow, TabProps } from "../types"
import {
  BarValue,
  ChartCard,
  type Column,
  DataTable,
  Delta,
  Empty,
  KpiCard,
  Note,
  Num,
  RankingList,
  SERIES,
  SectionHeading,
  decimal,
  number,
  pct,
  toRanking,
} from "../ui"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const formatDay = (iso: string) => dayFmt.format(new Date(iso))

// Room for every label of a horizontal bar chart, which skips some when the
// rows are packed tighter than this.
const barsHeight = (rows: number) => ({ minHeight: Math.max(192, rows * 30 + 36) })

// The activation bar both tables share: built ÷ signups.
const activationCell = (built: number, signups: number) =>
  signups ? (
    <BarValue value={share(built, signups)} label={pct(share(built, signups))} />
  ) : (
    <span className="text-ink-3">—</span>
  )

// Each month's signups and how far they have got. Built is the share that
// counts: it is the activation rate of that month.
const COHORT_COLUMNS: Column<CohortRow>[] = [
  {
    key: "cohort",
    header: "Signed up",
    className: "w-[22%]",
    cell: (c) => <span className="font-semibold text-ink">{c.cohort}</span>,
  },
  { key: "signups", header: "People", align: "right", cell: (c) => <Num value={c.signups} /> },
  {
    key: "started",
    header: "Started",
    align: "right",
    cell: (c) => (
      <span>
        <Num value={c.started} />
        <span className="ml-1.5 text-[12px] font-normal text-ink-3">
          {pct(share(c.started, c.signups))}
        </span>
      </span>
    ),
  },
  { key: "built", header: "Built", align: "right", cell: (c) => <Num value={c.built} /> },
  {
    key: "rate",
    header: "Activation",
    align: "right",
    className: "w-[32%]",
    cell: (c) => activationCell(c.built, c.signups),
  },
  { key: "paying", header: "Ever paid", align: "right", cell: (c) => <Num value={c.paying} /> },
]

// Signups per channel and how far they got, with the same columns as the
// cohorts so the two read alike.
const channelColumns = (total: number): Column<ChannelRow>[] => [
  {
    key: "channel",
    header: "Channel",
    className: "w-[24%]",
    cell: (r) => (
      <span
        className={
          r.channel === NOT_TRACKED ? "font-semibold text-ink-3" : "font-semibold text-ink"
        }
      >
        {r.channel}
      </span>
    ),
  },
  {
    key: "signups",
    header: "Signups",
    align: "right",
    cell: (r) => (
      <span>
        <Num value={r.signups} />
        <span className="ml-1.5 text-[12px] font-normal text-ink-3">
          {pct(share(r.signups, total))}
        </span>
      </span>
    ),
  },
  { key: "started", header: "Started", align: "right", cell: (r) => <Num value={r.started} /> },
  { key: "built", header: "Built", align: "right", cell: (r) => <Num value={r.built} /> },
  {
    key: "rate",
    header: "Activation",
    align: "right",
    className: "w-[28%]",
    cell: (r) => activationCell(r.built, r.signups),
  },
  { key: "published", header: "Published", align: "right", cell: (r) => <Num value={r.published} /> },
  {
    key: "paying",
    header: "Ever paid",
    align: "right",
    cell: (r) => (
      <span>
        <Num value={r.paying} />
        {r.paying > 0 && (
          <span className="ml-1.5 text-[12px] font-normal text-ink-3">
            {pct(share(r.paying, r.signups))}
          </span>
        )}
      </span>
    ),
  },
]

const tagCell = (v: string | null) =>
  v ? (
    <span className="font-mono text-[12.5px] break-all text-ink">{v}</span>
  ) : (
    <span className="text-ink-3">—</span>
  )

const CAMPAIGN_COLUMNS: Column<CampaignRow>[] = [
  { key: "source", header: "Source", className: "w-[20%]", cell: (r) => tagCell(r.source) },
  { key: "medium", header: "Medium", className: "w-[16%]", cell: (r) => tagCell(r.medium) },
  { key: "campaign", header: "Campaign", className: "w-[26%]", cell: (r) => tagCell(r.campaign) },
  { key: "signups", header: "Signups", align: "right", cell: (r) => <Num value={r.signups} /> },
  { key: "built", header: "Built", align: "right", cell: (r) => <Num value={r.built} /> },
  {
    key: "rate",
    header: "Activation",
    align: "right",
    cell: (r) => (r.signups ? pct(share(r.built, r.signups)) : "—"),
  },
  { key: "paying", header: "Ever paid", align: "right", cell: (r) => <Num value={r.paying} /> },
]

// The filter a campaign row picks: its campaign, else its medium, else its
// source, which is then its channel.
const campaignFilter = (r: CampaignRow): SourceKey =>
  r.campaign
    ? sourceKey("campaign", r.campaign)
    : r.medium
      ? sourceKey("medium", r.medium)
      : sourceKey("channel", channelLabel(r.source))

// Who signed up, when, and from where.
export default function AcquisitionTab({
  view,
  prev,
  animationKey,
  trackingSince,
  source,
  onSource,
}: TabProps & {
  trackingSince: string | null
  source: SourceKey
  onSource: (key: SourceKey) => void
}) {
  const { acquisition: acq } = view
  // A second click on the selected row clears the filter.
  const toggle = (key: SourceKey | null) => {
    if (key) onSource(key === source ? ALL_SOURCES : key)
  }
  const trackedFrom = trackingSince ? formatDay(trackingSince) : null
  const beforeTracking = trackingSince != null && view.start < trackingSince.slice(0, 10)
  const untracked = view.signups - acq.tracked

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Acquisition"
        subtitle="Who signed up in this period, when, and from where"
      />

      <section
        key={`${animationKey}-acq-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New signups"
          icon={UserPlus}
          value={number(view.signups)}
          delta={<Delta value={view.signups} previous={prev?.signups ?? null} />}
          hint={prev ? `was ${number(prev.signups)}` : undefined}
          scope="In range"
        />
        <KpiCard
          label="Signups per week"
          icon={CalendarDays}
          value={decimal(acq.weeklyAvg)}
          delta={
            <Delta
              value={acq.weeklyAvg}
              previous={prev?.acquisition.weeklyAvg ?? null}
            />
          }
          hint={prev ? `was ${decimal(prev.acquisition.weeklyAvg)}` : undefined}
          scope="In range"
        />
        <KpiCard
          label="Started a catalogue"
          icon={BookPlus}
          value={pct(acq.startedPct)}
          delta={
            <Delta
              value={acq.startedPct}
              previous={prev?.acquisition.startedPct ?? null}
              unit="pts"
            />
          }
          hint="of signups, empty ones included"
          scope="Signups in range"
        />
        <KpiCard
          label="Source tracked"
          icon={Tag}
          value={pct(acq.trackedPct)}
          hint={`${number(acq.tracked)} of ${number(view.signups)} signups${trackedFrom ? `; tracked since ${trackedFrom}` : "; not tracked yet"}`}
          scope="Signups in range"
        />
      </section>

      <section
        key={`${animationKey}-acq-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="New signups" subtitle="Per period" scope="In range">
          <BarChart
            data={view.signupSeries}
            index="date"
            categories={["Signups"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-56"
          />
        </ChartCard>
        <ChartCard
          title="Users"
          subtitle="Running total from the start of the range"
          scope="In range"
        >
          <AreaChart
            data={view.cumulativeUsers}
            index="date"
            categories={["Users"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={48}
            startEndOnly
            className="h-56"
          />
        </ChartCard>
      </section>

      {(beforeTracking || !trackedFrom) && untracked > 0 && (
        <Note tone="amber">
          {trackedFrom ? (
            <>
              Sources are tracked from <b className="font-semibold">{trackedFrom}</b>.
              The {number(untracked)} signups in this range without one came
              before that, or had their first visit recorded only at a later
              sign-in, which says nothing about how they found Quicktalog.
              Choose a range from {trackedFrom} for a clean split.
            </>
          ) : (
            <>
              No signup has a tracked source yet. The UTM tags, referring site
              and landing page of each new signup show here once they arrive.
            </>
          )}
        </Note>
      )}

      <section
        key={`${animationKey}-acq-channels`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Signups by channel"
          subtitle="UTM source, else the referring site, else direct"
          scope="Signups in range"
        >
          {acq.channels.length === 0 ? (
            <Empty label="No tracked signups in this range." />
          ) : (
            <BarChart
              data={acq.channels}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={120}
              className="h-full flex-1"
              style={barsHeight(acq.channels.length)}
            />
          )}
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard
            title="Channels over time"
            subtitle="Tracked signups per period, the five biggest channels"
            scope="Signups in range"
          >
            {acq.channelNames.length === 0 ? (
              <Empty label="No tracked signups in this range." />
            ) : (
              <BarChart
                data={acq.channelSeries}
                index="date"
                categories={acq.channelNames}
                colors={acq.channelNames.map((n, i) =>
                  n === "Other channels" ? "gray" : SERIES[i],
                )}
                type="stacked"
                valueFormatter={number}
                yAxisWidth={40}
                className="h-56"
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section key={`${animationKey}-acq-channel-table`} className="animate-chart-in">
        <ChartCard
          title="What each channel brought"
          subtitle="Signups from each channel and how far they have got. Click a row to filter the dashboard to it."
          scope="Signups in range"
        >
          {acq.channelRows.length === 0 ? (
            <Empty />
          ) : (
            <DataTable
              columns={channelColumns(view.signups)}
              rows={acq.channelRows}
              rowKey={(r) => r.channel}
              onRowClick={(r) => toggle(r.filterKey)}
              isSelected={(r) => r.filterKey === source}
              foot={
                acq.channelRows.length > 1
                  ? [
                      acq.channelRows.reduce(
                        (t, r) => ({
                          ...t,
                          signups: t.signups + r.signups,
                          started: t.started + r.started,
                          built: t.built + r.built,
                          published: t.published + r.published,
                          paying: t.paying + r.paying,
                        }),
                        {
                          channel: "All signups",
                          filterKey: null,
                          signups: 0,
                          started: 0,
                          built: 0,
                          published: 0,
                          paying: 0,
                        } as ChannelRow,
                      ),
                    ]
                  : []
              }
              minWidth={680}
            />
          )}
        </ChartCard>
      </section>

      <section key={`${animationKey}-acq-campaigns`} className="animate-chart-in">
        <ChartCard
          title="Campaigns"
          subtitle="Signups that arrived on a link with UTM tags. Click a row to filter the dashboard to it."
          scope="Signups in range"
        >
          {acq.campaigns.length === 0 ? (
            <Empty label="No signups from tagged links in this range. Add utm_source, utm_medium and utm_campaign to the links you share and each campaign shows here." />
          ) : (
            <DataTable
              columns={CAMPAIGN_COLUMNS}
              rows={acq.campaigns}
              rowKey={(r) => r.key}
              onRowClick={(r) => toggle(campaignFilter(r))}
              isSelected={(r) => campaignFilter(r) === source}
              minWidth={680}
            />
          )}
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-acq-touch`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Referring sites"
          subtitle="The site a tracked signup first came from"
          scope="Signups in range"
        >
          <RankingList rows={toRanking(acq.referrers)} valueLabel="Signups" />
        </ChartCard>
        <ChartCard
          title="Landing pages"
          subtitle="The first page a tracked signup saw"
          scope="Signups in range"
        >
          <RankingList rows={toRanking(acq.landingPages)} valueLabel="Signups" />
        </ChartCard>
        <ChartCard
          title="What they told us"
          subtitle="“How did you hear about us?”, asked after signup"
          scope="Signups in range"
        >
          {acq.selfReported.length === 0 ? (
            <Empty label="No answers in this range." />
          ) : (
            <BarChart
              data={acq.selfReported}
              index="name"
              categories={["value"]}
              colors={["violet"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={120}
              className="h-full flex-1"
              style={barsHeight(acq.selfReported.length)}
            />
          )}
          <p className="mt-3 text-[13px] text-ink-3">
            {number(acq.answered)} answered, {number(acq.skipped)} skipped. What
            people say they remember, kept apart from the tracked source.
          </p>
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-acq-mix`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="Business type"
          subtitle="Of catalogues started in range, empty ones included"
          scope="In range"
        >
          {acq.byBusinessType.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={acq.byBusinessType}
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
        <ChartCard
          title="Language"
          subtitle="Of catalogues started in range"
          scope="In range"
        >
          {acq.byLanguage.length === 0 ? (
            <Empty />
          ) : (
            <BarChart
              data={acq.byLanguage}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={56}
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>
      </section>

      <section key={`${animationKey}-acq-cohorts`} className="animate-chart-in">
        <ChartCard
          title="Signup cohorts"
          subtitle="Where each month's signups are today"
          scope="Signups in range"
        >
          {acq.cohorts.length === 0 ? (
            <Empty />
          ) : (
            <DataTable
              columns={COHORT_COLUMNS}
              rows={acq.cohorts}
              rowKey={(c) => c.cohort}
              foot={[
                acq.cohorts.reduce(
                  (t, c) => ({
                    ...t,
                    signups: t.signups + c.signups,
                    started: t.started + c.started,
                    built: t.built + c.built,
                    paying: t.paying + c.paying,
                  }),
                  { cohort: "Range total", signups: 0, started: 0, built: 0, paying: 0 },
                ),
              ]}
              minWidth={560}
            />
          )}
        </ChartCard>
      </section>
    </div>
  )
}
