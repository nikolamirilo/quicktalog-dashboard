// Names for the stored acquisition values. Channels are what the app derives
// from a first touch (quicktalog-app, src/lib/users/acquisition.ts); any other
// value is a UTM source someone tagged a link with, shown as tagged.
const CHANNELS: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  linkedin: "LinkedIn",
  producthunt: "Product Hunt",
  ai_search: "AI search",
  x: "X (Twitter)",
  meta: "Facebook & Instagram",
  youtube: "YouTube",
  reddit: "Reddit",
  // A visit from a published catalogue: the footer badge, which links with
  // utm_source=catalogue, or a link to us without the tags.
  catalogue: "Catalogue badge",
  catalogue_badge: "Catalogue badge",
  referral: "Other websites",
  direct: "Direct",
}

export const NOT_TRACKED = "Not tracked"

export const channelLabel = (channel: string | null): string =>
  channel == null ? NOT_TRACKED : (CHANNELS[channel] ?? channel)

// The answers offered by "How did you hear about us?" (quicktalog-app,
// src/constants/users.ts). "Other" stores the person's own words instead.
const ANSWERS: Record<string, string> = {
  google: "Google",
  social_media: "Social media",
  friend_or_colleague: "Friend or colleague",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  quicktalog_catalogue: "A Quicktalog catalogue",
  ai_assistant: "AI assistant",
  other: "Other",
}

export const SKIPPED = "Skipped"

export const answerLabel = (answer: string): string =>
  ANSWERS[answer.toLowerCase()] ?? answer

// ── Source filter ───────────────────────────────────────────────────────────

// The filter's value: "all", "tracked", "untracked", or a dimension and a
// value, as "channel:LinkedIn", "medium:cpc", "campaign:spring_launch".
export type SourceKey = string

export const ALL_SOURCES: SourceKey = "all"

export type SourceDimension = "channel" | "medium" | "campaign"

export const sourceKey = (dimension: SourceDimension, value: string): SourceKey =>
  `${dimension}:${value}`

export const parseSourceKey = (
  key: SourceKey,
): { dimension: SourceDimension; value: string } | null => {
  const i = key.indexOf(":")
  if (i < 0) return null
  const dimension = key.slice(0, i)
  if (dimension !== "channel" && dimension !== "medium" && dimension !== "campaign") {
    return null
  }
  return { dimension, value: key.slice(i + 1) }
}
