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
 *
 * SINGLE RESPONSIBILITY (§2.1 req 3, binding). This surface does EXACTLY one
 * thing: take an address, run resolveLaAddressV2, return its disposition, and
 * defer the audit-row write. It does NOT:
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

// nodejs runtime is REQUIRED: after() must be available at runtime (§2.1 req 2).
export const runtime = 'nodejs';
// This surface performs live network calls + a deferred audit write; it is never
// statically cacheable.
export const dynamic = 'force-dynamic';

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
  return {
    fetchGeocodeSignals: buildFetchGeocodeSignals(apiKey),
    county,
    zimas,
    // gateIsOpen omitted → resolver uses the real isLaProductionUnblocked()
    // backstop (closed today). The PAGE-SIDE gate check (4d) is what actually
    // governs whether this surface is invoked; the surface stays gate-naive.
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
 * The audit row is written by the deferred sink (after()), not echoed here.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: GeocodeRequestBody;
  try {
    body = (await req.json()) as GeocodeRequestBody;
} catch {
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
