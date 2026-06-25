/**
 * RTC block-state read route — thin wrapper over readBlockState() (the testable core in
 * lib/jurisdiction/rtcRefresh/readBlockState.ts). All gate/validation/fetch/fail-closed branching
 * lives in the core; this layer does only: secret + query-param + env extraction, structured
 * logging, and the NextResponse. No route-handler test by design — the runner globs lib/ +
 * supabase/functions/, not app/, matching the repo's thin-route pattern (cf. the geocode route).
 *
 * Real path: app/api/internal/rtc-block-state/route.ts
 *
 * Caller-auth (ruling 2026-06-25 §3): the x-rtc-block-state-secret header gates this route; the
 * value lives in RTC_BLOCK_STATE_ROUTE_SECRET. Two locks, two keys — the reader JWT gates Supabase,
 * the shared secret gates the route. §3.1: the core imports no Supabase client; this route injects
 * an adapter over the global fetch, so the reader JWT is only ever a static Bearer header.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { readBlockState, type FetchLike } from '@/lib/jurisdiction/rtcRefresh/readBlockState';

// Live read of mutable state; never statically cacheable. Mirrors the geocode route.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Structured log — privacy-safe fields only (never the route secret, reader JWT, row contents,
 *  raw bodies, or the raw language param). */
function logEvent(fields: Record<string, string>): void {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      type: 'rtc_block_state_read',
      ...fields,
      timestamp: new Date().toISOString(),
    }),
  );
}

// Adapter so the global fetch satisfies the core's injected FetchLike. The reader JWT travels as a
// static Authorization: Bearer header; no Supabase client is constructed, so no refresh-on-401 path
// exists (reader-auth ruling §3.1, satisfied by construction).
const fetchImpl: FetchLike = (url, init) => fetch(url, init);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result = await readBlockState(
    {
      language: req.nextUrl.searchParams.get('language'),
      presentedSecret: req.headers.get('x-rtc-block-state-secret'),
    },
    {
      routeSecret: process.env.RTC_BLOCK_STATE_ROUTE_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      readerJwt: process.env.SUPABASE_RTC_READER_JWT,
    },
    fetchImpl,
  );

  // Privacy-safe structured log: event + status + validated language only. language is omitted on
  // the gate / missing / invalid-param paths, so neither a secret nor a raw param value is logged.
  logEvent({
    event: result.event,
    status: String(result.status),
    ...(result.language ? { language: result.language } : {}),
  });

  return NextResponse.json(result.body, { status: result.status });
}
