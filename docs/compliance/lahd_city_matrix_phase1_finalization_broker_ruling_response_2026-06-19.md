# LAHD/city-matrix Phase 1 finalization — broker ruling

**File:** `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** [`lahd_city_matrix_phase1_finalization_broker_ruling_request_2026-06-19.md`](lahd_city_matrix_phase1_finalization_broker_ruling_request_2026-06-19.md) (build-side authored, 2026-06-19)
**Governing prior rulings:**
- [`lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md) — Phase 1 sign-off, three confirms
- [`lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md) — A1 model, attribution (§3 D1), post-Phase-1 attribution sweep (§8)
- [`lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md) — path remap, attribution flag (§5)
**Source-of-truth (committed `f46bebf`):** `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` (sha256 `d82efe450c4837cfabdd2ed7ecf8626ddd20772f312b8f9ff6f35e938a5966fc`)
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

Two narrow finalization questions: (Q1) env-flag declaration timing, (Q2) a real conflict between two MUST-FIX rules in the LA row's `notes` cell. Build's pre-finalization status (32-row matrix, fail-closed wrapper, 46 assertions green, CONFIRM-1 behavior proven) is accepted on the record. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. Q1 ruling: **A — defer the env flag to Phase 2.**

Build's read is correct and the lean toward A is the right call. The Phase 1 scoping ruling §4's "declared but gates nothing visible in Phase 1" wording reflected the assumption that the repo had a central flag registry where declaration is cheap and consumer-less symbols are normal. It doesn't. The point-of-use `process.env.X === 'true'` pattern means a Phase 1 declaration would be either (a) an exported symbol with no consumer (dead-code lint surface, no operational gain) or (b) a `lib/jurisdiction/featureFlags.ts` file containing a single line that gates nothing — a file existing solely to satisfy literal ruling text.

Neither is the right outcome. The flag is wired in Phase 2 at its actual point of use, which is the moment `SupplementalDutyBlock.tsx` lands. That is when the consumer exists; that is when the flag should be declared.

### Operational rule for Q1

