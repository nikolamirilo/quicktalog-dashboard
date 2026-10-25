"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { clearAuth, getStoredUsername } from "@/lib/auth"
import { cx } from "@/lib/utils/cx"

// The design system's floating pill navbar, in glass (white at 80%). `nav`
// sits in the middle of the pill from `lg`, and on its own row below that.
const Header = ({ nav }: { nav?: React.ReactNode }) => {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setUsername(getStoredUsername())
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleSignOut = () => {
    clearAuth()
    router.replace("/login")
  }

  return (
    <header className="sticky top-[9px] z-30 px-5">
      <div
        className={cx(
          "glass mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-2 rounded-[28px] py-2.5 pr-2.5 pl-[18px] [--glass-shadow:0_10px_30px_-10px_rgba(22,20,15,0.18),0_2px_6px_rgba(22,20,15,0.05)] lg:h-16 lg:flex-nowrap lg:rounded-full lg:py-0",
          scrolled ? "[--glass-tint:86%]" : "[--glass-tint:80%]",
        )}
      >
        <Image
          src="/logo.svg"
          alt="Quicktalog"
          width={1064}
          height={387}
          priority
          className="h-[38px] w-auto"
        />
        {nav && (
          <div className="order-last min-w-0 basis-full lg:order-none lg:flex lg:flex-1 lg:basis-auto lg:justify-center">
            {nav}
          </div>
        )}
        {username && (
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span
              className="hidden size-9 place-items-center rounded-full border border-amber/45 bg-amber-soft font-head text-sm font-extrabold text-amber-ink uppercase sm:grid"
              title={`Signed in as ${username}`}
            >
              {username.slice(0, 1)}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-[42px] items-center gap-2 rounded-full border-[1.5px] border-amber bg-card/70 px-[18px] text-[14.5px] font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-amber-soft active:scale-[0.98]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
