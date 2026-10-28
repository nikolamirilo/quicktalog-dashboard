"use client"

import { AlertTriangle, CreditCard, TrendingDown, UserPlus } from "lucide-react"

import { BarChart } from "@/components/charts"
import type { AvailableChartColorsKeys } from "@/lib/utils/chartColors"

import type { Bucket, TabProps } from "../types"
import {
  ChartCard,
  Delta,
  Empty,
  KpiCard,
  LevelPill,
  Note,
  PartsBar,
  PartsLegend,
  SectionHeading,
  TabLink,
  number,
  pct,
} from "../ui"

// A state keeps its colour wherever it appears; churned and cancelled are
// the neutral end.
const STATE_COLOR: Record<string, AvailableChartColorsKeys> = {
  Paying: "amber",
  Active: "amber",
  "Past Due": "magenta",
  Trialing: "blue",
  Paused: "violet",
  Churned: "gray",
  Canceled: "gray",
}
const colorsOf = (rows: Bucket[]) => rows.map((r) => STATE_COLOR[r.name] ?? "gray")

function ListRow({
  level,
  count,
  title,
  detail,
  tab,
}: {
  level: "act" | "check"
  count: number | null
  title: string
  detail: string
  tab?: string
}) {
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-3">
      <span className="row-span-3 font-head text-[22px] leading-tight font-extrabold text-ink tabular-nums">
        {count == null ? "—" : number(count)}
      </span>
      <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
        {title}
        {count != null && count > 0 && <LevelPill level={level} />}
      </span>
      <span className="text-[12.5px] text-ink-3">{detail}</span>
      {tab && count != null && count > 0 && (
        <TabLink tab={tab} className="justify-self-start">
          Outreach list
        </TabLink>
      )}
    </li>
  )
}

// Customers, counted once each however many subscription rows they have:
// who pays, who joined, who left and who is about to.
export default function CustomersTab({ view, prev, animationKey }: TabProps) {
  const { customers: c } = view
  const p = prev?.customers
  const paddle = c.source === "paddle"
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Customers"
        subtitle="Counted per customer, not per subscription row: a plan change adds a row without adding a customer"
      />

      {!paddle && (
        <Note>
          Read from the database mirror of Paddle. It has no cancel dates, so
          churn is all-time; connect Paddle to see churn for the range and who
          is about to cancel.
        </Note>
      )}

      <section
        key={`${animationKey}-cus-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Paying customers"
          icon={CreditCard}
          value={number(c.paying)}
          hint={[
            c.paused ? `${number(c.paused)} paused` : null,
            c.trialing ? `${number(c.trialing)} trialing` : null,
            `${number(c.ever)} ever`,
          ]
            .filter(Boolean)
            .join(" · ")}
          scope="Right now"
        />
        <KpiCard
          label="New paying customers"
          icon={UserPlus}
          value={number(c.newInRange)}
          delta={<Delta value={c.newInRange} previous={p?.newInRange ?? null} />}
          hint="first subscription in range"
          scope="In range"
        />
        <KpiCard
          label="Customer churn"
          icon={TrendingDown}
          value={pct(c.churn.rate)}
          delta={
            c.churn.scope === "In range" ? (
              <Delta value={c.churn.rate} previous={p?.churn.rate ?? null} unit="pts" invert />
            ) : undefined
          }
          hint={
            c.churn.scope === "In range"
              ? `${number(c.churn.churned)} of ${number(c.churn.base)} paying at the start`
              : `${number(c.churn.churned)} of ${number(c.churn.base)} customers ever`
          }
          scope={c.churn.scope}
        />
        <KpiCard
          label="At risk"
          icon={AlertTriangle}
          value={number(c.atRisk)}
          hint="paying, no views in the last 30 days of data"
          scope="Right now"
          tone={c.atRisk > 0 ? "warn" : undefined}
          action={<TabLink tab="outreach">Email them</TabLink>}
        />
      </section>

      <section
        key={`${animationKey}-cus-state`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="Customer state"
          subtitle="Every customer who ever subscribed"
          scope="Right now"
        >
          {c.stateMix.length === 0 ? (
            <Empty label="No customers yet." />
          ) : (
            <div className="space-y-4">
              <PartsBar rows={c.stateMix} colors={colorsOf(c.stateMix)} />
              <PartsLegend rows={c.stateMix} colors={colorsOf(c.stateMix)} />
              <div className="border-t border-line pt-4">
                <p className="mb-2.5 text-[13px] font-bold text-ink">
                  The same data as subscription rows
                </p>
                <PartsBar rows={c.rowMix} colors={colorsOf(c.rowMix)} />
                <p className="mt-2 text-[12.5px] text-ink-3">
                  {c.rowMix.map((r) => `${r.name} ${number(r.value)}`).join(" · ")}.
                  Counting rows made churn look far higher than it is.
                </p>
              </div>
            </div>
          )}
        </ChartCard>
        <ChartCard
          title="New paying customers"
          subtitle="First subscription, per period"
          scope="In range"
        >
          <BarChart
            data={c.newSeries}
            index="date"
            categories={["New paying customers"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-cus-lists`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="Paying customers by plan" scope="Right now">
          {c.byPlan.length === 0 ? (
            <Empty label="No paying customers." />
          ) : (
            <BarChart
              data={c.byPlan}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={88}
              className="h-full min-h-48 flex-1"
            />
          )}
          <p className="mt-3 text-[13px] text-ink-3">
            Paid conversion: {number(c.cohortPaid)} of {number(view.signups)} signups
            in range ({pct(c.paidConversion)}) have subscribed so far
            {p ? `, was ${pct(p.paidConversion)}` : ""}.
          </p>
        </ChartCard>
        <ChartCard title="Who needs a look" subtitle="Each count opens a list to email" scope="Right now">
          <ul className="-my-1 divide-y divide-line">
            <ListRow
              level="act"
              count={c.scheduledCancel}
              title="Scheduled to cancel"
              detail={paddle ? "Still paying, with a cancellation booked" : "Needs Paddle"}
              tab="outreach"
            />
            <ListRow
              level="act"
              count={c.pastDue}
              title="Payment past due"
              detail={paddle ? "Paddle couldn't collect the last payment" : "Needs Paddle"}
              tab="outreach"
            />
            <ListRow
              level="check"
              count={c.doubleActive}
              title="Two active subscriptions"
              detail="Check Paddle for double charges"
            />
            <ListRow
              level="check"
              count={c.checkoutAbandoned}
              title="Opened checkout, never subscribed"
              detail="Have a Paddle customer id and no subscription"
              tab="outreach"
            />
          </ul>
        </ChartCard>
      </section>
    </div>
  )
}
