import { Pool, types } from "pg"

// Postgres type OIDs whose default `pg` parsing does not fit the dashboard.
// The client code slices dates as ISO strings and sums counts as numbers, so
// rows are normalised here to plain JSON-friendly values.
const INT8 = 20
const NUMERIC = 1700
const DATE = 1082
const TIMESTAMP = 1114
const TIMESTAMPTZ = 1184

const parseTimestamptz = types.getTypeParser(TIMESTAMPTZ)

const parsers: Record<number, (value: string) => unknown> = {
  [INT8]: Number,
  [NUMERIC]: Number,
  // Keep calendar days as "YYYY-MM-DD" instead of a local-midnight Date.
  [DATE]: (v) => v,
  [TIMESTAMP]: (v) => v.replace(" ", "T"),
  // Always UTC ("…Z"), whatever the session time zone is.
  [TIMESTAMPTZ]: (v) => {
    const d = parseTimestamptz(v)
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : v
  },
}

const createPool = () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  return new Pool({
    connectionString,
    // Supabase serves a certificate signed by its own CA, so encrypt without
    // verifying by default. An `sslmode`/`sslrootcert` in DATABASE_URL takes
    // precedence over this.
    ssl: { rejectUnauthorized: false },
    types: {
      getTypeParser: ((oid: number, format?: "text" | "binary") =>
        parsers[oid] ?? types.getTypeParser(oid, format)) as typeof types.getTypeParser,
    },
  })
}

// One pool per server process; reused across dev hot reloads.
const globalForDb = globalThis as unknown as { dbPool?: Pool }

const getPool = (): Pool => (globalForDb.dbPool ??= createPool())

export async function query<T extends object>(
  text: string,
  values?: unknown[],
): Promise<T[]> {
  const { rows } = await getPool().query(text, values)
  return rows as T[]
}
