---
constitutional_id: CM-001
object_type: constitutional_intelligence_model
title: Confidence Model
status: PROPOSED
authority_source: Founder (identified as a missing model during TM-001 review; design NOT yet authorized to begin)
canonical_owner: Constitutional Intelligence
ratification_authority: Founder
implementation_posture: architecture-and-evidence-model-first; no automated adverse decisions
program_priority: after TM-001 (design CM-001 following TM-001, not before)
---

# CM-001 — Confidence Model™ (PROPOSED)

> **Recorded, not designed.** The Founder identified CM-001 as a missing model during the TM-001 review and directed that it be designed **after** TM-001. This file **preserves the Founder's specification** only. No architecture, canonical mapping, schema, or DB change is performed here. **Not binding until Founder ratification of the completed canonical artifact.**

## Purpose
Measure the **completeness and quality of the evidence** behind a claim, output, or decision — *not* the actor. Confidence is a property of the evidence base, reusable anywhere the platform reasons under uncertainty.

## The three-way distinction (why CM-001 is separate)
People routinely conflate three different things:
- **Trust** (TM-001) — permissible *reliance* on a person/organization/system/AI output in a defined context.
- **Confidence** (CM-001) — how *complete and high-quality* the evidence is, independent of who the actor is.
- **Risk** — the cost/consequence if reliance is misplaced.

**Worked example (Founder):** OwnerPilot may *trust* Sofia's honesty (a TM-001 dimension) while holding *low confidence* that every allegation about her roommate is factually complete — because the evidence is one-sided. High trust in the actor, low confidence in the evidence set. The two must not collapse into one number.

## Reusability (design target — shared, not per-domain)
CM-001 must be reusable across: tenant cases · AI outputs · OCR · document verification · simulations · legal recommendations · pricing models · **and TM-001 itself** (trust assessments carry an evidence-confidence, distinct from the reliance level).

## Constitutional posture (inherited from the Intelligence Layer directive)
Shares the **common evidence model, traceability model, and review model** with every other intelligence model (Behavioral, Trust, Negotiation, Decision). CM-001 is **not** a standalone scoring system. Prohibitions carry over: no hidden adverse scoring, no treating AI confidence as factual certainty, no material adverse action based solely on a confidence value, no autonomous AI ratification, `Indeterminate` when evidence is insufficient. Every confidence conclusion must be evidence-backed and explainable, and must name the evidence gaps that lower it.

## Relationship to CA-001 and TM-001
CA-001 audits evidence integrity; CM-001 quantifies evidence completeness/quality — they are complementary, not overlapping. TM-001 *references* CM-001 (a trust assessment reports its evidence-confidence via CM-001 rather than reinventing one).

## Canonical placement intent (mapping is post-TM-001 work; NOT done here)
Audit + extend, do not duplicate the existing intelligence-assessment/evidence structures. A new table only if no current structure can represent evidence-completeness/quality without semantic distortion. To be resolved during CM-001 design, after TM-001.

## Status in program
PROPOSED · sequenced after TM-001 · **no schema, no DB change, no design begun, no ratification** until the Founder authorizes CM-001 design and later ratifies the completed canonical artifact.
