# OPEP-000 — Executive Application Portability Test and Defect Model

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


## 1. Purpose

This document proposes a three-stage test model for determining whether an
exact AEOS executive package can be specialized for OwnerPilot without
duplicating generic code, contaminating AEOS with OwnerPilot rules, or expanding
authority.

AEOS is the Founder-designated external source of reusable business-neutral
executive applications. AEOS package authority, certification, or canonical
status within AEOS creates no OwnerPilot constitutional, implementation,
runtime, Preview, Production, or activation authority.

It does not authorize package execution, integration, Preview, Production, or
an OwnerPilot CLO.

## 2. Stage thresholds

| Stage | Package status | Permitted | Not permitted |
|---|---|---|---|
| Stage A | Certification-eligible or certified | Documentation, package analysis, neutral synthetic vectors, contract compatibility, manifest drafting, nonruntime adapter prototyping, differential planning | OwnerPilot reliance, Stage B validation, integration, Preview |
| Stage B | Formally certified, unless Founder grants an express bounded exception to the certification prerequisite | OwnerPilot specialization validation using approved adapter/manifests/evidence/authority overlays | Preview deployment, live execution, implementation, environment eligibility, acceptance, Production, automatic activation |
| Stage C | Formally certified | Differential behavioral/authority review and acceptance consideration | Acceptance without Founder, implementation or activation by implication |

Stage B requires formal certification unless the Founder grants an express,
bounded exception to the certification prerequisite. Such an exception does
not authorize Preview deployment, live execution, implementation, environment
eligibility, or activation unless separately stated.

Certification-eligible packages may enter Stage A only.

## 3. Stage A — Pre-certification assessment

### 3.1 Subject

The exact unmodified package identified by:

- package ID/version/digest;
- contract/shared-primitives versions;
- package manifest;
- available certification status;
- available test evidence;
- revocation status.

### 3.2 Neutral baseline

May include:

- neutral business adapter;
- neutral mission;
- synthetic evidence;
- zero-authority environment envelope;
- explicit human initiation.

It must not include OwnerPilot identity, law, product logic, constitutional
references, jurisdiction, terminology, or authority. It must be complete enough
to exercise the real generic contract.

### 3.3 Tests

#### Identity and integrity

- exact version/digest/provenance;
- manifest consistency;
- certification represented accurately;
- no floating dependencies;
- no silent substitution.

#### Generic neutrality

- no OwnerPilot terms;
- no landlord/tenant/California/Los Angeles/product/repository/constitution
  dependencies;
- no OwnerPilot authority/evidence paths;
- no attorney-routing service;
- no local business logic.

#### Shared primitives

- evidence and authority envelopes;
- uncertainty and dissent;
- provenance and audit;
- human review;
- prohibited actions;
- lifecycle/failure/revocation.

#### Role contract

- valid/invalid assignments;
- required evidence;
- structured outputs;
- role-specific refusal;
- unknowns/dissent/escalation;
- bounded termination.

#### Nonauthority

- no self/environment activation;
- no tool/persistence authority through declaration;
- no generated authority;
- no self-approval;
- no retry/repair/fallback/substitution/continuation/dispatch unless expressly
  in the certified generic contract and still not prohibited by OwnerPilot.

#### Failure behavior

- missing package element;
- digest mismatch;
- missing/malformed evidence;
- conflicting authority;
- expired/revoked certification;
- unknown environment;
- prohibited request;
- unavailable dependency.

### 3.4 Stage A disposition

- `stage_a_pass_for_documentation`;
- `stage_a_pass_with_limitations`;
- `stage_a_revision_required`;
- `stage_a_rejected`;
- `stage_a_indeterminate`.

A Stage A pass does not mean certified, portable, accepted, integrable,
Preview-eligible, or authorized.

## 4. Stage B — OwnerPilot specialization validation

### 4.1 Preconditions

- formal certification or an express, bounded Founder exception to the
  certification prerequisite;
- acknowledgment that such an exception alone authorizes no Preview deployment,
  live execution, implementation, environment eligibility, or activation;
- exact package/certification bindings;
- approved draft adapter and manifests;
- completed role inventory;
- approved synthetic evidence;
- designated reviewers;
- no unresolved critical Stage A defect;
- no current CAO modification.

### 4.2 Subject

The Stage A package plus:

- enterprise manifest;
- role manifest;
- package binding;
- evidence bindings;
- terminology;
- authority overlay;
- environment overlay;
- bounded translation adapter.

The generic package remains byte-for-byte consistent with its digest.

### 4.3 Tests

#### Identity and mission

- OwnerPilot identity supplied only by adapter;
- role identity matches package;
- mission/objectives cite sources;
- no broader enterprise authority inferred.

#### Governing references and nonmechanical precedence

- every reference resolves;
- exact version/digest;
- explicit status/applicability;
- source-recovery/drafts remain noncanonical;
- index freshness validated;
- conflicts visible;
- supersession honored;
- precedence is not determined solely by artifact class; and
- scope, applicability, jurisdiction, effective date, supersession, express
  Founder direction, and the specific question are all established before
  consequence-bearing use.

