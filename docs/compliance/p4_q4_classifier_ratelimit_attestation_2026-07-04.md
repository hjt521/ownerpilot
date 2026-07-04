# P4 Q4 — Classifier + Rate-Limit Wiring into /api/chat — Attestation

**Date:** 2026-07-04
**Ruling:** `p4_persona_production_wiring_broker_ruling_2026-07-04` Q4.
**Author:** Engineering (Claude Code), under BROKER STANDING ORDER 2026-07-03 §2 P4.

---

## §1 — Rate-limit (wired)

- **Location:** `app/api/chat/route.ts`, immediately after session load — `getRateLimitStore().registerRequest(session.id, now)` → `decideFromCounts` → on exceed return **HTTP 429** with `Retry-After` + audit log (`evt: chat.rate_limited`, reason, session_id).
- **Store:** `getRateLimitStore()` auto-selects Redis (Upstash/KV env) or a dev in-memory fallback — safe with no env.
- **Config:** the **existing ratified `RATE_LIMITS`** (per-session: burst 5/60s, daily 30, monthly 150k tokens).
- **Failure mode:** store error → log + **degrade open** (chat stays up; abuse protection is best-effort, availability first) — same posture as the classifier's fail-open rule.

### FORK — Q4 recommended limits vs the ratified config (flagged, NOT adopted)
Q4 recommends **per-IP + per-authenticated-user** buckets with different numbers (anon 10/60s·100/24h; auth 60/60s·1000/24h). The as-built rate-limit is **per-session** with attorney/§2.2-ratified numbers (`rateLimitStore.ts` header cites the sign-off). Adopting Q4's numbers/bucketing would **redesign a ratified compliance gate**. Per §4.4 I wired the ratified config (closing the wiring gap the broker identified) and did **not** override the ratified numbers. **Broker to reconcile:** keep the ratified per-session config, or ruling-authorize the per-IP/per-user redesign (Q4 called its numbers "starting values … revise via ruling"). Omnibus §F.

## §2 — Classifier (wired, dark by default)

- **Location:** in the LLM branch, **before** `callPerplexity` — H1 classifier as pre-model middleware.
- **Gating:** runs only when `CLASSIFIER_LIVE` is set (default off) — **no extra model call / latency / cost in prod** until enabled. This matches the existing classifier flag discipline.
- **Behavior:** **log + pass-through** (per Q4 "log and pass through during initial rollout") — classifies the incoming message, logs the verdict (`evt: chat.classifier`, ok/flagged/categories, session_id), never blocks/routes in P4. Routing/rejection is a separate calibration exercise (out of P4 per ruling).
- **Failure mode:** classifier error → log + pass through (never block on classifier outage — the existing fail-open rule).

## §3 — Verification

`tsc --noEmit` clean · `ci:verify-banned-terms` OK · route body-parsing 34 clean · existing `rateLimit.test` + `classifier.test` still green (no regression). No new dependency, no migration. Rate-limit exercises the ratified store/config (already unit-tested); classifier reuses the ratified `runClassifier` (already unit-tested) — the P4 addition is the wiring, verified by tsc + guards + the unchanged upstream suites.

## §4 — 07-10 checklist (omnibus §F)

- **F14 · rate-limit config reconciliation** (§1 fork) — ratified per-session vs Q4 per-IP/user.
- **F15 · `CLASSIFIER_LIVE`** — flip on in Preview when ready to observe classifier logs (dark until then).
- **F16 · rate-limit Redis env** (`KV_REST_API_URL`/`_TOKEN` or Upstash) on Vercel for production-grade atomic limiting (in-memory fallback is dev-only / per-instance).

## §5 — P4 lane status after Q4

Q3 ✅ · Q4 ✅ · Q5 ✅ · Q2 noted. **Remaining to close P4: Q1 T1/T2** — author the lease concept-vocabulary in OwnerPilot's own words (approved concept map), broker countersigns the vocabulary, then it locks into the persona (system-prompt hash re-locked).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P4) + ruling p4_persona_production_wiring_broker_ruling_2026-07-04 Q4 — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code.
