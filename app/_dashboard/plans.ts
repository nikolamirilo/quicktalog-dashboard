// Plan facts from quicktalog.app/pricing, shared by the dashboard and the
// outreach lists (lib/segments.ts).

// Starter caps: a catalogue at either is full.
export const STARTER_SECTIONS = 5
export const STARTER_ITEMS = 15

// List prices, USD a month. Only the MRR estimate uses them, until Paddle is
// connected; Paddle's own figures replace it.
export const LIST_PRICE: Record<string, number> = {
  Starter: 0,
  Basic: 5,
  Pro: 12,
  Growth: 30,
  Premium: 60,
}

// Subscription statuses that count as paying.
export const PAYING_STATUSES = ["active", "past_due"]
