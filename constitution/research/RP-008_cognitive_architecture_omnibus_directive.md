---
constitutional_id: RP-008
object_type: research_proposal
title: OwnerPilot Cognitive Architecture (EA-101) — Phase II Executive Decision Intelligence Build Program, Founder's Omnibus Directive
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-26
updated: 2026-07-26
depends_on: [BTRM-001, EA-100, EA-012, RP-004, RP-007]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, ENR-001, BAE-001, TM-001, CM-001, RIE-001, CS-001, POL-001, ICOA-001, RP-004, RP-005, RP-006, RP-007, RPT-012, RPT-013, RPT-014, RPT-015, RPT-016, ADR-015, DOC-003, EA-012, IMR-001]
registry_tags: [research-proposal, non-constitutional, cognitive-architecture, ea-101, opos, opil, edic, decision-engineering-lab, evaluation-lab, engineering-directive]
program_phase: research
repository_path: constitution/research/RP-008_cognitive_architecture_omnibus_directive.md
checksum_scope: file
---

# RP-008 — OwnerPilot Cognitive Architecture (EA-101), Phase II Executive Decision Intelligence Build Program — Founder's Omnibus Directive

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014, capturing the Founder's "Executive Decision Intelligence Platform / Phase II — Cognitive Architecture & Intelligence Build Program" omnibus directive, plus the Founder's own closing recommendation for an "OwnerPilot Evaluation Lab." Not a ratified artifact, not an authorization to build any named engine, and not itself EA-101 — it is the capture of a directive proposing EA-101 be written. Per the directive's own governance line ("existing constitutional governance remains fully in force... preserve constitutional governance while implementing the architecture"), everything below is subject to the standard RP graduation path (Reconciliation → Architecture Draft → self-critique → independent review-board challenge → ADR → Founder ratification) before any of it becomes binding architecture. See **RPT-016** for the full impact assessment.

## 0. What this is

A Phase II direction-setting directive: OwnerPilot's primary objective shifts from feature expansion to constructing a "Cognitive Architecture" — a pipeline of reasoning engines every future feature will run on. Proposes a new top-level architecture document (**EA-101**, "OwnerPilot Cognitive Architecture — How OwnerPilot Thinks"), a reasoning-engine pipeline, a standardized Recommendation Object, a Decision Graph explainability layer, an internal decision-case corpus (EDIC), a simulation/stress-testing capability (Decision Engineering Lab), an accelerated Model Registry (IMR-001) with a four-state validation lifecycle, an ECAP refactor mandate, new success metrics, and a request for a phased implementation roadmap. Closes with a Founder-authored recommendation for a distinct **OwnerPilot Evaluation Lab**.

## 1. The engine pipeline, as submitted

- **Goal Engine** — owner's actual objective (cash flow, tenancy preservation, litigation-risk reduction, vacancy avoidance, reputation, optionality, stress reduction, relationships, long-term asset value), including competing-objective/conflict identification.
- **Facts Engine** — known/unknown facts, assumptions, evidence, missing evidence, confidence, contradictory evidence; aggressively surfaces missing information before significant recommendations.
- **Evidence Engine** — normalizes all evidence (documents, communications, payments, photos, maintenance, contracts, court filings, texts, emails, phone logs, uploads); every recommendation must cite supporting evidence.
- **Legal & Compliance Engine** — "already exists conceptually. Expand." Applicable law, deadlines, procedural requirements, risk, documentation sufficiency, legal uncertainty; no recommendation without legal context.
- **Financial Intelligence Engine** (new) — expected value, cash flow, opportunity cost, replacement/vacancy/maintenance/settlement costs, collection probability, portfolio impact, long-term owner value.
- **Negotiation Intelligence Engine** — "expand RP-004." BATNA, leverage, settlement/escalation likelihood, concession sequencing, timing, alternative proposals, communication strategy.
- **Tenant Behavioral Intelligence Engine** — "implement RP-007." Evidence-based behavioral observations only, never personality profiles; commitment reliability, payment consistency, communication responsiveness, negotiation behavior, documentation behavior, maintenance cooperation, follow-through.
- **Case Evolution Engine** — distinct engine; evaluates the dispute's own trajectory (temporary hardship, improving, escalating, high conflict, documentation dispute, non-payment pattern, strategic delay, negotiation breakdown), not the tenant.
- **Outcome Projection Engine** — "one of the most important engines." Multiple plausible futures (best/expected/worst case), probability ranges, expected financial outcome, expected timeline, recommended review points.
- **Optionality Engine** (new) — preserve future strategic options whenever doing so materially improves expected outcomes; maximize flexibility until evidence justifies commitment; a cross-platform principle.
- **Strategic Communication Engine** — consumes behavior, negotiation, goals, evidence, legal, case evolution; generates communication that maximizes projected outcomes ("communication is strategy, not grammar").
- **Recommendation Synthesizer** — consumes every engine, produces Recommendation Objects, never bypasses reasoning engines.
- **Learning Engine** — every completed case improves future recommendations; never overwrites history; explainable learning only.

