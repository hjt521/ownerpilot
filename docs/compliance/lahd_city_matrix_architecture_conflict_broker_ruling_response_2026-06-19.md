# LAHD/city-matrix prompt vs. existing LA architecture — model-conflict ruling

**File:** `lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** [`lahd_city_matrix_architecture_conflict_broker_ruling_request_2026-06-19.md`](lahd_city_matrix_architecture_conflict_broker_ruling_request_2026-06-19.md) (build-side authored, 2026-06-19)
**Lineage:**
- [`lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md`](lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md) — prior ruling whose §7 re-escalation surfaced this conflict
- [`claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md`](claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md) — Model A (implementation prompt)
- [`lahd_filing_prompt_copy_broker_determination_2026-06-18.md`](lahd_filing_prompt_copy_broker_determination_2026-06-18.md) — LAHD source (workspace; pending source-files PR)
- [`ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`](ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md) — city-matrix source (workspace; pending source-files PR)
- [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — operating authority
- [`workspace_attribution_inventory_2026-06-09.md`](workspace_attribution_inventory_2026-06-09.md) — prior attribution-inventory ruling (for the §3 attorney-attribution-in-code finding)
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

Build's escalation is correctly framed. The survey surfaced a real architecture conflict between Model A (the implementation prompt's "produce-then-prompt-LAHD" design) and Model B (the codebase's "blocked-until-3-deps" + hard-block-cities posture already encoded in `detectJurisdiction.ts` / `laRtcRules.ts` / `laOverlay.ts` / `laCityCalendar.ts`). This is not a "build read the prompt wrong" situation — the two models are genuinely incompatible as live behavior. The right move is a determination, not a one-paragraph follow-up. The carve-out in the prior §7 anticipated exactly this case.

The §3 attorney-attribution-in-code finding is also correctly framed: this is a structural §0 tension that the prior §5 ruling (filenames + new artifacts) did not address. It needs its own treatment here, and a separate scoped reconciliation later.

Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. Ruling (A): **A1 — Model B stands. The LAHD/city-matrix feature is built as gated scaffolding behind `isLaProductionUnblocked()` and a per-city block list, rendering nothing in production until the three dependencies land.**

**Not A2 (defer entirely). Not A3 (Model A supersedes B).**

### Why A1, not A2

Deferring the entire workstream until geocode + city calendar + RTC-refresh land would be the safe choice but the wrong one, for two reasons:

1. **The two source determinations** ([`lahd_filing_prompt_copy_broker_determination_2026-06-18.md`](lahd_filing_prompt_copy_broker_determination_2026-06-18.md) and [`ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`](ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md)) are authored, complete, and ready for the source-files PR (§9 of the prior ruling). Letting them sit out-of-tree for months while the three deps land is the dangling-reference posture this session has ruled against repeatedly. They commit now.

2. **The matrix structure, jurisdiction routing, resolver-wrapper logic, and test fixtures are buildable today** against the committed sources without producing any user-visible UI, because A1 routes them behind the existing structural gates. The scaffolding can land, be tested, and sit dormant until the gates flip. That is a better posture than three months of work piling up against an unmerged source.

### Why A1, not A3

A3 (Model A supersedes B "in some defined way") would mean me, as broker, overriding the structural gates that `laRtcRules.ts` encodes as production prerequisites. I will not do that. Those gates exist because three real-world dependencies are not yet built:

1. **Authoritative geocode confirmation** — without an address→state+incorporated-city+confidence path, "is this property in the City of LA?" cannot be answered with the confidence an unlawful-detainer notice requires. A wrong answer (LA notice produced for a non-LA property, or non-LA notice produced for an LA property missing RTC) is UD-fatal.
2. **Verified city business-day calendar** — without verified 2026 city-holiday data, `computeLahdFilingDeadline` can produce a wrong deadline, which is also UD-fatal (filing one day late = notice fails).
3. **RTC form embed-and-refresh job** — without a current RTC form, the attached RTC may be stale, which is, again, UD-fatal.

These are not posture concerns. They are correctness prerequisites for producing an LA notice that survives an unlawful-detainer challenge. Model B's blocked-until-3-deps stance is the structurally correct one. Model A reads (correctly, per build's interpretation) as a forward design for the post-dependency world. The reconciliation is: build Model A's structure now, gate it behind Model B's existing checks, and let the gates flip naturally as each dependency lands its own sign-off.

### How A1 concretely binds Phase 1

1. **Resolver shape (from §2 of the prior ruling, refined here):** the wrapper called by `SupplementalDutyBlock` and the cover sheet is a thin wrapper per (4a). It calls `detectJurisdiction` first; on `BLOCK_OVERLAY_CITY` it returns a block-routed value with no matrix lookup; on `NEEDS_CONFIRMATION` it returns a confirmation-required value with no matrix lookup; on `NO_KNOWN_OVERLAY` it consults `caJurisdictionMatrix` for the DEFAULT or out-of-LA row. **The matrix is never the authority on LA jurisdiction** — `detectJurisdiction` is.

2. **LA branch gating:** the LAHD filing-prompt UI (Model A §5 / §6) renders only when `isLaProductionUnblocked() === true` **and** the per-feature env flag (`LAHD_FILING_PROMPT_ENABLED`) is set. Both gates must be true; either-or is not sufficient. Today, `isLaProductionUnblocked()` returns false, so the LAHD branch ships dark.

3. **`caJurisdictionMatrix` row contents** are sourced verbatim from the city-matrix source determination per §1 of the prior ruling. Rows for the hard-block cities (`San Francisco`, `Oakland`, `Berkeley`, `San Jose`, `Santa Monica`, `West Hollywood`) are present in the matrix but their `displayBehavior` field (or equivalent — name to be set in the source-files-committed shape) routes through the block path, not the prompt-rendering path. See §2 of this ruling.

4. **Hard-fail when called against unconfirmed addresses:** the wrapper must throw (or return a typed error) if it is ever invoked with an address that has not gone through `detectJurisdiction`'s confirmation flow. No silent fall-through to DEFAULT. This is the matrix-side analogue of `getVerifiedCityHolidaySet` throwing on unverified data — same fail-closed posture.

5. **Tests assert the gated behavior:** Phase 1 acceptance tests assert that LA addresses route to the LA-blocked / confirmation-required path (per §B below), that hard-block cities route to the block path, and that non-overlay CA addresses route to the DEFAULT row. **No test asserts that an LA notice is produced today.** Tests for the post-dependency world (LAHD prompt rendering after production) are written but skipped under a `describe.skip` gated on `isLaProductionUnblocked()` returning true — they unskip automatically when the production gate flips.

---

## §2. Ruling (B): **Hard-block cities stay BLOCK-ENTIRELY today. The matrix row exists; the row's UI route is the block path, not the prompt-rendering path.**

This is the answer for the period until each hard-block city has its own broker determination explicitly authorizing notice production for that jurisdiction.

The prompt's §4/§8 acceptance tests as currently written (assert SF → "SF row, filing excluded" prompt renders; San Jose → "San Jose row" prompt renders) are **superseded by this ruling**. Rewrite them to assert:

- SF address → `detectJurisdiction` returns `BLOCK_OVERLAY_CITY` → wrapper returns a block-routed value with the user-facing copy from `detectJurisdiction`'s existing `message` field ("talk to a California licensed broker before serving a notice for this property" — see §3 below on the "attorney" wording in the existing copy).
- San Jose → same block-routed value, same path.
- Same assertion for the rest of the hard-block list (Oakland, Berkeley, Santa Monica, West Hollywood).

**Why the row exists in the matrix at all:** so that when a hard-block city graduates to "authorized for notice production" via its own future broker determination, the matrix already has the row's verbatim filing-channels, supplemental-documentation, and notes contents committed from the source determination, and the only change required to enable it is flipping `displayBehavior` from `block` to `render-prompt`. The data ships dark, like the LAHD branch ships dark. That is the cheaper path than re-authoring the source determination later.

**The implementation prompt is superseded on this point** in addition to the §2 path-remap supersession from the prior ruling. Build references both this §2 and the prior §2 in the Phase 1 PR description.

---

## §3. Ruling (D): **D1 + scoped follow-up. New artifacts carry zero attorney-attribution tokens (already ruled). Existing LA rule modules are left untouched in Phase 1. A separate `la_rule_modules_attribution_reconciliation_broker_determination` is authored after Phase 1 lands.**

The conflict build flagged is real and is the right thing to surface: a no-attorney-engagement posture sitting on top of rule modules saturated with "attorney-verified" / `verifiedBy: '{ATTORNEY_NAME}, SBN {SBN}'` / "attorney-confirmed" comments and fields is internally inconsistent. Build is also correct that resolving it is squarely a §0 broker determination, not an engineering choice. Here is the ruling.

### D1 part 1: New code/manifest/PR artifacts under this workstream carry zero attorney-attribution tokens (re-confirmed)

Restated for clarity, because §3 of the request escalates the prior §5 ruling into the structural domain:

- `caJurisdictionMatrix.ts` — zero tokens. Source comments point at the broker source determinations. Any "verified" semantics are framed as broker-verified or, where appropriate, simply "current as of <date>" with no provenance claim.
- The thin-wrapper resolver — zero tokens. Routes to `detectJurisdiction`'s existing return values without quoting or re-rendering its attorney-laden internal comments.
- The new locked-prose `.ts` constant files — zero tokens.
- The manifest entries — zero tokens.
- `SupplementalDutyBlock.tsx`, `coverSheet.ts` — zero tokens.
- Tests, fixtures, snapshots — zero tokens.
- PR descriptions and commit messages — zero tokens. Build strips them from auto-generated PR-template framing on every PR opened under this workstream (already a [MUST FIX § 1] per the prior ruling).

### D1 part 2: Existing LA rule modules are NOT touched in Phase 1, 2, or 3 of this workstream

`laRtcRules.ts`, `laOverlay.ts`, `laCityCalendar.ts`, `detectJurisdiction.ts` (and their tests) are imported and called by Phase 1+ code. **They are not edited, renamed, or reframed** by this workstream. Build's read is correct on this point: rewriting them now would entangle a structural-LA-architecture change into a feature-add PR, which is the wrong scope. The modules stand.

There is one user-facing wording exception that the wrapper handles without touching the modules: where `detectJurisdiction`'s `BLOCK_OVERLAY_CITY` `message` field reads "talk to a California licensed attorney before serving a notice for this property," the wrapper substitutes its own user-facing copy when surfacing the block in the UI. The substitute copy is broker-authored. **The exact substitute string will be authored as part of the source-files PR or a small follow-up source determination** — build does not draft it. Until that string is authored, the block-routed UI either shows a placeholder broker-only sentence or routes to a generic "this property's jurisdiction is not yet supported" state with no attribution either way; build picks the path and surfaces the chosen one in the Phase 1 PR description for me to confirm in review.

### D1 part 3 / D2: The LA rule modules' attribution gets its own scoped reconciliation determination — authored AFTER Phase 1 lands

I will author `la_rule_modules_attribution_reconciliation_broker_determination_<date>.md` as a separate workstream, with its own scoped PR, after Phase 1 of the LAHD/city-matrix feature merges. The reconciliation will rule on each of: rename the `verifiedBy` field, restate the "attorney-verified" comments under the same broker-blanket-authorization framing already established in the workspace, change the user-facing strings in `detectJurisdiction`'s `message` field, update the tests that assert specific message contents, and update any imports/snapshots that pin to the old wording. That is a substantial, careful, all-at-once reconciliation, and it does not belong tangled in a feature PR.

**Why the reconciliation is sequenced after Phase 1, not before:**

1. **Phase 1's gated scaffolding does not depend on the LA modules' wording** — only their structural exports (`detectJurisdiction` return shape, `isLaProductionUnblocked()`, `computeLahdFilingDeadline` signature). The wrapper consumes the structural exports and never quotes the modules' attorney-laden internal copy directly into new code.
2. **A reconciliation-first ordering would compound the workstream's already-large scope** with a sweeping rename across four files plus tests plus snapshots plus whatever else imports their string contents. Better to land the scaffolding first and reconcile the wording in a clean follow-up PR with no feature-add noise.
3. **The session's prior workspace-attribution-inventory ruling** ([`workspace_attribution_inventory_2026-06-09.md`](workspace_attribution_inventory_2026-06-09.md)) already established the binding posture-correction: all determinations and rule provenance on this project are broker-prepared work product, regardless of historical attorney-attribution framing. The LA rule modules' attribution is stale prose under that ruling, not operative authority. They can sit in their current form for the duration of one feature PR without compromising the posture.

### D2/D3 ruled out

Build offered D2 ("the rule modules get a separate reconciliation determination first") and D3 ("other"). D2 is the right idea but the wrong sequencing — see D1 part 3 above for why it follows Phase 1 rather than blocking it. D3 is not invoked; no other option is needed.

---

## §4. Ruling (C): **Geocode confirmation (dep #1) is a confirmed prerequisite. No existing authoritative path. Build's survey is accepted as the ground truth on this.**

`components/places-autocomplete.tsx`'s field-mask-`formattedAddress`-only contract is consistent with what build reported; there is no downstream Places Details call that yields address components, geometry, or administrative-area. There is no `lib/places/` or `lib/geocode/` module. The codebase's own `laRtcRules.ts` declares `geocodeConfirmationBuilt: false` as the first production prerequisite; that is the codebase telling us the dependency is unbuilt, and it is.

**The geocode dependency is its own workstream, separate from this one.** Phase 1 of the LAHD/city-matrix feature does not author it, does not block on it, and does not assume it. The wrapper's fail-closed behavior when invoked without an authoritative jurisdiction routing (see §1 item 4 above) is the matrix-side handling for the period before the geocode workstream lands.

When the geocode workstream is scoped, it ships with: an authoritative address→{state, incorporated-city, county, confidence} resolver function, a confidence threshold below which `detectJurisdiction`'s `NEEDS_CONFIRMATION` path activates, integration tests proving the City-of-LA boundary is correctly returned for a curated set of in/out/edge-case addresses, and a sign-off determination flipping `geocodeConfirmationBuilt` from `false` to `true`. That is a separate request packet when build is ready to scope it.

---

## §5. Ruling (E): **Yes — reconcile the gap lists. Non-blocking, addressed in the Phase 1 PR description.**

The implementation prompt's §10 separately-numbered gaps are stale relative to the codebase reality: the three dependencies are already encoded in `laRtcRules.ts` as `geocodeConfirmationBuilt`, `cityBusinessDayCalendarBuilt`, and `rtcRefreshJobBuilt`, with `isLaProductionUnblocked()` as the structural gate that consumes them. The prompt's §10 list and the codebase's three-dep list describe the same gaps under different names.

**Phase 1 PR description includes a "Gap-list reconciliation" subsection** that maps prompt §10 items to the codebase's `laRtcRules.ts` dependency flags one-to-one, notes which are open today (all three), and references this §5 ruling. No code change required. The implementation prompt itself does not need to be re-authored — the supersession is recorded here and in the PR description.

---

## §6. Phasing — updates to the prior ruling's §6a

The prior ruling's phasing stands with the following clarifications under A1:

- **Phase 1 (logic only, gated, no LAHD UI):** `caJurisdictionMatrix.ts` with full verbatim rows from the city-matrix source; thin-wrapper resolver per §1 above; per-city block path for the hard-block list per §2; fail-closed wrapper behavior per §1 item 4; env flag `LAHD_FILING_PROMPT_ENABLED` defaulting off (kept for future use, no UI it gates renders today); acceptance tests per the revised assertions in §2; `describe.skip` gated post-production tests per §1 item 5; Phase 1 PR description includes the §5 gap-list reconciliation and the §2 supersession reference. **Phase 1 ships zero new user-visible UI.**
- **Phase 2 (LAHD/city-matrix UI scaffolding, ships dark):** locked-prose `.ts` constants for the three LAHD strings; manifest entries; `SupplementalDutyBlock.tsx`; `coverSheet.ts` integration. All UI surfaces are conditioned on `isLaProductionUnblocked() && LAHD_FILING_PROMPT_ENABLED` (LA branch) or the analogous per-city graduation flags (non-LA branches). Today, both gates produce no rendered UI. The components exist, are tested via the post-production tests' un-skip path, and ship dark.
- **Phase 3 (fixtures + snapshots + PR-description gap enumeration):** unchanged from prior ruling.

**`LAHD_FILING_PROMPT_ENABLED` is retained as the per-feature kill switch, not removed.** Even after `isLaProductionUnblocked()` flips true, the feature flag gives a single-flag-flip rollback path if a regression surfaces in the LAHD prompt's UI specifically. Both gates required, fail-closed if either is false.

---

## §7. Build-side checklist

- [ ] [MUST FIX] Wait for the broker source-files PR (prior ruling §9, soon to be staged) to merge to `main` before opening the Phase 1 implementation branch.
- [ ] [MUST FIX] Treat Model B as the governing live architecture. The LAHD/city-matrix feature builds as gated scaffolding behind `isLaProductionUnblocked()` and per-feature env flags. Phase 1 ships zero new user-visible UI (§1, §6).
- [ ] [MUST FIX] Hard-block cities remain block-routed in Phase 1. Rewrite the prompt's §4/§8 acceptance tests per the revised assertions in §2 (block-routed values returned, not supplemental-prompt UI rendered).
- [ ] [MUST FIX] Do not touch `laRtcRules.ts`, `laOverlay.ts`, `laCityCalendar.ts`, `detectJurisdiction.ts`, or their tests in this workstream (§3 D1 part 2). They are imported, never edited.
- [ ] [MUST FIX] Wrapper hard-fails (throws or returns typed error) when invoked on an address that has not gone through `detectJurisdiction`'s confirmation flow. No silent fall-through to DEFAULT (§1 item 4).
- [ ] [MUST FIX] Phase 1 PR description includes (a) the §2 path-remap supersession reference from the prior ruling, (b) the §2 hard-block-cities supersession reference from this ruling, and (c) the §5 gap-list reconciliation subsection.
- [ ] [MUST FIX] Strip attorney-attribution tokens from all new code/comments/tests/PR-template framing under this workstream (§3 D1 part 1).
- [ ] [MUST FIX] Surface the wrapper's user-facing block-routed copy choice in the Phase 1 PR description for broker confirmation (§3 D1 part 2 exception).
- [ ] [SHOULD FIX] When Phase 1 lands, run `npm run ci:verify-locked-prose` locally on the branch before push.
- [ ] [SHOULD FIX] When build is ready to scope the geocode workstream, open a new request packet — it is its own feature, not a sub-task of this one (§4).
- [ ] [CONSIDER] If, during Phase 1 implementation, the thin-wrapper shape (per (4a)) proves to need a small adjustment to `detectJurisdiction`'s public surface (e.g., a new return shape variant), flag it as a separate small ruling — do not silently extend `detectJurisdiction`. The §3 D1 part 2 no-touch rule binds unless explicitly waived.

---

## §8. What I will do next (broker-side)

1. **Stage and open the broker source-files PR** (prior ruling §9): two files, branch `docs/lahd-and-city-matrix-source-determinations`, three required checks, merge.
2. **After Phase 1 merges**, author `la_rule_modules_attribution_reconciliation_broker_determination_<date>.md` per §3 D1 part 3. That will be its own scoped PR, sweeping the four LA rule modules' attribution wording at once, with all `verifiedBy` field renames and message-string updates in one named-add commit through the ruleset.
3. **In parallel with §1**, author the wrapper's user-facing block-routed copy string (the substitute for `detectJurisdiction`'s `BLOCK_OVERLAY_CITY` `message` field's user-facing surface). Either as an addendum to the LAHD source determination or as a small standalone source determination, build's preference. Surface that choice when staging Phase 1.

---

## §9. Authoring discipline carried forward

This ruling was authored against build's read-only survey findings at `47d593b`, accepted as ground truth for the repo state. No workspace file was read for the LA module contents — I rely on build's survey on that point per the workspace-vs-repo discipline ([`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) §8.5). The two source determinations referenced throughout (`lahd_filing_prompt_copy_broker_determination_2026-06-18.md` and `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`) exist in workspace at the hashes recorded in the prior ruling §9, are still byte-identical there, and are the canonical source for the source-files PR.

If any of build's claims about `47d593b` later prove inaccurate, re-escalate with the corrected finding; the rulings in §§1–6 hold against the architecture as build reported it.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
