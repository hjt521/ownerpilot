# OPEP-000 — Governing Reference Inventory

**Status:** DRAFT
**Canonical status:** NONCANONICAL
**Implementation authority:** None
**Runtime authority:** None
**Preview authority:** None
**Production authority:** None
**Executive-activation authority:** None
**Repository-write consequence of this document:** None
**Constitutional consequence:** None
**AEOS RA-001 certification assumption:** None
**Current OwnerPilot CAO consequence:** None
**Human review:** Required
**Date:** 2026-08-06
**Repository audit base:** `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`


## 1. Purpose and limitation

This document inventories repository sources that may govern or inform future
OwnerPilot executive specialization.

It does not declare that every source applies to every role and does not
elevate, reconcile, supersede, or adopt any source.

A future Governing Reference Manifest must resolve exact identity, status,
version, applicability, jurisdiction, effective status, conflicts, and
limitations before consequence-bearing use.

## 2. Audit method

The read-only audit used:

- OwnerPilot `main` at
  `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`;
- PR #348 at
  `20629162b71db6b9d7903d330210b048ae9d7a14`;
- constitutional and generated-index sources;
- enterprise capability sources;
- Generic CAO and current CAO Preview sources;
- legal and compliance directories; and
- the Founder OPEP direction dated 2026-08-06.

Path presence proves only that an artifact exists at the audited commit. It
does not prove canonical status, legal correctness, applicability, or
implementation authority.

## 3. Source-status classes

| Class | Meaning | Default OPEP treatment |
|---|---|---|
| Founder decision | Explicit Founder direction with scope | Controlling within scope unless superseded |
| Ratified constitutional artifact | Founder-ratified normative artifact | Governing within declared scope |
| Accepted ADR | Recorded architecture decision | Governing within exact decision scope |
| Approved doctrine or standard | Normative principle or requirement | Governing within exact scope |
| Proposed or Architecture Draft | Unratified design | Analysis input only |
| Verified implementation record | Evidence of what exists or was tested | Descriptive; no constitutional authority |
| Operational record | Current system/process state | Descriptive unless separately authorized |
| Noncanonical reviewed handoff | Structured reviewed input | No authority through compilation |
| Source recovery | Preserved historical text | Never canonical by status alone |
| External AEOS package record | Exact package/certification evidence | Technical input; no OwnerPilot authority |
| Unknown or disputed | Status/applicability unresolved | Fail closed |

## 4. Governance baseline

### 4.1 Founder direction

- AEOS is the future source of reusable business-neutral executives.
- OwnerPilot must not maintain a competing generic executive.
- OwnerPilot owns specialization and enforcement.
- the current OwnerPilot CAO remains untouched;
- certification-eligible packages enter Stage A only;
- Founder acceptance is required;
- Generic CLO is the first serious trial; and
- a documentation branch and Draft PR are authorized.

### 4.2 Ratified constitutional foundation

| Source | Audited status | OPEP relevance |
|---|---|---|
| `constitution/CONSTITUTION.md` | Operative constitutional source | Repository constitutional baseline beneath Founder |
| `constitution/architecture/EA-000_constitutional_meta_architecture.md` | Ratified | Artifact taxonomy, CRIDs, dependencies, ratification |
| `constitution/architecture/canonical_architecture_mapping.md` (`MAP-001`) | Ratified | Normative/descriptive distinction and dependency rules |
| `constitution/standards/constitutional_artifact_lifecycle.md` | Ratified | Lifecycle and no AI self-ratification |
| `constitution/standards/constitutional_stability_principle.md` | Ratified | Closed-foundation change discipline |
| `constitution/doctrines/governance_handbook.md` | Ratified | Governance baseline |
| `constitution/doctrines/DOC-003_ai_operating_charter.md` | Ratified | Drafting, reconciliation, publication, human authority |
| `constitution/adr/adr_log.md` | Operational append-only log | Accepted decisions and supersession |
| `constitution/STATUS.md` | Descriptive operational dashboard | Discovery; not authority by itself |

### 4.3 Index freshness finding

Generated indexes are useful but insufficient as the sole manifest source:

