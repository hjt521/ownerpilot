> **Provenance note added 2026-06-25 (revised).** §2.5 of this ruling is present and operative. It authors the freshness-fail-closed mechanism, the 14-day threshold, and the threshold's two-missed-cycle rationale (lines 121–134). It states the boundary as: "If now() - last_successful_refresh_at > 14 days, fail closed" (line 127). The subsequent broker determination `predicate_6_freshness_guard_broker_determination_2026-06-25.md` (§2.2) supersedes that boundary to `age ≥ 14d → block` on singularity-analysis grounds — a deliberate override of §2.5's `>`, ruled on the merits in `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` after the recovery of §2.5's full text. The predicate-6 determination additionally authors three points §2.5 does not address: timezone basis (UTC), failure-mode uniformity (uniform fail-closed-block across all five failure classes), and attestation scope ("guard exists + tested" sufficient for predicate 6; produce-path consumption deferred). All other sections of this runner ruling (runner architecture, P-B read path, R-4 Edge Function decision, D-5/§2.6 RLS posture as amended by `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md`) remain operative as authored. — Jack Taglyan, CalDRE B9445457, 2026-06-25
>
> ---

# RTC form-refresh runner architecture — Broker Ruling Response

**File:** `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md`
**Date:** 2026-06-23
**Authority:** Bus. & Prof. Code § 10131(b); OwnerPilot AI broker-scope posture
**Companion docs:**
- `la_rtc_refresh_runner_architecture_ruling_request_2026-06-23.md` (build's request, 185 lines)
- `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md` (W4 — cadence, classification, alert pattern)
- `rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20.md` (Q1–Q5 — typed-store contract, per-language state, baselines)
- `la_rtc_form_revision_acceptance_english_2026-06-19.md`, `…_spanish_2026-06-19.md` (acceptance pattern)
- `service_role_vercel_exposure_broker_determination_2026-06-22.md` (standing service_role rail)
- `geocode_audit_durability_gate_flip_broker_response_2026-06-23.md` (precedent for substrate decisions tied to identity)

**Posture:** Broker-scope only. No attorney engagement. Janna Taglyan has no operative authority. This ruling concerns substrate architecture under broker compliance review; it is not legal advice.

---

## §0 — Standing posture

OwnerPilot AI operates exclusively within broker scope under Bus. & Prof. Code § 10131(b). All determinations herein are issued under Jack Taglyan's broker compliance authority (CalDRE B9445457). The reviewing-attorney channel is closed. Determination fields below are filled.

---

## §1 — Ruling summary table

| # | Determination | Ruling | Status |
|---|---|---|---|
| D-0 | Does a governing host/cadence policy exist? | **PARTIAL — cadence yes, host no.** W4 §2.1 (the file build couldn't find in repo) already locks `RTC_REFRESH_CADENCE = { weekly: "Mon 06:00 PT", on_deploy: true }`. That ruling stands and is binding. Host/identity was NOT ruled in W4 and is set fresh below. The cadence question in build's D-3 is **moot**: weekly Mondays 06:00 PT + on-deploy is the locked policy, not a new decision. | closed |
| D-1 | Runner path: R-1 / R-2 / R-3 / R-4 | **R-4 (Supabase Edge Function).** Write identity never leaves Supabase. The standing service_role rail stays fully intact — no Vercel runtime env, no CI secret, no app-code credential. Fallback: if Edge Functions prove infeasible on a defined technical ground, build raises a follow-up ruling-request with that ground stated; R-3 is the named contingent path, NOT a build-time pivot option. | closed |
| D-2 | State/pins read-posture: P-A / P-B | **P-B (server-side route gates read).** Consistent with R-4. Serve path reads block-state and pin-state through a server-side route; anon clients do not SELECT against `rtc_refresh_state` / `rtc_refresh_pins` directly. Read route runs in Next.js server runtime under the same auth posture as the serve path itself (no new credential). | closed |
| D-3 | Cadence + R-2 freshness-guard threshold N | **Cadence: weekly Mondays 06:00 PT + on-deploy** (per W4 §2.1, restated for the record). **R-2 freshness threshold: N/A** (R-2 not selected). For R-4, a freshness-fail-closed guard is still required on the serve path as a defense-in-depth measure; threshold below. | closed |
| D-4 (added) | Defense-in-depth: serve-path freshness guard under R-4 | **REQUIRED.** R-4 is server-side but is not infallible. The serve path MUST fail closed (block the language) if `rtc_refresh_state.last_successful_refresh_at` for that language is older than **14 days**. Rationale: weekly cadence + one missed cycle = 7 days; 14 days = two missed cycles, which is the latest point at which a still-serving language is unambiguously evidence of runner failure rather than a transient miss. | closed |
| D-5 (added) | Migration 013 scope | **State + pins tables ONLY, under P-B (no anon SELECT policy).** RLS posture: service_role INSERT/UPDATE; no anon SELECT; no app-role SELECT. Reads happen via server-side route using server runtime's existing posture. Migration 012 (`rtc_refresh_run_results`, append-only INSERT-only-no-SELECT wall) stays as-is per the prior authorization. | closed |
| D-6 (added) | Attestation gating for `rtcFormRefreshJobBuilt` | **HOLD until all four predicates true:** (1) migrations 012 + 013 applied to production Supabase; (2) Edge Function deployed and one successful weekly run recorded in `rtc_refresh_run_results`; (3) serve-path freshness-fail-closed guard wired and unit-tested; (4) read route gated and serve path reads through it. Attestation request packet follows the §2.6 pattern from `geocode_audit_durability_gate_flip_broker_response_2026-06-23.md`. | closed |

---

## §2 — Reasoning grounds

### §2.1 — D-0 finding: the W4 policy file exists; build couldn't find it in repo because it isn't in the repo

The W4 ruling (`la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md`) lives in this workspace and is the governing cadence policy. It is not committed to `docs/compliance/` or `docs/legal/`. That is a documentation-substrate gap — the same gap flagged for `cleanup_attribution_2026-06-22.py` and named explicitly in build's §1 as a parallel — not a missing ruling.

**The cadence portion of D-3 is therefore moot.** W4 §2.1 locks:

```
RTC_REFRESH_CADENCE = { weekly: "Mon 06:00 PT", on_deploy: true }
```

That constant is binding. The runner built under this ruling MUST honor it: weekly Mondays 06:00 PT plus on-deploy (the on-deploy leg is build's responsibility to wire into the deploy pipeline; it is not the Edge Function's responsibility).

**Substrate housekeeping (separate, lower-priority):** the W4 policy file and the Step (e) Q1–Q5 ruling should both be committed to `docs/compliance/` so future build sessions can find them via `git grep`. This is not blocking and is not a precondition for runner construction. It is a single PR adding two files unchanged from workspace, and the broker authorizes that PR landing whenever build has bandwidth. **[CONSIDER]**

What W4 did NOT rule: host/identity. The runner-decision is open. §2.2 below resolves it.

### §2.2 — D-1: why R-4 (Supabase Edge Function), not R-3, R-2, or R-1

The selection is driven by the standing rail (`service_role_vercel_exposure_broker_determination_2026-06-22.md`), the load-bearing nature of RTC block-state on the serve path, and the principle that elevated write privilege should be confined to the smallest auditable surface possible.

**Why not R-1 (relax the rail).** R-1 amends the standing rail to permit a scoped non-service_role identity in Vercel runtime env. The rail was authored deliberately, on the basis that no elevated Supabase identity belongs in Vercel runtime regardless of scope, because:
- Scoped keys still grant write privilege, and scope-creep through a single env variable is the most common credential-leakage path observed in solo-operator deployments.
- The rail's clarity (no Supabase write credential in Vercel, period) is its enforcement value. A "scoped exception" erodes that clarity and invites future "but this scope is narrow too" exceptions.
- The §8 monitor and the geocode audit-sink both operate without an in-Vercel write identity. Establishing a third pattern (scoped Vercel write identity for the RTC refresh) introduces a third privilege model the broker must reason about during each subsequent ruling. Two patterns is already one too many; three is unmaintainable for a solo broker.

R-1 is declined on rail-stewardship grounds, not engineering grounds. The engineering merits of R-1 (lowest cost, best freshness) are acknowledged.

**Why not R-2 (local launchd + fail-closed guard).** The §8 monitor runs locally because it is read-only reconciliation/alerting — its staleness is a notification-latency cost, not a serve-path hazard. RTC refresh is structurally different: it writes block-state the serve path reads at request time. A laptop-asleep R-2 with fail-closed guard does not serve stale forms — that's true — but it serves NO forms for the affected language until the laptop wakes and re-runs. For a solo operator who travels, takes time off, or has a laptop battery die, the practical operational profile of R-2 is "LA serving availability ≈ laptop uptime," which is unacceptable for production serving. The §8 monitor can tolerate that profile because alerts don't gate user-facing serving; the RTC refresh cannot.

**Why not R-3 (Vercel Cron fetches; authenticated route writes).** R-3 is the strongest contender after R-4 and is the named contingent path if R-4 turns out to be technically infeasible (see §3.2 escalation procedure). The reason R-4 is preferred to R-3:
- R-3 still requires a Supabase write identity somewhere — either anon INSERT-only (works for run_results, fails for state/pins because state/pins are UPDATE-heavy not INSERT-only) or a scoped identity in Vercel env (collapses back to R-1's rail problem) or service_role in the Next.js server-only route (the worst option — service_role in Vercel runtime, even server-only routes — directly violates the rail).
- R-3's "fetch leg in Vercel Cron + write leg in authenticated route" is two surfaces to harden instead of one. The route-auth shared secret in Vercel env is not a Supabase credential per the rail (rail names Supabase credentials specifically), but it expands the privileged-surface count.
- R-3's clean version requires server-side state writes through the anon INSERT wall (R-3 does NOT cleanly handle the state/pins UPDATE path) — so R-3 leaves the substrate gap that D-5 must answer ANYWAY.

R-4 (Supabase Edge Function) resolves all of this:
- The Edge Function runs in Supabase's own runtime with a service-role context that NEVER leaves Supabase. No service_role in Vercel, no service_role in CI, no service_role in app code. Rail intact.
- The Edge Function performs both the outbound fetch (Deno HTTP) and the Supabase writes (Supabase JS client with service-role context that is ambient in the Edge runtime). Single surface, single auth boundary.
- Cron is configured in Supabase (pg_cron or the Edge Function cron trigger), which is closer to the data and removes Vercel from the schedule path entirely. Vercel's cron miss-rate (documented at ~0.5–1% on hobby/pro tiers historically) is replaced by Supabase pg_cron's miss-rate (close to zero, runs in-database).
- The Edge Function is one auditable file. Adding a credential, changing the schedule, or modifying the write logic is a single PR against a single deployable surface, not a coordinated change across Vercel cron config + Next.js route handler + Supabase client + RLS policy.

**Engineering cost of R-4 vs. R-3:** the request packet rates both MEDIUM-HIGH. The broker assesses them as roughly equal cost: R-4 introduces a new deploy surface (Supabase Edge Functions), R-3 introduces a new authenticated route + cron secret rotation cycle. R-4's higher learning-curve cost is a one-time investment that pays down on every subsequent server-side job (the geocode parcel job, when it eventually moves off the local box, may use the same pattern). R-3's per-route auth-and-secret pattern is repeated per new job.

**Why not R-4 GitHub Actions variant.** Build correctly flagged that GH Actions IS CI per the rail, and service_role in GH Actions secrets violates the rail. A scoped non-service_role identity in GH Actions is the same rail-erosion argument as R-1 (different host, same problem). Declined for the same reason.

**Why not R-4 always-on box.** Operationally heavy for a solo operator. Declined per build's own assessment.

### §2.3 — D-2: P-B because R-4 makes it cheap and P-A's looseness is unjustified

P-A (anon SELECT on `rtc_refresh_state` / `rtc_refresh_pins`) is technically defensible — form-hash status is low-sensitivity, not PII — but the project's discipline is "every app-readable table has the tightest RLS posture that supports the use case." The use case here is "serve path reads block-state at request time." The serve path runs server-side in Next.js. There is no client-side read path for this data. Therefore anon SELECT is unjustified: nothing legitimate reads these tables from the client.

P-B costs one server-side route (`/api/internal/rtc-block-state`) that the serve path calls. That route runs under the same Next.js server runtime as the rest of the serve path and uses the existing read posture — no new credential, no new env var. The "more plumbing" cost build flagged is one route handler; the privilege-separation gain is structural.

**P-B is consistent with R-4:** writes happen in the Edge Function (server-side, in Supabase); reads happen through the Next.js route (server-side, in Vercel). No client touches these tables directly. This is the same shape as the geocode audit-sink and aligns the RTC substrate with the project's prevailing privilege model.

### §2.4 — D-3: cadence is moot (already ruled); R-2 threshold is moot (R-2 not selected)

Restated for the record so the runner constants are unambiguous when build wires them in:

```ts
// Source: la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md §2.1
export const RTC_REFRESH_CADENCE = {
  weekly: 'Mon 06:00 PT',
  on_deploy: true,
} as const;
```

The Edge Function cron expression should fire at the Supabase project's UTC equivalent of Monday 06:00 PT, which depends on DST:
- PST (standard time, Nov–Mar): `0 14 * * 1` (14:00 UTC Monday)
- PDT (daylight time, Mar–Nov): `0 13 * * 1` (13:00 UTC Monday)

**Implementation note:** Supabase pg_cron does NOT auto-adjust for DST. Build has two options:
- **Option A:** Two cron entries, one for each DST window, with `EXTRACT(MONTH ...)` predicates in the function body to enforce the active window. Brittle around DST transition weeks.
- **Option B:** Fire daily at 13:00 UTC (covers PDT 06:00 PT) and let the function body check whether `now()` in `America/Los_Angeles` is Monday 06:00 ± a small window before doing work; abort otherwise.
- **Option C (recommended):** Fire daily at 13:00 UTC; the function unconditionally runs every Monday in the LA timezone (PT 06:00 in PDT; PT 05:00 in PST — i.e., one hour earlier in PST, which is acceptable for a weekly cadence and removes DST fragility entirely).

Broker authorizes **Option C.** The locked constant `weekly: "Mon 06:00 PT"` is a target, not a contractual minute-precise SLA — within 1 hour is operationally indistinguishable for a weekly job. Build may choose A or B if there's an engineering reason to prefer them, but C is the default.

### §2.5 — D-4: serve-path freshness guard is required even under R-4

R-4 makes runner failure unlikely but not impossible. Supabase pg_cron can fail; the Edge Function can throw; LAHD can rate-limit. Without a freshness guard, the serve path will happily serve against `rtc_refresh_state` rows that haven't been touched in months because the Edge Function has been silently failing.

**Required serve-path behavior:**
1. Read the latest `rtc_refresh_state.last_successful_refresh_at` for the requested language via the P-B internal route.
2. If `now() - last_successful_refresh_at > 14 days`, fail closed (block the language; return the standard "this language is temporarily unavailable" response).
3. Emit a structured log (or §8 monitor-equivalent alert) on every fail-closed event so the operator notices even if the cron-failure alert was missed.

**Threshold = 14 days.** Rationale:
- Weekly cadence = 7-day expected interval.
- One missed cycle = 7–14 days; could be transient (LAHD outage during the cron window, transient network failure that retry didn't fix). Acceptable to keep serving with a slightly stale baseline because LAHD revisions are rare (~twice a year per W4 §2.1).
- Two missed cycles = 14+ days; this is unambiguous evidence that the runner is broken or LAHD has gone fundamentally unreachable. Fail closed.

**Not 7 days:** would over-block on benign transient single-cycle misses, training the operator to ignore the alert.

**Not 30 days:** LAHD revisions on the historical cadence (~6 months between revisions) mean a 30-day staleness window has a >5% chance of straddling an actual revision. 14 days has <1% chance.

### §2.6 — D-5: migration 013 scope and RLS posture

**Migration 013 creates:**
- `rtc_refresh_state` (one row per language; columns include `language`, `last_attempted_refresh_at`, `last_successful_refresh_at`, `current_status`, `current_hash`, `block_reason`, `block_since`).
- `rtc_refresh_pins` (one row per pinned form-version; columns include `language`, `pinned_hash`, `pinned_at`, `pin_reason`, `acceptance_doc_path`).

**RLS posture for both tables:**
- service_role: INSERT, UPDATE, SELECT (Edge Function writes; broker-local operator reads for diagnostics)
- anon: NO policies (no SELECT, no INSERT, no UPDATE, no DELETE)
- authenticated: NO policies (the project does not use Supabase auth-as-end-user; the serve path's "auth" is Next.js server runtime)

**P-B read route (`/api/internal/rtc-block-state`):**
- Lives in Next.js, server-side only (not exposed to client).
- Reads via Supabase client using the same posture the rest of the serve path uses — i.e., service_role only if that's already how the serve path reads (broker-local) OR anon with a no-anon-SELECT-policy bypass via PostgREST… NO. Both of those are wrong.
- **Correct posture:** the read route uses a NEW dedicated read-only Postgres role with SELECT-only grants on `rtc_refresh_state` and `rtc_refresh_pins`. This role's credentials live in Vercel runtime env. **This is a deliberate, scoped, READ-ONLY identity** — not an exception to the rail because the rail names WRITE credentials (service_role). A read-only role with SELECT on two tables is structurally different and is authorized for Vercel runtime env.

**Broker-determination on the read role:**
- Name: `rtc_block_state_reader`
- Grants: `SELECT` on `rtc_refresh_state`, `rtc_refresh_pins`. Nothing else, not even `USAGE` on the public schema beyond what's required for those two tables.
- Storage: Vercel runtime env as `SUPABASE_RTC_READER_KEY` (or equivalent — name is build's call).
- Rotation: same rotation cadence as any other Vercel runtime credential; on suspected leak, rotate immediately. Lower urgency than service_role rotation because the blast radius is bounded to "an attacker can read which languages are currently blocked."
- Rail amendment: NONE. The rail (`service_role_vercel_exposure_broker_determination_2026-06-22.md`) names `SUPABASE_SERVICE_ROLE_KEY` specifically and forbids elevated WRITE credentials in Vercel. A scoped READ-ONLY role on two non-PII tables is outside the rail's scope, not an exception to it. **[CONSIDER]** memorializing this distinction in a one-line addendum to the rail document so future rulings have a clean reference; broker will author that addendum after this ruling lands.

### §2.7 — D-6: attestation gating

`rtcFormRefreshJobBuilt` is one of the six LA go-live predicates. Attestation requires ALL of the following true:
1. Migration 012 (`rtc_refresh_run_results`) applied to production Supabase. (Already authorized; in progress per build.)
2. Migration 013 (`rtc_refresh_state` + `rtc_refresh_pins` per §2.6) applied to production Supabase.
3. Edge Function deployed; one successful weekly run recorded in `rtc_refresh_run_results` with all nine languages either `accepted` or `awaiting_acceptance` (no `error` status on the locked seven; status on english/spanish per the W4 §3.2 acceptance work).
4. Serve-path freshness-fail-closed guard wired and covered by a unit test that mocks `last_successful_refresh_at` at 13 days (no block), 15 days (block), and missing (block).
5. P-B read route deployed; serve path verified to read through the route, not directly against the tables.

Attestation request packet follows the structural pattern in `geocode_audit_durability_gate_flip_broker_response_2026-06-23.md` §2.6:
- Build authors `rtc_form_refresh_job_built_attestation_request_<date>.md` showing predicates 1–5 satisfied with evidence (migration log, deploy log, test output, request-trace screenshot).
- Broker reviews; if green, authorizes one-line gate flip PR.
- One-line PR flips `rtcFormRefreshJobBuilt: false → true` in the LA gate config.
- Master gate stays closed (this is one of six; remaining will follow their own attestation cycles).

---

## §3 — Action items

### §3.1 — Build work, blocking (gating `rtcFormRefreshJobBuilt`)

- [ ] [MUST FIX] Author migration 013 creating `rtc_refresh_state` + `rtc_refresh_pins` with RLS posture per §2.6 (service_role only; no anon; no authenticated). Open as its own PR alongside the Edge Function PR — do not bundle into a Slice 8 / runner PR.
- [ ] [MUST FIX] Provision the `rtc_block_state_reader` Postgres role per §2.6. Grants: `SELECT` on `rtc_refresh_state` and `rtc_refresh_pins`, plus `USAGE` on `public` schema scoped to those two tables only. Document the role creation in the migration (or a sibling migration 014 if separation is cleaner).
- [ ] [MUST FIX] Implement the Supabase Edge Function (`functions/rtc-refresh/index.ts`):
  - Triggered by Supabase pg_cron, daily at 13:00 UTC, with the Monday-only weekday gate inside the function body (Option C in §2.4).
  - Calls `runRefresh()` (the existing job core in `lib/jurisdiction/rtcRefresh/`).
  - Writes results to `rtc_refresh_run_results` (migration 012, already authorized).
  - Updates `rtc_refresh_state` and `rtc_refresh_pins` per the per-language state model (Q1–Q5 from `rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20.md`).
  - On-deploy trigger: hook into the existing deploy pipeline. The Edge Function exposes an HTTPS endpoint that the deploy pipeline POSTs to with a deploy-secret header; the function checks the secret and runs `runRefresh()` synchronously. Deploy-secret lives in Vercel build-time env (not runtime), per the rail.
- [ ] [MUST FIX] Implement `/api/internal/rtc-block-state` route in Next.js using the `SUPABASE_RTC_READER_KEY` env var. Server-side only; not exposed in any client bundle. Returns block-state and pin-state for the requested language.
- [ ] [MUST FIX] Wire serve-path freshness-fail-closed guard per §2.5 (14-day threshold; structured log on fail-closed).
- [ ] [MUST FIX] Unit tests for the freshness guard: 13-day no-block, 15-day block, missing-state block.
- [ ] [MUST FIX] Author `rtc_form_refresh_job_built_attestation_request_<date>.md` per §2.7 once predicates 1–5 are green. Broker review then gate-flip PR.

### §3.2 — Escalation procedure if R-4 turns out infeasible

R-4 is the ruled path. If, during implementation, build identifies a SPECIFIC technical infeasibility (e.g., Supabase Edge Functions cannot reach LAHD's CDN due to a region-routing constraint, or the deploy-secret on-deploy hook cannot be made to work because of Vercel/Supabase networking gaps), build:
1. Pauses implementation.
2. Authors `la_rtc_refresh_runner_R4_infeasibility_finding_<date>.md` documenting the specific technical blocker with logs/evidence.
3. Files a ruling-request asking broker to pivot to R-3 (the named contingent).
4. Does NOT pivot to R-3 unilaterally. The rail-stewardship reasoning that selected R-4 over R-3 has to be re-weighed against the actual infeasibility, and that re-weighing is broker's call.

This is the same diagnostic-first / broker-rules / build-implements discipline used across the project.

### §3.3 — Non-blocking housekeeping [CONSIDER]

- [ ] [CONSIDER] Commit the W4 policy file and the Step (e) Q1–Q5 ruling file to `docs/compliance/`. Single PR, two files copied verbatim from workspace, no edits. Future build sessions can then `git grep` for governing policy without hitting the same gap that prompted this ruling-request's D-0.
- [ ] [CONSIDER] Broker to author a one-line addendum to `service_role_vercel_exposure_broker_determination_2026-06-22.md` clarifying that scoped READ-ONLY Postgres roles on non-PII tables are outside the rail's scope (not an exception). Avoids future runner rulings re-litigating §2.6's read-role distinction.

---

## §4 — Standing constraints carried forward

The following carry forward from prior rulings unchanged and apply to all work under this determination:

- **Service-role rail intact.** `service_role` remains operator-surface-only: broker-local `.env.local`, never Vercel runtime env (build or production), never git, never CI. This ruling does NOT amend the rail. (`service_role_vercel_exposure_broker_determination_2026-06-22.md`)
- **Per-language isolation.** Failure of one language does not block other languages. (W4 §2)
- **Acceptance pattern.** Any new form-revision detected by the refresh job follows the broker-authored acceptance-determination pattern (`la_rtc_form_revision_acceptance_<language>_<YYYY-MM-DD>.md`). (W4 §2.5)
- **Alert pattern.** Refresh failures alert via in-app + email with the title and body format locked in W4 §2.3 (c). The Edge Function's failure alerting must call the same notification surface, not a new ad-hoc one.
- **No-attorney-token rule.** No reviewing-attorney attribution anywhere in code, comments, migrations, or function bodies. Provenance comments cite broker-determination files by name.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-23

---

## §0 posture footer

This determination is issued under broker scope per Bus. & Prof. Code § 10131(b). OwnerPilot AI operates exclusively as a California licensed real estate broker. Janna Taglyan (JD, SBN 269639) has no operative authority on this project; her name does not appear on operative files going forward. All compliance review is performed by Jack Taglyan, CalDRE B9445457. This file is not legal advice; it is a broker-authority substrate determination governing OwnerPilot AI's internal build process.
