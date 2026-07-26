---
constitutional_id: RPT-019
object_type: report
title: RCO-001 / DECG-001 Joint Reconciliation
status: Concept
version: "1.0"
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-26
updated: 2026-07-26
depends_on: [RCO-001, DECG-001, RPT-017, RPT-018, ADR-019, EA-101]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RCO-001, DECG-001, RPT-017, RPT-018, ADR-019, EA-101, BTRM-001, EA-102, ICOA-001, RIE-001, OCM-001, CKG-001, DOC-003]
registry_tags: [reconciliation, joint, rco-001, decg-001, non-constitutional]
program_phase: research
repository_path: constitution/research/RPT-019_RCO-001_DECG-001_joint_reconciliation.md
checksum_scope: file
---

# RPT-019 — RCO-001 / DECG-001 Joint Reconciliation

> **NON-CONSTITUTIONAL, per the same posture as RPT-017/RPT-018.** This is the joint reconciliation step the Founder specified after RCO-001 (v0.2, PR #300) and DECG-001 (v0.1, PR #301) were both drafted to Proposed. It reconciles the two documents against each other, resolves the access-parity/quarantine-visibility tension DECG-001 §11 flagged, and confirms where the two are already consistent. **It does not ratify RCO-001 or DECG-001, does not itself amend either document, and does not substitute for the genuine independent review-board challenge both still require.** Recommended amendment language is offered for each document's own next revision, not applied here.

## 0. Authority and limits

This memo recommends resolutions and confirms consistency. It creates no constitutional status for RCO-001 or DECG-001 beyond what ADR-019 already established (both reserved, `standard`, Proposed drafting authorized). The governing chain remains unchanged: RCO-001 v0.2 + DECG-001 v0.1 → this reconciliation (recommendations only) → a genuine independent review-board challenge for both → incorporation of any resulting revisions → a single coordinated ADR → Founder ratification. Nothing here shortens that chain.

## 1. Scope

This memo reconciles `constitution/standards/RCO-001_recommendation_object.md` (v0.2) against `constitution/standards/DECG-001_decision_graph.md` (v0.1) — the two documents as they stand after RCO-001's own Founder/architect-directed revision (PR #300) and DECG-001's first draft (PR #301), which was written to already anticipate RCO-001's revised state model. It does not revisit RPT-017 or RPT-018, both of which remain the earlier-stage scoping reconciliations and are unmodified by this memo.

## 2. The core tension: access-parity vs. validity-flagging

**The tension, stated precisely.** RCO-001 §8 guarantees: "Quarantined and Draft-state candidates are never exposed through the same access path as Candidate/Authoritative material." DECG-001 §3 invariant 8 requires that a trace resolving to a Quarantined RCO-001 node be flagged as invalid, never presented as if it supported an Authoritative recommendation. DECG-001 §11 correctly identified that these two rules are in tension as literally stated: if DECG-001 cannot access a Quarantined node at all, it cannot know the node is Quarantined in order to flag the trace built through it.

**Resolution.** The tension dissolves once "access" is split into two distinct operations that RCO-001's guarantee was never intended to conflate:

1. **Content access** — retrieving a node's substantive fields (the recommendation's actual content: objective reference, evidence, risks, communication reference, etc.) for presentation to a decision-maker or execution path. RCO-001 §8's guarantee governs this operation, and only this operation: Quarantined/Draft content must never reach a decision-maker or execution path through the same access path as Authoritative content.
2. **Validity-state access** — reading a node's lifecycle-state metadata (which of the seven states in RCO-001 §1 the node currently occupies) for the sole purpose of correctly classifying a trace as valid, invalid, or stale, per DECG-001 §1/§3 invariant 8. This is a narrower, governed, diagnostic operation. It never retrieves or surfaces the node's substantive content — it surfaces only the fact of the state itself, exactly the way a `humanReviewRequired` flag (RCO-001 §2 invariant 9) is read without exposing the underlying reasoning that set it.

**Recommended resolution, stated as a rule:** A DECG-001 traversal may always read a node's lifecycle state (§1's definitions) for validity-flagging purposes. It may never surface that node's substantive content as part of a trace unless the node is itself in Candidate or Authoritative state. A trace that resolves through a Quarantined or Draft node must be flagged invalid (DECG-001 §3 invariant 8) using only the state metadata — the trace itself must not carry, expose, or make resolvable the Quarantined node's substantive fields. This preserves RCO-001 §8's content guarantee exactly as written, while making DECG-001 §3 invariant 8 achievable rather than self-contradictory.

## 3. Recommended amendment language — RCO-001 §8

For RCO-001's own next revision, this memo recommends amending §8's access-control bullet to read (recommended text, not applied by this memo):

