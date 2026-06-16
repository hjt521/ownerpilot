# Broker Compliance Determination — Locked-Prose CI Guard + Hash Manifest (`BROKER_WORKFLOW_PRODUCTION_LIVE`) — Scope, Membership & Interim Control

**File:** `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)
**Date:** 2026-06-15
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority.
**Implements:** `backlog_locked_prose_ci_guard.md` (raised 2026-06-15)
**Posture:** Broker-prepared workflow under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). Not legal advice.

---

## §0. What this determination does

The backlog ticket flagged that **`BROKER_WORKFLOW_PRODUCTION_LIVE` and the locked-prose hash manifest are not built yet**, even though multiple shipped determinations name them as the integrity mechanism for verbatim face constants. This determination does three things:

1. **Defines the locked-prose set** — the enumerated registry of strings the guard will protect (§2).
2. **Answers the four open design questions** in backlog §4 (§3).
3. **Ratifies the interim control of record** (exact-match patch-script discipline) and corrects determination drafting going forward so the guard is described as **required-but-pending** until it ships (§4).

This is the broker spec the build side needs to begin implementation per the backlog's acceptance criteria.

---

## §1. Posture correction — the guard is not live today

Until the backlog ticket ships, `BROKER_WORKFLOW_PRODUCTION_LIVE` and the locked-prose hash manifest **do not exist as automated controls.** Several determinations I authored or ratified this cycle — including [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md), [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md), and [`c1_pobox_scope_multiselect_broker_determination_2026-06-15.md`](c1_pobox_scope_multiselect_broker_determination_2026-06-15.md) — refer to the guard in present tense ("any future edit fails the guard"). That phrasing is forward-looking, not a description of an existing automated control. The guard is the **target state**; the patch-script discipline in §4 is the **current state**.

Build side: where existing determinations describe the guard in present tense, treat that language as forward-looking spec, not as a representation of a live control. This determination is the authoritative statement of what exists today and what is pending.

The drafting-precision item ([`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) §6) governs going forward: future determinations referring to this guard must say **"protected by the `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard (required-but-pending; see [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md))"** until the build side confirms the guard is live in CI.

---

## §2. Locked-prose set — membership

The locked-prose set is the complete enumerated registry of build-locked strings that originate from a broker determination. Membership is **comprehensive**, not face-only: anything authored verbatim by a broker determination and wired into shipped code is in the set.

### §2.1 Tier A — Face prose (renders on the tenant-facing 3-day notice)

Source-of-truth file: `lib/produce/renderNotice.ts` (`NOTICE_PROSE` constants).

**Locked labels (six):**

| Constant | Verbatim value | Source |
|---|---|---|
| `payableToLabel` | `Payable to` | A1 Part D ([`A1_part_d_attorney_countersign_2026-06-04.md`](A1_part_d_attorney_countersign_2026-06-04.md), broker-ratified) |
| `telephoneLabel` | `Telephone` | A1 Part D (broker-ratified) |
| `mailToLabel` | `By mail to` | A1 Part D (broker-ratified) |
| `inPersonOrMailLabel` | `In person or by mail to` | A1 Part D (broker-ratified) |
| `personalDeliveryLabel` | `Available for personal delivery` | A1 Part D (broker-ratified) |
| `inPersonOnlyLabel` | `In person to` | [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md) §3 |

**Locked sentences (six):**

