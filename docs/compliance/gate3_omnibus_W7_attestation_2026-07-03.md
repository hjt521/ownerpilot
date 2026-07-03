# Gate-3 Omnibus — Lane W7 (DO NOT SERVE as first-class object) — Build Attestation

**Re:** omnibus §3.8, amended by broker ruling 2026-07-03 (FK → `chat_sessions`, `UNIQUE(case_id)`, time-travel CHECK).
**By:** Claude Code (engineering), 2026-07-03. Repo HEAD `main` (post-W5).

---

## §1 — Scope satisfied
- **Migration 038 `do_not_serve_holds`** (`supabase/migrations/038_do_not_serve_holds.sql`): table with the omnibus columns; `case_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE`; `UNIQUE(case_id)`; `CHECK (lifted_at IS NULL OR lifted_at >= imposed_at)`; `CHECK (jsonb_typeof(gates)='array')`; partial index `idx_dns_holds_case_active … WHERE lifted_at IS NULL`; RLS enabled with owner-read via `chat_sessions.user_id` join (writes are service-role/broker only).
- **Helper `lib/dns/holds.ts`**: `DnsHold`/`DnsGate` types, `isHoldActive`, `summarizeGates`, `activeHoldBannerMessage` (renders the locked banner), `fetchActiveHold`.
- **Locked prose**: `DNS_ACTIVE_HOLD_BANNER_EN` added to `locked_prose_manifest_phase2_assembly.json` (tier A, hash `20ef8b17c3ded7179fb52bcbb533142c97d76938ce20f7c39fa9c0b9836bbacc`, 56 Shape-B entries; verify-locked-prose PASS, 108 total).
- **Enforcement**: `app/api/notice/produce/from-chat/route.ts` now checks `fetchActiveHold(sb, session.id)` immediately after session load and returns **HTTP 423** with the locked banner message when a hold is active — blocking produce/packet/cover-sheet/filing progression before any produce work.
- **Tests**: `lib/dns/__tests__/holds.test.ts` (active detection, gate summary, banner interpolation with no leftover `${}`). tsc 0; holds test green; verify-locked-prose PASS.

## §2 — Deviations from spec (§4.2)
1. **FK target `cases(id)` → `chat_sessions(id)`.** No `cases` table exists; per the 2026-07-03 broker ruling the hold anchors to `chat_sessions` (its lifecycle — imposed pre-service, lifted pre-filing — is a strict subset of the session lifetime). Ratified.
2. **Founding backfill NOT possible as specced.** §3.8 says "create one row for the Clifton Alexander case … referencing the countersign file." **There is no `chat_sessions` row for Clifton** — the founding filing was executed directly on the LAHD portal, not through an in-app chat session (verified: no session matches the property). With `case_id NOT NULL REFERENCES chat_sessions(id)`, the backfill cannot reference a non-existent session, and manufacturing a synthetic session (with tenant PII) would be worse than the authoritative record that already exists.
   **Recommendation:** the founding Clifton hold+lift stays as its **countersign paper record** (`…do_not_serve_lift_countersign_2026-07-02.md`); the table governs **future in-app cases**. If the broker wants a DB founding record, the clean option is a later migration relaxing `case_id` to nullable for historical/paper holds (with a `case_id IS NOT NULL OR is_historical` check) — surfaced for a ruling, not assumed.

## §3 — Not in this PR (follow-ups)
- **Visual red banner component** on the case surface. The server enforcement returns the locked message (423); a dedicated red-banner UI that renders it on the intake/riskpath surface is a small follow-up.
- **Hold-check on the cover-sheet + filing-record endpoints.** The produce entry is the primary gate; extending the same `fetchActiveHold` guard to `/api/notices/[riskpathId]/lahd-cover-sheet` and `…/lahd-filing-record` is a fast-follow for defense-in-depth.

## §4 — Broker actions (§4.13)
- Apply **migration 038** in Supabase Studio (Preview then Prod, per the Gate-2 runbook). SQL is the migration file verbatim.
- Rule on the founding-backfill disposition (§2.2): paper record stands (recommended) vs. later nullable-`case_id` migration.

---

— Engineering (Claude Code) · Lane W7 DO NOT SERVE first-class object · 2026-07-03
