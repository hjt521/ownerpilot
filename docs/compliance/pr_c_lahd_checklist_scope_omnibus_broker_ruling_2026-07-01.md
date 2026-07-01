# PR-C LAHD Filing Checklist + Cron — Scope Omnibus (Broker Ruling)

**Re:** `pr_c_lahd_checklist_scope_fork_request_2026-07-01.md` (engineering, 2026-07-01)
**Parent rulings / precedent:**
- `lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` — **IS in the workspace** at `/home/user/workspace/lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` (see §BLOCKER-RESOLVED below). This is the primary compliance directive for PR-C's scope.
- `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` §3.4 (prompt is advisory-only) and §7 (open items — LA business-day calendar not yet shipped)
- `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` (per-jurisdiction supplemental-doc requirements)
- `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (produce-audit persistence — single source of truth for RTC hashes + LAHD-ack)
- `pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md` (surface-minimum + insert-only ack precedent; §5 acknowledgment-as-compliance-artifact)
- `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` §8 (as-built parity rule of construction)

**Disposition:** Ruled. Engineering's §5 recommendation ADOPTED WITH MODIFICATIONS. §BLOCKER RESOLVED — the cover-sheet ruling exists; (B) is IN scope for PR-C. §S1.6 ruled explicitly. Forks 1–5 ruled inline.

---

## §BLOCKER-RESOLVED — the cover-sheet ruling is in the workspace

Engineering's §BLOCKER stated that `lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` is "not present in `docs/compliance/` or anywhere in the repo." **The ruling exists** at `/home/user/workspace/lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` (workspace root, alongside every other broker ruling in this session — not the repo's `docs/compliance/`).

**Standing convention (reaffirmed for the record):** every broker ruling in this session is filed at `/home/user/workspace/` — not under `docs/compliance/`, not under the repo tree. Engineering should search `/home/user/workspace/*.md` first when a ruling is referenced but not found in the expected location, and only then flag missing-ruling. This is a documentation-discovery discipline, not a fault — the memo's posture (surface, don't infer) was correct.

**Consequence for PR-C scope:** (B) is NOT blocked. The cover-sheet ruling's §2.4 checklist and §6 [SHOULD FIX] items are the compliance directives PR-C implements. I fold those directly into this ruling below.

## §1 — Frame

Two premises govern this ruling — parallel to the §1 framing on the PR-B omnibus, but with a different application:

1. **The cover-sheet ruling §2.4 already specifies what OwnerPilot must produce.** Two artifacts, with clear compliance directives:
   - **A post-service action checklist** for the owner at notice-finalization time, including the "file within 3 business days" line, the online-portal-preferred/mail-fallback branching, and a link to the current cover sheet PDF.
   - **A pre-filled cover sheet** as an optional artifact in the post-service packet — OwnerPilot has every field the cover sheet asks for except APN (which lands with Phase 2d parcel-lookup) and the Declaration signature (owner signs before mailing).
   PR-C's job is to ship these two artifacts. The forks are about **mechanism and surface**, not scope-of-what.

2. **The advisory-only 2026-06-18 ruling and the cover-sheet ruling are not in tension — they layer.** The 2026-06-18 ruling §3.4 said the *prompt* does not track filing / compute a deadline / generate a cover sheet / block production. The cover-sheet ruling adds a *checklist + cover sheet artifact* on top of the prompt — same base surface, additional layer. PR-C is that additional layer. Do not read the 2026-06-18 §3.4 as prohibiting the checklist mechanism; read it as describing what the *prompt alone* does. PR-C adds around the prompt, not on top of it.

Both premises push the ruling toward "adopt engineering's §5 recommendation with modifications that fold in the cover-sheet directives" — not "adopt as-is" (because §5 defers (B), which is no longer deferrable) and not "reject" (because §5's scoping of (A) is correct and the surface-minimum choice matches PR-B precedent).

## §2 — Scope-definition fork (memo §3) — RULED

**Ruling: PR-C scope includes (A) filing-completion tracking + (B) the pre-filled LAHD eviction-filing cover sheet artifact + (D) cron pin. (C) 3-business-day deadline computation is deferred (blocked on the LA city business-day calendar per the 2026-06-18 §7 open item).**

### §2.1 — (A) Filing-completion tracking — IN

The owner needs a way to record whether/when they filed with LAHD. Without this, the "did they file within 3 business days" question has no answer path, and the affirmative-defense exposure the cover-sheet ruling §2.3 warns about is not mitigated by the OwnerPilot flow. Per Fork 5 disposition (§7.5 below), the tracking is owner-attested (checkbox + filing-date input), not evidence-uploaded, for this pass — filed-PDF/receipt-number evidence upload is a later slice.

### §2.2 — (B) Pre-filled cover sheet artifact — IN

The cover-sheet ruling §2.4 point 2 explicitly directs: "A pre-filled cover sheet as an optional artifact in the post-service packet. OwnerPilot already has every field the cover sheet asks for … The Declaration field stays unsigned because OwnerPilot is not the declarant."

**Implementation constraints:**
- Generate a populated PDF of the LAHD Eviction Notice Filing Cover Sheet (Rev 2.6.2026 baseline; refresh via cron per §2.4).
- Every field OwnerPilot has today, pre-fill. Fields OwnerPilot does not have today (APN pre-Phase-2d-parcel-lookup) stay blank — do not fabricate or default.
- Declaration signature line stays blank.
- Owner downloads/prints, signs the Declaration, mails to "LAHD Eviction Filing Section, PO BOX 17850, Los Angeles, CA 90057" per §2.4 point 1.
- Do NOT modify the served notice face to incorporate cover-sheet content (§2.4 point 3 verbatim).
- The cover sheet PDF is a **separate artifact** from the notice PDF and the RTC packet PDFs — do not bundle into one downloadable file. Owner should be able to see and download each artifact independently on the riskpath row surface.

### §2.3 — (C) 3-business-day deadline computation — DEFERRED

The 2026-06-18 §7 open item states: "LA city business-day calendar pull (deadline for the calendar to be available with the same verification discipline as the judicial-holiday table). Until shipped, the prompt cannot compute a calendar deadline date."

This has not shipped. Computing a wrong deadline is worse than showing no deadline — the day-count defect the cover-sheet ruling §3 caught is the exact class of error we cannot repeat here. PR-C shows the owner "within 3 business days of service" as the deadline framing, without a calculated calendar date. Once the LA business-day calendar lands (its own verification-packet slice, same discipline as the judicial-holiday table), a follow-up slice adds the calendar-date computation to the checklist.

**Owner-facing framing for now:** "File within 3 business days of the service date." No calculated date. This matches the ratified `lahdFilingPromptBody` (2026-06-18 §1 verbatim), so no new copy is needed for this piece.

### §2.4 — (D) Cron pin — IN, but delegated to my operator action, NOT to engineering

Per the cover-sheet ruling §6 [SHOULD FIX] and my standing operator item: "add `eviction_filing_cover_sheet` to cron `0abb46c4` pinned-forms list." I execute this cron edit as part of the same operator window that lands PR-C's deploy (parallel to the PR-B migration `035` action I'm running now). Engineering does NOT touch the cron directly — the cron config lives at my scheduling layer, not in the repo.

**However, engineering DOES:**
- Read from the LAHD forms refresh output at `/home/user/workspace/cron_tracking/lahd_forms/snapshots/eviction_filing_cover_sheet.sha256` (or the equivalent path per cron `0abb46c4`'s output convention) to determine which revision of the cover sheet to render. Fork 2 (§7.2 below) rules the read-path shape.
- Read from `produce_audit.rtcFormHashes` for RTC form pins (single source of truth per §7.2 below).

## §3 — §S1.6 sub-fork (produce-time vs post-service placement) — RULED

**Ruling: PR-C accepts the produce-time LAHD ack placement AND adds a post-service surface for the filing-completion tracking. Not either-or; both.**

The 2026-06-18 §3.3 places the LAHD prompt post-service. The chat path currently shows the ack at produce (LaProducePanel), because the chat has no serve surface. Engineering correctly surfaced this as a compliance-behavior divergence.

**Resolution:**
- **The LAHD *filing prompt* stays at produce time** on `LaProducePanel` — the ack has already been ratified in the §5.2 produce-audit trail, and moving it would break the durable ack record downstream reconciliation depends on. This is the "chat-path reality" the 2026-06-18 determination's §3.3 could not have anticipated (the determination predates the chat path's insert-only architecture).
- **The LAHD *filing-completion tracking* is post-serve**, on the riskpath row surface (extending PR-B Surface 2's banner surface, per Fork 3 disposition §7.3 below). This is where the owner returns after producing, and where the "have you filed with LAHD yet?" question is legitimately owner-mutable state.
- **The pre-filled cover-sheet artifact** is available at both surfaces (produce screen download-alongside-notice, and riskpath row download-anytime-after-produce). This gives the owner the cover sheet as soon as it's meaningful (at produce, so they can plan the mail path) and keeps it available when they return to file (on the row).

**Why this is not a §S1.6 deferral:** the compliance intent of the 2026-06-18 §3.3 (post-service framing) is honored where it matters most — at the *tracking* surface (§7.3). The *ack* surface stayed at produce for a durability reason downstream of the 2026-06-18 ruling. Engineering: this is the correct posture; do not attempt to move the ack. If a future chat serve surface is built (later slice, deferred from PR-B), the ack UI can migrate — but the durable record in `produce_audit` stays.

## §4 — Additional compliance directive folded in — the day-count-defect standing rule (cover-sheet ruling §3, §4, §6)

The cover-sheet ruling §3 diagnosed a **CRITICAL day-count defect** in the produced notice (July 2 vs. correct July 6, 2026 expiration). Cover-sheet ruling §4 requires synthetic test coverage for this class of defect. Cover-sheet ruling §6 lists it as [MUST FIX].

**Is this PR-C's job?** No — the day-count engine defect is a separate work item that predates PR-C, and cover-sheet ruling §6 already assigns it to engineering as a distinct [MUST FIX]. **However**, PR-C touches the surface where the defective notice would be produced from. Engineering must:

1. **Verify** — before opening PR-C — whether the day-count engine defect from cover-sheet ruling §3.5 has been diagnosed and fixed. If NOT, either PR-C waits until the day-count engine is confirmed correct, OR PR-C ships and the standing operator item ("DO NOT SERVE existing Clifton Alexander Jul-2 notice") stays in force until the engine is verified. Engineer's call on sequencing, but flag disposition in the PR-C attestation.
2. **Confirm** — as part of PR-C's attestation — that the regression test "service Jun 30, 2026 → expiration Jul 6, 2026" from cover-sheet ruling §6 [MUST FIX] is in the day-count test suite. If it isn't there, add it. Not net-new work for PR-C; folding an existing [MUST FIX] into the PR-C attestation to ensure it doesn't drop off.
3. **Confirm** — as part of PR-C's attestation — that the synthetic test SC-DAYCOUNT-JUL2026 from cover-sheet ruling §6 [MUST FIX] is in the A14 synthetic harness catalog.

If any of these three items is not yet done and can't be folded into PR-C, engineering flags them explicitly in the PR-C attestation. Do not silently defer.

## §5 — Locked prose — RATIFIED (broker-authored, verbatim)

PR-C introduces new owner-facing copy on the riskpath row surface for the filing-completion tracking and cover-sheet artifact. Ratifying six blocks verbatim, jurisdiction-slot-ready naming per Fork 4 disposition (§7.4 below).

### §5.1 — `chatLahdFilingChecklistHeader`

> LAHD filing — required within 3 business days of service

### §5.2 — `chatLahdFilingChecklistBody`

> California law requires you to file a copy of the served notice with the Los Angeles Housing Department (LAHD) within 3 business days of serving the tenant. Failure to file gives the tenant an affirmative defense in an eviction proceeding.

### §5.3 — `chatLahdFilingChannelsPreferred`

> Preferred: upload the served notice at [housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices) → Submit New Notice. Requires a free Angeleno Account.

### §5.4 — `chatLahdFilingChannelsAlternative`

> Alternative: mail a paper copy of the served notice plus the LAHD Eviction Notice Filing Cover Sheet to LAHD Eviction Filing Section, PO BOX 17850, Los Angeles, CA 90057.

### §5.5 — `chatLahdFilingCoverSheetLabel`

> Download pre-filled LAHD cover sheet (for mail filing)

### §5.6 — `chatLahdFilingRecordButton`

> I filed this notice with LAHD

### §5.7 — Notes for engineering

- Real em-dash `—` (U+2014) in §5.1 header.
- Markdown link syntax in §5.3 renders as a clickable link on the surface — engineer implements per whatever the rest of the chat surface uses for links.
- PO Box address is verbatim per the cover-sheet ruling §2.4 point 1. Do not paraphrase.
- The "I filed" button in §5.6 is the primary action that triggers filing-completion tracking (§7.1 below). One filing-date input field is presented after the button is clicked (or inline — engineer's UX call), with a required-date-input constraint.
- All six blocks land in the locked-prose manifest with Shape-A entries, per PR-B precedent.
- **ES ratification:** ES translations for all six blocks are PROVISIONAL, same posture as Lane 2E entityType + PR-B staleness copy.

### §5.8 — Manifest count effect

Six new Shape-A entries. Post-PR-B manifest count target was **46**. Post-PR-C target: **52**. Engineer verifies actual pre-PR-C count against the live file in the attestation — same discipline as Lane 2E and PR-B. Do not defer to the "46" figure without verification.

## §6 — Filing-completion record shape — RULED (parallel to PR-B §5 acknowledgment)

The owner's filing-completion record is a compliance artifact and must be recorded. Per PR-B §5 precedent — a filing action that leaves no trail is not a compliance instrument.

### §6.1 — What to record

For each filing-completion action, record:

- `riskpath_id` (of the served notice)
- `chat_session_id` (of the recording session)
- `filed_at` (server timestamp of the record action)
- `filing_date` (owner-attested date the notice was filed with LAHD; ISO date, not timestamp)
- `filing_channel` (`online_portal` | `mail_with_cover_sheet` | `other`)
- `cover_sheet_revision` (the revision of the LAHD cover sheet in effect when the record was created — Rev 2.6.2026 for now; sourced from cron `0abb46c4`'s snapshot)

### §6.2 — Where it lives

New table `lahd_filing_records` — a child of `riskpath_records` keyed by `riskpath_id`. **Insert-only** (matches PR-B `staleness_acknowledgments` and `staleness_ack` posture — filing-completion is an immutable event, not mutable state). If the owner needs to correct a mis-recorded filing, a second row is inserted; the query surface reads the most-recent row for display.

**Not on `produce_audit`:** the cover-sheet ruling §2.4 keeps distinct compliance artifacts in distinct places. `produce_audit` captures produce-time state (RTC hashes, LAHD-ack, produce_snapshot). `lahd_filing_records` captures owner-attested post-service state. Two tables, two purposes, no fold.

**Not owner-mutable:** engineering's memo Fork 1 correctly noted this is "owner-mutable filing status … over time" — but I'm ruling *append-only mutable*, not *update-in-place mutable*. The compliance record is the sequence of insertions; the display reads the latest. Same discipline as staleness acknowledgments.

### §6.3 — Endpoint

`POST /api/notices/[riskpathId]/lahd-filing-record` (name flexible). Owner-scoped, insert-only, validated `filing_channel` ∈ the three enums above, validated `filing_date` is a valid ISO date not in the future. Called from the riskpath row surface when the owner clicks the "I filed this notice with LAHD" button and completes the filing-date input.

### §6.4 — Migration

New migration file (next number in sequence — engineer confirms) adds `lahd_filing_records` table with owner-read RLS (`chat_session_id` = current session), insert-only (no UPDATE grant to authenticated users).

## §7 — Forks 1–5 ruled

### §7.1 — Fork 1 (checklist storage shape) → RULED: new `lahd_filing_records` child table

Per §6 above. Not fold-into-`produce_audit`, not derive-at-read-time. Rationale: filing-completion is a distinct compliance event from produce-time state; the cover-sheet ruling §2.4 explicitly separates the two artifacts (checklist and pre-filled cover sheet); insert-only append-mutable is the cleanest shape for owner-attested compliance events (parallels PR-B `staleness_acknowledgments`).

### §7.2 — Fork 2 (cron scope) → RULED: read-only against existing cron output; NO new cron behavior in PR-C

Per §2.4 above, the cron pin is my operator action, not engineering's. PR-C reads from:

- `produce_audit.rtcFormHashes` for RTC form pins (single source of truth for what RTC forms were pinned at produce time — matches the "avoid two paths of truth" concern engineering raised in Fork 2).
- The cron `0abb46c4` output at `/home/user/workspace/cron_tracking/lahd_forms/snapshots/eviction_filing_cover_sheet.sha256` (once the pin lands from §2.4) for the current cover-sheet revision. If the file does not exist at read time (before I land the pin), engineering falls back to a **hard-coded `COVER_SHEET_REVISION = "Rev 2.6.2026"` constant** and logs a warning; do not fabricate or default to a different revision. Same anti-defaulting posture as Lane 2E entityType.

**Not adding a new cron.** Not adding to `0abb46c4`'s behavior beyond the pinned-forms list edit I execute. PR-C is user-triggered only for filing-completion; the cron continues its existing refresh cadence and PR-C's read path picks up any updates automatically on next revision baseline.

### §7.3 — Fork 3 (chat surface) → RULED: riskpath row section, extending PR-B Surface 2

Per §3 above. Not a produce-flow step (would displace the produce-time LAHD ack, which we're keeping), not a standalone `/lahd-filing` route (unnecessary new surface, same reasoning as PR-B's rejection of a new `/riskpath/[id]` route). The smallest surface that fires the tracking and honors the post-serve intent is a section on the existing riskpath row surface — the same one PR-B's Surface 2 banner uses.

**UI structure on the row:**
1. PR-B staleness banner (if applicable).
2. **New — LAHD filing section:** header (`chatLahdFilingChecklistHeader`) + body (`chatLahdFilingChecklistBody`) + channels (§5.3 preferred + §5.4 alternative + §5.5 cover-sheet download link) + record button (`chatLahdFilingRecordButton`) OR "Filed on [date] via [channel]" once the filing is recorded.
3. Existing row surface (notice PDF, produce_audit link if surfaced, etc.).

Engineer's UX call on visual grouping (card / section / expandable), but the compliance requirement is that the LAHD filing UI is present, actionable, and reflects the current filing-recorded state.

### §7.4 — Fork 4 (non-LA jurisdiction handling) → RULED: jurisdiction-slot-ready naming, LA-scoped guard now

Locked-prose block names use `chatLahdFiling*` (not `chatFiling*`). LAHD is a proper noun — it's specifically the Los Angeles Housing Department. This naming is inherently LA-scoped and does not need a jurisdiction slot.

**For future non-LA jurisdictions,** the supplemental-docs matrix ratifies additional filing requirements per jurisdiction (2026-06-18 supplemental-docs matrix §§2.2–2.23 for the other cities). A later slice would introduce parallel `chatSfoFiling*` / `chatOaklandFiling*` / etc. blocks based on those jurisdictions' matrix entries — no rename of the existing `chatLahdFiling*` blocks required.

**The filing section only renders when jurisdiction === 'City of Los Angeles'.** For any other jurisdiction resolved by `runJurisdictionResolution`, the section does not render (and a "your jurisdiction's filing requirements are not yet implemented" stub is NOT needed for PR-C — the produce flow already handles non-LA verdicts via the §5.2 core stubs).

### §7.5 — Fork 5 (owner-side filing evidence) → RULED: owner-attested status only for this pass; filed-PDF/receipt-number evidence upload DEFERRED

Rationale:

1. **Owner attestation is a compliance trail** — the `lahd_filing_records` insertion, timestamped and channel-tagged, IS a record. It's not evidence-grade proof, but it's the same trail-grade posture as the LAHD-ack in `produce_audit` (owner clicked, timestamped, persisted).
2. **File upload has a distinct compliance-surface class** — signed-URL storage buckets, access control, malicious-file scanning, size limits, retention. That's not a fork question; that's a separate compliance-surface work item. The notice PDF already lives in `documents` with signed-URL access (memo §4 fork 5 noted correctly), but that surface is engineering-owned OwnerPilot-produced content, not owner-uploaded content. The two access-control postures are different.
3. **Deferral is not silent** — the cover-sheet ruling §6 [SHOULD FIX] items do not list filed-PDF evidence upload, so the deferral is consistent with the parent ruling's scoping. A later slice can add evidence upload if experience shows attestation is insufficient.

**In PR-C:** owner-attested status only. Filing-date input, channel selection, record button. That's it.

**Flagged for later:** filed-PDF upload, receipt-number capture, filing-confirmation-email parsing — all deferred to a future slice with its own compliance-surface ruling for upload/storage/access.

## §8 — Engineering §5 recommendation disposition

The memo's §5 recommendation is broadly correct in shape but must be modified to reflect that (B) is NOT deferrable (§BLOCKER-RESOLVED). Modified adoption:

- **Fork 1 → new `lahd_filing_records` child table** — ADOPTED (§7.1).
- **Fork 2 → read-only against existing cron output + `produce_audit`** — ADOPTED (§7.2).
- **Fork 3 → riskpath row section (extend PR-B Surface 2)** — ADOPTED (§7.3).
- **Fork 4 → jurisdiction-slot-ready naming with LA-scoped guard now** — ADOPTED with clarification (§7.4: `chatLahdFiling*` is LA-scoped by name; non-LA gets parallel blocks in a later slice, not a rename).
- **Fork 5 → owner-attested status only, evidence upload deferred** — ADOPTED (§7.5).
- **(B) cover sheet DEFERRED** — REJECTED. (B) is IN scope for PR-C. §2.2 above.
- **(C) deadline computation deferred** — ADOPTED (§2.3; blocked on LA business-day calendar).

## §9 — Sequencing after this ruling

1. Engineering verifies the cover-sheet ruling location (`/home/user/workspace/lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md`) and confirms the day-count engine defect status per §4 above. Flags any of the three items in §4 that need to fold into PR-C or be flagged in the PR-C attestation.
2. Engineering wires PR-C per §§2, 3, 4 (defect items to fold or flag), 5 (six locked-prose blocks + manifest), 6 (`lahd_filing_records` + migration + endpoint), 7 (Forks 1–5 as ruled). Includes: (A) filing-completion tracking; (B) pre-filled cover sheet artifact generation; the LA-scoped riskpath row section; the record endpoint; CI parity check extension if the shared surfaces demand it (engineer's call).
3. Engineering files the PR-C attestation. On receipt I countersign.
4. **I execute the cron `0abb46c4` pinned-forms edit** (adding `eviction_filing_cover_sheet` at Rev 2.6.2026 baseline) — my Path α action, sequenced to land before PR-C merges so engineering's read from the cron snapshot path succeeds.
5. **I apply any new migration** (Fork 1's `lahd_filing_records` migration) to preview → production, sequence (a) before merge, same posture as PR-B migration `035`.
6. **PR-C merges** on the PR-B-merged base.
7. Deferred items filed in the fast-follow tracker: (C) deadline computation (unblocks on LA business-day calendar); filed-PDF evidence upload (its own compliance-surface ruling); non-LA jurisdiction checklist blocks (per supplemental-docs matrix slice).

## §10 — Deviations posture reaffirmed

- Shape divergences (storage details, migration mechanics, UX grouping on the row) reconcile under as-built parity (§8 rule of construction from Lane 2E). Document as "Deviations" subsection in the attestation.
- Compliance-behavior divergences (e.g., if the cover sheet PDF generation turns out to need a slot the cover-sheet ruling §2.4 doesn't cover) require §1.6 escalation.
- **Anti-defaulting discipline holds.** APN blank pre-parcel-lookup, not fabricated. Cover sheet revision falls back to hard-coded constant with warning if cron snapshot missing, not to a fabricated newer revision.

## §11 — Operator items (updated)

- **Cron `0abb46c4` pinned-forms edit — my action, this window** (per §2.4).
- Path α env provisioning §3.2 — in progress.
- Migration for `lahd_filing_records` — my action once engineering files it, same posture as PR-B migration `035`.
- Prior standing items unchanged (Clifton Alexander DO NOT SERVE remains in force until the day-count engine defect is confirmed fixed and the notice regenerated per cover-sheet ruling §3.6).

## §12 — Standing rules reaffirmed

- **Broker rulings live at `/home/user/workspace/*.md`, not in the repo tree.** Engineering searches the workspace root first when a ruling is referenced. Discovery, not authorship, is the discipline.
- **Insert-only append-mutable is the shape for owner-attested compliance events** (staleness acks, LAHD filing records). Same posture across artifacts.
- **CI parity extensions ride existing Required checks** when possible (per PR-B §3.5 pattern).
- **Manifest count verified against the live file per attestation**, no defer to earlier-ruling figures.
- **Owner-attested trail is compliance-grade**; evidence-grade upload is a distinct compliance-surface class with its own ruling posture.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
