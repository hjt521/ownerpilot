# Deploy-Run E2E — Fast-Follow Tracker

Purpose: keep the deploy-run integration tests that were accepted-with-condition on merged surfaces from
becoming permanent unattested corners. Each item was flagged (not claimed) at merge; each must land in the
next deploy-run E2E slice (Group-5 or equivalent) covering `/chat/review` and `/riskpath`.

Governing rulings:
- `pr_b_staleness_countersign_broker_ruling_2026-07-01.md` §3 (deploy-run acceptance + condition).
- `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (produce-audit persistence).

## Open items

| # | Surface | Assertion (deploy-run) | Source | Status |
|---|---------|------------------------|--------|--------|
| 1 | PR-B Surface 1 (`/chat/review` Generate) | On a drifted re-produce, the ratified staleness warning renders; ack → `/staleness-ack` (`proceed_to_reproduce`) → a new riskpath row is produced with the acknowledgment recorded. No-drift re-produce shows no warning. | `pr_b_staleness_attestation_2026-07-01.md` §4; countersign §3 | OPEN |
| 2 | PR-B Surface 2 (`/riskpath` dashboard) | A drifted row renders the banner; Dismiss → `/staleness-ack` (`dismiss_banner`) is written and the banner hides. A fresh row renders no banner. A row lacking `produce_snapshot` renders the §4.4 fallback. | same | OPEN |
| 3 | PR-B ack endpoint (`POST /api/notices/[riskpathId]/staleness-ack`) | Writes `staleness_acknowledgments` correctly for each of `proceed_to_reproduce` / `dismiss_banner` / `cancel_at_generate`; 404 for a non-owner riskpath. | same | OPEN |
| 4 | §5.2 produce-audit (`LaProducePanel.onAudit` on the chat path) | LAHD-ack on a confirmed_la produce fires `POST /api/notices/[riskpathId]/produce-audit` and the resulting `produce_audit` matches the wizard's `laProduceAudit` shape. | `pr_a3_produce_audit_fastfollow_attestation_2026-07-01.md` §4 | OPEN |
| 5 | PR-C LAHD filing section (`/riskpath` row) | Eligible (LA) row renders the LAHD section; "I filed" → `POST /api/notices/[riskpathId]/lahd-filing-record` writes; the row then shows "Filed on [date] via [channel]". Non-eligible rows show no section. | `pr_c_lahd_checklist_attestation_2026-07-01.md` §4 | OPEN |
| 6 | PR-C cover sheet (`GET /api/notices/[riskpathId]/lahd-cover-sheet`) | Owner-scoped; serves the pre-filled cover-sheet HTML for an owned row; 404 for a non-owner row; APN/Declaration blank. | same | OPEN |

## Non-E2E deferred items (PR-C omnibus §6 / §4)

- **`SC-DAYCOUNT-JUL2026` A14 synthetic-catalog entry — DONE (2026-07-01).** `scripts/synthetic/sc_daycount_jul2026.ts` asserts service `2026-06-30` → expiration `2026-07-06` end-to-end (day-count engine + verified holiday table + `renderNotice` + `buildNoticeDocumentHtml` rendered face; also asserts the face does NOT print the `2026-07-02` defect). No DB. Runs on every PR + push to main via `.github/workflows/daycount-synthetic.yml` (job `synthetic-daycount-jul2026`) and `npm run synthetic:daycount:jul2026`. 5/0. Cover-sheet ruling §6 [MUST FIX] closed. (Broker may add `synthetic-daycount-jul2026` to branch-protection required-checks.)
- **(C) 3-business-day deadline computation** — blocked on the LA city business-day calendar pull (2026-06-18 §7); adds a computed date to the LAHD section when it lands.
- **Filed-PDF / receipt-number evidence upload** — distinct compliance-surface class (storage/access ruling); PR-C ships owner-attested status only.
- **Non-LA jurisdiction filing blocks** — parallel `chat<Jurisdiction>Filing*` copy per the supplemental-docs matrix.

## Notes

- These are UI-integration seams. The compliance-critical write paths (ack insertion, produce-audit validation,
  `produce_snapshot` durable write) are already unit-tested and/or CI-parity-guarded; this tracker closes the
  integration-seam gap, not a compliance-artifact gap.
- Prereq for items 1–3: migration `035` applied. Prereq for item 4: migration `034` applied.
- When a slice lands these, cite this tracker in that slice's attestation and mark the row DONE.

— Engineering · 2026-07-01
