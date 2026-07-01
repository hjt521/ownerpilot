# PR-C — LAHD Filing Checklist + Cover Sheet (Attestation)

**Re:** `pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md` (adopt-with-mods; (A)+(B)+(D) in, (C) deferred).
**Filed by:** engineering, 2026-07-01. On the PR-B-merged base (`main` at `80aa356`). Awaiting broker countersign.

## §1 — What was built

- **(A) Filing-completion tracking.** `lahd_filing_records` insert-only child table (migration `036`; §6) + `POST /api/notices/[riskpathId]/lahd-filing-record` (owner-scoped, insert-only; validated `filing_channel` ∈ {online_portal, mail_with_cover_sheet, other}, `filing_date` ISO not-future; `cover_sheet_revision` stamped server-side). Owner-attested only (Fork 5 §7.5) — evidence upload deferred.
- **(B) Pre-filled cover-sheet artifact.** `lib/produce/lahdCoverSheet.ts` builds the LAHD Eviction Notice Filing Cover Sheet HTML pre-filled from the row's `produce_snapshot`; `GET /api/notices/[riskpathId]/lahd-cover-sheet` serves it owner-scoped. **APN, bedroom count, date-served, monthly rent, tenant contact, and the Declaration signature are left BLANK — never fabricated (§2.4 / §10 anti-defaulting).** Ratified PO box + `Rev 2.6.2026` verbatim. **Separate artifact** — does not touch the notice PDF (§2.4 pt 3).
- **Surface (§7.3).** LAHD filing section on the riskpath row (extends PR-B Surface 2), rendered for LA-eligible rows only: header + body + preferred/alternative channels (markdown links rendered) + cover-sheet download + record form (date + channel + "I filed…" button), or "Filed on [date] via [channel]" once recorded. GET `/api/riskpath` returns a per-row `lahd { eligible, latestFiling }`.
- **Copy (§5).** Six ratified Tier-A blocks (`chatLahdFiling*`) appended to the manifest; **verified pre-count 46 → 52**. LA-scoped naming (§7.4). EN only; ES deferred.
- **(D) Cron pin** is the broker's operator action (§2.4) — not touched here. Revision read is the hard-coded `COVER_SHEET_REVISION` constant (§7.2 fallback; the cron snapshot lives on the broker's scheduling layer, not runtime-readable from the app).

## §2 — §4 day-count directive — fold/flag

- **Engine fixed + unit regression present (verified):** `lib/dates/computeCompliancePeriod.test.ts` asserts `service 2026-06-30 → expiration 2026-07-06` and `countedDays` skips `2026-07-03`; `lib/dates/intendedServiceDate.test.ts` asserts the same; `lib/dates/holidays.test.ts` asserts `2026-07-03` present ("THE defect date"). The §3.5 defect is fixed and CI-guarded. ✓ (§4.1 + §4.2 satisfied.)
- **FLAGGED (§4.3):** a synthetic named `SC-DAYCOUNT-JUL2026` is **not present in the A14 synthetic-harness catalog** (`scripts/synthetic/` holds only the retry/queue synthetics). The engine-level regression is covered by the unit suite above (runs on every CI touching the day-count engine), but the end-to-end A14 catalog entry the cover-sheet ruling §6 named does not exist under that name. **Flagged, not silently deferred** — filed in the fast-follow tracker. Not folded into PR-C because the A14 harness is a distinct subsystem (mirror-queue retry), and adding a produce-level day-count synthetic there is its own slice.
- **Clifton Alexander DO NOT SERVE** (standing operator item): the engine is fixed, so a regenerated notice computes the correct `2026-07-06` expiration. The standing item remains the broker's to lift per cover-sheet ruling §3.6 (regenerate + re-verify the specific notice); PR-C does not lift it.

## §3 — Deviations (as-built parity, §10)

1. **LA-eligibility signal = `produce_audit` presence.** The riskpath row does not store the jurisdiction verdict; `produce_audit` is written only for a confirmed_la produce with a recorded LAHD ack (§5.2), so its presence is the durable "this is an LA notice" signal. The LAHD section renders for exactly the LA-produced-and-acked rows — matches §7.4's intent. **Dependency:** requires migration `034` applied (produce_audit column).
2. **Cover-sheet blanks.** Date-served / monthly-rent / APN / bedrooms / tenant-contact are not persisted on the row (serviceDate is excluded from `produce_snapshot`; only a total amount is captured), so they render blank for the owner to complete — anti-defaulting, not fabricated.
3. **Revision constant.** `COVER_SHEET_REVISION = 'Rev 2.6.2026'` hard-coded per §7.2 (cron snapshot is the broker's layer, not app-runtime-readable).
4. **ES deferred** — same posture as Lane 2E / PR-B.

## §4 — Evidence

- **`lahdFilingRecord.test.ts` 8/0** · **`lahdCoverSheet.test.ts` 13/0** (pre-fill + APN/Declaration blank + PO box + revision + empty-input). **30 suites / 0 failed.** **tsc clean.**
- **locked-prose guard PASS** (Shape-A **52**; 106 across both manifests; no dangling refs) · **CI review-produce parity PASS** · **banned-terms clean** (LAHD copy + cover-sheet HTML in scope).
- **Integration tests deploy-run** (record endpoint writes; row section renders/records; cover-sheet route serves) — filed in the fast-follow tracker, same posture as PR-B.

## §5 — Operator + sequencing (§9)

1. **Apply migration `036`** (DB) before/with merge (owner filing-record writes depend on the table). Rollback in the migration header.
2. **Broker:** add `eviction_filing_cover_sheet` to cron `0abb46c4` pinned-forms (Rev 2.6.2026 baseline) — §2.4 operator action.
3. Countersign → **PR-C merges**. **PR-C is the last item in the PR-A3→PR-C arc.**

## §6 — Deferred (fast-follow tracker)

(C) 3-business-day deadline computation (unblocks on the LA city business-day calendar pull); filed-PDF/receipt evidence upload (own compliance-surface ruling); non-LA jurisdiction filing blocks (supplemental-docs matrix slice); `SC-DAYCOUNT-JUL2026` A14 synthetic-catalog entry; PR-C surface integration tests.

— Engineering · 2026-07-01