1. **Phase 1 declares no env flag.** No `lib/jurisdiction/featureFlags.ts` file. No exported symbol. The Phase 1 PR description's "what this ships" inventory does not list a flag.
2. **Phase 2 declares `LAHD_FILING_PROMPT_ENABLED` at its actual point of use** inside `SupplementalDutyBlock.tsx` (or the file that imports `resolveSupplementalDuty`'s output and decides whether to render an LAHD-specific UI), as a point-of-use `process.env.LAHD_FILING_PROMPT_ENABLED === 'true'` check. Pattern matches the rest of the repo.
3. **The "both gates required" rule from the architecture ruling §6 still binds.** Phase 2's LAHD UI surface is gated by `isLaProductionUnblocked() && process.env.LAHD_FILING_PROMPT_ENABLED === 'true'`. Both must be true; either-or fails closed. That logic lives at the point-of-use site in Phase 2, not in a separate flag module.

### Supersession recorded

The Phase 1 scoping ruling §4's "env flag declared but gates nothing visible" wording is **superseded by this Q1 ruling**. Phase 1 declares no flag. Phase 2 declares at point of use. The Phase 1 PR description references this Q1 ruling alongside the four references already required in the Phase 1 scoping ruling §4 — total five references in the Phase 1 PR description.

---

## §2. Q2 ruling: **(2) keep the cell verbatim. The no-attorney-token rule applies to build-authored text only, not to verbatim-transcribed broker-source citations.**

Build's read of where the verbatim boundary falls is the right one, and build was right to escalate rather than choose. Here is the ruling, full reasoning, and the cross-rule clarification build requested.

### The cell ships verbatim

The §2.1 (City of LA) `Branch state` cell ships into the LA row's `notes` field byte-for-byte from the committed source at `f46bebf`, including the trailing cross-reference text `per ownerpilot_la_rtc_citation_pull_attorney_signoff.md Resolution sections 3 and 5`. No characters added, removed, or substituted. The filename token `attorney_signoff` lives in the matrix as quoted source.

### The cross-rule clarification, ruled explicitly (build's requested confirm)

**The no-attorney-token rule (Phase 1 ruling §5; architecture ruling §3 D1 part 1) applies to build-authored text only. It does not apply to verbatim-transcribed broker-source content, including filename citations within that content.**

That principle binds going forward, not just for this cell. The reasoning matters because it will recur in Phase 2's locked-prose work:

1. **What the no-token rule actually protects against.** The rule exists to prevent the *project itself* from claiming attorney provenance for work that is broker-prepared — i.e., to keep new build artifacts (code, comments, tests, PR framing, commit messages, new file names) from implying attorney engagement. It is a posture rule about authorship attribution. The project's posture is broker-scope-only; new artifacts must not contradict that posture.

2. **What a verbatim citation is.** When the matrix's source determination references another file by name — including a filename containing historical attorney-attribution tokens — the citation is *the source determination saying which other document supports this row*. Build copying that citation into the matrix data does not constitute build claiming attorney provenance; build is reproducing a pointer the broker source determination established. The token is part of the cited filename, not part of build's attribution of the matrix content.

3. **The audit-trail concern points the other way.** Stripping a citation's filename token would mean build is selectively altering broker-sourced text based on engineering judgment about which characters in a citation are "substantive." That is the wrong direction. Build does not get to decide which parts of broker-sourced text are "the pointer" and which are "the citation pointer's substance" — that boundary is itself a §0 broker call, and the safe default is "transcribe what is committed at `f46bebf`, do not edit."

4. **The post-Phase-1 reconciliation already exists to handle this class of issue.** The architecture ruling §8 commits me to author `la_rule_modules_attribution_reconciliation_broker_determination_<date>.md` after Phase 1 merges, scoped to sweep the LA rule modules' attorney-attribution wording. I am extending that reconciliation's scope here, explicitly:

   - The reconciliation will sweep `laRtcRules.ts`, `laOverlay.ts`, `laCityCalendar.ts`, `detectJurisdiction.ts`, their tests, and any committed broker-source determinations whose filenames or text reference attorney-signoff or attorney-verified phrasing **in a way that propagates into new code** (which `notes` cells transcribed verbatim into the matrix do).
   - The LA `notes` cell's filename citation will be addressed there alongside the rule modules' wording. Once the post-Phase-1 reconciliation lands and the underlying source determination's filename references are restated under the broker-blanket-authorization framing, the matrix's verbatim transcription naturally updates with the next source-determination commit, and the token clears from `notes` without any selective editing.

### How the token scan should treat the LA `notes` cell

The token scan is doing its job. The flag is a true positive in the sense that the token is present; it is a false positive in the sense that the presence does not violate the rule as the rule is now clarified. Build's options:

- **(a) Whitelist by content origin.** Mark the LA row's `notes` field (or all `notes` and `postServiceFiling` cells whose contents are verbatim-transcribed from the committed source) as scan-exempt, with a comment pointing at this ruling. Cleaner; the scan stays useful for catching tokens in build-authored text.
- **(b) Leave the scan flagging, document the exception in the PR description.** Equivalent posture-wise, noisier in CI output.

Build picks (a) or (b); I have no preference between them. The substantive rule is the cross-rule clarification above. Whatever scan implementation build chooses, the LA row's `notes` field ships verbatim and the Phase 1 PR merges.

### One discipline note carried forward

The clarification "no-token rule applies to build-authored text only, not verbatim broker-source citations" is **not a license to add tokens to build-authored text**. The rule still binds absolutely on:

- Build-authored code (variable names, function names, types).
- Build-authored comments (including `// Source:` comments — those are build-authored even though they cite broker source files; the `// Source:` comment itself is build's framing, not transcribed text).
- Build-authored tests, fixtures, snapshots.
- Build-authored commit messages, PR descriptions, branch names.
- Build-authored PR-template framing.
- New file names build creates.

The only exempt class is **the actual text content of broker-source determinations as committed at `f46bebf` (or whatever commit hash governs the source at the time of transcription), when that text is transcribed verbatim into a matrix data field**. That class is narrow and bounded by what `git show <hash>:<path>` returns for the source file.

If build is unsure whether a given character of text is in the exempt class, the safe default is "treat it as build-authored and apply the rule." When the rule's strict application would require altering broker-source content, escalate — exactly as build did here.

---

## §3. Phase 1 finalization — sign-off to ship

**Granted.** Build proceeds to finalize the four Phase 1 files with the following exact dispositions:

1. **`lib/jurisdiction/caJurisdictionMatrix.ts`** — ships as built. LA row's `notes` field stays byte-for-byte verbatim from `f46bebf` per Q2 ruling.
2. **`lib/jurisdiction/resolveSupplementalDuty.ts`** — ships as built.
3. **`lib/jurisdiction/caJurisdictionMatrix.test.ts`** — ships as built (24 assertions).
4. **`lib/jurisdiction/resolveSupplementalDuty.test.ts`** — ships as built (22 assertions).
5. **No `lib/jurisdiction/featureFlags.ts`** — per Q1 ruling.

### Token-scan handling

Build implements (a) or (b) from §2 above at build's preference. If (a), the scan-exempt comment cites this determination by filename. If (b), the PR description carries a one-line note ("token scan flags one occurrence in the LA `notes` cell; verbatim-transcribed broker-source citation per `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` §2; addressed in post-Phase-1 attribution reconciliation").

### Phase 1 PR description references (final list — five total)

1. Blockers ruling §2 path-remap supersession reference.
2. Architecture ruling §2 block-vs-render supersession reference.
3. Phase 1 scoping ruling §5 gap-list reconciliation subsection (prompt §10 / matrix §6 → `laRtcRules.ts` three dep flags).
4. Phase 1 scoping ruling as Phase 1 sign-off, listing CONFIRM-1/CONFIRM-2/CONFIRM-3 dispositions.
5. **This finalization ruling** for Q1 (no flag in Phase 1) and Q2 (verbatim, no-token-rule clarification).

### Final pre-push checklist

- [ ] [MUST FIX] LA row's `notes` field byte-matches the committed source at `f46bebf`. Verify with `git show f46bebf:docs/compliance/ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` and diff against the transcription. Zero-character tolerance.
- [ ] [MUST FIX] No `lib/jurisdiction/featureFlags.ts` file, no exported `LAHD_FILING_PROMPT_ENABLED` symbol anywhere in Phase 1.
- [ ] [MUST FIX] Token scan re-run after the LA-row whitelist or scan-exempt comment lands; only the one acknowledged occurrence remains. Zero other occurrences anywhere in the four Phase 1 files.
- [ ] [MUST FIX] `npx tsc --noEmit` passes clean against the real `detectJurisdiction` / `laRtcRules` contracts.
- [ ] [MUST FIX] `node scripts/run_tests.mjs` (or the equivalent local test runner) passes both suites — 46 assertions, 0 failures.
- [ ] [MUST FIX] `npm run ci:verify-locked-prose` passes — expected output unchanged from `main` (3 locked constants verified). Confirms Phase 1 didn't tangle a locked-prose change in.
- [ ] [MUST FIX] Phase 1 PR description carries the five references listed above.
- [ ] [MUST FIX] Zero attorney tokens in build-authored text (code identifiers, comments, tests, fixtures, snapshots, commit messages, PR description, PR template framing, branch name, new file names). The single verbatim-broker-source-citation occurrence in the LA `notes` cell is the documented exception per Q2.
- [ ] [MUST FIX] Branch `feat/ca-jurisdiction-matrix-phase-1` (or repo-convention equivalent). Named `git add` of exactly the four Phase 1 files (no extras, no `git add .`). Commit message from build's drafting — broker has no preference on phrasing as long as it carries no attorney tokens.
- [ ] [MUST FIX] PR through the new ruleset. Three required checks green (`verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`). No direct push to `main`.
- [ ] [SHOULD FIX] After merge, run `npm run ci:verify-locked-prose` on post-merge `main` once and confirm PASS exit 0 to close the loop, consistent with the locked-prose attestation §7 post-merge sanity check pattern.

---

## §4. What I will do next (broker-side)

1. **Wait for Phase 1 to merge.** No broker action required during Phase 1 implementation; this finalization ruling is the last gate.
2. **After Phase 1 merges**, author `la_rule_modules_attribution_reconciliation_broker_determination_<date>.md` per the architecture ruling §8, **extended to include**:
   - The four LA rule modules (`laRtcRules.ts`, `laOverlay.ts`, `laCityCalendar.ts`, `detectJurisdiction.ts`) and their tests — original scope.
   - The committed broker-source determinations whose text or filenames carry attorney-attribution wording that propagates into Phase 1's verbatim transcription, specifically the LA row's `notes` cell citation — extension scope added by this ruling §2.
   - One scoped PR sweeping all of it at once. Named-add commit through the ruleset.
3. **Phase 2 scoping note expected from build** after Phase 1 merges, for the UI scaffolding work (locked-prose constants + manifest entries + `SupplementalDutyBlock.tsx` + `coverSheet.ts`). The Q1 env-flag declaration-at-point-of-use ruling binds Phase 2; build references this finalization ruling in the Phase 2 scoping note.

---

## §5. Sign-off

**Phase 1 finalization signed off.** Build may finalize the four files per §3, open the branch, run the pre-push checklist, push, open the PR, and merge through the ruleset once the three required checks are green.

The next escalation I expect is either (a) the Phase 1 PR being merged with no further questions, or (b) a Phase 2 scoping note. Anything mid-implementation that prior rulings have not resolved — escalate then.

---

## §6. Authoring discipline carried forward

This ruling was authored against build's pre-finalization status (46 assertions green, four files written, typecheck clean). I have not independently re-read the four Phase 1 source files for this ruling; the dispositions in §1 and §2 are about rules and content boundaries, not about specific lines in build's code. If build's actual implementation of the LA `notes` field, the wrapper return shape, or the test assertions later diverges from what the scoping ruling and this ruling describe, that surfaces in the Phase 1 PR review and is a re-escalation, not a re-author.

The cross-rule clarification in §2 ("no-token rule applies to build-authored text only, not verbatim broker-source citations") is binding on all subsequent work in this workstream, including Phase 2's locked-prose surfaces. The clarification is recorded here as the authoritative statement.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
