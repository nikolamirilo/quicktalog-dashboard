import { FEATURES, type FeatureKey } from "./features"
import type {
  AiCreditRow,
  AnalyticsRow,
  CatalogueRow,
  CatalogueSubscriberRow,
  DashboardData,
  PlanRow,
  QrConfigRow,
  SubscriptionRow,
  UserRow,
  UserThemeRow,
} from "./types"

// Raw catalogue row as it comes back from Postgres, before the heavy JSONB
// columns are reduced to compact scalars for the client.
export type RawCatalogue = {
  id: string
  name: string
  status: string | null
  language: string | null
  business_type: string | null
  user_id: string
  created_at: string
  updated_at: string | null
  content: unknown
  logo: string | null
  contact: unknown
  legal: unknown
  metadata: unknown
  appearance: unknown
  header: unknown
  footer: unknown
  partners: unknown
  tags: string[] | null
}

const asObject = (o: unknown): Record<string, unknown> =>
  o && typeof o === "object" && !Array.isArray(o)
    ? (o as Record<string, unknown>)
    : {}

const isFilled = (v: unknown): boolean =>
  typeof v === "string"
    ? v.trim() !== ""
    : Array.isArray(v) && v.some(isFilled)

// True when any of the given fields holds a non-blank value. The schema
// defaults these objects to empty strings, so key presence alone means nothing.
const anyFilled = (o: unknown, keys: string[]): boolean => {
  const obj = asObject(o)
  return keys.some((k) => isFilled(obj[k]))
}

const hasLogo = (logo: unknown): boolean =>
  typeof logo === "string" &&
  logo.trim() !== "" &&
  logo.trim().toUpperCase() !== "NULL"

// `content` is a JSONB array of blocks (items, text, divider, embedding,
// custom_visual). We count blocks (top-level length), items (sum of any nested
// array lengths) and blocks per type key, without assuming exact shapes.
const deriveContent = (
  content: unknown,
): { sections: number; items: number; types: Record<string, number> } => {
  const types: Record<string, number> = {}
  if (!Array.isArray(content)) return { sections: 0, items: 0, types }
  let items = 0
  for (const section of content) {
    const s = asObject(section)
    if (typeof s.type === "string") types[s.type] = (types[s.type] ?? 0) + 1
    for (const v of Object.values(s)) {
      if (Array.isArray(v)) items += v.length
    }
  }
  return { sections: content.length, items, types }
}

// The same id shapes the app accepts before it loads a tag on the page.
const GA_ID = /^G-[A-Z0-9]{4,15}$/i
const META_PIXEL_ID = /^\d{8,20}$/

const matches = (v: unknown, re: RegExp): boolean =>
  typeof v === "string" && re.test(v.trim())

// A CTA only counts when it is switched on and points somewhere; new
// catalogues are saved with an enabled but empty one.
const isLiveCta = (cta: unknown): boolean => {
  const c = asObject(cta)
  return c.isEnabled === true && isFilled(c.url)
}

// The custom page background that replaces the theme's, by kind.
const backgroundOf = (appearance: unknown): string | null => {
  const background = asObject(asObject(appearance).background)
  if (background.isEnabled !== true) return null
  return typeof background.type === "string" && background.type.trim() !== ""
    ? background.type
    : "unknown"
}

// Catalogues saved before the glass effect existed have no level: off.
const glassLevelOf = (appearance: unknown): number => {
  const level = Number(asObject(asObject(appearance).glass).level)
  return Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 0), 3) : 0
}

const deriveFeatures = (
  c: RawCatalogue,
  blockTypes: Record<string, number>,
  related: { ai: Set<string>; qr: Set<string> },
): FeatureKey[] => {
  const hasBlock = (type: string) => (blockTypes[type] ?? 0) > 0
  const appearance = asObject(c.appearance)
  const header = asObject(c.header)
  const footer = asObject(c.footer)
  const metadata = asObject(c.metadata)
  const used: Record<FeatureKey, boolean> = {
    aiAssistant: related.ai.has(c.id),
    // `category` and `container` were merged into `items`; the app still
    // reads either as an items section.
    items: hasBlock("items") || hasBlock("category") || hasBlock("container"),
    // `custom_code` is the block's pre-rename key; older rows still carry it.
    customVisual: hasBlock("custom_visual") || hasBlock("custom_code"),
    embedding: hasBlock("embedding"),
    divider: hasBlock("divider"),
    textSection: hasBlock("text"),
    googleAnalytics: matches(metadata.googleAnalyticsId, GA_ID),
    metaPixel: matches(metadata.metaPixelId, META_PIXEL_ID),
    customTheme: asObject(appearance.theme).type === "custom",
    customBackground: asObject(appearance.background).isEnabled === true,
    glass: glassLevelOf(c.appearance) > 0,
    search: asObject(appearance.search).isEnabled === true,
    overlay: asObject(appearance.overlay).isEnabled === true,
    customHeader: header.type === "custom",
    customFooter: footer.type === "custom",
    ctaButton: isLiveCta(header.cta) || isLiveCta(footer.cta),
    newsletter: footer.newsletter === true,
    qrCode: related.qr.has(c.id),
  }
  return FEATURES.map((f) => f.key).filter((k) => used[k])
}

const themeOf = (appearance: unknown): string | null => {
  const theme = asObject(asObject(appearance).theme)
  if (theme.type === "custom") return "custom"
  return typeof theme.name === "string" && theme.name.trim() !== ""
    ? theme.name
    : null
}

const shapeCatalogue = (
  c: RawCatalogue,
  related: { ai: Set<string>; qr: Set<string> },
): CatalogueRow => {
  const { sections, items, types } = deriveContent(c.content)
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    language: c.language,
    business_type: c.business_type,
    user_id: c.user_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    contentSections: sections,
    sectionTypes: types,
    contentItems: items,
    hasLogo: hasLogo(c.logo),
    hasContact: anyFilled(c.contact, ["phone", "email", "website", "socials"]),
    hasLegal: anyFilled(c.legal, [
      "legalName",
      "address",
      "termsAndConditions",
      "privacyPolicy",
    ]),
    hasSeo: anyFilled(c.metadata, ["title", "description"]),
    hasPartners: Array.isArray(c.partners) && c.partners.length > 0,
    tagCount: Array.isArray(c.tags) ? c.tags.length : 0,
    theme: themeOf(c.appearance),
    background: backgroundOf(c.appearance),
    glassLevel: glassLevelOf(c.appearance),
    features: deriveFeatures(c, types, related),
  }
}

export function aggregate(raw: {
  users: UserRow[]
  catalogues: RawCatalogue[]
  analytics: AnalyticsRow[]
  plans: PlanRow[]
  subscriptions: SubscriptionRow[]
  aiCredits: AiCreditRow[]
  qrConfigs: QrConfigRow[]
  catalogueSubscribers: CatalogueSubscriberRow[]
  userThemes: UserThemeRow[]
  newsletterSubscriberCount: number
}): DashboardData {
  const related = {
    ai: new Set(
      raw.aiCredits.flatMap((a) => (a.catalogue_id ? [a.catalogue_id] : [])),
    ),
    qr: new Set(raw.qrConfigs.map((q) => q.catalogue_id)),
  }
  return {
    ...raw,
    catalogues: raw.catalogues.map((c) => shapeCatalogue(c, related)),
  }
}
