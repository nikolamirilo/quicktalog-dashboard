import type { FeatureGroup, FeatureKey } from "./features"

export type Bucket = { name: string; value: number }
export type Ranking = {
  id: string
  name: string
  value: number
  meta?: string
  // Makes the name a link, opened in a new tab.
  href?: string
}

// Rows for the line, area and bar charts: a `date` label plus one key per
// series. A null leaves a gap.
export type Series = Record<string, string | number | null>[]

export type RangeKey = "1M" | "3M" | "6M" | "12M" | "ALL" | "CUSTOM"

// Which slice of time a number covers. Every card names one, because period
// figures and all-time snapshots sit side by side.
export type Scope = "In range" | "Signups in range" | "All time" | "Right now"

// Names and emails stay on the server; the client gets these plus a name
// lookup for the people a ranking can show (`DashboardData.people`).
export type UserRow = {
  id: string
  created_at: string | null
  plan_id: string | null
  customer_id: string | null
  // The tracked channel: a UTM source ("newsletter"), a known site ("google",
  // "linkedin", "ai_search", "referral"), "catalogue_badge" or "direct". Null
  // when the signup has no tracked source (see lib/attribution.ts).
  channel: string | null
  // The first touch, only when it was recorded at signup.
  touch: Touch | null
  // The answer to "How did you hear about us?": a slug, the person's own
  // words, or "Skipped". Null when they haven't been asked yet.
  selfReported: string | null
  internal: boolean // listed in INTERNAL_EMAILS
}

// UTM tags in lower case, so "LinkedIn" and "linkedin" are one source.
export type Touch = {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  referrer: string | null // referring domain, never our own
  landing: string | null // path of the first page
}

export type Person = { name: string | null; email: string | null }

