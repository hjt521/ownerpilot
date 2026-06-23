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

§8 is durable-vs-durable reconciliation. Deliverable 4b adds `geocode_dispositions` (migration 011), a durable, teardown-independent disposition record written synchronously on the response path. The monitor compares it against `geocode_audit_log` over a banded window. No log oracle. No vendor-coupled ephemeral source. The two durable tables are the only inputs.

Both writes are durable; the disposition write is teardown-independent. A lost audit row surfaces as a non-zero orphan against the disposition row that survived, instead of both records dying together and the window going vacuously green.

### §8.1 — The three measured durable counts

The monitor reads three counts over the banded window:

- **D** — count of `public.geocode_dispositions` rows in the window.
- **R_h** — count of `public.geocode_audit_log` rows in the window whose `decision_input_hash` matches an in-window disposition hash (hash-matched).
- **R_t** — total count of `public.geocode_audit_log` rows in the window (no hash filter).

All three reads carry the +5m band (see §8.8). All three reads must succeed; if any read fails the verdict is `monitor_degraded` and the substrate-reconciliation rules below are not evaluated for the window.

### §8.2 — The two computed orphan quantities

From the three counts, the monitor computes:

- `freeze_dispositions_orphaned = D − R_h` — **audit-write-loss.** A disposition occurred; its audit row is absent. Caused by `after()` teardown of the audit insert, by an audit-write failure (the `geocode_audit_write_failure` operator indicator), or by a substrate regression on the audit-write path.
- `freeze_audit_orphaned = R_t − R_h` — **disposition-write-loss.** An audit row exists; its matching disposition row is absent. Caused by a synchronous-disposition-write failure (`geocode_disposition_sync_write_failure`), by a non-route.ts code path inserting audit rows (a substrate bug), or by a `decided_at` placement bug that puts an audit row outside the band while its disposition row sits inside.

The parent ruling's §3 ground-4 bullet-1 stated the orphan arithmetic as "audit rows minus disposition rows plus one." That formulation is wrong. The corrected formulation is the two subtractions above: `D − R_h` and `R_t − R_h`, evaluated independently. The "plus one" term in the parent was a residue from an earlier draft that conflated the count of orphans with the count of consecutive-yellow occurrences (the NF-2 chain). The chain is tracked separately in `section8_runs` history (§8.4); it is not arithmetic inside a single window's orphan count.

### §8.3 — `section8_runs` column-name mapping (migration continuity)

Column names from migration 010 are retained for continuity. Do not rename. The 4b quantities map as follows:

- `rows_written` carries **R_h**.
- `freeze_loss_suspected` carries **freeze_dispositions_orphaned** (`D − R_h`). Name kept; do not rename.
- `freeze_audit_orphaned` is a **new** column added by migration 011 carrying the second orphan (`R_t − R_h`).
- `write_failures_unrecovered` is **retired** (Fork F-a). Column retained at default 0 by migration 011; no longer populated; no longer read by the monitor. See §8.7.

### §8.4 — Threshold table (canonical)

The monitor evaluates the rules below in this exact order. The first rule whose predicate matches sets the verdict; later rules are not evaluated for that window. "Prior non-degraded run" means the most recent row in `public.section8_runs` whose `verdict` is not `monitor_degraded`.

| # | Predicate | Verdict |
|---|---|---|
| 1 | any of the three durable reads (D, R_h, R_t) fails | `monitor_degraded` |
| 2 | `D == 0` AND `R_t > 0` | `red` (substrate divergence — the disposition write path is dark while audit writes continue) |
| 3 | `freeze_dispositions_orphaned < 0` OR `freeze_audit_orphaned < 0` | `red` (negative residual — substrate bug; events dropping or a non-route.ts writer is producing rows) |
| 4 | `freeze_dispositions_orphaned >= 2` OR `freeze_audit_orphaned >= 2` (single window) | `red` |
| 5 | `freeze_dispositions_orphaned == 1` AND prior non-degraded run had `freeze_loss_suspected == 1` | `red` |
| 6 | `freeze_audit_orphaned == 1` AND prior non-degraded run had `freeze_audit_orphaned == 1` | `red` |
| 7 | `freeze_dispositions_orphaned == 1` OR `freeze_audit_orphaned == 1` (first occurrence on its own chain) | `yellow` |
| 8 | otherwise | `green` |

### §8.5 — Verdict-evaluation ladder (locked-prose constant `SECTION8_N1_VERDICT_LADDER`)

```
1. read D, R_h, R_t over the banded window
2. on any read failure                                         → monitor_degraded ; STOP
3. if D == 0 AND R_t > 0                                       → red (substrate divergence) ; STOP
4. compute freeze_dispositions_orphaned = D - R_h
5. compute freeze_audit_orphaned        = R_t - R_h
6. if either orphan < 0                                        → red (negative residual) ; STOP
7. if either orphan >= 2                                       → red ; STOP
8. fetch prior non-degraded run (single row, window_end desc)
9. if freeze_dispositions_orphaned == 1
       AND prior.freeze_loss_suspected == 1                    → red ; STOP
10. if freeze_audit_orphaned == 1
       AND prior.freeze_audit_orphaned == 1                    → red ; STOP
11. if freeze_dispositions_orphaned == 1
       OR freeze_audit_orphaned == 1                           → yellow ; STOP
12. otherwise                                                  → green
```

