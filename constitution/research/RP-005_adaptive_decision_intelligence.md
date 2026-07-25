---
constitutional_id: RP-005
object_type: research_proposal
title: OwnerPilot Adaptive Decision Intelligence (Research Proposal)
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [EA-100, RP-001, RP-004]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, RIE-001, OCM-001, CS-001, ENR-001, TM-001, CM-001, POL-001, ICOA-001, RP-001, RP-002, RP-003, RP-004, RPT-012, ADR-014]
registry_tags: [research-proposal, non-constitutional, adaptive-reasoning, decision-intelligence, winning-strategy]
program_phase: research
repository_path: constitution/research/RP-005_adaptive_decision_intelligence.md
checksum_scope: file
---

# RP-005 — OwnerPilot Adaptive Decision Intelligence (Research Proposal)

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014. Not a ratified artifact and not an authorization to build. Larger in scope than RP-001 through RP-004 — this proposal describes a multi-engine architecture and a philosophical repositioning of the product, not a single idea. See **RPT-012** for the full architecture impact assessment, including one direct conflict with an existing ratified safeguard (§2 below is the short version; RPT-012 has the detail). No new CRID beyond RP-005 itself is assigned to any of the components named below.

## 0. What this is

A proposal that OwnerPilot's recommendation engine should optimize for the owner's projected probability of achieving their stated objective ("Winning Strategy") rather than simply answering questions or mirroring the owner's instincts, delivered through a proposed **Adaptive Reasoning Engine** and supporting doctrines. Submitted 2026-07-25 as a single, large capture rather than split into several RPs, at the Founder's direction.

## 1. Proposed components, as submitted

- **Winning Strategy** — reframes "winning" as the strongest projected combination of legal defensibility, financial outcome, operational efficiency, preserved optionality, negotiation leverage, probability of successful resolution, and long-term business value — explicitly not aggression or "beating" a tenant.
- **Adaptive Reasoning Engine**, with five component engines: Facts Engine (known/unknown facts, assumptions, confidence), Legal & Compliance Engine (CA statutory requirements, timelines, procedural risk), Negotiation Engine (settlement/cooperation probability, leverage, BATNA), Outcome Projection Engine (expected recovery, litigation/collection probability, downside risk), Owner Context Engine (business priorities, operational constraints, communication preferences — explicitly not a personality profile).
- **Strategic Communication Engine** — every drafted communication should be selected to advance the Winning Strategy, not generic politeness.
- **Recommendation Synthesizer** — a signature "Based on the information available..." recommendation sentence citing legal defensibility, financial outcome, operational efficiency, optionality, and resolution likelihood.
- **Strategic Courage Doctrine** — OwnerPilot should optimize for owner success over owner comfort, and explain *why* when a recommendation is more assertive than the owner's default instinct, without ever labeling the owner's personality.
- **Decision Context Model** — replaces "memory" with a continuously-revised, invisible internal model (never surfaced to the owner as "we've learned you are...").
- **Comfort Gap** — a proposed check for whether a recommendation materially differs from what the owner would likely choose unprompted, triggering extra outcome-based (never personality-based) explanation.
- **Decision Intelligence Research Program (DIRP)** — a named research program (negotiation science, decision theory, game theory, behavioral economics, etc.).
- **Validation Program** — proposed pre-ratification stress test of at least 200 business scenarios.
- **Internal Recommendation Framework** — a 9-question internal checklist every recommendation should silently answer before responding.

## 2. Overlap and conflict, short version (full assessment: RPT-012)

Most of the proposed engines are not new territory — they map closely onto BTRM-001's already-ratified pipeline (Facts Engine ≈ ENR-001, Negotiation Engine ≈ RIE-001 and the already-captured RP-004, Strategic Communication Engine ≈ CS-001, Owner Context Engine/Decision Context Model ≈ POL-001 and RP-003). One proposed component — the Outcome Projection Engine's numeric probabilities (settlement probability, litigation probability, collection probability) — directly conflicts with BTRM-001 §3.7/§15, which ratified OCM-001 as strictly qualitative (support bands, not fabricated probabilities) specifically to avoid this. That conflict is not resolved by this proposal and must be addressed explicitly before any Architecture Draft, not assumed away.

## 3. Separate from this proposal

The Founder's closing note — that OwnerPilot's long-term positioning could extend beyond landlord services into brokerage, estate planning, wealth management, and business acquisitions — is a product/business-vision reflection, not a technical research claim, and is recorded separately (Master Constitutional Index, Founder's Vision) rather than folded into this RP's technical scope, consistent with DOC-003 §10's separation of constitutional architecture, product architecture, software implementation, and research.

## Status

Captured 2026-07-25 per Founder direction. Architecture Impact Assessment: **RPT-012**. Not reconciled, not drafted, not reviewed, not ratified. No sub-engine (Facts Engine, Legal & Compliance Engine, Negotiation Engine, Outcome Projection Engine, Owner Context Engine, Strategic Communication Engine) is assigned a CRID of its own — per ADR-014, that only happens after Reconciliation → Architecture Draft → self-critique → independent review-board challenge → ADR → Founder ratification, the path BTRM-001 took.
