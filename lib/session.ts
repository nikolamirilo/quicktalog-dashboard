import { createHash, createHmac, timingSafeEqual } from "node:crypto"

// The admin session: an httpOnly cookie holding "<username>.<expiry>" signed
// with SESSION_SECRET. The page and every API route read it on the server
// before running a query; nothing in the browser decides who is signed in.
export const SESSION_COOKIE = "qt_admin_session"
const MAX_AGE_S = 7 * 24 * 60 * 60

type CookieJar = { get(name: string): { value: string } | undefined }

// A short secret would make the signature guessable, so it counts as unset.
const secret = (): string | null => {
  const s = process.env.SESSION_SECRET
  return s && s.length >= 32 ? s : null
}

const sign = (value: string, key: string) =>
  createHmac("sha256", key).update(value).digest("base64url")

// Equal-length digests, so the comparison takes the same time either way.
export const sameText = (a: string, b: string) =>
  timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  )

export const sessionConfigured = () => secret() != null

// Where to go after signing in: same-site paths only, since "//host" would
// leave the dashboard.
export const safeNext = (next: unknown): string =>
  typeof next === "string" && /^\/(?!\/)/.test(next) ? next : "/"

export function sessionCookie(username: string) {
  const key = secret()
  if (!key) throw new Error("SESSION_SECRET is not set")
  // The name is encoded so a dot in it can't shift the fields.
  const value = `${Buffer.from(username).toString("base64url")}.${Date.now() + MAX_AGE_S * 1000}`
  return {
    name: SESSION_COOKIE,
    value: `${value}.${sign(value, key)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_S,
  }
}

// The signed-in username, or null when the cookie is missing, forged or
// expired.
export function readSession(jar: CookieJar): string | null {
  const key = secret()
  const raw = jar.get(SESSION_COOKIE)?.value
  if (!key || !raw) return null
  const parts = raw.split(".")
  if (parts.length !== 3) return null
  const [user, expiry, mac] = parts
  if (!sameText(mac, sign(`${user}.${expiry}`, key))) return null
  if (!(Number(expiry) > Date.now())) return null
  return Buffer.from(user, "base64url").toString()
}
