# Merged-vs-Live Schema Drift Diagnostic — 2026-07-22

**Purpose:** Systematic pre-flip check that every DDL object declared in the merged `supabase/migrations/` record exists in the production database (`txpetdrfsmqnyooydmas`). Motivated by the migration-050 gap caught during rollback drill Run 1 (standing ruling #5, schema-before-flag). Referenced by the §1.6 FF-3 prod-flip attestation packet.

**Method:** Extracted the declared object set from all 58 migration files (`CREATE TABLE`, `ADD COLUMN`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE POLICY`, `CREATE INDEX`, `CREATE VIEW`, `CREATE ROLE`) and diffed against the live catalog (`information_schema`, `pg_proc`, `pg_trigger`, `pg_policies`, `pg_indexes`, `pg_roles`).

## Result — CLEAN (no drift)

| Object class | Declared in migrations | Present in live prod | Delta |
|---|---|---|---|
| Tables (base) | 40 | 40 | **0** |
| Columns (ADD COLUMN targets) | all | all | **0** |
| Functions | 5 (`audit_cliff`, `enqueue_manual_review`, `refuse_delete_held`, `mark_expired_broker_confirms`, `sweep_broker_confirm_contacts`) | 5 | **0** |
| Triggers | 9 (8 `*_no_delete_held` + `geocode_audit_enqueue_manual_review`) | 9 | **0** |
| Policies | all (incl. 5× `app insert only` Fork H-a walls) | all | **0** |
| Indexes | all (incl. `ff3_authorized_unconsumed_idx`, `chat_sessions_awaiting_broker_review_idx`) | all | **0** |
| Views | 2 (`broker_confirm_attestation_v1`, `manual_review_queue_aging`) | 2 | **0** |
| Custom roles | 2 (`parcel_health_reader`, `rtc_block_state_reader`) | 2 | **0** |

**`chat_sessions.broker_reply_thread` (migration 050) is now present** — the sole gap found during Run 1, applied to prod via Studio on 2026-07-18. No other merged-but-unapplied object exists.

## Scope / caveats (honest boundaries)

- This diagnostic verifies object **existence** — the class of drift that produces the 050 failure mode (merged code reads an object the DB lacks → PostgREST 42703 / silent break). It does **not** verify: constraint `VALIDATE` state, exact column types/defaults, or grant/revoke specifics.
- Those other dimensions are covered elsewhere and are green: migration 042 (`VALIDATE` constraints) ran post-soak (reminder 2026-07-10, tracked complete); grant/revoke posture and `SECURITY DEFINER`/`search_path` state are confirmed clean by the Supabase Advisors run of 2026-07-22 (0 errors; no `function_search_path_mutable` warnings → 054 applied; Category A/E grants applied).
- Migration number **053 is intentionally absent** (Category B `053_audit_sink_service_role.sql` was withdrawn — Fork H-a audit-durability wall preserved). Not a gap.
- `list_migrations` reports tracked history only through 036 (037–052/054/055 applied as raw Studio SQL); this diagnostic bypasses that stale metadata by reading the live catalog directly. The history-table reconciliation remains a separate tracked ticket tied to the GitHub-connection branching work.

## Disposition

No remediation required. Live prod schema matches the merged migration record across all object classes as of 2026-07-22. This closes the "are there other 050-style gaps?" question ahead of the ~2026-07-28 FF-3 prod flip.

— Engineering · schema-drift diagnostic · 2026-07-22 · read-only (Supabase MCP `execute_sql`)
