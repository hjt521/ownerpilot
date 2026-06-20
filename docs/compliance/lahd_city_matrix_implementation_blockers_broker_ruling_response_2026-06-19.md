# LAHD + CA city-matrix implementation — blockers & spec-vs-repo reconciliation ruling

**File:** `lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** [`lahd_city_matrix_implementation_blockers_broker_ruling_request_2026-06-19.md`](lahd_city_matrix_implementation_blockers_broker_ruling_request_2026-06-19.md) (build-side authored, 2026-06-19)
**Lineage:**
- [`claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md`](claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md) — the implementation prompt under review
- [`lahd_filing_prompt_copy_broker_determination_2026-06-18.md`](lahd_filing_prompt_copy_broker_determination_2026-06-18.md) — LAHD source determination (workspace-only at time of this ruling)
- [`ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`](ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md) — city-matrix source determination (workspace-only at time of this ruling)
- [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — operating authority
- [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) — guard design and hard-fail policy
- [`locked_prose_guard_live_attestation_2026-06-18.md`](locked_prose_guard_live_attestation_2026-06-18.md) — guard live as of `0dbeab4`
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

Build side correctly stopped before authoring code or prose against an assumed tree. The escalation is the right move — exactly the "spec assumes architecture not in the codebase" failure mode the session handoff flagged, and the same workspace-vs-repo discipline carried forward from [`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) §8.5. This ruling resolves four blockers, one flag, and two phasing questions. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. BLOCKING-1 — Source-file commit plan

### Ruling (1a): The two source files are committed to `docs/compliance/` in a **separate broker-only PR**, landing **before** build starts any phase of this workstream.

**Build's first PR is NOT scaffold-only-while-source-lands-in-parallel.** That ordering creates a window where Phase 1 logic could land referencing manifest entries that don't yet exist or that point at files that don't yet exist — which is the same dangling-reference failure mode this session has ruled against three times (packet_test4, request/response in-tree ruling, attestation evidence pack). The sequence is strictly serial:

1. **Broker PR — source files only.** Two files added to `docs/compliance/`:
   - `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` — 13,876 bytes, sha256 `8a54e770b713b3eaae9c0787cbefc5416da37284fe5435824c08b03f96b3522a`.
   - `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` — 33,840 bytes, sha256 `d82efe450c4837cfabdd2ed7ecf8626ddd20772f312b8f9ff6f35e938a5966fc`.
   - Both files already exist in my workspace at the byte counts and hashes above. They have been authored, not yet committed.
   - Verify-after-copy table is binding: both byte count AND hash must match post-copy in `docs/compliance/`. Zero tolerance.
   - PR title: `docs(compliance): broker source determinations — LAHD filing prompt copy + CA city-matrix (2026-06-18)`.
   - Branch → PR → three required checks green → merge through the new ruleset, same motion as the locked-prose attestation PR.

2. **Build PR — implementation.** Begins only after the source-files PR is merged to `main`. Build's Phase 1 starts then, with the two source files at known committed hashes that the new manifest entries reference.

This serial ordering keeps the audit trail clean: at no point does a build-authored file in `lib/` or `components/` reference a manifest entry sourced from a determination that is not in-tree at that exact commit's `main`.

**Build action item:** wait for the broker source-files PR to merge. Build does not open the implementation branch until then.

### Ruling (1b): Confirmed. **Build authors zero prose for these strings — no skeleton, no placeholder, no Lorem-ipsum, no "TBD: pending broker," no comment-stub-with-empty-body.**

The prompt's §0 and §1 rule 1 are categorical. Build's reading is correct and is hereby confirmed in writing. The only build-side latitude on prose-bearing fields is the `SOURCE_PENDING` sentinel addressed in §6 below — and that latitude is **withdrawn for this workstream** because §1a now commits the source files before Phase 1 starts, so `SOURCE_PENDING` is unnecessary.

---

## §2. BLOCKING-2 — Spec-to-repo remap

### Ruling (2a): **Approve the remap column wholesale.** Every row of build's proposed remap is correct.

The implementation prompt was authored at a level of abstraction that did not depend on the repo's actual file layout. Build's row-by-row reconciliation against `47d593b` is what the prompt would have produced if it had been written against the real tree. Specifically:

| Prompt assumption | Approved remap |
|---|---|
| `src/compliance/lockedProse.ts` (central) | Per-feature file under `lib/`, same pattern as `lib/flow/bankDepositDisclosureCopy.ts` with a `// Source:` comment |
| Nested `{"tierB": {...}}` manifest shape | Flat `entries[]` array — four new entries appended |
| `src/compliance/caJurisdictionMatrix.ts` | `lib/jurisdiction/caJurisdictionMatrix.ts` |
| `src/compliance/resolveJurisdiction.ts` | See §4 — extend `lib/jurisdiction/detectJurisdiction.ts`, do not add a competing resolver |
| `src/components/wizard/SupplementalDutyBlock.tsx` | `components/supplemental-duty-block.tsx` (kebab-case per repo convention) |
| `src/artifacts/coverSheet.ts` | `lib/produce/coverSheet.ts` |
| `config/featureFlags.ts` | Env-var flag(s) (`LAHD_FILING_PROMPT_ENABLED`, default off) — no `config/` directory introduced |
| "Extend `verify_locked_prose.ts`" | No guard code change required. New entries are additional rows in `entries[]`; guard already verifies that shape |

**The implementation prompt is hereby superseded on these file paths by this ruling.** Build references this §2 in the implementation PR description as the authoritative remap, not the prompt's `src/`-rooted paths. The prompt itself does not need to be re-authored — that would be a churn edit. The supersession is recorded here.

### Ruling (2b): Confirmed. **LAHD and city-matrix strings follow the existing `bankDepositDisclosureCopy.ts` pattern exactly.**

Full verbatim string in the manifest entry, full verbatim string in the per-feature `.ts` file constant, `// Source: <determination_file>.md` comment above each constant, SHA-256 computed against the `.ts` file's bytes (not the determination file's bytes — the guard verifies what ships, which is the `.ts` constant). The three bank-deposit entries are the reference implementation; the LAHD/city entries are structurally identical, just with different source determinations and different verbatim strings.

---

## §3. BLOCKING-3 — Geocode contract

### Ruling (3a): **Build first completes the read-only survey in §3b, then surfaces the answer.** I cannot rule on (3a) before build has read the relevant files.

The honest answer is: I don't know from the workspace alone whether `detectJurisdiction.ts` or any downstream Places Details call yields state + city + confidence in a way `resolveJurisdiction` could consume. Build's read of `places-autocomplete.tsx` saw only `{ placeId, text }` at the autocomplete surface; that is consistent with either (i) a Details call existing downstream that provides the rest, or (ii) no such call existing yet. Both are plausible from the visible evidence. Asserting either from this side without the file contents would be the workspace-vs-repo discipline failure mode in reverse — me ruling against an imagined codebase.

**Build action:** complete §3b first, then either (a) confirm an existing path resolves address → CA-state + incorporated-city + confidence, with a pointer to the function and file, or (b) report that no such path exists and the Places Details + key/billing dependency is itself a prerequisite. Re-escalate with the survey findings before any code is written; that re-escalation is a one-paragraph follow-up, not a fresh request packet.

### Ruling (3b): **GRANTED. Read-only survey of `lib/jurisdiction/*` and the full `components/places-autocomplete.tsx`, scope as listed.**

Read-only. No edits. The four files build named (`detectJurisdiction.ts`, `laOverlay.ts`, `laRtcRules.ts`, `laCityCalendar.ts`, plus their tests) plus `places-autocomplete.tsx`. If the survey surfaces additional adjacent files build needs to trace contracts through (e.g., a `lib/places/` or `lib/geocode/` module if one exists), build may read those too under the same read-only grant — extension by transitive dependency, not by scope creep. Build does not need to come back for a fresh grant on each adjacent file the trace pulls in.

The survey output is a short written summary in the re-escalation paragraph: which files exist, what they export, whether a state+city+confidence path is reachable, and where. No file contents pasted into the re-escalation; just the contract description.

---

## §4. BLOCKING-4 — Pre-existing `lib/jurisdiction/` and stated-gap contradiction

### Ruling (4a): **EXTEND `detectJurisdiction.ts`. Do not stand up a competing resolver.**

The principle: one jurisdiction resolver per repo. Adding a parallel `resolveJurisdiction.ts` alongside `detectJurisdiction.ts` creates two competing sources of truth on a question — "what jurisdiction governs this address?" — that must have exactly one answer per address. That is the same single-source-of-truth principle that drives the locked-prose-in-manifest pattern.

