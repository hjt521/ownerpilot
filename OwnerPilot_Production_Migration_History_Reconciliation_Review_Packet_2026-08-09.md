# OwnerPilot Production Migration-History Reconciliation Review Packet

**Status:** DRAFT — review only; no Production execution authority  
**Date:** 2026-08-09  
**Evidence base:** historical-topology prototype `9baa18a91d5fec6ddbe1afc5cce4d9ef62d5df30`  
**Frozen Production `main`:** `8ea4399bbdec9628a43330b7f2e8716c6ae8dc68`

## 1. Purpose and authority boundary

This packet designs a possible future reconciliation of OwnerPilot Production Supabase migration history. It does **not** authorize or perform any Production mutation.

Still prohibited absent a separate Founder authorization:

- modifying `supabase_migrations.schema_migrations` in Production;
- running `supabase migration repair` against Production;
- marking numeric migrations `001`–`055` applied in Production;
- applying `056_owner_tables_grant_tidy.sql` in Production;
- applying `057_btrm_enr_evidence_schema.sql` in Production;
- changing Production schema, RLS, auth, grants, functions, triggers, cron, extensions, or application data;
- merging PR #354;
- merging the historical-topology prototype / PR #355;
- resetting, rebasing, deleting, or modifying `e2e-preview`;
- beginning P0-B.

The objective is to produce a bounded, auditable plan for a later Founder decision.

## 2. Established evidence

### 2.1 Production migration ledger

Production currently contains **36 timestamp-version rows** in `supabase_migrations.schema_migrations`. These are the established historical application and constitutional timestamps.

The 36 Production rows are to be **retained**, not deleted or rewritten, unless a future Founder disposition explicitly states otherwise.

Production does not contain numeric versions `001`–`055`, `056`, or `057` in its migration ledger.

### 2.2 Reconstructed canonical topology

The historical-topology prototype has established a fresh-reconstructable active topology of exactly **90 migrations**:

- 54 numeric migrations: `001`–`052`, `054`, `055`;
- 20 historical application timestamp compatibility migrations;
- 16 constitutional timestamp migrations.

`053` does not exist. `056` and `057` are staged outside `supabase/migrations/` and are not part of the active 90-version topology.

### 2.3 Local proof

A pristine local reconstruction using Supabase CLI `2.113.0` applied all 90 active migrations successfully and reproduced the expected schema topology, including all 18 constitutional triggers.

### 2.4 Hosted proof

The real Supabase GitHub Preview integration successfully created a fresh hosted Preview database from the same 90-version topology at exact prototype head `9baa18a91d5fec6ddbe1afc5cce4d9ef62d5df30`.

The hosted migration ledger was exactly:

- 54 numeric;
- 20 historical application timestamps;
- 16 constitutional timestamps;
- 90 total;
- no `053`;
- no `056`;
- no `057`.

The hosted deterministic schema fingerprints matched Production across all 18 measured categories, including:

- `constitution.triggers`: 18 / `27ce6917dee6fc31b2f57d5c8fe63feb`;
- `public.table_grants`: 867 / `47a779d326830531497ed3189d2cd2e9`.

This proves that the canonical 90-version migration source can construct the established Production schema end-state in the real hosted Supabase environment.

## 3. Production tracking-table shape

Production `supabase_migrations.schema_migrations` has six columns:

1. `version text NOT NULL`;
2. `statements text[] NULL`;
3. `name text NULL`;
4. `created_by text NULL`;
5. `idempotency_key text NULL`;
6. `rollback text[] NULL`.

Constraints/indexes:

- primary key on `version`;
- unique constraint/index on `idempotency_key`.

The additional `created_by`, `idempotency_key`, and `rollback` columns are nullable and have no defaults.

This shape differs from fresh Preview/local migration ledgers, which use the standard core migration columns. Any future Production history operation must therefore be validated against this extended Production table shape rather than assuming a pristine hosted ledger.

## 4. Reconciliation problem statement

The Production schema state and canonical migration source are now demonstrably equivalent on the measured deterministic surfaces, but their tracking histories differ:

- canonical repository / fresh hosted history: 90 versions;
- Production history: 36 timestamp versions.

The missing Production tracking entries are the **54 numeric migrations through `055` excluding `053`**.

The intended reconciliation must not replay those numeric SQL migrations against Production because their material effects are already represented in the established Production end-state. Replaying them could collide with existing objects or alter live state.

The reconciliation therefore concerns **tracking metadata only**, not application of schema SQL.

## 5. Supported Supabase mechanism

Supabase documents `supabase migration repair --status applied <version>` as the supported mechanism for marking a migration as applied when the schema change already exists but the remote migration history row is missing.

Supabase states that `migration repair` updates the migration tracking table only; it does not apply or revert the migration SQL itself.

