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

## Notes

- These are UI-integration seams. The compliance-critical write paths (ack insertion, produce-audit validation,
  `produce_snapshot` durable write) are already unit-tested and/or CI-parity-guarded; this tracker closes the
  integration-seam gap, not a compliance-artifact gap.
- Prereq for items 1–3: migration `035` applied. Prereq for item 4: migration `034` applied.
- When a slice lands these, cite this tracker in that slice's attestation and mark the row DONE.

— Engineering · 2026-07-01
