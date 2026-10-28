import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { query } from "@/lib/db"
import { internalMatcher } from "@/lib/internal"
import { getPaddleData } from "@/lib/paddle"
import { segmentSummaries } from "@/lib/segments"
import { readSession } from "@/lib/session"

import Dashboard from "./_dashboard/Dashboard"
import { aggregate, type RawCatalogue } from "./_dashboard/aggregate"
import type {
  AiCreditRow,
  AnalyticsRow,
  CatalogueSubscriberRow,
  Person,
  PlanRow,
  QrConfigRow,
  SubscriptionRow,
  UserThemeRow,
} from "./_dashboard/types"

type RawUser = {
  id: string
  email: string | null
  name: string | null
  created_at: string | null
  plan_id: string | null
  customer_id: string | null
  acquisition_source: string | null
}

export default async function Page() {
  // Always render on request: the data comes from the database, not from
  // anything Next.js can see changing.
  await connection()

  // Checked before any query runs, so nothing is read for a visitor who isn't
  // signed in.
  const username = readSession(await cookies())
  if (!username) redirect("/login")

  const [
    rawUsers,
    catalogues,
    analytics,
    plans,
    subscriptions,
    aiCredits,
    qrConfigs,
    catalogueSubscribers,
    userThemes,
    newsletterCount,
    lastImport,
  ] = await Promise.all([
    query<RawUser>(
      `select id, email, name, created_at, plan_id, customer_id, acquisition_source
         from public.users`,
    ),
    query<RawCatalogue>(
      `select id, name, status, language, business_type, user_id,
              created_at, updated_at, content, logo, contact, legal, metadata,
              appearance, header, footer, partners, tags
         from public.catalogues`,
    ),
    query<AnalyticsRow>(
      "select day, pageviews, unique_visitors, user_id, catalogue_id from public.analytics",
    ),
    query<PlanRow>("select id, name from public.plans"),
    query<SubscriptionRow>(
      `select subscription_id, subscription_status, price_id, scheduled_change,
              customer_id, created_at
         from public.subscriptions`,
    ),
    query<AiCreditRow>(
      `select user_id, catalogue_id, kind, credits, refunded_at, created_at
         from public.ai_credits`,
    ),
    // Read with text comparisons rather than casts, so an odd value in an old
    // design reads as "no" instead of failing the page.
    query<QrConfigRow>(
      `select catalogue_id, created_at,
              coalesce(config->>'image', '') <> ''
                and config->>'showLogo' is distinct from 'false' as has_logo,
              coalesce(config->'frameText'->>'show' = 'true', false) as has_frame
         from public.qr_configs`,
    ),
    query<CatalogueSubscriberRow>(
      "select catalogue_id, created_at from public.catalogue_subscribers",
    ),
    query<UserThemeRow>("select user_id, created_at from public.user_themes"),
    query<{ count: number }>(
      "select count(*)::int as count from public.newsletter_subscribers",
    ),
    query<{ at: string | null }>(
      `select max(created_at) as at from public.job_logs
        where job_name like 'analytics%' and status = 'success'`,
    ),
  ])

  // Paddle metrics start from the first signup.
  const firstDay =
    rawUsers
      .map((u) => u.created_at?.slice(0, 10))
      .filter((d): d is string => !!d)
      .sort()[0] ?? new Date().toISOString().slice(0, 10)
  const paddle = await getPaddleData(firstDay)
  const segments = await segmentSummaries(paddle?.subscriptions ?? null)

  // Names and emails go to the browser only for people a ranking can show:
  // catalogue owners and AI users. Everyone else is just an id.
  const ranked = new Set([
    ...catalogues.map((c) => c.user_id),
    ...aiCredits.map((a) => a.user_id),
  ])
  const isInternal = internalMatcher()
  const people: Record<string, Person> = {}
  const users = rawUsers.map((u) => {
    if (ranked.has(u.id)) people[u.id] = { name: u.name, email: u.email }
    return {
      id: u.id,
      created_at: u.created_at,
      plan_id: u.plan_id,
      customer_id: u.customer_id,
      acquisition_source: u.acquisition_source,
      internal: isInternal(u.email),
    }
  })

  const data = aggregate({
    users,
    people,
    catalogues,
    analytics,
    plans,
    subscriptions,
    aiCredits,
    qrConfigs,
    catalogueSubscribers,
    userThemes,
    newsletterSubscriberCount: newsletterCount[0]?.count ?? 0,
    lastImportAt: lastImport[0]?.at ?? null,
    paddle,
    segments,
  })

  return <Dashboard data={data} username={username} />
}
