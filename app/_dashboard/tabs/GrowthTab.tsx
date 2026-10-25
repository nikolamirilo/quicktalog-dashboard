"use client"

import { AreaChart, BarChart, Card } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  KpiCard,
  SectionHeading,
  compactNumber,
  decimal,
  number,
} from "../ui"

// Platform-wide volume over time: how many users and catalogues arrived, and
// how much traffic the whole platform served.
export default function GrowthTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { totals, growth, pageviewsSeries, creationSplit } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Growth"
        subtitle="Totals and trends for the selected period"
      />

      <section
        key={`${animationKey}-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New users"
          value={number(totals.users)}
          hint={`${number(totals.activeUsers)} active (have traffic)`}
        />
        <KpiCard
          label="New catalogues"
          value={number(totals.catalogues)}
          hint={`${number(creationSplit.cataloguesByNewUsers)} by new users · ${number(creationSplit.cataloguesByExistingUsers)} by existing`}
        />
        <KpiCard
          label="Pageviews"
          value={compactNumber(totals.pageviews)}
          hint={`${compactNumber(totals.uniqueVisitors)} unique visitors`}
        />
        <KpiCard
          label="Existing users"
          value={number(creationSplit.existingUsers)}
          hint={`${number(creationSplit.activeExistingCreators)} created something this period`}
        />
      </section>

      {/* Two separate ratios. A single "catalogues per user" would have to mix
          catalogues from the existing base into a count of new signups, and
          the result describes neither group. */}
      <SectionHeading
        title="Who is creating"
        subtitle="New signups and the existing base produce catalogues at very different rates — kept apart on purpose"
      />

      <section
        key={`${animationKey}-split-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Catalogues / new user"
          value={decimal(creationSplit.perNewUser)}
          hint={`${number(creationSplit.cataloguesByNewUsers)} ÷ ${number(creationSplit.newUsers)} new users`}
        />
        <KpiCard
          label="Catalogues / existing user"
          value={decimal(creationSplit.perExistingUser)}
          hint={`${number(creationSplit.cataloguesByExistingUsers)} ÷ ${number(creationSplit.existingUsers)} existing users`}
        />
        <KpiCard
          label="From new users"
          value={number(creationSplit.cataloguesByNewUsers)}
          hint={`${
            totals.catalogues
              ? Math.round(
                  (creationSplit.cataloguesByNewUsers / totals.catalogues) * 100,
                )
              : 0
          }% of catalogues this period`}
        />
        <KpiCard
          label="From existing users"
          value={number(creationSplit.cataloguesByExistingUsers)}
          hint={`${number(creationSplit.activeExistingCreators)} distinct existing creators`}
        />
      </section>

      <section key={`${animationKey}-split-chart`} className="animate-chart-in">
        <ChartCard
          title="Catalogues created: new vs existing users"
          subtitle="Stacked per period, split by whether the creator signed up inside the period"
        >
          <BarChart
            data={creationSplit.overTime}
            index="date"
            categories={["By new users", "By existing users"]}
            colors={["amber", "violet"]}
            type="stacked"
            valueFormatter={number}
            yAxisWidth={44}
            className="h-64"
          />
        </ChartCard>
      </section>

      <SectionHeading
        title="Growth trends"
        subtitle="Cumulative totals reset to 0 at the start of the selected period"
      />

      <section
        key={animationKey}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
                Users
              </h3>
              <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                {number(
                  growth.users.cumulative[growth.users.cumulative.length - 1]
                    ?.Users ?? 0,
                )}
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-full bg-amber-soft px-3 text-[13px] font-bold text-amber-ink">
              Cumulative
            </span>
          </div>
          <AreaChart
            data={growth.users.cumulative}
            index="date"
            categories={["Users"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={56}
            startEndOnly
            className="h-64"
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
                Catalogues
              </h3>
              <p className="font-head text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                {number(
                  growth.catalogues.cumulative[
                    growth.catalogues.cumulative.length - 1
                  ]?.Catalogues ?? 0,
                )}
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-full bg-amber-soft px-3 text-[13px] font-bold text-amber-ink">
              Cumulative
            </span>
          </div>
          <AreaChart
            data={growth.catalogues.cumulative}
            index="date"
            categories={["Catalogues"]}
            colors={["amber"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={56}
            startEndOnly
            className="h-64"
          />
        </Card>
      </section>

      <section
        key={`${animationKey}-bars`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card>
          <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            New users
          </h3>
          <BarChart
            data={growth.users.monthly}
            index="date"
            categories={["Users"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-52"
          />
        </Card>
        <Card>
          <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            New catalogues
          </h3>
          <BarChart
            data={growth.catalogues.monthly}
            index="date"
            categories={["Catalogues"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-52"
          />
        </Card>
      </section>

      <SectionHeading
        title="Pageviews"
        subtitle="Platform-wide traffic over the selected period"
      />
      <Card>
        <AreaChart
          key={animationKey}
          data={pageviewsSeries}
          index="date"
          categories={["Pageviews", "Unique visitors"]}
          colors={["amber", "violet"]}
          valueFormatter={number}
          yAxisWidth={56}
          startEndOnly
          className="animate-chart-in h-64"
        />
      </Card>
    </div>
  )
}
