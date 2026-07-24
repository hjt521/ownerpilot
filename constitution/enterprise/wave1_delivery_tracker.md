---
constitutional_id: RPT-006
object_type: report
title: OwnerPilot Product Build — Wave 1 Delivery Tracker
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [EA-100, PROC-100, REG-CAP-001]
required_by: []
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [ECAP-001, ECAP-002, ECAP-003, ECAP-010]
registry_tags: [delivery, wave-1, tracker]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/wave1_delivery_tracker.md
checksum_scope: file
---

# RPT-006 — Wave 1 Delivery Tracker

**Important grounding fact:** all four Wave-1 capabilities are **already implemented in the OwnerPilot application** (built across prior engineering work). "Delivery" for Wave 1 is therefore **governance linkage + gap-closure on real code + stages 6/8/9/10 under governance** — not greenfield build. This avoids duplicate business logic (ADR-012).

## Wave 1 — status against PROC-100

| ECAP | Capability | Implementing artifacts (real) | Built? | Remaining under PROC-100 |
|---|---|---|---|---|
| ECAP-001 | AI Assistant | `app/chat`, `app/api/chat`, `lib/chat`, `lib/flow`, `lib/intake`, `lib/safety` | ✅ operational | Security Review (6) refresh · Constitutional Validation (9) · Release-under-governance (10) |
| ECAP-002 | Document Generation | `app/notice`, `app/api/documents`, `app/api/notices`, `lib/documents`, `lib/produce`, `lib/compliance`, `lib/filing` | ✅ operational | (6) locked-prose/IP review · (9) · (10) |
| ECAP-003 | Serve & Track | `lib/tracking.ts`, `lib/filing`, `app/riskpath`, `app/api/riskpath` | ✅ operational | (6) · (8) E2E coverage check · (9) · (10) |
| ECAP-010 | Evidence Management | `lib/audit`, `app/api/internal`, `lib/monitoring` | ✅ operational (append-only walls, P1-verified) | (6) already P1-audited · (9) · (10) |

## What Wave-1 delivery actually needs (honest)
Because the code exists, the value-add is:
1. **Link** each ECAP to its real implementing artifacts (done — `implementing_artifacts` metadata).
2. **Validate** under governance: CBS check green, CA-001 evidence per capability, security posture (P1 SEC checks already green for the evidence walls).
3. **Close real gaps** only where they exist (e.g., test coverage, monitoring wiring) — genuine engineering, not documentation.
4. **Release under governance**: mark each capability's maturity/stage, regenerate indexes.

## Decision needed from Founder (pacing)
Per-ECAP execution can be either **(a)** the full ten-stage delivery docs referencing existing code + explicit gap lists, or **(b)** real application code work on identified gaps (test/monitoring/security), one stream at a time. Given the features exist and the principle is *prefer delivery over new governance*, option (b) — grounded code work per stream — is the higher-value path; (a) risks producing governance-flavored docs for software that already ships. **Awaiting Founder direction on (a) vs (b) and which stream to run first (recommend ECAP-001 AI Assistant).**

## Waves 2–3 (queued, not started)
Wave 2: ECAP-004 RiskPath · ECAP-005 Property Intelligence · ECAP-007 Compliance Guidance · ECAP-008 Workflow Automation. Wave 3: ECAP-006 Pricing · ECAP-009 Communication · ECAP-011 Reporting · ECAP-012 Customer Portal.
