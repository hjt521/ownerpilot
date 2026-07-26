---
constitutional_id: BTRM-001
object_type: enterprise_capability
title: Behavioral Trust and Resolution Model
status: Ratified
version: 1.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-25
updated: 2026-07-25
security_classification: internal
capability_class: enterprise
operational_maturity: architecture-draft
depends_on: [EA-100, EA-012, REG-CAP-001, TM-001, CM-001, ENR-001, BAE-001, ICOA-001, RIE-001, OCM-001, CS-001, POL-001]
required_by: []
implements: [EA-100]
governed_by: [EA-100, EA-012]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [RPT-011, TM-001, CM-001, EA-012, IMR-001, MODEL-BEH, RPT-014, ADR-015, RP-005, RP-006]
registry_tags: [btrm, behavioral, trust, reliance, resolution, intelligence, architecture-draft]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md
checksum_scope: file
---

# BTRM-001 — Behavioral Trust and Resolution Model (Ratified)

> **Lifecycle: Ratified** (Founder, 2026-07-25 · ADR-013 — "build all eight components," given twice; ADR-013 also lifts the ADR-012 intelligence hold **scoped to this component set only**). Authored by Engineering under the Founder's design directive, reviewed via a self-critique and an independent architecture-review-board challenge (§12–13), then ratified with the full eight-component build authorized — overriding the board's reduced-increment recommendation, while preserving every safeguard the board conditioned approval on. **Implementation now proceeds** in dependency-ordered, flag-gated PROC-100 stages (§10, updated build log below). The EA-012 posture still governs: *no automated adverse decisions* — no runtime path may reach an adverse action (eviction, denial, escalation, financial penalty) without `human_review_required` (§6/§11), absent further Founder direction. Component CRIDs (ENR/BAE/ICOA/RIE/OCM/CS/POL) remain reserved-planned pending their own individual ratification; this document governs their implementation under BTRM-001 in the interim. Reconciliation: RPT-011. Ratification record: ADR-013.
>
> **v1.1 amendment (Founder, 2026-07-25 · ADR-015):** §3.7.1 added below, codifying RQS as a subordinate, qualitative-first recommendation-assurance framework operating under OCM-001. This resolves the RQS/OCM-001 conflict raised in RPT-012 §2 and RPT-013 §1; both are formally closed by RPT-014. §3.7's original qualitative-only rule is unchanged — §3.7.1 clarifies how RQS fits underneath it, not a replacement of it.

## Build log (updated as stages land)
| Stage | Component | Status |
|---|---|---|
| 0 | Schema + feature flag + safeguards + explainability envelope | shipped |
| 1 | ENR-001 | shipped (dark — `BTRM_STAGE_ENR_ENABLED` unset everywhere; no caller wired yet) |
| 2 | BAE-001 | shipped (dark — `BTRM_STAGE_BAE_ENABLED` unset everywhere; no caller wired yet) |
| 3 | TM-001 / CM-001 (implementation under BTRM-001) | pending |
| 4 | ICOA-001 | pending |
| 5 | RIE-001 | pending |
| 6 | OCM-001 / CS-001 | pending |
| 7 | POL-001 | pending |

*All stages ship additive and unwired (inert) — no existing runtime path is modified until a separate, explicitly-approved integration PR connects BTRM-001 outputs to Chat/RiskPath/Notice surfaces with human-review gates on material-consequence actions.*

## 0. What this is, and what it is not

BTRM-001 is an **enterprise capability** (EA-100 family) that transforms communications, records, commitments, and real-world events into **explainable resolution recommendations**. It consumes the intelligence-layer models governed by EA-012; it is not a new constitutional framework.

**First principle (load-bearing).** BTRM-001 **never** determines whether a person is good, bad, honest, or trustworthy as a character. It determines exactly one thing:

> **How much reliance should OwnerPilot place on a specific communication, commitment, representation, or proposed agreement — based primarily on observable conduct — and what documented next action best advances the owner's stated objective at acceptable risk?**

It answers three practical questions: (1) *What actually happened?* (2) *What reliance is justified now?* (3) *What next action is most defensible?*

## 1. Processing model

