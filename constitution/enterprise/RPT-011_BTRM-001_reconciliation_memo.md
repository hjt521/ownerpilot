---
constitutional_id: RPT-011
object_type: report
title: BTRM-001 Reconciliation Memo (Phase-1)
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-25
updated: 2026-07-25
depends_on: [EA-100, EA-012, REG-CAP-001, MAP-001]
required_by: [BTRM-001]
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, TM-001, CM-001, BAE-001, ENR-001, ICOA-001, RIE-001, OCM-001, CS-001, POL-001]
registry_tags: [btrm, reconciliation, phase-1, intelligence, dedup]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/RPT-011_BTRM-001_reconciliation_memo.md
checksum_scope: file
---

# RPT-011 — BTRM-001 Reconciliation Memo (Phase-1)

**Purpose of this memo.** Before authoring the BTRM-001 specification, reconcile the proposed component set against what already exists in the Constitution, so BTRM-001 **reuses** existing artifacts instead of re-deriving them under new names. This is the Phase-1 "do not duplicate architecture" checkpoint. It fixes the component taxonomy, places BTRM-001 correctly in the architecture, and states the governance gate that bounds the Phase-2 spec. **No production, schema, or intelligence-model implementation is performed here or in the spec that follows.**

## 1. Exists / reuse / new — component reconciliation

| Proposed component | Status in repo | Disposition |
|---|---|---|
| **TM-001** Trust & Reliance Model | **EXISTS** — `constitution/roadmap/TM-001_enterprise_trust_model_proposal.md`, Proposed, governed by EA-012. Already specifies claim-specific reliance, independent dimensions, *no global trust score*, and the full prohibition set (no protected-class inference, no tone-only conclusions, no autonomous AI ratification). | **Reuse as-is.** BTRM-001 references TM-001; it does **not** re-specify a trust model. Any refinement to TM-001 is a change *to TM-001*, not a new artifact. |
| **CM-001** Confidence Model | **EXISTS** — `constitution/roadmap/CM-001_confidence_model_proposal.md`, Proposed, governed by EA-012. Evidence-completeness, separate from trust, the trust-high/confidence-low worked example already present. | **Reuse as-is.** BTRM-001 references CM-001. |
| **BAE-001** Behavioral Analysis Engine | **RESERVED slot** — MAP-001 reserves `MODEL-BEH` ("Behavioral … reserved, to be registered when IMR-001 is built"); TM-001 already names "Behavioral Intelligence" as *distinct* from Trust. | **New artifact filling an anticipated slot.** BAE-001 is the concrete Behavioral model that MAP-001 reserved as `MODEL-BEH`. Author under BTRM-001; register in IMR-001 when that registry lands. |
| **ENR-001** Evidence Normalization & Reconstruction | New | **New.** Deterministic pre-processing (timeline, dedup, event/commitment extraction, provenance classification). Not an intelligence model — mostly rules/parsers; lowest governance risk. |
| **ICOA-001** Interest, Constraint & Objective Analysis | New | **New.** Interest/constraint inference with confirmed/likely/possible/unknown labels. |
| **RIE-001** Resolution Intelligence Engine | New | **New.** Option generator; consumes all upstream layers. |
| **OCM-001** Outcome Comparison Model | New | **New.** Qualitative comparison (no fabricated probabilities). |
| **CS-001** Communication Strategy | New | **New.** Structured-communication recommender; the only place tone is a first-class input. |
| **POL-001** Post-Outcome Learning | New | **New.** Records actual outcomes; feeds ENR/BAE with recency weighting. |
| **BTRM-001** Behavioral Trust & Resolution Model | New (governing) | **New governing enterprise capability** that orchestrates the above. |

**Net-new artifacts:** BTRM-001, ENR-001, BAE-001, ICOA-001, RIE-001, OCM-001, CS-001, POL-001 (8). **Reused:** TM-001, CM-001 (2). Existing governing architecture: **EA-012** (Constitutional Intelligence Layer), **EA-100** (Enterprise Architecture), **IMR-001** (Intelligence Model Registry, Proposed — the eventual registration point for the model-class components).

## 2. Where BTRM-001 sits

BTRM-001 is an **enterprise capability** (EA-100 family, an ECAP-class object) that **consumes** the intelligence-layer models governed by **EA-012**. It is *not* a new constitutional framework and introduces no new constitutional principles (per the Founder directive: "the Constitution is already complete"). The layering:

```
EA-000  Constitutional Meta-Architecture (governs everything)
  └─ EA-100  OwnerPilot Enterprise Architecture
       └─ BTRM-001  Behavioral Trust & Resolution Model   ← enterprise capability (this work)
            consumes ↓
       EA-012  Constitutional Intelligence Layer (governs the models)
            ├─ ENR-001, BAE-001 (behavioral/evidence models)
            ├─ TM-001 (reuse), CM-001 (reuse)
            ├─ ICOA-001, RIE-001, OCM-001, POL-001
            └─ CS-001 (communication)
       registers in ↓
       IMR-001  Intelligence Model Registry (when built)
```

Owner-facing surfaces (AI Chat, RiskPath, Serve & Track, Notice/Document generation, future Reporting) are **consumers** of BTRM-001 outputs; they are not part of BTRM-001.

## 3. Corrected taxonomy (proposed)

- **Governing capability:** BTRM-001 (enterprise capability under EA-100).
- **Pipeline stages (ordered):** ENR-001 → BAE-001 → { TM-001, CM-001 } → ICOA-001 → RIE-001 → { OCM-001, CS-001 } → recommended next action → POL-001 (feedback).
- **Model-class components** (governed by EA-012, register in IMR-001): ENR-001, BAE-001, TM-001, CM-001, ICOA-001, RIE-001, OCM-001, POL-001.
- **Strategy component:** CS-001 (communication; tone-aware).
- **Reused, unchanged:** TM-001, CM-001 — referenced, not rebuilt.

## 4. Governance gate (binds the Phase-2 spec)

1. **Author-only lifecycle.** Per STD-002, AI authors to **Architecture Draft** and never self-advances or self-ratifies. The BTRM-001 spec and all new component artifacts are created at `lifecycle_state: Architecture Draft`. Founder ratification is required before any advance.
2. **EA-012 posture.** "Architecture-and-evidence-model-first; **no automated adverse decisions**." No runtime code that makes or triggers an adverse action (eviction, denial, escalation, financial penalty) may be implemented until Founder ratification, and even then only with mandatory human review at the enumerated decision points.
3. **No duplication.** TM-001 and CM-001 are reused, not recreated (see §1). BAE-001 is bound to the reserved `MODEL-BEH` concept.
4. **Model hold respected.** This memo and the spec are **design authoring** (authorized by the Founder directive), not model activation. No intelligence model is trained, deployed, or wired into a decision path.
5. **Safeguards are load-bearing, not appendix.** No personality labeling; no protected-characteristic inference or proxies; symmetrical standards across all party types; observable conduct dominates language. These are specified as hard constraints in BTRM-001, mirroring TM-001's prohibition set.

**Recommendation:** proceed to author BTRM-001 as an Architecture-Draft enterprise capability under EA-100, reusing TM-001/CM-001 and slotting BAE-001 into the reserved behavioral position, then subject it to a self-critique and an independent architecture-review-board challenge. Stop at Architecture Draft pending Founder ratification.

**Update (2026-07-25):** the Founder reviewed BTRM-001's self-critique and review-board challenge and ratified BTRM-001 with the full eight-component build authorized (ADR-013), which also lifts the ADR-012 intelligence hold scoped to this component set. Implementation proceeds in dependency-ordered, flag-gated stages per BTRM-001's build log.
