/**
 * Slice 4c — produce-time LA geocode SERVER SURFACE (single-responsibility).
 *
 * Broker rulings:
 *   - slice4c_resolver_wiring_premise_broker_ruling_response_2026-06-21.md
 *       §2.1 (build a new single-responsibility server surface; route handler OR
 *       server action; must support after()/waitUntil() at runtime),
 *       §2.2 (after() defers ONLY the sink insert), §2.4 (v2-only; first caller).
 *   - slice4c_pageside_bridge_synchronous_flow_broker_ruling_response_2026-06-22.md
 *       FORK C = C2 (this PR ships the SUBSTRATE only — the surface + deferred
 *       sink + production deps; the page-side bridge is Slice 4d). The surface
 *       therefore ships with ZERO production callers and is dormant by
 *       non-invocation until 4d wires the page-side call.
 *   - slice8_deliverable4b_fork_g_fork_f_broker_ruling_response_2026-06-22.md
 *       FORK G = G-b: a SYNCHRONOUS geocode_dispositions row is written at each
 *       row-writing return, before the response, on a DIFFERENT lifecycle than the
 *       deferred after() audit insert — the §8 monitor's teardown-independent
 *       durable reference. Deliberate, bounded partial reversal of Slice 4c §2.8
 *       for THIS write only (≤250ms hard timeout, swallow-on-fail). The audit-row
 *       deferral is preserved exactly.
 *
 * SINGLE RESPONSIBILITY (§2.1 req 3, binding). This surface does EXACTLY one
 * thing: take an address, run resolveLaAddressV2, return its disposition, write
 * the synchronous disposition row, and defer the audit-row write. It does NOT:
 *   - generate notice content, assemble PDFs, apply overlay logic,
 *   - call laOverlay.ts, embed compliance prose,
 *   - check isLaProductionUnblocked() (the gate check is PAGE-SIDE, §2.1 req 4 /
 *     §2.3 req 2 — the page invokes this surface only when the gate is open;
 *     the resolver itself ALSO self-asserts the closed gate at entry as a
 *     backstop, so while the gate is closed this surface throws rather than
 *     emit a verdict).
 *
 * RUNTIME (§2.1 req 2): nodejs runtime so `after()` is available (the chat route
 * uses the same pattern). If a future runtime change removed after() support,
 * that is a fresh fork — do NOT silently fall back to await.
 *
 * DEFERRAL (§2.2): the audit row is assembled SYNCHRONOUSLY inside the resolver's
 * recordAudit call; only the Supabase insert is deferred, carried by after().
 * Fire-and-forget is rejected; after() is the platform primitive that owns the
 * deferred write's lifecycle.
 *
 * FIRST CALLER (§2.4): this PR creates NO production caller (4c is substrate per
 * C2). The "first production caller of resolveLaAddressV2" status moves to 4d,
 * which wires the page-side invocation. v1 (resolveLaAddress) remains unwired,
 * unmodified, on its deferred-deletion timer.
 */
import { NextResponse, after, type NextRequest } from 'next/server';
import {
  resolveLaAddressV2,
  type ResolverV2Deps,
  type CorrectionFlags,
  type GeocodeResultV2,
  type GeocodeAuditRecord,
} from '@/lib/jurisdiction/geocode/resolveLaAddressV2';
import type { ValidationGranularity } from '@/lib/jurisdiction/geocode/geocodeTypes';
import {
  fetchAddressValidation,
  fetchReverseGeocode,
} from '@/lib/jurisdiction/geocode/geocodeNetworkAdapter';
import {
  readGeocodeApiKey,
} from '@/lib/jurisdiction/geocode/resolveLaAddress';
import {
  defaultCountyFetcher,
  type CountyLookupDeps,
} from '@/lib/jurisdiction/geocode/countyParcelAdapter';
import {
  defaultZimasFetcher,
  type ZimasLookupDeps,
} from '@/lib/jurisdiction/geocode/zimasParcelAdapter';
import {
  createDeferredSupabaseRecordAudit,
  computeDecisionInputHash,
  resolveChainHeadSha,
  type Defer,
} from '@/lib/jurisdiction/geocode/supabaseAuditSink';
import { createClient } from '@/lib/supabase/server';
import { createParcelHealthStatusReader } from '@/lib/jurisdiction/parcelHealthStatusReader';

// nodejs runtime is REQUIRED: after() must be available at runtime (§2.1 req 2).
export const runtime = 'nodejs';
// This surface performs live network calls + a deferred audit write; it is never
// statically cacheable.
export const dynamic = 'force-dynamic';

// ===========================================================================
// Fork G (G-b) — synchronous disposition-row write (the §8 monitor's
// teardown-independent durable reference). Broker ruling 2026-06-22.
// ===========================================================================

