# FF-4 FMR pre-check — quantity reconciliation broker ruling

**Date:** 2026-07-03
**Fork surfaced by:** Engineering (Claude Code) during FF-4 buildout
**Referenced authority:** `claude_code_master_prompt_omnibus_gate3_ownerpilot_productization_2026-07-02.md` §3.3; `ownerpilot_lahd_filing_walkthrough_v1_2026-07-02.md` §F; live LAHD portal screenshot `5537LaMirada-202-CliftonAlexander_LAHD_form_page3_rent_upload_signature_2026-07-02.jpg` (Rent Details panel, Economic Threshold FMR box).

---

## §1 — Fork statement

The omnibus §3.3 pseudocode reads:

> "Compute `contract_monthly_rent` (from intake field, backfilled by FF-3).
> Look up FMR for `bedrooms_count`.
> If `contract_monthly_rent < fmr_for_bedrooms`: **hard block**."

The **locked prose** hard-block message reads:

> "Your contract rent of ${contract_monthly_rent} is below the Fair Market Rent (FMR) threshold…"

But the **LAHD portal wording** (verbatim, from the live filing screenshot the Clifton Alexander filing produced) reads:

> "Landlords may not evict a tenant who falls behind in rent unless the tenant **owes an amount higher than** the Fair Market Rent (FMR). The FMR depends on the bedroom size of the rental unit.
>
> For example, if a tenant rents a one-bedroom unit for $1,500, the landlord cannot evict the tenant since **the rent owed is less than the FMR** for a one-bedroom unit."

These are **two different quantities** and can produce different block/allow outcomes:

| Scenario | Contract rent | Amount owed | Contract-rent gate | Amount-owed gate |
|---|---|---|---|---|
| Clifton Alexander (founding case) | $3,000 | $6,000 | PASS (3000 > 2903) | PASS (6000 > 2903) |
| Hypothetical: 2BR at $2,800/mo, 1 month owed | $2,800 | $2,800 | **BLOCK** (2800 < 2903) | **BLOCK** (2800 < 2903) |
| Hypothetical: 2BR at $2,800/mo, 2 months owed | $2,800 | $5,600 | **BLOCK** (2800 < 2903) | PASS (5600 > 2903) |
| Hypothetical: 2BR at $3,500/mo, partial owed $2,000 | $3,500 | $2,000 | PASS (3500 > 2903) | **BLOCK** (2000 < 2903) |

Rows 3 and 4 are the divergence. The two gates give opposite answers.

The founding filing (Clifton) passed both gates by coincidence and did not surface this defect at the time.

---

## §2 — Ruling

**Option 1 — Amount owed vs FMR — ADOPTED.**

The gate implemented in FF-4 MUST compare **`amount_of_rent_owed`** (the total demanded in the 3-day notice) against the FMR for the unit's bedroom count. Not monthly rent.

### §2.1 — Why (three converging authorities)

1. **Portal-text primacy.** The LAHD portal's own wording is verbatim: "the tenant owes an amount higher than the FMR" and "the rent owed is less than the FMR." FF-4's entire justification is that this gate is **portal-enforced, not platform preference** (omnibus §3.3: "This is a portal-level restriction, not a platform preference — if you attempt to file, LAHD will reject the submission"). If our gate compares a different quantity than the portal, we produce false blocks (row 3 above: we would block a filing LAHD would accept) and false passes (row 4: we would let the owner assemble a packet LAHD will reject). Either failure mode defeats the point of the pre-check.

2. **Walkthrough v1 already had this right.** `ownerpilot_lahd_filing_walkthrough_v1_2026-07-02.md` §F explicitly states: "You cannot evict for non-payment if the **amount owed** is less than the FMR for that bedroom size." And in the OwnerPilot integration recommendations at the bottom: "Pre-check FMR threshold at intake — block or warn if the **amount owed** is below the FMR for the unit's bedroom count." The walkthrough is a direct transcription of the portal. The omnibus §3.3 pseudocode `contract_monthly_rent < fmr` is the drift.

3. **The portal example is not a counter-example.** The portal example ("one-bedroom unit for $1,500 … rent owed is less than the FMR") uses $1,500 as *both* the monthly rent and the amount owed because it implicitly assumes one month's arrears. It conflates the two because in that fact pattern they're equal. This is common in explanatory examples and is not evidence that the portal gate uses monthly rent — the operative sentence one line above ("owes an amount higher than the FMR") is unambiguous.

