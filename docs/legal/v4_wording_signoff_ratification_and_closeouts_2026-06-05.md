# v4 HOW TO PAY Sign-Off Ratification + Close-Out Ratifications

**Reviewer:** Janna Taglyan, JD, SBN 269639
**Subject:** Ruling on the build side's 2026-06-05 v4 wording reconstruction packet (consolidated-review §1.2) and ratifications of close-outs §2.1, §2.2 (folded), §2.3
**Companion to:** `consolidated_review_attorney_ruling_2026-06-05.md`; `ownerpilot_v4_wording_signoff_reconstruction_2026-06-05-2.md` (build side, 2026-06-05); `ownerpilot_closeouts_attorney_ratification_2026-06-05.md` (build side, 2026-06-05); `A1_part_d_attorney_signoff_2026-06-03.md`; `A1_part_d_attorney_countersign_2026-06-04.md`; `v4_payment_fields_attorney_ruling.md`
**Headline:** **§1.2 resolves to reading (a) — clerical comment update only. The four v4 HOW TO PAY sentences were attorney-signed-off verbatim by the A1 Part D sign-off (2026-06-03) and countersign (2026-06-04). `V4_WORDING_SIGNED_OFF = true` is correct and not ahead of the ruling. The `PROPOSED` doc-comments are stale and must be updated to LOCKED with the ruling-date citation. §2.1, §2.2, and §2.3 all ratified.**

---

## On the build side's reconstruction posture

Before the ruling itself: the build side's reconstruction packet did exactly the right thing. They were asked whether the four sentences are signed off and they answered with the truth — "I can't determine that from what I can see" — instead of papering over the gap. They explicitly refused to relabel `PROPOSED` comments as LOCKED without the underlying ruling in hand, refused to flip the production flag in either direction, and surfaced the precise gap rather than claiming one reading over the other. **That is the §0 posture the engagement is built on.** It held under direct pressure to make code and comments agree. On the record.

The reason the deciding documents weren't available to the build side is a sandbox/upload mechanics issue, not a missing-ruling issue. The files exist in my workspace (`/home/user/workspace/`); the build side's sandbox is `/home/claude/ownerpilot` and they only see what's uploaded. Resolving the gap was on my side — I had the files, they didn't.

---

## §1.2 ruling — the four sentences ARE signed off; clerical comment update

I have cross-referenced the four sentences against the A1 Part D sign-off (2026-06-03) and countersign (2026-06-04) directly. The result is unambiguous reading (a).

### Sentence-by-sentence cross-reference

| Sentence | Verbatim sign-off found at | Disposition |
|---|---|---|
| `mailboxRuleSentence` — "If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. § 1161(2).)" | A1 sign-off 2026-06-03 line 43 — verbatim verification checkbox on the rendered MAIL_ONLY sample: "Renderer prose strings (`howToPayHeader`, `payableToLabel`, `telephoneLabel`, `mailToLabel`, `mailboxRuleSentence`) match the rendered output verbatim." Reaffirmed in the 2026-06-04 countersign line 13: "the `mailboxRuleSentence` constant string is unchanged." | **SIGNED OFF VERBATIM** — A1 Part D, 2026-06-03 |
| `fiveMileSentence` — "The branch identified above is within five miles of the rental property, as required by Cal. Code Civ. Proc. § 1161(2)." | A1 countersign 2026-06-04 line 27, reproduced verbatim inside the rendered FINANCIAL_INSTITUTION sample that the countersign approves; lines 35 and 38 cite it as "the five-mile attestation sentence on face, citing § 1161(2) inline (per-page citation discipline)." | **SIGNED OFF VERBATIM** — A1 Part D countersign, 2026-06-04 |
| `bankPaperInstrumentSentence` — "Payment to the account above may be made by check, money order, or cashier's check." | A1 countersign 2026-06-04 line 26, reproduced verbatim inside the rendered FINANCIAL_INSTITUTION sample; line 37 cites it as "Paper-instrument disclosure (check / money order / cashier's check)." Substantively grounded in `v4_payment_fields_attorney_ruling.md` Decision 1 (bank deposit is paper-instrument only, no EFT into the bank line). | **SIGNED OFF VERBATIM** — A1 Part D countersign, 2026-06-04 |
| `eftElectionSentence` — "If you have previously established an electronic funds transfer procedure with the landlord, payment may also be made pursuant to that previously established procedure. (Cal. Code Civ. Proc. § 1161(2).)" | A1 sign-off 2026-06-03 covers the MAIL_ONLY + EFT rendered sample (samples 1–4 of the Part D pass, all four signed off subject to the FINANCIAL_INSTITUTION [MUST FIX] that the 2026-06-04 countersign cleared). The 2026-06-04 countersign line 50 then declares: "The thirteen renderer prose constants build-lock effective this countersign. Verbatim renderings only. Any string-level change requires a fresh attorney review packet." | **SIGNED OFF VERBATIM** — A1 Part D countersign, 2026-06-04 |

