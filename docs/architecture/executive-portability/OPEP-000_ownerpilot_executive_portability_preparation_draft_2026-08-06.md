# OPEP-000 — OwnerPilot Executive Portability Preparation

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

OPEP-000 prepares OwnerPilot to receive, specialize, validate, govern, upgrade,
contain, and, only after separate authorization, integrate reusable
business-neutral executive applications supplied by AEOS.

OPEP-000 is a proposed subordinate architecture and portability-preparation
package beneath a future OPMA-000 enterprise-wide architectural map.

It is documentation only. It does not install a package, create a runtime,
activate an executive, modify the current OwnerPilot CAO, change Preview or
Production, or create authority.

## 2. Controlling Founder direction

> Reusable generic executive capability belongs in AEOS. OwnerPilot-specific
> specialization belongs in OwnerPilot.

AEOS is the intended canonical source of reusable business-neutral executive
applications, including the Generic CAO, CLO, CSO, CFO, CPO, COO, and
Recommendation Synthesizer.

OwnerPilot must not independently fork, recreate, or evolve a competing generic
executive application.

OwnerPilot may own and maintain:

- business adapters;
- governing-reference manifests;
- evidence bindings;
- terminology mappings;
- authority overlays;
- OwnerPilot-specific enforcement;
- OwnerPilot-specific validation;
- portability-validation records; and
- temporary compatibility shims only when separately governed and scheduled
  for removal.

AEOS certification does not authorize installation, specialization, runtime
use, Preview activation, Production eligibility, or operation in OwnerPilot.
OwnerPilot remains independently governed.

## 3. Current verified facts

### 3.1 Repository baseline

The read-only audit used OwnerPilot `main` at:

`35e6f256fa7103c1ed54d67c3fa64e65065d3e53`

This commit is the squash merge of PR #346, which added the current
business-neutral Generic CAO contract boundary and OwnerPilot specialization.

### 3.2 Constitutional and enterprise sources

The repository contains:

- ratified EA-000 Constitutional Meta-Architecture;
- ratified MAP-001 Canonical Architecture Mapping;
- ratified EA-100 OwnerPilot Enterprise Architecture;
- proposed EA-012 Constitutional Intelligence Layer;
- ratified EA-101 OwnerPilot Cognitive Architecture;
- ratified EA-102 Closed-Loop Learning Architecture;
- ratified BTRM-001 and associated reasoning components;
- accepted ADRs through at least ADR-019 in the operative files and STATUS
  record; and
- constitutional indexes generated on 2026-07-26.

The audit identified a freshness limitation: the generated
`constitution/index/ea_index.json` lists only EA-000, EA-010, EA-012, and
EA-100, while the repository also contains ratified EA-101 and EA-102.
Likewise, `constitution/index/adr_index.json` lists ADR-001 through ADR-015,
while operative sources reference accepted ADR-016 through ADR-019.

A future Governing Reference Manifest may use generated indexes for discovery,
but it may not treat an index as complete or current without freshness,
coverage, and cross-reference validation against operative artifact files.

### 3.3 Existing OwnerPilot Generic CAO boundary

The merged boundary consists of:

- `lib/agents/genericCaoContract.ts`
  - `generic-cao-contract-v1`;
- `lib/agents/genericCaoBusinessAdapter.ts`
  - `generic-cao-business-adapter-v1`;
- `lib/agents/ownerPilotCaoSpecialization.ts`
  - `ownerpilot-cao-specialization-v1`;
- associated deterministic tests; and
- `docs/architecture/executive-agents/generic_cao_boundary_pr_b_review_packet_2026-08-06.md`.

It is nonexecuting, reference-based, and not consumed by the current OwnerPilot
CAO Preview runtime.

Under the Founder direction, this boundary is:

> a temporary compatibility and historical reference model pending governed
> migration to a version-pinned AEOS Generic CAO package.

It must not become a second independently evolving generic executive.

It may support current-state documentation, comparison, compatibility and
migration-risk analysis, and identification of potential upstream
contributions. No replacement, contribution, transfer, or reconciliation is
authorized by this draft.

### 3.4 Current validated OwnerPilot CAO

The current CAO Preview registry remains separately governed. At the audit base
it is:

- role: `executive.chief_architecture_officer`;
- registry version: `executive-agent-cao-preview-registry-v1`;
- approval reference: `founder-omnibus-preview-integration-2026-08-02`;
- eligible environment: Preview only;
- Production eligibility: none;
- explicit human initiation and Founder approval: required;
- output disposition: draft only;
- tools: default deny, no allowed tools;
- automatic fallback/provider substitution: prohibited; and
- automatic continuation: not authorized.

OPEP-000 does not modify, replace, repackage, narrow, expand, orchestrate, or
migrate this CAO. A later CAO portability comparison or migration requires
separate Founder authorization.

### 3.5 PR #348

PR #348 is a Draft PR at exact head:

`20629162b71db6b9d7903d330210b048ae9d7a14`

