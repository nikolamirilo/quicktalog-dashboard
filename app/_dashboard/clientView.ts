import { FEATURES } from "./features"
import type {
  Bucket,
  CataloguePoint,
  DashboardData,
  DashboardView,
  Pageview,
  Ranking,
  RangeKey,
  SubscriptionRow,
  UserPoint,
} from "./types"

// ── Paddle price map (P3) ────────────────────────────────────────────────────
// Revenue $ figures (MRR/ARR/ARPU) require the monthly amount for each Paddle
// price_id. The database stores only the price_id, not the amount, so until a
// Paddle price sync lands this stays empty and revenue is reported as payer
// counts only. To enable $ figures, fill in: { "<price_id>": <monthly_amount> }.
// Annual prices should be entered as their monthly-equivalent (amount / 12).
const PRICE_BY_PRICE_ID: Record<string, number> = {}

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
  })
}

const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`)
  return d.toLocaleString("en-US", { month: "short", day: "numeric" })
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

export function computeView(
  data: DashboardData,
  startISO: string,
  endISO: string,
): DashboardView {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T23:59:59.999Z`)
  const startMs = start.getTime()
  const endMs = end.getTime()

  const inUserRange = (ts: string | null): boolean => {
    if (!ts) return false
    const t = new Date(ts).getTime()
    return t >= startMs && t <= endMs
  }

  const usersInRange = data.users.filter((u) => inUserRange(u.created_at))
  const cataloguesInRange = data.catalogues.filter((c) =>
    inUserRange(c.created_at),
  )
  const analyticsInRange = data.analytics.filter(
    (a) => a.day >= startISO && a.day <= endISO,
  )

  // Totals — scoped to the selected range
  const totalPv = analyticsInRange.reduce(
    (s, a) => s + (a.pageviews ?? 0),
    0,
  )
  const totalUv = analyticsInRange.reduce(
    (s, a) => s + (a.unique_visitors ?? 0),
    0,
  )
  const activeUsers = new Set(analyticsInRange.map((a) => a.user_id)).size

  const totals = {
    users: usersInRange.length,
    catalogues: cataloguesInRange.length,
    pageviews: totalPv,
    uniqueVisitors: totalUv,
    activeUsers,
  }

  // Bucket size: daily for short ranges (≤90 days), monthly otherwise.
  const dayMs = 24 * 60 * 60 * 1000
  const spanDays = Math.floor((endMs - startMs) / dayMs) + 1
  const useDaily = spanDays <= 90

  // Shared period helpers for the new time series below.
  const periods = useDaily ? enumerateDays(start, end) : enumerateMonths(start, end)
  const periodKeyOf = (iso: string) =>
    useDaily ? iso.slice(0, 10) : iso.slice(0, 7)
  const periodLabel = useDaily ? dayLabel : monthLabel
  const isoInRange = (iso: string | null | undefined): boolean =>
    iso != null && iso.slice(0, 10) >= startISO && iso.slice(0, 10) <= endISO

  let usersMonthly: UserPoint[]
  let usersCumulative: UserPoint[]
  let catsMonthly: CataloguePoint[]
  let catsCumulative: CataloguePoint[]
  let pageviewsSeries: Pageview[]

  if (useDaily) {
    const days = enumerateDays(start, end)
    const usersByDay = new Map<string, number>(days.map((d) => [d, 0]))
    const catsByDay = new Map<string, number>(days.map((d) => [d, 0]))
    const pvByDay = new Map<string, { pv: number; uv: number }>(
      days.map((d) => [d, { pv: 0, uv: 0 }]),
    )

    for (const u of usersInRange) {
      const k = u.created_at!.slice(0, 10)
      if (usersByDay.has(k)) usersByDay.set(k, usersByDay.get(k)! + 1)
    }
    for (const c of cataloguesInRange) {
      const k = c.created_at.slice(0, 10)
      if (catsByDay.has(k)) catsByDay.set(k, catsByDay.get(k)! + 1)
    }
    for (const a of analyticsInRange) {
      const k = a.day.slice(0, 10)
      const b = pvByDay.get(k)
      if (!b) continue
      b.pv += a.pageviews ?? 0
      b.uv += a.unique_visitors ?? 0
    }

    usersMonthly = days.map((k) => ({
      date: dayLabel(k),
      Users: usersByDay.get(k) ?? 0,
    }))
    catsMonthly = days.map((k) => ({
      date: dayLabel(k),
      Catalogues: catsByDay.get(k) ?? 0,
    }))
    let ru = 0
    usersCumulative = days.map((k) => ({
      date: dayLabel(k),
      Users: (ru += usersByDay.get(k) ?? 0),
    }))
    let rc = 0
    catsCumulative = days.map((k) => ({
      date: dayLabel(k),
      Catalogues: (rc += catsByDay.get(k) ?? 0),
    }))
    pageviewsSeries = days.map((k) => {
      const b = pvByDay.get(k)!
      return { date: dayLabel(k), Pageviews: b.pv, "Unique visitors": b.uv }
    })
  } else {
    const months = enumerateMonths(start, end)
    const usersByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const catsByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const pvByMonth = new Map<string, { pv: number; uv: number }>(
      months.map((m) => [m, { pv: 0, uv: 0 }]),
    )

    for (const u of usersInRange) {
      const k = u.created_at!.slice(0, 7)
      if (usersByMonth.has(k)) usersByMonth.set(k, usersByMonth.get(k)! + 1)
    }
    for (const c of cataloguesInRange) {
      const k = c.created_at.slice(0, 7)
      if (catsByMonth.has(k)) catsByMonth.set(k, catsByMonth.get(k)! + 1)
    }
    for (const a of analyticsInRange) {
      const k = a.day.slice(0, 7)
      const b = pvByMonth.get(k)
      if (!b) continue
      b.pv += a.pageviews ?? 0
      b.uv += a.unique_visitors ?? 0
    }

    usersMonthly = months.map((k) => ({
      date: monthLabel(k),
      Users: usersByMonth.get(k) ?? 0,
    }))
    catsMonthly = months.map((k) => ({
      date: monthLabel(k),
      Catalogues: catsByMonth.get(k) ?? 0,
    }))
    let ru = 0
    usersCumulative = months.map((k) => ({
      date: monthLabel(k),
      Users: (ru += usersByMonth.get(k) ?? 0),
    }))
    let rc = 0
    catsCumulative = months.map((k) => ({
      date: monthLabel(k),
      Catalogues: (rc += catsByMonth.get(k) ?? 0),
    }))
    pageviewsSeries = months.map((k) => {
      const b = pvByMonth.get(k)!
      return { date: monthLabel(k), Pageviews: b.pv, "Unique visitors": b.uv }
    })
  }

  // Catalogue breakdowns — only catalogues created in the selected range.
  const byStatus = bucketise(
    cataloguesInRange.map((c) => ({ key: c.status })),
    titleCase,
  )
  const bySource = bucketise(
    cataloguesInRange.map((c) => ({ key: c.source })),
    titleCase,
  )
  const byLanguage = bucketise(
    cataloguesInRange.map((c) => ({ key: c.language?.toUpperCase() ?? null })),
  )
  const byBusinessType = bucketise(
    cataloguesInRange.map((c) => ({ key: c.business_type })),
    titleCase,
  ).slice(0, 8)

  // Users by plan — only users created in the selected range.
  const planNameById = new Map(data.plans.map((p) => [p.id, p.name]))
  const planCounts = new Map<string, number>()
  for (const u of usersInRange) {
    const name = u.plan_id
      ? (planNameById.get(u.plan_id) ?? "Unknown")
      : "None"
    planCounts.set(name, (planCounts.get(name) ?? 0) + 1)
  }
  const planByUsers: Bucket[] = Array.from(planCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)

  // Pageviews attributed to catalogues through `analytics.catalogue_id`,
  // across all known catalogues (not just ones created in range), so a
  // catalogue created earlier still surfaces when it's getting traffic.
  const catalogueById = new Map(data.catalogues.map((c) => [c.id, c]))
  const viewsByCatId = new Map<string, number>()
  for (const a of analyticsInRange) {
    if (!a.catalogue_id) continue
    viewsByCatId.set(
      a.catalogue_id,
      (viewsByCatId.get(a.catalogue_id) ?? 0) + (a.pageviews ?? 0),
    )
  }
  const topCataloguesByPageviews: Ranking[] = Array.from(viewsByCatId.entries())
    .map(([id, value]) => ({
      id,
      name: catalogueById.get(id)?.name ?? id.slice(0, 8),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Top creators by catalogues created in range.
  const userById = new Map(data.users.map((u) => [u.id, u]))
  const cataloguesByUser = new Map<string, number>()
  for (const c of cataloguesInRange) {
    cataloguesByUser.set(
      c.user_id,
      (cataloguesByUser.get(c.user_id) ?? 0) + 1,
    )
  }
  // Top 8 users by a per-user count, labelled by name, then email.
  const rankUsers = (counts: Map<string, number>): Ranking[] =>
    Array.from(counts.entries())
      .map(([id, count]) => {
        const u = userById.get(id)
        const label = u?.name?.trim() || u?.email || id.slice(0, 8)
        return {
          id,
          name: label,
          value: count,
          meta: u?.email && u?.name ? u.email : undefined,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  const topUsersByCatalogues = rankUsers(cataloguesByUser)

  // ── Per-user catalogue facts (used by activation + creators) ──────────────
  const firstCatByUser = new Map<string, number>()
  const publishedByUser = new Set<string>()
  const catCountByUser = new Map<string, number>()
  // A published (live) catalogue has the `active` status.
  const isPublished = (s: string | null) => (s ?? "").toLowerCase() === "active"
  for (const c of data.catalogues) {
    const t = new Date(c.created_at).getTime()
    const prev = firstCatByUser.get(c.user_id)
    if (prev === undefined || t < prev) firstCatByUser.set(c.user_id, t)
    if (isPublished(c.status)) publishedByUser.add(c.user_id)
    catCountByUser.set(c.user_id, (catCountByUser.get(c.user_id) ?? 0) + 1)
  }
  const ownersWithTraffic = new Set(analyticsInRange.map((a) => a.user_id))

  // 1. Activation funnel (over users who signed up in range, monotonic stages)
  const createdUsers = usersInRange.filter((u) => firstCatByUser.has(u.id))
  const publishedUsers = createdUsers.filter((u) => publishedByUser.has(u.id))
  const visitedUsers = publishedUsers.filter((u) => ownersWithTraffic.has(u.id))
  const publishedInRange = cataloguesInRange.filter((c) => isPublished(c.status))

  // 2. Activation rate over time + time-to-first-catalogue
  const ttv: number[] = []
  for (const u of usersInRange) {
    const f = firstCatByUser.get(u.id)
    if (f != null && u.created_at) {
      const d = (f - new Date(u.created_at).getTime()) / dayMs
      if (d >= 0) ttv.push(d)
    }
  }
  const cohortMonths = enumerateMonths(start, end)
  const cohortTotals = new Map<string, number>(cohortMonths.map((m) => [m, 0]))
  const cohortActive = new Map<string, number>(cohortMonths.map((m) => [m, 0]))
  for (const u of usersInRange) {
    if (!u.created_at) continue
    const k = u.created_at.slice(0, 7)
    if (!cohortTotals.has(k)) continue
    cohortTotals.set(k, cohortTotals.get(k)! + 1)
    if (firstCatByUser.has(u.id)) cohortActive.set(k, cohortActive.get(k)! + 1)
  }
  const activation = {
    funnel: [
      { name: "Signed up", value: usersInRange.length },
      { name: "Created catalogue", value: createdUsers.length },
      { name: "Published", value: publishedUsers.length },
      { name: "Got a visitor", value: visitedUsers.length },
    ],
    activationRate: usersInRange.length
      ? round1((createdUsers.length / usersInRange.length) * 100)
      : 0,
    publishRate: cataloguesInRange.length
      ? round1((publishedInRange.length / cataloguesInRange.length) * 100)
      : 0,
    visitorRate: publishedUsers.length
      ? round1((visitedUsers.length / publishedUsers.length) * 100)
      : 0,
    medianTtvDays: ttv.length ? round1(median(ttv)) : null,
    rateByCohort: cohortMonths.map((m) => {
      const tot = cohortTotals.get(m) ?? 0
      const act = cohortActive.get(m) ?? 0
      return {
        date: monthLabel(m),
        "Activation %": tot ? round1((act / tot) * 100) : 0,
      }
    }),
  }

  // 3. Creator distribution: ghost users vs power creators (snapshot)
  const ghostUsers = data.users.filter((u) => !catCountByUser.has(u.id)).length
  let creatorsOne = 0
  let creatorsMid = 0
  let creatorsPower = 0
  for (const [, n] of catCountByUser) {
    if (n === 1) creatorsOne++
    else if (n <= 5) creatorsMid++
    else creatorsPower++
  }
  const creators = {
    distribution: [
      { name: "0 (ghost)", value: ghostUsers },
      { name: "1", value: creatorsOne },
      { name: "2–5", value: creatorsMid },
      { name: "6+", value: creatorsPower },
    ],
    ghostUsers,
    ghostPct: data.users.length
      ? round1((ghostUsers / data.users.length) * 100)
      : 0,
    powerCreators: creatorsPower,
  }

  // 4 + 5. Engagement quality + active catalogues over time + Pareto
  const publishedCats = data.catalogues.filter((c) => isPublished(c.status))
  const publishedCount = publishedCats.length
  const pubViews: number[] = []
  let cataloguesWithTraffic = 0
  for (const c of publishedCats) {
    const pv = viewsByCatId.get(c.id) ?? 0
    pubViews.push(pv)
    if (pv > 0) cataloguesWithTraffic++
  }
  const viewBucketDefs: { name: string; test: (v: number) => boolean }[] = [
    { name: "0", test: (v) => v === 0 },
    { name: "1–10", test: (v) => v >= 1 && v <= 10 },
    { name: "11–50", test: (v) => v >= 11 && v <= 50 },
    { name: "51–200", test: (v) => v >= 51 && v <= 200 },
    { name: "200+", test: (v) => v > 200 },
  ]
  const sortedViews = [...viewsByCatId.values()].sort((a, b) => b - a)
  const totalCatPv = sortedViews.reduce((s, v) => s + v, 0)
  const paretoTopN = Math.max(1, Math.ceil(sortedViews.length * 0.1))
  const activeSets = new Map<string, Set<string>>(
    periods.map((p) => [p, new Set<string>()]),
  )
  for (const a of analyticsInRange) {
    if ((a.pageviews ?? 0) <= 0 || !a.catalogue_id) continue
    activeSets.get(periodKeyOf(a.day))?.add(a.catalogue_id)
  }
  const engagement = {
    publishedCatalogues: publishedCount,
    cataloguesWithTraffic,
    deadPct: publishedCount
      ? round1(((publishedCount - cataloguesWithTraffic) / publishedCount) * 100)
      : 0,
    medianViews: Math.round(median(pubViews)),
    repeatRatio: totalUv ? round1(totalPv / totalUv) : 0,
    viewsBuckets: viewBucketDefs.map((d) => ({
      name: d.name,
      value: pubViews.filter(d.test).length,
    })),
    activeOverTime: periods.map((p) => ({
      date: periodLabel(p),
      "Active catalogues": activeSets.get(p)?.size ?? 0,
    })),
    paretoTopShare: totalCatPv
      ? round1(
          (sortedViews.slice(0, paretoTopN).reduce((s, v) => s + v, 0) /
            totalCatPv) *
            100,
        )
      : 0,
  }

  // 6. Content depth & completeness (catalogues created in range)
  const nCat = cataloguesInRange.length
  const pctOfCat = (k: number) => (nCat ? round1((k / nCat) * 100) : 0)
  const content = {
    avgSections: nCat
      ? round1(
          cataloguesInRange.reduce((s, c) => s + c.contentSections, 0) / nCat,
        )
      : 0,
    avgItems: nCat
      ? round1(cataloguesInRange.reduce((s, c) => s + c.contentItems, 0) / nCat)
      : 0,
    completeness: [
      { name: "Logo", value: pctOfCat(cataloguesInRange.filter((c) => c.hasLogo).length) },
      { name: "Contact", value: pctOfCat(cataloguesInRange.filter((c) => c.hasContact).length) },
      { name: "Legal info", value: pctOfCat(cataloguesInRange.filter((c) => c.hasLegal).length) },
      { name: "SEO", value: pctOfCat(cataloguesInRange.filter((c) => c.hasSeo).length) },
      { name: "Partners", value: pctOfCat(cataloguesInRange.filter((c) => c.hasPartners).length) },
      { name: "Tags", value: pctOfCat(cataloguesInRange.filter((c) => c.tagCount > 0).length) },
    ],
  }

  // 7. Freshness & stale rate (edited% in range; staleness over published)
  const editedThresholdMs = 60 * 1000
  const editedInRange = cataloguesInRange.filter(
    (c) =>
      c.updated_at &&
      new Date(c.updated_at).getTime() >
        new Date(c.created_at).getTime() + editedThresholdMs,
  ).length
  const daysSince: number[] = []
  const recency = { lt7: 0, lt30: 0, lt90: 0, gt90: 0 }
  let staleCount = 0
  for (const c of publishedCats) {
    const ref = c.updated_at ?? c.created_at
    if (!ref) continue
    const d = (endMs - new Date(ref).getTime()) / dayMs
    daysSince.push(d)
    if (d > 90) {
      staleCount++
      recency.gt90++
    } else if (d < 7) recency.lt7++
    else if (d < 30) recency.lt30++
    else recency.lt90++
  }
  const freshness = {
    pctEdited: nCat ? round1((editedInRange / nCat) * 100) : 0,
    pctStale: publishedCount ? round1((staleCount / publishedCount) * 100) : 0,
    medianDaysSinceEdit: daysSince.length ? Math.round(median(daysSince)) : null,
    recencyBuckets: [
      { name: "<7d", value: recency.lt7 },
      { name: "7–30d", value: recency.lt30 },
      { name: "30–90d", value: recency.lt90 },
      { name: ">90d", value: recency.gt90 },
    ],
  }

  // 8. Subscription health & conversion (status = current snapshot)
  const subs = data.subscriptions
  const isActiveSub = (s: SubscriptionRow) =>
    (s.subscription_status ?? "").toLowerCase() === "active"
  const isCanceledSub = (s: SubscriptionRow) =>
    /cancel/i.test(s.subscription_status ?? "")
  const subCustomers = new Set(subs.map((s) => s.customer_id))
  const activeCustomers = new Set(subs.filter(isActiveSub).map((s) => s.customer_id))
  const totalUsersAll = data.users.length
  const activeSubCount = subs.filter(isActiveSub).length
  const canceledSubCount = subs.filter(isCanceledSub).length
  const subByPeriod = new Map<string, number>(periods.map((p) => [p, 0]))
  for (const s of subs) {
    if (!isoInRange(s.created_at)) continue
    const k = periodKeyOf(s.created_at!)
    if (subByPeriod.has(k)) subByPeriod.set(k, subByPeriod.get(k)! + 1)
  }
  const subscriptions = {
    statusMix: bucketise(
      subs.map((s) => ({ key: s.subscription_status })),
      titleCase,
    ),
    conversionFunnel: [
      { name: "Signed up", value: totalUsersAll },
      { name: "Subscribed", value: subCustomers.size },
      { name: "Active paid", value: activeCustomers.size },
    ],
    paidConversionPct: totalUsersAll
      ? round1((activeCustomers.size / totalUsersAll) * 100)
      : 0,
    churnRate:
      activeSubCount + canceledSubCount
        ? round1((canceledSubCount / (activeSubCount + canceledSubCount)) * 100)
        : 0,
    scheduledCancellations: subs.filter(
      (s) => s.scheduled_change != null && String(s.scheduled_change).trim() !== "",
    ).length,
    newOverTime: periods.map((p) => ({
      date: periodLabel(p),
      "New subscriptions": subByPeriod.get(p) ?? 0,
    })),
  }

  // 9. Revenue (MRR/ARR/ARPU need Paddle prices — P3; else payer counts)
  const activeSubs = subs.filter(isActiveSub)
  const byPlanMap = new Map<string, number>()
  for (const s of activeSubs) {
    const name = s.price_id ? (planNameById.get(s.price_id) ?? "Unknown") : "Unknown"
    byPlanMap.set(name, (byPlanMap.get(name) ?? 0) + 1)
  }
  const pricesConfigured = Object.keys(PRICE_BY_PRICE_ID).length > 0
  const mrr = pricesConfigured
    ? activeSubs.reduce(
        (s, sub) => s + (sub.price_id ? (PRICE_BY_PRICE_ID[sub.price_id] ?? 0) : 0),
        0,
      )
    : null
  const activePayers = activeCustomers.size
  const revenue = {
    activePayers,
    mrr,
    arr: mrr != null ? mrr * 12 : null,
    arpu: mrr != null && activePayers ? Math.round((mrr / activePayers) * 100) / 100 : null,
    byPlan: Array.from(byPlanMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    pricesConfigured,
  }

  // 10. Feature adoption. Which features a catalogue uses is a snapshot of its
  // current settings, so adoption is all-time; AI usage and the activity
  // series follow the selected period.
  const totalCatalogues = data.catalogues.length
  const adoption = FEATURES.map((f) => {
    const using = data.catalogues.filter((c) => c.features.includes(f.key))
    return {
      key: f.key,
      label: f.label,
      group: f.group,
      catalogues: using.length,
      pctCatalogues: totalCatalogues
        ? round1((using.length / totalCatalogues) * 100)
        : 0,
      owners: new Set(using.map((c) => c.user_id)).size,
    }
  })

  // AI assistant turns. A refunded turn failed and gave its credits back, so
  // it counts as an attempt but not as credits spent.
  const aiInRange = data.aiCredits.filter((a) => isoInRange(a.created_at))
  const aiRefunded = aiInRange.filter((a) => a.refunded_at != null).length
  const aiCreditsByUser = new Map<string, number>()
  for (const a of aiInRange) {
    if (a.refunded_at != null) continue
    aiCreditsByUser.set(
      a.user_id,
      (aiCreditsByUser.get(a.user_id) ?? 0) + (a.credits ?? 0),
    )
  }
  const aiUsers = new Set(aiInRange.map((a) => a.user_id)).size
  const aiByPeriod = new Map<string, { turns: number; ai: number; ocr: number }>(
    periods.map((p) => [p, { turns: 0, ai: 0, ocr: 0 }]),
  )
  for (const a of aiInRange) {
    const b = aiByPeriod.get(periodKeyOf(a.created_at))
    if (b) b.turns++
  }
  for (const c of cataloguesInRange) {
    const b = aiByPeriod.get(periodKeyOf(c.created_at))
    if (!b) continue
    if (c.source === "ai_prompt") b.ai++
    else if (c.source === "ocr_import") b.ocr++
  }

  const themeLabel = (t: string) =>
    t === "custom"
      ? "Custom"
      : t === "-"
        ? "Unknown"
        : titleCase(t.replace(/^theme-/, ""))

  const activityByPeriod = new Map<
    string,
    { qr: number; themes: number; subscribers: number }
  >(periods.map((p) => [p, { qr: 0, themes: 0, subscribers: 0 }]))
  const countInto = (
    rows: { created_at: string | null }[],
    field: "qr" | "themes" | "subscribers",
  ) => {
    let n = 0
    for (const r of rows) {
      if (!isoInRange(r.created_at)) continue
      n++
      const b = activityByPeriod.get(periodKeyOf(r.created_at!))
      if (b) b[field]++
    }
    return n
  }
  countInto(data.qrConfigs, "qr")
  countInto(data.userThemes, "themes")
  const subscribersInRange = countInto(data.catalogueSubscribers, "subscribers")

  const features = {
    adoption,
    totalCatalogues,
    trackedCatalogues: data.catalogues.filter(
      (c) =>
        c.features.includes("googleAnalytics") ||
        c.features.includes("metaPixel"),
    ).length,
    ai: {
      turns: aiInRange.length,
      users: aiUsers,
      userPct: catCountByUser.size
        ? round1((aiUsers / catCountByUser.size) * 100)
        : 0,
      creditsSpent: Array.from(aiCreditsByUser.values()).reduce(
        (s, v) => s + v,
        0,
      ),
      refundRate: aiInRange.length
        ? round1((aiRefunded / aiInRange.length) * 100)
        : 0,
      topUsers: rankUsers(aiCreditsByUser),
      overTime: periods.map((p) => {
        const b = aiByPeriod.get(p)!
        return {
          date: periodLabel(p),
          "AI turns": b.turns,
          "AI catalogues": b.ai,
          "OCR imports": b.ocr,
        }
      }),
    },
    themes: {
      popularity: bucketise(
        data.catalogues.map((c) => ({ key: c.theme })),
        themeLabel,
      ),
      savedThemes: data.userThemes.length,
      usersWithSavedThemes: new Set(data.userThemes.map((t) => t.user_id)).size,
    },
    leads: {
      subscribers: subscribersInRange,
      marketingSignups: data.newsletterSubscriberCount,
      qrCodes: data.qrConfigs.length,
    },
    activityOverTime: periods.map((p) => {
      const b = activityByPeriod.get(p)!
      return {
        date: periodLabel(p),
        "QR codes": b.qr,
        "Saved themes": b.themes,
        "Newsletter signups": b.subscribers,
      }
    }),
  }

  // 11. New-user insights — everything below is scoped to the cohort of users
  // who signed up inside the selected period, and to the catalogues that
  // cohort created in the same period.
  const newUserIds = new Set(usersInRange.map((u) => u.id))
  const cohortCatalogues = cataloguesInRange.filter((c) =>
    newUserIds.has(c.user_id),
  )
  const cohortActivated = new Set(cohortCatalogues.map((c) => c.user_id)).size
  const cohortPublished = cohortCatalogues.filter((c) => isPublished(c.status))

  // Views are taken from the analytics rows owned by the cohort, so rows not
  // tied to a specific catalogue still count towards the headline total.
  let cohortViews = 0
  let cohortVisitors = 0
  for (const a of analyticsInRange) {
    if (!newUserIds.has(a.user_id)) continue
    cohortViews += a.pageviews ?? 0
    cohortVisitors += a.unique_visitors ?? 0
  }

  const activeCustomerIds = activeCustomers
  const cohortSubscribed = usersInRange.filter(
    (u) => u.customer_id && activeCustomerIds.has(u.customer_id),
  ).length

  // Per-period cohort series: signups, catalogues they created, and the ratio.
  const cohortUsersByPeriod = new Map<string, number>(periods.map((p) => [p, 0]))
  const cohortCatsByPeriod = new Map<string, number>(periods.map((p) => [p, 0]))
  for (const u of usersInRange) {
    if (!u.created_at) continue
    const k = periodKeyOf(u.created_at)
    if (cohortUsersByPeriod.has(k))
      cohortUsersByPeriod.set(k, cohortUsersByPeriod.get(k)! + 1)
  }
  for (const c of cohortCatalogues) {
    const k = periodKeyOf(c.created_at)
    if (cohortCatsByPeriod.has(k))
      cohortCatsByPeriod.set(k, cohortCatsByPeriod.get(k)! + 1)
  }

  // Views broken down by the attributes of the catalogue that earned them.
  const sumViewsBy = (pick: (c: (typeof cohortCatalogues)[number]) => string) => {
    const m = new Map<string, number>()
    for (const c of cohortCatalogues) {
      const v = viewsByCatId.get(c.id) ?? 0
      if (v <= 0) continue
      const k = pick(c)
      m.set(k, (m.get(k) ?? 0) + v)
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  const viewsByCategory = sumViewsBy((c) => titleCase(c.business_type ?? "-"))
  const viewsBySource = sumViewsBy((c) => titleCase(c.source ?? "-"))
  const attributedViews = cohortCatalogues.reduce(
    (s, c) => s + (viewsByCatId.get(c.id) ?? 0),
    0,
  )

  const cohortCatsByUser = new Map<string, number>()
  for (const c of cohortCatalogues) {
    cohortCatsByUser.set(
      c.user_id,
      (cohortCatsByUser.get(c.user_id) ?? 0) + 1,
    )
  }

  const insights = {
    newUsers: usersInRange.length,
    activatedUsers: cohortActivated,
    activationRate: usersInRange.length
      ? round1((cohortActivated / usersInRange.length) * 100)
      : 0,
    cataloguesCreated: cohortCatalogues.length,
    cataloguesPerUser: usersInRange.length
      ? Number((cohortCatalogues.length / usersInRange.length).toFixed(2))
      : 0,
    publishedCatalogues: cohortPublished.length,
    publishRate: cohortCatalogues.length
      ? round1((cohortPublished.length / cohortCatalogues.length) * 100)
      : 0,
    totalViews: cohortViews,
    uniqueVisitors: cohortVisitors,
    viewsPerCatalogue: cohortCatalogues.length
      ? round1(cohortViews / cohortCatalogues.length)
      : 0,
    viewsPerUser: usersInRange.length
      ? round1(cohortViews / usersInRange.length)
      : 0,
    subscribedUsers: cohortSubscribed,
    paidConversionRate: usersInRange.length
      ? round1((cohortSubscribed / usersInRange.length) * 100)
      : 0,
    medianTtvDays: activation.medianTtvDays,
    overTime: periods.map((p) => ({
      date: periodLabel(p),
      "New users": cohortUsersByPeriod.get(p) ?? 0,
      "New catalogues": cohortCatsByPeriod.get(p) ?? 0,
    })),
    // Running ratio rather than a per-period one: on a daily bucket a signup
    // and the catalogue it eventually produces rarely land on the same day, so
    // a per-period division would read zero almost everywhere.
    ratioOverTime: (() => {
      let ru = 0
      let rc = 0
      return periods.map((p) => {
        ru += cohortUsersByPeriod.get(p) ?? 0
        rc += cohortCatsByPeriod.get(p) ?? 0
        return {
          date: periodLabel(p),
          "Catalogues per user": ru ? Number((rc / ru).toFixed(2)) : 0,
        }
      })
    })(),
    byCategory: bucketise(
      cohortCatalogues.map((c) => ({ key: c.business_type })),
      titleCase,
    ).slice(0, 8),
    bySource: bucketise(
      cohortCatalogues.map((c) => ({ key: c.source })),
      titleCase,
    ),
    byLanguage: bucketise(
      cohortCatalogues.map((c) => ({ key: c.language?.toUpperCase() ?? null })),
    ),
    byStatus: bucketise(
      cohortCatalogues.map((c) => ({ key: c.status })),
      titleCase,
    ),
    byPlan: planByUsers,
    viewsByCategory: viewsByCategory.slice(0, 8),
    viewsBySource,
    attributedViews,
    topCreators: rankUsers(cohortCatsByUser),
    topCatalogues: cohortCatalogues
      .map((c) => ({
        id: c.id,
        name: c.name,
        value: viewsByCatId.get(c.id) ?? 0,
        meta: titleCase(c.business_type ?? "-"),
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  }

  // 12. Who is creating — new signups vs the existing base. Keeping these two
  // ratios apart matters: dividing every catalogue created in the period by
  // the new signups alone produces a number that describes neither group.
  // "Existing" means signed up strictly before the period started — not just
  // "not in range", which would sweep in later signups when the range ends in
  // the past (a custom range) and quietly inflate the denominator.
  const existingUserIds = new Set<string>()
  for (const u of data.users) {
    if (u.created_at && u.created_at.slice(0, 10) < startISO) {
      existingUserIds.add(u.id)
    }
  }
  // A catalogue whose owner is not in `users` at all (deleted account) counts
  // as existing, since it certainly was not created by a signup in range.
  const cataloguesByNew = cohortCatalogues.length
  const cataloguesByExisting = cataloguesInRange.length - cataloguesByNew
  const activeExistingCreators = new Set(
    cataloguesInRange
      .filter((c) => !newUserIds.has(c.user_id))
      .map((c) => c.user_id),
  ).size
  const splitByPeriod = new Map<string, { neu: number; old: number }>(
    periods.map((p) => [p, { neu: 0, old: 0 }]),
  )
  for (const c of cataloguesInRange) {
    const b = splitByPeriod.get(periodKeyOf(c.created_at))
    if (!b) continue
    if (newUserIds.has(c.user_id)) b.neu++
    else b.old++
  }
  const creationSplit = {
    newUsers: usersInRange.length,
    existingUsers: existingUserIds.size,
    cataloguesByNewUsers: cataloguesByNew,
    cataloguesByExistingUsers: cataloguesByExisting,
    perNewUser: usersInRange.length
      ? Number((cataloguesByNew / usersInRange.length).toFixed(2))
      : 0,
    perExistingUser: existingUserIds.size
      ? Number((cataloguesByExisting / existingUserIds.size).toFixed(2))
      : 0,
    activeExistingCreators,
    overTime: periods.map((p) => {
      const b = splitByPeriod.get(p)!
      return {
        date: periodLabel(p),
        "By new users": b.neu,
        "By existing users": b.old,
      }
    }),
  }

  return {
    insights,
    creationSplit,
    totals,
    growth: {
      users: { monthly: usersMonthly, cumulative: usersCumulative },
      catalogues: { monthly: catsMonthly, cumulative: catsCumulative },
    },
    pageviewsSeries,
    catalogues: { byStatus, bySource, byLanguage, byBusinessType },
    plans: { byUsers: planByUsers },
    topCataloguesByPageviews,
    topUsersByCatalogues,
    activation,
    creators,
    engagement,
    content,
    freshness,
    subscriptions,
    revenue,
    features,
  }
}
