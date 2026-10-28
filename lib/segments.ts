import {
  PAYING_STATUSES,
  STARTER_ITEMS,
  STARTER_SECTIONS,
} from "@/app/_dashboard/plans"
import type {
  PaddleSubscription,
  SegmentSummary,
} from "@/app/_dashboard/types"

import { query } from "./db"
import { internalLists, NOT_INTERNAL_SQL } from "./internal"

// Outreach lists: who is on each, as SQL that returns one row per person.
// The dashboard shows their counts and /api/outreach/[segment] exports them,
// so both always use the same definition. Internal accounts are never listed.

// Each catalogue with its section and item counts, as the dashboard counts
// them (items are the entries of an items section).
const SIZED = `sized as (
  select c.id, c.user_id, c.name, c.status, c.created_at, c.business_type, c.language,
         case when jsonb_typeof(c.content) = 'array'
              then jsonb_array_length(c.content) else 0 end as sections,
         (select coalesce(sum(jsonb_array_length(s->'items')), 0)
            from jsonb_array_elements(
                   case when jsonb_typeof(c.content) = 'array'
                        then c.content else '[]'::jsonb end) s
           where jsonb_typeof(s->'items') = 'array') as items
    from public.catalogues c
)`

// Per owner: how many catalogues, how many built, how many published.
const CATS = `${SIZED},
cats as (
  select user_id,
         count(*) as catalogues,
         count(*) filter (where sections > 0) as built,
         count(*) filter (where sections > 0 and status = 'active') as published,
         string_agg(name, '; ' order by created_at) as catalogue,
         min(created_at) as first_catalogue_at,
         max(business_type) as business_type,
         max(language) as language
    from sized
   group by user_id
)`

const PAYING = `(${PAYING_STATUSES.map((s) => `'${s}'`).join(", ")})`

type Base = {
  id: string
  label: string
  who: string
  why: string
  subject: string
  columns: string[]
}

type DbSegment = Base & { sql: string }

type PaddleSegment = Base & {
  matches: (s: PaddleSubscription) => boolean
  // Columns that come from the subscription rather than the database.
  detail: (s: PaddleSubscription) => Record<string, unknown>
}

