import { FEATURES, SECTION_TYPES, type FeatureKey } from "./features"
import {
  LIST_PRICE,
  PAYING_STATUSES,
  STARTER_ITEMS,
  STARTER_SECTIONS,
} from "./plans"
import type {
  Attention,
  Bucket,
  CatalogueRow,
  CohortRow,
  DashboardData,
  DashboardView,
  FeatureAdoption,
  FeatureBreakdown,
  MatrixRow,
  MetricSeries,
  RangeKey,
  Ranking,
  SectionTypeUsage,
  Series,
  SourceStatus,
  UserRow,
} from "./types"

// Definitions used everywhere below:
// - Started: a catalogue row exists. Built: it has at least one content
//   section. Published: status `active` and built.
// - Activated user: owns a built catalogue.
// - Paying customer: a Paddle customer with an active or past-due
//   subscription, counted once however many subscription rows they have.
// - Visitor-days: daily unique visitors summed over days and catalogues; one
//   person on three days counts three times.

const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, "0")

const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const round1 = (n: number) => Math.round(n * 10) / 10
const pctOf = (part: number, whole: number) =>
  whole ? round1((part / whole) * 100) : 0

const bucketise = (
  rows: { key: string | null | undefined }[],
  prettify?: (k: string) => string,
): Bucket[] => {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const k = (r.key ?? "-").toString().trim() || "-"
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name: prettify ? prettify(name) : name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

const enumerateDays = (start: Date, end: Date): string[] => {
  const out: string[] = []
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  )
  const last = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  )
  while (cur.getTime() <= last) {
    out.push(dayKey(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

const enumerateMonths = (start: Date, end: Date): string[] => {
  const out: string[] = []
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)
  while (cur.getTime() <= last) {
    out.push(monthKey(cur))
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return out
}

export const addDays = (iso: string, n: number) =>
  dayKey(new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + n * DAY_MS))

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

const shortDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

export const isBuilt = (c: CatalogueRow) => c.contentSections > 0
const isLiveStatus = (c: CatalogueRow) =>
  (c.status ?? "").toLowerCase() === "active"
export const isPublished = (c: CatalogueRow) => isLiveStatus(c) && isBuilt(c)

// The newest day the analytics import has written.
export function lastAnalyticsDay(data: DashboardData): string | null {
  let last: string | null = null
  for (const a of data.analytics) if (!last || a.day > last) last = a.day
  return last
}

// Everything that belongs to an internal or test account, left out.
// Paddle's own metrics (MRR, revenue) are account-wide and stay as they are.
export function withoutInternal(data: DashboardData): DashboardData {
  const internal = new Set(data.users.filter((u) => u.internal).map((u) => u.id))
  if (internal.size === 0) return data
  const customers = new Set(
    data.users.flatMap((u) => (u.internal && u.customer_id ? [u.customer_id] : [])),
  )
  const catalogues = new Set(
    data.catalogues.filter((c) => internal.has(c.user_id)).map((c) => c.id),
  )
  return {
    ...data,
    users: data.users.filter((u) => !u.internal),
    catalogues: data.catalogues.filter((c) => !internal.has(c.user_id)),
    analytics: data.analytics.filter((a) => !internal.has(a.user_id)),
    subscriptions: data.subscriptions.filter((s) => !customers.has(s.customer_id)),
    aiCredits: data.aiCredits.filter((a) => !internal.has(a.user_id)),
    qrConfigs: data.qrConfigs.filter((q) => !catalogues.has(q.catalogue_id)),
    catalogueSubscribers: data.catalogueSubscribers.filter(
      (s) => !catalogues.has(s.catalogue_id),
    ),
    userThemes: data.userThemes.filter((t) => !internal.has(t.user_id)),
    paddle: data.paddle && {
      ...data.paddle,
      subscriptions:
        data.paddle.subscriptions?.filter((s) => !customers.has(s.customerId)) ??
        null,
    },
  }
}

export function resolveRange(
  rangeKey: RangeKey,
  customStart: string,
  customEnd: string,
  data: DashboardData,
): { start: string; end: string } {
  const todayISO = new Date().toISOString().slice(0, 10)
  if (rangeKey === "CUSTOM") {
    return { start: customStart || todayISO, end: customEnd || todayISO }
  }
  if (rangeKey === "ALL") {
    let earliest = Date.now()
    for (const u of data.users) {
      if (u.created_at) {
        const t = new Date(u.created_at).getTime()
        if (t < earliest) earliest = t
      }
    }
    for (const c of data.catalogues) {
      const t = new Date(c.created_at).getTime()
      if (t < earliest) earliest = t
    }
    return {
      start: new Date(earliest).toISOString().slice(0, 10),
      end: todayISO,
    }
  }
  const months = ({ "1M": 1, "3M": 3, "6M": 6, "12M": 12 } as const)[rangeKey]
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - months)
  return { start: d.toISOString().slice(0, 10), end: todayISO }
}

// The period of the same length that ends the day before `start`.
export const previousRange = (start: string, end: string) => {
  const prevEnd = addDays(start, -1)
  return { start: addDays(prevEnd, -daysBetween(start, end)), end: prevEnd }
}

// One subscription, from Paddle when it is connected (with cancel dates and
// prices), else from the database mirror.
type Sub = {
  customerId: string
  status: string
  createdAt: string | null
  canceledAt: string | null
  priceId: string | null
  scheduledAction: string | null
  monthly: number | null
  interval: string | null
}

const subsOf = (data: DashboardData): { subs: Sub[]; fromPaddle: boolean } => {
  const paddle = data.paddle?.subscriptions
  if (paddle) {
    return {
      fromPaddle: true,
      subs: paddle.map((s) => ({
        customerId: s.customerId,
        status: s.status.toLowerCase(),
        createdAt: s.createdAt,
        canceledAt: s.canceledAt,
        priceId: s.priceIds[0] ?? null,
        scheduledAction: s.scheduledAction,
        monthly: s.monthlyAmount,
        interval: s.interval,
      })),
    }
  }
  return {
    fromPaddle: false,
    subs: data.subscriptions.map((s) => ({
      customerId: s.customer_id,
      status: (s.subscription_status ?? "").toLowerCase(),
      createdAt: s.created_at,
      canceledAt: null,
      priceId: s.price_id,
      scheduledAction: null,
      monthly: null,
      interval: null,
    })),
  }
}

const isPaying = (s: Sub) => PAYING_STATUSES.includes(s.status)

type CustomerState = "Paying" | "Trialing" | "Paused" | "Churned"
const stateOf = (subs: Sub[]): CustomerState =>
  subs.some(isPaying)
    ? "Paying"
    : subs.some((s) => s.status === "trialing")
      ? "Trialing"
      : subs.some((s) => s.status === "paused")
        ? "Paused"
        : "Churned"

// The last value at or before `day` in a daily metric.
const valueAt = (series: MetricSeries, day: string): number | null => {
  let v: number | null = null
  for (const p of series.points) if (p.day <= day && p.amount != null) v = p.amount
  return v
}

export function computeView(
  data: DashboardData,
  startISO: string,
  endISO: string,
  // The last day the traffic figures read; earlier than `endISO` when the
  // analytics import hasn't caught up.
  untilISO: string,
): DashboardView {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T23:59:59.999Z`)
  const inRange = (iso: string | null | undefined): boolean =>
    iso != null && iso.slice(0, 10) >= startISO && iso.slice(0, 10) <= endISO

  // Bucket size: daily for short ranges (≤90 days), monthly otherwise.
  const spanDays = daysBetween(startISO, endISO) + 1
  const useDaily = spanDays <= 90
  const periods = useDaily ? enumerateDays(start, end) : enumerateMonths(start, end)
  const periodKeyOf = (iso: string) => (useDaily ? iso.slice(0, 10) : iso.slice(0, 7))
  const periodLabel = useDaily ? dayLabel : monthLabel
  const untilKey = periodKeyOf(untilISO)
  const countPer = (isos: (string | null)[]) => {
    const m = new Map<string, number>(periods.map((p) => [p, 0]))
    for (const iso of isos) {
      if (!iso) continue
      const k = periodKeyOf(iso)
      if (m.has(k)) m.set(k, m.get(k)! + 1)
    }
    return m
  }
  // `afterData` leaves periods past the last analytics day empty, so a
  // stalled import shows as a gap instead of a drop to zero.
  const series = (
    cols: Record<string, Map<string, number>>,
    afterData = false,
  ): Series =>
    periods.map((p) => {
      const row: Record<string, string | number | null> = { date: periodLabel(p) }
      for (const [name, m] of Object.entries(cols)) {
        row[name] = afterData && p > untilKey ? null : (m.get(p) ?? 0)
      }
      return row
    })

  const usersInRange = data.users.filter((u) => inRange(u.created_at))
  const newUserIds = new Set(usersInRange.map((u) => u.id))
  const cataloguesInRange = data.catalogues.filter((c) => inRange(c.created_at))
  const builtInRange = cataloguesInRange.filter(isBuilt)
  const analyticsInRange = data.analytics.filter(
    (a) => a.day >= startISO && a.day <= untilISO,
  )
  const planNameById = new Map(data.plans.map((p) => [p.id, p.name]))
  const planOf = (u: UserRow) =>
    u.plan_id ? (planNameById.get(u.plan_id) ?? "Unknown") : "Starter"
  const userById = new Map(data.users.map((u) => [u.id, u]))

  // Top 8 users by a per-user count, labelled by name, then email.
  const rankUsers = (counts: Map<string, number>): Ranking[] =>
    Array.from(counts.entries())
      .map(([id, value]) => {
        const p = data.people[id]
        return {
          id,
          name: p?.name?.trim() || p?.email || id.slice(0, 8),
          value,
          meta: p?.email && p?.name ? p.email : undefined,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  const countBy = <T>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
    return m
  }

  // ── Per-user facts, counted to date ──────────────────────────────────────
  const startedUsers = new Set<string>()
  const builtUsers = new Set<string>()
  const publishedUsers = new Set<string>()
  const viewedUsers = new Set<string>()
  const viewedCatalogues = new Set(
    data.analytics.flatMap((a) =>
      a.catalogue_id && a.pageviews > 0 ? [a.catalogue_id] : [],
    ),
  )
  for (const c of data.catalogues) {
    startedUsers.add(c.user_id)
    if (isBuilt(c)) builtUsers.add(c.user_id)
    if (isPublished(c)) {
      publishedUsers.add(c.user_id)
      if (viewedCatalogues.has(c.id)) viewedUsers.add(c.user_id)
    }
  }
  const { subs, fromPaddle } = subsOf(data)
  const subscribedCustomers = new Set([
    ...data.subscriptions.map((s) => s.customer_id),
    ...subs.map((s) => s.customerId),
  ])
  const everSubscribed = (u: UserRow) =>
    !!u.customer_id && subscribedCustomers.has(u.customer_id)

  // ── Signups ──────────────────────────────────────────────────────────────
  const signupsPer = countPer(usersInRange.map((u) => u.created_at))
  const activatedPer = countPer(
    usersInRange.filter((u) => builtUsers.has(u.id)).map((u) => u.created_at),
  )
  let running = 0
  const cumulativeUsers: Series = periods.map((p) => ({
    date: periodLabel(p),
    Users: (running += signupsPer.get(p) ?? 0),
  }))

  const cohortMonths = enumerateMonths(start, end)
  const cohorts: CohortRow[] = cohortMonths.map((m) => {
    const us = usersInRange.filter((u) => u.created_at?.slice(0, 7) === m)
    return {
      cohort: monthLabel(m),
      signups: us.length,
      started: us.filter((u) => startedUsers.has(u.id)).length,
      built: us.filter((u) => builtUsers.has(u.id)).length,
      paying: us.filter(everSubscribed).length,
    }
  })

  const startedCohort = usersInRange.filter((u) => startedUsers.has(u.id)).length
  const acquisition = {
    weeklyAvg: round1(usersInRange.length / (spanDays / 7)),
    startedPct: pctOf(startedCohort, usersInRange.length),
    sources: bucketise(
      usersInRange.map((u) => ({ key: u.acquisition_source })),
      (s) => (s === "-" ? "Not recorded" : titleCase(s)),
    ),
    sourceRecorded: data.users.filter((u) => u.acquisition_source).length,
    totalUsers: data.users.length,
    byBusinessType: bucketise(
      cataloguesInRange.map((c) => ({ key: c.business_type })),
      titleCase,
    ).slice(0, 8),
    byLanguage: bucketise(
      cataloguesInRange.map((c) => ({ key: c.language?.toUpperCase() ?? null })),
    ),
    cohorts,
  }

  // ── Activation: the signups in range, and how far each got to date ───────
  const cohortBuilt = usersInRange.filter((u) => builtUsers.has(u.id)).length
  const cohortPublished = usersInRange.filter((u) => publishedUsers.has(u.id)).length
  const cohortViewed = usersInRange.filter((u) => viewedUsers.has(u.id)).length
  const cohortPaid = usersInRange.filter(everSubscribed).length
  const stalledEmpty = startedCohort - cohortBuilt
  const neverStarted = usersInRange.length - startedCohort

  // A signup month whose last day is under 30 days ago hasn't had time to
  // build yet; it is drawn as its own series.
  const maturingAfter = Date.now() - 30 * DAY_MS
  const cohortRates = cohortMonths.map((m) => {
    const [y, mo] = m.split("-").map(Number)
    const row = cohorts[cohortMonths.indexOf(m)]
    return {
      date: monthLabel(m),
      rate: row.signups ? pctOf(row.built, row.signups) : null,
      maturing: Date.UTC(y, mo, 0) > maturingAfter,
    }
  })
  const firstMaturing = cohortRates.findIndex((r) => r.maturing)
  const rateByCohort: Series = cohortRates.map((r, i) => ({
    date: r.date,
    "Activation %": r.maturing ? null : r.rate,
    // Starts at the last settled month, so the two lines join.
    "Still maturing":
      r.maturing || (firstMaturing > 0 && i === firstMaturing - 1) ? r.rate : null,
  }))

  const existingUserIds = new Set(
    data.users
      .filter((u) => u.created_at && u.created_at.slice(0, 10) < startISO)
      .map((u) => u.id),
  )
  const builtByNew = builtInRange.filter((c) => newUserIds.has(c.user_id))
  const builtByExisting = builtInRange.filter((c) => !newUserIds.has(c.user_id))
  const activation = {
    activated: cohortBuilt,
    rate: pctOf(cohortBuilt, usersInRange.length),
    funnel: [
      { name: "Signed up", value: usersInRange.length },
      { name: "Started a catalogue", value: startedCohort },
      { name: "Built content", value: cohortBuilt },
      { name: "Published", value: cohortPublished },
      { name: "Got views", value: cohortViewed },
      { name: "Became paying", value: cohortPaid },
    ],
    stalledEmpty,
    neverStarted,
    stops: [
      { name: "Published", value: cohortPublished },
      { name: "Built, not published", value: cohortBuilt - cohortPublished },
      { name: "Empty catalogue", value: stalledEmpty },
      { name: "Never started", value: neverStarted },
    ],
    rateByCohort,
    topCreators: rankUsers(countBy(builtByNew, (c) => c.user_id)),
    split: {
      newUsers: usersInRange.length,
      existingUsers: existingUserIds.size,
      byNewUsers: builtByNew.length,
      byExistingUsers: builtByExisting.length,
      perNewUser: usersInRange.length
        ? Number((builtByNew.length / usersInRange.length).toFixed(2))
        : 0,
      perExistingUser: existingUserIds.size
        ? Number((builtByExisting.length / existingUserIds.size).toFixed(2))
        : 0,
      activeExistingCreators: new Set(builtByExisting.map((c) => c.user_id)).size,
      overTime: series({
        "By new users": countPer(builtByNew.map((c) => c.created_at)),
        "By existing users": countPer(builtByExisting.map((c) => c.created_at)),
      }),
    },
  }

  // ── Content: what the catalogues hold, all time ──────────────────────────
  const built = data.catalogues.filter(isBuilt)
  const matrixRows = new Map<string, MatrixRow>()
  for (const c of data.catalogues) {
    const s = (c.status ?? "").toLowerCase()
    const status =
      s === "active" ? "Published" : s === "draft" ? "Draft" : s === "inactive" ? "Inactive" : "Other"
    const row = matrixRows.get(status) ?? {
      status,
      empty: 0,
      noItems: 0,
      few: 0,
      many: 0,
      total: 0,
    }
    if (c.contentSections === 0) row.empty++
    else if (c.contentItems === 0) row.noItems++
    else if (c.contentItems <= 2) row.few++
    else row.many++
    row.total++
    matrixRows.set(status, row)
  }
  const pctOfBuilt = (test: (c: CatalogueRow) => boolean) =>
    pctOf(built.filter(test).length, built.length)
  const starterFull = new Set(
    data.catalogues
      .filter((c) => {
        const u = userById.get(c.user_id)
        return (
          u != null &&
          planOf(u) === "Starter" &&
          (c.contentSections >= STARTER_SECTIONS || c.contentItems >= STARTER_ITEMS)
        )
      })
      .map((c) => c.user_id),
  ).size
  const content = {
    total: data.catalogues.length,
    built: built.length,
    empty: data.catalogues.length - built.length,
    emptyOwners: [...startedUsers].filter((u) => !builtUsers.has(u)).length,
    startedInRange: cataloguesInRange.length,
    builtInRange: builtInRange.length,
    emptyInRange: cataloguesInRange.length - builtInRange.length,
    medianSections: median(built.map((c) => c.contentSections)),
    medianItems: median(built.map((c) => c.contentItems)),
    matrix: ["Published", "Draft", "Inactive", "Other"].flatMap((s) => {
      const row = matrixRows.get(s)
      return row ? [row] : []
    }),
    completeness: [
      { name: "Contact", value: pctOfBuilt((c) => c.hasContact) },
      { name: "Logo", value: pctOfBuilt((c) => c.hasLogo) },
      { name: "Legal info", value: pctOfBuilt((c) => c.hasLegal) },
      { name: "Tags", value: pctOfBuilt((c) => c.tagCount > 0) },
      { name: "Partners", value: pctOfBuilt((c) => c.hasPartners) },
      { name: "SEO", value: pctOfBuilt((c) => c.hasSeo) },
    ].sort((a, b) => b.value - a.value),
    monthly: series({
      Built: countPer(builtInRange.map((c) => c.created_at)),
      Empty: countPer(
        cataloguesInRange.filter((c) => !isBuilt(c)).map((c) => c.created_at),
      ),
    }),
    starterFull,
    publishedEmpty: data.catalogues.filter((c) => isLiveStatus(c) && !isBuilt(c)).length,
  }

  // ── Traffic: views in range, up to the last day with data ────────────────
  const catalogueById = new Map(data.catalogues.map((c) => [c.id, c]))
  const viewsByCatId = new Map<string, number>()
  const pvPer = new Map<string, number>(periods.map((p) => [p, 0]))
  const uvPer = new Map<string, number>(periods.map((p) => [p, 0]))
  const activePer = new Map<string, Set<string>>(periods.map((p) => [p, new Set()]))
  let pageviews = 0
  let visitorDays = 0
  let unattributed = 0
  const owners = new Set<string>()
  for (const a of analyticsInRange) {
    const pv = a.pageviews ?? 0
    pageviews += pv
    visitorDays += a.unique_visitors ?? 0
    const k = periodKeyOf(a.day)
    if (pvPer.has(k)) {
      pvPer.set(k, pvPer.get(k)! + pv)
      uvPer.set(k, uvPer.get(k)! + (a.unique_visitors ?? 0))
    }
    if (pv > 0) owners.add(a.user_id)
    if (!a.catalogue_id) {
      unattributed += pv
      continue
    }
    viewsByCatId.set(a.catalogue_id, (viewsByCatId.get(a.catalogue_id) ?? 0) + pv)
    if (pv > 0) activePer.get(k)?.add(a.catalogue_id)
  }
  // A catalogue published in the last week before the data ends hasn't had
  // a fair chance at a view, so it isn't counted as dead.
  const eligibleBefore = addDays(untilISO, -7)
  const eligible = data.catalogues.filter(
    (c) => isPublished(c) && c.created_at.slice(0, 10) <= eligibleBefore,
  )
  const eligibleViews = eligible.map((c) => viewsByCatId.get(c.id) ?? 0)
  const dead = eligibleViews.filter((v) => v === 0).length
  const sortedViews = [...viewsByCatId.values()].sort((a, b) => b - a)
  const attributed = sortedViews.reduce((s, v) => s + v, 0)
  const topN = Math.max(1, Math.ceil(sortedViews.length * 0.1))
  const rankCatalogues = (ids: string[]): Ranking[] =>
    ids
      .map((id) => {
        const c = catalogueById.get(id)
        return {
          id,
          name: c?.name ?? id.slice(0, 8),
          value: viewsByCatId.get(id) ?? 0,
          meta: c?.business_type ? titleCase(c.business_type) : undefined,
        }
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  const sumViewsBy = (pick: (c: CatalogueRow) => string) => {
    const m = new Map<string, number>()
    for (const [id, v] of viewsByCatId) {
      const c = catalogueById.get(id)
      if (!c || v <= 0) continue
      m.set(pick(c), (m.get(pick(c)) ?? 0) + v)
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  const traffic = {
    pageviews,
    visitorDays,
    series: series({ Pageviews: pvPer, "Visitor-days": uvPer }, true),
    cataloguesWithViews: sortedViews.filter((v) => v > 0).length,
    ownersWithViews: owners.size,
    eligible: eligible.length,
    dead,
    deadPct: pctOf(dead, eligible.length),
    medianViews: Math.round(median(eligibleViews)),
    viewsBuckets: [
      { name: "0", test: (v: number) => v === 0 },
      { name: "1–10", test: (v: number) => v >= 1 && v <= 10 },
      { name: "11–50", test: (v: number) => v >= 11 && v <= 50 },
      { name: "51–200", test: (v: number) => v >= 51 && v <= 200 },
      { name: "200+", test: (v: number) => v > 200 },
    ].map((d) => ({ name: d.name, value: eligibleViews.filter(d.test).length })),
    activeOverTime: series(
      {
        "Catalogues with views": new Map(
          [...activePer].map(([p, s]) => [p, s.size]),
        ),
      },
      true,
    ),
    paretoTopShare: pctOf(
      sortedViews.slice(0, topN).reduce((s, v) => s + v, 0),
      attributed,
    ),
    unattributed,
    top: rankCatalogues([...viewsByCatId.keys()]),
    topFromNewUsers: rankCatalogues(
      [...viewsByCatId.keys()].filter((id) =>
        newUserIds.has(catalogueById.get(id)?.user_id ?? ""),
      ),
    ),
    viewsByCategory: sumViewsBy((c) => titleCase(c.business_type ?? "-")).slice(0, 8),
    viewsByLanguage: sumViewsBy((c) => c.language?.toUpperCase() ?? "-"),
  }

  // ── Customers: one row per Paddle customer ───────────────────────────────
  const byCustomer = new Map<string, Sub[]>()
  for (const s of subs) {
    const list = byCustomer.get(s.customerId) ?? []
    list.push(s)
    byCustomer.set(s.customerId, list)
  }
  const stateCounts: Record<CustomerState, number> = {
    Paying: 0,
    Trialing: 0,
    Paused: 0,
    Churned: 0,
  }
  const firstSubAt = new Map<string, string>()
  const planCounts = new Map<string, number>()
  let doubleActive = 0
  for (const [id, list] of byCustomer) {
    const state = stateOf(list)
    stateCounts[state]++
    const first = list
      .map((s) => s.createdAt)
      .filter((d): d is string => !!d)
      .sort()[0]
    if (first) firstSubAt.set(id, first)
    if (state === "Paying") {
      const sub = list.find(isPaying)!
      const plan = sub.priceId ? (planNameById.get(sub.priceId) ?? "Unknown") : "Unknown"
      planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1)
    }
    if (list.filter((s) => s.status === "active").length > 1) doubleActive++
  }
  const newCustomers = [...firstSubAt.values()].filter(inRange)
  // With Paddle's cancel dates churn is a rate for the range: customers who
  // stopped paying in it, over those paying when it began. Without them only
  // the all-time share is known.
  let churn: DashboardView["customers"]["churn"]
  if (fromPaddle) {
    const payingOn = (day: string) =>
      new Set(
        subs
          .filter(
            (s) =>
              s.createdAt != null &&
              s.createdAt.slice(0, 10) <= day &&
              s.status !== "trialing" &&
              (s.canceledAt == null || s.canceledAt.slice(0, 10) > day),
          )
          .map((s) => s.customerId),
      )
    const base = payingOn(addDays(startISO, -1))
    const churned = [...base].filter((id) => {
      const list = byCustomer.get(id) ?? []
      if (stateOf(list) !== "Churned") return false
      const last = list
        .map((s) => s.canceledAt)
        .filter((d): d is string => !!d)
        .sort()
        .at(-1)
      return inRange(last)
    }).length
    churn = { rate: pctOf(churned, base.size), churned, base: base.size, scope: "In range" }
  } else {
    churn = {
      rate: pctOf(stateCounts.Churned, byCustomer.size),
      churned: stateCounts.Churned,
      base: byCustomer.size,
      scope: "All time",
    }
  }
  const segmentCount = (id: string) =>
    data.segments.find((s) => s.id === id)?.count ?? 0
  const payingSubs = subs.filter(isPaying)
  const customers = {
    source: fromPaddle ? ("paddle" as const) : ("database" as const),
    paying: stateCounts.Paying,
    paused: stateCounts.Paused,
    trialing: stateCounts.Trialing,
    churned: stateCounts.Churned,
    ever: byCustomer.size,
    newInRange: newCustomers.length,
    newSeries: series({ "New paying customers": countPer(newCustomers) }),
    churn,
    stateMix: (Object.keys(stateCounts) as CustomerState[])
      .map((name) => ({ name, value: stateCounts[name] }))
      .filter((b) => b.value > 0),
    rowMix: bucketise(subs.map((s) => ({ key: s.status })), titleCase),
    byPlan: Array.from(planCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    doubleActive,
    checkoutAbandoned: segmentCount("checkout-abandoned"),
    atRisk: segmentCount("paying-no-views"),
    cohortPaid,
    paidConversion: pctOf(cohortPaid, usersInRange.length),
    scheduledCancel: fromPaddle
      ? new Set(
          payingSubs
            .filter((s) => s.scheduledAction === "cancel")
            .map((s) => s.customerId),
        ).size
      : null,
    pastDue: fromPaddle
      ? new Set(
          subs.filter((s) => s.status === "past_due").map((s) => s.customerId),
        ).size
      : null,
    billing: fromPaddle
      ? bucketise(
          payingSubs.map((s) => ({ key: s.interval })),
          (i) => (i === "month" ? "Monthly" : i === "year" ? "Annual" : titleCase(i)),
        )
      : null,
  }

  // ── Revenue: Paddle's metrics, else its subscriptions, else list prices ──
  const paddle = data.paddle
  const sumIn = (s: MetricSeries | null | undefined, field: "amount" | "count" | "completed") =>
    s
      ? s.points
          .filter((p) => p.day >= startISO && p.day <= endISO)
          .reduce((t, p) => t + (p[field] ?? 0), 0)
      : null
  const sumPer = (s: MetricSeries, field: "amount") => {
    const m = new Map<string, number>(periods.map((p) => [p, 0]))
    for (const p of s.points) {
      const k = periodKeyOf(p.day)
      if (m.has(k)) m.set(k, m.get(k)! + (p[field] ?? 0))
    }
    return m
  }
  const today = dayKey(new Date())
  let mrr = 0
  let mrrStart: number | null = null
  let mrrSource: DashboardView["revenue"]["mrrSource"] = "estimate"
  let mrrSeries: Series | null = null
  let unpriced = 0
  const revenueByPlan = new Map<string, number>()
  if (paddle?.mrr && paddle.mrr.points.length) {
    const s = paddle.mrr
    mrr = valueAt(s, endISO) ?? 0
    mrrStart = valueAt(s, addDays(startISO, -1))
    mrrSource = "metrics"
    mrrSeries = periods.map((p) => {
      const last = useDaily ? p : `${p}-31`
      return {
        date: periodLabel(p),
        MRR: (useDaily ? p : `${p}-01`) > today ? null : valueAt(s, last),
      }
    })
  } else if (fromPaddle) {
    mrr = round1(payingSubs.reduce((t, s) => t + (s.monthly ?? 0), 0))
    mrrSource = "subscriptions"
  }
  if (fromPaddle) {
    for (const s of payingSubs) {
      const plan = s.priceId ? (planNameById.get(s.priceId) ?? "Other") : "Other"
      revenueByPlan.set(plan, (revenueByPlan.get(plan) ?? 0) + (s.monthly ?? 0))
    }
  } else {
    for (const s of payingSubs) {
      const plan = s.priceId ? planNameById.get(s.priceId) : undefined
      const price = plan != null ? LIST_PRICE[plan] : undefined
      if (price == null) {
        unpriced++
        continue
      }
      revenueByPlan.set(plan!, (revenueByPlan.get(plan!) ?? 0) + price)
    }
    if (mrrSource === "estimate") {
      mrr = [...revenueByPlan.values()].reduce((t, v) => t + v, 0)
    }
  }
  const revenueSum = sumIn(paddle?.revenue, "amount")
  const refundSum = sumIn(paddle?.refunds, "amount")
  const sessions = sumIn(paddle?.checkout, "count")
  const completed = sumIn(paddle?.checkout, "completed")
  const revenue = {
    connected: paddle != null,
    currency:
      paddle?.mrr?.currency ??
      paddle?.revenue?.currency ??
      paddle?.subscriptions?.find((s) => s.currency)?.currency ??
      "USD",
    mrr: round1(mrr),
    mrrStart,
    mrrSource,
    unpriced,
    mrrSeries,
    revenue: revenueSum,
    revenueSeries: paddle?.revenue
      ? series({ Revenue: sumPer(paddle.revenue, "amount") })
      : null,
    refunds: refundSum,
    refundRate: revenueSum && refundSum != null ? pctOf(refundSum, revenueSum) : null,
    checkout:
      sessions != null && completed != null
        ? { sessions, completed, rate: pctOf(completed, sessions) }
        : null,
    byPlan: Array.from(revenueByPlan.entries())
      .map(([name, value]) => ({ name, value: round1(value) }))
      .sort((a, b) => b.value - a.value),
  }

  return {
    start: startISO,
    end: endISO,
    analyticsUntil: untilISO,
    analyticsClamped: untilISO < endISO,
    signups: usersInRange.length,
    signupSeries: series({ Signups: signupsPer, Activated: activatedPer }),
    cumulativeUsers,
    acquisition,
    activation,
    content,
    traffic,
    customers,
    revenue,
    features: featuresOf(data, cataloguesInRange, owners, inRange, {
      periods,
      periodKeyOf,
      periodLabel,
      rankUsers,
    }),
  }
}

// Which features are in use. Adoption reads each catalogue's current
// settings, so it is all-time; AI usage and the activity series follow the
// range. Shares are of built catalogues: an empty draft can't use a feature,
// and with most new catalogues empty, counting them would make every
// feature look as if new users stopped using it.
function featuresOf(
  data: DashboardData,
  cataloguesInRange: CatalogueRow[],
  ownersWithViews: Set<string>,
  isoInRange: (iso: string | null | undefined) => boolean,
  p: {
    periods: string[]
    periodKeyOf: (iso: string) => string
    periodLabel: (key: string) => string
    rankUsers: (counts: Map<string, number>) => Ranking[]
  },
): DashboardView["features"] {
  const built = data.catalogues.filter(isBuilt)
  const builtInRange = cataloguesInRange.filter(isBuilt)
  const has = (key: FeatureKey) => (c: CatalogueRow) => c.features.includes(key)
  const count = (rows: CatalogueRow[], test: (c: CatalogueRow) => boolean) =>
    rows.filter(test).length
  // A fixed order, so each kind keeps its colour whichever is most used.
  const BACKGROUND_KINDS = [
    ["image", "Photo"],
    ["gradient", "Gradient"],
    ["color", "Colour"],
  ] as const
  const qrByCatalogue = new Map(data.qrConfigs.map((q) => [q.catalogue_id, q]))
  const usersWithSavedThemes = new Set(data.userThemes.map((t) => t.user_id)).size
  const ga = has("googleAnalytics")
  const pixel = has("metaPixel")
  const integrationsTogether = (): FeatureBreakdown => {
    const tracked = built.filter((c) => ga(c) || pixel(c))
    return {
      kind: "parts",
      title: "Integrations together",
      rows: [
        { name: "Google Analytics only", value: count(tracked, (c) => ga(c) && !pixel(c)) },
        { name: "Meta Pixel only", value: count(tracked, (c) => pixel(c) && !ga(c)) },
        { name: "Both", value: count(tracked, (c) => ga(c) && pixel(c)) },
      ],
    }
  }
  const breakdownOf = (
    key: FeatureKey,
    using: CatalogueRow[],
  ): FeatureBreakdown | null => {
    switch (key) {
      case "customBackground":
        return {
          kind: "parts",
          title: "By kind",
          rows: [
            ...BACKGROUND_KINDS.map(([kind, name]) => ({
              name,
              value: count(using, (c) => c.background === kind),
            })),
            {
              name: "Other",
              value: count(
                using,
                (c) => !BACKGROUND_KINDS.some(([kind]) => kind === c.background),
              ),
            },
          ].filter((r) => r.name !== "Other" || r.value > 0),
        }
      case "glass":
        return {
          kind: "parts",
          title: "By level",
          rows: ["Clear", "Semi-frosted", "Frosted"].map((name, i) => ({
            name,
            value: count(using, (c) => c.glassLevel === i + 1),
          })),
        }
      case "qrCode":
        return {
          kind: "counts",
          title: "Saved designs",
          rows: [
            {
              name: "With a logo",
              value: count(using, (c) => qrByCatalogue.get(c.id)?.has_logo === true),
            },
            {
              name: "With frame text",
              value: count(using, (c) => qrByCatalogue.get(c.id)?.has_frame === true),
            },
          ],
        }
      case "customTheme":
        return {
          kind: "counts",
          title: "Saved themes",
          rows: [
            { name: "Themes saved", value: data.userThemes.length },
            { name: "Users who saved one", value: usersWithSavedThemes },
          ],
        }
      case "googleAnalytics":
      case "metaPixel":
        return integrationsTogether()
      default:
        return null
    }
  }

  const adoption: FeatureAdoption[] = FEATURES.map((f) => {
    const using = built.filter(has(f.key))
    const fresh = builtInRange.filter(has(f.key))
    const byOwner = new Map<string, number>()
    for (const c of using) byOwner.set(c.user_id, (byOwner.get(c.user_id) ?? 0) + 1)
    return {
      key: f.key,
      label: f.label,
      group: f.group,
      catalogues: using.length,
      pctCatalogues: pctOf(using.length, built.length),
      owners: byOwner.size,
      newCatalogues: fresh.length,
      newPct: pctOf(fresh.length, builtInRange.length),
      topUsers: p.rankUsers(byOwner),
      breakdown: breakdownOf(f.key, using),
    }
  })
  const featuresPerCatalogue = built.length
    ? round1(built.reduce((s, c) => s + c.features.length, 0) / built.length)
    : 0

  // Every section by its stored type, the old keys kept apart. Like adoption,
  // this is the content as it is now, across all catalogues.
  const sectionTotals = new Map<string, { sections: number; catalogues: number }>()
  for (const c of data.catalogues) {
    for (const [type, n] of Object.entries(c.sectionTypes)) {
      const t = sectionTotals.get(type) ?? { sections: 0, catalogues: 0 }
      t.sections += n
      t.catalogues++
      sectionTotals.set(type, t)
    }
  }
  const totalSections = Array.from(sectionTotals.values()).reduce(
    (s, t) => s + t.sections,
    0,
  )
  const knownTypes = new Set<string>(SECTION_TYPES.map((t) => t.type))
  const sectionRow = (
    type: string,
    label: string,
    replacedBy: string | null,
  ): SectionTypeUsage => {
    const t = sectionTotals.get(type)
    return {
      type,
      label,
      replacedBy,
      sections: t?.sections ?? 0,
      pctSections: pctOf(t?.sections ?? 0, totalSections),
      catalogues: t?.catalogues ?? 0,
    }
  }

  // AI assistant turns. A refunded turn failed and gave its credits back, so
  // it counts as an attempt but not as credits spent.
  const aiInRange = data.aiCredits.filter((a) => isoInRange(a.created_at))
  const aiRefunded = aiInRange.filter((a) => a.refunded_at != null).length
  const aiCreditsByUser = new Map<string, number>()
  for (const a of aiInRange) {
    if (a.refunded_at != null) continue
    aiCreditsByUser.set(a.user_id, (aiCreditsByUser.get(a.user_id) ?? 0) + (a.credits ?? 0))
  }
  const aiUsers = new Set(aiInRange.map((a) => a.user_id))
  // Active in range: had views, made a catalogue or used the AI.
  const activeUsers = new Set([
    ...ownersWithViews,
    ...cataloguesInRange.map((c) => c.user_id),
    ...aiUsers,
  ])
  const aiByPeriod = new Map<string, { turns: number; credits: number; users: Set<string> }>(
    p.periods.map((k) => [k, { turns: 0, credits: 0, users: new Set() }]),
  )
  for (const a of aiInRange) {
    const b = aiByPeriod.get(p.periodKeyOf(a.created_at))
    if (!b) continue
    b.turns++
    b.users.add(a.user_id)
    if (a.refunded_at == null) b.credits += a.credits ?? 0
  }

  const themeLabel = (t: string) =>
    t === "custom" ? "Custom" : t === "-" ? "Unknown" : titleCase(t.replace(/^theme-/, ""))

  const activityByPeriod = new Map<string, { qr: number; themes: number; subscribers: number }>(
    p.periods.map((k) => [k, { qr: 0, themes: 0, subscribers: 0 }]),
  )
  const countInto = (
    rows: { created_at: string | null }[],
    field: "qr" | "themes" | "subscribers",
  ) => {
    let n = 0
    for (const r of rows) {
      if (!isoInRange(r.created_at)) continue
      n++
      const b = activityByPeriod.get(p.periodKeyOf(r.created_at!))
      if (b) b[field]++
    }
    return n
  }
  countInto(data.qrConfigs, "qr")
  countInto(data.userThemes, "themes")
  const subscribersInRange = countInto(data.catalogueSubscribers, "subscribers")

  return {
    adoption,
    featuresPerCatalogue,
    newCatalogues: builtInRange.length,
    sectionTypes: {
      rows: [
        // Current types, most used first, then anything unrecognised.
        ...SECTION_TYPES.filter((t) => !t.replacedBy)
          .map((t) => sectionRow(t.type, t.label, null))
          .sort((a, b) => b.sections - a.sections),
        ...Array.from(sectionTotals.keys())
          .filter((type) => !knownTypes.has(type))
          .map((type) => sectionRow(type, titleCase(type), null)),
        ...SECTION_TYPES.filter((t) => t.replacedBy).map((t) =>
          sectionRow(t.type, t.label, t.replacedBy),
        ),
      ],
      totalSections,
    },
    builtCatalogues: built.length,
    trackedCatalogues: built.filter((c) => ga(c) || pixel(c)).length,
    ai: {
      turns: aiInRange.length,
      users: aiUsers.size,
      activeUsers: activeUsers.size,
      userPct: pctOf(aiUsers.size, activeUsers.size),
      creditsSpent: Array.from(aiCreditsByUser.values()).reduce((s, v) => s + v, 0),
      refundRate: pctOf(aiRefunded, aiInRange.length),
      topUsers: p.rankUsers(aiCreditsByUser),
      overTime: p.periods.map((k) => {
        const b = aiByPeriod.get(k)!
        return {
          date: p.periodLabel(k),
          "AI turns": b.turns,
          "Credits spent": b.credits,
          "AI users": b.users.size,
        }
      }),
    },
    themes: {
      popularity: bucketise(built.map((c) => ({ key: c.theme })), themeLabel),
      savedThemes: data.userThemes.length,
      usersWithSavedThemes,
    },
    leads: {
      subscribers: subscribersInRange,
      marketingSignups: data.newsletterSubscriberCount,
      qrCodes: data.qrConfigs.length,
    },
    activityOverTime: p.periods.map((k) => {
      const b = activityByPeriod.get(k)!
      return {
        date: p.periodLabel(k),
        "QR codes": b.qr,
        "Saved themes": b.themes,
        "Newsletter signups": b.subscribers,
      }
    }),
  }
}

const STALE_AFTER_MS = 36 * 60 * 60 * 1000

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

// Where each figure comes from, and how fresh it is. Shown in the header in
// place of a blanket "live" badge.
export function sourcesOf(data: DashboardData, lastDay: string | null): SourceStatus[] {
  const importAge = data.lastImportAt
    ? Date.now() - Date.parse(data.lastImportAt)
    : Infinity
  const paddle = data.paddle
  return [
    { label: "Users & catalogues", state: "good", detail: "live" },
    {
      label: "Analytics",
      state: importAge > STALE_AFTER_MS ? "warn" : "good",
      detail: lastDay ? `through ${shortDay(lastDay)}` : "no data yet",
    },
    paddle
      ? {
          label: "Paddle",
          state: paddle.errors.length ? "warn" : "good",
          detail: paddle.errors.length
            ? "partly loaded"
            : `updated ${stamp(paddle.fetchedAt)} UTC`,
        }
      : { label: "Paddle", state: "off", detail: "not connected" },
  ]
}

// What needs a look now, worst first. Each item points at the page that
// explains it.
export function attentionOf(
  data: DashboardData,
  view: DashboardView,
  lastDay: string | null,
): Attention[] {
  const out: Attention[] = []
  const segment = (id: string) => data.segments.find((s) => s.id === id)?.count ?? 0
  const importAge = data.lastImportAt
    ? Date.now() - Date.parse(data.lastImportAt)
    : Infinity
  if (importAge > STALE_AFTER_MS) {
    out.push({
      level: "broken",
      title: data.lastImportAt
        ? `Analytics import is ${Math.floor(importAge / DAY_MS)} days behind`
        : "Analytics import has never run",
      detail: data.lastImportAt
        ? `Last successful run ${stamp(data.lastImportAt)} UTC.${lastDay ? ` Views after ${shortDay(lastDay)} are missing.` : ""}`
        : undefined,
      tab: "traffic",
      link: "Traffic",
    })
  }
  if (data.paddle?.errors.length) {
    out.push({
      level: "check",
      title: "Paddle data didn't fully load",
      detail: data.paddle.errors[0],
      tab: "revenue",
      link: "Revenue",
    })
  }
  const empty = segment("empty-catalogue")
  if (empty) {
    out.push({
      level: "act",
      title: `${empty.toLocaleString("en-US")} people have only an empty catalogue`,
      tab: "outreach",
      link: "Outreach list",
    })
  }
  const idle = segment("paying-no-views")
  if (idle) {
    out.push({
      level: "act",
      title: `${idle} of ${view.customers.paying} paying customers had no views in 30 days`,
      tab: "customers",
      link: "Customers",
    })
  }
  if (view.customers.scheduledCancel) {
    out.push({
      level: "act",
      title: `${view.customers.scheduledCancel} paying customers have a cancellation booked`,
      tab: "customers",
      link: "Customers",
    })
  }
  if (view.customers.pastDue) {
    out.push({
      level: "act",
      title: `${view.customers.pastDue} customers have a payment past due`,
      tab: "customers",
      link: "Customers",
    })
  }
  const since = Date.now() - 30 * DAY_MS
  const recent = data.aiCredits.filter((a) => Date.parse(a.created_at) >= since)
  const failed = recent.filter((a) => a.refunded_at != null).length
  if (recent.length >= 5 && failed / recent.length >= 0.2) {
    out.push({
      level: "check",
      title: `AI assistant failed ${failed} of ${recent.length} turns in the last 30 days`,
      tab: "features",
      link: "Features",
    })
  }
  if (view.customers.doubleActive) {
    out.push({
      level: "check",
      title: `${view.customers.doubleActive} customers have two active subscriptions`,
      detail: "Check Paddle for double charges.",
      tab: "customers",
      link: "Customers",
    })
  }
  if (view.content.publishedEmpty) {
    out.push({
      level: "check",
      title: `${view.content.publishedEmpty} published catalogues are empty`,
      tab: "content",
      link: "Content",
    })
  }
  return out
}