Its nonauthority rules remain useful and consistent with OPEP, including:

- description is not authority;
- schema validity is not authorization;
- an adapter cannot grant authority;
- validation must fail closed;
- human silence is not approval;
- runtime consumption requires separate authorization; and
- authority may only narrow downstream.

However, PR #348 also states that AEOS is only an external comparison source
and that whether AEOS compatibility is desirable remains a future decision.
Those forward-looking statements conflict with the later Founder direction.

### 3.6 PR #348 recommended disposition

The cleanest treatment is:

1. keep PR #348 open and Draft;
2. do not merge it in its current form;
3. preserve its original historical drafting context;
4. after OPEP-000 Founder review, add a narrowly bounded conforming addendum or
   revision to both PR #348 documents;
5. state that:
   - AEOS was treated as an external comparison source in the dated PR C
     context;
   - the Founder later approved AEOS as the reusable platform for generic
     executives;
   - OwnerPilot remains independently governed;
   - AEOS artifacts create no OwnerPilot authority;
   - future integration proceeds only through OPEP controls; and
   - PR #348 itself does not implement or activate that relationship.

This preserves history and valid boundary work. Replacing PR #348 would discard
useful nonauthority analysis. Silently rewriting it would obscure history.

No PR #348 modification is included in this OPEP branch.

## 4. Architectural position beneath OPMA

```text
Future OPMA-000
Enterprise-wide OwnerPilot architectural map
                    |
                    v
OPEP-000
Executive-application receiving, specialization, portability,
validation, upgrade, containment, and lifecycle architecture
                    |
        +-----------+------------+
        |                        |
        v                        v
AEOS package boundary      OwnerPilot specialization boundary
        |                        |
        +-----------+------------+
                    |
                    v
Portability validation and Founder disposition
                    |
                    v
Separate implementation authorization
                    |
                    v
Separate Preview eligibility and activation
                    |
                    v
Separate Production eligibility and activation
```

OPEP-000 is not yet an independent EA, operational standard, certification
registry, executable specification, package manager, loader, or orchestration
layer.

## 5. Executive receiving architecture

| AEOS application | OwnerPilot receiving target | OPEP posture | Specialization focus |
|---|---|---|---|
| Generic CAO | OwnerPilot CAO | Current CAO preserved; future comparison only | Architecture canon, evidence, dissent, no implementation authority |
| Generic CLO | OwnerPilot CLO | First serious trial; no implementation | Source status, jurisdiction, product controls, no legal-service or attorney-routing behavior |
| Generic CSO | OwnerPilot CSO | Future | Mission, strategy, OPOS, alternatives, no binding decision |
| Generic CFO | OwnerPilot CFO | Future | Financial evidence, pricing/payment controls, no money movement |
| Generic CPO | OwnerPilot CPO | Future | Product architecture, OPIL, ECAPs, legal/product boundary |
| Generic COO | OwnerPilot COO | Future | Operations and controls, no autonomous action |
| Generic Recommendation Synthesizer | OwnerPilot Recommendation Synthesizer | Future | Recommendation Objects, Decision Graphs, BTRM, RQS, no automatic winner |

A receiving target is not an implemented role.

## 6. Layer ownership and contamination boundaries

| Layer | Owner | Permitted contents | Prohibited effects |
|---|---|---|---|
| AEOS executive primitives | AEOS | Identity, evidence, authority, uncertainty, dissent, provenance, audit, lifecycle, revocation | OwnerPilot law, products, jurisdictions, terminology, or authority |
| AEOS role package | AEOS | Generic role contract, outputs, tests, restrictions | OwnerPilot-specific logic or local legal conclusions |
| AEOS certification | AEOS process | Exact package/digest, tested scope, status, limits | OwnerPilot installation, acceptance, or activation authority |
| OwnerPilot Business Adapter | OwnerPilot | Context, mission, objectives, terminology, references, bounded translation | Generic logic, authority creation, enforcement bypass |
| Governing Reference Manifest | OwnerPilot | Exact source status, version, applicability, conflicts, limits | Draft elevation, silent conflict resolution |
| Evidence bindings | OwnerPilot | Allowlists, provenance, integrity, freshness | Uncontrolled retrieval or fabricated completeness |
| Authority overlay | OwnerPilot | Additional prohibitions and narrower permissions | Broader authority |
| Runtime enforcement | OwnerPilot | Authentication, authorization, security, legal and environment gates | Reliance on a manifest assertion as enforcement |
| Portability validation | OwnerPilot | Stage A–C evidence and human review | Self-approval or automatic progression |
| Environment activation | Founder-authorized OwnerPilot process | Explicit bounded environment decision | Inference from certification, validation, or silence |

## 7. Authority-intersection rule

Effective authority is the intersection, never the union, of:

