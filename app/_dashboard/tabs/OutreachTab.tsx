"use client"

import { useState } from "react"
import { Copy, Download } from "lucide-react"

import { Card } from "@/components/charts"
import { cx } from "@/lib/utils/cx"

import type { SegmentSummary } from "../types"
import { Note, SectionHeading, number } from "../ui"

const buttonCls =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50"

function SegmentCard({
  segment: s,
  featured,
  paddleConnected,
}: {
  segment: SegmentSummary
  featured: boolean
  paddleConnected: boolean
}) {
  const [status, setStatus] = useState<string | null>(null)
  const unavailable = s.needsPaddle && !paddleConnected
  const empty = !s.count

  // The addresses are fetched only when asked for, from the same route as
  // the CSV, so they never sit in the page.
  const copyEmails = async () => {
    setStatus("Copying…")
    try {
      const res = await fetch(`/api/outreach/${s.id}?format=emails`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(res.status === 401 ? "sign in again" : `error ${res.status}`)
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      const n = text ? text.split(", ").length : 0
      setStatus(`Copied ${number(n)} ${n === 1 ? "address" : "addresses"}, comma-separated for BCC.`)
    } catch (e) {
      setStatus(`Couldn't copy: ${e instanceof Error ? e.message : "unknown error"}.`)
    }
  }

  return (
    <Card
      className={cx(
        "flex flex-col gap-3 p-5",
        featured && "ring-[1.5px] ring-amber ring-inset md:col-span-2",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold tracking-[-0.015em] text-ink">
            {s.label}
          </h3>
          <p className="mt-0.5 text-[13.5px] text-ink-2">{s.who}</p>
        </div>
        <b className="font-head text-[30px] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
          {s.count == null ? "—" : number(s.count)}
        </b>
      </div>
      <p className="text-[13.5px] text-ink-2">{s.why}</p>
      <p className="text-[13px] text-ink-3">
        Suggested subject: <span className="text-ink-2">{s.subject}</span>
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {unavailable ? (
          <span className="text-[13px] font-semibold text-ink-3">
            Needs Paddle: set PADDLE_API_KEY to build this list.
          </span>
        ) : (
          <>
            <a
              href={`/api/outreach/${s.id}`}
              download
              aria-disabled={empty}
              tabIndex={empty ? -1 : undefined}
              className={cx(
                buttonCls,
                featured
                  ? "bg-amber text-on-amber shadow-amber hover:bg-amber-hover"
                  : "border-[1.5px] border-line-strong bg-card/70 text-ink hover:border-line-hover",
              )}
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </a>
            <button
              type="button"
              disabled={empty}
              onClick={copyEmails}
              className={cx(
                buttonCls,
                "border-[1.5px] border-line-strong bg-card/70 text-ink hover:border-line-hover",
              )}
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy emails
            </button>
          </>
        )}
      </div>
      {status && (
        <p className="text-[12.5px] text-ink-2" aria-live="polite">
          {status}
        </p>
      )}
    </Card>
  )
}

// People to email, one list per situation. The counts and the exports use
// the same definitions (lib/segments.ts), and internal accounts never appear.
export default function OutreachTab({
  segments,
  paddleConnected,
  animationKey,
}: {
  segments: SegmentSummary[]
  paddleConnected: boolean
  animationKey: string
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Outreach lists"
        subtitle="People to email, rebuilt on every load. Export CSV downloads a list; Copy emails puts its addresses on the clipboard."
      />
      <Note>
        Signup consent covers the terms, privacy and refund policies only, with
        no marketing opt-in. Keep these emails about the person&apos;s own
        account, such as finishing a catalogue they started, and include an
        unsubscribe link.
      </Note>
      <section
        key={`${animationKey}-out`}
        className="animate-chart-in grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {segments.map((s, i) => (
          <SegmentCard
            key={s.id}
            segment={s}
            featured={i === 0}
            paddleConnected={paddleConnected}
          />
        ))}
      </section>
    </div>
  )
}
