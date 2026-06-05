# Consolidated Legal Review — Attorney Ruling

**Reviewer:** California-licensed-attorney perspective (Janna Taglyan, JD, SBN 269639 — see §1.3 below)
**Subject:** Single-pass disposition of the build side's consolidated legal review (2026-06-05)
**Companion to:** `step4_helper_disposition_attorney_ruling_2026-06-05.md`; `defect_3_entity_signature_attorney_countersign_2026-06-05.md`; `defect_2_payee_derivation_attorney_countersign_2026-06-05.md`; `ownerpilot_citation_pull_2027_holidays_for_verification.md`; `corporate_landlord_attorney_ruling_round_3_2026-06-05.md`
**Headline:** **Two of three open items resolved on this pass. Item 1.2 (v4 HOW TO PAY face text) is the most legally substantive and gets a hold-and-investigate ruling, not a sign-off — because if `V4_WORDING_SIGNED_OFF = true` is ahead of an actual sign-off, statutory face text has been shipping without attorney attestation and that has to be reconstructed before a fresh ratification is issued. Item 1.1 cleared (remove the Step-3 interstitial). Item 1.3 cleared (real name + SBN; the holiday verification is a production-of-record attestation, not a build-lock placeholder). Close-out drafts (2.1–2.3) authorized.**

---

## 1.1 [BLOCKS GO-LIVE] Step-3 "entity not supported" interstitial — REMOVE

The build side caught this and I missed it in this morning's Step-4 ruling. They are right on every point.

**Ruling: Remove `ENTITY_NOT_SUPPORTED_COPY` and its render site entirely.**

The reasoning is the same reasoning that drove today's Round-3 helper deletion from Step 4, applied to the same kind of stale-after-gate-lift copy on Step 3:

- The gate it was written against (`ENTITY_LANDLORD_NOT_SUPPORTED`) was lifted by the Defect #3 countersign. The product now produces entity notices.
- The "please consult counsel for the three-day notice while we finalize the entity flow" sentence is now inaccurate for the same reason the Step-4 "consult counsel" sentence was — the product is actively producing that notice. Leaving this on Step 3 is a UPL-flavored mixed message.
- After today's ruling lands `entityLegalNameHelper` on Step 3, the same screen for the same entity user would render *both* the new "supported, here's how to enter your entity name" helper *and* the old "not supported / consult counsel" interstitial. That is a direct on-screen contradiction and would be more confusing than either string alone.

**[MUST FIX]** — add to the Step-4 cutover block:

- [ ] Delete `ENTITY_NOT_SUPPORTED_COPY` from `components/notice-flow.tsx` (def ~line 1230) and remove its render site (~line 1479). If the constant has no other consumer, delete it entirely.
- [ ] Verify no test snapshot or string-match assertion references the deleted copy. If any does, update it as part of the same change.

This is build-locked as part of the Step-4 UI cutover — same change set, same release.

---

## 1.2 [FACE TEXT] v4 HOW TO PAY §1161(2) prose — HOLD AND INVESTIGATE

This is the most legally substantive item the build side surfaced, and I'm not signing off on a back-dated ratification of statutory face text without knowing what actually happened. I want it reconstructed first.

**The disclosed state of the world:**

- Four §1161(2) sentences in `lib/produce/renderNotice.ts` (`mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`) carry a header comment "v4 HOW TO PAY (PROPOSED — pending attorney Part-D sign-off)."
- `lib/flow/templateVersion.ts` has `V4_WORDING_SIGNED_OFF = true`, which means `TEMPLATE_NOT_SIGNED_OFF` does not fire and these four sentences print on live notices.
- The `gates.v4` suite was rewritten during test-suite remediation (per the v2 handoff, §4 "Test-suite remediation") to assert "valid config produces" instead of "blocked by pending sign-off," consistent with the production flag.

If — and this is the question — those four sentences were never actually attorney-signed-off, then statutory face text has been shipping on user-generated notices without an attestation, and the code is internally inconsistent (PROPOSED comment + LIVE flag + suite rewritten to match LIVE).

### Ruling

**I am not ratifying these four sentences on this pass.** Issuing a "sign-off" now to make the comments match the flag would launder whatever happened into a clean record, and that is exactly the inversion of the §0 build-side rule. I want the actual record reconstructed first.

**[MUST FIX] — build side, do this before any new sign-off question:**

