# Codebase Provenance & Gate-State Rename — "Attorney Review / Sign-Off" → Broker Attribution

**Date:** 2026-07-05
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering) — codebase provenance-comment and gate-state rename
**Re:** Seven files carry "attorney review" / "attorney sign-off" language in provenance comments and gate states — needs broker rename for attribution consistency; one file also renders a user-visible "pending attorney sign-off" state that is a live UX defect
**Companion rulings:**
- [`persona_correction_ud_filing_pro_per_authority_2026-07-05.md`](persona_correction_ud_filing_pro_per_authority_2026-07-05.md) — persona output surface
- [`packet_prose_correction_ud_filing_pro_per_authority_2026-07-05.md`](packet_prose_correction_ud_filing_pro_per_authority_2026-07-05.md) — delivered-document surface
- [`codebase_prose_correction_reviewing_attorney_of_record_2026-07-05.md`](codebase_prose_correction_reviewing_attorney_of_record_2026-07-05.md) — codebase attribution string surface (holidays.ts / templateVersion.ts)
- [`lasc_ud_filing_three_copies_procedural_ruling_2026-07-05.md`](lasc_ud_filing_three_copies_procedural_ruling_2026-07-05.md) — LASC filing counter workflow
- [`omnibus_broker_ruling_2026-07-04.md`](omnibus_broker_ruling_2026-07-04.md) — governing attribution rule

**Priority split:**
- **HIGH** for `gates.ts:493` and `notice-flow.tsx:3223` — these render a *user-visible* "pending attorney sign-off" state to the operator. That's a live UX defect that seeds mandatory-attorney framing into the product surface. Ship in the next persona touchpoint or as a hotfix, do not wait for a batch window.
- **MEDIUM** for the five provenance-comment files (`computeCompliancePeriod.ts`, `validatePaymentMethods.ts`, `buildNoticeHtml.ts`, `renderNotice.ts`, `h1_patterns.candidate.ts`) — comments do not render to users, but they seed defective attribution into any auto-generated doc, README, or codebase report that harvests JSDoc / block comments. Fix in the next codebase touchpoint that touches any of the five files for other reasons; do not open a dedicated PR just for comment rewrites unless a full-repo sweep is already scheduled.

---

## Scope — the seven files Claude flagged

Provenance comments (five files, MEDIUM):

1. `computeCompliancePeriod.ts`
2. `validatePaymentMethods.ts`
3. `buildNoticeHtml.ts`
4. `renderNotice.ts`
5. `h1_patterns.candidate.ts`

User-visible gate state (two files, HIGH):

6. `gates.ts:493`
7. `notice-flow.tsx:3223`

**Do not expand this ruling's scope to additional files without a follow-up ruling.** If the full-repo sweep authorized in [`codebase_prose_correction_reviewing_attorney_of_record_2026-07-05.md`](codebase_prose_correction_reviewing_attorney_of_record_2026-07-05.md) surfaces additional hits during execution, either fold them into the same commit under that ruling's scope or capture a follow-up ruling. Discipline: seven files → seven files, no scope creep.

---

## The rename — provenance comments (five files)

**Phrase-class rewrite** (case-insensitive; apply to every hit in each of the five files):

| Current phrase (any casing / punctuation) | Replacement |
| --- | --- |
| `attorney review` (as a noun phrase — "the attorney review directs…", "per attorney review", "attorney review of this rule…") | `broker review` |
| `attorney sign-off` / `attorney signoff` / `attorney sign off` | `broker sign-off` |
| `reviewed by attorney` / `reviewed by an attorney` / `attorney-reviewed` | `reviewed by broker` / `broker-reviewed` |
| `signed off by attorney` / `signed off by an attorney` | `signed off by broker` |
| `attorney reviewed and signed off` | `broker reviewed and signed off` |
| `attorney authorized` / `attorney authorization` | `broker authorized` / `broker authorization` |
| `awaiting attorney review` | `awaiting broker review` |
| `pending attorney review` | `pending broker review` |
| `pending attorney sign-off` (in comments — see below for gate-state variant) | `pending broker sign-off` |

**Attribution long form** (when a comment cites the reviewing / signing party by name):

Remove any occurrence of `Janna Taglyan`, `SBN 269639`, `State Bar No. …`, `State Bar Number …`, or any similar attorney-attribution string. Replace with the standing broker attribution:

> `Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · <original-date>`

If the comment already carries a date, preserve the original date — this is a rename, not a re-attestation.

**Preserve the doctrinal meaning of the comment.** A comment that says "attorney review directs sourcing the holiday table from § 135 directly" becomes "broker review directs sourcing the holiday table from § 135 directly" — the rule the comment documents is unchanged, only the reviewer's role attribution changes. Do not rewrite the substantive rule or drop the citation.

