import type { Touch, UserRow } from "@/app/_dashboard/types"

// Where a signup came from, as the app records it (quicktalog-app,
// src/lib/users/acquisition.ts):
// - The first touch: UTM tags, referring domain and landing path from a
//   cookie set on the visitor's first page, written once at sign-in while
//   `first_seen_at` is null.
// - `acquisition_source`: the channel derived from that touch (a UTM source
//   wins, then the referring domain, then "direct"), or one PostHog's backfill
//   filled in for older accounts, which leaves `first_seen_at` null.
// - `self_reported_source`: the answer to "How did you hear about us?".
export type RawAttribution = {
  created_at: string | null
  acquisition_source: string | null
  self_reported_source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer_domain: string | null
  landing_path: string | null
  first_seen_at: string | null
}

// The app claims the first touch on every sign-in until one is stored, so an
// account made before tracking went live gets one the next time it signs in,
// from that visit. Only a touch recorded by the time the account was created
// is where it came from. The day of slack covers a browser clock that is off.
const SIGNUP_SLACK_MS = 24 * 60 * 60 * 1000

const clean = (v: string | null): string | null => v?.trim() || null
const tag = (v: string | null): string | null => clean(v)?.toLowerCase() ?? null

export function attributionOf(
  u: RawAttribution,
): Pick<UserRow, "channel" | "touch" | "selfReported"> {
  const selfReported = clean(u.self_reported_source)
  const channel = tag(u.acquisition_source)
  const seen = u.first_seen_at ? Date.parse(u.first_seen_at) : NaN
  const created = u.created_at ? Date.parse(u.created_at) : NaN

  if (Number.isFinite(seen) && Number.isFinite(created) && seen <= created + SIGNUP_SLACK_MS) {
    const touch: Touch = {
      source: tag(u.utm_source),
      medium: tag(u.utm_medium),
      campaign: tag(u.utm_campaign),
      content: tag(u.utm_content),
      term: tag(u.utm_term),
      referrer: tag(u.referrer_domain),
      landing: clean(u.landing_path),
    }
    return { channel: channel ?? "direct", touch, selfReported }
  }

  // No first touch. A channel here was filled in by the PostHog backfill,
  // unless it is a copy of the self-reported answer: before tracking,
  // `acquisition_source` held that answer, and the migration that split the
  // two left the copies in place.
  if (u.first_seen_at == null && channel != null && channel !== tag(selfReported)) {
    return { channel, touch: null, selfReported }
  }

  // Never tracked, or tracked only at a later sign-in: neither that touch nor
  // the channel derived from it says where the account came from.
  return { channel: null, touch: null, selfReported }
}
