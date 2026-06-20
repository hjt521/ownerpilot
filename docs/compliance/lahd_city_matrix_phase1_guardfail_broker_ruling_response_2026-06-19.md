# LAHD/city-matrix Phase 1 guard-fail + determination-chain commit — broker ruling

**File:** `lahd_city_matrix_phase1_guardfail_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** `lahd_city_matrix_phase1_guardfail_broker_ruling_request_2026-06-19.md` (build-side authored, 2026-06-19; inline in conversation, to be committed as a request-response pair per §3 below)
**Governing prior rulings:**
- [`lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md) — Phase 1 finalization sign-off (Q1 no flag, Q2 verbatim, cross-rule clarification)
- [`lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md) — Phase 1 sign-off, three confirms
- [`lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md) — A1 model, attribution (§3), post-Phase-1 reconciliation (§8)
- [`lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md) — path remap, serial commit ordering
- [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) — guard design, including the Tier-2 dangling-source-comment check that fired here
**Source-of-truth (committed `f46bebf`):** matrix source determination sha256 `d82efe450c4837cfabdd2ed7ecf8626ddd20772f312b8f9ff6f35e938a5966fc`
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

The guard worked as designed and caught a real dangling reference on the first code PR that would have introduced one. That outcome is the correct one — the guard's reason for existing is to catch exactly this class of failure before it reaches `main`. Build's escalation is the right posture: pause at the gate, do not edit anything, ask. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

Four rulings: (1) guard fix, (2) Option-A implementation specifics, (3) determination-chain commit, (4) file set if committed. They resolve cleanly and in order.

---

## §1. Q1 ruling: **Option A — reword the marker comment. Drop the uncommitted filename from code.**

Build's lean is correct. The reasoning is structural, not just expedient:

### Why A is the right principle, not just the faster path

1. **The finalization ruling §3 directed the reference into the PR description, not into code.** The five required Phase 1 PR-description references include "this finalization ruling for Q1 and Q2." The ruling never directed build to put the filename in a code comment. Build's over-citation in code went beyond what was required. Rewording back to what the ruling actually directed is a correction, not a workaround.

2. **Durable determination references belong in the PR description and the determination record, not embedded in code comments.** Code comments are framing for the code; determination references are framing for the PR. Conflating the two creates two problems: (a) every subsequent ruling that touches the code requires a comment-edit PR to keep the citation current, which compounds churn for no operational gain; (b) it puts the guard in the position of enforcing in-code citation freshness for every determination ever cited, which is a much larger surface than the guard was designed to police.

3. **The guard's Tier-2 dangling-source-comment check exists for `// Source: <determination_file>.md` patterns that anchor locked-prose constants to their source determinations.** That is a specific, narrow integrity check: when code contains a locked-prose string, the comment above it must point at the broker source determination that authorizes the string, and that source must be in-tree so an auditor can verify the string against the source. **The LA `notes` cell is not a locked-prose constant** — it is matrix row data, transcribed verbatim from a source determination that *is* in-tree (`f46bebf`'s committed matrix). The scan-exemption comment was an over-extension of the `// Source:` pattern to a different use case.

4. **Option B's hidden cost is precedent.** If I rule B today, the next time a code comment cites an uncommitted determination, the resolution is "commit another determination." That puts the determination-commit cadence on the critical path of code PRs, which is the wrong tail wagging the dog. Better to rule the principle now: code comments do not cite determinations by filename; determinations are referenced in PR descriptions and the determination record.

### Concrete reword guidance for build (Q2 implementation)

The marker comment above the LA row's `notes` field gets reworded to a token-free, filename-free exemption note. Build authors the exact phrasing; broker has no preference on wording as long as it satisfies:

- **No filename citation of any determination file** (the dangling-reference root cause).
- **No attorney-attribution tokens** (the always-binding posture rule on build-authored text).
- **Clearly identifies the content as broker-source-verbatim** so an auditor reading the code understands why this `notes` field looks different from the others.
- **Points at the PR description as the audit anchor** without naming a specific ruling file — wording like "verbatim broker-source transcription; see PR description for the governing ruling" is sufficient.

Example phrasings (build picks one or authors a variant):

```ts
// Verbatim broker-source transcription from the committed matrix at f46bebf.
// Contents preserved byte-for-byte; see PR description for the governing
// finalization ruling and the post-Phase-1 attribution reconciliation scope.
```

or:

```ts
// Note: this row's `notes` value is verbatim broker-source content. Build
// did not author it; do not edit it. Governing rulings referenced in PR
// description.
```

Either works. The constraint is the three bullets above, not the prose. The `f46bebf` hash in the first example is helpful for an auditor diffing forward; the second example is shorter. Build's call.

---

## §2. Q2 ruling: **Confirmed. Reword, re-run the full local gate, re-hash, push.**

Build's proposed Q2 implementation is correct exactly as described. For the record, the binding sequence:

1. Edit only `lib/jurisdiction/caJurisdictionMatrix.ts` line 86 (or whatever the actual line number is after the reword — line numbers may drift if the new comment differs in line count). No other Phase 1 file is touched.
2. Verify the LA `notes` field's verbatim content remains byte-identical to the committed source at `f46bebf` post-edit. The reword is to the **comment above** the field, not the field's content. `git show f46bebf:docs/compliance/ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` diff against the LA row's `notes` value must still be zero-character.
3. Re-run all 25 test suites — expect 0 failures (the reword is a comment-only change; no test should change behavior).
4. Re-run `npx tsc --noEmit` — expect clean.
5. Re-run `npm run ci:verify-locked-prose` — **expect PASS this time.** The dangling-source-comment finding should clear because the comment no longer cites an out-of-tree filename. If the guard still fails for any reason, that is a re-escalation, not a re-author of this ruling.
6. Re-run the token scan — expect exactly one occurrence (the LA `notes` cell's verbatim data string, the documented Q2-finalization exemption). The reworded comment must not introduce any new attorney-attribution token.
7. Re-hash the four Phase 1 files. `caJurisdictionMatrix.ts` will have a new sha256; the other three are unchanged from build's pre-finalization status. The PR description's "files shipped" inventory carries the post-reword hash for `caJurisdictionMatrix.ts`.
8. Named `git add` of the four files. Branch → push → PR.
9. PR description carries the five required references from the finalization ruling §3, plus a brief paragraph acknowledging the guard-fail incident and pointing at this ruling as the disposition (so the PR's history line is auditable without needing a sixth required reference in the formal list).

If anything in steps 1–6 surfaces an unexpected outcome, pause and re-escalate. The reword should be mechanical.

---

## §3. Q3 ruling: **YES — commit the determination chain to `docs/compliance/`. (b) Separate PR AFTER the code PR merges, not before.**

Build correctly surfaced this as independent of the A/B choice, and the answer is independent: the determination chain belongs in-tree under the precedent set earlier in this session for request-response pairs (C7a, pkt_s85 reconciliation, pkt_s85 pre-commit, attestation pre-commit). The Phase 1 chain is the same class of artifact and gets the same treatment. **The question is sequencing, not whether.**

### Why sequencing is (b), not (a)

(a) "Before the code PR" would mean front-loading a determination-commit PR ahead of code that is otherwise green and ready. Three problems with that:

1. **It contradicts the principle from Q1.** Q1 ruled that determination commits do not gate code PRs. Picking (a) would resurrect exactly the dependency that Q1's "don't put determination filenames in code" structure exists to prevent.
2. **It would compound this session's serial-PR load.** The source-files PR (matrix + LAHD prompt) is staged. The code PR is ready behind it. Inserting a determination-chain PR between them is one more serial gate on critical work that has already passed three layers of broker review.
3. **The code PR has no in-tree dependency on the determination chain** under Q1. The PR description carries the references; the determination record lives in the broker workspace until the determination-commit PR lands. That is a complete audit trail at the PR-description level. The determination-commit PR adds in-tree completeness; it is not a prerequisite for the code PR's correctness.

(b) "After the code PR merges" is the right ordering. The code PR merges first under the Phase 1 finalization sign-off; the determination-commit PR follows as a documentation-only PR that adds the chain to `docs/compliance/`. No `lib/` or `components/` changes, no manifest changes, no locked-prose changes — clean documentation-only diff through the same three required checks.

(c) "Bundled some other way" is not invoked; (b) is the cleaner answer.

### Why YES at all (the precedent argument)

The session has now established three converging rules that point at "commit the request-response pairs in-tree":

1. **Request-response in-tree precedent** (earlier this session): both halves of a Q+A pair belong in `docs/compliance/` so a future auditor can read the question next to the determination. The Phase 1 chain is four Q+A pairs of exactly that class.
2. **The dangling-reference principle** (packet_test4 audit, attestation evidence pack, this guard-fail itself): if a determination references another determination by name, the referenced determination should be reachable in-tree at the same `main` the citing one ships under. The Phase 1 chain references prior determinations heavily (each ruling cites the ones above it); committing the chain closes those refs.
3. **The source-files PR precedent** (just-staged determination commit for matrix + LAHD prompt): broker-source determinations get committed to `docs/compliance/` ahead of the code that uses them. The Phase 1 chain is the broker-determination-of-broker-determinations layer — it should follow the same in-tree posture, just sequenced later because it does not gate code.

---

## §4. Q4 ruling: **Commit the full Phase 1 chain, plus the source-files PR's own request-response pair if not already committed.**

Not just the finalization pair. The full chain, because committing only the finalization pair leaves the finalization ruling pointing at uncommitted predecessor rulings — which recreates the dangling-reference posture this whole session has ruled against. The audit trail's value is in the chain being whole, not in being half-present.

### The exact file set

Five request-response pairs (ten files), in chain order:

| # | File | Bytes | SHA-256 |
|---|---|---|---|
| 1a | `lahd_city_matrix_implementation_blockers_broker_ruling_request_2026-06-19.md` | (build supplies) | (build supplies) |
| 1b | `lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md` | 25240 | `f27a6b3cf5ce2e0556fad4e0fc97851ec792c7650c4799fe2fdf7594f1370c61` |
| 2a | `lahd_city_matrix_architecture_conflict_broker_ruling_request_2026-06-19.md` | (build supplies) | (build supplies) |
| 2b | `lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md` | 24240 | `2798d3935f030bf9971fd7611b6e3a49f39bb899e6d61c23deba8bbeced01f03` |
| 3a | `lahd_city_matrix_phase1_scoping_broker_ruling_request_2026-06-19.md` | (build supplies) | (build supplies) |
| 3b | `lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md` | 20882 | `42e5d8c3f50fdfde7e44881c6949bcc306be4ee89f66e1fe4137b1403728de29` |
| 4a | `lahd_city_matrix_phase1_finalization_broker_ruling_request_2026-06-19.md` | (build supplies) | (build supplies) |
| 4b | `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` | 17239 | `c325a15f16f4a13fb630ee80d31f57cea89e9c9b17b0b48669b7946b761b4782` |
| 5a | `lahd_city_matrix_phase1_guardfail_broker_ruling_request_2026-06-19.md` | (build supplies) | (build supplies) |
| 5b | `lahd_city_matrix_phase1_guardfail_broker_ruling_response_2026-06-19.md` | (this file — broker supplies post-share) | (this file — broker supplies post-share) |

**Broker action item:** I compute and post the byte count + sha256 for **this file (5b)** in the conversation after I share it (single bash call). Build computes byte count + sha256 for the five request files (1a, 2a, 3a, 4a, 5a) from build's local copies and merges those rows into the table above for the verify-after-copy gate.

### Determination-commit PR plan (filled in)

- **Branch:** `docs/lahd-and-city-matrix-phase-1-determination-chain`
- **Files added to `docs/compliance/`:** the ten files in the table above.
- **Verify-after-copy:** all ten files. Both byte count AND sha256 must match per-file. Zero tolerance. Same `0d64482` 0-byte-placeholder protection that has bound every commit this week.
- **Commit message:**

  ```
  docs(compliance): Phase 1 LAHD/CA-city-matrix determination chain (five request-response pairs)
  
  Adds the broker ruling chain that governed Phase 1 of the LAHD/CA-city-matrix
  workstream, committed in-tree per the session's established request-response
  precedent so future auditors can read each question next to its determination.
  
  Pairs (build-authored request + broker-authored response), in chain order:
  1. implementation_blockers (path remap, serial commit ordering)
  2. architecture_conflict (A1 model, block-vs-render, attribution scope)
  3. phase1_scoping (three confirms, sign-off to open Phase 1 branch)
  4. phase1_finalization (no flag in Phase 1, verbatim-vs-token clarification)
  5. phase1_guardfail (Option A reword, determination-chain commit ruling)
  ```

- **No `lib/`, `components/`, manifest, or locked-prose changes.** Documentation-only diff.
- **Required checks:** the standard three (`verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`). All expected green — the locked-prose guard will now find every previously-dangling reference resolves in-tree, which is the structural payoff of committing the chain.

### Sequencing recap

1. **Now:** build implements Q1/Q2 (reword + re-gate + re-hash) on the Phase 1 code branch. Push, PR, three checks green, merge.
2. **After (1) merges:** build opens the determination-commit branch (`docs/lahd-and-city-matrix-phase-1-determination-chain`), copies the ten files in from build's local source for the request files and from the broker workspace for the response files (via the share_file URLs already issued earlier in this session for files 1b, 2b, 3b, 4b, plus the one for 5b that follows this ruling). Verify-after-copy gate per the table. Push, PR, three checks green, merge.
3. **After (2) merges:** the Phase 1 chain is whole in-tree. The post-Phase-1 attribution reconciliation (`la_rule_modules_attribution_reconciliation_broker_determination_<date>.md`) opens as the next workstream, with its own scoped PR per the architecture ruling §8 (scope extended in the finalization ruling §4).

---

## §5. Build-side checklist

### For the Phase 1 code PR (post-Q1/Q2 reword)

- [ ] [MUST FIX] Reword the marker comment above the LA `notes` field per §1. Token-free, filename-free, points at the PR description as the audit anchor. Build authors phrasing.
- [ ] [MUST FIX] Verify the LA `notes` field's verbatim content remains byte-identical to `f46bebf`'s committed matrix. Diff to confirm zero-character drift on the field itself; only the comment changed.
- [ ] [MUST FIX] Re-run the full local gate: 25 test suites (0 failures), `npx tsc --noEmit` clean, `npm run ci:verify-locked-prose` PASS, token scan exactly one occurrence (the LA `notes` data string).
- [ ] [MUST FIX] Re-hash `caJurisdictionMatrix.ts`. PR-description "files shipped" inventory carries the post-reword hash for that file.
- [ ] [MUST FIX] Branch → named `git add` of the four Phase 1 files → push → PR. Five required references in PR description per finalization ruling §3, plus a brief paragraph acknowledging the guard-fail incident and pointing at this ruling.
- [ ] [MUST FIX] Three required checks green → merge through ruleset.

### For the determination-commit PR (post-code-PR-merge)

- [ ] [MUST FIX] Open `docs/lahd-and-city-matrix-phase-1-determination-chain` branch from post-merge `main`.
- [ ] [MUST FIX] Copy the ten request-response files into `docs/compliance/`. Response files (1b, 2b, 3b, 4b, 5b) sourced from broker workspace via the share_file URLs already issued. Request files (1a, 2a, 3a, 4a, 5a) sourced from build's local copies.
- [ ] [MUST FIX] Run the verify-after-copy gate on all ten files using the table in §4. Build merges the request-file rows into the table from local hashes. Abort the commit if any byte count or hash mismatch.
- [ ] [MUST FIX] Add the `Authored by: Build side (engineering) — escalation request for broker determination. Not a determination.` header line to each request file if not already present in the local copy being committed (per the session's earlier attribution-discipline ruling on request files).
- [ ] [MUST FIX] Named `git add` of exactly the ten files. No `git add .`. Commit with the message in §4 verbatim.
- [ ] [MUST FIX] Branch → PR → three required checks green → merge.
- [ ] [SHOULD FIX] After merge, run `npm run ci:verify-locked-prose` locally on the post-merge `main` once and confirm PASS. Confirms the chain commit didn't accidentally introduce a new dangling reference.

---

## §6. What I will do next (broker-side)

1. **Share this file** to give build the URL needed to copy 5b into the determination-commit PR.
2. **Compute and post 5b's byte count + sha256** (single bash call after share) so build can populate the corresponding row in the verify-after-copy table.
3. **Wait** for the Phase 1 code PR to merge under the Q1/Q2 reword.
4. **Wait** for the determination-commit PR to merge.
5. **Then** open the post-Phase-1 attribution reconciliation workstream per the architecture ruling §8 / finalization ruling §4 — sweeping the four LA rule modules plus the broker-source determinations whose filenames carry attorney-attribution wording that propagates into matrix transcriptions. One scoped PR, named-add commit, through the ruleset.

---

## §7. Sign-off

**Q1 = A (reword). Q2 = confirmed reword + re-gate + re-hash. Q3 = YES, (b) separate PR AFTER the code PR merges. Q4 = full chain, ten files.**

Build proceeds with the Q1/Q2 reword to unblock the Phase 1 code PR, then opens the determination-commit PR after the code PR merges. The pause Build held at the guard fail is the correct posture; the resolution is mechanical from here.

---

## §8. Authoring discipline carried forward

This ruling is itself an in-chain determination — the fifth in the Phase 1 chain (and the first whose committing-itself recursion is structurally explicit). The Q3/Q4 ruling addresses that recursion directly: this ruling and its paired request commit to `docs/compliance/` in the determination-commit PR, closing the recursion. No determination in this chain remains uncommitted after step (2) of §6 above.

The Q1 cross-rule clarification carried forward from the finalization ruling §2 ("no-token rule applies to build-authored text only") is unaffected by this ruling. Today's ruling adds a parallel principle: **filename citations of determination files do not belong in code comments**. The audit anchor for which determination governs a piece of code is the PR description and the determination record, not in-code comments. Together, the two principles bound where determination references appear: PR descriptions yes, determination files yes, code comments no, manifest entries via the existing `// Source:` pattern only for locked-prose constants anchored to in-tree source determinations.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
