---
constitutional_id: RP-007
object_type: research_proposal
title: Tenant Behavioral Intelligence Engine (TBIE) and Case Evolution Engine (CEE) — Founder's Engineering Directive
status: Concept
version: 0.2
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [BTRM-001, EA-100]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, ENR-001, BAE-001, TM-001, CM-001, RIE-001, CS-001, POL-001, ICOA-001, RP-005, RP-006, RPT-012, RPT-013, RPT-014, RPT-015, ADR-015, DOC-003, EA-012]
registry_tags: [research-proposal, non-constitutional, tbie, cee, behavioral-intelligence, case-evolution, predictive-intelligence, engineering-directive]
program_phase: research
repository_path: constitution/research/RP-007_tenant_behavioral_intelligence_engine.md
checksum_scope: file
---

# RP-007 — Tenant Behavioral Intelligence Engine™ (TBIE) and Case Evolution Engine™ (CEE) — Founder's Engineering Directive

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014. This v0.2 supersedes the v0.1 capture of the same day: the Founder replaced the original TBIE-plus-addendum directive with a fuller, engineering-ready version that (a) splits Case Evolution Engine (CEE) out as a fully specified, architecturally separate engine rather than an addendum, and (b) writes the RQS–OCM-001 qualitative-first controls (ADR-015/BTRM-001 §3.7.1) directly into the directive's own non-negotiable principles, rather than leaving them to be discovered by impact assessment. Not a ratified artifact and not an authorization to build TBIE, CEE, or any named sub-model beyond what §24 explicitly authorizes (research, architecture, schemas, prototyping, testing, bounded integration planning — not production execution). See **RPT-015** (revised) for the impact assessment against this version.

## 0. What this is

