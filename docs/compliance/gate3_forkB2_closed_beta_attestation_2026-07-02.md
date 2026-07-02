# Fork B2 — Closed-Beta Allowlist + Waitlist — Build Attestation

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (B2) + §9 return-trip discipline.
**By:** Claude Code (engineering), 2026-07-02. Repo HEAD `main` (post-#132).

---

## §0 — §9 recon
No existing beta/allowlist/waitlist code (grep clean). Entry point for access is `app/api/magic-link/request` (email → claim link) — the correct gate location. No as-built contradiction (§9(d) clear).

## §1 — What shipped
- **`lib/beta/allowlist.ts`** (+ test, 5/5) — `isBetaAllowlisted(email)`: `BETA_ALLOWLIST` (comma-sep, case/space-insensitive), `BETA_OPEN=true` opens the gate (GA transition / F2 exit). **Default closed.**
- **Gate in `app/api/magic-link/request/route.ts`** — non-allowlisted email → `{ ok: true, waitlisted: true }` (no token, no email). Same 200 shape so allowlist membership isn't leaked by the status code.
- **`app/waitlist/page.tsx` + `components/waitlist/WaitlistForm.tsx`** — waitlist landing honoring CLAUDE.md (credentials via `TrustStrip` above the fold, 16px body, 48px input/CTA, one primary CTA, plain-English states).
- **`app/api/waitlist/route.ts`** — service-role upsert into `waitlist_signups` (dedupe on email; no PII beyond the volunteered email).
- **`supabase/migrations/037_waitlist_signups.sql`** — broker-only table (service role; no public read).
- **`.env.example`** — `BETA_ALLOWLIST`, `BETA_OPEN`.

## §2 — ⚠️ Merge-ordering (this PR is NOT a silent no-op, unlike C1/D1)
Merging B2 to `main`→prod **flips the app to closed-beta immediately**: with `BETA_ALLOWLIST` unset, **every** magic-link request is routed to the waitlist (nobody receives a claim link). And `/api/waitlist` **500s until migration 037 is applied**. So the broker should sequence:
1. **Apply migration 037** to prod (waitlist capture works) — §4.13 broker action (Studio SQL Editor, like 034–036).
2. **Set `BETA_ALLOWLIST`** on Vercel prod (beta emails) so allowlisted owners still get links — §4.13 broker action.
Do both **at or before** the merge/deploy. (Ledger note: apply as a dashboard SQL run, then record in `schema_migrations` per the ledger-repair pattern.) This is a deliberate behavior change (closing the beta is the point of B2), flagged so it's sequenced, not surprising.

## §3 — Verification
| Check | Result |
|---|---|
| `lib/beta/__tests__/allowlist.test.ts` | ✓ 5/5 |
| `tsc --noEmit` (page + form + routes) | ✓ exit 0 |
| `verify-banned-terms` (new owner-facing copy) | ✓ |
| `verify-fetch-binding` (new client fetch) | ✓ 239 files |
| `verify-no-operator-secrets` / `verify-locked-prose` / `verify-e2e-seed-guard` | ✓ |

## §4 — Standing-pattern conformance
Env-gated (like SENTRY_DSN / E2E flags); trust credentials reused from the shared `TrustStrip`; broker-only capture table; SSOT allowlist constant in `lib/beta/allowlist.ts`.

---

— Engineering (Claude Code) · Fork B2 closed-beta build · 2026-07-02
