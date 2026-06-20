# LAHD/city-matrix Phase 1 scoping — broker ruling

**File:** `lahd_city_matrix_phase1_scoping_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** [`lahd_city_matrix_phase1_scoping_broker_ruling_request_2026-06-19.md`](lahd_city_matrix_phase1_scoping_broker_ruling_request_2026-06-19.md) (build-side authored, 2026-06-19)
**Governing prior rulings:**
- [`lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md) — path remap (§2), serial commit ordering (§1a)
- [`lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md) — A1 model, block-vs-render (§2), attribution (§3), geocode (§4)
**Source-of-truth files (committed at `f46bebf`):**
- [`lahd_filing_prompt_copy_broker_determination_2026-06-18.md`](lahd_filing_prompt_copy_broker_determination_2026-06-18.md) — sha256 `8a54e770b713b3eaae9c0787cbefc5416da37284fe5435824c08b03f96b3522a`
- [`ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`](ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md) — sha256 `d82efe450c4837cfabdd2ed7ecf8626ddd20772f312b8f9ff6f35e938a5966fc`
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

Three pre-code confirms from build: (1) hard-block-list precedence over matrix `LIVE` state, (2) DEFAULT row encoding strategy, (3) interim block-routed-copy disposition under Phase-1-no-UI. All three are correctly framed and resolvable without re-opening prior rulings. The scoping note's §1 matrix-shape table, §4 row-shape proposal, §4 wrapper proposal, and §6 "what build will NOT do" list are correct as stated and approved without modification. This ruling sign-offs Phase 1 to open. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. CONFIRM-1: **YES — `detectJurisdiction.HARD_BLOCK_CITIES` wins over a matrix `LIVE` state until a per-city graduation determination.**

Build's read is correct. SF and Santa Monica ship dark in Phase 1 exactly like the REQUIRED-BUT-PENDING cities: matrix row present, branch state `LIVE` recorded as the legal-research finding, runtime path routes through the wrapper's `BLOCK_OVERLAY_CITY` branch because `detectJurisdiction` still has them in `HARD_BLOCK_CITIES`. No edit to `detectJurisdiction.ts` (§3 D1 part 2 of the architecture ruling binds).

### Why the matrix's `LIVE` does not authorize production today

The matrix's `Branch state: LIVE` records two distinct legal findings:

1. **Statewide-only carve-out** (e.g., Long Beach, Glendale, Sacramento, the §2.23 DEFAULT set): no local ordinance imposes supplemental-filing duties beyond CCP § 1161. Production authorized by the existing statewide flow.
2. **No-filing finding inside an ordinance city** (e.g., Santa Monica's "no filing for nonpayment," SF's Form 1007 attach): a local ordinance exists, but for the 3-day-pay-or-quit scope this product produces, no supplemental filing is required.

These are **two different `LIVE` semantics**, and the second one — the ordinance-city no-filing finding — is exactly the case that needs production-authorization-via-broker-determination before runtime can flip from blocked to live. The legal research is done; the operational authorization is the separate step. Until that operational determination lands per city, `detectJurisdiction`'s hard-block is the correct fail-closed default.

### Operational rule for Phase 1

The wrapper logic is unchanged from §1 of the architecture ruling:

1. Call `detectJurisdiction` first.
2. On `BLOCK_OVERLAY_CITY` → return a block-routed typed value. **No matrix lookup.** The matrix row may contain branch state `LIVE`, but the wrapper never reads it on this branch — `detectJurisdiction` is the authority on whether the jurisdiction is production-authorized.
3. On `NEEDS_CONFIRMATION` → return a confirmation-required typed value. No matrix lookup.
4. On `NO_KNOWN_OVERLAY` → consult the matrix for the DEFAULT row, return statewide-only routing.

The matrix `LIVE` state on SF and Santa Monica is **data that ships dark**, the same way the LAHD `REQUIRED-BUT-PENDING` row ships dark behind `isLaProductionUnblocked()`. When per-city graduation determinations later authorize production for SF or Santa Monica, the operational change is twofold and minimal: (a) remove the city from `detectJurisdiction.HARD_BLOCK_CITIES`, (b) ensure the matrix row's `LIVE` and verbatim filing-cell contents are still byte-current. The matrix data is already present, so the graduation PR is a small structural change to one file plus the per-city graduation determination itself.

### Tests that bind under CONFIRM-1

Phase 1 acceptance tests assert, for every city in `HARD_BLOCK_CITIES`:

- `resolveSupplementalDuty(address)` returns `{ route: 'blocked', reason: 'jurisdiction-not-yet-supported' }` (typed value per CONFIRM-3 below).
- The matrix row's `branchState` is **whatever the committed matrix says** (`LIVE` for SF/Santa Monica, `REQUIRED_BUT_PENDING` for Oakland/Berkeley/San Jose/West Hollywood) — verified by a separate test that the matrix data is byte-current, not by an assertion that the branch state is `BLOCK`. **The wrapper output and the matrix row's branch state are independently verified; the test suite never asserts they agree, because they shouldn't.**

That separation is the test-side encoding of "matrix data is legal research; wrapper output is operational authorization." Both are checked; neither is conflated with the other.

---

## §2. CONFIRM-2: **YES — encode §2.23 as named rows pointing at DEFAULT. Single-DEFAULT-with-named-cities-in-a-comment is rejected.**

Build's preference is correct and is hereby ruled in. Three reasons, ranked by importance:

1. **Single-PR graduation.** When a future broker citation pull surfaces a local ordinance for, say, Culver City, the graduation PR is one row's branch-state flip plus the row's filled-in content cells. No risk of the next author missing that Culver City was hiding in a comment instead of being a row. The compliance record at the row level matches the determination at the city level.

2. **Snapshot-test legibility.** The committed matrix lists nine named cities in §2.23 (Culver City, Pomona, Alameda, Fremont, Maywood, Commerce, MV-MHRSO, Wheatland, Altadena). A snapshot test that asserts the full row list against the committed source is byte-checkable when each city is a row. A single-DEFAULT-with-comment encoding makes that snapshot vacuous on the §2.23 set.

3. **Altadena routing.** Altadena (unincorporated LA County) is explicitly **`REQUIRED-BUT-PENDING`** per the matrix's §2.23 + §6, not statewide-only. The single-DEFAULT encoding would either (a) lose the Altadena distinction entirely or (b) force a special-case branch in code to override DEFAULT for Altadena — both worse than just giving Altadena its own row with the correct branch state.

### Concrete encoding rule

§2.23 produces ten rows in `caJurisdictionMatrix.ts`:

- **`ca-default-statewide`** — synthetic DEFAULT row, `branchState: 'LIVE'`, `supplementalFilingRequired: false`, CCP § 1161-only routing. This is what the wrapper returns from the `NO_KNOWN_OVERLAY` branch of `detectJurisdiction`.
- **Eight named statewide-only rows** (Culver City, Pomona, Alameda, Fremont, Maywood, Commerce, MV-MHRSO, Wheatland), each with `branchState: 'LIVE'`, `supplementalFilingRequired: false`, and a `pointsAtDefault: true` flag (or equivalent — name to be set by build, semantics: "this row resolves to the same routing as DEFAULT, but is listed explicitly so the matrix data byte-matches the committed source and graduation can target one city at a time"). The `notes` cell carries any committed-source qualifier verbatim (e.g., the mobile-home-only carve-out for Healdsburg-class cities if any of these have one).
- **`altadena-unincorporated-la-county`** — `branchState: 'REQUIRED_BUT_PENDING'`, routes pending, not DEFAULT.

So §2.23 produces ten rows: 1 DEFAULT + 8 statewide-only named cities + 1 Altadena pending. Plus the 22 rows from §§2.1–2.22 (since §2.2 SF and §2.13 Beverly Hills are split-state rows encoded as one row each per build's §4 proposal, with the off-scope state captured in `notes`). **Total: 32 rows in `caJurisdictionMatrix.ts`.** A snapshot test asserts the row count and the per-row `(jurisdictionId, displayName, branchState)` tuple set against the committed source.

The MV-MHRSO entry deserves a one-line clarification in `notes` — it is the Mountain View Manufactured-Home Rent Stabilization Ordinance scope, separate from the §2.4 Mountain View entry which is the general residential rent ordinance. Build encodes both as separate rows, distinct `jurisdictionId` slugs. If that distinction is not preserved in the row list, surface it in the PR description for me to confirm; do not collapse them.

---

## §3. CONFIRM-3: **YES — Phase 1 wrapper returns a typed route with no user-facing message string. Block-copy authoring deferred to Phase 2.**

Build's proposal is correct. Approved exactly as proposed:

```ts
// Phase 1 wrapper return on the blocked branch:
{ route: 'blocked', reason: 'jurisdiction-not-yet-supported' }
```

### Why this is the right deferral

The architecture ruling §3 D1 part 2's exception (broker-authored substitute string replacing `detectJurisdiction`'s attorney-laden block message in the UI surface) is a UI-surface concern. Phase 1 ships **zero UI**. There is no UI surface that consumes the block-routed value in Phase 1; the wrapper is exercised only by tests. Authoring a user-facing string now to satisfy a UI surface that doesn't exist yet is premature work that would either (a) sit unused in `lib/` waiting for Phase 2 to wire it up — adding to the locked-prose verification surface for no operational gain — or (b) require a re-author when Phase 2's actual UI shape clarifies what the string needs to do (modal? inline banner? form-field error? full-page route?).

The typed-route approach lets Phase 1 lock in the structural contract (wrapper returns a discriminated union with `route` and `reason` fields) without committing to any particular wording. Phase 2 introduces the UI surface, surfaces the actual rendering context, and **at that point** I author either an addendum to the LAHD source determination or a small standalone block-copy source determination, whichever build's Phase 2 PR description requests.

### Constraint on the reason vocabulary

The `reason` field's value space is **finite and broker-authored**. The Phase 1 vocabulary I authorize today:

- `'jurisdiction-not-yet-supported'` — for `BLOCK_OVERLAY_CITY` returns from `detectJurisdiction` (the SF/Santa Monica/Oakland/Berkeley/San Jose/West Hollywood case).
- `'jurisdiction-confirmation-required'` — for `NEEDS_CONFIRMATION` returns.

These two strings are locked. Any third value build needs (e.g., for an edge case the survey didn't surface) is a re-escalation. No `'la-production-blocked'` or similar Phase-1-only differentiation between LA-pending and SF-LIVE-but-blocked; both return `'jurisdiction-not-yet-supported'`. UI differentiation, if any, happens in Phase 2 from the matrix row's `branchState`, not from the `reason` field.

The two strings are **not locked-prose constants in the guard's sense** — they are typed-value enum-style literals, not user-facing legal copy. They do not need manifest entries or `// Source:` comments. The guard's locked-prose verification surface is unaffected.

---

## §4. Approvals on the rest of the scoping note (no changes)

The following items in build's scoping note are correct as stated and approved without modification — recording them here so the Phase 1 PR can reference this ruling as a single sign-off rather than tracing back through three separate ones.

### §1 matrix shape — `Branch state` is the governing field

Approved. The TypeScript enum `type BranchState = 'LIVE' | 'REQUIRED_BUT_PENDING' | 'MONITOR'` is the committed-source vocabulary, supersedes the implementation prompt's `promptKey`/`citationPullStatus` invented vocabulary, and binds going forward. The 23-row table build transcribed from §§2.1–§2.23 is the correct row list.

### §4 row shape — `JurisdictionOverlayRow` interface

Approved. Field set is correct. The `supplementalFilingRequired: boolean` derivation from the `Post-service filing` cell is the right runtime-routing shortcut; the verbatim cell content is preserved alongside the derived boolean so that the matrix data and the routing both originate from the committed-source cell.

One operational refinement on the split-state rows (SF and Beverly Hills):

- **SF (§2.2):** `branchState: 'LIVE'`, primary cell content describes Form 1007 attach. The `MONITOR` sub-state (File #251216) is encoded **as a verbatim entry in `notes`** with no separate runtime branch. SF's matrix `LIVE` is the 3-day-pay-or-quit-scope finding; the MONITOR sub-state is forward-tracking for a separate workstream if File #251216 ever takes effect.
- **Beverly Hills (§2.13):** `branchState: 'LIVE'`, primary cell content describes the 3-day pay-or-quit scope. The `REQUIRED-BUT-PENDING` sub-state (90-day flow) is encoded **as a verbatim entry in `notes`** with no separate runtime branch. The 90-day flow is outside this product's scope.

Both split-state rows ship as single rows. No multi-row-per-jurisdiction shape. If a future workstream needs the MONITOR or 90-day-flow sub-states to participate in runtime routing, that is a separate ruling.

### §4 wrapper — `resolveSupplementalDuty.ts` thin wrapper (shape ii)

Approved. The fail-closed throw on unconfirmed addresses (§1 item 4 of the architecture ruling) is the right matrix-side analogue of `getVerifiedCityHolidaySet`'s throw on unverified data. Same fail-closed posture, end-to-end.

### §4 env flag — `LAHD_FILING_PROMPT_ENABLED`

Approved. Declared but gates nothing visible in Phase 1. Retained as the per-feature kill switch per the architecture ruling §6.

### §4 tests — assertion set

Approved as stated, with the CONFIRM-1 refinement above (wrapper output and matrix branch state independently verified, never asserted equal).

### §4 PR description — three required references

Approved. The Phase 1 PR description includes:

1. Blockers-§2 path-remap supersession reference.
2. Architecture-§2 block-vs-render supersession reference.
3. Phase-1-§5 gap-list reconciliation subsection mapping prompt §10 / matrix §6 open items to `laRtcRules.ts`'s three dep flags.

Plus a reference to **this ruling** as the Phase 1 sign-off, listing CONFIRM-1, CONFIRM-2, CONFIRM-3 dispositions with one-line summaries.

### §6 "what build will NOT do" — all confirmed

Approved. The six items are binding constraints on Phase 1. No matrix-row content authored by build (all transcribed verbatim from `f46bebf`). No LA rule module edits. No UI rendered. No SF Ord. 18-22 or File #251216 implementation (matrix `MONITOR` sub-states ship as data only, never a render path). No filing-deadline computation (§5.1 of the implementation prompt binds; `laCityCalendar` stays `verified: false`). No attorney tokens anywhere.

---

## §5. Build-side checklist for the Phase 1 PR

- [ ] [MUST FIX] Wrapper output for `HARD_BLOCK_CITIES` returns `{ route: 'blocked', reason: 'jurisdiction-not-yet-supported' }` regardless of matrix `branchState`. Independent of matrix data (§1).
- [ ] [MUST FIX] §2.23 encoded as ten named rows (1 DEFAULT + 8 statewide-only + 1 Altadena pending). Snapshot test asserts the row list against the committed source (§2).
- [ ] [MUST FIX] MV-MHRSO and Mountain View encoded as separate rows with distinct `jurisdictionId` slugs (§2 closing paragraph).
- [ ] [MUST FIX] Wrapper return is a typed discriminated union with `route` and `reason` fields. Phase 1 `reason` vocabulary is exactly two values: `'jurisdiction-not-yet-supported'` and `'jurisdiction-confirmation-required'` (§3). Any third value is a re-escalation.
- [ ] [MUST FIX] SF and Beverly Hills encoded as single rows; sub-states (`MONITOR` File #251216, `REQUIRED-BUT-PENDING` 90-day flow) live in verbatim `notes`, not in separate runtime branches (§4 split-state refinement).
- [ ] [MUST FIX] All matrix row content fields transcribed **verbatim** from the committed source at `f46bebf`. No paraphrasing, no abbreviation, no normalization of whitespace inside cell content. Snapshot or equivalent byte-check covers each `postServiceFiling` and `notes` cell.
- [ ] [MUST FIX] Wrapper throws (or returns a typed error) on invocation against an address that has not gone through `detectJurisdiction`'s confirmation flow (§1 item 4 of the architecture ruling).
- [ ] [MUST FIX] Phase 1 PR description includes the four references listed in §4 above (path-remap, block-vs-render, gap-list reconciliation, this Phase 1 sign-off).
- [ ] [MUST FIX] Zero attorney tokens in code/comments/tests/PR-template framing/commit messages.
- [ ] [MUST FIX] `detectJurisdiction.ts`, `laOverlay.ts`, `laRtcRules.ts`, `laCityCalendar.ts`, and their tests untouched (architecture ruling §3 D1 part 2).
- [ ] [SHOULD FIX] Run `npm run ci:verify-locked-prose` locally on the branch before push — Phase 1 adds no locked-prose constants, so the expected output is unchanged from `main` (3 locked constants verified). Confirms the matrix work didn't accidentally tangle a locked-prose change in.
- [ ] [CONSIDER] If the snapshot/byte-check on matrix row contents catches any divergence between the workspace transcription and the committed source at `f46bebf`, abort the PR and re-transcribe from the committed bytes (`git show f46bebf:docs/compliance/ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`). Workspace-vs-repo discipline.

---

## §6. Sign-off to open the Phase 1 branch

**Granted.** Build may open the Phase 1 branch (`feat/ca-jurisdiction-matrix-phase-1` or whichever name fits repo convention) and proceed to code under the constraints in §5.

The next escalation I expect from build is the Phase 1 PR itself — opened against `main`, three required checks green, with the PR description carrying the four references in §4 above. No further pre-code escalation needed. If a structural question surfaces mid-implementation that the rulings to date have not resolved, escalate then; otherwise build through.

Phase 2 (UI scaffolding + locked-prose constants + manifest entries + `SupplementalDutyBlock.tsx` + `coverSheet.ts`) opens after Phase 1 merges, with its own scoping note if any structural questions are surfaced by what Phase 1 lands.

---

## §7. Authoring discipline carried forward

This ruling was authored against build's read of the committed source at `f46bebf` (which build has hash-verified against the source-files PR I staged — the hashes in the scoping note match the workspace canonical values in [`lahd_filing_prompt_copy_broker_determination_2026-06-18.md`](lahd_filing_prompt_copy_broker_determination_2026-06-18.md) and [`ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`](ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md)). The 23-row table in build's §1 is accepted as the correct transcription of the committed matrix's branch states; I have not independently re-read the committed source for this ruling, relying on the workspace-vs-repo discipline to bind the determination to the committed bytes.

If build's transcription of any row's branch state differs from the committed source at `f46bebf`, that surfaces in the matrix-snapshot test (§5 item 6) and is a re-escalation, not a re-author of this ruling. The rulings in §§1–4 hold against the committed source as build reported it.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
