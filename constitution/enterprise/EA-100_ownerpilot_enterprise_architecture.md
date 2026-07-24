---
constitutional_id: EA-100
object_type: enterprise_architecture
title: OwnerPilot Enterprise Architecture
status: Architecture Draft
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-000
ratification_authority: Founder
lifecycle_state: Architecture Draft
created: 2026-07-24
updated: 2026-07-24
depends_on: [EA-000, MAP-001, REG-CAP-001]
required_by: [ECAP-001, ECAP-002, ECAP-003, ECAP-004, ECAP-005, ECAP-006, ECAP-007, ECAP-008, ECAP-009, ECAP-010, ECAP-011, ECAP-012]
implements: [EA-000]
governed_by: [EA-000]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [REG-CAP-001, EA-010]
registry_tags: [enterprise, ownerpilot, capability-model]
program_phase: enterprise-D
repository_path: constitution/enterprise/EA-100_ownerpilot_enterprise_architecture.md
checksum_scope: file
---

# EA-100 — OwnerPilot Enterprise Architecture

**The enterprise built on the Constitution.** EA-100 is the application-layer architecture that governs OwnerPilot's business capabilities. It sits *under* the constitutional meta-architecture (governed by EA-000) and *on top of* the Capability Registry (REG-CAP-001): every OwnerPilot capability is a governed constitutional object, traceable to governance, queryable through the constitutional platform. **This is modeling, not implementation** — capabilities describe identity, ownership, dependencies, and runtime bindings; the business logic already lives in the OwnerPilot application and is unchanged by this artifact. Lifecycle: Architecture Draft, awaiting Founder ratification.

## Enterprise capability taxonomy
| ECAP | Capability | Category | Owner | Maturity |
|---|---|---|---|---|
| ECAP-001 | AI Assistant | Guidance | Product | operational |
| ECAP-002 | Document Generation | Production | Product | operational |
| ECAP-003 | Serve & Track | Production | Product | operational |
| ECAP-004 | RiskPath | Guidance | Product | operational |
| ECAP-005 | Property Intelligence | Data | Engineering | operational |
| ECAP-006 | Pricing Intelligence | Data | Product | concept |
| ECAP-007 | Compliance Guidance | Governance | Product | operational |
| ECAP-008 | Workflow Automation | Platform | Engineering | operational |
| ECAP-009 | Communication | Platform | Engineering | operational |
| ECAP-010 | Evidence Management | Governance | Engineering | operational |
| ECAP-011 | Reporting | Insight | Product | proposed |
| ECAP-012 | Customer Portal | Access | Product | operational |

## Runtime map (Phase E)
Each capability declares its runtime bindings, data ownership, and security boundary in its own metadata (`runtime_bindings`, `security_classification`). The complete, queryable runtime map is the generated `index/capability_index.json` (CBS-001). Summary dimensions per capability: **runtime services · data ownership · AI organization · security boundary · validation authority (CA-001) · auditability (Evidence Management, ECAP-010) · deployment ownership.** No runtime service is modified by this artifact; bindings are descriptive references to existing OwnerPilot surfaces.

## Governance & constraints
Governed by EA-000; validated by CBS-001 + CA-001; capabilities registered via REG-CAP-001 (no parallel registry). Honors the standing holds: **no new intelligence models** (TM-001/CM-001 remain Proposed and undesigned), **no business-logic change**, **no destructive migration**. Enterprise capabilities are additive governed metadata over the existing application.

## Relationship to the Constitution
EA-000 → MAP-001 → REG-CAP-001 → **EA-100** → ECAP-001…012. The Constitution governs; EA-100 is the first artifact whose subject is the *business* rather than the governance mechanism — the pivot point from constitutional infrastructure to enterprise capability.
