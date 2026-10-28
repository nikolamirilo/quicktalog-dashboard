"use client"

import { BookOpen, CheckCircle2, FileText, Gauge, Hourglass, Inbox } from "lucide-react"

import { BarChart } from "@/components/charts"
import { cx } from "@/lib/utils/cx"

import { STARTER_ITEMS, STARTER_SECTIONS } from "../plans"
import type { TabProps } from "../types"
import {
  ChartCard,
  Empty,
  KpiCard,
  SectionHeading,
  TabLink,
  number,
  pct,
} from "../ui"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

const MATRIX_COLUMNS = [
  { key: "empty", label: "Empty" },
  { key: "noItems", label: "No items" },
  { key: "few", label: "1–2 items" },
  { key: "many", label: "3+ items" },
] as const

// What the catalogues hold. Empty catalogues lead: they are most of what new
// users create, and none of them can earn a view.
export default function ContentTab({ view, animationKey }: TabProps) {
  const { content: c } = view
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Content"
        subtitle="What the catalogues hold, how many are empty, and how complete the built ones are"
      />

      <section
        key={`${animationKey}-con-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Catalogues"
          icon={BookOpen}
          value={number(c.total)}
          hint={`${number(c.startedInRange)} started in range`}
          scope="All time"
        />
        <KpiCard
          label="Built"
          icon={CheckCircle2}
          value={number(c.built)}
          hint={`${pct(share(c.built, c.total))} · ${number(c.builtInRange)} in range`}
          scope="All time"
        />
        <KpiCard
          label="Empty"
          icon={Inbox}
          value={number(c.empty)}
          hint={`${pct(share(c.empty, c.total))} · ${number(c.emptyOwners)} owners have nothing else`}
          scope="All time"
          tone={c.empty > 0 ? "warn" : undefined}
          action={<TabLink tab="outreach">Email the owners</TabLink>}
        />
        <KpiCard
          label="Median built catalogue"
          icon={FileText}
          value={`${c.medianSections} · ${c.medianItems}`}
          hint="sections · items"
          scope="All time"
        />
      </section>

      <section key={`${animationKey}-con-monthly`} className="animate-chart-in">
        <ChartCard
          title="Catalogues started"
          subtitle={`Per period, built or still empty today · ${number(c.emptyInRange)} of ${number(c.startedInRange)} in range are empty`}
          scope="In range"
        >
          <BarChart
            data={c.monthly}
            index="date"
            categories={["Built", "Empty"]}
            colors={["amber", "violet"]}
            type="stacked"
            valueFormatter={number}
            yAxisWidth={40}
            className="h-60"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-con-shape`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <ChartCard
            title="Status × content"
            subtitle="Every catalogue, by status and by how much content it holds"
            scope="All time"
          >
            {c.matrix.length === 0 ? (
              <Empty label="No catalogues yet." />
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[460px] text-sm tabular-nums">
                  <thead>
                    <tr className="text-[12.5px] text-ink-3">
                      <th className="px-2 py-2 text-left font-semibold">Status</th>
                      {MATRIX_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={cx(
                            "px-2 py-2 text-right font-semibold",
                            col.key === "empty" && "rounded-t-md bg-amber-soft text-amber-ink",
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.matrix.map((row, i) => (
                      <tr key={row.status} className="border-t border-line">
                        <td className="px-2 py-2.5 text-ink">{row.status}</td>
                        {MATRIX_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={cx(
                              "px-2 py-2.5 text-right",
                              col.key === "empty"
                                ? cx(
                                    "bg-amber-soft font-bold text-ink",
                                    i === c.matrix.length - 1 && "rounded-b-md",
                                  )
                                : "text-ink-2",
                            )}
                          >
                            {number(row[col.key])}
                          </td>
                        ))}
                        <td className="px-2 py-2.5 text-right font-semibold text-ink">
                          {number(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {c.publishedEmpty > 0 && (
              <p className="mt-3 text-[13px] text-ink-3">
                {number(c.publishedEmpty)} published{" "}
                {c.publishedEmpty === 1 ? "catalogue is" : "catalogues are"} empty:
                their visitors see a blank page.
              </p>
            )}
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard
            title="Completeness"
            subtitle={`Share of the ${number(c.built)} built catalogues with each part filled in`}
            scope="All time"
          >
            {c.built === 0 ? (
              <Empty label="No built catalogues yet." />
            ) : (
              <BarChart
                data={c.completeness}
                index="name"
                categories={["value"]}
                colors={["amber"]}
                layout="vertical"
                showLegend={false}
                valueFormatter={pct}
                yAxisWidth={80}
                className="h-full min-h-56 flex-1"
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section
        key={`${animationKey}-con-more`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <KpiCard
          label="At the Starter limit"
          icon={Gauge}
          value={number(c.starterFull)}
          hint={`people on Starter with a catalogue at ${STARTER_ITEMS} items or ${STARTER_SECTIONS} sections`}
          scope="Right now"
          action={<TabLink tab="outreach">Upgrade list</TabLink>}
        />
        <KpiCard
          label="Freshness"
          icon={Hourglass}
          value="—"
          pending
          hint="Hidden until catalogues record when their content last changed. updated_at also moves on bulk updates, so it can't tell."
          scope="All time"
        />
      </section>
    </div>
  )
}
