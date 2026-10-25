import type { FeatureGroup, FeatureKey } from "./features"

export type UserPoint = { date: string; Users: number }
export type CataloguePoint = { date: string; Catalogues: number }

export type Pageview = {
  date: string
  Pageviews: number
  "Unique visitors": number
}
export type Bucket = { name: string; value: number }
export type Ranking = {
  id: string
  name: string
  value: number
  meta?: string
}

export type RangeKey = "1M" | "3M" | "6M" | "12M" | "ALL" | "CUSTOM"

export type UserRow = {
  id: string
  email: string | null
  name: string | null
  created_at: string | null
  plan_id: string | null
  customer_id: string | null
}

// Catalogue row delivered to the client. The heavy JSONB columns (content,
// appearance, header, footer, metadata, ...) are reduced to compact scalars
// and feature flags in `aggregate.ts` so the browser never receives the raw
// catalogue payload.
export type CatalogueRow = {
  id: string
  name: string
  status: string | null
  source: string | null
  language: string | null
  business_type: string | null
  user_id: string
  created_at: string
  updated_at: string | null
  contentSections: number
  contentItems: number
  hasLogo: boolean
  hasContact: boolean
  hasLegal: boolean
  hasSeo: boolean
  hasPartners: boolean
  tagCount: number
  // Stored theme name ("theme-monochrome", ...), or "custom" for a custom theme.
  theme: string | null
  features: FeatureKey[]
}

export type AnalyticsRow = {
  day: string
  pageviews: number
  unique_visitors: number | null
  user_id: string
  catalogue_id: string | null
}

export type PlanRow = {
  id: string
  name: string
}

export type SubscriptionRow = {
  subscription_id: string
  subscription_status: string
  price_id: string | null
  scheduled_change: string | null
  customer_id: string
  created_at: string | null
}

// One AI assistant turn from the `ai_credits` ledger.
export type AiCreditRow = {
  user_id: string
  catalogue_id: string | null
  kind: string
  credits: number
  refunded_at: string | null
  created_at: string
}

export type QrConfigRow = {
  catalogue_id: string
  created_at: string | null
}

// A visitor who signed up through a catalogue's newsletter footer.
export type CatalogueSubscriberRow = {
  catalogue_id: string
  created_at: string | null
}

export type UserThemeRow = {
  user_id: string
  created_at: string | null
}

export type DashboardData = {
  users: UserRow[]
  catalogues: CatalogueRow[]
  analytics: AnalyticsRow[]
  plans: PlanRow[]
  subscriptions: SubscriptionRow[]
  aiCredits: AiCreditRow[]
  qrConfigs: QrConfigRow[]
  catalogueSubscribers: CatalogueSubscriberRow[]
  userThemes: UserThemeRow[]
  newsletterSubscriberCount: number
}

export type GrowthSeries = {
  users: { monthly: UserPoint[]; cumulative: UserPoint[] }
  catalogues: { monthly: CataloguePoint[]; cumulative: CataloguePoint[] }
}

// ── New metric shapes ───────────────────────────────────────────────────────

export type Activation = {
  funnel: Bucket[] // Signed up → Created → Published → Got a visitor
  activationRate: number // % of users with ≥1 catalogue
  publishRate: number // % of catalogues that are published
  visitorRate: number // % of published catalogues that received a visit
  medianTtvDays: number | null // median days signup → first catalogue
  rateByCohort: { date: string; "Activation %": number }[]
}

export type Creators = {
  distribution: Bucket[] // 0 / 1 / 2–5 / 6+ catalogues per user
  ghostUsers: number
  ghostPct: number
  powerCreators: number // users with ≥6 catalogues
}

export type Engagement = {
  publishedCatalogues: number
  cataloguesWithTraffic: number
  deadPct: number // % of published catalogues with 0 views in range
  medianViews: number
  repeatRatio: number // pageviews / unique visitors
  viewsBuckets: Bucket[] // distribution of views per catalogue
  activeOverTime: { date: string; "Active catalogues": number }[]
  paretoTopShare: number // % of views captured by the top 10% of catalogues
}

export type ContentDepth = {
  avgSections: number
  avgItems: number
  completeness: Bucket[] // % of catalogues with logo / contact / legal / SEO / partners / tags
}

export type Freshness = {
  pctEdited: number // % edited after creation
  pctStale: number // % of published catalogues not edited in >90 days
  medianDaysSinceEdit: number | null
  recencyBuckets: Bucket[] // <7d / 7–30d / 30–90d / >90d
}