| Constant | Source |
|---|---|
| `mailboxRuleSentence` | A1 Part D (broker-ratified) |
| `fiveMileSentence` | A1 Part D (broker-ratified) |
| `bankPaperInstrumentSentence` | A1 Part D (broker-ratified) |
| `eftElectionSentence` | A1 Part D (broker-ratified) |
| `inPersonOnlySentence` | [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 |
| `inPersonNoMailSentence` | [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 |

**Locked face citations (two):**

| Constant | Source |
|---|---|
| `POS_PROSE.faceCitation` (cites § 1162) | [`ownerpilot_la_rtc_citation_pull_attorney_signoff.md`](ownerpilot_la_rtc_citation_pull_attorney_signoff.md) (broker-ratified) |
| `FORM_META.posFooterCitation` (cites § 1162) | (broker-ratified) |

**v4 HOW TO PAY prose (thirteen constants):**
The 13 v4 HOW TO PAY prose constants are in the locked-prose set as a block, under `V4_WORDING_SIGNED_OFF = true`. Source: [`v4_wording_signoff_ratification_and_closeouts_2026-06-05.md`](v4_wording_signoff_ratification_and_closeouts_2026-06-05.md) (broker-ratified). The constant names are enumerated in `lib/produce/renderNotice.ts` and the build side maps them 1:1 to manifest entries.

**Version stamps coupled to face prose:**

| Stamp | Couples to | Source |
|---|---|---|
| `inPersonAddressLabelVersion` (`v1`) | `inPersonOnlyLabel` | [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md) §4 |

### §2.2 Tier B — Compliance gate / validator error strings

These are not face prose — they never render on the notice itself — but they are authored verbatim by broker determinations and exposed to landlords in the produce wizard, and they directly enforce § 1161(2) facial sufficiency. **They are in the locked-prose set.**

| Constant | Verbatim value | Source |
|---|---|---|
| C1 P.O.-box error | `A P.O. box cannot accept personal delivery. Enter a street address where payment can be delivered in person.` | [`c1_pobox_scope_multiselect_broker_determination_2026-06-15.md`](c1_pobox_scope_multiselect_broker_determination_2026-06-15.md) §3 |
| C2 paper-instrument disclaimer (if wired as a validator string — build side to confirm; if it is only face prose via `bankPaperInstrumentSentence`, this row is a duplicate and may be elided) | (per A1 Part D verbatim) | A1 Part D (broker-ratified) |
| EFT-requires-Mail validator copy (if exposed as a verbatim string) | (per EFT determination) | [`EFT_not_sole_attorney_ruling_2026-06-04.md`](EFT_not_sole_attorney_ruling_2026-06-04.md) (broker-ratified) |
| 5-mile attestation gate copy (if exposed as a verbatim string) | (per A1 Part D) | A1 Part D (broker-ratified) |
| Bankruptcy-specific modal copy (C5) | (per C5 determination) | [`c5_safety_check_broker_determination_2026-06-15.md`](c5_safety_check_broker_determination_2026-06-15.md) |

**Build-side action item:** for each Tier-B entry above, confirm whether the constant is wired as a discrete string in the codebase or composed at render time from a face-prose constant already in Tier A. Tier-B entries that turn out to be Tier-A duplicates are elided from the manifest (Tier A wins). Tier-B entries that are discrete strings must be enumerated in the manifest with constant name, file, and verbatim value, exactly like Tier A.

### §2.3 Tier C — Locked system prompts & classifier prompts (hash-only)

These are not strings landlords see; they are model-facing prompts. They are in the locked-prose set but treated as **hash-only entries** (the manifest stores their hash, not their verbatim text, because the prompts are long and including the body in the manifest creates churn).

| Constant | Source |
|---|---|
| `SYSTEM_PROMPT` v4.1 (hash-locked) | [`ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md`](ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md) (broker-ratified) |
| `CLASSIFIER_PROMPT` (hash-locked at commit c7a4469) | [`chatbox_h1_classifier_graduation_attorney_signoff_2026-06-08.md`](chatbox_h1_classifier_graduation_attorney_signoff_2026-06-08.md) (broker-ratified) |
| `INPUT_REFUSAL` / `OUTPUT_REFUSAL` / `GENERIC_DECLINE` (refusal copy) | [`ownerpilot_system_prompt_v3_attorney_review.md`](ownerpilot_system_prompt_v3_attorney_review.md) lineage (broker-ratified) |

### §2.4 What is *not* in the set

Anything authored by the build side without a broker determination — UI labels for non-statutory fields, help-bubble copy, marketing copy, button labels not tied to § 1161(2) wording, error strings that do not enforce a determined compliance rule. These are governed by ordinary code review, not by this guard. If the build side ever wants to add such a string to the locked-prose set (because it has hardened into a load-bearing string), the path is to author a determination first; the guard then picks it up at the next manifest bump.

---

## §3. Answers to the four open design questions (backlog §4)

### §3.1 Scope of the locked-prose set: face prose only, or also locked compliance error strings?

**Both.** Per §2 above, the set is comprehensive: Tier A face prose, Tier B compliance gate strings, and Tier C model-facing prompts (hash-only). The backlog's own examples (P.O.-box, paper-instrument, EFT-requires-Mail) are in Tier B and are in the set.

The unifying rule: **anything authored verbatim by a broker determination and wired into shipped code is in the locked-prose set, regardless of where it renders.** If it can be edited without authoring a new determination, the guard has failed its purpose.

### §3.2 Manifest format and location

**Format:** Checked-in JSON, generated and verified by a build script, not hand-edited. The file is the source of truth for the guard.

**Location:** `docs/compliance/locked_prose_manifest.json`.

**Schema (broker-authored):**

```json
{
  "manifest_version": "v1",
  "generated_at": "<ISO timestamp>",
  "guard_status": "live | required-but-pending",
  "entries": [
    {
      "constant": "inPersonOnlyLabel",
      "tier": "A",
      "file": "lib/produce/renderNotice.ts",
      "verbatim": "In person to",
      "hash": "<sha256 of verbatim>",
      "version_stamp": "inPersonAddressLabelVersion=v1",
      "source_determination": "docs/compliance/c7a_inperson_layout_broker_determination_2026-06-15.md",
      "source_section": "§3"
    }
  ]
}
```

Tier C entries omit `verbatim` and carry `hash` only. The schema is itself locked once the guard ships; future schema changes require a determination.

### §3.3 Enforcement strictness: hard fail or warn-then-ack?

**Hard CI fail.** No warn-then-ack mode. The whole point of the guard is to make a silent edit to a locked face string impossible. A warn-then-ack mode reintroduces process discipline — exactly what the guard is supposed to replace.

Operational consequence: a developer who wants to change a locked string must (a) author a broker determination, (b) update the manifest, (c) bump any coupled version stamp, and (d) reference the determination filename in the PR description. The CI guard verifies (b) and (c) automatically; (a) and (d) are caught at PR review.

### §3.4 Should the guard also verify that source-comment determination filenames resolve to files in `docs/compliance/`?

**Yes — adopt as Tier-2 guard behavior.** The C7a inperson-layout dangling reference (the source-citation comment pointed to a determination that hadn't been authored yet) is exactly the failure mode this catches. Building it into the guard from day one is cheap and high-value.

Implementation: the guard scans `lib/` and `components/` for source-comments of the form `// Source: <filename>.md` and verifies each cited file exists in `docs/compliance/`. A missing file fails the build, with the offending source-comment line in the failure message.

This catches two related drift patterns in one check:

- Locked strings whose source-citation comment points to a non-existent determination (today's failure mode).
- Determinations that get renamed or moved without the source-comments being updated (tomorrow's failure mode).

### §3.5 Drafting-precision rule for future determinations

Going forward, determinations that refer to the guard must use one of these two forms:

- **Pending state:** "protected by the `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard (required-but-pending; see [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md))"
- **Live state (once acceptance criteria are met and a follow-up determination ratifies):** "protected by the `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard (live as of <date>)"

No determination should describe the guard in bare present tense ("any edit fails the guard") until it is live. This is added to the recurring drafting-precision list under [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) §6.

---

## §4. Interim control of record (until the guard ships)

The exact-match patch-script discipline is the **active control** for locked-prose integrity:

1. Every change to any string enumerated in §2 routes through an exact-match-or-abort patch script.
2. The patch is sandbox-tested before apply.
3. The patch is reviewed against the authoring (or amending) broker determination *before* apply.
4. The broker determination is authored or ratified **first**; the patch is written **second**.
5. If the patch script's exact-match check fails (i.e. the live string in the codebase differs from the expected pre-change value), the patch aborts and the discrepancy is escalated as a drift incident, not silently reconciled.

This is a process control. It depends on discipline and review. It is the best available control until the CI guard is live. Build side must treat the patch-script discipline as **mandatory**, not advisory, until the guard ships.

Drift incidents discovered under the interim control should be filed in the workspace with the prefix `locked_prose_drift_incident_<YYYY-MM-DD>.md` and escalated to the broker for ratification or correction.

---

## §5. Build-side acceptance criteria (carried forward from backlog §5, with broker confirmations)

- [ ] **[MUST FIX]** Locked-prose set enumerated per §2 and checked in as `docs/compliance/locked_prose_manifest.json`. Membership confirmed by the broker (this determination is the confirmation; build side resolves any Tier-B duplicates per §2.2).
- [ ] **[MUST FIX]** Hash manifest generated for the current locked values and checked in.
- [ ] **[MUST FIX]** `BROKER_WORKFLOW_PRODUCTION_LIVE` CI check fails the build on any unmanifested change to a locked constant. Hard fail per §3.3.
- [ ] **[MUST FIX]** A deliberate test edit to a locked string (without a manifest bump) is shown to fail CI in the PR that ships the guard.
- [ ] **[MUST FIX]** Version-stamp coupling: changing `inPersonOnlyLabel` requires bumping `inPersonAddressLabelVersion`; the guard enforces this.
- [ ] **[MUST FIX]** Tier-2 dangling-reference check per §3.4: guard scans `lib/` and `components/` source comments and verifies every cited determination filename resolves to a file in `docs/compliance/`.
- [ ] **[MUST FIX]** Verify the dangling reference in [`system_prompt_drift_diff_attorney_correction_2026-06-07.md`](system_prompt_drift_diff_attorney_correction_2026-06-07.md) — backlog §2 flags this file as possibly absent from `docs/compliance/`. If absent, that is a separate housekeeping defect; file under `dangling_determination_references_<YYYY-MM-DD>.md` and escalate to the broker.
- [ ] **[MUST FIX]** Once the guard is live, ship a follow-up broker determination that updates the language in [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md) §3/§4, [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8, and [`c1_pobox_scope_multiselect_broker_determination_2026-06-15.md`](c1_pobox_scope_multiselect_broker_determination_2026-06-15.md) §3 from "required-but-pending" to "live as of <date>".
- [ ] **[SHOULD FIX]** Manifest entries for Tier C (system prompts, classifier, refusal copy) shipped as hash-only at the same time as the Tier A/B entries; do not stage Tier C separately.
- [ ] **[CONSIDER]** Surface a `manifest_status` field in the produce wizard's footer (broker-internal view only) so the broker can confirm at a glance that the guard is live in the current build.

---

## §6. Statutory anchor (orientation only — not legal advice)

The constants this guard protects implement Cal. Code Civ. Proc. § 1161(2) and § 1162 facial-sufficiency requirements. Primary source: [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) and [leginfo § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.).

---

## §7. Sign-off

**Approved.** Build side may proceed to implement `BROKER_WORKFLOW_PRODUCTION_LIVE` and the locked-prose hash manifest per §2–§5 above. Until the acceptance criteria are met and a follow-up determination ratifies the guard as live, the interim control in §4 is mandatory and determinations must use the "required-but-pending" drafting form in §3.5.

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-15

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