This makes `migration repair --status applied` the preferred mechanism in principle over direct hand-written DML against `supabase_migrations.schema_migrations`.

However, OwnerPilot must not infer from general CLI documentation that Production execution is risk-free. The Production ledger has an extended historical shape, and hosted migration-history behavior has had edge cases in mixed/legacy histories. A Production execution authorization must therefore be preceded by an explicit tool-semantics acceptance step.

## 6. Options considered

### Option A — Official CLI history repair for the 54 missing numeric versions

Conceptual future action, **not authorized now**:

```text
supabase migration repair --status applied <54 numeric versions>
```

Target version set:

`001`–`052`, `054`, `055`.

Explicit exclusions:

- `053`;
- `056`;
- `057`;
- all 36 existing timestamp versions.

Advantages:

- uses Supabase's supported migration-history repair mechanism;
- intended to modify tracking metadata without replaying schema SQL;
- preserves the 36 established Production timestamp rows;
- aligns Production version identity with the proven canonical 90-version topology.

Risks / unresolved execution semantics:

- exact row contents written by CLI `2.113.0` into Production's extended six-column tracking table have not yet been demonstrated on a Production-shaped non-Production ledger;
- a later hosted GitHub integration run must be shown to interpret the repaired Production history as in-sync rather than attempt duplicate application;
- rollback must be designed as metadata rollback, not schema rollback.

**Architect recommendation:** preferred only after the repair-semantics acceptance gate in Section 8 passes.

### Option B — Direct SQL insertion of the 54 missing versions

Rejected as the primary method.

Reasons:

- bypasses Supabase's supported history-repair interface;
- requires OwnerPilot to manufacture `name`, `statements`, and potentially extended metadata semantics itself;
- increases the chance that local CLI and hosted GitHub integration interpret the resulting rows differently;
- creates avoidable provenance and rollback complexity.

Direct DML should remain emergency-only and would require separate explicit authorization even if Option A were later approved.

### Option C — Replay numeric migrations into Production

Rejected.

The hosted canary already proves the numeric migrations can construct the Production end-state from zero. It does not justify replaying those migrations against an already-populated Production database. Replaying them would conflate schema execution with history reconciliation and introduces unnecessary live-state risk.

### Option D — Delete the 36 timestamp rows and rebuild Production history from numeric migrations

Rejected.

The 36 timestamp rows are genuine Production historical lineage and include constitutional history. Deleting them would destroy established provenance and contradict the accepted requirement to retain them.

## 7. Proposed target state

If a future repair is authorized and succeeds, the intended Production migration ledger would contain exactly **90 rows**:

- existing 36 timestamp rows preserved;
- 54 numeric rows added as tracking-equivalence records;
- no `053`;
- no `056`;
- no `057`.

No Production schema object, application row, RLS policy, grant, function, trigger, cron job, extension, or auth setting should change as a consequence of the metadata repair.

The post-repair schema fingerprints must remain byte-for-byte/count-for-count identical to the pre-repair Production baseline.

## 8. Required repair-semantics acceptance gate before Production authorization

Before the Founder is asked to authorize Production history mutation, the following must be demonstrated without touching Production metadata:

1. **Production-shaped tracking-table test.** Demonstrate CLI `2.113.0` `migration repair --status applied` against a non-Production `schema_migrations` table with the same six-column shape and constraints as Production.
2. **Exact inserted-row capture.** Record the resulting `version`, `name`, `statements`, `created_by`, `idempotency_key`, and `rollback` values for representative numeric versions, including `001`, a middle version, `052`, `054`, and `055`.
3. **Multi-version behavior.** Verify whether supplying all 54 versions in one command is atomic or whether failure can leave a partially repaired ledger. If atomicity is not guaranteed, design a bounded batch/verification procedure.
4. **Idempotency.** Re-running the proposed repair against already-recorded versions must fail safely or produce a predictable no-op; this behavior must be understood before Production execution.
5. **Hosted integration interpretation.** Demonstrate on non-Production state that the Supabase GitHub integration treats the repaired 90-version ledger as already applied and does not attempt to replay numeric SQL.
6. **Rollback procedure.** Define an exact metadata-only rollback for only the newly added 54 numeric rows, with precondition checks preventing removal of any pre-existing Production timestamp row.
7. **No 056/057 contamination.** Confirm the acceptance test never adds `056` or `057` and never creates BTRM-057 objects or removes the pre-056 grants.

A new paid hosted branch, if required for this acceptance gate, requires a separate cost/branch authorization. The previous hosted historical-topology canary authorization is exhausted and its branch has been deleted.

## 9. Proposed Production execution plan — future authorization only

The following is a design sequence, not current authority.

### Stage 0 — freeze and identity

Immediately before any future Production repair:

