---
constitutional_id: RPT-013
object_type: report
title: RP-006 Architecture Impact Assessment (New Elements Addendum)
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-25
updated: 2026-07-25
depends_on: [RP-006, RP-005, RPT-012, EA-100, EA-012, BTRM-001]
required_by: []
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-006, RP-005, RPT-012, BTRM-001, OCM-001, ICOA-001, ADR-014, EA-012, DOC-003]
registry_tags: [architecture-impact-assessment, rp-006, reconciliation, decision-intelligence, opos, opil]
program_phase: research
repository_path: constitution/research/RPT-013_RP-006_architecture_impact_assessment.md
checksum_scope: file
---

# RPT-013 — RP-006 Architecture Impact Assessment (New Elements Addendum)

**Purpose.** RP-006 restates most of RP-005, already assessed in RPT-012. This addendum covers only what RP-006 adds: Recommendation Object, Decision Graph, OPOS, OPIL, RQS, DIRP, EDIC, and the Nine Foundational Questions. It makes no constitutional change and authorizes no implementation.

## 1. New-element disposition

| New element (RP-006) | Existing artifact(s) / concern | Disposition |
|---|---|---|
| Recommendation Object | No existing formal schema; closest is BTRM-001's Stage 0 output envelope | Genuine gap, but scope it against BTRM-001's existing output envelope first — a second, parallel "recommendation" schema risks two incompatible output shapes for the same underlying pipeline. |
| Decision Graph | **ICOA-001** (Issue/Claim/Objective Analysis, BTRM-001 component) covers adjacent explainability territory | Overlapping, not identical. Reconcile against ICOA-001 before treating this as a new structure. |
| OPOS ("how OwnerPilot thinks") | **EA-012** Constitutional Intelligence Layer (Proposed) already names the substrate all intelligence work is meant to route through | Naming collision risk. Minting OPOS alongside an already-Proposed EA-012 would give the platform two "everything runs on this" layer names for the same conceptual slot. Recommend reconciling into EA-012 rather than introducing a second name. |
| OPIL ("everything routes through this") | Same as above — EA-012 | Same naming-collision risk as OPOS. OPOS and OPIL as described are not clearly distinct from each other or from EA-012; a reconciliation memo should resolve to at most one artifact, not three names for one layer. |
| RQS (Recommendation Quality Score) — Fact/Legal/Negotiation/Outcome/Communication/Business Confidence | **OCM-001** (BTRM-001 §3.7/§15) | **Same unresolved conflict already flagged in RPT-012 §2, resurfacing under a new name.** OCM-001 was ratified as strictly qualitative (support bands) specifically to prohibit fabricated numeric confidence/probability output. RQS proposes exactly that kind of numeric scoring across six dimensions. This is not new territory to evaluate — it is the same conflict, still unresolved, and RP-006 does not address it. Any Architecture Draft must resolve RQS the same way RPT-012 §2 already requires for the Outcome Projection Engine: either a principled, evidence-grounded scoring methodology carried through independent review-board challenge, or replace numeric scores with OCM-001's existing qualitative bands. |
| DIRP (Decision Intelligence Research Program) | **ADR-014** | Restates RPT-012's finding unchanged: fold DIRP's research areas into ADR-014's existing RP pipeline rather than standing up a second, separately-named research program. |
| EDIC (corpus of thousands of business-decision scenarios, including actual outcomes and retrospectives) | No existing artifact | **New concern, not covered by RPT-012.** If this corpus is built from real OwnerPilot client matters (as opposed to synthetic scenarios), it raises data-governance, client-confidentiality, and IP-provenance questions that sit outside this assessment's scope and outside RP-006's text, which does not specify sourcing. This needs an explicit sourcing/privacy answer before any Architecture Draft — recommend it not be assumed to mean "mine live client data" by default. |
| Nine Foundational Questions | RP-005's Internal Recommendation Framework (nine questions, different wording, same purpose) | Duplicate framing of the same checklist. Consolidate to one version rather than maintaining two near-identical nine-question lists across RP-005 and RP-006. |

## 2. Recommendation

Unchanged from RPT-012's ordering, with two additions: resolve the OPOS/OPIL/EA-012 naming collision before either name is used in any future draft, and resolve EDIC's data-sourcing question explicitly before any corpus work begins. The RQS-vs-OCM-001 conflict is not a new finding — it is RPT-012 §2's conflict re-appearing under a different name, and does not get any closer to resolved by being restated in a new document. No ratification, no CRID assignment, no implementation authorized by this report.