### §2.2 — Corrections required

**Corrections A (spec):** Amend `claude_code_master_prompt_omnibus_gate3_ownerpilot_productization_2026-07-02.md` §3.3 pseudocode:

**Before:**
```
- Compute contract_monthly_rent (from intake field, backfilled by FF-3).
- Look up FMR for bedrooms_count.
- If contract_monthly_rent < fmr_for_bedrooms: hard block.
- If contract_monthly_rent >= fmr_for_bedrooms: soft pass, continue.
```

**After:**
```
- Compute amount_of_rent_owed (the total demanded in the 3-day notice, from
  intake field — this is a REQUIRED intake field for non-payment cases; FF-3
  ensures it is captured separately from contract_monthly_rent).
- Look up FMR for bedrooms_count.
- If amount_of_rent_owed <= fmr_for_bedrooms: hard block.
  (Strict inequality: LAHD wording is "amount higher than" — equal is not
  higher. A tenant owing exactly the FMR is a block.)
- If amount_of_rent_owed > fmr_for_bedrooms: soft pass, continue.
```

Note two operator changes:
- Quantity: `contract_monthly_rent` → `amount_of_rent_owed`.
- Comparison: `<` (strict) block edge changes because the portal uses "higher than," which excludes equality on the pass side. A tenant owing **exactly** the FMR fails the portal test. Implement as `amount_of_rent_owed <= fmr` → block. This is a small change but matters at the boundary and must be tested.

**Correction B (locked prose):** Amend §3.3 hard-block copy. The current locked-prose block reads: *"Your contract rent of ${contract_monthly_rent} is below the Fair Market Rent (FMR) threshold…"* Change to:

> "The amount owed on your 3-day notice — ${amount_of_rent_owed} — is not higher than the Fair Market Rent (FMR) threshold for a ${bedrooms}-bedroom unit in the City of Los Angeles (FMR = ${fmr}). The LAHD Eviction Notice Filing System blocks non-payment eviction filings when the amount owed does not exceed FMR. This is a portal-level restriction, not a platform preference — if you attempt to file, LAHD will reject the submission. Options: (1) if the amount owed in your records is incorrect, correct it now; (2) if the eviction is for cause other than non-payment, change the just-cause selection; (3) wait until more rent accrues so the total demanded exceeds FMR (the tenant continues to accrue arrears each month rent goes unpaid); (4) for guidance on below-FMR non-payment situations, contact LAHD directly at (866) 557-7368."

Options (1)-(2) and (4) survive verbatim. Option (3) is **new** and important: unlike a contract-rent gate (which is immutable at intake time), an amount-owed gate has a natural remediation path — waiting one more month often crosses the threshold. Owners who would otherwise abandon the filing get a legitimate path forward that also aligns with LAHD's underlying intent (which is not to preclude eviction at low rents forever, but to prevent tiny-dollar filings from clogging the system and displacing tenants over trivial arrears).

**Correction C (Clifton golden test):** Amend `claude_code_master_prompt_omnibus_gate3_ownerpilot_productization_2026-07-02.md` §4.4 step 2:

**Before:** *"FMR pre-check passes (3000 > 2903)."*
**After:** *"FMR pre-check passes (amount_of_rent_owed = 6000 > fmr_2br = 2903). Contract monthly rent 3000 is captured but is not the gate quantity — verify the gate reads amount_of_rent_owed, not contract_monthly_rent."*

The Clifton case is fine either way — it passes both gates. But the golden regression test must explicitly exercise the correct quantity so a future refactor that regresses to contract-rent doesn't pass on Clifton alone.

**Correction D (new synthetic tests):** Add two synthetic cases to the A14 harness catalog to lock in the divergence rows from §1's table:

- `SC-FMR-QUANTITY-DIVERGENCE-01`: 2BR at contract_rent=$2,800, amount_owed=$5,600 (2 months). Expected: **PASS** (amount owed 5600 > FMR 2903). Regression guard against a contract-rent gate incorrectly blocking this.
- `SC-FMR-QUANTITY-DIVERGENCE-02`: 2BR at contract_rent=$3,500, amount_owed=$2,000 (partial payment scenario). Expected: **BLOCK** (amount owed 2000 <= FMR 2903). Regression guard against a contract-rent gate incorrectly passing this.
- `SC-FMR-BOUNDARY-EQUAL`: 2BR at contract_rent=$2,903, amount_owed=$2,903. Expected: **BLOCK** ("higher than" is strict). Boundary regression guard.