**Build action:**

1. Read `detectJurisdiction.ts` (and `.test.ts`) under the §3b survey grant.
2. Propose the extension shape in the re-escalation. Two acceptable shapes:
   - **(i) Extend the existing function** with the matrix lookup as an additional case (preferred if `detectJurisdiction` already returns a jurisdiction id or shape the matrix can key on).
   - **(ii) Layer a thin wrapper** that calls `detectJurisdiction` then consults `caJurisdictionMatrix` for the supplemental-documentation row. The wrapper is the public entry point used by `SupplementalDutyBlock` and the cover sheet; `detectJurisdiction` remains the single jurisdiction-id source.
3. I rule on (i) vs (ii) in the re-escalation once build has seen the function's actual signature and return shape.

If `detectJurisdiction` proves architecturally unsuited to either extension shape (e.g., it returns nothing the matrix can key on, or its scope is narrower than CA-wide), build flags that in the re-escalation and I will rule on supersession as a separate, larger change.

### Ruling (4b): **Build surfaces the answer in the §3b survey re-escalation.** I cannot rule whether `laCityCalendar.ts` satisfies the §10 gap-1 requirement without reading the file.

The contradiction build flagged is real: the implementation prompt's §10 gap 1 and §11 read as if the LA business-day calendar is unlanded, but a 6,349-byte `laCityCalendar.ts` plus tests exists on disk dated Jun 1. Two equally plausible explanations:

1. The prompt's §10 gap list was authored from a stale view of the repo, and `laCityCalendar.ts` already implements what the §5.1 "do not compute the deadline date" instruction was guarding against. In that case, §10 gap 1 is closed and §5.1's instruction is **lifted**.
2. `laCityCalendar.ts` is a partial implementation — e.g., it has the calendar data structures but no `computeFilingDeadline(noticeDate)` function, or it lacks tested holiday-rollover behavior, or it's behind an unset env flag. In that case, §10 gap 1 remains open and §5.1's "do not compute the deadline date" still binds.

**Build action:** under the §3b survey grant, read `laCityCalendar.ts` and `laCityCalendar.test.ts`. In the re-escalation, report (i) the exported surface, (ii) whether a `computeFilingDeadline(...)` (or equivalent) function exists and is tested with at least weekend-and-holiday rollover coverage, (iii) whether it's gated behind a flag that defaults off. I will then rule whether §10 gap 1 is closed (and §5.1 lifted) or remains open.

Until I rule on (4b), **assume §5.1 still binds.** That is the fail-closed default: do not display a computed filing-deadline date in any UI shipped before this ruling closes.

---

## §5. FLAG-§0 — Attorney-attribution tokens

### Ruling (5a): **Confirmed. New artifacts under this workstream carry zero attorney-attribution tokens.**

Build's default reading is correct and is hereby confirmed: no "attorney / counsel / JD / SBN / legal advice / law firm" tokens in code, comments, commits, PR descriptions, tests, fixtures, generated artifacts, file names build creates, or PR-template framing. Build is correct to strip the token from any auto-generated PR-template framing — that is a [MUST FIX § 1] on every PR build opens under this workstream, not a one-time scrub.

Two specific applications:

1. **File names build creates** carry no attribution tokens — use `broker_determination`, `broker_ruling_response`, `broker_compliance_review`, or `broker_compliance_attestation` patterns, consistent with the file names already established in this session.
2. **Manifest entry `source_determination` field** points at the broker source files (which carry `broker_determination` in their filenames per §1). No transitive attribution leakage.

### Ruling (5b): **Historical filenames are left as-is. Separate determination if I revisit it later; not now.**

Build correctly notes the tension between the prompt's §1/§11 absolutes and the existing `docs/compliance/` filenames carrying tokens (`countersign`, `signoff`, `ruling`, `review` variants tied to historical attorney-attribution framing). I am explicitly **not** ruling those historical names need renaming, archiving, or any other touch — for three reasons:

1. The historical names are part of the audit trail. Renaming them post-hoc breaks the git history's grep-ability against earlier session references in this workspace.
2. The binding posture-correction has already been made: the [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) and the workspace-attribution-inventory ruling earlier in this session established that all determinations are broker-prepared work product regardless of historical filename framing. The filenames are stale prose, not operative authority.
3. Mass-renaming in `docs/compliance/` would mean every `// Source:` comment in `lib/` referencing those files would need to be updated in the same commit, which would mean every manifest entry's `source_determination` field would need to be updated, which would mean every locked-prose `.ts` file would need its `// Source:` comment updated, which would mean the guard would need to verify the new paths — a sweeping change that should not be entangled with the LAHD/city-matrix workstream.

If the historical filenames need reconciliation later, it gets its own broker determination and its own scoped PR. Out of scope here.

---

## §6. Phasing — §6a and §6b

### Ruling (6a): **Approve the phasing with one modification.**

The modification is that **Phase 0 is unnecessary as a standalone phase now that §1a commits the source files before build starts.** Phase 0's only deliverable was "this packet's rulings applied" plus the read-only survey; the rulings are applied by *this file*, and the read-only survey is now an action item between this ruling and the re-escalation (§3, §4). There's no PR for Phase 0. Build executes the survey, re-escalates with findings, I rule on the remaining open items, then build opens the Phase 1 PR.

Phases 1, 2, 3 stand as written, with the §6b modification below.

### Ruling (6b): **Phase 1 does NOT use `SOURCE_PENDING` placeholders. Phase 1 starts after the §1a source-files PR is merged.**

Build's question (6b) presupposed Phase 1 might land before the source files. Under §1a's ruling, that ordering is closed. The source-files PR merges first; Phase 1's manifest entries and per-feature `.ts` constants reference the committed source determinations from the moment Phase 1 opens its PR. No `SOURCE_PENDING` sentinel, no "do not render" guard branch, no two-step ratification.

