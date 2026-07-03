# Fork B2 — Closed-Beta Enablement Runbook (broker-facing)

**Scope:** Turn on the closed-beta gate. All B2 **code** already shipped (omnibus #133): `lib/beta/allowlist.ts`, `/waitlist` page, `/api/waitlist` route, `supabase/migrations/037_waitlist_signups.sql`, and the gate in `app/api/magic-link/request/route.ts`. This runbook is **enablement only** — broker-executed ops (§4.13). Engineering advises; broker executes prod DB + env.

**Current prod state (verified 2026-07-02):** `waitlist_signups` table **does not exist** (037 not applied); `BETA_ALLOWLIST` **unset** (gate defaults CLOSED). No active breakage — magic-link requests for any email return a benign 200 pointing to the waitlist (no token, no email, no DB write). The only path needing the table is the **waitlist form submit**.

---

## §1 — Ordering rule (firm)
**Apply migration 037 BEFORE directing any traffic to `/waitlist`.** The `/api/waitlist` insert targets `waitlist_signups`; without the table it 500s. 037 is additive + idempotent (`create table if not exists`), so applying it early is safe and reversible (`drop table public.waitlist_signups;`).

## §2 — Steps (in order)

**Step 1 — Apply migration 037 (broker, Supabase Studio → SQL Editor).** Paste and run:
```sql
create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  city       text,
  source     text not null default 'waitlist_page',
  created_at timestamptz not null default now()
);
alter table public.waitlist_signups enable row level security;
create policy waitlist_signups_service_role on public.waitlist_signups
  for all to service_role using (true) with check (true);
```
Verify: `select to_regclass('public.waitlist_signups');` returns the table (not null). No public/anon policy — broker-only, read via Studio.

**Step 2 — Set `BETA_ALLOWLIST` (broker, Vercel → Environment Variables).**
- Key: `BETA_ALLOWLIST`
- Value: comma-separated beta emails (case/space-insensitive), e.g. `owner1@example.com, owner2@example.com`. **Broker input required** — this is the closed-beta invite list.
- Environments: **Production** (+ Preview if you want the gate testable there). Not secret, but no harm marking Sensitive.
- Leave `BETA_OPEN` **unset** (only `BETA_OPEN=true` at the GA transition / F2 exit opens the gate to everyone).

**Step 3 — Redeploy** Production (Deployments → latest → ⋯ → Redeploy) so the env binds.

## §3 — Verification (post-deploy)
1. **Allowlisted email** → request a claim link → receives the claim email (200 + email sent). Confirms gate-open path + (bonus) the email-send monitor tags `template:claim`.
2. **Non-allowlisted email** → request a claim link → 200, **no** email, UI points to `/waitlist`. (Same 200 shape both ways — membership is not revealed by status.)
3. **Waitlist submit** → go to `/waitlist`, submit a test email → a row lands in `public.waitlist_signups` (check in Studio).
4. **Cleanup** → engineering deletes the test waitlist row(s) by id after verification (as with the D1 test rows).

## §4 — External-service preconditions (rule 14)
| Precondition | Verification | Status |
|---|---|---|
| `waitlist_signups` exists in prod (037 applied) | `select to_regclass('public.waitlist_signups')` not null | ⏳ Step 1 |
| `BETA_ALLOWLIST` set on Vercel Production | Env list shows the key | ⏳ Step 2 |
| Service-role env present (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) | Already fixed 2026-07-02 (env-vars Sev-1) | ✅ |

## §5 — Notes
- Gate covers the **only** persistence path (magic-link claim). Anonymous chat/RiskPath still works ungated; B2 gates who can *claim/persist*.
- F2 exit (GA transition) flips `BETA_OPEN=true`; the allowlist becomes moot at that point.

---

— Engineering (Claude Code) · Fork B2 enablement runbook · 2026-07-02
