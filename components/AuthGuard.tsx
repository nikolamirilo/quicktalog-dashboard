"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { isAuthenticated } from "@/lib/auth"

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      setChecked(true)
    } else {
      router.replace("/login")
    }
  }, [router])

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <div
          className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-amber"
          aria-label="Loading"
        />
      </div>
    )
  }

  return <>{children}</>
}
