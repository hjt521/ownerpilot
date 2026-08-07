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

Precedence is not determined solely by artifact class. Scope, applicability,
jurisdiction, effective date, supersession, express Founder direction, and the
specific question under review must all be established. If those factors cannot
be determined reliably, the conflict remains unresolved and
consequence-bearing use must stop. This inventory does not define an automatic
precedence algorithm.

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
| Founder decision | Explicit Founder direction with scope | Controlling within scope unless superseded and only after applicability is established |
| Ratified constitutional artifact | Founder-ratified normative artifact | Governing within declared and applicable scope |
| Accepted ADR | Recorded architecture decision | Governing within exact decision scope, subject, and supersession state |
| Approved doctrine or standard | Normative principle or requirement | Governing within exact applicable scope |
| Proposed or Architecture Draft | Unratified design | Analysis input only |
| Verified implementation record | Evidence of what exists or was tested | Descriptive; no constitutional authority |
| Operational record | Current system/process state | Descriptive unless separately authorized |
| Noncanonical reviewed handoff | Structured reviewed input | No authority through compilation |
| Source recovery | Preserved historical text | Never canonical by status alone |
| External AEOS package record | Exact package/certification evidence | External technical input; no OwnerPilot authority or canonical status through import |
| Unknown or disputed | Status/applicability unresolved | Fail closed |

Artifact class alone never resolves precedence.

## 4. Governance baseline

### 4.1 Founder direction

- AEOS is the Founder-designated external source of reusable business-neutral
  executives.
- AEOS package authority, certification, or canonical status within AEOS does
  not create OwnerPilot constitutional, implementation, runtime, Preview,
  Production, or activation authority.
- An external AEOS package is not OwnerPilot-canonical unless separately
  adopted through OwnerPilot governance.
- OwnerPilot must not maintain a competing generic executive.
- OwnerPilot owns specialization and enforcement.
- the current OwnerPilot CAO remains untouched;
- the merged Generic CAO's long-term disposition remains reserved for Founder
  decision;
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

## 5. Enterprise, intelligence, and recommendation architecture

| Source | Audited status | Candidate use |
|---|---|---|
| `constitution/enterprise/EA-100_ownerpilot_enterprise_architecture.md` | Ratified | All roles; capability map |
| `constitution/architecture/EA-101_ownerpilot_cognitive_architecture.md` | Ratified v0.2 | Recommendation-producing roles |
| `constitution/architecture/EA-102_closed_loop_learning_architecture.md` | Ratified v0.2; bounded implementation authority | Learning/evaluation relationships |
| `constitution/architecture/EA-012_constitutional_intelligence_layer.md` | Proposed | Design input only until later ratification |
| `constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md` | Ratified v1.1 | Evidence, trust, options, OCM-001 comparison, RQS §3.7.1, communication |
| `constitution/enterprise/RPT-014_RQS_OCM-001_reconciliation_memorandum.md` | Operational reconciliation record | Records Founder reconciliation through ADR-015; does not replace governing artifacts |
| `constitution/adr/adr_log.md#ADR-015` | Accepted; not superseded | OCM-001 controls; RQS qualitative-first; quality/confidence separate; no averaging away critical failures |
| `constitution/adr/adr_log.md#ADR-017` | Accepted; not superseded | Reaffirms ADR-015 and prohibits composite readiness/recommendation-quality scoring; anti-corruption boundary pending recommendation contracts |
| `constitution/adr/adr_log.md#ADR-019` | Accepted; not superseded | Reserves RCO-001 and DECG-001 identifiers; does not create or ratify their content |
| `constitution/implementation-specs/recommendation_object_spec_v0.1.md` | Drafting input and migration reference | Nonconstitutional; not ratified RCO-001 |
| `constitution/implementation-specs/decision_graph_spec_v0.1.md` | Drafting input and migration reference | Nonconstitutional; not ratified DECG-001 |
| `constitution/architecture/REG-CAP-001_capability_registry.md` | Ratified in current ADR/STATUS record | Capability registration; no parallel registry |

### 5.1 Recommendation controls that remain mandatory

- BTRM-001 §3.7 treats OCM-001 as the controlling qualitative outcome-comparison
  doctrine within ratified BTRM-001; the separate OCM-001 component CRID remains
  reserved-planned pending individual ratification.
- RPT-014 is an Operational reconciliation record; its ratification authority
  is ADR-015.
- Recommendation quality and confidence remain distinct and may not be merged.
- Critical failures may not be mathematically averaged away.
- No universal composite recommendation-quality score may independently rank,
  approve, reject, select, execute, or represent the correctness of a material
  recommendation.
- RCO-001 and DECG-001 are reserved identifiers under ADR-019, not ratified
  content. Their current implementation specs remain noncanonical drafting
  inputs and migration references only.
- Any later ADR affecting recommendation architecture must be located, its
  status and supersession established, and its scope reconciled before use. An
  uncertain later status is `unresolved`, not silently inferred.

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
| `lib/agents/genericCaoContract.ts` | Current compatibility and historical-reference generic contract |
| `lib/agents/genericCaoBusinessAdapter.ts` | Reference-only compatibility adapter |
| `lib/agents/ownerPilotCaoSpecialization.ts` | Nonexecuting current-state mapping |
| `docs/architecture/executive-agents/generic_cao_boundary_pr_b_review_packet_2026-08-06.md` | Noncanonical review evidence |
| associated tests | Deterministic boundary evidence |