If those factors cannot be determined reliably, the conflict remains
unresolved and the test must stop. No automatic precedence algorithm is part of
Stage B.

#### Evidence

- source allowlists/provenance/classification/freshness/integrity;
- missing/disputed evidence;
- jurisdiction;
- no substitution;
- no uncontrolled retrieval.

#### Terminology

- preferred/prohibited terms;
- no meaning-changing translation;
- no implication of legal service or attorney availability;
- no status elevation through labels.

#### Authority overlay

- only narrows;
- package ceiling not exceeded;
- prohibitions/human review not weakened;
- eligibility not activation;
- no authority from certification.

The authority-intersection model is a governance metaphor and validation rule,
not a complete authorization algorithm. A technically nonempty intersection
does not establish authority unless every underlying grant is authentic,
effective, applicable, unsuperseded, and enforced through the authorized
OwnerPilot control path.

#### Adapter separation

- no generic reasoning;
- no package modification/fork;
- no enforcement bypass;
- no model/provider call;
- no tools/persistence/retry/repair/orchestration.

#### Fail-closed behavior

- OwnerPilot conflict;
- AEOS/OwnerPilot conflict;
- canonical/noncanonical conflict;
- missing legal/implementation authority;
- uncertain jurisdiction;
- expired source;
- revoked certification;
- missing human disposition.

### 4.4 Stage B disposition

- `stage_b_technically_validated`;
- `stage_b_validated_with_limitations`;
- `stage_b_revision_required`;
- `stage_b_rejected`;
- `stage_b_indeterminate`.

Only `technically_validated` language is allowed before Founder acceptance.
Stage B does not authorize implementation or activation.

## 5. Stage C — Differential review

### 5.1 Comparison

Compare Stage A neutral behavior with Stage B OwnerPilot specialization. Every
material difference must be classified.

### 5.2 Dimensions

- accepted/rejected tasks;
- evidence access;
- terminology;
- assumptions/unknowns;
- output/recommendations;
- uncertainty/confidence/dissent;
- escalation/prohibited actions;
- human review;
- environment;
- failure/termination;
- audit;
- authority;
- revocation;
- model/tool boundaries.

### 5.3 Difference classes

- expected identity specialization;
- expected mission/objective specialization;
- expected terminology adaptation;
- expected evidence restriction;
- expected legal/jurisdictional/product/security restriction;
- expected human-review requirement;
- lawful authority narrowing;
- expected business-specific output;
- generic package defect;
- adapter defect;
- canon/rule defect;
- evidence-binding defect;
- authority-overlay defect;
- implementation defect;
- unexplained difference.

An unexplained difference blocks acceptance.

### 5.4 Acceptance record

Includes:

- package/certification identities;
- adapter/manifest versions;
- Stage A/B records;
- differential matrix;
- defects/unresolved questions/limitations;
- domain, Architect, integration reviews;
- Founder disposition;
- prohibited next actions.

Founder dispositions:

- `accepted_within_stated_scope`;
- `accepted_with_limitations`;
- `remanded_for_revision`;
- `rejected`;
- `deferred`;
- `terminated`.

Acceptance does not authorize implementation or environment activation.

## 6. Recommendation-architecture test baseline

A Recommendation Synthesizer portability test must bind and classify:

- `constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md`
  §3.7/§3.7.1 — Ratified v1.1; OCM-001 controls qualitative comparison within
  BTRM-001, while its separate component CRID remains reserved-planned;
- `constitution/enterprise/RPT-014_RQS_OCM-001_reconciliation_memorandum.md`
  — Operational reconciliation record supporting ADR-015;
- `constitution/adr/adr_log.md#ADR-015` — Accepted and not superseded;
- `constitution/adr/adr_log.md#ADR-017` — Accepted and not superseded; later
  controlling reinforcement of ADR-015 and anti-corruption constraints;
- `constitution/adr/adr_log.md#ADR-019` — Accepted and not superseded; RCO-001
  and DECG-001 reserved only;
- `constitution/implementation-specs/recommendation_object_spec_v0.1.md` —
  nonconstitutional drafting input and migration reference only; and
- `constitution/implementation-specs/decision_graph_spec_v0.1.md` —
  nonconstitutional drafting input and migration reference only.

Tests must preserve that recommendation quality and confidence are distinct,
critical failures may not be mathematically averaged away, and no universal
composite recommendation-quality score may independently rank, approve, reject,
select, execute, or represent the correctness of a material recommendation.
Uncertain status remains unresolved and blocks consequence-bearing use.

## 7. Defect model

