---
constitutional_id: RPT-016
object_type: report
title: RP-008 (Cognitive Architecture Omnibus) Architecture Impact Assessment
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-26
updated: 2026-07-26
depends_on: [RP-008, BTRM-001]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-008, BTRM-001, ENR-001, BAE-001, TM-001, CM-001, RIE-001, CS-001, POL-001, ICOA-001, RP-004, RP-005, RP-006, RP-007, RPT-012, RPT-013, RPT-014, RPT-015, ADR-015, ADR-016, DOC-003, EA-012, IMR-001]
registry_tags: [report, architecture-impact-assessment, cognitive-architecture, ea-101, opos, opil, non-constitutional]
program_phase: research
repository_path: constitution/enterprise/RPT-016_RP-008_architecture_impact_assessment.md
checksum_scope: file
---

# RPT-016 — Architecture Impact Assessment: RP-008 (Cognitive Architecture Omnibus)

> **§1's naming-collision finding is CLOSED by ADR-016 (2026-07-26, Founder ruling):** the Founder chose option (b) below — EA-101/OPOS/OPIL-EA-012 are a real three-layer stack, not one concept under three names. This annotation records the closure per DOC-003 §9; the original finding is preserved unmodified for the record.

> **NON-CONSTITUTIONAL.** Companion impact assessment to RP-008, in the same role RPT-012/013/015 played for RP-005/006/007. Findings, not decisions. Nothing here amends BTRM-001, OCM-001, EA-012, or any ratified artifact.

## 1. Most urgent finding: the naming collision has escalated to three names

RPT-013 first flagged that RP-006's "OPOS"/"OPIL" risked colliding with the already-Proposed **EA-012** (Constitutional Intelligence Layer) — one underlying concept, two new names. RPT-015 confirmed RP-007 correctly deferred that open question rather than compounding it. RP-008 now adds a **third** name into the same conceptual space:

- **EA-101** — "OwnerPilot Cognitive Architecture... How OwnerPilot Thinks... the highest-level intelligence architecture after the constitutional framework."
- **OPOS** — "OwnerPilot Operating System... defines how OwnerPilot reasons... every future capability becomes an application running on OPOS."
- **OPIL / EA-012** — "the permanent intelligence layer... every workflow should consume OPIL."

Read literally, EA-101's subtitle ("How OwnerPilot Thinks") and OPOS's definition ("defines how OwnerPilot reasons") are describing the same thing in the same words, and OPIL/EA-012 is described as the runtime layer workflows consume — which is arguably also what OPOS is described as being the foundation for. It is not clear from this directive whether EA-101, OPOS, and OPIL/EA-012 are: (a) three names for one architecture, (b) a real three-layer stack (EA-101 = the architecture document; OPOS = the reasoning kernel it describes; OPIL/EA-012 = the intelligence layer that exposes it to workflows), or (c) two of the three should be retired in favor of one. This is not a new question to research — it is the same open question from RPT-013, now with a third name added before the first two were reconciled. Recommend this be the **first** thing resolved before any Architecture Draft begins, ideally by the Founder stating explicitly which of (a)/(b)/(c) is intended, since every other component in this directive is described as reporting into whichever of these three turns out to be the real top-level artifact.

## 2. Fourth occurrence of the numeric-probability conflict — this time not self-qualified

The Outcome Projection Engine section asks for "probability ranges" (best/expected/worst case) without restating any of the guardrails that RP-007 v0.2 wrote into its own equivalent section. This is the same construct, under the same name, that RPT-012 §2 originally flagged as conflicting with OCM-001's qualitative-only mandate — RP-005's Outcome Projection Engine. RP-006's RQS was the second occurrence (resolved via RPT-014/ADR-015). RP-007's Predictive Intelligence was the third (self-resolved in its own text). This is the fourth, and unlike RP-007 it does not restate the disposition itself. To be unambiguous: this must still be built exactly under the already-ratified **ADR-015 / BTRM-001 §3.7.1** disposition — probability ranges as internal, bounded, Founder-gated diagnostic telemetry only, qualitative bands for anything user-facing or decision-controlling, no false precision, no averaging away a critical failure. No new reconciliation memo is required, but this section should not be implemented as literally written (raw "probability ranges" with no qualification) without that disposition applied explicitly. The Financial Intelligence Engine's "collection probability" is subject to the identical rule.

## 3. EDIC: "begin implementation" collides with an already-flagged, still-open prerequisite

RPT-013 flagged that RP-006's EDIC "raises an unaddressed data-sourcing/privacy/IP question if built from real client matters rather than synthetic scenarios — needs an explicit answer before any corpus work." That question was never answered. RP-008 now directs "begin implementation" of EDIC. Recommend **not** beginning EDIC implementation until the Founder explicitly answers: will EDIC be built from synthetic/simulated cases, real (anonymized) client matters, or both — and if real matters are involved, what consent, anonymization, and IP framework governs them. This is a prerequisite, not a research question to explore during implementation; beginning implementation without it risks building on an assumption the Founder hasn't actually made.