export type Subscriptions = {
  statusMix: Bucket[]
  conversionFunnel: Bucket[] // All users → Subscribed → Trialing → Active
  paidConversionPct: number
  churnRate: number
  scheduledCancellations: number
  newOverTime: { date: string; "New subscriptions": number }[]
}

export type Revenue = {
  activePayers: number
  arpu: number | null // null until per-plan prices are available
  mrr: number | null
  arr: number | null
  byPlan: Bucket[] // active payers per plan (or revenue once priced)
  pricesConfigured: boolean
}

export type FeatureAdoption = {
  key: FeatureKey
  label: string
  group: FeatureGroup
  catalogues: number // catalogues using the feature
  pctCatalogues: number // % of all catalogues
  owners: number // distinct users with at least one such catalogue
}

export type Features = {
  adoption: FeatureAdoption[] // all-time snapshot, in FEATURES order
  totalCatalogues: number
  trackedCatalogues: number // with Google Analytics and/or Meta Pixel
  ai: {
    turns: number
    users: number
    userPct: number // % of users with at least one catalogue
    creditsSpent: number // net of refunds
    refundRate: number // % of turns refunded
    topUsers: Ranking[] // by credits spent
    overTime: {
      date: string
      "AI turns": number
      "AI catalogues": number
      "OCR imports": number
    }[]
  }
  themes: {
    popularity: Bucket[] // catalogues per theme
    savedThemes: number
    usersWithSavedThemes: number
  }
  leads: {
    subscribers: number // catalogue newsletter signups in range
    marketingSignups: number // Quicktalog's own newsletter, all-time
    qrCodes: number
  }
  activityOverTime: {
    date: string
    "QR codes": number
    "Saved themes": number
    "Newsletter signups": number
  }[]
}

// ── New-user insights (the "Insights" tab) ──────────────────────────────────
// Everything here is scoped to the cohort of users who signed up inside the
// selected period, plus the catalogues those users created in that period.

export type Insights = {
  newUsers: number
  activatedUsers: number // new users with >=1 catalogue
  activationRate: number
  cataloguesCreated: number // catalogues created in range by the new cohort
  cataloguesPerUser: number // the ratio
  publishedCatalogues: number
  publishRate: number
  totalViews: number // pageviews on catalogues owned by the new cohort
  uniqueVisitors: number
  viewsPerCatalogue: number
  viewsPerUser: number
  subscribedUsers: number
  paidConversionRate: number
  medianTtvDays: number | null
  overTime: {
    date: string
    "New users": number
    "New catalogues": number
  }[]
  ratioOverTime: { date: string; "Catalogues per user": number }[]
  byCategory: Bucket[] // business type
  bySource: Bucket[]
  byLanguage: Bucket[]
  byStatus: Bucket[]
  byPlan: Bucket[]
  viewsByCategory: Bucket[]
  viewsBySource: Bucket[]
  attributedViews: number // views matched to a specific catalogue
  topCreators: Ranking[]
  topCatalogues: Ranking[]
}

// ── Who is creating: new signups vs the existing base ───────────────────────
// The old "catalogues per user" divided every catalogue created in the period
// by the new signups alone, which belongs to neither group. These are the two
// ratios that actually mean something, kept separate on purpose.

export type CreationSplit = {
  newUsers: number // signed up inside the period
  existingUsers: number // signed up before the period started
  cataloguesByNewUsers: number
  cataloguesByExistingUsers: number
  perNewUser: number
  perExistingUser: number
  activeExistingCreators: number // existing users who created at least one
  overTime: {
    date: string
    "By new users": number
    "By existing users": number
  }[]
}

export type DashboardView = {
  insights: Insights
  creationSplit: CreationSplit
  totals: {
    users: number
    catalogues: number
    pageviews: number
    uniqueVisitors: number
    activeUsers: number
  }
  growth: GrowthSeries
  pageviewsSeries: Pageview[]
  catalogues: {
    byStatus: Bucket[]
    bySource: Bucket[]
    byLanguage: Bucket[]
    byBusinessType: Bucket[]
  }
  plans: { byUsers: Bucket[] }
  topCataloguesByPageviews: Ranking[]
  topUsersByCatalogues: Ranking[]
  activation: Activation
  creators: Creators
  engagement: Engagement
  content: ContentDepth
  freshness: Freshness
  subscriptions: Subscriptions
  revenue: Revenue
  features: Features
}