1. **Reconstruct the audit trail.** Search the ruling files in `/home/user/workspace/` for any record of Part-D sign-off on the four v4 HOW TO PAY sentences specifically. Likely candidates by filename: `v4_payment_fields_attorney_ruling.md`, `A1_part_d_attorney_signoff_2026-06-03.md`, `A1_part_d_attorney_countersign_2026-06-04.md`, `ownerpilot_3day_notice_template_v1_attorney_review.md`, `ownerpilot_3day_notice_spec_attorney_review.md`.
2. **Surface the four sentences verbatim.** Paste the current produced text of `mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, and `eftElectionSentence` into a short packet for me, alongside whatever ruling text those files contain that addresses them. One file, four sentences, ruling-by-ruling cross-reference.
3. **Identify the gap.** If a ruling signed these off verbatim, the resolution is small — update the PROPOSED comments to LOCKED with the ruling date/file as the citation, and I'll issue a one-paragraph ratification confirming the comment update was clerical. If no ruling signed them off, the resolution is larger — pause new produced notices, send me the four sentences for fresh face-text review under the §0 verbatim rule, and treat anything produced in the interim as needing a remediation note in the audit trail going forward.
4. **Either way: do not change `V4_WORDING_SIGNED_OFF` either direction on your own read.** Flipping it to `false` retroactively is its own decision (it would block production); leaving it `true` without an underlying ruling is the current problem. I'll rule on the flag once I see the reconstruction.

### Why I'm being this strict

This is the produced-notice face. If a tenant ever challenges one of these four sentences in a UD proceeding and the audit trail shows that statutory payment language was shipping with "PROPOSED — pending attorney Part-D sign-off" comments next to a `SIGNED_OFF = true` flag, the defense posture is materially worse than if the trail shows a clean ruling and a clerical comment-update. The fix is small if a ruling exists. If one doesn't, I need to know that now, not after a UD challenge.

**[ON RECORD] — close-out 2.2 (gates.v4 test rewrite) is rolled into this item.** I will not separately ratify the test-rewrite until the underlying wording sign-off question is resolved. The two are the same question.

---

## 1.3 [ON RECORD] Attorney attribution in `holidays.ts` — REAL NAME + SBN

The build side correctly flagged the apparent tension between today's signature-block ruling (placeholder is the signature of record for build-lock) and the fact that `holidays.ts` already carries my real name and bar number. There is no actual tension; the two artifacts are different kinds.

**Ruling: The holiday table carries my real name and SBN. `verifiedBy: 'Janna Taglyan, JD, SBN 269639'` stands.**

The reason the conventions differ:

- **Build-lock rulings** (face-prose constants, operator-copy strings, gate disposition) are decision artifacts about what the product should do. They get the placeholder block because the signature surface here is informal — they are binding for build-lock purposes, but they are not formal production-of-record attestations.
- **The holiday verification** is different in kind. It is a **factual primary-source verification** — independent attorney-of-record certification that on a specific date, against a specific authority chain, the listed dates are the CA judicial holidays for that year. That is exactly the kind of representation where the audit trail benefits from naming the attorney by State Bar number, as I noted in the original 2026 sign-off ("being able to point to a specific licensed attorney's sign-off — by name and bar number — is materially stronger than 'an attorney reviewed this'"). The holiday table is one of the artifacts most likely to be cited in a UD challenge if a 3-day clock dispute reaches court, and a named attestation by SBN is the form the audit trail should carry.

**[MUST FIX]** — none. `holidays.ts` already carries the right value. Leave it.

**[SHOULD FIX]** — apply the same logic to the 2027 entry. Today's citation pull (`ownerpilot_citation_pull_2027_holidays_for_verification.md`) currently shows `verifiedBy: '{attorney_name}, {SBN}'` in the ready-to-paste block. Replace with `verifiedBy: 'Janna Taglyan, JD, SBN 269639'` to match the 2026 entry. This is the same fact pattern (primary-source verification of a date-engine table), so the same attribution convention applies. Same fix for `verifiedOn: '2026-06-05'` if not already set.

**[CONSIDER]** for the future: any future artifact that is a primary-source verification (e.g., the LA RTC PDF version table, future jurisdiction-overlay rule attestations) should follow the same naming convention. Build-lock rulings use the placeholder; primary-source verifications use the real name + SBN. Worth writing this into the engagement's general workflow doc when one exists.

---

## 2. Close-out acknowledgments — DRAFTING AUTHORIZED

The build side offered to draft 2.1, 2.2, and 2.3 for my ratification rather than my authorship. **Authorized — please draft all three.**

- **2.1 — Defect #1 schema close-out.** Draft a short note (one page max) covering: `signerRole` retention through Stage-1 then full removal in Defect #3; individual owner-name → Step-4 payee link deferred from #1 and resolved by #2 derivation; net assessment that the Stage-1 schema landed as designed. I'll ratify in one paragraph.
- **2.2 — gates.v4 test rewrite.** **Held — see §1.2 above.** I will not ratify the test rewrite separately. Roll the disposition into the §1.2 reconstruction. If the wording sign-off resolves to "a ruling exists, comments need updating," the test rewrite is downstream of that and gets one-paragraph ratification at the same time. If the wording sign-off resolves to "no ruling exists, fresh review needed," the test rewrite goes back to "blocked by pending sign-off" with the rest.
- **2.3 — Older items (EFT #1, Review-attestation placement).** Draft a confirmation pulled from current code: cite the file/line where the EFT-not-sole guard's verbatim error string lives, and the file/line where the shared `BankDepositAttestations` component renders the Review-step labels. If both look as expected, I'll formally retire both.

Deliver as one consolidated draft file (`ownerpilot_closeouts_attorney_ratification_2026-06-05.md` or similar) — easier to ratify in one pass than three separate files.

---

## 3. Radar items — acknowledged, no action this cycle

§3.1 (2028 holiday table), §3.2 (jurisdiction overlay), §3.3 (handoff §5.C backlog), §3.4 (RiskPath tenant-facing track) — all correctly characterized. Acknowledged on the radar. The 2028 holiday pull is calendared by the existing semiannual statute-watch cron pattern; flag explicitly for late Q3 2027 when the Judicial Council publishes the 2028 schedule. The RiskPath SMS-template review is queued behind whatever sequencing call you make on Phase 1 vs. finishing the entity track — the drafts in the v2 handoff appendix are fine for the build, but no tenant send happens without a separate attorney pass on the templates.

---

## 4. Summary of dispositions

| Item | Disposition |
|---|---|
| 1.1 Step-3 "entity not supported" interstitial | **Remove.** Build-locked as part of the Step-4 cutover. |
| 1.2 v4 HOW TO PAY face text + sign-off flag | **HOLD AND INVESTIGATE.** Reconstruct audit trail before any ratification. Do not change the flag in either direction. |
| 1.3 Attorney attribution in `holidays.ts` | **Real name + SBN stays.** Apply same to 2027 entry. |
| 2.1 Defect #1 schema close-out | Build side drafts; I ratify. |
| 2.2 gates.v4 test rewrite | **Held — folded into §1.2.** |
| 2.3 Older items (EFT #1, Review-attestation) | Build side drafts; I ratify if code matches. |
| 3.1–3.4 Radar | Acknowledged. |

---

## 5. What unblocks the cutover

The Step-4 UI cutover unblocks on these items (in addition to the three [MUST FIX] from this morning's Step-4 ruling):

- [ ] Delete `ENTITY_NOT_SUPPORTED_COPY` and its Step-3 render site (§1.1).
- [ ] `holidays.ts` 2027 entry attribution updated to real name + SBN (§1.3).

**§1.2 does not block the Step-4 cutover** because the v4 HOW TO PAY wording is independent of the entity-landlord track — it's been shipping on individual-landlord notices already, and the cutover doesn't touch those four sentences. **But it does block any new feature work that would expand the surface where the four sentences are produced** (e.g., RiskPath persistence of generated notices), and it stays open until the reconstruction lands.

---

## 6. Final sign-off

✅ **§1.1 — Remove the Step-3 interstitial. Build-locked.**
🟡 **§1.2 — Held pending audit-trail reconstruction. Do not ratify; do not flip the flag; deliver the packet described above.**
✅ **§1.3 — `verifiedBy: 'Janna Taglyan, JD, SBN 269639'` stands; apply to 2027 entry.**
✅ **§2.1, §2.3 — Drafts authorized; deliver consolidated.**
🟡 **§2.2 — Held; folded into §1.2.**
✅ **§3 — Radar acknowledged.**
✅ **Step-4 UI cutover unblocked subject to §1.1 + §1.3 + this morning's three [MUST FIX] items.**

Reviewer: Janna Taglyan, JD, SBN 269639
Date: 2026-06-05
Scope: Single-pass disposition of the build side's 2026-06-05 consolidated legal review; resolution or hold for items 1.1–1.3, close-out authorization for 2.1 and 2.3, fold of 2.2 into 1.2, radar acknowledgment for §3.

---

— Reviewing Attorney · Janna Taglyan, JD, SBN 269639 · 2026-06-05