---

## The rename — user-visible gate state (two files, HIGH)

### `gates.ts:493`

If the gate state is a string constant / enum member:

- **Rename identifier:** `PENDING_ATTORNEY_SIGNOFF` (or whatever the current identifier is) → `PENDING_BROKER_SIGNOFF`
- **Rename user-visible label:** `"Pending attorney sign-off"` (or equivalent) → `"Pending broker sign-off"`
- **Rename any adjacent enum / union / discriminator members** that share the "attorney" naming convention → broker equivalent (e.g., `ATTORNEY_REVIEWED` → `BROKER_REVIEWED`)

Update every call site that reads the renamed identifier. Type check should catch this; if it doesn't, that's a follow-up finding to flag separately (means the state discriminator isn't as strongly typed as it should be — worth a separate ruling if that's the case).

### `notice-flow.tsx:3223`

If the render site displays a UI label:

- **Replace visible label:** any variant of `"pending attorney sign-off"` / `"awaiting attorney review"` / `"attorney is reviewing"` / `"attorney-review required"` → the corresponding **`"broker"`** phrasing
- **Preserve tone.** If the current label is user-friendly ("Waiting for attorney sign-off before you can serve"), the replacement should preserve that tone ("Waiting for broker sign-off before you can serve"), not swap in a more formal or terse phrasing.
- **Do not drop the state entirely.** The gate itself is legitimate — some notice flows do require broker sign-off before serving. The defect is the attribution, not the existence of the gate.

If the render site uses an icon adjacent to the label (a gavel, a scales-of-justice, or an attorney-badge icon), replace with a broker-appropriate icon (a shield, a checkmark-in-badge, or a document-with-stamp) OR remove the icon entirely and rely on the text label alone. Do not leave an attorney-coded icon next to a broker-coded label — that's the same defect one layer down in the render tree.

---

## Full-repo grep to run

The seven files Claude flagged are the starting scope. Before landing the rename PR, run one more repo-wide grep to catch any siblings that would otherwise land as an eighth-surface ruling. Use these patterns (case-insensitive, `-w` word-boundary where sensible):

```
attorney[- ]?review
attorney[- ]?sign[- ]?off
attorney[- ]?signoff
attorney[- ]?authoriz
awaiting attorney
pending attorney
reviewed by attorney
signed off by attorney
attorneyReview
attorneySignoff
attorneySignedOff
reviewedByAttorney
signedByAttorney
```

**Disposition for hits outside the seven-file scope:**

- If the hit is in a file already scheduled to be touched for other reasons in the same PR: fold it in under this ruling and note in the PR description
- If the hit is in a file not otherwise being touched: capture in a follow-up ruling; do not silently expand scope
- If the hit is inside government form text or an imported LASC / Judicial Council / LAHD PDF's OCR / text extract: leave in place — same exception carve-out as the codebase prose ruling

---

## Test additions

For each of the seven files touched, add a targeted test that asserts the file does not contain the renamed phrases going forward. Reuse the grep patterns above. Add to the CI lint step authorized in the codebase prose ruling — same lint job, expanded phrase list. Do not create a separate CI job.

**Snapshot test for `notice-flow.tsx`:** render the notice-flow at the `PENDING_BROKER_SIGNOFF` state and assert the DOM output contains the string "broker" and does not contain "attorney". Snapshot the rendered output so future regressions surface immediately.

**Type test for `gates.ts`:** the discriminated union type for gate states should include `PENDING_BROKER_SIGNOFF` and should not include `PENDING_ATTORNEY_SIGNOFF`. Assert with a `never`-check helper if the codebase uses one.

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`, unchanged. Broker-only attribution. No SBN. No attorney identifiers anywhere in the codebase, comments included.

---

## Relationship to companion rulings

- **Persona ruling** corrects live persona output. Runtime BLOCK at model output.
- **Packet prose ruling** corrects delivered PDFs. Script edit + regenerate + CI lint on assembled PDF text.
- **Codebase prose ruling** corrects string constants / interface strings (`holidays.ts`, `templateVersion.ts`). Repo grep + rename.
- **This ruling** corrects provenance comments (five files) and user-visible gate states (two files). Repo grep + rename + snapshot test.
- **LASC three-copies ruling** is additive procedural guidance, not a defect correction.

All five rulings share the same doctrinal foundation (broker scope under Cal. Bus. & Prof. Code § 10131(b), no attorney gate on OwnerPilot artifacts, no SBN attribution). Each targets a different code / product surface. Together they close the defect across every surface Claude has surfaced to date. If a sixth surface appears, capture a sixth narrow ruling.

---

## Ratification & signature

This correction is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **codebase_provenance_attorney_review_signoff_rename_2026-07-05**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
