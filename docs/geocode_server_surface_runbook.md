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

## §8 — Verification suite (bounded-anomaly monitor)

§8 is the audit-substrate's bounded-anomaly + trend monitor. It is NOT exact
reconciliation: no durable server-side invocation counter exists in this codebase
by design (a pre-write marker is recursive; a Vercel-log oracle would couple us to
a non-substrate vendor for compliance signal). §8 instead decomposes the substrate
signal into four components and isolates freeze-loss as the residual.

The four components, over a window:

  1. rows_written
       = COUNT(*) FROM geocode_audit_log WHERE decided_at ∈ window

  2. write_failures_unrecovered
       = COUNT geocode_audit_write_failure events WHERE decision_input_hash
         has no matching row in geocode_audit_log

  3. dispositions_with_no_row_by_design
       = COUNT geocode_disposition events WHERE disposition ∈
         {invalid_json, address_required, geocode_unavailable}

  4. freeze_loss_suspected
       = (COUNT geocode_disposition events WHERE disposition ∈
          {confirmed_la, not_la, manual_review, gate_closed})
         − rows_written
         − write_failures_unrecovered

gate_closed dispositions and gate_closed rows are counted on both sides at full
weight. write_failures_unrecovered are computed via decision_input_hash join.

§8 is not gate-bearing. geocodeAuditDurabilityWired flips on §8 ARTIFACT delivery
+ broker attestation at the master go-live PR. Post-flip §8 monitoring produces
alerts and investigation tickets; it does not auto-revert the gate. Any gate-state
change is a separate broker-authored single-commit PR.

Threshold table (canonical):
  freeze_loss_suspected == 0  AND  write_failures_unrecovered == 0  → green
  freeze_loss_suspected == 1  AND  prior window green                → yellow (alert)
  freeze_loss_suspected ≥ 1   AND  prior window yellow-or-red        → red (alert + ticket)
  freeze_loss_suspected ≥ 2   (any single window)                    → red (alert + ticket)
  write_failures_unrecovered ≥ 1                                     → red (alert + ticket)
  freeze_loss_suspected < 0                                          → red (substrate bug)

The substrate adds one new structured-log event (geocode_disposition, emitted at
every return branch of app/api/notice/geocode/route.ts; hash-only, no raw
input_address) and one new audit table (section8_runs, migration 010, RLS
service_role only).

§8 artifacts:
  (1) lib/jurisdiction/geocode/section8.verification.test.ts — pre-go-live one-shot;
      named by the master go-live predicate as the §8 build-gate signal.
  (2) scripts/section8_monitor.ts — local-CLI recurring monitor (daily 03:00 PT);
      service_role key sourced from local broker environment per Slice 4 §2.2.
      NEVER referenced from app/Vercel/git/CI.
  (3) This runbook §8 section — query set + threshold table + investigation procedure
      for red alerts.

Investigation procedure for red:
  - Pull the section8_runs row.
  - Cross-reference the window against deployment activity (recent deploys can
    transiently widen freeze_loss_suspected as instances are torn down mid-after()).
  - For freeze_loss_suspected ≥ 2 without correlated deployment activity: substrate
    regression candidate. Broker decides whether to re-close the gate via a
    single-commit revert PR.
  - For write_failures_unrecovered ≥ 1: query the matching geocode_audit_write_failure
    events for error_class clustering. If a single error_class accounts for the
    cluster, that's the substrate signal; if hash-spread, that's a substrate-or-vendor
    concern needing a separate ruling.
  - For freeze_loss_suspected < 0: stop. The disposition log is dropping events
    OR a non-route.ts code path is writing rows. Either is a substrate bug that
    blocks further interpretation until resolved.

---

## Operational notes