## 4. Engine-by-engine mapping: new vs. reuse

| RP-008 construct | Existing owner | Assessment |
|---|---|---|
| Goal Engine | RP-005's Owner Context Engine (POL-001 + RP-003 per RPT-012) | Reuse — same construct, different name |
| Facts Engine | ENR-001 (per RPT-012's own mapping) | Largely reuse; the "unknowns/assumptions" framing is closer to CM-001 |
| Evidence Engine | ENR-001 | This appears to be ENR-001 itself under a second name in the same directive as "Facts Engine" — recommend clarifying whether Facts and Evidence are one engine or two before drafting |
| Legal & Compliance Engine | existing (directive itself says "expand") | Reuse, self-aware |
| Financial Intelligence Engine | none | Genuinely new — no BTRM-001 component covers cost/value/portfolio modeling |
| Negotiation Intelligence Engine | RP-004 (directive itself says "expand") | Reuse, self-aware |
| Tenant Behavioral Intelligence Engine | RP-007 / BAE-001 (directive itself says "implement RP-007") | Reuse, self-aware — see §6 on sequencing |
| Case Evolution Engine | RP-007's CEE | Reuse, self-aware, reconfirms RPT-015's finding that CEE has no existing BTRM-001 owner |
| Outcome Projection Engine | RP-005 (identical name) | Restates RP-005's original construct — see §2 |
| Optionality Engine | none | New; possibly a cross-cutting principle rather than a standalone engine — see §8 |
| Strategic Communication Engine | CS-001 (Stage 6) | Reuse |
| Recommendation Synthesizer | RIE-001 (Stage 5) + RP-006's construct of the same name | Reuse — third document to describe the same object |
| Learning Engine | POL-001 (Stage 7) | Reuse |
| Recommendation Object | RP-006 (first introduced) | Restated with an expanded, slightly different field list — see §7 |
| Decision Graph | RP-006 (first introduced) | Restated, consistent extension — no new conflict |
| Model Registry | IMR-001 | Reuse, self-aware ("accelerate IMR-001") |

## 5. Decision Engineering Lab overlaps with ESL-005

ESL-005 (Monte Carlo) already has an accepted architecture and two resolved design decisions per STATUS.md, currently held behind the unrelated FF-3 production-flip window, not the intelligence hold. The Decision Engineering Lab's "use Monte Carlo methods where appropriate to test sensitivity and robustness" should reuse ESL-005's already-accepted design rather than stand up a second, parallel Monte Carlo capability. Recommend the eventual Architecture Draft treat ESL-005 as the simulation-infrastructure layer the Decision Engineering Lab builds cases on top of, and note that ESL-005's own resume is still gated on the FF-3 window regardless of this directive.

## 6. Testing Program, Decision Engineering Lab, and the Founder's proposed Evaluation Lab substantially overlap

The directive's own "Testing Program" section lists confidence calibration and human-expert comparison as required regression-harness items. The Founder's closing recommendation for an "Evaluation Lab" — comparing reasoning approaches against the same cases, checking confidence calibration, and comparing against what experienced property managers would choose — restates two of those same items nearly verbatim, and both the Testing Program and the Decision Engineering Lab already involve running many cases through the engines to check behavior before production. As submitted, this is three overlapping initiatives (pre-production stress-testing, regression/replay testing, and ongoing comparative model evaluation) rather than three distinct ones. The underlying idea in the Evaluation Lab recommendation is sound and consistent with DOC-003/OCM-001's evidence-over-plausibility posture — recommend keeping it, but consolidating scope explicitly in the Architecture Draft: Decision Engineering Lab as pre-production stress-testing/sensitivity analysis (built on ESL-005), Testing Program as ongoing regression/replay testing, and Evaluation Lab as the comparative, model-vs-model and model-vs-human-expert calibration layer that sits above both and can also run post-production. Three names for a coherent, non-duplicative set of responsibilities, not three separately-built systems.

## 7. Recommendation Object now has three divergent field lists

RP-006 first introduced a Recommendation Object schema (flagged in RPT-013, no conflict noted then). RP-008 restates it with an expanded and reordered field list (adding "Winning Strategy," "behavioral observations," "negotiation strategy," "communications" as explicit fields not previously listed the same way). If implementation is ever drafted from whichever document a future engineer reads, small differences in field naming/order between RP-006's version and RP-008's version could create real schema drift. Recommend the Architecture Draft define exactly one canonical Recommendation Object schema, superseding both prior informal field lists, rather than treating either RP's list as authoritative.

## 8. Model Validation's four states should extend IMR-001, not stand beside it

IMR-001's existing spec already includes a "maturity" field (per STATUS.md's description of the registry entry schema). RP-008's four-state model-validation lifecycle (Research / Experimental / Validated / Production) reads as the concrete enumeration that field has been missing, not a new, separate lifecycle standard. Recommend it be folded directly into IMR-001's spec as the definition of `maturity`, rather than introduced as an independent construct that could drift from IMR-001 over time. This is distinct from, and should not be confused with, STD-002's Constitutional Artifact Lifecycle (Concept → ... → Archived), which governs documents, not runtime model readiness — the two serve different objects and both can stand.

