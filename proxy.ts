import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * UTM attribution + landing-page routing.
 *
 * In Next.js 16 the `middleware` file convention was renamed to `proxy` — same
 * capabilities, new name (see node_modules/next/dist/docs/.../proxy.md). This
 * runs before the page renders and does three things:
 *   1. Internally rewrites ad traffic to the matching landing variant — the
 *      browser keeps showing ownerpilot.ai/ (rewrite, not redirect).
 *   2. Records first-touch campaign attribution in the `pp_source` cookie.
 *   3. Forwards the resolved source to the page via the `x-pp-source` request
 *      header (upstream only — never exposed to the client).
 */

const SOURCE_COOKIE = 'pp_source'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds

// referring_source values that represent a paid/identified campaign. Anything
// else ('organic', 'unknown') is non-campaign and may be upgraded later.
const NON_CAMPAIGN = new Set(['organic', 'unknown'])
const isCampaign = (source: string | undefined): boolean =>
  source !== undefined && !NON_CAMPAIGN.has(source)

type Attribution = {
  /** Internal path to rewrite to (browser URL is unchanged). */
  landing: string
  /** Canonical users.referring_source enum value. */
  source: string
}

/**
 * Resolve this visit's UTM parameters to a landing variant + referring_source.
 * Order matters: more specific (source + campaign) rules come first.
 */
function resolveAttribution(params: URLSearchParams): Attribution {
  const utmSource = (params.get('utm_source') ?? '').trim().toLowerCase()
  const utmCampaign = (params.get('utm_campaign') ?? '').trim().toLowerCase()

  if (utmSource === 'google' && utmCampaign.includes('crisis')) {
    return { landing: '/landing/crisis', source: 'google-crisis' }
  }
  if (utmSource === 'facebook' && utmCampaign.includes('retiree')) {
    return { landing: '/landing/retiree', source: 'facebook-retiree' }
  }
  if (utmSource === 'facebook' && utmCampaign.includes('inheritor')) {
    return { landing: '/landing/inheritor', source: 'facebook-inheritor' }
  }
  if (utmSource === 'instagram') {
    return { landing: '/landing/inheritor-visual', source: 'instagram-inheritor' }
  }
  if (utmSource === 'linkedin') {
    return { landing: '/landing/tech', source: 'linkedin-tech' }
  }
  if (utmSource === 'email') {
    return { landing: '/landing/business', source: 'email-business' }
  }

  // No utm_source at all → organic; a source we don't recognise → unknown.
  return {
    landing: '/landing/default',
    source: utmSource === '' ? 'organic' : 'unknown',
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl

  const incoming = resolveAttribution(searchParams)
  const existing = request.cookies.get(SOURCE_COOKIE)?.value

  // First campaign-touch wins: keep an already-identified campaign, but let a
  // new campaign upgrade an organic/unknown (or absent) cookie. This stops a
  // later organic page view from erasing the ad that actually acquired the user.
  const effectiveSource = isCampaign(existing) ? existing! : incoming.source

  // Forward the resolved source to the page/server component (upstream only).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pp-source', effectiveSource)

  // Only the entry point ("/") is rewritten to a landing variant, so deeper
  // routes (/pricing, /dashboard, /landing/*) are never hijacked. The rewrite
  // is internal — the browser keeps showing ownerpilot.ai/. The landing shown
  // reflects *this* visit's UTMs; the cookie/header carry first-touch source.
  const response =
    pathname === '/'
      ? NextResponse.rewrite(new URL(incoming.landing, request.url), {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } })

  // Refresh the Supabase auth session. This attaches any rotated auth cookies
  // and the required cache-control headers onto `response` before we return.
  await updateSession(request, response)

  // Persist attribution for 30 days whenever it changes (establishes first
  // touch, or upgrades organic/unknown → an identified campaign).
  if (effectiveSource !== existing) {
    response.cookies.set(SOURCE_COOKIE, effectiveSource, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return response
}

export const config = {
  // Run on all routes except API, Next internals, and static metadata files.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