- verify repository `main` is still the exact Founder-authorized SHA for that execution;
- verify the canonical migration source SHA explicitly authorized for the repair;
- verify Production project ref `txpetdrfsmqnyooydmas`;
- verify Production migration ledger still has the expected 36-row baseline;
- verify Production deterministic topology fingerprints still equal the approved baseline;
- verify pre-056 grant count remains 42;
- verify BTRM-057 table count remains 0;
- verify `e2e-preview` baseline has not been altered by this program;
- verify 056/057 remain outside active migration discovery.

Any mismatch => **STOP**.

### Stage 1 — immutable pre-repair evidence capture

Capture and retain:

- complete ordered Production migration ledger, all six columns;
- ledger row count and deterministic ledger fingerprint;
- all 18 schema-topology fingerprints;
- pre-056 42-grant set;
- BTRM-057 absence;
- current custom-reader roles;
- cron jobs;
- relevant extension versions;
- `main` SHA and approved source SHA.

### Stage 2 — metadata-only repair

Use only the Founder-authorized Supabase CLI version and exact approved 54-version set.

Do not run `db push` as the repair operation.

Do not run any SQL migration.

Do not include `053`, `056`, `057`, or the existing 36 timestamp versions.

If the repair command returns an unexpected result, partial state, connection target, or version set => **STOP**. Do not improvise.

### Stage 3 — immediate ledger verification

Expected result:

- total ledger rows = 90;
- numeric rows = 54;
- application timestamp rows = 20;
- constitutional timestamp rows = 16;
- `053` absent;
- `056` absent;
- `057` absent;
- all original 36 timestamp rows still present.

Any discrepancy => **STOP / HOLD** and execute only a separately pre-authorized metadata rollback.

### Stage 4 — no-schema-change proof

Recompute all deterministic Production topology fingerprints.

Every fingerprint must equal the pre-repair baseline exactly.

Also reconfirm:

- pre-056 target grants = 42;
- BTRM-057 table count = 0;
- custom reader roles unchanged;
- cron jobs unchanged;
- relevant extension set/version unchanged except independently occurring platform changes that are separately evidenced;
- no application-data mutation attributable to the repair.

Any unexplained difference => **STOP / HOLD**.

### Stage 5 — CLI and hosted synchronization proof

Run only read-only/status operations first:

- `supabase migration list` against the authorized Production project;
- `supabase db push --dry-run` against the authorized Production project.

Expected: local/canonical and remote histories are aligned and dry-run proposes no migration execution.

A subsequent hosted GitHub integration proof, if required by ARB, must be separately controlled so that a passing history-reconciliation check cannot merge or deploy schema changes automatically.

### Stage 6 — post-execution isolation proof

Confirm:

- Production `main` did not move unless separately authorized;
- no Production deployment was triggered by the metadata repair itself;
- PR #354 remains unmerged;
- PR #355 / historical prototype remains unmerged unless separately authorized;
- `e2e-preview` remains untouched;
- P0-B remains blocked unless separately authorized.

## 10. Proposed rollback design

Rollback is metadata-only and must never attempt to reverse Production schema.

If a future authorized repair adds exactly the 54 numeric rows but validation fails for migration-history reasons, the rollback target is only the numeric rows proven to have been introduced by that repair session.

Rollback must be guarded by:

- exact pre-repair 36-row timestamp baseline;
- exact captured set of newly introduced versions;
- prohibition on deleting any timestamp version;
- prohibition on touching `056`/`057` unless they somehow appear unexpectedly, in which case the process moves to HOLD rather than improvising;
- full post-rollback ledger and schema fingerprint verification.

The exact rollback mechanism—official `migration repair --status reverted` versus another bounded metadata operation—must be selected only after the repair-semantics acceptance gate establishes behavior on the Production-shaped non-Production ledger.

## 11. Founder decision requested after acceptance gate

No Founder execution decision should be requested until Section 8 is complete.

At that point the Founder packet should present one binary execution choice:

**Authorize** a metadata-only Production migration-history reconciliation adding exactly the 54 approved numeric versions via the proven repair procedure, while retaining all 36 timestamp rows and excluding 053/056/057;

or

**Do not authorize** and leave Production migration history at its current 36-row state.

No broader schema, Product, P0-B, or deployment authority should be bundled with that decision.

## 12. Current disposition

- P0-A: COMPLETE.
- 056/057 containment: LOCAL PASS + HOSTED PASS.
- Historical application topology: LOCAL PASS + HOSTED PASS.
- Constitutional topology: LOCAL PASS + HOSTED PASS.
- Combined 90-migration topology: LOCAL PASS + HOSTED PASS.
- Production migration-history design: **DRAFTED FOR REVIEW**.
- Repair-semantics acceptance gate: **NOT YET EXECUTED**.
- Production migration-history repair: **NOT AUTHORIZED**.
- P0-B: BLOCKED.

**STOP:** this packet creates no Production repair authority.