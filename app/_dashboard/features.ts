// Product features tracked on the Features tab, in display order. Whether a
// catalogue uses each one is derived in `aggregate.ts`, mostly from the stored
// catalogue JSON (content blocks, appearance, header/footer, metadata) and,
// for AI turns and QR codes, from the related tables.
export const FEATURES = [
  { key: "aiAssistant", label: "AI assistant", group: "AI" },
  { key: "items", label: "Items section", group: "Content blocks" },
  { key: "customVisual", label: "Custom visual", group: "Content blocks" },
  { key: "embedding", label: "External content", group: "Content blocks" },
  { key: "divider", label: "Divider", group: "Content blocks" },
  { key: "textSection", label: "Text section", group: "Content blocks" },
  { key: "googleAnalytics", label: "Google Analytics", group: "Integrations" },
  { key: "metaPixel", label: "Meta Pixel", group: "Integrations" },
  { key: "customTheme", label: "Custom theme", group: "Appearance" },
  { key: "customBackground", label: "Custom background", group: "Appearance" },
  { key: "glass", label: "Glass effect", group: "Appearance" },
  { key: "search", label: "Search bar", group: "Appearance" },
  { key: "overlay", label: "Overlay", group: "Appearance" },
  { key: "customHeader", label: "Custom header", group: "Branding" },
  { key: "customFooter", label: "Custom footer", group: "Branding" },
  { key: "ctaButton", label: "CTA button", group: "Branding" },
  { key: "newsletter", label: "Newsletter signup", group: "Sharing & leads" },
  { key: "qrCode", label: "QR code design", group: "Sharing & leads" },
] as const

export type FeatureKey = (typeof FEATURES)[number]["key"]
export type FeatureGroup = (typeof FEATURES)[number]["group"]

// Content block types as stored in `catalogues.content`. The old keys were
// saved before a rename or merge and the app reads them as their replacement,
// so a count above zero means rows that were never rewritten.
export const SECTION_TYPES = [
  { type: "items", label: "Items", replacedBy: null },
  { type: "text", label: "Text", replacedBy: null },
  { type: "divider", label: "Divider", replacedBy: null },
  { type: "embedding", label: "External content", replacedBy: null },
  { type: "custom_visual", label: "Custom visual", replacedBy: null },
  { type: "custom_code", label: "Custom code", replacedBy: "Custom visual" },
  { type: "category", label: "Category", replacedBy: "Items" },
  { type: "container", label: "Container", replacedBy: "Items" },
] as const
