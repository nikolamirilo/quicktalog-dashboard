"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { LogOut, Menu, X } from "lucide-react"

import { signOut } from "@/app/login/actions"
import { cx } from "@/lib/utils/cx"

const GLASS_SHADOW =
  "[--glass-shadow:0_10px_30px_-10px_rgba(22,20,15,0.18),0_2px_6px_rgba(22,20,15,0.05)]"

// The design system's glass navigation as a sidebar: a floating glass panel
// pinned to the left from `lg`. Below that it is a drawer, opened from a pill
// bar at the top of the page. There is only ever one copy of `nav`, so its ids
// stay unique.
const Sidebar = ({
  nav,
  username,
}: {
  nav?: React.ReactNode
  username: string
}) => {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // The drawer only exists below `lg`: growing past it closes the drawer.
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 64rem)")
    const onChange = () => lg.matches && setOpen(false)
    lg.addEventListener("change", onChange)
    return () => lg.removeEventListener("change", onChange)
  }, [])

  // While the drawer is open: the page behind it stays put, Escape closes it,
  // and focus moves in, then back to the menu button on close.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = "hidden"
    closeButton.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKeyDown)
    const toFocus = menuButton.current
    return () => {
      root.style.overflow = overflow
      window.removeEventListener("keydown", onKeyDown)
      toFocus?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <div className="sticky top-[9px] z-30 px-5 lg:hidden">
        <div
          className={cx(
            "glass flex h-14 items-center justify-between gap-3 rounded-full pr-2 pl-[18px]",
            GLASS_SHADOW,
            scrolled ? "[--glass-tint:86%]" : "[--glass-tint:80%]",
          )}
        >
          <Image
            src="/logo.svg"
            alt="Quicktalog"
            width={1064}
            height={387}
            priority
            className="h-[34px] w-auto"
          />
          <button
            ref={menuButton}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="sidebar"
            onClick={() => setOpen(true)}
            className="grid size-[42px] place-items-center rounded-full border-[1.5px] border-amber bg-card/70 text-ink transition duration-200 hover:bg-amber-soft active:scale-[0.96]"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cx(
          "fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="sidebar"
        aria-label="Sidebar"
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-[288px] max-w-[calc(100vw-40px)] p-[9px] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-[272px] lg:max-w-none lg:flex-none lg:translate-x-0 lg:self-start lg:p-3 lg:transition-none",
          // Visible at once on open, so focus can move in; hidden only once
          // the slide out has finished.
          open
            ? "visible translate-x-0 transition-[translate]"
            : "invisible -translate-x-full transition-[translate,visibility]",
        )}
      >
        <div
          className={cx(
            "glass flex h-full flex-col rounded-[28px] p-3 [--glass-tint:80%]",
            GLASS_SHADOW,
          )}
        >
          <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-6">
            <Image
              src="/logo.svg"
              alt="Quicktalog"
              width={1064}
              height={387}
              priority
              className="h-[38px] w-auto"
            />
            <button
              ref={closeButton}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/[0.05] hover:text-ink lg:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <p className="px-3.5 pb-2 text-[12px] font-bold tracking-[0.06em] text-ink-3 uppercase">
            Analytics
          </p>
          {/* Picking a tab closes the drawer, even the tab already open. */}
          <div
            className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-0.5"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[role=tab]")) setOpen(false)
            }}
          >
            {nav}
          </div>

          {username && (
            <div className="mt-3 space-y-3 border-t border-line px-1 pt-4">
              <div className="flex min-w-0 items-center gap-2.5 px-1">
                <span
                  className="grid size-9 flex-none place-items-center rounded-full border border-amber/45 bg-amber-soft font-head text-sm font-extrabold text-amber-ink uppercase"
                  aria-hidden="true"
                >
                  {username.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] leading-tight text-ink-3">
                    Signed in as
                  </p>
                  <p className="truncate text-sm font-bold text-ink">
                    {username}
                  </p>
                </div>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-amber bg-card/70 px-[18px] text-[14.5px] font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-amber-soft active:scale-[0.98]"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
