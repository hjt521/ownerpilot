---
constitutional_id: PROC-001
operational_maturity: operational
security_classification: internal
capability_class: constitutional
object_type: process
title: Migration Workflow
status: Operational
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [CON-001, STD-001]
required_by: []
implements: [CON-001]
governed_by: [CON-001]
validated_by: [VAL-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [process,workflow]
program_phase: foundation
repository_path: constitution/process/migration_workflow.md
checksum_scope: file
---

# Phase F — Constitutional Migration Workflow

The mandatory, repeatable, repository-first process for every future constitutional change. **No constitutional object may bypass this workflow.** It exists so the schema never drifts database-first again.

## The loop

```
1. Architecture doc      → constitution/architecture/ (or module doc). Define WHAT before any SQL.
2. Design review         → owner/broker reviews the architecture + any novel decision (→ ADR if novel).
3. Migration draft       → constitution/database/migrations/<name>.sql (additive, reversible, standards-compliant).
                           DRAFT ONLY — never applied at this step.
4. Repository review      → PR review of the migration + docs. Standards + validation checks run here.
5. Validation            → run the validation framework (constitution/validation) against the draft: drift,
                           coverage, dependency, ordering. Must pass.
6. Production migration    → BROKER applies the migration to prod (governance §4.13). Engineering hands the block.
7. Documentation update    → update the affected architecture/module doc + ADRs to reflect the applied state.
8. Baseline refresh        → regenerate constitution/database/baseline/constitution_baseline.sql (pg_dump) and
                           commit it, so the repo baseline == production. Drift check goes green.
```

## Rules

- **Steps are ordered and non-skippable.** A migration that reaches production without steps 1–5 is a governance violation and must be retro-documented + validated.
- **Draft ≠ apply.** Steps 3–5 happen entirely in the repo. Only step 6 touches production, and only the broker executes it.
- **One change per migration.** No omnibus migrations mixing unrelated objects.
- **Reversibility is mandatory.** Every migration carries a `-- ROLLBACK:` block that returns the DB to the prior state.
- **Baseline is the contract.** After step 8, `constitution_baseline.sql` is byte-current with production; the drift check (validation) enforces this continuously.

## Roles

- **Engineering (Constitutional Steward):** authors architecture, ADRs, migration drafts, validation; hands blocks.
- **Broker / Owner:** design review, PR approval, and the *only* actor who applies migrations to production.
- **Validation framework:** the automated gate at step 5 (and continuous drift detection).

## Where ESL-005 sits

The ESL-005 Phase 5A draft already exists (step 3 done). It has not passed steps 4–6. Under the Phase 0 gate it stays at step 3 until this foundation is approved; then it proceeds 4 → 5 → 6 normally. This is the first change to run the full workflow end-to-end.