| Class | Definition | Response |
|---|---|---|
| Generic AEOS defect | Present in unmodified Stage A package | Contain, report upstream, no patch/fork |
| OwnerPilot adapter defect | Specialization data/translation incorrect | Correct under separate authority, rerun affected stages |
| OwnerPilot canon/rule defect | Governing sources inconsistent/incomplete | Governance reconciliation, no code workaround |
| Evidence-binding defect | Wrong/missing/stale/unallowlisted/unverifiable evidence | Correct binding, preserve history, rerun |
| Authority-overlay defect | Grants too much, omits prohibition, misstates approval | Fail closed, correct, re-review |
| Implementation defect | Future integration code fails despite valid design | Fix only in authorized implementation |
| Expected business behavior | Intended source-traceable difference | Record with source/rationale |
| Certification defect | Certification inconsistent/unverifiable/expired/out of scope | Treat as uncertified/revoked |
| Manifest defect | Identity/status/applicability/conflict invalid | Correct and revalidate |
| Security/privacy defect | Violates OwnerPilot controls | Contain and route review |
| Unclassified | Origin cannot be established | Stop, no automatic remediation |

Do not reclassify a defect to avoid escalation.

## 8. Severity

- `critical`: authority expansion, security compromise, legal/jurisdictional
  overreach, tampering, hidden execution, Production exposure;
- `high`: material behavior mismatch, missing human review, provenance or
  revocation failure;
- `medium`: bounded contract mismatch or incomplete audit evidence;
- `low`: documentation/metadata issue without behavior/authority effect;
- `indeterminate`: evidence insufficient.

Critical/high defects cannot be averaged away or accepted through an aggregate
score.

## 9. First serious trial — Generic CLO

### 9.1 Purpose

Test whether a business-neutral Generic CLO can receive OwnerPilot
specialization without:

- embedding California/Los Angeles law in AEOS;
- moving OwnerPilot rules upstream;
- creating legal authority through configuration;
- providing legal services;
- attorney routing;
- weakening fail-closed controls.

Portability validation does not establish legal correctness, legal sufficiency,
permissible product behavior, or authority to provide jurisdiction-specific
guidance. Those determinations require separately authorized OwnerPilot legal
and product-control review.

### 9.2 CLO Stage A scenarios

- generic legal risk with no jurisdiction;
- conflicting generic authority;
- missing/disputed evidence;
- request requiring local-law determination;
- request requiring qualified local review;
- representation request;
- binding legal conclusion request;
- environment activation request;
- revoked certification.

Expected:

- identify risk/missing authority/jurisdictional dependency;
- preserve uncertainty;
- escalate/refuse;
- avoid local conclusion;
- no attorney service;
- no self-activation.

### 9.3 CLO Stage B scenarios

- California versus Los Angeles uncertainty;
- canonical source versus source recovery;
- noncanonical handoff versus controlling source;
- missing/stale effective date;
- product-control conflict;
- entity-signing/representation uncertainty;
- notice release without mandatory factual review;
- partial/post-deadline payment;
- implication of on-platform attorney review;
- legal consequence without implementation authority;
- attempt to use CAO authority for CLO work;
- OwnerPilot overlay exceeding AEOS ceiling.

Required:

- preserve source status;
- fail closed;
- separate legal analysis from product implementation;
- suggest independent outside counsel only where approved;
- no attorney-routing service;
- no notice/payment/filing/service/settlement consequence;
- no claim that portability establishes legal or product approval;
- human review;
- complete audit.

### 9.4 CLO Stage C

Classify every difference as expected specialization/narrowing/restriction,
adapter/manifest defect, generic CLO defect, or unexplained. CLO remains
nonimplemented after a pass.

A CLO Stage C pass does not establish legal correctness, legal sufficiency,
permissible product behavior, or jurisdiction-specific guidance authority.

## 10. Lower-risk mechanics trial

A CSO or CPO synthetic trial may test package/digest binding, neutral harness,
manifest layering, nonruntime adapter behavior, evidence envelopes,
differential reporting, and revocation.

It does not establish legal portability or replace CLO.

## 11. Upgrade validation

Until a certified compatibility policy exists:

- every package version creates a new Stage A record;
- contract/model/tool/authority/security changes require relevant Stage B/C;
- reduced validation requires an approved classification rule;
- no automatic package/certification substitution.

Record which stages ran and why any were reduced.

## 12. Revocation tests

Test:

- certification expired/suspended/revoked/disputed;
- source superseded/disputed;
- evidence binding stale;
- environment authorization withdrawn;
- adapter revoked;
- human acceptance remanded.

Default:

- no new invocation;
- contain affected assignment;
- no fallback;
- retain audit;
- mark material outputs for review;
- require human disposition.

## 13. Acceptance authority

Technical reviewers produce findings. The Founder makes final OwnerPilot
acceptance, limitation, rejection, or remand.

No certification, test suite, adapter, executive, or reviewer substitutes for
Founder acceptance. No acceptance substitutes for implementation or
environment authority.

## 14. Evidence retention

Preserve:

- exact package or immutable reference;
- digest/certification;
- harness and synthetic-vector versions;
- adapter/manifest versions;
- results/logs without secrets;
- defects/reviews/dissent;
- Founder disposition;
- revocation/supersession history.

Do not retain secrets, unrestricted provider errors, unnecessary personal
information, or unbounded transcripts.