- **No gate flip here.** `geocodeAuditDurabilityWired` stays `false`. It flips in its own single-commit PR after Slices 2 + 3a + 3b + 4a + 4b + 4c + 4d + §8.
- **API key.** `GOOGLE_GEOCODE_API_KEY` must be present in the server environment before 4d invokes the surface in production. Absent key → the surface returns `503 { error: "geocode_unavailable" }` (the key reader throws; no verdict is invented).
- **No silent fallback.** A resolver error returns `503`; the surface never substitutes a guessed verdict. (The page-side mapping of a `503`/error to a hard `JURISDICTION_RESOLUTION_FAILED` blocker is 4d's concern.)
- **v1 untouched.** `resolveLaAddress` (v1) is referenced only for its response types + the `findComponent` extraction helper; it is not wired, modified, or deleted, and remains on its deferred-deletion timer.

## Slice 4d — page-side jurisdiction resolver bridge (dormant-by-gate)

Status: wired and tested; observably dormant in production for the entire 4d
window. The bridge wakes at the master go-live flip with no code change.

### What 4d wires

At ReviewStep entry (the produce-flow Review page), a page-side effect invokes
the 4c geocode server surface (`POST /api/notice/geocode`) for the property
address, keyed on the normalized address, and caches the resolver verdict in
flow state (`NoticeFlowData.cachedResolverVerdict`). The produce gate
(`evaluateCanProduceV4`) reads that cached verdict synchronously and supersedes
the `detectJurisdiction` stub on the `NEEDS_CONFIRMATION` branch only (FORK A):
`confirmed_la` → LA-overlay hard block, `not_la` → clears, `manual_review` →
manual-review hard block, resolver error → resolution-failed hard block (Retry).
The three new hard-block codes render as terminal blocks (no "Fix this →" jump;
B.1). The notice face composes only after a non-blocking verdict (FORK B).

### Dormant-by-gate (Option 1, ruling 2026-06-22)

Throughout 4d's production life the LA-production gate is CLOSED
(`geocodeAuditDurabilityWired` = false). The page-side effect's first action is
the `isLaProductionUnblocked()` check; when the gate is closed the bridge does
NOT invoke the surface — no fetch, no cached verdict, no organic audit row, no
loading/retry UI. The stub's `JURISDICTION_NEEDS_CONFIRMATION` stands and the
user sees the pre-4d page-1 "confirm the address" flow for LA-ish addresses,
unchanged. Organic page traffic produces no `geocode_audit_log` rows during 4d.

This is the steady-state shape, not a temporary early-return: there is no
dormancy feature flag and no "remove when gate opens" TODO. When the master
go-live PR flips `geocodeAuditDurabilityWired` to true, the predicate returns
true on the next ReviewStep entry and the bridge invokes — with no code change
in 4d's files. That is the property that keeps go-live a switch-flip.

The resolver's own gate self-assertion (runbook §2.1) is unchanged and remains
the defense-in-depth backstop for any non-organic caller path (deliberate test
invocations, the §8 verification suite, future caller surfaces). Under Option 1
the page-side check is the primary mechanism for organic traffic; the
self-assertion is the layered backstop.

### Draft persistence (freeze-loss on deploy)

`cachedResolverVerdict` is a new `NoticeFlowData` field, so `DRAFT_VERSION`
bumped 2 → 3 (ruling 4d-A.1). Per the envelope rule, pre-4d drafts (`v: 2`) are
discarded on load — no field-level migration. Any in-flight draft at the 4d
deploy is invalidated once and the user re-enters; a draft is cheap to re-enter,
and not persisting the verdict would balloon the audit log with refresh-driven
duplicate resolves. During the 4d window the field is never populated (the
resolver is never invoked organically), so in practice the only observable 4d
effect in production is this one-time draft discard at deploy.

### Cache invalidation + refresh + retry (behavior when the gate is open)

- Cache is keyed on the normalized property address (trim + collapse whitespace
  + lowercase). Editing the address invalidates the cache (the keyed lookup
  misses) and the resolver re-runs at the next ReviewStep entry. An in-flight
  call is aborted on address edit / unmount (FORK B: one in-flight call, cancel
  stale).
- A refresh on Review reuses the persisted verdict for the same address (no
  re-resolve, no second audit row) — the reason 4d-A.1 chose persistence over
  in-memory.
- The Retry button (on resolution-failed only) clears the failed verdict for the
  current address and forces a fresh invocation; each retry is a new audit row
  (FORK B per-invocation semantics). No UI-layer cooldown (rate-limit posture is
  the resolver's / Slice 5's concern).
- Loading copy: standard "Confirming jurisdiction…" below 4s wall-clock; "slow"
  variant "Confirming jurisdiction. This can take a few seconds." at 4s+. Both
  §3.A verbatim. These and the Retry "Try again" label (§3.C) are wired but not
  organically reachable in the 4d window.