The countersign's build-lock declaration (2026-06-04 line 50) is determinative: **"the thirteen renderer prose constants build-lock effective this countersign. Verbatim renderings only."** The four sentences at issue are part of the thirteen-constant set the sign-off pass covered. `V4_WORDING_SIGNED_OFF = true` is the correct state of the world and is not ahead of any ruling.

### What needs to happen in code

**[MUST FIX] — clerical comment update only:**

- [ ] Update the header comment in `lib/produce/renderNotice.ts` (~lines 12–16) from "v4 HOW TO PAY (PROPOSED — pending attorney Part-D sign-off)" to: **"v4 HOW TO PAY — LOCKED per A1 Part D sign-off (`A1_part_d_attorney_signoff_2026-06-03.md`) and countersign (`A1_part_d_attorney_countersign_2026-06-04.md`); thirteen renderer prose constants build-locked, verbatim only."**
- [ ] Update the four individual sentence doc-comments (~lines 154, 166–178 region — `mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`) from "PROPOSED" to "LOCKED 2026-06-04 per A1 Part D countersign."
- [ ] Update `lib/flow/templateVersion.ts` (~lines 14, 22–23) — the "DO NOT flip this to true until..." comment is stale. Replace with: **"`V4_WORDING_SIGNED_OFF = true` since 2026-06-04 per A1 Part D countersign (see `renderNotice.ts` LOCKED comment)."**
- [ ] Update `lib/payments/validatePaymentBranch.ts` line 90 — "the exact sentence wording is part of the attorney Part-D sign-off" — change "is part of" to "was locked by the 2026-06-04 A1 Part D countersign."
- [ ] **No `NOTICE_PROSE` sentence text changes.** This is comment-only. If the change diff shows any sentence-text byte change, halt and flag.

**[MUST NOT]** — do not flip `V4_WORDING_SIGNED_OFF` to `false`. The flag is correct as it stands.

### Why this took a deeper-than-usual cross-reference

The internal inconsistency the build side flagged was real and worth halting on, even though the resolution turned out to be clerical. The `PROPOSED` comments and the `SIGNED_OFF = true` flag were authored at different times by different commits, and the comments never got updated when the sign-off landed on 2026-06-04. From the build side's seat, that looks identical to a flag-flipped-ahead-of-ruling problem — and they would have been wrong to assume the benign reading. Calling it a hold-and-investigate rather than a sign-off was the right disposition; the audit trail now records that the question was asked, the sign-off was traced to its source documents, and the comments are catching up to the ruling, not the other way around.

---

## §2.1 ratification — Defect #1 schema close-out

✅ **The Stage-1 schema-implementation review is accepted as described.** `landlordIdentity` as discriminated union is the single source of truth; `signerCapacity` is canonical; the legacy derived `signerRole` was a transitional value through Stage-1 and is now fully removed by Defect #3 (individual face derives its role label from `signerCapacity`, `landlord.fixture.ts` updated once, no `signerRole` remains in the logic layer or UI write path); the deferred owner-name → Step-4 payee link is resolved by the Defect #2 derivation via the single locked `derivePayeeName` helper. The Stage-1 schema landed as designed and the two transitional items it created are both closed.

---

## §2.2 ratification — gates.v4 test rewrite

✅ **Ratified, downstream of §1.2.** Because §1.2 resolves to reading (a) — the four sentences are signed off, the production flag is correct, the comments need clerical updating — the `gates.v4` suite's rewrite from "blocked by pending sign-off" to "valid config produces" is consistent with the underlying state of the world as of 2026-06-04 and is ratified as a correct reflection of the wording-sign-off status. The rewrite is acknowledged on the record as a deliberate change to a legal gate's test coverage, made with the user's confirmation that the underlying flag was intentionally `true` — which is now corroborated by the A1 Part D countersign that authorized the flag to be `true` in the first place. No revert needed.

