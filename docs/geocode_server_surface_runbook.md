# Runbook — produce-time geocode server surface (Slice 4c)

**Status:** substrate only (Slice 4c). The surface exists and is type-checked, but has **zero production callers** in this slice — the page-side bridge that invokes it is Slice 4d. Until 4d lands, nothing in production calls this route, and `geocode_audit_log` receives no rows from it.

**Surface:** `app/api/notice/geocode/route.ts` — `POST { address: string }` → `{ disposition, reviewReason }`.
**Runtime:** `nodejs` (required so `after()` is available).
**Gate:** the surface does NOT check `isLaProductionUnblocked()`. The page-side caller (4d) performs the gate check; the resolver additionally self-asserts the closed gate at entry as a backstop. While the LA production gate is closed, the surface returns `503 { error: "la_production_gate_closed" }` rather than a verdict.

The surface code itself contains no read of `isLaProductionUnblocked()` (per Slice 4c-premise §2.1 req 4). The resolver, at the `lib/jurisdiction/geocode/` layer, performs the self-assertion; the surface translates the resolver's refusal into the `503 { error: "la_production_gate_closed" }` response. This is defense-in-depth at a different layer (resolver module, not surface) — it catches any non-page caller (a script, a stray test, a future caller wired without the page-side check) and still leaves an auditable trail (see "Gate-closed audit row" below).

---

## What the surface does

1. Reads `address` from the POST body (400 on missing/invalid).
2. Builds production `ResolverV2Deps`:
   - `fetchGeocodeSignals` — Google Address Validation → reverse-geocode the validated coordinate → extract `locality` / `administrative_area_level_1`. Key from `GOOGLE_GEOCODE_API_KEY` (server env; never logged or returned).
   - `county` / `zimas` — `defaultCountyFetcher` / `defaultZimasFetcher` (public LA County parcel + ZIMAS landbase endpoints; no key).
   - `recordAudit` — the **deferred** Supabase sink (`createDeferredSupabaseRecordAudit`), with `defer = (fn) => after(fn)`.
3. Calls `resolveLaAddressV2(address, deps)`.
4. Returns the disposition. The audit row write is deferred (see below).

## Gate-closed audit row (ratification 2026-06-22 §2.2)

A resolver gate-closed self-assertion is itself a jurisdiction-decision event ("the gate is closed; refuse"), so it **writes an audit row** — it is not silent. Because the resolver throws at the closed gate *before* assembling any record, the surface composes a synthetic gate-closed `GeocodeAuditRecord` and sends it through the **same deferred sink** (`createDeferredSupabaseRecordAudit`) used for verdict rows, then returns the 503. Row shape:

- `disposition` = `gate_closed` — a **distinct** value (not `manual_review`, not `confirmed_la`/`not_la`). Distinct so the event is queryable in the substrate, and specifically *not* `manual_review` so it does **not** trip the 003 `enqueue_manual_review` trigger (which fires only on `disposition='manual_review'`). A gate-closed refusal must not enqueue a human review.
- `branch` = `gate_closed`.
- `input_address` = the raw submitted address (retained on the row per the schema ruling, RLS-protected, `service_role` only).
- `decision_input_hash`, `chain_head_sha` = computed by the sink, same discipline as any row.

The `gate_closed` label is build-picked for 4c; **4d's ruling may rename it**. The `geocode_audit_log.disposition`/`branch` columns are free text (002 migration note: "enum-ish fields are text"), so this value persists without a schema change. A surge of `gate_closed` rows after master go-live would indicate either a misconfiguration (gate unexpectedly closed while the page still invokes the surface) or a probing programmatic caller — both operationally meaningful and now visible in the substrate.


The surface does NOT: generate notice content, assemble PDFs, apply overlay logic, call `laOverlay.ts`, embed compliance prose, or check the production gate. Single responsibility: address in → resolver verdict out → audit row deferred-write.

---

## Deferred-write model and the freeze-loss risk

The audit row is **assembled synchronously** inside `recordAudit` (row shape + `decision_input_hash` + `chain_head_sha` are all computed before the response returns). **Only the Supabase `insert` is deferred**, carried by `after()` — it runs after the HTTP response is sent.

**Freeze-loss risk.** If the serverless instance is frozen or torn down between sending the response and running the deferred `after()` callback, the insert never executes. The user's request already succeeded (the disposition was returned); the audit row is silently absent. This is the deliberate trade documented in the Slice 4 / Slice 4c rulings: an audit hiccup must never sit upstream of the user-facing decision, so the write is deferred and a rare freeze-loss is accepted rather than blocking the response on the insert.

**This is not the same as a write failure.** A write that *runs but fails* (network/permission/constraint) goes through the sink's swallow+log+alert+count path: the failure counter increments, a structured `geocode_audit_write_failure` event is logged (carrying the `decision_input_hash`, never the raw address), and a `geocode_audit` alert fires (in_app + email). A freeze-loss produces **none** of those signals — the callback simply never ran. That is why the reconciliation signal below is row-count-based, not failure-log-based.

### Privacy and data handling (ratification 2026-06-22 §2.3)

The audit **row** and the failure **event** have different audiences, so they carry different content. Alert-channel events carry identifiers; raw user content stays in the RLS-protected audit row. Specifically, the `geocode_audit_write_failure` event payload carries only `decision_input_hash`, `attempted_at`, `error_class` (a sanitized error category — the Error subclass name, never the raw message), `chain_head_sha`, and `failure_count`. It carries **no** `input_address` and **no** verdict (`disposition`/`review_reason`). Those live on the `geocode_audit_log` row, which is RLS-protected and readable only with `service_role`; an on-call reader correlates an alert to its row via the `decision_input_hash`. The alert flows to a broader operational surface (incident channel, dashboard, on-call) than the row, so keeping raw addresses off the alert path is the privacy boundary.


---

## The reconciliation signal (what §8 verifies)

The detectable signature of freeze-loss is a **count delta**:

```
(# resolver invocations during produce)  −  (# geocode_audit_log rows written)  =  lost deferred writes
```

- Resolver-invocation count: surfaced by 4d's page-side instrumentation (the page invokes the surface once per (address, ReviewStep-entry) cache miss).
- `geocode_audit_log` row count: queried directly.

The **§8 verification suite** (its own broker ruling, raised after 4d lands) reconciles these two counts and reports the deferred-write completion rate. A small, stable delta is expected freeze-loss; a growing delta indicates a deferred-write regression (e.g. `after()` not firing in a runtime config) and should be investigated.

Until 4d wires the page-side caller and instrumentation, there are no invocations to reconcile — this section is the forward contract for the §8 suite.

---

## Operational notes

- **No gate flip here.** `geocodeAuditDurabilityWired` stays `false`. It flips in its own single-commit PR after Slices 2 + 3a + 3b + 4a + 4b + 4c + 4d + §8.
- **API key.** `GOOGLE_GEOCODE_API_KEY` must be present in the server environment before 4d invokes the surface in production. Absent key → the surface returns `503 { error: "geocode_unavailable" }` (the key reader throws; no verdict is invented).
- **No silent fallback.** A resolver error returns `503`; the surface never substitutes a guessed verdict. (The page-side mapping of a `503`/error to a hard `JURISDICTION_RESOLUTION_FAILED` blocker is 4d's concern.)
- **v1 untouched.** `resolveLaAddress` (v1) is referenced only for its response types + the `findComponent` extraction helper; it is not wired, modified, or deleted, and remains on its deferred-deletion timer.
