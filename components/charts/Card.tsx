import React from "react"

import { cx } from "@/lib/utils/cx"

// The design system's card: white surface, hairline, 22px corners, soft shadow.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(
      "relative w-full rounded-card border border-line bg-card p-[22px] text-ink shadow-card",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }
