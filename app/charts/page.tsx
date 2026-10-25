"use client"

import {
  AreaChart,
  BarChart,
  Card,
  DonutChart,
  LineChart,
} from "@/components/charts"

import {
  performanceData,
  planDistribution,
  revenueData,
  trafficData,
  usageData,
} from "./data"

const currency = (n: number) =>
  `$${Intl.NumberFormat("en-US", { notation: "compact" }).format(n)}`

const number = (n: number) => Intl.NumberFormat("en-US").format(n)

const ms = (n: number) => `${n} ms`

export default function ChartsPage() {
  return (
    <main className="min-h-screen bg-bg-alt px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm font-bold text-amber-ink">
            Chart library
          </p>
          <h1 className="text-3xl font-semibold text-ink">
            Tremor charts
          </h1>
          <p className="text-sm text-ink-2">
            Reusable, Tailwind-native chart components built on Recharts.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-ink-2">
            Area chart - Revenue vs Expenses
          </h2>
          <Card>
            <AreaChart
              data={revenueData}
              index="date"
              categories={["Revenue", "Expenses"]}
              colors={["amber", "violet"]}
              valueFormatter={currency}
              yAxisWidth={56}
            />
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-ink-2">
            Stacked bar chart - Daily active users by plan
          </h2>
          <Card>
            <BarChart
              data={usageData}
              index="day"
              categories={["Free", "Pro", "Enterprise"]}
              colors={["amber", "violet", "magenta"]}
              type="stacked"
              valueFormatter={number}
              yAxisWidth={48}
            />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-ink-2">
              Line chart - P95 latency
            </h2>
            <Card>
              <LineChart
                data={performanceData}
                index="month"
                categories={["API p95", "DB p95", "Cache p95"]}
                colors={["amber", "violet", "magenta"]}
                valueFormatter={ms}
                yAxisWidth={56}
              />
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-ink-2">
              Horizontal bar chart - Traffic sources
            </h2>
            <Card>
              <BarChart
                data={trafficData}
                index="source"
                categories={["visits"]}
                colors={["amber"]}
                layout="vertical"
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={80}
              />
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-ink-2">
            Donut chart - Plan distribution
          </h2>
          <Card>
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={planDistribution}
                  category="name"
                  value="users"
                  colors={["amber", "violet", "magenta", "green"]}
                  valueFormatter={number}
                  showLabel
                  label={`${number(
                    planDistribution.reduce((s, p) => s + p.users, 0),
                  )} users`}
                  className="h-48 w-48"
                />
                <p className="text-xs text-ink-3">
                  Donut variant
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={planDistribution}
                  category="name"
                  value="users"
                  colors={["amber", "violet", "magenta", "green"]}
                  valueFormatter={number}
                  variant="pie"
                  className="h-48 w-48"
                />
                <p className="text-xs text-ink-3">
                  Pie variant
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {planDistribution.map((p, i) => {
                  const palette = [
                    "bg-series-amber",
                    "bg-series-violet",
                    "bg-series-magenta",
                    "bg-series-green",
                  ]
                  return (
                    <li key={p.name} className="flex items-center gap-3">
                      <span
                        className={`size-2.5 rounded-full ${palette[i]}`}
                        aria-hidden
                      />
                      <span className="w-24 text-ink-2">
                        {p.name}
                      </span>
                      <span className="font-medium tabular-nums text-ink">
                        {number(p.users)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-ink-2">
            Compact - Gradient area, no axes (KPI sparkline)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-ink-3">
                Monthly revenue
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {currency(62400)}
              </p>
              <AreaChart
                data={revenueData}
                index="date"
                categories={["Revenue"]}
                colors={["amber"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-3">
                Expenses
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {currency(26100)}
              </p>
              <AreaChart
                data={revenueData}
                index="date"
                categories={["Expenses"]}
                colors={["amber"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-3">
                API latency p95
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {ms(102)}
              </p>
              <LineChart
                data={performanceData}
                index="month"
                categories={["API p95"]}
                colors={["amber"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
