"use client"

import { useLayoutEffect, useRef, useState } from "react"

type Box = {
  left: number
  top: number
  width: number
  height: number
  animate: boolean
}

// Measures the item marked `data-key={active}` inside the returned ref, so a
// highlight can slide to it. Re-measures on resize (font load, wrapping); the
// first position is placed without a transition.
export function useIndicator(active: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-key="${active}"]`)
      if (!el) return
      setBox((prev) => ({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        animate: prev != null,
      }))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    for (const child of Array.from(list.children)) ro.observe(child)
    return () => ro.disconnect()
  }, [active])

  return { ref, box }
}
