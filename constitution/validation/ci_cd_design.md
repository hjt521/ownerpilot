# Constitutional Validation — CI/CD Design (Phase 2)

Goal: **make constitutional regressions impossible to introduce silently.** The validation checks (`checks.sql` + runner-side comparisons) run in three places, so a drift or governance violation is caught at commit, at merge, and continuously.

## Runner

`constitution/validation/run_checks.ts` (or `.sql` bundle) executes every check and returns a single pass/fail report. Two input sources:
1. **Live introspection** — the read-only SQL in `checks.sql` (via the Supabase MCP or a read-only DB role).
2. **Repository state** — the committed baseline manifest/checksum, the migration filenames, the `module_architecture.md` table list, and the `adr_log.md` SECURITY DEFINER allow-list.

The runner **diffs** the two and fails on any delta. Every check is read-only; the runner never writes to the DB.

## The three gates

| Gate | When | Checks | Failure action |
|---|---|---|---|
| **Pre-merge CI** | on every PR touching `constitution/` | 2,3,4,5,6,7,8 (introspection) + 10,11,13,14 (repo-only: migration ordering, arch consistency, doc/ADR mismatch) | block merge |
| **Baseline gate** | on any PR that refreshes the baseline (workflow step 8) | 0/12 (genesis_checksum vs committed `constitution_checksum.sha256`) | block merge if checksum ≠ manifest |
| **Continuous watch** | scheduled (extend the weekly Advisors task to `constitution`) | 0/12 drift + 2 + 3 + 4 | alert on any delta between live and committed baseline |

## Check → gate map

- **Drift / baseline mismatch (0, 1, 12):** baseline gate + continuous watch. The overall sha256 is the single source of "did anything change." If live ≠ committed and there's no corresponding applied migration + baseline refresh, that's silent drift → fail.
- **Coverage (2 trigger, 3 RLS, 6 index):** pre-merge CI.
- **Security (4 SECURITY DEFINER allow-list, 5 search_path):** pre-merge CI + continuous watch (a new unlisted SD function is a governance event).
- **Integrity (7 broken FK, 9 dependency graph):** pre-merge CI.
- **Consistency (8 comments, 10 migration ordering, 11 architecture, 13 doc mismatch, 14 ADR mismatch):** pre-merge CI — these compare the migration/docs in the PR against the live/expected state so documentation cannot fall out of sync with schema.

## Regression-proof invariants

1. **No schema change without a checksum change.** Any DDL alters the overall sha256; the baseline gate forces the manifest to be refreshed in the same PR, and the continuous watch catches out-of-band changes.
2. **No new SECURITY DEFINER function without an ADR entry** (check 4 diffs live SD functions against the ADR-005 allow-list).
3. **No `updated_at` column without a trigger** (check 2).
4. **No table without RLS / no permissive `true` policy** (check 3).
5. **No documented object missing from the schema, and no schema object missing from the docs** (checks 11/13).

## Implementation status

Design (Phase 2). The introspection queries in `checks.sql` are runnable today (they produced the Genesis checksums). The runner + CI wiring + scheduled watch are the implementation follow-up (roadmap P1); no check requires new DB objects or write access.
