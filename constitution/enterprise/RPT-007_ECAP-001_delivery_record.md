---
constitutional_id: RPT-007
object_type: report
title: ECAP-001 AI Assistant — PROC-100 Delivery Record
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [ECAP-001, PROC-100, EA-100]
required_by: []
implements: [PROC-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [ECAP-001, RPT-006]
registry_tags: [delivery-record, ecap-001, ai-assistant]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/RPT-007_ECAP-001_delivery_record.md
checksum_scope: file
---

# RPT-007 — ECAP-001 AI Assistant · PROC-100 Delivery Record

Completes ECAP-001 through the PROC-100 ten-stage lifecycle. The capability was **already implemented** in the OwnerPilot application; this record documents stages 1–5 as satisfied by the existing code and executes stages 6–10 under governance. No business logic was changed by this delivery beyond the additive monitoring shipped in PR #265 and #266.

## Implementing artifacts (real)
`app/chat`, `app/api/chat` (`route.ts`), `lib/chat/*` (persona, orchestrate, perplexityClient, classifier, guards, rateLimit, session, refusalBank, runtimeBannedTermGate, scriptedOrchestrate…), `lib/flow/*`, `lib/intake/*`, `lib/safety/*` (captcha, denylist). Persistence: `public.chat_sessions`.

## Stages 1–5 (satisfied by existing implementation)
1. **Product Requirements** — AI-first intake/guidance for CA property owners (50+, mobile); locked persona; never gives legal advice; routes to review/produce. 2. **Functional Spec** — one-turn orchestration (load/create session → persona+history+message → model → applyTurn → persist → reply/refusal/route). 3. **Technical Architecture** — Next route + `lib/chat` orchestrator + Perplexity client; deterministic scripted-capture sub-flow; classifier middleware (dark by default). 4. **Data Model** — `chat_sessions` (transcript, intake_state, typed FF-3 columns, retention_class/legal_hold/soft_deleted_at/expires_at). 5. **Runtime Integration** — `POST /api/chat`; cookie `op_chat_token` (anon_token_hash); FF-3 telemetry seam (flag-gated).

## Stage 6 — Security Review (executed 2026-07-24, evidence-based)
Verified against prod:
- **RLS:** `chat_sessions` RLS **enabled**; policies `owner_select`/`owner_update` with `qual = (auth.uid() = user_id)`. Anon (`auth.uid()` null) matches **no rows** → pre-claim transcripts are **not** exposed via the Data API. No INSERT/DELETE policy → those are RLS-denied for anon/authenticated; the app writes via `service_role` (bypasses RLS by design). **PASS.**
- **PII handling:** transcripts/intake are PII; retention (`retention_class`, `expires_at`), `legal_hold`, and `soft_deleted_at` columns present (retention-aware). Monitoring additions are **PII-scrubbed** via the A15 denylist and no-op unless enabled. **PASS.**
- **Abuse/output controls:** new-session CAPTCHA gate (Turnstile, fail-closed when configured); per-session rate limit (429); `runtimeBannedTermGate` fail-closed on all model output (IP/legal-language wall); `anon_token_hash` stored, never the raw token. **PASS.**
- **Secrets:** all keys via env; `service_role` server-only. **PASS** (note: `SUPABASE_SERVICE_ROLE_KEY` rotation is a tracked ops item, unrelated to this capability's code).
- **Observation (least-privilege, low, not a vulnerability):** anon/authenticated hold broad table grants on `chat_sessions` (INSERT/SELECT/UPDATE/DELETE/TRUNCATE) — a side-effect of Data API "Automatically expose new tables" being ON. RLS already neutralizes them (grant without matching policy = denied). Recommend revoking the unused grants as defense-in-depth, and disabling auto-expose (ties to the P1 adjacent observation). **Deferred, Founder/ops call — no live exposure.**

## Stage 8 — Testing
Extensive `lib/chat`/`lib/flow`/`lib/intake`/`lib/safety` unit coverage (dozens of `tsx` specs: guards, classifier, scriptedOrchestrate, rateLimit, captcha, produce-gate, etc.); the route path is exercised by the Playwright E2E suite (chat + FF-3 flows). The route handler itself is thin orchestration over tested libs; the monitoring additions are covered by `lib/monitoring` no-bypass/scrub tests. **Adequate; no new gap requiring a test in this delivery.**

## Stage 9 — Constitutional Validation
`node constitution/tools/cbs.mjs check` green; ECAP-001 metadata current (`implementing_artifacts`, `runtime_bindings`, `capability_class: enterprise`, governed_by EA-100); registered in `capability_index.json`. CA-001 evidence = this record + the generated indexes.

## Stage 10 — Release (under governance)
ECAP-001 `operational_maturity: operational`, `delivery_stage: released`. Monitoring shipped (#265, #266). Capability remains governed by EA-100 / registered in REG-CAP-001; no constitutional redesign required.

## Outcome
**ECAP-001 is delivered through PROC-100** — production, runtime-validated (monitoring across all 5 chat error exits), security-reviewed, governed. One deferred least-privilege observation logged for ops. First Wave-1 stream complete.