The two consecutive-occurrence checks in steps 9 and 10 are independent. A `freeze_dispositions_orphaned == 1` this window plus a `freeze_audit_orphaned == 1` on the prior non-degraded run does **not** escalate either chain. The chains do not cross.

### §8.6 — G-b synchronous-disposition asymmetry

In `app/api/notice/geocode/route.ts`, at each row-writing return (the four row-writing dispositions; see Fork D), the `geocode_dispositions` row is inserted **synchronously**, before `Response.json()` returns, with a 250ms hard timeout and swallow-on-fail emitting `geocode_disposition_sync_write_failure`. The disposition row survives post-response teardown.

The `geocode_audit_log` row remains **deferred** via `after()`. It can be lost to teardown. The Slice 4c §2.8 audit-write-off-user-response principle is preserved exactly for the audit row.

This asymmetry is the design. A lost audit row surfaces as `freeze_dispositions_orphaned >= 1`: the disposition row remains as the teardown-independent reference against which the missing audit row is detected. Without the synchronous disposition write, a teardown that kills both inserts in `after()` produces `D = 0, R_t = 0, R_h = 0` and the window goes vacuously green — the founding freeze-loss case is then invisible. G-b makes it visible.

The 250ms timeout caps the latency cost: the synchronous insert competes for at most a quarter-second on the response path, and a slow or failing Supabase insert is swallowed (the request still returns the resolver verdict). The cost is hard-bounded; the detection capability is unbounded.

### §8.7 — Retirements stated as retired

- **N3** (`dispositions_with_no_row_by_design`) — **retired (Fork D).** Disposition capture is row-writing-only. The four row-writing dispositions get a `geocode_dispositions` row; the non-row-writing dispositions (handled-error and equivalents) get no row by construction. The N3 column in `section8_runs` is retained at default 0 by migration 011; no longer populated; no longer read.
- **wfu** (`write_failures_unrecovered`) — **retired (Fork F-a).** An audit-write failure now surfaces through `freeze_dispositions_orphaned` (audit row absent, disposition row present), identical in monitor-signature to a teardown. The wfu column is retained at default 0 by migration 011; no longer populated; no longer read.
- The `geocode_audit_write_failure` structured-log event **remains** in the route handler. It is an **operator-side leading indicator only** — useful for correlating an observed `freeze_dispositions_orphaned >= 1` to an audit-write-failure root cause vs. a teardown root cause (see §8.10). It is **not** a §8 monitor input and **not** a verdict-evaluation signal.

### §8.8 — Band scope (corrected: applies to all three durable reads)

The +5m band applies to **all three** durable reads (D, R_h, R_t), not only to the audit-rows query. Both sides banded keeps a near-midnight decision's disposition row **and** its audit row in the same window, so neither becomes a phantom orphan.

`decided_at` on both tables is insert-time (`default now()`). A decision made just before `window_end` can have its disposition row land just before the boundary and its audit row land just after (the `after()` defer can push the audit insert past midnight by a few seconds; the synchronous disposition insert lands within the request). Without symmetric banding, that decision produces a phantom `freeze_dispositions_orphaned = 1`. With symmetric +5m on both sides, the audit row lands inside the banded window and the hash join (R_h) catches it.

The +5m tail does not double-count rows across windows: the hash filter on R_h restricts to in-window disposition hashes, so an audit row landing in a band tail is counted toward the window of its disposition row, not the calendar window of its `decided_at`. The +5m is a tail extension on R_t identical to D's and R_h's; midnight-straddle contributions cancel symmetrically across two consecutive windows.

### §8.9 — Substrate (what 4b adds to the schema)

- `public.geocode_dispositions` (migration 011) — durable disposition record. App-INSERT-only RLS wall (Fork H-a) mirroring `geocode_audit_log` verbatim: revoke-all → grant insert to `anon, authenticated` → RLS-on → `policy ... for insert to anon, authenticated with check (true)`. The app (anon role) writes via PostgREST; the monitor (`service_role`, broker-local environment only) reads via RLS bypass.
- `public.section8_runs.freeze_audit_orphaned` (migration 011) — new column carrying the second orphan quantity (`R_t − R_h`).
- `service_role` remains operator-surface-only (standing rail). Never in `app/`, never in CI, never in Vercel runtime env. Broker-local `.env.local` only.

### §8.10 — Investigation procedure

When the monitor produces a non-green verdict, follow the procedure that matches the observed signature.

**`freeze_dispositions_orphaned >= 1`, deploy-correlated** (the run window contains or immediately follows a Vercel deployment):
- Treat as teardown freeze-loss. Vercel torn down the instance mid-`after()`; the audit insert never completed.
- Transient. Expected around deploys. The single-occurrence first-window value is `yellow`; the NF-2 chain catches a second consecutive occurrence on the next run.

