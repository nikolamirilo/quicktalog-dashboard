"use client"

import {
  CalendarX,
  Percent,
  TrendingDown,
  Wallet,
} from "lucide-react"

import { AreaChart, BarChart, Card, DonutChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  colorsFor,
  DonutLegend,
  Empty,
  KpiCard,
  RankingList,
  SectionHeading,
  money,
  number,
  pct,
  toRanking,
} from "../ui"

// Money: who is paying, on which plan, and who is about to leave.
export default function RevenueTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { subscriptions, revenue, plans, totals } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Revenue & retention"
        subtitle="Current subscription state · are we converting and keeping payers?"
      />

      <section
        key={`${animationKey}-rev-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Active payers"
          icon={Wallet}
          value={number(revenue.activePayers)}
          hint={
            revenue.mrr != null
              ? `${money(revenue.mrr)} MRR · ${money(revenue.arr ?? 0)} ARR`
              : "MRR needs Paddle price sync"
          }
        />
        <KpiCard
          label="Paid conversion"
          icon={Percent}
          value={pct(subscriptions.paidConversionPct)}
          hint="active payers ÷ all users"
        />
        <KpiCard
          label="Churn rate"
          icon={TrendingDown}
          value={pct(subscriptions.churnRate)}
          hint="canceled ÷ (active + canceled)"
        />
        <KpiCard
          label="Scheduled cancellations"
          icon={CalendarX}
          value={number(subscriptions.scheduledCancellations)}
          hint="upcoming churn (early warning)"
        />
      </section>

      <section
        key={`${animationKey}-rev-funnel`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Conversion funnel">
          <RankingList
            rows={toRanking(subscriptions.conversionFunnel)}
            valueLabel="Customers"
          />
        </ChartCard>

        <ChartCard title="Subscription status">
          {subscriptions.statusMix.length === 0 ? (
            <Empty label="No subscriptions." />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <DonutChart
                  data={subscriptions.statusMix}
                  category="name"
                  value="value"
                  colors={colorsFor(subscriptions.statusMix, "subscription")}
                  valueFormatter={number}
                  className="h-44 w-44"
                />
              </div>
              <div className="pt-4">
                <DonutLegend
                  data={subscriptions.statusMix}
                  colors={colorsFor(subscriptions.statusMix, "subscription")}
                />
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Active payers by plan">
          {revenue.byPlan.length === 0 ? (
            <Empty label="No active payers." />
          ) : (
            <BarChart
              data={revenue.byPlan}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={88}
              className="h-full min-h-56 flex-1"
            />
          )}
        </ChartCard>
      </section>

      <div key={`${animationKey}-rev-trend`} className="animate-chart-in">
        <Card>
          <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            New subscriptions over time
          </h3>
          <AreaChart
            data={subscriptions.newOverTime}
            index="date"
            categories={["New subscriptions"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={44}
            startEndOnly
            className="h-52"
          />
        </Card>
      </div>

      <SectionHeading
        title="Plans"
        subtitle="Plan mix across users who signed up in the selected period"
      />

      <section
        key={`${animationKey}-plans`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Users by plan">
          {plans.byUsers.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={plans.byUsers}
                    category="name"
                    value="value"
                    colors={colorsFor(plans.byUsers, "plan")}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[13px] text-ink-3">
                      Users
                    </p>
                    <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                      {number(totals.users)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend data={plans.byUsers} colors={colorsFor(plans.byUsers, "plan")} />
              </div>
            </>
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Users per plan">
            {plans.byUsers.length === 0 ? (
              <Empty />
            ) : (
              <BarChart
                data={plans.byUsers}
                index="name"
                categories={["value"]}
                colors={["amber"]}
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={40}
                className="h-full min-h-64 flex-1"
              />
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  )
}
