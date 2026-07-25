---
constitutional_id: RPT-012
object_type: report
title: RP-005 Architecture Impact Assessment
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-25
updated: 2026-07-25
depends_on: [RP-005, EA-100, EA-012, BTRM-001, RPT-011]
required_by: []
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-005, BTRM-001, RIE-001, OCM-001, CS-001, ENR-001, TM-001, CM-001, POL-001, ICOA-001, ECAP-004, ECAP-007, ECAP-009, RP-001, RP-002, RP-003, RP-004]
registry_tags: [architecture-impact-assessment, rp-005, reconciliation, decision-intelligence]
program_phase: research
repository_path: constitution/research/RPT-012_RP-005_architecture_impact_assessment.md
checksum_scope: file
---

# RPT-012 — RP-005 Architecture Impact Assessment

**Purpose.** Before any reconciliation memo or Architecture Draft is written for RP-005, map its proposed components against what already exists, so effort isn't duplicated and conflicts with already-ratified safeguards are caught now rather than after drafting. This assessment makes no constitutional change: it modifies no ratified artifact, assigns no new CRID, and authorizes no implementation work.

## 1. Component-by-component overlap

| Proposed component (RP-005) | Existing artifact(s) | Disposition |
|---|---|---|
| Facts Engine | **ENR-001** Evidence Normalization and Reconstruction (BTRM-001 §1) | Near-total overlap. Reuse ENR-001; do not re-derive under a new name. |
| Legal & Compliance Engine | **ECAP-007** Compliance Guidance (product capability, Concept) | Partial gap — ECAP-007 is a product capability, not an intelligence-layer model. This may be genuinely new territory if pursued, but must be scoped against ECAP-007 first so the platform doesn't end up with two compliance-guidance surfaces. |
| Negotiation Engine | **RIE-001** Resolution Intelligence Engine (BTRM-001 §1), **RP-004** Negotiation Intelligence (already captured 2026-07-25) | Direct overlap with two things at once. Must be reconciled against RIE-001 and RP-004 together — treating this as a third, independent negotiation concept would fragment the same territory three ways. |
| Outcome Projection Engine | **OCM-001** Outcome Comparison Model (BTRM-001 §3.7) | Direct overlap **and** direct conflict — see §2. |
| Owner Context Engine / Decision Context Model | **POL-001** Post-Outcome Learning, **RP-003** Portfolio Memory (already captured) | Overlapping territory. Reconcile together — "Decision Context Model" as named here is largely POL-001 plus RP-003's cross-matter memory, re-described. |
| Strategic Communication Engine | **CS-001** Communication Strategy (BTRM-001 §1, "the only place tone is a first-class input") | Near-total overlap. Reuse CS-001. |
| Strategic Courage Doctrine | No direct existing artifact | New framing, but any recommendation flagged as more assertive than the owner's default **still** passes through BTRM-001 §6/§11's human-review-gate for material-consequence outputs — Strategic Courage is not an exception to that guard and must not be specified as one. |
| Comfort Gap | **CM-001** Confidence Model, **TM-001** Trust and Reliance Model (both Proposed, reused inside BTRM-001) | Adjacent calibration territory. Reconcile together with CM-001/TM-001 rather than as a freestanding concept. |
| DIRP (Decision Intelligence Research Program) | **ADR-014** (the RP family and its research pipeline, adopted 2026-07-25, same day as this proposal) | ADR-014 already established a standing research-to-constitution pipeline. Recommend folding DIRP's named research areas (negotiation science, decision theory, game theory, behavioral economics, etc.) into that existing pipeline as topics for future RPs, rather than standing up a second, parallel research program the same day the first one was ratified. |
| Validation Program (200+ scenarios) | — | Execution-stage activity, not a constitutional artifact. Appropriate only once (if) RP-005 reaches an Architecture Draft with a specific enough shape to test — testing a proposal this unformed against 200 scenarios now would validate the wrong thing. |

## 2. Constitutional conflict — flagged, not resolved

RP-005 asks the Outcome Projection Engine to produce numeric probabilities: settlement probability, litigation probability, collection probability, expected financial recovery. BTRM-001 §3.7/§15 ratified OCM-001 specifically as **qualitative** — support bands (Strongly supported / Supported / Uncertain / Weakly supported / Insufficient evidence) — and explicitly prohibits fabricated probabilities. This is a direct conflict with a ratified safeguard, not a drafting nuance, and this assessment does not resolve it. Any future Architecture Draft for RP-005 must do one of two things: propose a principled, evidence-grounded probability methodology and carry it through the same independent architecture-review-board challenge BTRM-001's design underwent, or drop numeric-probability framing in favor of OCM-001's existing qualitative bands. Silently keeping both isn't an option a reconciliation memo can wave through.

## 3. Transparency note — self-critique, not a conflict

RP-005's own text correctly repeats BTRM-001's prohibition on personality labeling and profile exposure ("invisible personalization," never telling the owner "we've learned you are..."). No conflict there. But "invisible" and "disclosed" are not the same thing: even first-party, owner-directed personalization (as opposed to the third-party/tenant profiling BTRM-001's safeguards were written for) may still need its own disclosure story consistent with the platform's standing AI-disclaimer requirement. This should be resolved explicitly in any future Architecture Draft — recommend it not be assumed inert just because the subject being modeled is the paying customer rather than a tenant.

## 4. Affected EA / enterprise documents — none modified by this assessment

If RP-005 ever graduates, it would eventually touch: **EA-012** (Constitutional Intelligence Layer, itself still Proposed), **EA-100**, **BTRM-001**, **TM-001**, **CM-001**, **RIE-001**, **OCM-001**, **CS-001**, **ENR-001**, **POL-001**, **ICOA-001**, **RP-001** through **RP-004**, **ECAP-004** (RiskPath), **ECAP-007** (Compliance Guidance), **ECAP-009** (Communication). None of these files were modified to produce this assessment; this table exists so a future reconciliation memo knows where to look, not as a change record.

## 5. Recommendation

Do not ratify anything from RP-005. Do not assign a CRID to any of its named sub-engines. If the Founder wants to pursue this, the next step is a proper reconciliation memo — the same role RPT-011 played for BTRM-001 — that resolves, in this order: the Negotiation Engine/RIE-001/RP-004 three-way overlap, the Outcome Projection Engine's probability conflict with OCM-001 (§2), and the transparency question in §3. The 200-scenario Validation Program belongs after an Architecture Draft exists, once there is something specific enough to actually validate — not before.
