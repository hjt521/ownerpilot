# Build-side escalation — Phase 1 pre-finalization: env-flag timing + verbatim-vs-token conflict

**File:** `lahd_city_matrix_phase1_finalization_broker_ruling_request_2026-06-19.md`
**Date:** 2026-06-19
**Authored by:** Build side (engineering) — pre-finalization escalation for broker determination. Not a determination. No legal wording authored by build.
**To:** Jack Taglyan, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Re:** Phase 1 of the LAHD/CA-city-matrix workstream (`lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md`)
**Source-of-truth (committed `f46bebf`):** `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` (sha256 `d82efe45…`)
**Posture:** Build has written the three Phase 1 files and they pass typecheck + both test suites (46 assertions, 0 failures) in sandbox. Two questions surfaced at the finalization step that build will not resolve by guessing — one is a direct conflict between two of your MUST-FIX rules. Build authored no legal prose; all matrix content is transcribed verbatim from the committed source. Ruling fields are blank for broker authorship. Nothing is staged; no branch opened.

---

## §0. Status — what is built and green

- `lib/jurisdiction/caJurisdictionMatrix.ts` — 32-row typed table, all content verbatim from `f46bebf`. Keyed on `BranchState` enum.
- `lib/jurisdiction/resolveSupplementalDuty.ts` — thin wrapper over `detectJurisdiction` (shape ii), fail-closed, two-value reason vocabulary.
- `lib/jurisdiction/caJurisdictionMatrix.test.ts` — 24 assertions, 0 failures.
- `lib/jurisdiction/resolveSupplementalDuty.test.ts` — 22 assertions, 0 failures.
- Typecheck clean against the real `detectJurisdiction` / `laRtcRules` contracts.
- CONFIRM-1 behavior proven: SF and Santa Monica are matrix-`LIVE` yet wrapper-`blocked`, independently verified, never asserted equal (Phase 1 ruling §1).

Two questions block finalization. Both are narrow.

---

## §1. [Q1 — env flag] `LAHD_FILING_PROMPT_ENABLED` declaration timing

**The rule:** Phase 1 scoping ruling §4 approved "env flag `LAHD_FILING_PROMPT_ENABLED` declared but gates nothing visible in Phase 1," retained as a per-feature kill switch.

**The tension with the repo:** Phase 1 ships zero UI (ruling §1, §6). There is no rendered surface for the flag to gate. The repo has no `config/` directory and no central flag registry — the established pattern is bare `process.env.X === 'true'` reads at the point of use. Declaring a flag in Phase 1 that gates nothing means an exported symbol with no consumer, which:
- adds an exported-but-unused symbol that `test-and-typecheck`'s lint pass may flag (dead code), and
- would be wired to its actual consumer (`SupplementalDutyBlock`) only in Phase 2.

**Build's options (build leans A, but defers to broker):**

- **(A) Defer the flag to Phase 2.** Declare `LAHD_FILING_PROMPT_ENABLED` in Phase 2 alongside the UI component it gates. Phase 1 stays pure logic with no dead exported symbol. Cleaner; matches the repo's point-of-use pattern. Mild deviation from the literal "declared in Phase 1" wording of the ruling.
- **(B) Declare it now.** A small `lib/jurisdiction/featureFlags.ts` exporting `LAHD_FILING_PROMPT_ENABLED = process.env.LAHD_FILING_PROMPT_ENABLED === 'true'`, unused in Phase 1, commented "wired in Phase 2." Satisfies the literal ruling; adds one exported-but-unused symbol.

**Ruling requested (Q1):** A (defer to Phase 2) or B (declare now, unused)?

**Broker ruling (Q1):**

---

## §2. [Q2 — BLOCKING] Direct conflict: verbatim transcription vs. zero-attorney-tokens, in the LA `notes` cell

This is a genuine conflict between two of your Phase 1 MUST-FIX rules, surfaced by build's attorney-token scan. Build will not resolve it by editing the source content (that would be authoring/altering broker-sourced legal content, §0). It is yours to rule.

### The two rules in tension

1. **Zero attorney tokens** (Phase 1 ruling §5; architecture ruling §3 D1 part 1): no "attorney / counsel / JD / SBN / legal advice / law firm" tokens in new code, comments, tests, etc.
2. **Verbatim transcription** (Phase 1 ruling §5 item 6; §6 "what build will NOT do"): all matrix row content transcribed verbatim from the committed source — "No paraphrasing, no abbreviation, no normalization of whitespace inside cell content."

### Where they collide

The committed matrix's §2.1 (City of LA) `Branch state` cell reads, verbatim:

> REQUIRED-BUT-PENDING — three dependencies (geocode confirmation, LA city business-day calendar, RTC form refresh job) must land first per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution sections 3 and 5

The trailing cross-reference contains the filename `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` — which carries the token **attorney**. Build transcribed this cell verbatim into the LA row's `notes` field, as rule 2 requires. The token scan then flags it under rule 1.

- **Verbatim (rule 2) → token lands in new code → violates rule 1.**
- **Strip the token (rule 1) → alters the verbatim cell → violates rule 2 and touches broker-sourced content (§0).**

This is the only occurrence in all four Phase 1 files. The scan is otherwise zero. So the conflict is isolated to this one cell's source cross-reference.

### Why build is not choosing

Build's read is that the token here is part of a **filename citation pointer** (a reference to another determination file), not substantive rule content (the substantive content is "three dependencies must land first"). That reading would favor option (1) below. But "the filename is just a pointer, not content" is itself an interpretation of where the verbatim boundary falls — which is a §0 call about broker-sourced material, not an engineering call. Build will not make it.

Note also: this connects to your §8 plan to author `la_rule_modules_attribution_reconciliation_broker_determination` *after* Phase 1. The underlying `laRtcRules.ts` / `laOverlay.ts` / `laCityCalendar.ts` already carry attorney tokens in code; that reconciliation is the scoped sweep for them. The LA `notes` cell is arguably the same class of issue and could be swept the same way.

### Options (broker chooses; build implements exactly)

- **(1) Drop the filename cross-reference from the `notes` field.** Keep the substantive branch-state text verbatim ("REQUIRED-BUT-PENDING — three dependencies (geocode confirmation, LA city business-day calendar, RTC form refresh job) must land first"), omit only the trailing "per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution sections 3 and 5." Rationale: the dropped text is a citation pointer, not substantive rule content. Build would note in the row comment that the cross-reference was omitted per this ruling, with a pointer to this determination so the omission is auditable.
- **(2) Keep the cell fully verbatim, token and all.** Treat verbatim-from-source as the governing rule and the no-token rule as applying to build-*authored* text, not transcribed broker source (a quoted citation is not build attributing anything to an attorney). The token then lives in the matrix as quoted source. It gets swept later by the §8 `la_rule_modules_attribution_reconciliation` determination along with the LA rule modules. Build adds nothing; the row ships verbatim.
- **(3) Restructure how the cross-reference is stored.** E.g., move the substantive text to `notes` (verbatim, no filename) and the citation to a separate structured field, or drop it entirely — per broker's exact specification.

**Ruling requested (Q2):** option (1), (2), or (3) with specification. If (2), build also requests one line confirming the no-attorney-token MUST-FIX is read as applying to build-authored text only, not verbatim-transcribed broker-source citations — because that reading affects how build handles any other source cross-references that surface in Phase 2's locked-prose work.

**Broker ruling (Q2):**
**Broker confirm (if Q2=2): no-token rule applies to build-authored text only, not verbatim source citations —**

---

## §3. What build will do once Q1 and Q2 are ruled

- **Q1=A:** no flag file in Phase 1. **Q1=B:** add `lib/jurisdiction/featureFlags.ts` per §1(B).
- **Q2=1 or 3:** edit only the LA row's `notes` field per the exact ruling; re-run typecheck + both test suites; confirm still-green; confirm the token scan is now zero.
- **Q2=2:** ship the LA row verbatim as-is; record the broker's confirm that verbatim source citations are exempt from the no-token rule, and carry that reading into Phase 2.

Then deliver the four files + the exact branch/PR steps (branch `feat/ca-jurisdiction-matrix-phase-1`, copy files into `lib/jurisdiction/`, run `npx tsc --noEmit` + `node scripts/run_tests.mjs` + `npm run ci:verify-locked-prose`, named add, commit, push, PR with the four required references from the Phase 1 ruling §4, three green checks, merge).

No file is finalized, no branch opened, nothing staged, until Q1 and Q2 are ruled.

---

## §4. Ruling summary (broker)

- **(Q1)** env flag — A (defer to Phase 2) / B (declare now, unused):
- **(Q2)** LA `notes` token conflict — (1) drop cross-ref / (2) keep verbatim + sweep later / (3) specify:
- **(Q2 confirm, if 2)** no-token rule = build-authored text only, not verbatim source citations:
- **Sign-off to finalize Phase 1 files:**

---

Authored by build (Claude). Awaiting Broker Compliance Review under blanket authorization (`broker_blanket_authorization_2026-06-15`). No legal wording authored by Claude.
