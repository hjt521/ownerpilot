# Gate-3 Omnibus — C1-followthrough §3.10 (Broker checklist admin page) — Build Attestation

**Re:** omnibus §3.10 — persistent broker-side compliance checklist tracked by the platform (migration 039).
**By:** Claude Code (engineering), 2026-07-03.

---

## §1 — Scope satisfied
- **Migration 039 `broker_compliance_actions`** (`supabase/migrations/039_broker_compliance_actions.sql`): `id, action_key (unique), completed_at, completed_by, evidence_path, updated_at`. RLS enabled with **no policy** → deny to anon/authenticated; all access is service-role via the admin-gated API.
- **Admin gate** `lib/admin/isAdmin.ts`: `ADMIN_EMAILS` allowlist (comma-separated, case/space-insensitive; default closed) checked against the authenticated Supabase user's email. `currentAdmin()` resolves `{ email, isAdmin }`.
- **Checklist definition + loader** `lib/admin/brokerChecklist.ts`: code-defined `CHECKLIST_ACTIONS` seeded with the three C1 Sentry org toggles (`sentry_data_scrubber`, `sentry_scrub_ip`, `sentry_screenshots`); `loadChecklist` merges defs with persisted state.
- **API** `app/api/admin/broker-checklist/route.ts`: admin-gated GET (list) + POST (mark complete/incomplete with evidence pointer; upsert on `action_key`). Reads the body via the shared `readRequestBody` (passes `route-body-parsing-lock`). Non-admin → 403.
- **Page** `app/admin/broker-checklist/page.tsx` (+ `BrokerChecklistClient.tsx`): server-gated by `currentAdmin()` — non-admin/signed-out gets **404** (`notFound`, not discoverable). Admin sees the actions with completion state + an evidence field.
- **.env.example**: `ADMIN_EMAILS` documented.

## §2 — Verification
- `tsc --noEmit` → 0.
- `route-body-parsing-lock` guard → clean (32 routes; the new admin route uses `readRequestBody`).
- Gate posture: `ADMIN_EMAILS` default-closed (empty → nobody admin); RLS-on-no-policy denies direct table access; page returns 404 to non-admins.

## §3 — Deviations / notes (§4.2)
- **Evidence is a pointer, not a file upload.** `evidence_path` stores a screenshot filename or URL (matches the schema + omnibus wording "evidence_path"). True file-upload-to-storage (Supabase Storage bucket + signed URLs) is a heavier follow-up; the pointer satisfies the C1 evidence-packet paper trail now.
- **Admin gate is `ADMIN_EMAILS`** (engineering call — no prior admin-role concept existed; the only broker surface was token-based broker-confirm). Standard authenticated-email allowlist, default-closed.

## §4 — Broker actions (§4.13)
- Apply **migration 039** in Supabase Studio (Preview → Prod).
- Set **`ADMIN_EMAILS`** on Vercel Production (e.g. `jack@ownerpilot.ai`) so the page is accessible — until set, `/admin/broker-checklist` returns 404 to everyone (safe default).
- Then sign in and check off the three Sentry actions with evidence pointers — this is where the C1 §4.1 Data Scrubber / Scrub IP toggles get tracked as platform state instead of paper.

---

— Engineering (Claude Code) · C1-followthrough §3.10 broker checklist · 2026-07-03