// Catalogue row delivered to the client. The heavy JSONB columns (content,
// appearance, header, footer, metadata, ...) are reduced to compact scalars
// and feature flags in `aggregate.ts` so the browser never receives the raw
// catalogue payload.
export type CatalogueRow = {
  id: string
  name: string
  status: string | null
  language: string | null
  business_type: string | null
  user_id: string
  created_at: string
  updated_at: string | null
  contentSections: number
  // Content blocks per stored type key, old keys included ("custom_code", ...).
  sectionTypes: Record<string, number>
  contentItems: number
  hasLogo: boolean
  hasContact: boolean
  hasLegal: boolean
  hasSeo: boolean
  hasPartners: boolean
  tagCount: number
  // Stored theme name ("theme-monochrome", ...), or "custom" for a custom theme.
  theme: string | null
  // Kind of custom page background ("image", "gradient", "color"), or null
  // when the theme's own background shows.
  background: string | null
  glassLevel: number // 0 off, 1 clear, 2 semi-frosted, 3 frosted
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
  id: string // a Paddle price_id
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

// A design saved in the QR code editor. Showing or downloading a plain QR
// code leaves no row.
export type QrConfigRow = {
  catalogue_id: string
  created_at: string | null
  has_logo: boolean
  has_frame: boolean // frame text shown around the code
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

// ── Paddle ──────────────────────────────────────────────────────────────────

export type PaddleSubscription = {
  id: string
  status: string // active, past_due, paused, trialing, canceled
  customerId: string
  createdAt: string | null
  canceledAt: string | null
  nextBilledAt: string | null
  scheduledAction: string | null // cancel, pause or resume
  scheduledAt: string | null
  interval: string | null // month, year, ...
  monthlyAmount: number // items at list price, per month, in currency units
  currency: string | null
  priceIds: string[]
}

export type MetricPoint = {
  day: string // YYYY-MM-DD
  amount: number | null // currency units
  count: number | null
  completed: number | null // checkout conversion only
}

export type MetricSeries = {
  currency: string | null
  points: MetricPoint[]
}

export type PaddleData = {
  subscriptions: PaddleSubscription[] | null
  mrr: MetricSeries | null
  revenue: MetricSeries | null
  refunds: MetricSeries | null
  checkout: MetricSeries | null
  errors: string[]
  fetchedAt: string
}

// ── Outreach lists ──────────────────────────────────────────────────────────

export type SegmentSummary = {
  id: string
  label: string
  who: string
  why: string
  subject: string
  count: number | null // null when the list needs Paddle and it isn't set up
  needsPaddle: boolean
}

export type DashboardData = {
  users: UserRow[]
  people: Record<string, Person>
  catalogues: CatalogueRow[]
  analytics: AnalyticsRow[]
  plans: PlanRow[]
  subscriptions: SubscriptionRow[]
  aiCredits: AiCreditRow[]
  qrConfigs: QrConfigRow[]
  catalogueSubscribers: CatalogueSubscriberRow[]
  userThemes: UserThemeRow[]
  newsletterSubscriberCount: number
  lastImportAt: string | null // newest successful analytics import
  trackingSince: string | null // the first signup with a tracked first touch
  paddle: PaddleData | null // null until PADDLE_API_KEY is set
  segments: SegmentSummary[]
  // Set on the client while the source filter narrows the data to some
  // signups: what they are, e.g. "LinkedIn".
  sourceLabel?: string
}

// ── Views ───────────────────────────────────────────────────────────────────

// How a feature is set up. "parts" add up to the catalogues using it (or,
// for integrations, to the catalogues with any); "counts" are separate figures.
export type FeatureBreakdown = {
  kind: "parts" | "counts"
  title: string
  rows: Bucket[]
}

export type FeatureAdoption = {
  key: FeatureKey
  label: string
  group: FeatureGroup
  catalogues: number // built catalogues using the feature
  pctCatalogues: number // % of built catalogues
  owners: number // distinct users with at least one such catalogue
  newCatalogues: number // created in range and using it now
  newPct: number // % of built catalogues created in range
  topUsers: Ranking[] // owners by catalogues using it
  breakdown: FeatureBreakdown | null
}

export type SectionTypeUsage = {
  type: string // stored key
  label: string
  // An old key, saved before a rename or merge: `replacedBy` is what the
  // app reads it as today.
  replacedBy: string | null
  sections: number
  pctSections: number // % of all sections
  catalogues: number // catalogues with at least one
}

// Adoption is measured on built catalogues; empty drafts can't use features.
export type Features = {
  adoption: FeatureAdoption[] // all-time snapshot, in FEATURES order
  featuresPerCatalogue: number // average tracked features per built catalogue
  newCatalogues: number // built catalogues created in range
  sectionTypes: { rows: SectionTypeUsage[]; totalSections: number }
  builtCatalogues: number
  trackedCatalogues: number // with Google Analytics and/or Meta Pixel
  ai: {
    turns: number
    users: number
    activeUsers: number // with views, a new catalogue or an AI turn in range
    userPct: number // AI users ÷ active users
    creditsSpent: number // net of refunds
    refundRate: number // % of turns refunded (failed)
    topUsers: Ranking[] // by credits spent
    overTime: Series
  }
  themes: {
    popularity: Bucket[] // built catalogues per theme
    savedThemes: number
    usersWithSavedThemes: number
  }
  leads: {
    subscribers: number // catalogue newsletter signups in range
    marketingSignups: number // Quicktalog's own newsletter, all-time
    qrCodes: number
  }
  activityOverTime: Series
}

// Catalogues created in range, split by whether the owner signed up inside
// the range. Two separate ratios, because one "catalogues per user" mixing
// both groups describes neither.
export type CreationSplit = {
  newUsers: number
  existingUsers: number // signed up before the range started
  byNewUsers: number
  byExistingUsers: number
  perNewUser: number
  perExistingUser: number
  activeExistingCreators: number
  overTime: Series
}

// Signups from one channel in range, and how far they have got to date.
export type ChannelRow = {
  channel: string
  filterKey: string | null // picks this row in the source filter
  signups: number
  started: number
  built: number
  published: number
  paying: number // ever subscribed
}

// Signups in range with the same UTM source, medium and campaign.
export type CampaignRow = {
  key: string
  source: string | null
  medium: string | null
  campaign: string | null
  signups: number
  built: number
  paying: number
}

export type CohortRow = {
  cohort: string
  signups: number
  started: number
  built: number
  paying: number
}

// Catalogues by status and how much content they hold.
export type MatrixRow = {
  status: string
  empty: number
  noItems: number // sections, but no items in them
  few: number // 1–2 items
  many: number // 3+ items
  total: number
}

export type DashboardView = {
  start: string
  end: string
  sourceLabel: string | null // the source filter's selection, if any
  analyticsUntil: string // the last day the traffic figures include
  analyticsClamped: boolean // the range runs past the newest analytics day
  signups: number
  signupSeries: Series // Signups, Activated (by signup period)
  cumulativeUsers: Series
  acquisition: {
    weeklyAvg: number
    startedPct: number
    tracked: number // signups in range with a tracked channel
    trackedPct: number
    channels: Bucket[] // tracked signups per channel, "Not tracked" left out
    channelRows: ChannelRow[] // per channel, "Not tracked" last
    channelSeries: Series // tracked signups per period, top channels
    channelNames: string[] // the series in channelSeries
    campaigns: CampaignRow[] // signups with any UTM tag
    referrers: Bucket[] // referring domains of tracked signups
    landingPages: Bucket[]
    selfReported: Bucket[] // answers, skips left out
    answered: number
    skipped: number
    byBusinessType: Bucket[]
    byLanguage: Bucket[]
    cohorts: CohortRow[]
  }
  activation: {
    activated: number // signups in range who own a built catalogue
    rate: number
    funnel: Bucket[]
    stalledEmpty: number // started a catalogue, never added content
    neverStarted: number
    stops: Bucket[] // furthest step each signup reached
    rateByCohort: Series // "Activation %", "Still maturing"
    topCreators: Ranking[]
    split: CreationSplit
  }
  content: {
    total: number
    built: number
    empty: number
    emptyOwners: number // own catalogues, all of them empty
    startedInRange: number
    builtInRange: number
    emptyInRange: number
    medianSections: number // of built catalogues
    medianItems: number
    matrix: MatrixRow[]
    completeness: Bucket[] // % of built catalogues with each part
    monthly: Series // Built, Empty
    starterFull: number // Starter catalogues at the section or item cap
    publishedEmpty: number
  }
  traffic: {
    pageviews: number
    visitorDays: number
    series: Series // Pageviews, Visitor-days
    cataloguesWithViews: number
    ownersWithViews: number
    eligible: number // published, built, live 7+ days before the data ends
    dead: number // of those, no views in range
    deadPct: number
    medianViews: number
    viewsBuckets: Bucket[]
    activeOverTime: Series
    paretoTopShare: number // % of views earned by the top 10% of catalogues
    unattributed: number // views not tied to a catalogue
    top: Ranking[]
    topFromNewUsers: Ranking[]
    viewsByCategory: Bucket[]
    viewsByLanguage: Bucket[]
  }
  customers: {
    source: "paddle" | "database"
    paying: number
    paused: number
    trialing: number
    churned: number
    ever: number
    newInRange: number
    newSeries: Series
    churn: { rate: number; churned: number; base: number; scope: Scope }
    stateMix: Bucket[] // per customer
    rowMix: Bucket[] // per subscription row
    byPlan: Bucket[] // paying customers
    doubleActive: number // customers with two or more active subscriptions
    checkoutAbandoned: number // a Paddle customer id, no subscription
    atRisk: number // paying, no views in the last 30 days of data
    cohortPaid: number // signups in range who ever subscribed
    paidConversion: number
    scheduledCancel: number | null // null without Paddle
    pastDue: number | null
    billing: Bucket[] | null // monthly vs annual, Paddle only
  }
  revenue: {
    connected: boolean
    currency: string
    mrr: number
    mrrStart: number | null
    mrrSource: "metrics" | "subscriptions" | "estimate"
    unpriced: number // paying subscriptions without a known price (estimate)
    mrrSeries: Series | null
    revenue: number | null
    revenueSeries: Series | null
    refunds: number | null
    refundRate: number | null
    checkout: { sessions: number; completed: number; rate: number } | null
    byPlan: Bucket[] // monthly recurring revenue per plan
  }
  features: Features
}

export type Attention = {
  level: "broken" | "act" | "check"
  title: string
  detail?: string
  tab: string // the page that explains it
  link: string
}

export type SourceStatus = {
  label: string
  state: "good" | "warn" | "off"
  detail: string
}

// What every page receives: the selected range, and the period before it for
// comparisons (null for "All").
export type TabProps = {
  view: DashboardView
  prev: DashboardView | null
  animationKey: string
}
