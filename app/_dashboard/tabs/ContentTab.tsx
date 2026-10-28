"use client"

import { BookOpen, CheckCircle2, FileText, Gauge, Hourglass, Inbox } from "lucide-react"

import { BarChart } from "@/components/charts"
import { cx } from "@/lib/utils/cx"

import { STARTER_ITEMS, STARTER_SECTIONS } from "../plans"
import type { MatrixRow, TabProps } from "../types"
import {
  ChartCard,
  type Column,
  DataTable,
  Empty,
  KpiCard,
  Num,
  SectionHeading,
  TabLink,
  heat,
  number,
  pct,
} from "../ui"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0

// Status down the side, content across. Cells are shaded by count so the
// big groups show at a glance; Empty keeps an amber tint on every row.
const CONTENT_BUCKETS = [
  { key: "empty", label: "Empty" },
  { key: "noItems", label: "No items" },
  { key: "few", label: "1–2 items" },
  { key: "many", label: "3+ items" },
] as const

const matrixColumns = (max: number): Column<MatrixRow>[] => [
  {
    key: "status",
    header: "Status",
    cell: (r) => <span className="font-semibold text-ink">{r.status}</span>,
  },
  ...CONTENT_BUCKETS.map(
    (b): Column<MatrixRow> => ({
      key: b.key,
      header:
        b.key === "empty" ? (
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-amber-ink">
            {b.label}
          </span>
        ) : (
          b.label
        ),
      align: "right",
      cell: (r) =>
        r.status === "All" ? (
          number(r[b.key])
        ) : (
          <span
            className={cx(
              "-my-1 inline-block min-w-14 rounded-md px-2 py-1",
              b.key === "empty" && !r[b.key] && "bg-amber-soft/60",
            )}
            style={heat(r[b.key], max)}
          >
            <Num value={r[b.key]} />
          </span>
        ),
    }),
  ),
  {
    key: "total",
    header: "Total",
    align: "right",
    cell: (r) => <span className="font-bold text-ink">{number(r.total)}</span>,
  },
]

// What the catalogues hold. Empty catalogues lead: they are most of what new
// users create, and none of them can earn a view.
export default function ContentTab({ view, animationKey }: TabProps) {
  const { content: c } = view
  const maxCell = Math.max(
    0,
    ...c.matrix.flatMap((r) => CONTENT_BUCKETS.map((b) => r[b.key])),
  )
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
              <DataTable
                columns={matrixColumns(maxCell)}
                rows={c.matrix}
                rowKey={(r) => r.status}
                foot={[
                  c.matrix.reduce(
                    (t, r) => ({
                      ...t,
                      empty: t.empty + r.empty,
                      noItems: t.noItems + r.noItems,
                      few: t.few + r.few,
                      many: t.many + r.many,
                      total: t.total + r.total,
                    }),
                    { status: "All", empty: 0, noItems: 0, few: 0, many: 0, total: 0 },
                  ),
                ]}
                minWidth={460}
              />
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