```text
Evidence Collection (consumers supply sources)
        │
        ▼
ENR-001  Evidence Normalization & Reconstruction   (deterministic: timeline, dedup, provenance)
        │
        ▼
BAE-001  Behavioral Analysis Engine                (descriptive: observable behavioral events)
        │
        ├──────────────► CM-001 Confidence Model    (how sufficient is the evidence?)
        ▼
TM-001   Trust & Reliance Model                     (claim-specific permissible reliance)
        │
        ▼
ICOA-001 Interest, Constraint & Objective Analysis  (supported needs; confirmed/likely/possible/unknown)
        │
        ▼
RIE-001  Resolution Intelligence Engine             (resolution options + assumptions)
        │
        ├──────────────► OCM-001 Outcome Comparison  (qualitative, no fabricated probabilities)
        ├──────────────► CS-001  Communication Strategy
        ▼
Recommended Next Action (traceable, human-review-gated for material consequences)
        │
        ▼
POL-001  Post-Outcome Learning                      (records actual outcome; recency-weighted feedback → ENR/BAE)
```

Each stage consumes only structured outputs of the prior stage plus the preserved evidence, never a downstream stage's conclusions (no circular reasoning). CM-001 attaches to every assessment as a sufficiency measure, orthogonal to reliance.

## 2. Evidence-weighting standard (the governing rule)

> **Observable conduct controls the assessment. Communications create evidence and trackable commitments, but words alone do not establish reliability. Tone and linguistic cues may guide communication strategy but carry limited weight in trust and reliance decisions. When actions and language conflict, actions win.**

| Tier | Class | Weight | Examples |
|---|---|---|---|
| 1 | Objective, observable actions | Highest | payment received/missed, appointment attended, repair completed, property vacated, agreement signed, deadline met/missed, access provided, notice served |
| 2 | Corroborated records & written commitments | High | bank/payroll records, receipts, signed agreements, timestamped messages, inspection reports, service records |
| 3 | Repeated communication patterns | Moderate | response latency, consistent advance notice of delays, recurring contradictions, systematic avoidance of a direct question |
| 4 | Individual representations | Limited–moderate | "I'll pay Friday," "I mailed it" — creates a trackable commitment; **not** proof of fulfillment |
| 5 | Tone / sentiment / linguistic style | Low | politeness, anger, formality, apologetic or persuasive wording — informs CS-001 only, rarely reliance |

## 3. Component specifications

Each component below is at **Architecture Draft**. Inputs/outputs are typed against §4. Every component is **descriptive or advisory**; none may execute an adverse action.

### 3.1 ENR-001 — Evidence Normalization & Reconstruction
- **Responsibility (deterministic, not a learned model where avoidable):** ingest evidence items; deduplicate; resolve participants; reconstruct a chronological event/commitment timeline; classify each item's provenance.
- **Inputs:** `EvidenceItem[]` (raw). **Outputs:** `TimelineEvent[]`, `Commitment[]`, `ProvenanceLedger`.
- **Hard rules:** original evidence is **immutable** and never replaced by an AI summary; every derived event carries a provenance class (§4) and links to its source item(s); alleged vs. confirmed events are distinguished; missing/uncertain timestamps are flagged, never invented.
- **Non-goals:** no behavioral judgment, no reliance, no interest inference.
- **Stage 1 implementation note (2026-07-25, `lib/btrm/enr/`):** two scoping decisions worth recording explicitly rather than leaving implicit. (1) **Corroboration across items is not computed here.** Cross-item corroboration is CM-001's responsibility (§4 `ConfidenceAssessment.corroboration`, Stage 3) — ENR-001 classifies provenance from `verificationStatus` + `evidenceType` alone (`lib/btrm/enr/provenance.ts`), so it does not pre-empt a component that does not exist yet. (2) **Commitment extraction never parses free text for implied promises.** Doing so would be inference, not deterministic pre-processing, and would blur into BAE-001/AI-inference territory. A `Commitment` is materialized only when the caller has already tagged the source `EvidenceItem` with an explicit `commitmentHint` (`lib/btrm/types.ts`). Deduplication (`lib/btrm/enr/dedupe.ts`) is exact-match only (source + author + evidenceType + timestamp + originalContentRef) — deliberately conservative, since over-merging would silently drop evidence. Shipped dark: `BTRM_STAGE_ENR_ENABLED` is unset everywhere and no caller invokes `normalize()` yet.