- `constitution/index/ea_index.json` was generated 2026-07-26 and lists four
  EAs, excluding separately present EA-101 and EA-102.
- `constitution/index/adr_index.json` lists ADR-001 through ADR-015, excluding
  later ADRs referenced by operative files.
- `constitution/index/artifact_index.json` and
  `constitution/index/dependency_graph.json` require freshness and coverage
  verification.

Rule:

> Generated indexes may support discovery and validation, but consequence-bearing
> use requires validation of generation time, coverage, and agreement with the
> referenced artifact.

## 5. Enterprise and intelligence architecture

| Source | Audited status | Candidate use |
|---|---|---|
| `constitution/enterprise/EA-100_ownerpilot_enterprise_architecture.md` | Ratified | All roles; capability map |
| `constitution/architecture/EA-101_ownerpilot_cognitive_architecture.md` | Ratified v0.2 | Recommendation-producing roles |
| `constitution/architecture/EA-102_closed_loop_learning_architecture.md` | Ratified v0.2; bounded implementation authority | Learning/evaluation relationships |
| `constitution/architecture/EA-012_constitutional_intelligence_layer.md` | Proposed | Design input only until later ratification |
| `constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md` | Ratified | Evidence, trust, options, comparison, communication |
| `constitution/implementation-specs/recommendation_object_spec_v0.1.md` | Drafting input | Not canonical; future RCO-001 review only |
| `constitution/implementation-specs/decision_graph_spec_v0.1.md` | Drafting input | Not canonical; future DECG-001 review only |
| `constitution/architecture/REG-CAP-001_capability_registry.md` | Ratified in current ADR/STATUS record | Capability registration; no parallel registry |

## 6. Enterprise capabilities

| ECAP | Capability | Candidate executive roles |
|---|---|---|
| ECAP-001 | AI Assistant | All advisory roles |
| ECAP-002 | Document Generation | CLO, CPO |
| ECAP-003 | Serve & Track | CLO, COO, CPO |
| ECAP-004 | RiskPath | CLO, CSO, CPO, Recommendation Synthesizer |
| ECAP-005 | Property Intelligence | CSO, CFO, CPO |
| ECAP-006 | Pricing Intelligence | CFO, CPO, CSO |
| ECAP-007 | Compliance Guidance | CLO, CPO, COO |
| ECAP-008 | Workflow Automation | COO, CPO |
| ECAP-009 | Communication | COO, CPO, Recommendation Synthesizer |
| ECAP-010 | Evidence Management | All roles |
| ECAP-011 | Reporting | CFO, COO, CSO |
| ECAP-012 | Customer Portal | CPO, COO |

An ECAP identity or maturity does not authorize an executive to use it.

## 7. Current CAO sources

### 7.1 Generic compatibility boundary

| Source | Current OPEP treatment |
|---|---|
| `lib/agents/genericCaoContract.ts` | Temporary compatibility/historical generic contract |
| `lib/agents/genericCaoBusinessAdapter.ts` | Reference-only compatibility adapter |
| `lib/agents/ownerPilotCaoSpecialization.ts` | Nonexecuting current-state mapping |
| `docs/architecture/executive-agents/generic_cao_boundary_pr_b_review_packet_2026-08-06.md` | Noncanonical review evidence |
| associated tests | Deterministic boundary evidence |

These may support comparison against a future AEOS Generic CAO. They do not
authorize migration.

### 7.2 Current CAO Preview sources

| Source | Treatment |
|---|---|
| `lib/agents/caoPreviewRegistry.ts` | Current runtime registry; preserve unchanged |
| `lib/agents/caoRepositoryEvidence.ts` | Current evidence-scope record |
| `lib/agents/executiveAgentRegistry.ts` | Current role/charter registry |
| `docs/agents/charters/chief_architecture_officer.md` | Current charter |
| Preview route, gate, runner, model, and UI sources | Existing runtime; outside OPEP modification scope |

A future CAO manifest must distinguish the current runtime, the compatibility
boundary, and a future AEOS package.

## 8. PR #348 and OPMA sources

