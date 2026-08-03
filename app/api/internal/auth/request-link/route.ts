import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  currentPreviewAuthBoundary,
  isAllowlistedAdminEmail,
  isBoundedEmail,
} from '@/lib/auth/previewAdminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NEUTRAL_MESSAGE =
  'If this address is eligible, authentication instructions will be sent.'

function neutralResponse(): NextResponse {
  return NextResponse.json(
    { accepted: true, message: NEUTRAL_MESSAGE },
    {
      status: 202,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
      },
    },
  )
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestOrigin = new URL(request.url).origin
  const boundary = currentPreviewAuthBoundary(requestOrigin)
  if (!boundary.ok) return new NextResponse(null, { status: 404 })

  let email: unknown
  try {
    const body = (await request.json()) as { email?: unknown }
    email = body.email
  } catch {
    return neutralResponse()
  }

  if (!isBoundedEmail(email)) return neutralResponse()
  if (!isAllowlistedAdminEmail(email)) return neutralResponse()

  try {
    const supabase = await createClient()
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: boundary.callbackUrl,
      },
    })
  } catch {
    // Deliberately suppressed. The browser receives the same bounded response
    // for registered, unregistered, allowlisted, and non-allowlisted emails.
  }

  return neutralResponse()
}
