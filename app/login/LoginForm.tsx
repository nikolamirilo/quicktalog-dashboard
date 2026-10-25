"use client"

import { useEffect } from "react"
import { useActionState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import Backdrop from "@/components/Backdrop"
import { setAuthenticated } from "@/lib/auth"

import { signIn, type SignInState } from "./actions"

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    null,
  )

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setAuthenticated(state.username)
      router.replace(next)
    }
  }, [state, router, next])

  const errorMessage = state && "error" in state ? state.error : undefined
  const succeeded = !!(state && "ok" in state && state.ok)

  const inputCls =
    "h-12 w-full rounded-md border-[1.5px] border-line-strong bg-card px-3.5 text-base text-ink transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-line-hover focus-visible:border-amber focus-visible:ring-4 focus-visible:ring-amber/25 focus-visible:outline-none"

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <Backdrop />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.svg"
            alt="Quicktalog"
            width={1064}
            height={387}
            priority
            className="h-[38px] w-auto"
          />
          <span className="mt-7 text-sm font-bold text-amber-ink">
            Admin analytics
          </span>
          <h1 className="mt-1 text-card-title font-bold text-ink">
            Sign in to the dashboard
          </h1>
        </div>

        <form
          action={action}
          className="qt-card glass animate-chart-in space-y-4 rounded-lg p-[22px] [--glass-shadow:var(--shadow-hover)]"
        >
          <label className="block">
            <span className="mb-[7px] block text-sm font-semibold text-ink">
              Username
            </span>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
              aria-invalid={!!errorMessage}
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="mb-[7px] block text-sm font-semibold text-ink">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              aria-invalid={!!errorMessage}
              className={inputCls}
            />
          </label>

          <input type="hidden" name="next" value={next} />

          {errorMessage && (
            <p
              role="alert"
              className="rounded-md bg-red-soft px-3.5 py-2.5 text-[13px] text-red"
            >
              <b className="font-semibold">Sign-in failed.</b> {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || succeeded}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-amber px-[22px] text-[15px] font-semibold text-on-amber shadow-amber transition duration-200 hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending
              ? "Signing in..."
              : succeeded
                ? "Redirecting..."
                : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}
