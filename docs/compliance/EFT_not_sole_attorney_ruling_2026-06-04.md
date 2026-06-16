# Attorney Ruling — EFT-cannot-be-sole enforcement (close-out)

**Re:** [`EFT_not_sole_attorney_note.md`](/home/user/workspace/uploaded_attachments/e8cd3fdd894d487d99e7faa949ec93e0/EFT_not_sole_attorney_note.md) (build-side, 2026-06-04)
**Closes:** Open item #1 from [`A1_part_d_attorney_countersign_2026-06-04.md`](/home/user/workspace/A1_part_d_attorney_countersign_2026-06-04.md)

**Status:** **SIGNED OFF, with one [SHOULD FIX] redline on the error message wording.** Guard logic is approved as-is. Build-lock from yesterday's countersign is undisturbed.

---

## (a) Does the explicit guard satisfy the `[SHOULD FIX]`?

**Yes.** Approved.

- The explicit, named error (`EFT_REQUIRES_NON_EFT_PRIMARY`) is exactly the closure I asked for. The prior implicit rejection via `BRANCH_REQUIRED` was correct on outcomes but fragile against future code paths that construct `offeredMethods = ["EFT"]` and slip past the branch check. A named guard makes the rule legible to the next engineer and survives refactors.
- The "non-cash" half is correctly carried by `BANK_PAPER_INSTRUMENT_REQUIRED`. Confirmed against [`v4_payment_fields_attorney_ruling.md`](/home/user/workspace/v4_payment_fields_attorney_ruling.md) Decision 1 (bank deposit is paper-instrument only; bank-without-paper-instrument is a cash method and rejected upstream). The combined effect is that the only configurations surviving with an EFT add-on are: mail-only + EFT, in-person + mail + EFT, or bank-by-paper-instrument + EFT. That's the right set.
- The 13-case unit test coverage is appropriate. Two cases I want explicitly confirmed are in the list and pass: (i) `offeredMethods = ["EFT"]` with no primary branch → `EFT_REQUIRES_NON_EFT_PRIMARY`, and (ii) the bogus `"eft"` branch-value simulation → same. Good.
- This is gating logic, not prose. The thirteen build-locked renderer prose constants are untouched, as required.

**Open item #1 is closed.**

---

## (b) Error message wording

Proposed:

> "Electronic funds transfer cannot be the only way to pay. Add a non-EFT method (mail, in person, or bank deposit) as the primary payment method."

**[SHOULD FIX] — minor redline, not a redo.** The wording is operationally clear, which is what an internal validation error should be. Two small adjustments:

### Redline

**Approved final string (verbatim — please use this):**

> "Electronic funds transfer cannot be the only payment method offered on the notice. Add a non-EFT method — by mail, in person, or by bank deposit — as the primary method. (Cal. Code Civ. Proc. § 1161(2).)"

### Why the three changes

1. **"the only way to pay" → "the only payment method offered on the notice."** The original phrasing reads as if it's describing the tenant's payment options in the real world. It isn't — the tenant can still pay by EFT if the landlord accepts EFT. What the validator is actually enforcing is what the **notice** may offer on its face. The corrected phrasing tracks the statutory frame: § 1161(2) governs what the notice must state, not what the tenant may do.

2. **"mail, in person, or bank deposit" → "by mail, in person, or by bank deposit."** Parallel construction. Small thing; reads cleaner if this string ever surfaces in an operator-facing log.

3. **Add the § 1161(2) citation parenthetical.** You noted you "did not add a statutory citation." Add it. This error is an internal validation message, not face copy, so per-page citation discipline doesn't apply the way it does on the notice itself. A citation in the error message helps the on-call engineer or support rep trace **why** the validator rejected the config without spelunking through case law. Format the citation exactly as written above — `(Cal. Code Civ. Proc. § 1161(2).)` — including the period inside the parenthetical and the section symbol with a non-breaking space if your linter supports it. The `EFT_NOT_PREVIOUSLY_ESTABLISHED` message already cites § 1161(2); this keeps the two related EFT errors consistent.

### What the string is **not**

This is an internal validation/operator error. It is not face copy and is not subject to the verbatim build-lock. If a future iteration wants to revise the operational wording (e.g., to match a new error-message style guide), that's a normal product change and does not require a fresh attorney review packet — only the underlying rule and the citation must remain faithful.

---

## Other items in the note — no action required

- `EFT_NOT_PREVIOUSLY_ESTABLISHED` (existing) — unchanged. Good.
- The 13 unit tests — I'm not running them, but the assertions described are the right ones and cover both the named-guard path and the regression path. Engineering owns the green build.

---

## Net effect on the build sheet

| Item | Prior | Now |
|---|---|---|
| `validatePaymentBranch` EFT-not-sole enforcement | [SHOULD FIX] open | **CLOSED** (guard approved; error string redlined above) |
| Thirteen renderer prose constants | Build-locked | **Build-locked** (untouched) |
| `V4_WORDING_SIGNED_OFF` | `true` | **`true`** (unchanged) |
| Single-branch + EFT-add-on payment production | Unblocked | **Unblocked** (unchanged) |
| Bank account number exposure (Part E) | New item | **Still owed** — separate short packet before customer production |
| Multi-method (B3) wording lock | Pending | **Pending** — owed when multi-method renderer ships |

When the redlined error string is in and tests are still green, send a one-line confirmation note and I'll mark this fully closed. No new sign-off packet needed for that step.

— Reviewing Attorney · 2026-06-04 · SBN [pending]