---

## §2.3 ratification — EFT-not-sole guard + Review-step attestations

✅ **EFT-not-sole guard formally retired from the open list.** Located in `lib/payments/validatePaymentBranch.ts` with the `EFT_REQUIRES_NON_EFT_PRIMARY` blocker code-declared line 55, pushed lines ~294–308, verbatim error string ending "...previously established with the tenant (Cal. Code Civ. Proc. § 1161(2))" intact, fail-closed validator behavior, cross-referenced to the A1 countersign (2026-06-04) at line 285. This satisfies the [SHOULD FIX] one-screen confirmation the countersign asked for (line 89: "a one-screen confirmation that `validatePaymentBranch` (or its equivalent) throws when `offeredMethods` contains EFT and no non-EFT, non-cash primary. A unit test asserting the throw."). Closed.

✅ **Review-step bank attestations formally retired from the open list.** Located in `components/notice-flow.tsx`: `BankDepositAttestations` (function at line ~939) is the single shared component rendering both §1161(2) bank-deposit attestation labels — the paper-instrument confirmation (line ~958) and the within-five-miles confirmation (line ~972). Rendered from both the payment step and the Review step, writing the same flow-data fields, byte-identical labels on both surfaces, single source of truth for the produce gate to read. This is the architecture the prior ruling requested. Closed.

---

## Summary of dispositions

| Item | Disposition |
|---|---|
| §1.2 v4 HOW TO PAY face text + sign-off flag | **Reading (a) — clerical comment update only.** Four sentences signed off verbatim by A1 Part D sign-off (2026-06-03) + countersign (2026-06-04). Update PROPOSED comments to LOCKED with ruling-date citations. Do not change sentence text. Do not flip the flag. |
| §2.1 Defect #1 schema close-out | **Ratified.** |
| §2.2 gates.v4 test rewrite | **Ratified** (downstream of §1.2). |
| §2.3 EFT-not-sole guard + Review attestations | **Both retired from the open list.** |

---

## What still unblocks the cutover

Updated list (today's three [MUST FIX] from the Step-4 ruling + two from the consolidated-review ruling + four from this ratification):

**From this morning's Step-4 ruling:**
- [ ] Delete Round-3 helper from Step 4.
- [ ] Add `entityLegalNameHelper` to Step 3 (entity-only).
- [ ] Leave §3.3 unchecked-helper on Step 4 untouched.

**From the consolidated-review ruling:**
- [ ] Delete `ENTITY_NOT_SUPPORTED_COPY` and its Step-3 render site.
- [ ] Update `holidays.ts` 2027 entry attribution to `verifiedBy: 'Janna Taglyan, JD, SBN 269639'`.

**From this ratification (§1.2 clerical update):**
- [ ] Update `renderNotice.ts` header comment PROPOSED → LOCKED with ruling-date citation.
- [ ] Update four individual sentence comments PROPOSED → LOCKED 2026-06-04.
- [ ] Update `templateVersion.ts` stale "DO NOT flip" comment to record the post-flip state.
- [ ] Update `validatePaymentBranch.ts` line 90 comment to record the lock date.

Nine items, all clerical or build-locked. None require new face-prose authorship. None require a new ruling.

---

## Final sign-off

✅ **§1.2 — Reading (a) confirmed. Four v4 HOW TO PAY sentences are signed off verbatim per A1 Part D 2026-06-03/06-04. Clerical comment update authorized. Flag stays `true`.**
✅ **§2.1 — Ratified.**
✅ **§2.2 — Ratified (downstream of §1.2).**
✅ **§2.3 — EFT guard + Review attestations both retired.**
✅ **No produced-notice face text changes anywhere in this ratification.**

Reviewer: Janna Taglyan, JD, SBN 269639
Date: 2026-06-05
Scope: Resolution of consolidated-review §1.2 hold; ratification of §2.1, §2.2, §2.3 close-outs; cross-reference of four v4 HOW TO PAY §1161(2) sentences against A1 Part D sign-off and countersign source documents; clerical comment-update authorization with no face-text changes.

---

— Reviewing Attorney · Janna Taglyan, JD, SBN 269639 · 2026-06-05