**Why I closed this latitude:** `SOURCE_PENDING` is a real escape hatch for cases where the structural work is genuinely separable from the prose. It is not the right call here, because the structural work (matrix shape, jurisdiction routing, resolver extension) is so tightly coupled to the row contents (which jurisdictions are in, which are `"pending"`, what each row's `promptKey` routes to) that the matrix's tests cannot be meaningfully authored until the source file's row list is fixed. Splitting structure from prose would let Phase 1 land a matrix that tests against one row set, then Phase 2 mutates the row set when the source lands — the tests would either lock in a wrong row set or be vacuous. Better to wait one PR's worth of merge time.

**Build action item for Phase 1, restated under the no-SOURCE_PENDING rule:**

- Phase 1 PR depends on §1a merged + §3a/§4a re-escalation rulings issued.
- Phase 1 PR contents: `caJurisdictionMatrix.ts` with full verbatim row contents sourced from the committed matrix determination, `detectJurisdiction` extension per §4a, env flag `LAHD_FILING_PROMPT_ENABLED` (and equivalent for the city matrix) defaulting off, full test coverage including the §4/§8.1 acceptance-address tests. Behind the flag.
- Phase 2 PR: manifest entries + per-feature locked-prose `.ts` file(s) + `SupplementalDutyBlock` + cover sheet. The locked-prose `.ts` files in Phase 2 are the constants that the guard verifies; the matrix's row contents in Phase 1 are not locked-prose constants in the guard's sense, but they are still verbatim-from-source and reviewed under this determination.
- Phase 3 PR: fixtures/snapshots + gap enumeration in PR description. Guard extension confirmed-no-op per §2a (the existing flat `entries[]` shape is already what the guard verifies).

---

## §7. Re-escalation expectations

Between this ruling and Phase 1 opening, build does one survey and one re-escalation. The re-escalation is a short follow-up message in this thread (not a fresh request packet), containing:

1. **§3a survey result:** does a path exist from address → CA-state + incorporated-city + confidence? If yes, point at the function/file. If no, name the missing dependency.
2. **§4a contract proposal:** based on `detectJurisdiction.ts`'s signature and return shape, propose extend-in-place (i) vs thin-wrapper (ii). One paragraph each.
3. **§4b finding:** does `laCityCalendar.ts` satisfy §10 gap-1 (i.e., is `computeFilingDeadline` or equivalent exported and tested with weekend/holiday rollover)? Yes/no with two-line evidence.

No file contents pasted. Just the contract descriptions and the yes/no findings. I rule on §3a, §4a, and §4b in a one-paragraph follow-up determination after build's re-escalation — light-touch, in-thread, not a fresh determination file unless something material surfaces that warrants one.

The §1a broker source-files PR can be staged in parallel with build's survey. There's no dependency the other way: the survey is a read-only operation on the existing repo state and does not need the source-files PR to have landed.

---

## §8. Build-side checklist

- [ ] [MUST FIX] Wait for the broker source-files PR (§1a) to merge to `main` before opening any implementation branch.
- [ ] [MUST FIX] Complete the §3b read-only survey: `lib/jurisdiction/detectJurisdiction.ts` (+ `.test.ts`), `laOverlay.ts` (+ `.test.ts`), `laRtcRules.ts`, `laCityCalendar.ts` (+ `.test.ts`), and the full `components/places-autocomplete.tsx`. Read-only; no edits.
- [ ] [MUST FIX] Re-escalate in-thread with the three findings in §7 (§3a, §4a, §4b). Short paragraph, no pasted file contents. Wait for the follow-up ruling before opening Phase 1.
- [ ] [MUST FIX] Until §4b is ruled, **assume §5.1 still binds** — do not display a computed filing-deadline date in any UI shipped before that ruling.
- [ ] [MUST FIX] Treat the §2 remap as the authoritative file-path mapping for this workstream. Reference this §2 in the Phase 1 PR description as the supersession of the implementation prompt's `src/`-rooted paths.
- [ ] [MUST FIX] Phase 1 PR uses verbatim row contents from the committed matrix source determination, not `SOURCE_PENDING` placeholders (§6b).
- [ ] [MUST FIX] Strip attorney-attribution tokens from auto-generated PR-template framing on every PR opened under this workstream (§5a). Verify before pushing.
- [ ] [SHOULD FIX] When Phase 1 lands, run `npm run ci:verify-locked-prose` locally on the branch before push to confirm the existing three locked constants still pass alongside any new entries added in Phase 2.
- [ ] [CONSIDER] If `detectJurisdiction.ts` proves architecturally unsuited to extension (per §4a), surface that in the re-escalation; supersession is a larger change and will be scoped separately.

---

## §9. Source-files PR commit details (for the broker-only PR)

I will open the source-files PR myself. For the record, the PR's exact contents:

**Files added to `docs/compliance/`:**

| File | Bytes | SHA-256 |
|---|---|---|
| `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` | 13876 | `8a54e770b713b3eaae9c0787cbefc5416da37284fe5435824c08b03f96b3522a` |
| `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` | 33840 | `d82efe450c4837cfabdd2ed7ecf8626ddd20772f312b8f9ff6f35e938a5966fc` |

**Verify-after-copy:** both byte count AND hash must match post-copy. Zero tolerance. The `0d64482` 0-byte placeholder signature applies — both checks required, neither alone sufficient.

**Commit message:**

```
docs(compliance): broker source determinations — LAHD filing prompt copy + CA city-matrix (2026-06-18)

Adds:
- lahd_filing_prompt_copy_broker_determination_2026-06-18.md (broker, source for LAHD locked constants)
- ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md (broker, source for caJurisdictionMatrix row contents)

These are the broker source determinations referenced by the LAHD + CA city-matrix
implementation workstream. They are committed standalone, ahead of any
implementation PR, so that the implementation can reference them at committed
hashes from PR #1 onward.
```

**Branch:** `docs/lahd-and-city-matrix-source-determinations`
**Required checks:** `verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck` (all expected green — no `lib/` or `components/` changes, no manifest changes, no locked-constant changes; these are documentation-only adds).

This PR ships separately from the implementation PR. Build does not author the source-files PR; it waits for the merge notification before opening the implementation branch.

---

## §10. Authoring discipline carried forward

This ruling was authored against a fresh workspace `ls` and `sha256sum` of the two source files (which confirmed they exist in workspace at the byte counts and hashes in §9), against build side's disk verification of the repo state at `47d593b` (which I rely on per the workspace-vs-repo discipline — I cannot see the committed repo), and against the implementation prompt at `claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md` in workspace.

Build's disk verification of the repo at `47d593b` is accepted as the ground truth for the repo state. If any of build's claims about `47d593b` later prove inaccurate (e.g., the source files turn out to already be in `docs/compliance/`, or the file paths in §2 turn out to differ), that is a re-escalation, not a re-author of this ruling. The rulings in §§1–6 hold against the repo state as build reported it.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
