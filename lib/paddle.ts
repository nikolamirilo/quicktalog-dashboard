import type {
  MetricPoint,
  MetricSeries,
  PaddleData,
  PaddleSubscription,
} from "@/app/_dashboard/types"

// Server only. Reads Paddle Billing with a read-only API key:
// PADDLE_API_KEY needs metrics.read, subscription.read and transaction.read;
// PADDLE_ENV=sandbox switches to the sandbox API. Responses are cached for 15
// minutes, so page loads don't each hit Paddle.
const BASE =
  process.env.PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com"
const REVALIDATE_S = 900
const MAX_PAGES = 50

export const paddleConfigured = () => !!process.env.PADDLE_API_KEY

const asObject = (o: unknown): Record<string, unknown> =>
  o && typeof o === "object" && !Array.isArray(o)
    ? (o as Record<string, unknown>)
    : {}
const asString = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null
const asNumber = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

async function paddle(pathOrUrl: string): Promise<Record<string, unknown>> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      "Paddle-Version": "1",
    },
    next: { revalidate: REVALIDATE_S },
  })
  if (!res.ok) {
    const path = new URL(url).pathname
    throw new Error(
      res.status === 403
        ? `${path}: the API key lacks the permission for this (403)`
        : `${path} answered ${res.status}`,
    )
  }
  return asObject(await res.json())
}

// A price's amount per month: annual prices are divided by 12, weekly ones
// multiplied up, and so on.
const PER_MONTH: Record<string, number> = {
  day: 365 / 12,
  week: 52 / 12,
  month: 1,
  year: 1 / 12,
}

function toSubscription(raw: unknown): PaddleSubscription | null {
  const s = asObject(raw)
  const id = asString(s.id)
  const customerId = asString(s.customer_id)
  if (!id || !customerId) return null
  const cycle = asObject(s.billing_cycle)
  const scheduled = asObject(s.scheduled_change)
  let monthlyAmount = 0
  const priceIds: string[] = []
  for (const item of Array.isArray(s.items) ? s.items : []) {
    const it = asObject(item)
    const price = asObject(it.price)
    const priceId = asString(price.id)
    if (priceId) priceIds.push(priceId)
    const itemCycle = asObject(price.billing_cycle)
    const interval = asString(itemCycle.interval) ?? asString(cycle.interval)
    const frequency = asNumber(itemCycle.frequency) ?? asNumber(cycle.frequency) ?? 1
    const cents = asNumber(asObject(price.unit_price).amount)
    if (!interval || cents == null || !(interval in PER_MONTH)) continue
    const quantity = asNumber(it.quantity) ?? 1
    monthlyAmount += ((cents / 100) * quantity * PER_MONTH[interval]) / frequency
  }
  return {
    id,
    status: asString(s.status) ?? "unknown",
    customerId,
    createdAt: asString(s.created_at),
    canceledAt: asString(s.canceled_at),
    nextBilledAt: asString(s.next_billed_at),
    scheduledAction: asString(scheduled.action),
    scheduledAt: asString(scheduled.effective_at),
    interval: asString(cycle.interval),
    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
    currency: asString(s.currency_code),
    priceIds,
  }
}

export async function getPaddleSubscriptions(): Promise<PaddleSubscription[]> {
  const out: PaddleSubscription[] = []
  let next: string | null =
    "/subscriptions?per_page=200&status=active,canceled,past_due,paused,trialing"
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const body = await paddle(next)
    for (const raw of Array.isArray(body.data) ? body.data : []) {
      const sub = toSubscription(raw)
      if (sub) out.push(sub)
    }
    const pagination = asObject(asObject(body.meta).pagination)
    next = pagination.has_more === true ? asString(pagination.next) : null
  }
  return out
}

// One datapoint per day in `data.timeseries`. `from` is inclusive and `to`
// exclusive; amounts are strings in the smallest currency unit.
async function getMetric(
  name: string,
  from: string,
  to: string,
): Promise<MetricSeries> {
  const data = asObject(
    (await paddle(`/metrics/${name}?from=${from}&to=${to}`)).data,
  )
  const points: MetricPoint[] = []
  for (const raw of Array.isArray(data.timeseries) ? data.timeseries : []) {
    const p = asObject(raw)
    const day = asString(p.timestamp)?.slice(0, 10)
    if (!day) continue
    const cents = asNumber(p.amount)
    points.push({
      day,
      amount: cents == null ? null : cents / 100,
      count: asNumber(p.count),
      completed: asNumber(p.completed_count),
    })
  }
  return { currency: asString(data.currency_code), points }
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

// Everything the money pages read, from `from` (YYYY-MM-DD) to today. Each
// part fails on its own: a key without metrics.read still loads
// subscriptions. Null when no key is set.
export async function getPaddleData(from: string): Promise<PaddleData | null> {
  if (!paddleConfigured()) return null
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const to = isoDay(tomorrow)
  const [subscriptions, mrr, revenue, refunds, checkout] =
    await Promise.allSettled([
      getPaddleSubscriptions(),
      getMetric("monthly-recurring-revenue", from, to),
      getMetric("revenue", from, to),
      getMetric("refunds", from, to),
      getMetric("checkout-conversion", from, to),
    ])
  const errors: string[] = []
  const value = <T,>(r: PromiseSettledResult<T>): T | null => {
    if (r.status === "fulfilled") return r.value
    errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
    return null
  }
  return {
    subscriptions: value(subscriptions),
    mrr: value(mrr),
    revenue: value(revenue),
    refunds: value(refunds),
    checkout: value(checkout),
    errors,
    fetchedAt: new Date().toISOString(),
  }
}