## 2. Platform-level constructs

- **OPOS** ("OwnerPilot Operating System") — "defines how OwnerPilot reasons"; every future capability becomes an application running on OPOS.
- **OPIL** ("OwnerPilot Intelligence Layer") — "accelerate EA-012... expand into the permanent intelligence layer... every workflow should consume OPIL, no workflow should independently generate recommendations."
- **Recommendation Object** — standardized schema; minimum fields: owner objective, summary, Winning Strategy, evidence, unknowns, assumptions, legal analysis, financial analysis, behavioral observations, negotiation strategy, projected outcomes, alternative strategies, confidence, risks, review triggers, execution steps, communications, explainability.
- **Decision Graph** — every recommendation becomes an explainable graph: Goal → Evidence → Unknowns → Legal → Behavior → Negotiation → Financial → Projected Outcomes → Confidence → Recommendation → Execution → Learning.
- **EDIC** (Executive Decision Intelligence Corpus) — "begin implementation." Internal corpus of structured decision cases (facts, objectives, evidence, unknowns, strategies considered, recommendation, projected outcome, actual outcome, lessons learned, future improvements) as a core intellectual asset.
- **Decision Engineering Lab** (new) — internal research capability to stress-test every reasoning engine before production; thousands of simulated landlord/commercial/vendor/contractor/maintenance/negotiation/settlement/collection/pricing/portfolio cases; Monte Carlo methods where appropriate.
- **Model Registry** — "accelerate IMR-001." Each model: purpose, inputs, outputs, dependencies, confidence, validation status, production status, feature flag, owner, architecture references, research references.
- **Model Validation** — four states: Research, Experimental, Validated, Production. No model directly influences customer recommendations until it reaches the governance-defined threshold.
- **Explainability** — every recommendation must answer: why, what evidence, what uncertainties, what assumptions, what alternatives were rejected.

## 3. Program-level direction

- **Product development** — shift from building workflows to building reusable reasoning engines; workflows become orchestrations of intelligence.
- **Testing program** — regression/comparison harnesses per engine: behavior, negotiation, communication, outcome projection, confidence calibration, recommendation comparison, alternative-strategy comparison, human-expert comparison, synthetic case replay, historical replay.
- **ECAP refactor** — review all 12 modeled ECAPs; refactor each to consume the Cognitive Architecture rather than independent reasoning.
- **Success metrics** — replace documents-generated/messages-written/forms-completed with decision quality, recommendation quality, owner outcomes, prediction calibration, explainability, confidence calibration, user trust, successful resolutions.
- **Implementation roadmap** (requested deliverable) — dependencies, engine sequencing, mapping to existing EA/BTRM/ECAP artifacts, constitutional impacts, effort estimates, validation plans before production. See RPT-016 §7 for a Concept-stage sequencing sketch; a full roadmap is Architecture Draft-stage work, not performed here.

## 4. Founder's Final Directive (verbatim)

"Every future architectural decision shall be evaluated against one question: Does this make OwnerPilot a more trustworthy, explainable, evidence-based Executive Decision Intelligence Platform? If yes, continue. If not, redesign. Build for decades. Not for the next release."

## 5. Founder's addendum recommendation — OwnerPilot Evaluation Lab

A proposed standing initiative, distinct from the omnibus directive's own required deliverables, offered as the Founder's own judgment call: a lab whose sole responsibility is comparing different reasoning models/strategies against the same cases — e.g. negotiation-first vs. enforcement-first strategy, Tenant Behavioral Intelligence Engine vs. a rules-only baseline, confidence-calibration quality, and comparison against what experienced property managers would choose. Framed as creating a continuous feedback loop judging the intelligence system by measurable outcomes rather than plausibility, and as the differentiator between a conventional AI application and an evidence-driven decision platform.

## 6. Status

Captured 2026-07-26 per Founder direction. Architecture Impact Assessment: **RPT-016**. Not reconciled, not drafted, not reviewed by an independent board, not ratified. No sub-component (EA-101, OPOS, OPIL acceleration, any named engine, EDIC, Decision Engineering Lab, Evaluation Lab, or the four-state model-validation lifecycle) is assigned a CRID of its own or authorized for production implementation — per ADR-014/DOC-003 §15, that requires the full graduation path, and per the directive's own governance line, existing constitutional governance (including ADR-015/BTRM-001 §3.7.1's qualitative-first mandate) remains fully in force and controls wherever this directive is silent or in tension with it.
