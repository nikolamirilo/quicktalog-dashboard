// Product features tracked on the Features tab, in display order. Whether a
// catalogue uses each one is derived in `aggregate.ts`, mostly from the stored
// catalogue JSON (content blocks, appearance, header/footer, metadata) and,
// for AI turns and QR codes, from the related tables.
export const FEATURES = [
  { key: "aiAssistant", label: "AI assistant", group: "AI & import" },
  { key: "aiPrompt", label: "Created with AI", group: "AI & import" },
  { key: "ocrImport", label: "OCR import", group: "AI & import" },
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
  { key: "qrCode", label: "QR code", group: "Sharing & leads" },
] as const

export type FeatureKey = (typeof FEATURES)[number]["key"]
export type FeatureGroup = (typeof FEATURES)[number]["group"]