> "Quarantined and Draft-state candidates' *substantive content* is never exposed through the same access path as Candidate/Authoritative material. A governed diagnostic or traversal process (e.g., DECG-001) may read a candidate's lifecycle state alone, without content access, for the sole purpose of validity classification; this is a distinct, narrower operation from content access and does not weaken this guarantee."

## 4. Recommended amendment language — DECG-001 §3 invariant 8, §9, §11

For DECG-001's own next revision, this memo recommends:

- Amending §3 invariant 8 to state explicitly that flagging a trace as invalid uses only the traversed node's lifecycle-state metadata (per RCO-001 §1, once amended per §3 above), never that node's substantive content, when the node is Quarantined or Draft.
- Amending §9's access-parity guarantee to read: "a trace must never expose a node's *substantive content* to a requester who could not otherwise access that content directly through its own governing component; a trace's validity-state flag (derived from lifecycle-state metadata alone) is not subject to this restriction."
- Replacing §11's "genuine open tension" framing with a closure note once RCO-001's §8 amendment (§3 above) is incorporated, citing this memo (RPT-019 §2) as the resolution.

## 5. Confirmed consistency (no issue found)

The following were checked and found already consistent between the two documents; this memo closes them rather than reopening them:

- **Versioning discipline.** Both state their own document version is independent of EA-101's, EA-102's, and each other's document versions (RCO-001 §6, DECG-001 §7). No conflict.
- **CKG-001 non-collision.** Both restate the same rule in the same terms (RCO-001 draws on RPT-017 §2/RPT-018 §3; DECG-001 §0/§3 invariant 5 restates it directly). No conflict.
- **No-fabrication rule.** RCO-001 §2 invariant 10 ("no field may assert unsupported substantive content") and DECG-001 §3 invariant 2 ("no fabricated edges or nodes") are the same underlying principle applied to two different object shapes (a recommendation's fields vs. a trace's edges). No conflict; the two invariants should be read as companions, not duplicates.
- **Reference-not-embed boundary.** RCO-001 §2 invariant 12 and DECG-001 §3 invariant 9 state the identical rule from each document's own side. No conflict.
- **Policy-engine prohibition.** RCO-001 §7 and DECG-001 §8 both independently prohibit their own artifact from becoming a policy engine (selecting strategy, altering substance, approving execution). No conflict; both correctly locate that authority upstream (Recommendation Synthesizer, RIE-001, OCM-001).

## 6. Lifecycle-model composition

RCO-001 defines seven lifecycle states for a *produced object* (Draft, Quarantined, Candidate, Authoritative, Corrected, Superseded, Archived — RCO-001 §1). DECG-001 defines trace-level concepts (completeness, validity, currency, version-awareness — DECG-001 §1) for a *derived, read-only layer*. These are not competing definitions of the same thing; they are a dependency relationship. **Recommended clarification for both documents' own next revision:** DECG-001's notion of "trace validity" is defined *in terms of* whatever lifecycle-state model each traversed node type's own governing standard establishes — RCO-001's states for RCO-001 nodes, and each of ICOA-001/RIE-001/OCM-001/EA-102/POL-001's own existing states or equivalent concepts for their own node types. DECG-001 does not invent a second, parallel validity concept; it is a consumer of whatever validity concept each node type's owning standard already defines. Stating this dependency direction explicitly (rather than leaving it implicit, as both current drafts do) would remove any future reader's temptation to treat DECG-001 §1 as a redundant or competing state model.

## 7. Ratification path

Consistent with the Founder's own stated sequence, this memo confirms (not decides) that RCO-001 and DECG-001 are intended to reach a **single coordinated ADR and Founder ratification covering both artifacts together**, not two independent ADRs. This is consistent with RPT-018 §1's framing of the two as "distinct but interoperable" and with the practical fact that DECG-001's own invariants (§3 invariants 6, 8, 9) are unstatable without reference to RCO-001's lifecycle model. A single ADR should ratify both, incorporating whatever amendments result from §§3–4 above and from the genuine independent review-board challenge each document still requires.

## 8. What remains — this memo does not substitute for it

- A **genuine, independent review-board challenge** for both RCO-001 v0.2 and DECG-001 v0.1 (and, if incorporated, their §3/§4-amended revisions) — conducted by a reviewer without authorship stake, per both documents' own §0 statements. This memo is a reconciliation between two drafts, not that review.
- Incorporation (or rejection, with reasons) of the recommended amendment language in §§3–4 into each document's own next revision.
- The precise text of the coordinated ADR itself (§7) — not drafted here.
- Founder ratification of both, following that ADR.

## 9. Status

Reconciliation only. RCO-001 and DECG-001 remain Proposed, unratified, and — pending the Founder's decision on §§3–4's recommended amendments — unmodified by this memo. Neither is ratified, and no implementation is authorized, by anything in this document.
