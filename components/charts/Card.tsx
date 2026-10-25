import React from "react"

import { cx } from "@/lib/utils/cx"

// The design system's card, in glass (see the `glass` utility): 22px corners,
// the soft shadow, frosted over the backdrop. `qt-card` opts it into the
// staggered entrance.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(
      "qt-card glass w-full rounded-card p-[22px] text-ink",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }
