import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const CALLBACK_URL = 'https://www.ownerpilot.ai/auth/callback'
const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const

function jsonResponse(body: { accepted: boolean }, status: number) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  })
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const email = value.trim()
  if (email.length < 3 || email.length > 320) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  return email
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ accepted: false }, 400)
  }

  const emailValue =
    body && typeof body === 'object' && 'email' in body
      ? (body as { email?: unknown }).email
      : undefined
  const email = normalizedEmail(emailValue)

  if (!email) {
    return jsonResponse({ accepted: false }, 400)
  }

  try {
    const supabase = await createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: CALLBACK_URL,
      },
    })
  } catch {
    // Preserve one non-enumerating response for syntactically valid addresses.
  }

  return jsonResponse({ accepted: true }, 202)
}