**`freeze_dispositions_orphaned >= 1`, NOT deploy-correlated:**
- Cross-reference `geocode_audit_write_failure` operator-log events for the window. If present, an audit-write **failure** (F-a) produced the orphan, not a teardown. Investigate the audit-write path: Supabase availability, RLS policy, schema drift on `geocode_audit_log`.
- If `geocode_audit_write_failure` is absent for the window: either a teardown unrelated to a Vercel deploy (rare; possible on a cold-start instance recycle), or a substrate regression. Inspect the route handler's `after()` block for a regression that throws before the audit insert resolves.

**`freeze_audit_orphaned >= 1`:**
- A synchronous-disposition-write failure produced the orphan: the audit row landed, the disposition row did not. Cross-reference `geocode_disposition_sync_write_failure` operator-log events for the window. Investigate the synchronous-disposition write path: the 250ms timeout firing under load, Supabase contention on `geocode_dispositions`, or RLS policy drift on the disposition table.
- If `geocode_disposition_sync_write_failure` is absent for the window, a non-route.ts code path is writing audit rows (substrate bug). Locate and stop the rogue writer.

**`D == 0 AND R_t > 0`:**
- Substrate divergence. The disposition write path is dark while audit writes continue. Stop; do not interpret further. Investigate route.ts: is the synchronous disposition insert reachable on the response path, is it timing out 100% on the 250ms cap, has migration 011 been applied to the live database.

**Either orphan `< 0`:**
- Negative residual. Either the disposition log is dropping events (a write succeeded but no row landed — RLS or schema regression), or a non-route.ts path is writing rows in one of the two tables. Substrate bug; blocks interpretation until resolved.

Gate-state changes remain broker-authored single-commit PRs. §8 never auto-reverts the gate. A red verdict is a signal for broker investigation, not an automatic rollback trigger.

### §8 read-path query set

Operator hand-queries equivalent to the monitor's PostgREST reads. Schema-qualified, with the +5m band as `::timestamptz + interval '5 minutes'` matching the existing runbook representation. Angle-bracket placeholders.

```sql
-- D: disposition rows in the banded window
select count(*) from public.geocode_dispositions
 where decided_at >= '<window-start-ISO>'
   and decided_at <  '<window-end-ISO>'::timestamptz + interval '5 minutes';
```
```sql
-- R_h: audit rows hash-matched to in-window disposition hashes
select count(*) from public.geocode_audit_log
 where decided_at >= '<window-start-ISO>'
   and decided_at <  '<window-end-ISO>'::timestamptz + interval '5 minutes'
   and decision_input_hash in (
     select decision_input_hash from public.geocode_dispositions
      where decided_at >= '<window-start-ISO>'
        and decided_at <  '<window-end-ISO>'::timestamptz + interval '5 minutes'
   );
```
```sql
-- R_t: total audit rows in the banded window (no hash filter)
select count(*) from public.geocode_audit_log
 where decided_at >= '<window-start-ISO>'
   and decided_at <  '<window-end-ISO>'::timestamptz + interval '5 minutes';
```
```sql
-- prior non-degraded run's two orphan quantities (NF-2 dual-chain lookback)
select freeze_loss_suspected, freeze_audit_orphaned
  from public.section8_runs
 where verdict <> 'monitor_degraded'
 order by window_end desc
 limit 1;
```
```sql
-- review all non-green over N days (retired wfu / N3 columns dropped from the select)
select window_start, window_end, verdict,
       rows_written, freeze_loss_suspected, freeze_audit_orphaned
  from public.section8_runs
 where verdict <> 'green'
   and window_end >= now() - interval '<N> days'
 order by window_end desc;
```
```sql
-- chain that drove a red, back to the last non-degraded verdict
select window_start, window_end, verdict,
       freeze_loss_suspected, freeze_audit_orphaned
  from public.section8_runs
 where window_end <= '<the red row''s window_end>'
 order by window_end desc
 limit 10;
-- read downward to the first non-monitor_degraded row: that is the prior real
-- verdict the predicate used.
```

### §8 recurring run — launchd agent (committed template; broker installs locally)

Daily 03:00 local. No credentials in the plist — the wrapper sources the
broker-local `.env` at runtime (`service_role` + `VERCEL_TOKEN` never enter the
plist; rail-clean). Copy to `~/Library/LaunchAgents/com.ownerpilot.section8monitor.plist`,
edit the two `/Users/YOU/...` paths to your checkout + log location, then
`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ownerpilot.section8monitor.plist`.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ownerpilot.section8monitor</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd /Users/YOU/ownerpilot &amp;&amp; set -a &amp;&amp; source .env.local &amp;&amp; set +a &amp;&amp; exec npx tsx scripts/section8_monitor.ts</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardErrorPath</key>
  <string>/Users/YOU/Library/Logs/ownerpilot-section8monitor.log</string>
  <key>StandardOutPath</key>
  <string>/Users/YOU/Library/Logs/ownerpilot-section8monitor.log</string>
</dict>
</plist>
```
Exit codes captured in the log: `0` green/yellow, `10` red, `20` monitor_degraded, `1` hard error.

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