The merged Generic CAO boundary is a current OwnerPilot compatibility and
historical-reference model. Its long-term disposition—including preservation,
coexistence, contribution upstream, differential portability testing, or
migration—remains reserved for Founder decision.

These sources may support comparison and other separately approved analysis.
They do not select or authorize preservation, coexistence, contribution,
migration, replacement, or another long-term disposition.

### 7.2 Current CAO Preview sources

| Source | Treatment |
|---|---|
| `lib/agents/caoPreviewRegistry.ts` | Current runtime registry; preserve unchanged |
| `lib/agents/caoRepositoryEvidence.ts` | Current evidence-scope record |
| `lib/agents/executiveAgentRegistry.ts` | Current role/charter registry |
| `docs/agents/charters/chief_architecture_officer.md` | Current charter |
| Preview route, gate, runner, model, and UI sources | Existing runtime; outside OPEP modification scope |

A future CAO manifest must distinguish the current runtime, the compatibility
boundary, and any future AEOS package without presuming migration.

## 8. PR #348 and possible future OPMA sources

| Source | Status | OPEP treatment |
|---|---|---|
| PR #348 supporting draft | Draft, noncanonical | Historical context and valid nonauthority rules; no merge or conforming work authorized |
| PR #348 review packet | Draft, noncanonical | Review record; no mutation authorized |
| possible future OPMA-000 | Not created or adopted by this package | Potential future map only |
| OPEP-000 | Current noncanonical package | Proposed for possible future placement beneath OPMA-000 |

No formal OPEP–OPMA parent-child relationship exists unless OPMA-000 is
created, reviewed, and separately approved.

PR #348 remains Draft. No merge is authorized. No conforming addendum is
authorized in this revision round. Exact conforming language must follow a
separate Founder disposition after OPEP review, and historical text must not be
silently rewritten.

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

### 9.4 CLO invariants and legal-review separation

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

Portability validation does not establish legal correctness, legal sufficiency,
permissible product behavior, or authority to provide jurisdiction-specific
guidance. Those determinations require separately authorized OwnerPilot legal
and product-control review.

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
- uncertain long-term Generic CAO disposition;
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

Portability validation does not establish legal correctness, legal sufficiency,
permissible product behavior, or jurisdiction-specific guidance authority.

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

**Exact candidates and status treatment**

- `constitution/architecture/EA-101_ownerpilot_cognitive_architecture.md` —
  Ratified v0.2;
- `constitution/architecture/EA-102_closed_loop_learning_architecture.md` —
  Ratified v0.2 with bounded implementation authority;
- `constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md`
  §3.7/§3.7.1 — Ratified v1.1; OCM-001 controls qualitative comparison within
  BTRM-001; separate OCM-001 CRID remains reserved-planned;
- `constitution/enterprise/RPT-014_RQS_OCM-001_reconciliation_memorandum.md`
  — Operational reconciliation record supporting ADR-015;
- `constitution/adr/adr_log.md#ADR-015` — Accepted and not superseded;
- `constitution/adr/adr_log.md#ADR-017` — Accepted and not superseded; later
  controlling reinforcement of ADR-015 and anti-corruption constraints;
- `constitution/adr/adr_log.md#ADR-019` — Accepted and not superseded; RCO-001
  and DECG-001 reserved only;
- `constitution/implementation-specs/recommendation_object_spec_v0.1.md` —
  nonconstitutional drafting input and migration reference only;
- `constitution/implementation-specs/decision_graph_spec_v0.1.md` —
  nonconstitutional drafting input and migration reference only; and
- any later applicable ADR only after exact status, scope, and supersession are
  verified.

**Controlling rules**

- recommendation quality and confidence remain distinct;
- critical failures may not be mathematically averaged away;
- no universal composite recommendation-quality score may control a decision;
- numeric telemetry may not independently rank, approve, reject, select, or
  execute a material recommendation;
- RCO-001/DECG-001 content remains unresolved until separately drafted,
  reviewed, and ratified; and
- provenance, dissent, human review, and no inferred implementation authority
  remain required.

**Fail closed on**

- uncertain or conflicting source status;
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

Precedence cannot be calculated from the authority class alone. The complete
nonmechanical rule in §1 applies to every manifest reference.

## 13. Audit findings requiring future resolution

1. Generated constitutional indexes are not demonstrably complete for the
   audited commit.
2. PR #348's AEOS direction is outdated, but PR #348 remains Draft and no
   conforming amendment or merge is authorized.
3. The Generic CAO's long-term disposition remains reserved among preservation,
   coexistence, upstream contribution, differential portability testing,
   migration, or another Founder-selected option.
4. Legal file authority cannot be inferred from names.
5. EA-012 is Proposed while later artifacts reference it; preserve actual
   status.
6. RCO-001, DECG-001, OPOS-001, and FIE-001 are reserved/future, not current
   ratified content unless later established.
7. No AEOS package, digest, certification, or RA-001 record was present in the
   OwnerPilot audit.
8. AEOS certification cannot be represented as OwnerPilot acceptance or
   OwnerPilot canonical status.
9. OPEP is only proposed for possible future placement beneath OPMA-000; no
   formal relationship currently exists.

No finding authorizes remediation in this branch.
