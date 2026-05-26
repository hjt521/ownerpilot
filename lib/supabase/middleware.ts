import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Refresh the Supabase auth session for an incoming request.
 *
 * Called from proxy.ts. It reads the request cookies, and when Supabase rotates
 * the session it writes the new auth cookies — plus the cache-control headers
 * @supabase/ssr supplies — onto the `response` the caller already built. That
 * works whether the caller's response is a `rewrite` or a `next`.
 *
 * The cache-control headers matter in production: they stop a CDN or reverse
 * proxy from caching a `Set-Cookie` auth response and serving one user's
 * session token to another.
 *
 * IMPORTANT: `getUser()` must run before the response is returned, otherwise a
 * refresh that completes after the response is committed is lost.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          )
        },
      },
    },
  )

  // Touch the auth server to validate/rotate the token. Do not insert code
  // between client creation and this call.
  //
  // Kept non-fatal on purpose: the proxy runs on every route, including public
  // marketing/landing pages. A missing env var or a transient Supabase outage
  // must not 500 the whole site (and take the UTM routing down with it) — we
  // log and let the request through unauthenticated. Authed routes do their own
  // gating once we build them.
  try {
    await supabase.auth.getUser()
  } catch (error) {
    console.error('[updateSession] auth refresh failed:', error)
  }
}
