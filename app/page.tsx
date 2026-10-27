import { connection } from "next/server"

import { query } from "@/lib/db"

import Dashboard from "./_dashboard/Dashboard"
import { aggregate, type RawCatalogue } from "./_dashboard/aggregate"
import type {
  AiCreditRow,
  AnalyticsRow,
  CatalogueSubscriberRow,
  PlanRow,
  QrConfigRow,
  SubscriptionRow,
  UserRow,
  UserThemeRow,
} from "./_dashboard/types"

export default async function Page() {
  // Always render on request: the data comes from the database, not from
  // anything Next.js can see changing.
  await connection()

  const [
    users,
    catalogues,
    analytics,
    plans,
    subscriptions,
    aiCredits,
    qrConfigs,
    catalogueSubscribers,
    userThemes,
    newsletterCount,
  ] = await Promise.all([
    query<UserRow>(
      "select id, email, name, created_at, plan_id, customer_id from public.users",
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
  ])

  const data = aggregate({
    users,
    catalogues,
    analytics,
    plans,
    subscriptions,
    aiCredits,
    qrConfigs,
    catalogueSubscribers,
    userThemes,
    newsletterSubscriberCount: newsletterCount[0]?.count ?? 0,
  })

  return <Dashboard data={data} />
}