```text
AEOS package capability ceiling
∩ AEOS package restrictions
∩ AEOS certification scope
∩ OwnerPilot constitutional authority
∩ OwnerPilot role authority
∩ OwnerPilot legal and jurisdictional controls
∩ OwnerPilot product and security controls
∩ approved evidence scope
∩ environment-specific authorization
∩ explicit human authorization
```

A missing, disputed, stale, unverifiable, or empty intersection produces no
authorization. An adapter may preserve or narrow authority, never broaden it.

## 8. Package and specialization lifecycle

```text
Candidate AEOS package
        |
        v
Identity, digest, contract, certification-status verification
        |
        v
Stage A — pre-certification documentation and synthetic assessment
        |
        v
Formal certification or separate bounded Stage B exception
        |
        v
Stage B — OwnerPilot specialization validation
        |
        v
Stage C — differential review and acceptance consideration
        |
        v
Founder disposition
        |
        v
Separate implementation initiative
        |
        v
Separate Preview authorization
        |
        v
Separate Production authorization
```

Certification-eligible packages may enter Stage A only.

## 9. Generic CLO first serious trial

The Generic CLO is the first proposed serious portability trial because
OwnerPilot's legal, jurisdictional, product-control, and governance environment
is a demanding test of AEOS neutrality.

The trial may begin only after a stable Generic CLO contract, exact version and
digest, explicit certification status, approved OPEP architecture, defined
evidence/authority overlays, and separate synthetic or Preview authorization.

The Generic CLO may support generic legal-risk identification, issue
classification, authority/evidence analysis, jurisdiction-dependency
identification, questions requiring qualified local review, and alternative
risk treatments.

It must not embed California law, Los Angeles rules, OwnerPilot product
controls, legal representation, attorney-routing services, autonomous legal
decisions, or unsupported jurisdiction-specific conclusions.

A lower-risk CSO or CPO synthetic scenario may test mechanics earlier. It does
not replace CLO as the first serious trial.

## 10. Current facts, proposals, and unresolved matters

### Current facts

- AEOS is the approved future source of reusable generic executives.
- OwnerPilot remains independently governed.
- The current OwnerPilot CAO remains unchanged.
- The existing Generic CAO is a temporary compatibility/historical model.
- PR #348 is not merge-ready under the new AEOS direction.
- Certification-eligible packages may enter Stage A only.
- Founder acceptance is required.

### Proposed architecture

- adapters;
- layered manifests;
- evidence and authority overlays;
- exact package/certification/digest pinning;
- Stage A–C testing;
- defect classification;
- conservative upgrades;
- fail-closed revocation; and
- CLO first serious trial.

### Unresolved matters

- final AEOS package format;
- registry and signing model;
- RA-001 status and certification semantics;
- revocation interface;
- neutral Stage A harness;
- long-term Generic CAO disposition;
- final OPEP artifact class;
- manifest approval roles;
- reduced-validation compatibility policy; and
- future PR #348 conforming commit.

## 11. Proposed future ADR subjects

No ADR is created here. Proposed subjects are:

1. AEOS source exclusivity and no competing OwnerPilot generic application.
2. AEOS/OwnerPilot adapter separation.
3. Governing Reference Manifest.
4. Authority intersection and conflict treatment.
5. Version, digest, certification, upgrade, and revalidation.
6. Stage A–C tests.
7. Defect taxonomy and no-permanent-fork rule.
8. CLO first serious trial.
9. Current CAO preservation.
10. OPMA/OPEP relationship.

Actual ADR numbers require the governing allocation process.

## 12. Acceptance structure

- Architect: architecture and constitutional findings;
- integration lead: package and compatibility findings;
- domain reviewer: specialized legal/security/finance/product/operations
  findings;
- Founder: final acceptance, rejection, limitation, or remand.

A record may state `technically_validated` before Founder acceptance. It may
not state `accepted`, `authorized`, `eligible`, or `activated`.

## 13. Prohibited actions

This draft does not authorize:

- any new executive implementation;
- copying, modifying, or locally evolving an AEOS generic executive;
- AEOS dependency installation;
- a parser, loader, compiler, generator, registry, or manifest runtime;
- current CAO modification or migration;
- live model invocation;
- orchestration, dispatch, continuation, retry, repair, fallback, substitution;
- tools, persistence, or external action;
- legal or jurisdiction activation;
- notice or payment consequence;
- attorney routing;
- draft/source-recovery elevation;
- silent conflict resolution;
- constitutional adoption;
- PR #348 merge or mutation;
- any merge or Production change;
- Notion or Google Drive publication.

## 14. Future sequence — non-authorized

1. Founder and Architect review.
2. Corrections to this draft.
3. Future PR #348 conforming treatment.
4. Final OPEP artifact-class decision.
5. Exact AEOS package/certification interfaces.
6. Approved file-level manifests.
7. Stage A neutral harness.
8. Generic CLO package identification.
9. Separate Stage B authorization.
10. Stage B and C evidence.
11. Founder portability disposition.
12. Separate implementation authority.
13. Isolated Preview validation.
14. Separate Production decisions.

No automatic continuation follows.
