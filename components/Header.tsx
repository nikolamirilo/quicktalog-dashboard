"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { clearAuth, getStoredUsername } from "@/lib/auth"

const Header = () => {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    setUsername(getStoredUsername())
  }, [])

  const handleSignOut = () => {
    clearAuth()
    router.replace("/login")
  }

  // The design system's floating pill navbar: white at 80% with a blur.
  return (
    <div className="sticky top-[9px] z-20 px-5">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 rounded-full border border-ink/6 bg-card/80 pr-2.5 pl-[18px] shadow-[0_10px_30px_-10px_rgba(22,20,15,0.18),0_2px_6px_rgba(22,20,15,0.05)] backdrop-blur-[14px] backdrop-saturate-[1.6]">
        <Image
          src="/logo.svg"
          alt="Quicktalog"
          width={1064}
          height={387}
          priority
          className="h-[38px] w-auto"
        />
        {username && (
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-[42px] items-center rounded-full border-[1.5px] border-amber bg-card px-[18px] text-[14.5px] font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-amber-soft active:scale-[0.98]"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}

export default Header