## 9. Optionality Engine — engine or principle?

"Preserve future strategic options whenever doing so materially improves expected outcomes... this principle applies across the entire platform" reads as a cross-cutting decision principle (similar to how BATNA/leverage already factor into Negotiation Intelligence, and multiple-futures already factor into Outcome Projection) rather than a standalone reasoning engine with its own inputs/outputs. Flag as an open design question for the Architecture Draft: is this a ninth/tenth engine in the pipeline, or a scoring heuristic the Recommendation Synthesizer applies when comparing alternative strategies from the other engines? Both are defensible; the directive doesn't resolve it, and the answer affects the Decision Graph's stated node sequence, which does not currently include Optionality as its own stage.

## 10. ECAP refactor has a real sequencing implication

"Refactor each capability to consume the Cognitive Architecture rather than implementing independent reasoning" applies to all 12 modeled ECAPs — including the 4 already delivered in Wave 1 (ECAP-001 AI Assistant, ECAP-002 Document Generation, ECAP-003 Serve & Track, ECAP-010 Evidence Management), which were built and released before any of this engine pipeline existed. This directive implies future rework of already-shipped, released capabilities once the Cognitive Architecture exists — not a conflict, but a concrete future cost worth surfacing now rather than discovering later. Recommend the eventual roadmap explicitly schedule a Wave-1-refactor phase rather than treating the engine build as additive-only.

## 11. Concept-stage sequencing sketch (not a full roadmap)

The directive asks for a phased implementation roadmap as one of its deliverables; a real roadmap is Architecture Draft-stage work and isn't performed here, but the dependency shape is already visible from what exists today:

1. **Naming resolution (§1)** — blocks everything, since every engine is described as reporting into whichever of EA-101/OPOS/OPIL turns out to be real.
2. **Reuse existing reserved slots first** — Financial Intelligence Engine is the only entirely new BTRM-001-adjacent component; everything else in the pipeline already has a reserved slot (ENR-001, BAE-001/RP-007, RP-004, CS-001, RIE-001, POL-001) that BTRM-001 Stages 3-7 are already sequenced to build.
3. **BTRM-001 Stage 3-7 completion is a hard dependency** for most of this directive's engine list — RIE-001 (Recommendation Synthesizer), CS-001 (Strategic Communication), POL-001 (Learning Engine), and CM-001 (feeds Facts/Confidence) are all still pending per the existing build order.
4. **EDIC and Decision Engineering Lab** depend on the naming resolution and on having real engines to generate cases from; EDIC additionally depends on §3's prerequisite answer.
5. **Evaluation Lab / Testing Program consolidation (§6)** is best scoped once the engines it evaluates exist, but its design (what gets compared, how) can proceed in parallel.
6. **ECAP refactor** is necessarily last — it depends on the engines existing to refactor into.

## 12. Recommendation

1. Resolve the EA-101/OPOS/OPIL-EA-012 naming and layering question first — this blocks a coherent Architecture Draft for everything else in this directive.
2. Build the Outcome Projection Engine's probability ranges and the Financial Intelligence Engine's collection probability under the existing ADR-015/BTRM-001 §3.7.1 disposition, unmodified — do not treat this as reopened.
3. Do not begin EDIC implementation until the real-vs-synthetic-data/privacy/IP question from RPT-013 is explicitly answered.
4. Scope only the Financial Intelligence Engine as genuinely new architecture; treat every other named engine as continuing BTRM-001's already-sequenced Stage 3-7 build plus RP-004/RP-007.
5. Consolidate Testing Program, Decision Engineering Lab, and Evaluation Lab into one coherently-scoped capability rather than three overlapping ones; reuse ESL-005 rather than duplicating Monte Carlo infrastructure.
6. Define one canonical Recommendation Object schema, superseding RP-006's and RP-008's separate field lists.
7. Fold the four-state model-validation lifecycle into IMR-001's existing `maturity` field rather than introducing it as a standalone construct.
8. Resolve whether the Optionality Engine is a pipeline stage or a cross-cutting scoring principle before it appears in a Decision Graph diagram.
9. Schedule ECAP Wave-1 refactor as an explicit future phase, not an afterthought.

## 13. Status

Findings only. RP-008 remains Concept. No Architecture Draft has begun. No CRID has been assigned to EA-101, OPOS, OPIL's acceleration, any named engine, EDIC, Decision Engineering Lab, Evaluation Lab, or the four-state model-validation lifecycle.