| Source | Status | OPEP treatment |
|---|---|---|
| PR #348 supporting draft | Draft, noncanonical | Historical context and valid nonauthority rules; future AEOS direction requires conforming revision |
| PR #348 review packet | Draft, noncanonical | Review record; same reconciliation requirement |
| future OPMA-000 | Not created/adopted by this package | Proposed parent map |
| OPEP-000 | Current noncanonical package | Proposed subordinate portability architecture |

A future PR #348 revision should preserve dated text and add an explicit later
Founder-direction section.

## 9. Legal and compliance source families

### 9.1 Verified noncanonical handoff

`docs/legal/group1_legal_review_handoff_2026-07-31.md` is a verified,
noncanonical reviewed handoff. It expressly disclaims final legal-control,
constitutional, Production, implementation, and publication authority.

It may inform CLO specialization only after each cited source and disposition
is independently classified.

### 9.2 Source-recovery specifications

Explicit `NONCANONICAL SOURCE RECOVERY`:

- `docs/legal/california_nonpayment_product_control_specification_draft_2026-07-31.md`;
- `docs/legal/california_nonpayment_product_control_specification_revision_1_2026-07-31.md`.

They have no Production, implementation, or canonical consequence.

### 9.3 Reconciliation and review records

Candidate CLO inputs include:

- `docs/legal/group1_pcs_revision1_reconciliation_2026-07-31.md`;
- `docs/legal/consolidated_review_attorney_ruling_2026-06-05.md`;
- `docs/legal/ownerpilot_closeouts_attorney_ratification_2026-06-05.md`;
- `docs/legal/ownerpilot_v4_wording_signoff_reconstruction_2026-06-05.md`;
- `docs/legal/step4_helper_disposition_attorney_ruling_2026-06-05.md`;
- `docs/legal/v4_wording_signoff_ratification_and_closeouts_2026-06-05.md`;
- sources indexed by `docs/compliance/INDEX.md`; and
- compliance records cited by the Group 1 handoff.

Every file must be classified individually. A filename containing `attorney`,
`ruling`, `ratification`, `signoff`, or `approved` is not self-authenticating.

### 9.4 CLO invariants

A future CLO manifest must preserve:

- no on-platform attorney service;
- no `Request attorney review` function;
- independent counsel only outside OwnerPilot;
- no implication of attorney review, approval, supervision, or availability;
- owner/authorized owner-side user as operator;
- no autonomous representation or legal decision;
- no jurisdiction activation by the AEOS core;
- no legal source elevation through drafting;
- no silent resolution of unresolved issues; and
- independent OwnerPilot enforcement.

This inventory does not determine legal sufficiency.

## 10. Security, platform, and implementation families

A future manifest may reference, but cannot replace, sources governing:

- authentication and authorization;
- secrets;
- provider transport;
- environment isolation;
- rate and request limits;
- database access and RLS;
- audit logging;
- repository access;
- deployments;
- Preview and Production gates;
- incident containment; and
- revocation.

No secret or unrestricted environment/transport configuration belongs in a
manifest.

## 11. Role-specific inventory

### 11.1 OwnerPilot CAO

**Candidates**

- Founder CAO approval and limitations;
- current charter and Preview registry;
- EA-000, MAP-001, EA-100, EA-101, EA-102;
- applicable ADRs;
- future OPOS-001 only when created and ratified;
- EA-012 according to actual status;
- evidence allowlists;
- security/environment controls;
- current validation records.

**Fail closed on**

- current CAO alteration;
- uncertain migration authority;
- missing package/certification digest;
- unresolved current-versus-AEOS difference;
- Production inferred from Preview;
- generic behavior exceeding current role.

### 11.2 OwnerPilot CLO

**Candidates**

- Founder role and no-attorney-routing decisions;
- EA-000, MAP-001, EA-100, EA-101;
- ECAP-001/002/003/004/007/010;
- verified legal handoffs;
- individually validated legal/compliance rulings;
- California and Los Angeles applicability sources;
- notice, service, payment, entity, and owner-confirmation controls;
- prohibited-claim controls;
- privacy, retention, and evidence controls.

