"use client"

import { DollarSign, RotateCcw, ShoppingCart, TrendingUp } from "lucide-react"

import { AreaChart, BarChart } from "@/components/charts"

import type { TabProps } from "../types"
import {
  ChartCard,
  Delta,
  Empty,
  KpiCard,
  Note,
  SectionHeading,
  money,
  number,
  pct,
} from "../ui"

// Money, from Paddle: MRR, what was collected, refunds and checkout. Without
// Paddle the MRR is an estimate at list prices and the rest stays empty.
export default function RevenueTab({ view, animationKey }: TabProps) {
  const { revenue: r, customers } = view
  const cur = (n: number) => money(n, r.currency)
  const mrrHint =
    r.mrrSource === "metrics"
      ? "at the end of the range, vs its start"
      : r.mrrSource === "subscriptions"
        ? "paying subscriptions at their price, before discounts"
        : `estimate: paying subscriptions at monthly list price${r.unpriced ? `, ${number(r.unpriced)} without a known price left out` : ""}`

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Revenue"
        subtitle="Recurring revenue, what was collected, refunds and checkout conversion"
      />

      {!r.connected && (
        <Note tone="amber">
          Paddle isn&apos;t connected. Add a read-only <code>PADDLE_API_KEY</code>{" "}
          with the metrics.read, subscription.read and transaction.read
          permissions to the environment. Until then MRR is an estimate from list
          prices, and revenue, refunds and checkout stay empty.
        </Note>
      )}

      <section
        key={`${animationKey}-rev-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label={r.mrrSource === "estimate" ? "MRR (estimate)" : "MRR"}
          icon={TrendingUp}
          value={cur(r.mrr)}
          delta={
            r.mrrSource === "metrics" ? (
              <Delta value={r.mrr} previous={r.mrrStart} />
            ) : undefined
          }
          hint={mrrHint}
          scope={r.mrrSource === "metrics" ? "In range" : "Right now"}
        />
        <KpiCard
          label="Net revenue"
          icon={DollarSign}
          value={r.revenue == null ? "—" : cur(r.revenue)}
          pending={r.revenue == null}
          hint={r.revenue == null ? "from Paddle" : "collected in range"}
          scope="In range"
        />
        <KpiCard
          label="Refunds"
          icon={RotateCcw}
          value={r.refunds == null ? "—" : cur(r.refunds)}
          pending={r.refunds == null}
          hint={
            r.refundRate == null
              ? "from Paddle; first purchases have a 10-day guarantee"
              : `${pct(r.refundRate)} of revenue`
          }
          scope="In range"
        />
        <KpiCard
          label="Checkout conversion"
          icon={ShoppingCart}
          value={r.checkout ? pct(r.checkout.rate) : "—"}
          pending={!r.checkout}
          hint={
            r.checkout
              ? `${number(r.checkout.completed)} of ${number(r.checkout.sessions)} checkouts`
              : `${number(customers.checkoutAbandoned)} opened checkout and never subscribed`
          }
          scope={r.checkout ? "In range" : "All time"}
        />
      </section>

      <section
        key={`${animationKey}-rev-trend`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="MRR" subtitle="At the end of each period" scope="In range">
          {r.mrrSeries ? (
            <AreaChart
              data={r.mrrSeries}
              index="date"
              categories={["MRR"]}
              colors={["amber"]}
              valueFormatter={cur}
              showLegend={false}
              yAxisWidth={64}
              startEndOnly
              className="h-60"
            />
          ) : (
            <Empty label="Needs Paddle's metrics (metrics.read)." />
          )}
        </ChartCard>
        <ChartCard title="Net revenue" subtitle="Collected per period" scope="In range">
          {r.revenueSeries ? (
            <BarChart
              data={r.revenueSeries}
              index="date"
              categories={["Revenue"]}
              colors={["amber"]}
              valueFormatter={cur}
              showLegend={false}
              yAxisWidth={64}
              className="h-60"
            />
          ) : (
            <Empty label="Needs Paddle's metrics (metrics.read)." />
          )}
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-rev-mix`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard
          title="MRR by plan"
          subtitle={
            r.mrrSource === "estimate"
              ? "Estimate at monthly list prices"
              : "Paying subscriptions, per month"
          }
          scope="Right now"
        >
          {r.byPlan.length === 0 ? (
            <Empty label="No paying subscriptions." />
          ) : (
            <BarChart
              data={r.byPlan}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={cur}
              yAxisWidth={88}
              className="h-full min-h-48 flex-1"
            />
          )}
        </ChartCard>
        <ChartCard
          title="Billing cycle"
          subtitle="Paying subscriptions, monthly or annual"
          scope="Right now"
        >
          {customers.billing ? (
            <BarChart
              data={customers.billing}
              index="name"
              categories={["value"]}
              colors={["amber"]}
              layout="vertical"
              showLegend={false}
              valueFormatter={number}
              yAxisWidth={72}
              className="h-full min-h-48 flex-1"
            />
          ) : (
            <Empty label="Needs Paddle's subscriptions (subscription.read)." />
          )}
        </ChartCard>
      </section>
    </div>
  )
}
