---
constitutional_id: PROC-100
object_type: process
title: ECAP Delivery-Stream Lifecycle
status: Ratified
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-24
updated: 2026-07-24
depends_on: [EA-100, REG-CAP-001]
required_by: [ECAP-001, ECAP-002, ECAP-003, ECAP-004, ECAP-005, ECAP-006, ECAP-007, ECAP-008, ECAP-009, ECAP-010, ECAP-011, ECAP-012]
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [PROC-001]
registry_tags: [delivery, product, lifecycle]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/PROC-100_ecap_delivery_lifecycle.md
checksum_scope: file
---

# PROC-100 — ECAP Delivery-Stream Lifecycle

Each ECAP is an **independent delivery stream** taken from model to production. No stage is skipped. Product work happens in the OwnerPilot application; this process governs *how*, and links each capability to its real implementing artifacts.

## The ten stages
1. **Product Requirements** — what the capability must do and for whom (50+ property owners, mobile, stressed).
2. **Functional Specification** — behavior, flows, acceptance criteria.
3. **Technical Architecture** — components, services, dependencies (must reference existing infra, not duplicate).
4. **Data Model** — Supabase tables/columns (repository-first migrations; no destructive change).
5. **Runtime Integration** — routes, edge functions, crons, bindings (declared in the ECAP's `runtime_bindings`).
6. **Security Review** — RLS/deny-by-default, PII handling, auth, secrets (CLAUDE.md rules; CA-001 audits).
7. **Implementation** — the actual application code (`app/`, `lib/`), referencing the ECAP.
8. **Testing** — unit + Playwright E2E; Preview-gated side effects.
9. **Constitutional Validation** — `node constitution/tools/cbs.mjs check` green; capability metadata + `implementing_artifacts` current; CA-001 evidence.
10. **Release** — ship under governance; update maturity + STATUS; CBS regenerate.

## Rules (ADR-012)
Every implementation: references an existing ECAP · registers against REG-CAP-001 · inherits constitutional governance automatically · reuses existing infrastructure (no duplicate business logic or capability definitions) · creates **no** new constitutional infrastructure unless a demonstrated architectural gap requires it (then: gap → ADR → Founder). **Intelligence hold remains** (TM-001/CM-001/EA-012/IMR-001/CK-001 deferred until concrete need).

## Maturity is queryable
Each ECAP's `operational_maturity`, `delivery_stage`, and `implementing_artifacts` are metadata → the delivery state of the whole enterprise is generated in `index/capability_index.json`. Completion of a stream = the ECAP is production, runtime-validated, monitored, and governed with no additional constitutional redesign.
