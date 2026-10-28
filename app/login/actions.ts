"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  SESSION_COOKIE,
  safeNext,
  sameText,
  sessionConfigured,
  sessionCookie,
} from "@/lib/session"

export type SignInState = { error: string } | null

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!username || !password) {
    return { error: "Username and password are required." }
  }

  const expectedUser = process.env.ADMIN_USERNAME
  const expectedPass = process.env.ADMIN_PASSWORD

  if (!expectedUser || !expectedPass) {
    return {
      error:
        "Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env",
    }
  }

  if (!sessionConfigured()) {
    return {
      error:
        "Sessions are not configured. Set SESSION_SECRET (32 characters or more) in .env",
    }
  }

  // Both checks run every time, so timing doesn't tell which one failed.
  const userOk = sameText(username, expectedUser)
  const passOk = sameText(password, expectedPass)
  if (!userOk || !passOk) {
    return { error: "Invalid username or password." }
  }

  const jar = await cookies()
  jar.set(sessionCookie(username))
  redirect(safeNext(formData.get("next")))
}

export async function signOut() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect("/login")
}