export const DB_SEGMENTS: DbSegment[] = [
  {
    id: "empty-catalogue",
    label: "Empty catalogue",
    who: "Own catalogues, all of them without content",
    why: "They named a catalogue and stopped. Help them add the first items.",
    subject: "Your catalogue {catalogue} is waiting for its first items",
    columns: ["email", "name", "signed_up_at", "catalogue", "business_type", "language", "catalogue_created_at", "days_waiting", "plan"],
    sql: `with ${CATS}
      select u.email, u.name, u.created_at::date as signed_up_at, k.catalogue,
             k.business_type, k.language,
             k.first_catalogue_at::date as catalogue_created_at,
             current_date - k.first_catalogue_at::date as days_waiting,
             coalesce(p.name, 'Starter') as plan
        from public.users u
        join cats k on k.user_id = u.id
        left join public.plans p on p.id = u.plan_id
       where k.built = 0 and u.email is not null and ${NOT_INTERNAL_SQL}
       order by k.first_catalogue_at desc`,
  },
  {
    id: "never-started",
    label: "Never started",
    who: "Signed up and never made a catalogue",
    why: "Show a two-minute start, or the AI import.",
    subject: "Make your first catalogue in 2 minutes",
    columns: ["email", "name", "signed_up_at", "days_since_signup", "plan"],
    sql: `select u.email, u.name, u.created_at::date as signed_up_at,
             current_date - u.created_at::date as days_since_signup,
             coalesce(p.name, 'Starter') as plan
        from public.users u
        left join public.plans p on p.id = u.plan_id
       where not exists (select 1 from public.catalogues c where c.user_id = u.id)
         and u.email is not null and ${NOT_INTERNAL_SQL}
       order by u.created_at desc`,
  },
  {
    id: "published-empty",
    label: "Published but empty",
    who: "Have a live catalogue with no content",
    why: "Their visitors land on a blank page.",
    subject: "Your live catalogue is empty",
    columns: ["email", "name", "catalogue", "plan"],
    sql: `with ${SIZED}
      select u.email, u.name, string_agg(c.name, '; ' order by c.created_at) as catalogue,
             coalesce(max(p.name), 'Starter') as plan
        from sized c
        join public.users u on u.id = c.user_id
        left join public.plans p on p.id = u.plan_id
       where c.status = 'active' and c.sections = 0
         and u.email is not null and ${NOT_INTERNAL_SQL}
       group by u.id, u.email, u.name
       order by max(c.created_at) desc`,
  },
  {
    id: "built-not-published",
    label: "Built, not published",
    who: "Have content, nothing live",
    why: "One step from going live.",
    subject: "{catalogue} is ready. Publish it?",
    columns: ["email", "name", "signed_up_at", "catalogue", "plan"],
    sql: `with ${CATS}
      select u.email, u.name, u.created_at::date as signed_up_at, k.catalogue,
             coalesce(p.name, 'Starter') as plan
        from public.users u
        join cats k on k.user_id = u.id
        left join public.plans p on p.id = u.plan_id
       where k.built > 0 and k.published = 0
         and u.email is not null and ${NOT_INTERNAL_SQL}
       order by k.first_catalogue_at desc`,
  },
  {
    id: "starter-limit",
    label: "At the Starter limit",
    who: `On Starter with a catalogue at ${STARTER_ITEMS} items or ${STARTER_SECTIONS} sections`,
    why: "They outgrew the free plan. A good moment for an upgrade offer.",
    subject: "You've reached the Starter limit",
    columns: ["email", "name", "catalogue", "sections", "items"],
    sql: `with ${SIZED}
      select u.email, u.name, string_agg(c.name, '; ' order by c.created_at) as catalogue,
             max(c.sections) as sections, max(c.items) as items
        from sized c
        join public.users u on u.id = c.user_id
        left join public.plans p on p.id = u.plan_id
       where coalesce(p.name, 'Starter') = 'Starter'
         and (c.sections >= ${STARTER_SECTIONS} or c.items >= ${STARTER_ITEMS})
         and u.email is not null and ${NOT_INTERNAL_SQL}
       group by u.id, u.email, u.name
       order by max(c.items) desc`,
  },
  {
    id: "paying-no-views",
    label: "Paying, no views",
    who: "Paying, with no views in the last 30 days of data",
    why: "They pay and get nothing back. Help before they cancel.",
    subject: "Need a hand getting views?",
    columns: ["email", "name", "plan", "last_view_day"],
    sql: `with last_day as (select max(day) as d from public.analytics),
           paying as (
             select distinct customer_id from public.subscriptions
              where subscription_status in ${PAYING})
      select u.email, u.name, coalesce(p.name, 'Starter') as plan,
             (select max(a.day) from public.analytics a
               where a.user_id = u.id and a.pageviews > 0) as last_view_day
        from public.users u
        join paying s on s.customer_id = u.customer_id
        left join public.plans p on p.id = u.plan_id
        cross join last_day
       where not exists (
               select 1 from public.analytics a
                where a.user_id = u.id and a.pageviews > 0
                  and a.day > last_day.d - 30)
         and u.email is not null and ${NOT_INTERNAL_SQL}
       order by last_view_day nulls first`,
  },
  {
    id: "checkout-abandoned",
    label: "Checkout abandoned",
    who: "Opened Paddle checkout and never subscribed",
    why: "Something stopped them at the last step. Ask what.",
    subject: "Anything we can answer before you subscribe?",
    columns: ["email", "name", "signed_up_at"],
    sql: `select u.email, u.name, u.created_at::date as signed_up_at
        from public.users u
       where u.customer_id is not null
         and not exists (
               select 1 from public.subscriptions s
                where s.customer_id = u.customer_id)
         and u.email is not null and ${NOT_INTERNAL_SQL}
       order by u.created_at desc`,
  },
  {
    id: "former-customers",
    label: "Former customers",
    who: "Had a subscription, none active or paused now",
    why: "Win them back with what changed since they left.",
    subject: "What's new since you left",
    columns: ["email", "name", "first_subscribed", "last_subscribed", "last_plan"],
    sql: `select u.email, u.name,
             min(s.created_at)::date as first_subscribed,
             max(s.created_at)::date as last_subscribed,
             (array_agg(p.name order by s.created_at desc))[1] as last_plan
        from public.users u
        join public.subscriptions s on s.customer_id = u.customer_id
        left join public.plans p on p.id = s.price_id
       where u.email is not null and ${NOT_INTERNAL_SQL}
       group by u.id, u.email, u.name
      having bool_and(s.subscription_status not in ('active', 'past_due', 'paused', 'trialing'))
       order by max(s.created_at) desc`,
  },
]

