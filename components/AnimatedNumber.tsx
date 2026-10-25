"use client"

import { useEffect, useRef, useState } from "react"

// Every number inside a formatted value ("1,284", "32.5%", "15K", "2.4 / 2")
// counts from where it was to where it is now; the text around the numbers
// stays as it is. Off when the visitor prefers reduced motion.
const NUMBER = /\d[\d,]*(?:\.\d+)?/g

type Parsed = { values: number[]; decimals: number[]; grouped: boolean[] }

const parse = (text: string): Parsed => {
  const parsed: Parsed = { values: [], decimals: [], grouped: [] }
  for (const [m] of text.matchAll(NUMBER)) {
    parsed.values.push(Number(m.replace(/,/g, "")))
    parsed.decimals.push(m.includes(".") ? m.split(".")[1].length : 0)
    parsed.grouped.push(m.includes(","))
  }
  return parsed
}

const render = (text: string, target: Parsed, values: number[]) => {
  let i = 0
  return text.replace(NUMBER, () => {
    const n = values[i]
    const decimals = target.decimals[i]
    const grouped = target.grouped[i]
    i++
    return grouped
      ? n.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : n.toFixed(decimals)
  })
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export default function AnimatedNumber({
  value,
  duration = 900,
}: {
  value: string
  duration?: number
}) {
  const from = useRef<number[] | null>(null)
  const [shown, setShown] = useState(() =>
    reducedMotion() ? value : render(value, parse(value), parse(value).values.map(() => 0)),
  )

  useEffect(() => {
    const target = parse(value)
    const start =
      from.current && from.current.length === target.values.length
        ? from.current
        : target.values.map(() => 0)
    if (reducedMotion() || target.values.length === 0) {
      from.current = target.values
      const frame = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(frame)
    }

    let frame = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const k = easeOut(t)
      const current = target.values.map((v, i) => start[i] + (v - start[i]) * k)
      from.current = current
      setShown(t < 1 ? render(value, target, current) : value)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  // Screen readers get the final value once, not every frame.
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  )
}
