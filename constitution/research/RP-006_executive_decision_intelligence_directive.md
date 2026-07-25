---
constitutional_id: RP-006
object_type: research_proposal
title: OwnerPilot Executive Decision Intelligence Platform (Founder's Directive)
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [RP-005, EA-100]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-005, RPT-012, BTRM-001, RIE-001, OCM-001, CS-001, ENR-001, TM-001, CM-001, POL-001, ICOA-001, RP-001, RP-002, RP-003, RP-004, RPT-013, ADR-014, DOC-003, EA-012]
registry_tags: [research-proposal, non-constitutional, executive-decision-intelligence, winning-strategy, adaptive-reasoning, opos, opil]
program_phase: research
repository_path: constitution/research/RP-006_executive_decision_intelligence_directive.md
checksum_scope: file
---

# RP-006 — OwnerPilot Executive Decision Intelligence Platform (Founder's Directive)

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014, captured from the Founder's "Omnibus Architecture & Product Development Directive" submitted 2026-07-25. Not a ratified artifact and not an authorization to build OPOS, OPIL, RQS, DIRP, EDIC, or any other named structure below. This RP substantially extends **RP-005** (captured the same day) rather than replacing it — see §1 for what's new versus restated. See **RPT-013** for the architecture impact assessment covering the new elements; RPT-012 already covers the elements shared with RP-005.

## 0. What this is

A restatement and expansion of RP-005's vision — OwnerPilot as an Executive Business Decision Intelligence Platform rather than a landlord/legal chatbot or document generator — submitted as a Founder's Directive rather than a proposal. It repeats most of RP-005's content (Winning Strategy, Adaptive Reasoning Engine, Strategic Communication Engine, Strategic Courage Doctrine, Decision Context Model, Invisible Personalization) and adds new architectural constructs not present in RP-005.

## 1. What's new relative to RP-005 / RPT-012

- **Recommendation Object** — a proposed internal schema (Objective, Winning Strategy, Facts, Unknown Facts, Confidence, Legal Analysis, Negotiation Analysis, Outcome Projection, Financial Projection, Risks, Alternative Strategies, Communication Strategy, Contingency Plan, Execution Plan, Review Trigger) that every workflow would consume.
- **Decision Graph** — an explainable reasoning chain (Objective → Strategies → Projected Outcomes → Risk Analysis → Negotiation Analysis → Expected Value → Winning Strategy → Execution → Feedback → Learning).
- **OwnerPilot Operating System (OPOS)** — a named layer describing "how OwnerPilot thinks," proposed as the substrate all future products run on.
- **OwnerPilot Intelligence Layer (OPIL)** — a named routing layer everything would pass through.
- **Recommendation Quality Score (RQS)** — internal scoring across Fact/Legal/Negotiation/Outcome/Communication/Business Confidence, with an "insufficient confidence → gather more information, don't guess" rule.
- **Decision Intelligence Research Program (DIRP)** — a named permanent research initiative (executive decision making, behavioral economics, game theory, negotiation science, decision theory, etc.).
- **Executive Decision Intelligence Corpus (EDIC)** — a proposed corpus of thousands of business-decision scenarios (facts, objectives, strategies, reasoning, projected outcomes, actual outcomes, retrospective).
- **Validation-before-constitution** — hundreds of stress-test scenarios before any constitutional ratification (same principle RPT-012 already applied to RP-005's Validation Program).
- **Nine Foundational Questions** — an internal checklist every recommendation should silently answer, closely related to RP-005's Internal Recommendation Framework (RP-005 §1) but reworded to nine items instead of nine (same count, revised wording).

Everything else in the Directive (Winning Strategy, the five/ten reasoning engines, Strategic Communication Engine, Strategic Courage Doctrine, Decision Context Model, Invisible Personalization) restates RP-005 §1 and is not re-analyzed here; RPT-012 §1's disposition table (reuse ENR-001, RIE-001/RP-004, OCM-001, CS-001, POL-001/RP-003) applies unchanged.

## 2. Status

Captured 2026-07-25 per Founder direction, as an extension of RP-005. Architecture Impact Assessment for the new elements in §1: **RPT-013**. Not reconciled, not drafted, not reviewed, not ratified. No sub-component (Recommendation Object, Decision Graph, OPOS, OPIL, RQS, DIRP, EDIC) is assigned a CRID of its own — per ADR-014, that only happens after Reconciliation → Architecture Draft → self-critique → independent review-board challenge → ADR → Founder ratification.

## 2.5 Closure note (2026-07-25, ADR-015 / RPT-014) — original §1 text preserved unchanged, per DOC-003 §9

RPT-013 §1 found that this RP's **Recommendation Quality Score (RQS)** — as originally described in §1 above (Fact/Legal/Negotiation/Outcome/Communication/Business Confidence scoring) — reproduced RPT-012 §2's unresolved conflict with BTRM-001 §3.7's ratified qualitative-only OCM-001 mandate. That conflict is **now resolved** by **RPT-014** and ratified by **ADR-015**: OCM-001 remains controlling, and RQS is retained only as a **qualitative-first, multidimensional recommendation-assurance framework** evaluating seven dimensions individually (factual grounding, legal analysis, objective alignment, alternative consideration, risk analysis, communication strategy, execution readiness) — no composite score, no false precision, no averaging away a critical failure. This redefinition supersedes §1's original six-dimension RQS description above and is codified at **BTRM-001 §3.7.1**. Numeric telemetry remains permitted for internal testing/calibration/benchmarking only, never as user-facing or decision-controlling output.

## 3. Separate from this proposal

The Directive's framing of the assistant's own role (CTO / Chief Systems Architect / Chief Product Builder / Constitutional Implementation Officer, implementation-priority ordering, "build for decades" test) is a standing-instruction matter, not a product-architecture research question — it is addressed as an addendum to **DOC-003** (§15) rather than folded into this RP, consistent with DOC-003 §10's separation of constitutional architecture, product architecture, software implementation, and research, and with the precedent DOC-003 itself set for Founder-issued operating charters.
