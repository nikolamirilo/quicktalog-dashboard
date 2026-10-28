import { cookies } from "next/headers"

import { getPaddleSubscriptions, paddleConfigured } from "@/lib/paddle"
import { segmentExport } from "@/lib/segments"
import { readSession } from "@/lib/session"

// One outreach list as a CSV file, or with ?format=emails as a comma-separated
// list of addresses for BCC. Signed-in admins only; nothing is cached.

// Spreadsheet apps run a cell that starts with = + - @ (or a tab or carriage
// return) as a formula, so those get a leading apostrophe.
const cell = (v: unknown): string => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ segment: string }> },
) {
  if (!readSession(await cookies())) {
    return new Response("Sign in first.", { status: 401 })
  }
  const { segment } = await params
  const list = await segmentExport(segment, async () =>
    paddleConfigured() ? getPaddleSubscriptions() : null,
  )
  if (!list) return new Response("No such list.", { status: 404 })

  const headers = { "Cache-Control": "no-store" }

  if (new URL(req.url).searchParams.get("format") === "emails") {
    const emails = [...new Set(list.rows.map((r) => String(r.email ?? "")).filter(Boolean))]
    return new Response(emails.join(", "), {
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  const csv = [
    list.columns.join(","),
    ...list.rows.map((r) => list.columns.map((c) => cell(r[c])).join(",")),
  ].join("\r\n")
  const day = new Date().toISOString().slice(0, 10)
  // The byte order mark lets Excel read accented names correctly.
  return new Response(`﻿${csv}\r\n`, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${segment}-${day}.csv"`,
    },
  })
}
