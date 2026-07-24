---
constitutional_id: RPT-010
object_type: report
title: ECAP-003 Serve & Track — PROC-100 Delivery Record
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [ECAP-003, PROC-100, EA-100]
required_by: []
implements: [PROC-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [ECAP-003, RPT-006]
registry_tags: [delivery-record, ecap-003, serve-and-track]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/RPT-010_ECAP-003_delivery_record.md
checksum_scope: file
---

# RPT-010 — ECAP-003 Serve & Track · PROC-100 Delivery Record

Completes ECAP-003 through PROC-100 — the **final Wave-1 stream**. **Honest outcome: no code change** — the serve/filing/RiskPath surface is already owner-scoped and tested. Delivery is stages 6/8/9/10 (validation + release) plus one deferred least-privilege observation.

## Implementing artifacts (real — corrected)
`lib/filing` (efsRecord, lateFiling, lateFilingGate), `lib/riskpath` (lahdFilingRecord, produceAudit, stalenessAck, courtesyReminder, transitions, triggers, statusLabels, paths), `app/riskpath` (page + courtesy-reminder), `app/api/riskpath` (GET route + courtesy-reminder). Persistence: `public.riskpath_records`, `public.lahd_filing_records`. *(Correction: `lib/tracking.ts` is campaign attribution — marketing analytics — not this capability; removed from ECAP-003's artifacts.)*

## Stages 1–5 (satisfied by existing implementation)
Tracks a claimed owner's RiskPath records (state, notice document, produce snapshot/audit) and LAHD filing-completion records (filing date/channel/confirmation ref). Claimed-only surface: an owner must be signed in (migrated `user_id`) to read their RiskPath; anonymous sessions get 401.

## Stage 6 — Security Review (executed 2026-07-24, evidence-based vs prod)
- **`riskpath_records`:** RLS **enabled**; policy `riskpath_owner_all` = `ALL (auth.uid() = user_id)` — owner sees/mutates only their own; anon (`auth.uid()` null) matches no rows. **PASS.**
- **`lahd_filing_records`:** RLS **enabled**; policy `lahd_filing_records_owner_read` = SELECT where the parent `riskpath_records` row is the caller's (join on `user_id = auth.uid()`); no INSERT/UPDATE/DELETE policy → writes RLS-denied for anon/authenticated (service-role writes). **PASS.**
- **Route:** `GET /api/riskpath` is claimed-only — 401 without a migrated `user_id` — and additionally filters `.eq('user_id', session.user_id)` + `is('soft_deleted_at', null)`. **Defense-in-depth** (app filter *and* RLS owner-scope). **PASS.**
- **Observation (least-privilege, low, not a vulnerability):** anon/authenticated hold broad SELECT/UPDATE/DELETE grants on both tables (auto-expose side effect), fully neutralized by the owner-scoped RLS. Recommend revoking + disabling Data API auto-expose (same root as the P1 / ECAP-001 observation). **Deferred, no live exposure.**

## Stage 8 — Testing
Coverage: `lib/filing` (`lateFiling`, `efsRecord`, `lateFilingGate`), `lib/riskpath` (`lahdFilingRecord` + confirmation-ref, `produceAudit`, `stalenessAck`). Adequate.

## Stage 9 — Constitutional Validation
`cbs check` green; ECAP-003 metadata current; registered in `capability_index.json`. CA-001 evidence = this record + the live RLS re-verification.

## Stage 10 — Release (under governance)
ECAP-003 `operational_maturity: operational`, `delivery_stage: released`. No code change. Governed by EA-100 / registered in REG-CAP-001.

## Outcome — Wave 1 COMPLETE
**ECAP-003 delivered through PROC-100.** Wave 1 fully delivered: **ECAP-001 ✅ · ECAP-002 ✅ · ECAP-003 ✅ · ECAP-010 ✅** — each grounded in live prod/CI evidence, honest about code vs no-code. Deferred cross-cutting ops item recurs on 3 of 4: least-privilege grant tightening + disable Data API auto-expose (RLS covers; low priority).