### 3.2 BAE-001 — Behavioral Analysis Engine  *(concretizes reserved MODEL-BEH)*
- **Responsibility (descriptive):** classify observable behavioral events from the timeline. Answers *"what behavior is supported by the evidence?"* — **no trust assigned**.
- **Event vocabulary (closed, extensible by ratified amendment):** commitment made / modified / fulfilled / partially fulfilled / fulfilled-late / not-fulfilled; deadline acknowledged / missed; delay disclosed proactively / after-the-fact; documentation supplied / requested-not-supplied; communication answered / ignored; contradiction made / voluntarily corrected; agreement accepted / rejected / breached; cooperation increased / declined; conflict escalated / de-escalated; required action completed / incomplete.
- **Behavioral dimensions (separate observation streams):** performance, commitment, communication, documentation, cooperation, consistency, resolution.
- **Outputs:** `BehavioralObservation[]` (event-classified, dimension-tagged, provenance-linked). **No character labels — ever** (see §11).
- **Stage 2 implementation note (2026-07-25, `lib/btrm/bae/`):** only two parts of the closed event-class vocabulary are derived automatically, because only these are objectively computable from ENR-001's structured output rather than requiring a semantic read of evidence content: (1) `commitment_made` and the resolution classes, driven directly by `Commitment.status` — itself the caller's structured signal, no inference performed; (2) `deadline_missed`, emitted only when a concrete resolving `TimelineEvent` is linked (`Commitment.fulfilledEventId`) and its `occurredAt` is strictly after `promisedBy` — this module never calls the system clock to decide a still-open or unlinked commitment is "late as of today," which would make output depend on when the function happens to run rather than on recorded evidence. Everything else in the vocabulary (documentation supplied/requested, communication answered/ignored, contradiction made/corrected, agreement accepted/rejected/breached, cooperation increased/declined, conflict escalated/de-escalated, required action completed/incomplete, delay disclosed, deadline acknowledged) requires reading what an evidence item's content actually says, which ENR-001's current structured fields do not carry — BAE-001 accepts these only via an explicit caller-supplied `behavioralHint` on a `TimelineEvent` (mirroring ENR-001's `commitmentHint` pattern), never inferring them itself. Dimension is always computed centrally from `eventClass` (`lib/btrm/bae/dimensions.ts`), never taken from a hint, so there is one source of truth for the mapping. Symmetry (§11) is structural: nothing branches on a subject's identity, only on Commitment/TimelineEvent shape. Shipped dark: `BTRM_STAGE_BAE_ENABLED` is unset everywhere and no caller invokes `observe()` yet.

### 3.3 TM-001 — Trust & Reliance Model  *(REUSE — see `roadmap/TM-001_…`)*
- **Consumes** BAE-001 observations + CM-001. **Produces** claim-specific reliance across independent dimensions: Performance, Commitment, Communication, Documentation, Agreement, Representation-Consistency, Resolution-Participation.
- **Reliance levels:** No / Limited / Conditional / Operational / Elevated / **Indeterminate** (mandatory when evidence insufficient).
- **Absolute rule:** **no global/permanent trust score.** Reliance is always about *a specific claim or commitment in a specific context*, time-bounded and reversible.

### 3.4 CM-001 — Confidence Model  *(REUSE — see `roadmap/CM-001_…`)*
- **Consumes** the evidence base for an assessment. **Produces** a confidence measure on *the analysis itself*: evidence completeness, corroboration, timeline certainty, contradictions, missing records, extraction certainty, sample size, relevance, subjective-language dependence.
- **Rule:** confidence is reported **alongside, never merged into,** reliance. A strong recommendation must never mask low confidence.

### 3.5 ICOA-001 — Interest, Constraint & Objective Analysis
- **Responsibility:** infer each participant's supported interests and constraints (owner: recover rent, preserve tenancy, regain possession, cure violation, document record, reduce burden; tenant: remain, more time, repairs, dispute amount, payment plan, orderly move-out; constraints: funds, statutory deadlines, existing notices, lease terms, evidence quality, owner risk tolerance).
- **Rule:** every inferred interest is labelled **Confirmed / Likely / Possible / Unknown** — never asserted as fact.

### 3.6 RIE-001 — Resolution Intelligence Engine
- **Consumes:** confirmed facts, BAE observations, TM reliance, CM confidence, ICOA interests/constraints, owner objective, applicable workflow rules, legal/compliance boundaries.
- **Produces:** resolution **options** (clarification/evidence request, reminder, structured commitment, payment plan, repair-and-rent coordination, cure agreement, mutual move-out, mediation referral, formal-notice workflow, escalation to filing prep). Each option carries: purpose, required conditions, expected benefit, material risks, reliance assumptions, missing information, reversibility, deadline implications, documentation required, recommended communication.
- **Explicitly not** two simulated personas negotiating. It models *documented* interests/constraints only.

### 3.7 OCM-001 — Outcome Comparison Model
- **Responsibility:** compare the negotiated path against the likely alternative (BATNA-style) **without fabricated precision.**
- **Rule:** qualitative bands only — **Strongly supported / Supported / Uncertain / Weakly supported / Insufficient evidence.** Numeric probabilities are prohibited until backed by validated, sufficiently large, relevant datasets (Founder-gated).

### 3.7.1 RQS — Recommendation Quality & Assurance Framework (added 2026-07-25, ADR-015)
- **Status:** subordinate to OCM-001, not a replacement. Added by RPT-014's reconciliation memorandum to resolve the RQS/OCM-001 conflict identified in RPT-012 §2 and RPT-013 §1.
- **Form:** a qualitative-first, multidimensional recommendation-assurance framework evaluating seven dimensions individually — factual grounding, legal analysis, objective alignment, alternative consideration, risk analysis, communication strategy, execution readiness. No dimension, and no combination of dimensions, produces a single composite number.
- **Quality vs. confidence, distinguished:** quality asks whether the required reasoning process was completed rigorously; confidence asks whether the evidence is sufficient and reliable (CM-001). The two are never merged into one figure — the same rule §3.4 already applies to reliance vs. confidence.
- **Prohibited:** a universal composite recommendation score; false precision (e.g. "87% recommendation quality") anywhere in user-facing output or the constitutional reasoning record; averaging away a critical failure (a weak dimension is not diluted by strength elsewhere).
- **Permitted internal use only:** numeric telemetry for testing, calibration, benchmarking, model-version comparison, and system-health monitoring. Such numbers may never independently approve, reject, rank, or execute a material recommendation, and may never be surfaced as if they were the recommendation's quality or confidence.
- **Gating unaffected:** §6/§11's human-review-gate for material-consequence outputs applies exactly as before; RQS dimensions may inform what a reviewer sees, never substitute for that review.

### 3.8 CS-001 — Communication Strategy
- **Responsibility:** recommend structured communications. **The only component where tone is a first-class input** — and even here tone shapes *delivery*, never the underlying reliance.
- **Rules:** separate facts from allegations; state the specific issue, requested action, and deadline; offer relevant options; avoid accusations and motive-diagnosis; preserve a reviewable record; adapt for reading complexity, language preference, and de-escalation.

### 3.9 POL-001 — Post-Outcome Learning
- **Responsibility:** record what actually happened (accepted/rejected/no-response/completed-on-time/late/partial/breached/replaced/escalated/resolved-by-move-out/resolved-by-payment/referred) and feed it back as new behavioral evidence.
- **Rules:** preserve context (a missed payment during a documented emergency is **not** equated with deliberate repeated nonperformance); **recent, relevant** behavior outweighs old or unrelated behavior; learning updates evidence, never a stored "person score."

## 4. Data model (draft)

```text
EvidenceItem      { id, source, timestamp, author_or_origin, evidence_type, original_content_ref,
                    related_property, related_matter, verification_status, extraction_confidence, access_permissions }
Provenance (enum) { confirmed_fact | document_supported | unverified_statement | disputed_statement | ai_inference | unknown }
TimelineEvent     { id, matter_id, occurred_at, event_type, participants[], source_item_ids[], provenance, disputed:bool }
Commitment        { id, matter_id, committer, description, promised_by, created_from_event_id, status, fulfilled_event_id? }
BehavioralObservation { id, matter_id, subject_id, dimension, event_class, source_event_ids[], provenance, observed_at }
RelianceAssessment    { id, matter_id, subject_id, claim_ref, context, decision_use, dimensions{...}, reliance_level,
                        supporting_factors[], limiting_factors[], valid_until, confidence_ref, risk_if_wrong, human_review_required }
ConfidenceAssessment  { id, target_ref, completeness, corroboration, timeline_certainty, contradictions[], missing[], band }
InterestConstraint    { id, matter_id, party_id, kind:interest|constraint, statement, support_label }
ResolutionOption      { id, matter_id, type, purpose, conditions[], benefit, risks[], reliance_assumptions[],
                        missing_info[], reversibility, deadline_implications, docs_required[], recommended_comm_ref }
OutcomeComparison     { id, matter_id, option_ids[], support_band, rationale }
OutcomeRecord         { id, matter_id, option_id, result, context_notes, recorded_at }
```

**Storage posture (draft):** matter-scoped, RLS owner-scoped (`auth.uid() = user_id`) consistent with existing OwnerPilot tables; original evidence append-only; assessments versioned (`supersedes`) never mutated in place. **No schema is applied by this document** — migration is a future ratified, repository-first step.

## 5. Interfaces / API contracts (internal, draft)

All contracts are internal service calls; none is a public endpoint at draft. Shapes are illustrative.

```text
ENR.normalize(EvidenceItem[])            -> { events: TimelineEvent[], commitments: Commitment[], provenance: ProvenanceLedger }
BAE.observe(TimelineEvent[], Commitment[]) -> BehavioralObservation[]
CM.assess(evidenceScope)                 -> ConfidenceAssessment
TM.reliance(claim, BehavioralObservation[], ConfidenceAssessment) -> RelianceAssessment
ICOA.analyze(matter)                     -> InterestConstraint[]
RIE.options(facts, obs[], reliance[], confidence, interests[], objective, rules) -> ResolutionOption[]
OCM.compare(ResolutionOption[])          -> OutcomeComparison
CS.strategy(option, audienceContext)     -> CommunicationRecommendation
POL.record(option_id, result, context)   -> OutcomeRecord   // async, feeds ENR/BAE on next assessment
```

Every returned assessment/option must carry an **explainability envelope**: `{ evidence_cited[], behaviors_identified[], how_reliance_determined, missing_information[], what_would_change_this, why_preferred }`. Outputs missing the envelope are invalid (no black-box results).

## 6. State machine (matter assessment lifecycle)

```text
COLLECTED → NORMALIZED → OBSERVED → RELIANCE_ASSESSED → INTERESTS_MAPPED
        → OPTIONS_GENERATED → { COMPARED, COMM_DRAFTED } → RECOMMENDED
        → (human review if material) → ACTED → OUTCOME_RECORDED → (loop: new evidence re-enters COLLECTED)
```

Guard: transitions into `RECOMMENDED` for a **material-consequence** option (formal notice, termination, filing prep, settlement terms, material financial concession, intentional-misconduct claim, external reporting) **must** set `human_review_required = true` and cannot auto-advance to `ACTED`.

## 7. Event model (emitted, for audit/analytics)

`evidence.ingested`, `timeline.reconstructed`, `behavior.observed`, `reliance.assessed`, `confidence.assessed`, `interests.mapped`, `options.generated`, `outcome.compared`, `communication.drafted`, `recommendation.made`, `human_review.requested`, `action.taken`, `outcome.recorded`. Each event is PII-scrubbed per the A15 denylist and links to its explainability envelope.

## 8. Dependencies & repository-impact analysis

- **Governance:** EA-100 (host), EA-012 (model governance), REG-CAP-001 (capability registration), IMR-001 (model registry — future), MAP-001 (CRID registry).
- **Reused artifacts:** TM-001, CM-001 (referenced, unchanged).
- **Existing app surfaces (consumers, not modified by this draft):** `app/chat`, `lib/chat`, `lib/riskpath`, `app/riskpath`, `lib/filing`, `lib/documents`, `lib/audit`, `lib/monitoring`.
- **Repo impact at Architecture Draft:** documentation + build-config only (this spec, RPT-011, CBS-001 prefix/planned-CRID registration, regenerated `constitution/index/*.json`). **Zero** application code, zero schema, zero runtime wiring.
- **Overlap watch:** RiskPath already computes risk signals; ICOA/OCM must consume or align with RiskPath rather than fork a parallel risk notion (resolved during implementation design, not here).

## 9. Testing strategy (draft)

- **ENR-001:** deterministic golden-timeline fixtures (dedup, provenance classification, alleged-vs-confirmed); property tests that original evidence is never mutated.
- **BAE-001:** labelled behavioral-event fixtures; assert **no** character-label output; symmetry tests (owner and tenant inputs produce same-class observations).
- **TM-001/CM-001:** reuse their own suites; add contract tests that reliance never collapses to a single global score and confidence is always separate.
- **RIE/OCM/CS:** assert every option carries the full explainability envelope; assert OCM emits only qualitative bands (no numeric probability); assert CS never alters the upstream reliance value.
- **Governance guards (CI):** a lint that fails the build if any BTRM output path can reach an adverse action without `human_review_required`; a prohibited-inference test set (protected characteristics, style-as-proxy).

## 10. Migration strategy (draft)

Repository-first, PROC-100 lifecycle. Order at ratification: (1) split reserved component CRIDs into individual ratified artifacts + register in IMR-001; (2) evidence/assessment schema migration (owner-scoped RLS, append-only evidence) as a reviewed migration; (3) implement ENR-001 first (deterministic, lowest risk), behind a feature flag, read-only/no-decision; (4) BAE-001 descriptive-only; (5) TM/CM/ICOA/RIE/OCM/CS advisory-only with human review; (6) POL-001 last. Each stage flag-gated and independently reversible, mirroring the FF-3 pattern.

## 11. Safeguards (hard constraints — not optional)

- **No personality labeling.** Prohibited outputs include "dishonest person," "bad tenant," "manipulative," "lazy," "aggressive personality," "high-risk person." Permitted: *"Three direct questions about the payment date were not answered"* (event). Forbidden: *"The tenant is evasive by nature"* (inference).
- **No protected-characteristic inference or proxies.** Race, ethnicity, religion, disability, national origin, gender identity, sexual orientation, family/immigration status must never be inferred or used. Writing style, language fluency, spelling, dialect, and emotional expression **must not** be used as proxies.
- **Symmetry.** Identical behavioral standards apply to owners, managers, tenants, vendors, agents. The model must surface owner-side lapses (missed repair commitment, changed agreement, non-response, inconsistent representation, unnecessary escalation) exactly as it does tenant-side.
- **Human review for material consequences** (§6 guard): formal notices, termination, filing prep, settlement terms, material financial concessions, intentional-misconduct claims, external reporting.
- **Reliance is claim-specific, reversible, time-bounded.** No permanent scores. No adverse action based solely on BTRM-001 output.
- **AI never self-ratifies.** Consistent with TM-001/CM-001 and STD-002.

## 12. Phase-3 self-critique (Engineering)

1. **Component proliferation.** Eight new components is a lot of surface. *Mitigation:* only ENR-001 and BAE-001 are foundational; TM/CM are reused; ICOA/RIE/OCM/CS/POL can be deferred or merged if early evidence shows overlap. Recommend delivering ENR-001 + BAE-001 first and re-validating the rest before building them.
2. **BAE↔TM boundary can blur.** "Fulfilled-late" is descriptive, but "how late is too late" edges into judgment. *Mitigation:* BAE records the fact + magnitude; all thresholding lives in TM-001, tested by contract.
3. **Provenance is the whole ballgame.** If ENR mislabels an unverified statement as a confirmed fact, every downstream layer inherits the error. *Mitigation:* provenance defaults to the **weakest** compatible class; upgrades require explicit corroboration; CM-001 penalizes provenance uncertainty.
4. **Recency weighting can erase relevant history.** Over-discounting old behavior could hide a genuine long pattern. *Mitigation:* POL-001 uses relevance-and-recency, not recency alone; long patterns retain weight when relevant.
5. **"No numeric probability" may frustrate users who want a number.** *Accepted trade-off:* defensibility and honesty over false precision until validated data exists.
6. **RiskPath overlap.** Real risk of two parallel risk notions. *Mitigation:* ICOA/OCM must consume RiskPath, not fork it — an explicit design gate before implementation.
7. **Legal exposure.** Any output resembling a tenant "score" is a fair-housing and defamation risk. *Mitigation:* the no-score, no-personality, symmetry, and claim-specific rules are hard CI-guarded constraints, not guidelines.

## 13. Independent architecture-review-board challenge

*Adopting the posture of a skeptical review board attempting to disprove this design.*

- **"This is over-engineered for the product's actual need."** Fair. The minimum viable version is **ENR-001 (timeline) + BAE-001 (behavioral facts) + the explainability envelope** feeding the existing Chat/RiskPath surfaces. TM/CM/ICOA/RIE/OCM/CS/POL should be **gated behind evidence of demand**, not built speculatively. *Board recommendation: ship the two-layer core first; treat the rest as an approved roadmap, not a build order.*
- **"Hidden assumption: evidence is available and machine-readable."** Much real evidence is phone calls, in-person events, and photos. If ENR's inputs are thin, every downstream layer produces low-confidence noise. *Mitigation:* CM-001 must aggressively surface "insufficient evidence," and the UI must treat that as a first-class, non-embarrassing outcome.
- **"Scalability/cost."** Running seven models per matter is expensive and slow. *Mitigation:* the pipeline is lazy — later stages run only when the owner requests a recommendation, not on every message.
- **"Simpler alternative."** A rules-based commitment tracker (promise → deadline → met/missed) plus the explainability envelope delivers ~70% of the value with ~20% of the complexity and near-zero model risk. *Board's genuine recommendation: build that first (it is essentially ENR + a thin BAE), measure, and only then decide whether TM/CM/ICOA/RIE/OCM/POL earn their keep.*
- **"Ethical/legal bottom line."** The design's safeguards are strong **on paper**; their value is entirely in CI enforcement. If the prohibited-inference and no-adverse-action guards are not mechanically enforced, the safeguards are decorative. *Board condition for approval: the guards in §9 ship before any advisory output reaches a user.*

**Board disposition:** the *intent* is sound and the *governance placement* is correct. The board does **not** approve building all eight components at once. It recommends a **reduced first increment (ENR-001 + minimal BAE-001 + explainability + CI safeguards)**, with the remainder held as a ratified roadmap. This is a material change to the build order and is flagged for Founder decision.

## 14. Final architecture objects

| ID | Component | Responsibility | Disposition |
|---|---|---|---|
| BTRM-001 | Behavioral Trust & Resolution Model | Governing enterprise capability | New (this draft) |
| ENR-001 | Evidence Normalization & Reconstruction | Timeline + provenance | New — **first increment** |
| BAE-001 | Behavioral Analysis Engine | Observable behavioral facts (MODEL-BEH) | New — **first increment** |
| TM-001 | Trust & Reliance Model | Claim-specific reliance | **Reuse** |
| CM-001 | Confidence Model | Evidence sufficiency | **Reuse** |
| ICOA-001 | Interest, Constraint & Objective Analysis | Supported interests/constraints | New — roadmap |
| RIE-001 | Resolution Intelligence Engine | Resolution options | New — roadmap |
| OCM-001 | Outcome Comparison Model | Qualitative comparison | New — roadmap |
| CS-001 | Communication Strategy | Structured communication | New — roadmap |
| POL-001 | Post-Outcome Learning | Outcome feedback | New — roadmap |

## 15. What requires Founder decision before any code

1. **Ratify** BTRM-001 to advance past Architecture Draft (STD-002).
2. **Approve the build order:** the review board recommends a reduced first increment (ENR-001 + minimal BAE-001 + explainability + CI safeguards) rather than all eight components. Founder chooses.
3. **Authorize** splitting the reserved component CRIDs into individual artifacts + IMR-001 registration.
4. **Confirm** the EA-012 no-automated-adverse-decision posture carries into implementation (human review at all §11 points).

Until those decisions, this remains an authored draft — no schema, no runtime, no decision path.
