// Internal and test accounts, from INTERNAL_EMAILS: a comma-separated list of
// addresses ("me@example.com") and whole domains ("@quicktalog.app"). They are
// left out of the numbers by default and out of every outreach list.
export function internalLists(): { emails: string[]; domains: string[] } {
  const entries = (process.env.INTERNAL_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return {
    emails: entries.filter((e) => !e.startsWith("@")),
    domains: entries.filter((e) => e.startsWith("@")).map((e) => e.slice(1)),
  }
}

export function internalMatcher(): (email: string | null) => boolean {
  const { emails, domains } = internalLists()
  const exact = new Set(emails)
  const hosts = new Set(domains)
  return (email) => {
    if (!email) return false
    const e = email.trim().toLowerCase()
    return exact.has(e) || hosts.has(e.slice(e.lastIndexOf("@") + 1))
  }
}

// The same test in SQL, for a query that binds the two lists as $1 and $2.
export const NOT_INTERNAL_SQL = `not (
    lower(coalesce(u.email, '')) = any($1::text[])
    or split_part(lower(coalesce(u.email, '')), '@', 2) = any($2::text[])
  )`
