# Incident — Missing production env vars broke service-role DB routes + all crons (Sev-1, RESOLVED)

**Severity:** Sev-1 (per E1 on-call runbook §2 — outage of compliance-facing behaviors: CCPA request intake + acknowledgment; plus operational outage of all scheduled jobs).
**Discovered:** 2026-07-02, during the Fork-D1 live end-to-end test (the intake-400 fix exposed the next layers).
**Status:** RESOLVED 2026-07-02.

---

## §1 — Symptom
After the intake parse fix (incident_2026-07-02_privacy_intake_400), submitting a privacy request returned **500 `supabaseUrl is required.`** Investigation then showed the acknowledgment cron returning **401** on every run.

## §2 — Root cause — three production env vars were never provisioned
Vercel Production/Preview had the **public** Supabase vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) but was **missing** the server-side/service-role set that every service-role route reads:

| Env var | Consumed by | Effect of absence |
|---|---|---|
| `SUPABASE_URL` | privacy-request, privacy-ack-send cron, waitlist, chat/session (magic-link), decision2, notion, mirror/geocode crons | `createClient(undefined,…)` throws `supabaseUrl is required` → 500 |
| `SUPABASE_SERVICE_ROLE_KEY` | same set | no service-role auth → insert/select fail |
| `CRON_SECRET` | all `/api/cron/*` auth check (`Bearer ${CRON_SECRET}`) | Vercel-injected cron header never matched → **401**, cron body never executed |

Per the 2026-07-01 omnibus ruling these were on the operator provisioning checklist ("SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL … CRON_SECRET"), but they never actually landed in Vercel. The public client masked it: the site + auth use `NEXT_PUBLIC_*` and worked, so the gap stayed invisible until a service-role path was exercised live.

**Blast radius (pre-fix, all prod):**
- CCPA request intake (`/api/privacy-request`) — 500, no request ever recorded.
- CCPA acknowledgment cron — 401, no ack ever sent.
- Closed-beta waitlist (`/api/waitlist`) — would 500.
- Magic-link claim / chat session (service-role writes) — would 500.
- **All four crons** (`geocode-audit`, `mirror-queue-depth-check`, `mirror-queue-drain`, `privacy-ack-send`) — 401 every run; none executed their logic in prod.

## §3 — Resolution
Broker added to Vercel **Production + Preview** (§4.13 operator action):
1. `SUPABASE_URL` = the project URL (public, non-sensitive).
2. `SUPABASE_SERVICE_ROLE_KEY` = service-role secret (Sensitive; never in chat).
3. `CRON_SECRET` = freshly generated `openssl rand -hex 32` (Sensitive; never in chat).
Production redeployed to pick up the new env.

**Verification (live, 2026-07-02):**
- Intake: `/privacy-request` submit → "Your request has been received"; row written `status=received`.
- Cron: `privacy-ack-send` manual Run → **200** (prior runs were 401); rows flipped `received→acknowledged` (acknowledged_at `2026-07-03T03:37:47Z`).
- Email: ack delivered from `noreply@ownerpilot.ai`, locked CCPA copy, Reply-To `privacy@ownerpilot.ai`.
- Test rows deleted after verification (DB back to zero).

## §4 — Guard gap + fast-follow (E1 §6)
Prod env-var presence is ops state; no static/CI guard catches it. Detection was the **live D1 path**. Fast-follows:
- Add to the Fork-G soft-launch watch: "privacy intake 4xx/5xx = 0", "cron non-2xx = 0 across all four crons", surfaced via C1 Sentry once `SENTRY_DSN` is set.
- Confirm the other three crons now return 2xx on their next scheduled fire (they were 401 until this fix — watch for any first-run backlog behavior in `mirror-queue-drain`).
- Reconcile the provisioning checklist against a live `vercel env ls` for Production so a "checklist says set" ≠ "actually set" gap can't recur.

## §5 — Standing-rule reinforcement
Same shape as the RESEND and intake-400 Sev-1s: a compliance-facing path is not "done" on green code/CI — it must be exercised against the **real production runtime** once. Env presence, external-service verification, and runtime body-parsing are ops state the code cannot self-attest. Three such gaps were latent behind one form; one live submit surfaced all of them.

---

— Engineering (Claude Code) · Sev-1 incident (missing prod env vars) · 2026-07-02
