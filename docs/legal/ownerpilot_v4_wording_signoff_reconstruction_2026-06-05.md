# v4 HOW TO PAY — Sign-off Audit-Trail Reconstruction (Item 1.2)

**Prepared by:** build side · 2026-06-05
**For:** reviewing attorney, per the consolidated-review ruling §1.2 ("HOLD AND INVESTIGATE")
**Scope:** Reconstruct what the available record actually shows about attorney sign-off of the four v4 HOW TO PAY §1161(2) sentences, before any ratification.

## Bottom line up front

**I cannot confirm — or refute — a verbatim Part-D sign-off of these four sentences from the materials available to me, because the determinative ruling files are not present.** The files you named as the likely sign-off record (`A1_part_d_attorney_signoff_2026-06-03.md`, `A1_part_d_attorney_countersign_2026-06-04.md`, `v4_payment_fields_attorney_ruling.md`, `ownerpilot_3day_notice_template_v1_attorney_review.md`, `ownerpilot_3day_notice_spec_attorney_review.md`) are **not in my uploads and not in the sandbox**, and `/home/user/workspace/` (the path in your ruling) does not exist on my side — my sandbox is `/home/claude/ownerpilot`, and rulings reach me only as uploads.

I have **not** changed `V4_WORDING_SIGNED_OFF` in either direction, and no produced notices were altered. What follows is the evidence I *can* see, and the precise gap.

## 1. The four sentences, verbatim (current produced text)

From `lib/produce/renderNotice.ts` `NOTICE_PROSE`:

- **`mailboxRuleSentence`** — "If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. § 1161(2).)"
- **`fiveMileSentence`** — "The branch identified above is within five miles of the rental property, as required by Cal. Code Civ. Proc. § 1161(2)."
- **`bankPaperInstrumentSentence`** — "Payment to the account above may be made by check, money order, or cashier's check."
- **`eftElectionSentence`** — "If you have previously established an electronic funds transfer procedure with the landlord, payment may also be made pursuant to that previously established procedure. (Cal. Code Civ. Proc. § 1161(2).)"

## 2. What the code's own posture says (these read as NOT signed off)

- `renderNotice.ts` header (lines ~12–16): the HOW-TO-PAY wording "(the § 1161(2) payee trio, the per-branch text, the mailbox-rule and EFT sentences) is PROPOSED and PENDING ATTORNEY SIGN-OFF. Production is hard-blocked by the produce gate (evaluateCanProduceV4 → TEMPLATE_NOT_SIGNED_OFF) until that sign-off."
- `renderNotice.ts` lines 135, 154, 166–176: the section is headed "v4 HOW TO PAY (PROPOSED — pending attorney Part-D sign-off)" and each of the four sentences carries an individual `PROPOSED` doc-comment.
- `templateVersion.ts` lines 14, 22–23: "DO NOT flip this to true until the reviewing attorney has signed off the v4 wording... FALSE until signed off."
- `validatePaymentBranch.ts` line 90: "the exact sentence wording is part of the attorney Part-D sign-off."

So the renderer, the validator, and the version module were all authored on the assumption these four are **not yet** signed off and are gated.

## 3. What contradicts that posture (the live flag)

- `templateVersion.ts` line 25: `export const V4_WORDING_SIGNED_OFF = true;`
- Consequence (`gates.ts` lines 603–610): the `TEMPLATE_NOT_SIGNED_OFF` blocker does not fire, so these four sentences print on live notices.
- `gates.v4.test.ts` (lines 29–95): the suite was rewritten to assert "valid config produces (wording sign-off is live)," matching the flag.

So the flag and the tests treat the wording as signed off, while the prose comments treat it as PROPOSED. That is the internal inconsistency.

## 4. Evidence that *some* Part-D review touched the payment section

These are real pointers in the code/available rulings — but they are references to rulings, not the rulings themselves:

- `renderNotice.ts` line 411: a comment citing "(attorney A1 Part-D redline, 2026-06-03)" — it governs the placement decision that the mailbox-rule sentence does **not** render on a standalone financial-institution branch. So an A1 Part-D redline dated 2026-06-03 demonstrably addressed at least the mailbox-rule sentence's placement.
- `validatePaymentBranch.ts` line 285: "(attorney A1 countersign, 2026-06-04)" — an A1 countersign dated 2026-06-04 is referenced for the EFT-not-sole rule.
- Defect #2 ruling (line 48) and its summary table (line 175), and the Defect #2 countersign (line 111): all refer to "the thirteen face constants from A1 Part D" as **Build-locked**. None of these three enumerate the thirteen, so I cannot tell whether the four HOW TO PAY sentences are *among* those thirteen locked constants or are the *separate* PROPOSED set the renderer comments describe.

## 5. The gap, stated precisely

The two readings the evidence leaves open:

- **(a) A ruling exists.** The A1 Part-D pass (2026-06-03 redline + 2026-06-04 countersign) signed these four off verbatim; the `PROPOSED` comments are stale and were never updated when the flag was flipped. → Resolution is clerical: update the four comments to LOCKED with the ruling file + date as the citation; you issue a one-paragraph ratification confirming the comment update.
- **(b) No verbatim sign-off exists.** The A1 Part-D pass locked thirteen *other* face constants and left these four as PROPOSED, and `V4_WORDING_SIGNED_OFF` was flipped to `true` ahead of a sign-off on the four. → Resolution is the larger one in your ruling: these go to fresh face-text review, the flag question is yours, and interim production needs a remediation note.

**I cannot choose between (a) and (b) from what I have**, because the deciding documents — the A1 Part-D sign-off (2026-06-03) and countersign (2026-06-04), and ideally the template/spec review files — are not available to me. The "A1 Part-D redline" comment at `renderNotice.ts:411` is the closest thing to evidence of (a), but a code comment referencing a redline is not the redline, and it speaks only to the mailbox-rule sentence's *placement*, not to verbatim approval of all four.

## 6. What closes the gap

Upload the A1 Part-D ruling record so I can cross-reference each of the four sentences against the text that was actually approved:

- [ ] `A1_part_d_attorney_signoff_2026-06-03.md` (or whatever the 2026-06-03 redline is filed as)
- [ ] `A1_part_d_attorney_countersign_2026-06-04.md`
- [ ] any `v4_payment_fields_*` / `ownerpilot_3day_notice_template_v1_attorney_review` / `..._spec_attorney_review` files

With those in hand I will produce the four-sentence, ruling-by-ruling cross-reference table (sentence → which ruling approved it, verbatim or redlined, with file + section), and you rule (a) clerical-update or (b) fresh-review on a grounded record rather than this gap.

## 7. Cross-reference table (as far as the available record allows)

| Sentence | Code posture | A1 Part-D approval? |
|---|---|---|
| `mailboxRuleSentence` | PROPOSED (renderNotice header + line 166) | Placement addressed by the 2026-06-03 redline (per `renderNotice.ts:411`); **verbatim approval unverifiable — ruling file not available** |
| `fiveMileSentence` | PROPOSED (line 169) | **Unverifiable — ruling file not available** |
| `bankPaperInstrumentSentence` | PROPOSED (line 172) | **Unverifiable — ruling file not available** |
| `eftElectionSentence` | PROPOSED (line 175) | EFT-not-sole *rule* countersigned 2026-06-04 (per `validatePaymentBranch.ts:285`); whether the *sentence wording* was approved verbatim is **unverifiable — ruling file not available** |

## 8. Confirmations

- `V4_WORDING_SIGNED_OFF` is **unchanged** (still `true`, untouched by me) per your §1.2 step 4.
- No `NOTICE_PROSE` sentence text was edited; no `PROPOSED` comment was relabeled. I will not relabel statutory face text as LOCKED without the underlying ruling in hand.
- This packet is a reconstruction of the available record only; it asserts no sign-off.

---

— Build side · audit-trail reconstruction, no ratification asserted · 2026-06-05