**Noncanonical-only inputs**

- California nonpayment source-recovery base and Revision 1;
- unreconciled drafts;
- historical reconstruction records not independently controlling.

**Fail closed on**

- uncertain jurisdiction;
- missing/stale effective date;
- unresolved legal authority;
- missing primary-source verification;
- representation or attorney-routing request;
- product/legal conflict;
- unsupported entity path;
- AEOS package supplying local law.

### 11.3 OwnerPilot CSO

**Candidates**

- Founder mission/stewardship;
- EA-100, EA-101;
- future OPOS-001;
- BTRM-001;
- applicable ECAPs;
- RCO-001/DECG-001 only when ratified;
- evidence/dissent rules;
- human decision boundaries.

**Fail closed on**

- recommendation treated as binding;
- unsupported evidence;
- hidden composite scoring;
- suppressed dissent;
- inferred authority to commit the enterprise.

### 11.4 OwnerPilot CFO

**Candidates**

- approved financial objectives;
- EA-100, EA-101, BTRM-001;
- ECAP-005/006/011;
- payment/settlement controls;
- billing and financial implementation records;
- sensitive-data controls;
- future FIE-001 only when ratified;
- qualitative-first rules.

**Fail closed on**

- money movement;
- autonomous purchasing or commitment;
- unverified evidence;
- false precision;
- composite financial score controlling a recommendation;
- unsupported tax/accounting/legal conclusion.

### 11.5 OwnerPilot CPO

**Candidates**

- EA-100 and applicable ECAPs;
- EA-101 and future OPOS-001;
- EA-012 according to status;
- BTRM-001;
- product controls only after status resolution;
- workflow/accessibility/communication/release controls;
- legal/product decisions;
- implementation/acceptance records.

**Fail closed on**

- product design creating legal rules;
- unsupported claims;
- unapproved workflow authority;
- runtime inferred from architecture;
- implementation inferred from a draft.

### 11.6 OwnerPilot COO

**Candidates**

- EA-100;
- ECAP-003/008/009/010/011/012;
- operating/service-level records;
- security/deployment controls;
- audit/incident procedures;
- human assignment/escalation.

**Fail closed on**

- automatic dispatch;
- unauthorized external communication;
- database/repository write;
- deployment/release;
- unsupported commitment;
- missing human owner.

### 11.7 Recommendation Synthesizer

**Candidates**

- EA-101;
- EA-102;
- BTRM-001;
- ADR-015;
- RCO-001/DECG-001 only when ratified;
- provenance and confidence-quality separation;
- dissent/critical-failure preservation;
- human review.

**Fail closed on**

- universal composite score;
- numeric telemetry independently ranking/approving/rejecting/executing;
- averaging away a critical deficiency;
- automatic winner selection;
- missing or uncited evidence;
- suppressed dissent;
- inferred implementation authority.

## 12. Manifest completion requirements

Before Stage B, every required reference needs:

- stable ID;
- exact system, repository, path, and source identity;
- exact commit/version/digest;
- artifact type;
- canonical and lifecycle status;
- authority class and source;
- applicability and exclusions;
- jurisdiction;
- effective/expiration status;
- supersession;
- conflicts;
- limitations;
- evidence classification;
- freshness rule; and
- human reviewer.

A wildcard directory, broad topic label, or unversioned `latest` reference is
insufficient.

## 13. Audit findings requiring future resolution

1. Generated constitutional indexes are not demonstrably complete for the
   audited commit.
2. PR #348's AEOS direction is outdated.
3. The Generic CAO needs future comparison/migration disposition; no migration
   is authorized.
4. Legal file authority cannot be inferred from names.
5. EA-012 is Proposed while later artifacts reference it; preserve actual
   status.
6. RCO-001, DECG-001, OPOS-001, and FIE-001 are reserved/future, not current
   ratified authority unless later established.
7. No AEOS package, digest, certification, or RA-001 record was present in the
   OwnerPilot audit.
8. AEOS certification cannot be represented as OwnerPilot acceptance.

No finding authorizes remediation in this branch.