export const PADDLE_SEGMENTS: PaddleSegment[] = [
  {
    id: "scheduled-cancel",
    label: "Scheduled to cancel",
    who: "Paying now, with a cancellation booked in Paddle",
    why: "Still paying, so there is time to change their mind.",
    subject: "Before your plan ends",
    columns: ["email", "name", "plan", "cancels_on"],
    matches: (s) =>
      s.scheduledAction === "cancel" && PAYING_STATUSES.includes(s.status),
    detail: (s) => ({ cancels_on: s.scheduledAt?.slice(0, 10) ?? null }),
  },
  {
    id: "past-due",
    label: "Payment past due",
    who: "Paddle couldn't collect their last payment",
    why: "Usually an expired card. A short note saves the subscription.",
    subject: "Your last payment didn't go through",
    columns: ["email", "name", "plan", "next_billed_at"],
    matches: (s) => s.status === "past_due",
    detail: (s) => ({ next_billed_at: s.nextBilledAt?.slice(0, 10) ?? null }),
  },
]

const internalParams = () => {
  const { emails, domains } = internalLists()
  return [emails, domains]
}

const summaryOf = (s: Base, count: number | null, needsPaddle: boolean) => ({
  id: s.id,
  label: s.label,
  who: s.who,
  why: s.why,
  subject: s.subject,
  count,
  needsPaddle,
})

// Counts for every list. Paddle lists count customers that are also users.
export async function segmentSummaries(
  paddleSubs: PaddleSubscription[] | null,
): Promise<SegmentSummary[]> {
  const params = internalParams()
  const db = await Promise.all(
    DB_SEGMENTS.map(async (s) => {
      const [row] = await query<{ n: number }>(
        `select count(*)::int as n from (${s.sql}) as listed`,
        params,
      )
      return summaryOf(s, row?.n ?? 0, false)
    }),
  )
  const paddle = await Promise.all(
    PADDLE_SEGMENTS.map(async (s) => {
      if (!paddleSubs) return summaryOf(s, null, true)
      const rows = await paddleRows(s, paddleSubs)
      return summaryOf(s, rows.length, true)
    }),
  )
  return [...db, ...paddle]
}

async function paddleRows(
  s: PaddleSegment,
  subs: PaddleSubscription[],
): Promise<Record<string, unknown>[]> {
  const byCustomer = new Map<string, PaddleSubscription>()
  for (const sub of subs) if (s.matches(sub)) byCustomer.set(sub.customerId, sub)
  if (byCustomer.size === 0) return []
  const users = await query<Record<string, unknown> & { customer_id: string }>(
    `select u.email, u.name, u.customer_id, coalesce(p.name, 'Starter') as plan
       from public.users u
       left join public.plans p on p.id = u.plan_id
      where u.customer_id = any($3::text[])
        and u.email is not null and ${NOT_INTERNAL_SQL}
      order by u.created_at desc`,
    [...internalParams(), [...byCustomer.keys()]],
  )
  return users.map((u) => ({ ...u, ...s.detail(byCustomer.get(u.customer_id)!) }))
}

export type SegmentExport = { columns: string[]; rows: Record<string, unknown>[] }

// Every row of one list, or null when there is no such list. A Paddle list
// needs the subscriptions passed in.
export async function segmentExport(
  id: string,
  paddleSubs: () => Promise<PaddleSubscription[] | null>,
): Promise<SegmentExport | null> {
  const db = DB_SEGMENTS.find((s) => s.id === id)
  if (db) {
    return { columns: db.columns, rows: await query(db.sql, internalParams()) }
  }
  const pd = PADDLE_SEGMENTS.find((s) => s.id === id)
  if (!pd) return null
  const subs = await paddleSubs()
  return { columns: pd.columns, rows: subs ? await paddleRows(pd, subs) : [] }
}