A single coordinated engineering directive for two advisory intelligence subsystems: **TBIE** (documented tenant behavior — communication reliability, payment behavior, communication characteristics, negotiation behavior, documentation behavior, maintenance interaction behavior) and **CEE** (the dispute's own trajectory — e.g., isolated late payment becoming recurring nonpayment, informal maintenance concern becoming a documented habitability dispute). Both are explicitly advisory: they inform the Recommendation Synthesizer and may never make, approve, reject, rank, or execute a decision themselves, and may never bypass human review or execution controls.

## 1. Non-negotiable principles (§3, verbatim in substance)

- **No character classification** (§3.1) — no "good/bad tenant," no personality types, moral judgments, credibility labels, psychological diagnoses, or fixed behavioral identities. Permitted: "The tenant committed to paying by Friday. Payment was received the following Wednesday." Prohibited: "The tenant is dishonest and cannot be trusted."
- **No tenant scoring system** (§3.2) — no behavior score, quality score, trustworthiness score, cooperation score, risk score, litigation score, composite behavioral rating, universal recommendation score, or overall percentage representing the tenant. Internal quantitative measurements are permitted only for diagnostics, trend analysis, prediction calibration, testing, benchmarking, and model comparison — they may never independently approve/reject an action, rank tenants, decide whether to serve notice/negotiate/litigate, trigger an adverse action, establish correctness, substitute for qualitative reasoning, or override a material legal or human-review gate. Critical concerns may not be averaged away by favorable observations elsewhere.
- **Evidence before inference** (§3.3) — every behavioral observation must preserve the underlying event, source, date/time, actor, record, derived observation, contrary evidence, confidence, and the reasoning connecting evidence to observation. Unsupported conclusions are prohibited.
- **Dynamic observations, not permanent traits** (§3.4) — findings are temporary and revisable; recent events weighted appropriately; long-term history preserved; observations may expire, weaken, or be superseded; contradictory evidence preserved, not hidden.
- **Separation of quality and confidence** (§3.5) — a strategy's substantive quality and confidence in its supporting evidence are separate questions; qualitative confidence states (Sufficient / Limited / Insufficient, plus implementation states Satisfied / Partially Satisfied / Insufficient Information / Material Concern / Human Review Required / Execution Blocked); never converted into a universal composite score.

This is, section for section, the same disposition already ratified in **ADR-015**/**BTRM-001 §3.7.1** (RQS as qualitative-first, quality-vs-confidence-separated, no composite score, no false precision, no averaging away a critical failure). The directive writes that disposition into itself rather than requiring rediscovery — see RPT-015 §1.

## 2. System responsibilities

- **4.1 TBIE** — evidence-linked behavioral observations, trends, historical patterns, uncertainty assessments, bounded probabilistic forecasts, communication-strategy inputs, explainable findings for the Recommendation Synthesizer. Input only, never the decision-maker.
- **4.2 CEE** — an independently maintained model of case/dispute state and its transitions (e.g. isolated issue → recurring nonperformance → formal notice preparation → litigation preparation → cured/settled/closed/reopened), explicitly distinguished from TBIE: tenant behavior may hold steady while the case itself changes state, and vice versa. Must remain distinguishable from TBIE in schemas, reasoning, logs, and user explanations.
- **§5 engine relationship** — Owner Objective → Known Facts/Unknowns → Legal & Compliance → Workflow/Procedural State → **CEE** → **TBIE** → Negotiation/Outcome Projection → Strategic Communication → Recommendation Synthesizer → Qualitative Recommendation → Human Review & Execution Controls. Neither engine may bypass the Synthesizer, directly initiate communications, serve notices, accept agreements, change legal positions, or commence litigation.

## 3. Behavioral domains (§6) and required data models (§9-11)

Six domains: communication reliability, payment behavior, communication characteristics, negotiation behavior, documentation behavior, maintenance interaction behavior — each with an enumerated observation list and explicit non-goals (e.g. §6.2: "TBIE must not independently determine whether rent is legally owed or whether a notice is legally valid"; §6.6: "TBIE must not make legal habitability findings").

Three required data models, each considerably richer than what BTRM-001 has shipped to date (see RPT-015 §2 for the concrete gap analysis against ENR-001/BAE-001's current, deliberately minimal schemas):

- **Event Model (§9)** — versioned; beyond ENR-001's current `TimelineEvent` fields, adds property identifier, actor role, source type/reference, structured factual fields, legal/workflow significance, corroboration status, sensitivity classification, data-entry/extraction method and confidence, human verification status, superseded/corrected status, related-event links, retention rule, schema version.
- **Behavioral Observation Model (§10)** — beyond BAE-001's current `BehavioralObservation` fields, adds a narrowly-stated free-text observation, time window, supporting/contradictory event ids, trend direction, recency assessment, evidence sufficiency, confidence state, assumptions, limitations, generation/review dates, expiration/reassessment condition, human-review status.
- **Case Evolution Model (§11)** — present/prior case stage, transition date and triggering events, unresolved facts, legal/procedural constraints, owner/tenant objectives, material risks, available/blocked alternatives, resolution/escalation/recurrence indicators, confidence, required human review, next reassessment condition. Enumerated case states from "initial inquiry" through "litigation preparation"/"cured"/"settled"/"reopened"/"execution blocked" — states inform, never dictate, legal action.

## 4. Temporal intelligence, predictive intelligence, confidence (§7, §12, §13)

Recency weighting with context-dependent exceptions ("a six-month payment pattern may remain relevant even if the most recent payment was timely"); chronological event reconstruction as a first-class part of the reasoning architecture (§8).

**§12 Predictive Intelligence** explicitly permits bounded probabilistic forecasts, subject to **§12.1 numerical prediction guardrails**: every forecast must be labeled an estimate, cite supporting/contradictory evidence, carry confidence separately, state assumptions/unknowns/limitations, be recalculated on material new evidence — and a bounded numerical probability "may not become a tenant score, a moral or credibility score, an adverse-action trigger, an automatic escalation trigger, a substitute for qualitative analysis, the sole reason for a recommendation... Where the available evidence does not support a defensible numerical estimate, the system must use a qualitative forecast... False precision is prohibited." This is, on its face, already the exact disposition of ADR-015/BTRM-001 §3.7.1, restated for this engine rather than left as an open conflict — see RPT-015 §1.

**§13 Confidence Model** — depends on quantity/quality/consistency/recency/corroboration of evidence, contradictions, timeline completeness, verification, known data-quality errors; low confidence must trigger one or more of: recommend gathering more information, recommend verification, reduced reliance, present multiple alternatives, human-review requirement, execution block on missing critical fact. Confidence must not be averaged with recommendation quality.

## 5. Communication adaptation, recommendation integration, explainability (§14-16)

The Strategic Communication Engine must consume TBIE/CEE outputs before drafting; adaptations are strategy recommendations only — "No message may be automatically sent solely because TBIE or CEE selected a strategy." The Recommendation Synthesizer receives both engines' outputs as bounded evidence inputs within a full recommendation object (objective, facts, unknowns, legal constraints, case state, behavioral observations, confidence, alternatives, strategy, recommended action, explanation, supporting/contradictory evidence, limitations, human-review requirements, execution conditions, audit record, version history) — neither engine independently selects the final course of action. Explainability (§16) requires: what happened, when, how often, what changed, supporting/contradictory evidence, relevance, confidence, effect on alternatives, and what the system does not know.

## 6. Privacy, fairness, governance (§17)

Explicit prohibition list: protected-class inference and proxies for it, psychological profiling, medical/disability/immigration/familial-status/national-origin/religion/sexual-orientation inference, tenant screening, housing eligibility decisions, rent-setting from behavioral intelligence, automated eviction or adverse actions, external social-media surveillance, unrelated data enrichment, covert monitoring, deceptive/manipulative communication strategies. Requires data minimization, purpose limitation, access controls, encryption, retention controls, provenance, correction mechanisms, audit logging, human review, model-version tracking, observation expiration, deletion/case-closure policy, redaction. Behavioral intelligence must not be reused for unrelated tenant selection or marketing.

## 7. Deliverables, ADR subjects, phased implementation, acceptance criteria, governance authorization (§19-24)

- **§19** — 20 named architecture deliverables (TBIE and CEE architecture docs, interaction diagram, data/event/observation/case-state/temporal/confidence/prediction/communication/recommendation-integration/explainability models, privacy & governance assessment, threat & misuse assessment, implementation roadmap, test & validation plan, model monitoring plan, ADRs, gate status reports). Explicitly: **"Do not create a new constitutional doctrine merely because the subsystem is significant. Create a constitutional RP only if implementation reveals a genuine constitutional question... Do not silently resolve existing constitutional naming or architecture conflicts. Pending separate resolution of the existing OPIL nomenclature issue, use 'OwnerPilot Intelligence Layer' as product-layer shorthand only."** — this directly names and defers, rather than compounds, the open OPOS/OPIL-vs-EA-012 collision flagged in RPT-013.
- **§20** — 15 candidate ADR subjects (event sourcing, evidence/inference separation, TBIE/CEE separation, temporal weighting, confidence representation, numerical-prediction representation, no-composite-score prohibition, human-review boundaries, communication boundaries, retention/deletion, sensitive-data handling, versioning/audit, monitoring, correction/dispute mechanisms, Synthesizer integration) — each required to state rejected alternatives and constitutional implications.
- **§21** — seven-phase sequence: (1) research/architecture only, no autonomous communication or execution; (2) deterministic evidence layer (ingestion, timeline, commitment extraction, provenance, correction, versioning, audit — "should work without predictive modeling"); (3) qualitative observations, no tenant score; (4) CEE, kept schema/log/reasoning-distinct from TBIE; (5) predictive estimates only after evidence-quality validation, documented calibration methodology, confidence separated from prediction, sparse-data behavior defined, false-precision controls, privacy/fairness review, human-review enforcement — "Predictions should initially operate in shadow mode. They must not affect production recommendations until independently evaluated"; (6) communication adaptation, strategy-only, no auto-send, tested against response rate/clarity/documentation quality/agreement performance/resolution speed/comprehension/reduced escalation, "not solely for tenant compliance"; (7) Recommendation Synthesizer integration with qualitative assurance gates, human review, citations, alternatives, decision-graph logging, execution controls, versioned records.
- **§22** — 25 required anonymized test scenarios (mixed commitment performance, contradictory documentation, sparse evidence, multiple tenants on one tenancy, maintenance-to-legal escalation, temporary-to-recurring payment issues, protected/sensitive information appearing in source communications, an attempted prohibited character label, an attempted composite score, a high numeric prediction conflicting with a legal/human-review gate, case reopening, etc.). Tests must confirm critical concerns cannot be averaged away.
- **§23** — 18 minimum acceptance criteria (evidence-linked observations, distinguishable original evidence, preserved contradictions, dynamic/revisable observations, architectural separation of TBIE/CEE, no composite score, no character labels, blocked protected-class inference, separated prediction/confidence, controlled false precision, non-averaged critical gates, human review on material actions, no automatic communication send, explained TBIE/CEE influence, visible unknowns/limitations, recorded model/schema versions, propagating corrections, auditability, safe degradation on insufficient evidence).
- **§24 status/governance** — this directive **authorizes**: research, architecture, schema design, prototyping, testing, bounded integration planning. It **does not authorize**: automatic adverse actions, autonomous notice service, autonomous litigation escalation, automatic communication transmission, tenant screening, housing eligibility decisions, unreviewed production execution, or constitutional expansion unrelated to implementation. Ten status-report gates required (research complete → production-readiness review complete), each distinguishing completed work, tested findings, engineering assumptions, unresolved questions, constitutional implications, privacy risks, implementation risks, and Founder decisions required.

## 8. Founder's Final Directive (§25, verbatim)

"Do not build a tenant scoring system. Build an evidence-based behavioral intelligence system. Do not build labels. Build observations. Do not build assumptions. Build documented reasoning. Do not treat behavior as permanent. Build temporal and revisable intelligence. Do not confuse the tenant with the dispute. Build TBIE to understand documented tenant behavior and CEE to understand how the case is evolving. Do not build autonomous enforcement. Build adaptive executive intelligence."

## 9. Status

Captured 2026-07-25 per Founder direction (v0.2, superseding the same-day v0.1 informal capture). Architecture Impact Assessment: **RPT-015** (revised against this version). Not reconciled beyond what the directive already reconciles in its own text, not drafted, not reviewed by an independent board, not ratified. Per §24, this directive itself authorizes Phase 1 research/architecture work; it does not authorize code that executes production decisions, sends communications, or performs adverse actions, and it does not authorize creating a new constitutional doctrine or CRID for TBIE/CEE absent a genuine constitutional question surfacing during implementation.
