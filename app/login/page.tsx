import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { readSession, safeNext } from "@/lib/session"

import LoginForm from "./LoginForm"

type Props = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next)
  if (readSession(await cookies())) redirect(next)
  return <LoginForm next={next} />
}