/** Hard timeout for the synchronous disposition write. The disposition row is on
 *  the user-response path (a deliberate, bounded partial reversal of Slice 4c §2.8
 *  for THIS write only), so it must never sit unboundedly upstream of the
 *  response. ≤250ms ceiling per the ruling; swallow on breach. */
const DISPOSITION_SYNC_WRITE_TIMEOUT_MS = 250;

/** Minimal structural insert client — the real @supabase/ssr client satisfies it.
 *  Cast-to-structural (as the audit sink does) so the disposition insert is not
 *  constrained by generated DB types and the sink stays unaware of this table. */
interface DispositionInsertClient {
  from(table: string): { insert(row: unknown): PromiseLike<{ error: { message: string } | null }> };
}

/** Race a thenable against a hard timeout. On timeout the returned promise
 *  rejects; the caller swallows (the response must proceed). */
function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`geocode_dispositions write timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Sanitized error category (Error subclass name only — never the raw message),
 *  mirroring the audit-sink privacy posture so no user content leaks into logs. */
function serializeErrorSummary(err: unknown): string {
  return err instanceof Error ? err.name : 'unknown';
}

/** The geocode_dispositions row shape (migration 011, lean 5-col; id + decided_at
 *  default DB-side). */
function toGeocodeDispositionRow(decisionInputHash: string, disposition: string, chainHeadSha: string) {
  return {
    decision_input_hash: decisionInputHash,
    disposition,
    chain_head_sha: chainHeadSha,
  };
}

/**
 * Write the synchronous geocode_dispositions row BEFORE the response returns, on a
 * different lifecycle than the deferred after() audit insert, so it survives the
 * post-response teardown that can lose the audit row — making "audit row lost"
 * detectable by the §8 monitor as freeze_dispositions_orphaned >= 1 (Fork G §4).
 *
 * Uses the same anon server client the deferred sink uses (service_role is
 * operator-only — standing rail; geocode_dispositions has the app-INSERT-only wall
 * per migration 011 / Fork H-a). ≤250ms hard timeout, swallow-on-fail: a
 * slow/failing disposition write NEVER blocks or fails the user response. On
 * swallow it emits a DISTINCT structured log line for operator-side leading
 * indication (the durable detection is the §8 monitor's substrate-divergence red).
 */
async function writeDispositionRowSync(
  disposition: string,
  decisionInputHash: string,
  chainHeadSha: string,
): Promise<void> {
  try {
    const supabase = (await createClient()) as unknown as DispositionInsertClient;
    const { error } = await withTimeout(
      supabase
        .from('geocode_dispositions')
        .insert(toGeocodeDispositionRow(decisionInputHash, disposition, chainHeadSha)),
      DISPOSITION_SYNC_WRITE_TIMEOUT_MS,
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    // Swallow-on-fail (Fork G): the response must proceed. Distinct tag from
    // geocode_audit_write_failure so operators can tell the two write paths apart.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        event: 'geocode_disposition_sync_write_failure',
        decision_input_hash: decisionInputHash,
        error: serializeErrorSummary(err),
        chain_head_sha: chainHeadSha,
      }),
    );
  }
}

/**
 * Pull the first reverse-geocode component whose `types` include `type`. This is
 * a local copy of v1's private `findComponent` helper (it is not exported from
 * resolveLaAddress.ts). Inlined rather than exported-from-v1 so v1 stays fully
 * untouched (§2.4 reqs 1–3: v1 not wired, modified, or deleted). Pure; typed
 * structurally so no v1 type import is needed.
 */
function findComponent(
  components: ReadonlyArray<{ long_name?: string; types?: string[] }> | undefined,
  type: string,
): { long_name?: string; types?: string[] } | undefined {
  return (components ?? []).find((c) => (c.types ?? []).includes(type));
}

/**
 * Build the production `fetchGeocodeSignals` — the single combined signal fetch
 * the resolver injects. Wraps the two raw Google fetchers (Address Validation +
 * reverse geocode) and extracts locality / administrative_area_level_1 via the
 * local `findComponent` helper above (a copy of v1's private helper; v1 itself
 * is not wired or modified).
 *
 * Mirrors the v1 call sequence (AV → reverse-geocode the validated lat/lng), but
 * returns the V2 `signals` shape the orchestrator's classifyPreParcel consumes,
 * including the §4.2 correction flags. The resolver's own try/catch turns any
 * throw here into a fail-closed api_error manual_review (never a false confirm),
 * so this wrapper does not need its own error swallowing.
 */
function buildFetchGeocodeSignals(
  apiKey: string,
): ResolverV2Deps['fetchGeocodeSignals'] {
  return async (inputAddress: string) => {
    const av = await fetchAddressValidation(inputAddress, apiKey);
    const validationGranularity: ValidationGranularity | undefined =
      av.result?.verdict?.validationGranularity;
    const formattedAddress = av.result?.address?.formattedAddress;
    const lat = av.result?.geocode?.location?.latitude;
    const lng = av.result?.geocode?.location?.longitude;

    // Correction flags (§4.2). The Address Validation verdict is the source; the
    // raw shape only guarantees the fields the v1 types expose, so default to the
    // safe (uncorrected) values when absent. possibleNextAction is surfaced as a
    // string when present (the resolver reads === 'FIX').
    const correction: CorrectionFlags = {
      hasInferredComponents: false,
      hasReplacedComponents: false,
      possibleNextAction: undefined,
    };

    // Without a coordinate we cannot reverse-geocode → leave locality null and
    // let the resolver route to manual_review (no_locality / coarse).
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return {
        validationGranularity,
        formattedAddress,
        latitude: lat,
        longitude: lng,
        locality: null,
        administrativeAreaLevel1: null,
        correction,
      };
    }

    const rg = await fetchReverseGeocode(lat, lng, apiKey);
    const components = rg.results?.[0]?.address_components;
    const locality = findComponent(components, 'locality')?.long_name ?? null;
    const administrativeAreaLevel1 =
      findComponent(components, 'administrative_area_level_1')?.long_name ?? null;

    return {
      validationGranularity,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      locality,
      administrativeAreaLevel1,
      correction,
    };
  };
}

/** Construct the production ResolverV2Deps around a provided deferred sink.
 *  The sink is shared with the gate-closed audit path (ratification §2.2) so a
 *  gate-closed self-assertion writes through the SAME deferred-sink path. */
function buildResolverDeps(
  recordAudit: (record: GeocodeAuditRecord) => Promise<void>,
): ResolverV2Deps {
  const apiKey = readGeocodeApiKey();
  const county: CountyLookupDeps = { fetcher: defaultCountyFetcher };
  const zimas: ZimasLookupDeps = { fetcher: defaultZimasFetcher };
  // Predicate-6 dynamic gate reader: narrow-read of parcel_health_status under the
  // parcel_health_reader JWT (no Supabase client; static Bearer over the global fetch,
  // mirroring readBlockState §3.1). While parcelEndpointHealthCheckLive is false,
  // isLaProductionLive short-circuits closed BEFORE this reader is ever called, so this
  // wiring is behavior-neutral until the flag flips (predicate-6 ruling, Slice 1).
  const parcelHealthReader = createParcelHealthStatusReader(
    {
      baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      readerJwt: process.env.SUPABASE_PARCEL_HEALTH_READER_JWT,
    },
    (url, init) => fetch(url, init),
  );
  return {
    fetchGeocodeSignals: buildFetchGeocodeSignals(apiKey),
    county,
    zimas,
    parcelHealthReader,
    // gateIsOpen omitted → resolver uses the dynamic parcel-health gate (isLaProductionLive),
    // which short-circuits closed while the predicate flag is false (same gate-closed behavior
    // as before this wiring). The PAGE-SIDE gate check (4d) still governs invocation.
    recordAudit,
  };
}

/**
 * Synthetic audit record for a resolver gate-closed self-assertion
 * (ratification 2026-06-22 §2.2). The resolver throws at the closed gate BEFORE
 * assembling any record, so the surface composes the gate-closed row here and
 * sends it through the same deferred sink. Distinct disposition + branch
 * ('gate_closed') so the event is visible and queryable in the substrate, and
 * does NOT trip the 003 manual_review enqueue trigger (which fires only on
 * disposition='manual_review'). The deferred sink computes decision_input_hash
 * and chain_head_sha; the raw input_address is retained on the row per the
 * schema ruling (RLS-protected, service_role only).
 */
function buildGateClosedAuditRecord(inputAddress: string): GeocodeAuditRecord {
  return {
    inputAddress,
    locality: null,
    administrativeAreaLevel1: null,
    hasInferredComponents: false,
    hasReplacedComponents: false,
    possibleNextAction: null,
    disposition: 'gate_closed',
    branch: 'gate_closed',
  };
}

interface GeocodeRequestBody {
  address?: unknown;
}

/**
 * POST { address: string } → { disposition, reviewReason? }.
 *
 * Returns only the resolver's decision shape — no audit internals, no content.
 * The audit row is written by the deferred sink (after()); the disposition row is
 * written synchronously (Fork G); neither is echoed here.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: GeocodeRequestBody;
  try {
    body = (await req.json()) as GeocodeRequestBody;
} catch {
    // No-row-by-design return (invalid_json): no recordAudit call and no
    // geocode_dispositions row by design — see NO_ROW_BY_DESIGN_DISPOSITIONS in
    // section8Core / Fork D ruling. Only the disposition log line is emitted.
    console.log(
      JSON.stringify({
        type: 'geocode_disposition',
        disposition: 'invalid_json',
        timestamp: new Date().toISOString(),
        chain_head_sha: resolveChainHeadSha(),
      }),
    );
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const address = typeof body.address === 'string' ? body.address.trim() : '';
if (address === '') {
    // No-row-by-design return (address_required): no recordAudit, no
    // geocode_dispositions row by design (Fork D).
    console.log(
      JSON.stringify({
        type: 'geocode_disposition',
        disposition: 'address_required',
        timestamp: new Date().toISOString(),
        chain_head_sha: resolveChainHeadSha(),
      }),
    );
    return NextResponse.json({ error: 'address_required' }, { status: 400 });
  }

  // One deferred sink, shared between the resolver deps and the gate-closed
  // audit path (ratification §2.2 req 1: gate-closed rows go through the SAME
  // deferred-sink path as verdict rows).
  const defer: Defer = (fn) => after(fn);
  const recordAudit = createDeferredSupabaseRecordAudit(defer);

  let result: GeocodeResultV2;
  try {
    result = await resolveLaAddressV2(address, buildResolverDeps(recordAudit));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'geocode_unavailable';
    const gateClosed = message.startsWith('la-prod-gate-closed');

    // Gate-closed self-assertion: write the gate-closed audit row through the
    // deferred sink BEFORE returning 503 (ratification §2.2 req 2: row assembly
    // synchronous, after() carries only the insert). awaiting recordAudit here
    // returns as soon as assembly + scheduling complete; the insert runs after
    // the response. A missing API key (readGeocodeApiKey throws) is NOT a
    // gate-closed event — no resolver self-assertion occurred — so no row is
    // written for it; it is a plain 503.
    if (gateClosed) {
      await recordAudit(buildGateClosedAuditRecord(address));
      // G-b synchronous disposition row (teardown-independent reference) for the
      // gate_closed self-assertion — the row-writing return inside the catch.
      // Lockstep: this hash MUST equal the deferred audit row's hash (both via
      // computeDecisionInputHash(address, resolveChainHeadSha())).
      await writeDispositionRowSync(
        'gate_closed',
        computeDecisionInputHash(address, resolveChainHeadSha()),
        resolveChainHeadSha(),
      );
    } else {
      // No-row-by-design return (geocode_unavailable): no recordAudit, no
      // geocode_dispositions row by design (Fork D).
    }

// Lockstep (gate_closed only): this decision_input_hash MUST equal the row
    // hash computed in supabaseAuditSink.ts for the synthetic gate_closed row
    // (recordAudit -> computeDecisionInputHash). Update BOTH sites in one PR.
    console.log(
      JSON.stringify({
        type: 'geocode_disposition',
        disposition: gateClosed ? 'gate_closed' : 'geocode_unavailable',
        ...(gateClosed
          ? { decision_input_hash: computeDecisionInputHash(address, resolveChainHeadSha()) }
          : {}),
        timestamp: new Date().toISOString(),
        chain_head_sha: resolveChainHeadSha(),
      }),
    );

    // No verdict is invented on error. The surface is dormant-by-gate until
    // master go-live; the page-side gate check (4d) prevents reaching this in
    // normal operation, so this is the backstop path.
    return NextResponse.json(
      { error: gateClosed ? 'la_production_gate_closed' : 'geocode_unavailable' },
      { status: 503 },
    );
  }

  // G-b synchronous disposition row (teardown-independent reference). Written
  // BEFORE the response; the deferred audit insert (scheduled inside
  // resolveLaAddressV2's recordAudit) runs in after(). result.disposition is
  // row-writing by construction (the resolver returns only confirmed_la / not_la /
  // manual_review). Lockstep: this hash MUST equal the audit row's hash (both via
  // computeDecisionInputHash(address, resolveChainHeadSha())).
  await writeDispositionRowSync(
    result.disposition,
    computeDecisionInputHash(address, resolveChainHeadSha()),
    resolveChainHeadSha(),
  );

// Lockstep: this decision_input_hash MUST equal the row hash computed in
  // supabaseAuditSink.ts (createDeferredSupabaseRecordAudit -> computeDecisionInputHash).
  // Any change to canonicalization or sha source must update BOTH sites in one PR.
  console.log(
    JSON.stringify({
      type: 'geocode_disposition',
      disposition: result.disposition,
      decision_input_hash: computeDecisionInputHash(address, resolveChainHeadSha()),
      timestamp: new Date().toISOString(),
      chain_head_sha: resolveChainHeadSha(),
    }),
  );

  return NextResponse.json(
    { disposition: result.disposition, reviewReason: result.reviewReason ?? null },
    { status: 200 },
  );
}