These three synthetics are new. Add them to the A14 harness catalog alongside `SC-DAYCOUNT-JUL2026` from the cover-sheet ruling.

**Correction E (walkthrough is already correct — no change needed):** `ownerpilot_lahd_filing_walkthrough_v1_2026-07-02.md` §F already reads "amount owed" throughout. No amendment needed to the walkthrough. The walkthrough v1.1 update tracked under omnibus §3.1 must **not** regress this to contract-rent language.

**Correction F (cron pinned form — one clarification):** The pinned form `lahd_fmr_table_current` referenced in omnibus §3.3 stays as scoped. The FMR values themselves don't change based on this ruling; only the quantity compared against them does. No cron-config change.

### §2.3 — What the locked prose actually describes (answer to engineer's direct question)

Engineer asked: *"which quantity does the locked prose describe?"*

Answer: **The current locked prose in omnibus §3.3 describes `contract_monthly_rent`, and that is the drift.** It was drafted from the omnibus pseudocode, not from the portal wording or the walkthrough. After Correction B above, the locked prose describes `amount_of_rent_owed`, which aligns to the portal and the walkthrough. This ruling is what authorizes overwriting the §3.3 locked-prose entry when the manifest is regenerated — treat this document as the `source_determination` field for the amended entry.

### §2.4 — Sequencing

This ruling is authorized to land in the Wave-3 FF-4 lane the omnibus already sequences. Do not open a new wave for it. The corrections above are:

- **Correction A** — spec amendment (docs, applied in the codebase where the FF-4 handler is being written, this determination is the amendment).
- **Correction B** — locked-prose update (part of the FF-4 PR; manifest regenerates as part of the PR).
- **Correction C** — one-line test-case comment amendment (part of the FF-4 PR).
- **Correction D** — three new synthetic-test rows (part of the FF-4 PR or the Wave-4 integration-test PR, engineer's call on which PR carries them).
- **Correction E** — no-op (walkthrough already correct).
- **Correction F** — no-op (cron config unchanged).

Add a §3.3 addendum row to `gate3_status_rollup_2026-07-03.md` §6 noting this quantity correction for evidence-trail completeness. Not a wave restart; note-only.

### §2.5 — Attestation

The Wave-3 attestation packet for FF-4 must confirm:

1. Gate quantity is `amount_of_rent_owed` (assert against a code path, not just a comment).
2. Comparison operator is `<=` on the block side, `>` on the pass side (test the equality boundary explicitly with SC-FMR-BOUNDARY-EQUAL).
3. Locked prose manifest entry for `chatFmrPreCheckHardBlock` (or whatever the constant is named) matches Correction B verbatim.
4. Clifton golden regression test (§4.4) passes with the corrected assertion in Correction C.
5. Three new synthetic cases from Correction D are in the harness and passing.

Do not countersign Wave-3 FF-4 without all five items green.

---

## §3 — Standing rule (for future portal-derived gates)

This is the second time in ~72 hours we've found a divergence between a §3.3-style compliance gate and its underlying portal wording (first: PR-C day-count defect / cover-sheet revision drift; now: FMR quantity). Standing rule for engineering going forward:

**When a gate is described as "portal-enforced," the gate's operative quantity, comparison operator, and boundary-inclusive wording MUST match the portal text verbatim.** Not a paraphrase, not a summary — the actual noun phrase from the portal ("amount owed," "amount higher than," "at least three business days"). Any drift from portal wording is a compliance defect regardless of whether it produces a false-block, false-pass, or coincidentally-correct outcome on the case that surfaced it.

Add this as a linting rule to the locked-prose CI guard if feasible: any constant whose `source_determination` cites a portal must include a `portal_text_verbatim` field, and the guard must diff that field against the compare/branch structure of the code that consumes the constant. Engineer's call on scope — if it's too invasive, at minimum add it to the PR-review checklist for any FF-* or LAHD/portal-scope work.

---

**Signed:**
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03
