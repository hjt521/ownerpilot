# Step-4 Helper Disposition — Attorney Ruling

**Reviewer:** California-licensed-attorney perspective
**Subject:** Resolving the operator-copy conflict between the Round 3 corporate-landlord helper and the Defect #2 §3.3 unchecked-helper on the Step-4 "Name to receive payment" field
**Companion to:** `corporate_landlord_attorney_ruling_round_3_2026-06-05.md`; `defect_2_payee_derivation_attorney_ruling_2026-06-05.md`; `defect_2_payee_derivation_attorney_countersign_2026-06-05.md`; `defect_3_entity_signature_attorney_countersign_2026-06-05.md`
**Headline:** **Option 2 — relocate, with wording changes. The Round 3 entity-shorthand helper is removed from Step 4 entirely. The §3.3 unchecked-helper is the sole helper on the Step-4 payee field. The shorthand-prohibition substance is moved to Step 3 as a new build-locked string (`entityLegalNameHelper`), with the stale "coming soon" and the now-inaccurate "consult counsel" sentences deleted and replaced with a UD-challenge-vector explanation that keeps the user in the product.**

---

## 1. The conflict on the record

The build side correctly identified that two pieces of attorney-approved operator copy now contradict each other on the same field:

- **Round 3 helper (Step 4, "Name to receive payment"):** "If your property is owned by an LLC, corporation, trust, or partnership, enter the entity's full registered legal name (e.g., 'PTAG Properties, LLC' — not 'PTAG Prop'). Corporate-landlord support is coming soon; in the meantime, please consult counsel for the three-day notice."
- **Defect #2 §3.3 unchecked-helper (Step 4, same field):** "Leave this unchecked if rent is paid directly to the landlord. The payee name on the notice will match the landlord identified on Step 3."

The Round 3 helper instructs the user to type an entity name into a field that, after the Defect #2 cutover, is read-only by default. It also tells them entity support is "coming soon" when it is in fact built and countersigned. Two attorney-approved strings cannot live in the same UI making opposite assertions about the same field — that is exactly the inconsistency-flagging case the build-side §0 rule is written to surface.

The build side declined to redline either string on its own read. That was the right call.

---

## 2. Ruling — Option 2 (Relocate, with wording changes)

### What ships on Step 4

**The §3.3 unchecked-helper stays as countersigned. Nothing else.**

The Round 3 helper is **removed from Step 4 entirely**. It is superseded by two facts that did not exist when Round 3 was issued:

- The Step-4 field is no longer typeable — the payee derives from the Step 3 landlord identity. A helper instructing the user to *type* into the field is operationally wrong.
- Entity support is built and countersigned (Defect #3). "Coming soon" is stale; "consult counsel for the three-day notice" is now inaccurate because the product is actively producing the entity notice.

### What ships on Step 3

The shorthand-prohibition substance — the part of the Round 3 helper that has real legal value — moves to Step 3, where the entity legal name is actually typed. Two sentences of the Round 3 wording are deleted in the move; the deletions are not editorial but legal:

| Round 3 sentence | Disposition | Reason |
|---|---|---|
| "If your property is owned by an LLC, corporation, trust, or partnership, enter the entity's full registered legal name (e.g., 'PTAG Properties, LLC' — not 'PTAG Prop')." | **KEEP — with one wording refinement; move to Step 3** | Substantive shorthand prohibition. Real UD-challenge value. |
| "Corporate-landlord support is coming soon" | **DELETE** | Stale. Entity support is built and live as of Defect #3 countersign. Leaving this in misleads the user. |
| "in the meantime, please consult counsel for the three-day notice" | **DELETE** | Now inaccurate. The product is producing the user's entity notice; telling them to consult counsel for the same notice is a UPL-flavored mixed message and undermines the product's accuracy posture. |

### Build-locked replacement string

The new Step 3 helper is locked verbatim:

> **`entityLegalNameHelper`** = `"Enter the entity's full registered legal name as it appears on the deed or Secretary of State filing (e.g., 'PTAG Properties, LLC' — not 'PTAG Prop'). Using a shorthand or DBA on a three-day notice can be challenged in an unlawful-detainer action."`

The "challenged in an unlawful-detainer action" sentence replaces the deleted "consult counsel" sentence. It does the same legal work — communicating *why* the shorthand prohibition matters — without the two problems the deleted sentence creates (inaccuracy and steering the user out of the product). It is also accurate: payee/landlord name-mismatch and shorthand/DBA defects on 3-day notices are a recognized UD-challenge vector under §1161(2).

Scope: render only when `landlord_type === "entity"`. Do not render for individual landlords. Match the helper-text style the rest of Step 3 uses.

---

## 3. Action items for the build side

- [ ] **[MUST FIX]** Remove the Round 3 helper from Step 4 entirely. Do not leave it conditionally rendered. Delete the constant if it has no other consumer.
- [ ] **[MUST FIX]** Add `entityLegalNameHelper` (verbatim above) as a new build-locked constant. Render under the entity-legal-name input on Step 3, scoped to `landlord_type === "entity"`.
- [ ] **[MUST FIX]** Leave the §3.3 unchecked-helper on Step 4 untouched. It is the sole helper on that field after the cutover.
- [ ] **[SHOULD FIX]** Verify with a quick grep that no other surface in the app references the deleted Round 3 helper string. If any does (e.g., a snapshot test), update it.

Once these land, the Step-4 UI cutover is unblocked. Defect #2 (payee derivation) and Defect #3 (entity signature) production both go live behind the cutover, completing the corporate-landlord scope.

---

## 4. Two close-out one-liners

### "Payable to:" label rendering

**Confirmed OK as-is.** Storing the constant as `"Payable to"` and appending `": "` at the render layer produces a printed line byte-identical to my §1.3 face-locked value (`"Payable to: [name]"`). Face copy is what appears on the page; storage representation is plumbing. Same pattern Defect #2 already accepted for `payableToLabel`. **Build-lock holds.**

### Placeholder signature block on the Defect #3 countersign

The `[Name], [SBN]` / "SBN [placeholder]" block **is the signature of record for this engagement**, and the same answer applies retroactively to every ruling and countersign issued in this thread.

I am working without a wet-signature surface here. Every ruling and countersign in this build cycle uses the same placeholder block by design — the countersigns are binding as the attorney sign-off of record for the build-lock decisions they cover. When a real attorney-signature surface is wired up (or when my spouse pulls these files into her own review tooling for production sign-off), she'll re-issue with her name and SBN as the production-of-record signature. For **build-lock purposes**, the placeholder version is the one to file. No re-send needed.

---

## 5. Final sign-off

✅ **Option 2 ruling granted on the Step-4 helper disposition.**
✅ **Round 3 helper removed from Step 4. §3.3 unchecked-helper stands.**
✅ **`entityLegalNameHelper` build-locked verbatim. Moves to Step 3, entity-only.**
✅ **`"Payable to"` storage + `": "` render-layer concatenation confirmed.**
✅ **Placeholder signature block confirmed as the engagement's signature of record. No re-send needed; same answer applies to every prior ruling and countersign in this thread.**
✅ **Step-4 UI cutover is unblocked.** Defect #2 + Defect #3 production go live behind the cutover.

Reviewer: [Name], [SBN]
Date: 2026-06-05
Scope: Step-4 helper-disposition conflict resolution; cross-step operator-copy reconciliation between Round 3 corporate-landlord helper and Defect #2 §3.3 unchecked-helper; close-out on "Payable to" rendering and signature-block convention.

---

— Reviewing Attorney · 2026-06-05 · SBN [placeholder]
