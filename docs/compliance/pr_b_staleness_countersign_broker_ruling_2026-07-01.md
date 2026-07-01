# PR-B — Serve-Time Stale-Facial-Dates Guard (Broker Countersign)

**Re:** `pr_b_staleness_attestation_2026-07-01.md` (engineering, 2026-07-01)
**Parent rulings:**
- `pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md` (Modified Option B+)
- `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 + §3 (produce-audit persistence + CI parity guard precedent)
- `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` §8 (as-built parity rule of construction)

**Disposition:** COUNTERSIGNED. One operator-side directive on migration `035` (§4). Integration surface-firing tests confirmed acceptable at deploy-run posture (§3).

---

## §1 — Countersign

**Countersigned.** Every dimension of the Modified Option B+ ruling is present in the wired mechanism:

1. **Fork 1 → 1A durable persistence.** Migration `035_staleness_guard.sql` adds `produce_snapshot jsonb` on `riskpath_records`; `from-chat` writes `captureProductionSnapshot(toNoticeFlowData(...))` at produce; the guard reads from `produce_snapshot`, not from derive-on-the-fly. CI parity extension asserts all three of the durability requirements from §3.1 of the parent ruling. Correct.
2. **Surface 1 — warn-then-require-new-row.** Pre-insert drift check returns `409 stale_notice` when a drifted-and-not-yet-acknowledged prior row exists; owner sees the ratified warning + ack button; ack POSTs `/staleness-ack` with `proceed_to_reproduce`; re-produce inserts the new row with `acknowledgedStaleness=true`. Never silent, never hard-block. Matches §4.1 verbatim.
3. **Surface 2 — riskpath row banner.** GET `/api/riskpath` returns per-row staleness verdicts computed via `checkStaleness` against each row's `produce_snapshot`; dashboard banner renders the ratified warning on drift + "Review & produce a new notice" link + Dismiss → `/staleness-ack` `dismiss_banner`. §4.4 transitional fallback wired for rows lacking `produce_snapshot`. Matches §4.2.
4. **§5 acknowledgment as compliance artifact.** `staleness_acknowledgments` insert-only child table + `POST /api/notices/[riskpathId]/staleness-ack` endpoint, owner-scoped, validated `action_taken` ∈ {`proceed_to_reproduce`, `dismiss_banner`, `cancel_at_generate`}. Called by both surfaces. Records the six-field artifact per §5.1. Correct.
5. **§6 locked-prose blocks — all three appended.** `chatStalenessWarningAmountChanged`, `chatStalenessWarningFaceChanged`, `chatStalenessAckButton`. Flat literals, one `{{changedFields}}` slot, real em-dash, no LLM in the branch-selection path. Manifest count verified (§2 below).
6. **Wizard engine reused verbatim.** `evaluateStaleness` and `captureProductionSnapshot` unwrapped, unmodified. No field add/remove. §5 non-changes confirmed intact — wizard `serve-track.tsx` and `notice-flow.tsx` untouched; §5.2 produce path untouched except the added pre-insert gate and `produce_snapshot` write.
7. **CI parity check extended, not duplicated.** Rides the existing required `verify-review-produce-parity` check — no new branch-protection entry required, which is the correct engineering call (the check name is already Required). This means no separate Path α action is needed for PR-B; the parity coverage lands with the merge.

**Evidence bars cleared:** `stalenessCheck.test.ts` 8/0 · `stalenessAck.test.ts` 7/0 · 15 lib/chat + lib/riskpath suites / 0 failed · tsc clean · CI parity guard PASS (extended) · locked-prose guard PASS (100 across both manifests) · banned-terms clean.

## §2 — Manifest count reconciled

Engineering verified pre-PR-B Shape-A count at **43** against the live file — matches the ruling's assumption; no correction needed this time. Post-append: **46**. This applies the same discipline the Lane 2E attestation used to correct "8/11" → 10, and the discipline held. Correct posture; keep it going forward for every manifest-touching PR.

## §3 — Deploy-run integration coverage — ACCEPTED, with condition

Engineering flagged §4 honestly: unit coverage (helper reuse, ack validator) is in-repo; the integration surface-firing tests (Surface 1 warn on drifted re-produce; Surface 2 banner; ack endpoint writes) are **deploy-run**, matching the Group-5 E2E posture.

**Ruling: acceptable for this merge.** Rationale:

1. **Pure-logic + CI parity guard covers the drift risk for this pass.** The `checkStaleness` reuse, the reason→copy branch, the ack validator, and the CI parity guard together bar the most likely regression paths (engine unwrapping, durable-vs-derive drift, copy-branch inversion). None of those can be broken silently.
2. **Group-5 E2E precedent holds.** This is not a new deferral — it is the established posture for integration coverage on merged surfaces, and engineering flagged rather than claimed live coverage. That flagging discipline is exactly the anti-defaulting posture I want preserved.
3. **The compliance-critical write paths ARE covered:** `staleness_acknowledgments` insertion is unit-tested; `produce_snapshot` write is exercised through the CI parity guard's assertion that the durable persistence path runs on `from-chat`. The gap is at the UI-integration seams, not at the compliance-artifact seams.

**Condition on this acceptance:** the deploy-run integration tests for Surface 1, Surface 2, and the ack endpoint must be added to whatever deploy-run E2E suite (Group-5 or equivalent) covers `/riskpath` and `/chat/review` on the next E2E slice. Not a PR-B blocker; a required follow-up so this doesn't become a permanent unattested corner. Engineering: file the deferred-E2E items in the workspace fast-follow tracker so they don't drop off. Same posture as the produce-audit fast-follow tracking.

## §4 — Operator directive: migration `035` application

**Confirmed operator action.** Migration `035_staleness_guard.sql` must be applied to the Supabase production project (`txpetdrfsmqnyooydmas`) **before or with** the PR-B merge. Two DDL objects land in the same migration:

1. `produce_snapshot jsonb null` on `riskpath_records`.
2. `staleness_acknowledgments` insert-only child table with owner-read RLS.

### §4.1 — Sequencing (my Path α action)

The two acceptable sequences:

- **(a) Apply migration first, then merge PR-B.** Preferred. The runtime code lands on a schema that already has `produce_snapshot`; every new produce writes the column; every riskpath read returns the staleness verdict. No inconsistent-state window.
- **(b) Apply migration in the same operator window as the merge.** Acceptable if the merge and the migration application are close together in time (minutes, not hours). Between merge and migration, `from-chat` produce would attempt to write a column that doesn't exist yet, which fails the produce entirely — that is safer than silently succeeding, but it does block owners during the gap.

**Not acceptable:** merge PR-B, then defer the migration. The runtime code assumes the schema exists.

I'll execute (a) as part of the Path α env-provisioning window that's already in flight. Engineer: after I confirm migration applied on production, then countersign-triggered merge.

### §4.2 — Preview environment

Same migration must be applied to the Supabase preview project first (assuming preview shares a separate Supabase project — engineer confirms which). If preview shares a schema branch with production, this is one action; if preview is a separate project, apply preview first, run CI/deploy-run coverage against preview, then apply production. Engineer's call on the branching, but the preview-first ordering is required.

### §4.3 — Rollback posture

Migration `035` is additive (new column with `null` default; new table). Rollback = `DROP TABLE staleness_acknowledgments; ALTER TABLE riskpath_records DROP COLUMN produce_snapshot;`. Both are non-destructive of the existing rows (produce_snapshot is null on any pre-migration row and the guard's §4.4 fallback handles that). Engineer includes the rollback SQL in the migration file's header comment.

## §5 — §3 deviations disposition (as-built parity)

All four deviations from the attestation §3 reconcile under §9 (as-built parity rule of construction). None are compliance-behavior divergences.

1. **`{{changedFields}}` label source.** `evaluateStaleness` already returns human-readable labels — no separate mapper needed. Shape reconciliation. RATIFIED.
2. **Surface 2 home = dashboard list row (no `/riskpath/[id]` route).** The parent ruling §4.2 explicitly allowed engineer's choice on placement; "smallest surface that fires the guard" is the correct minimum. RATIFIED.
3. **Surface 2 comparison serviceDate placeholder.** `toNoticeFlowData` requires a serviceDate to assemble, but `serviceDate`/`serviceMethod` are excluded from `evaluateStaleness` (per `lib/flow/escalation.ts`), so the placeholder does not affect the verdict. Shape reconciliation. RATIFIED — but engineer: add a comment on the placeholder line citing "does not affect verdict; see evaluateStaleness excludes" so a future refactor doesn't accidentally propagate the placeholder into a comparison path.
4. **ES deferred.** Same posture as Lane 2E entityType; ES flagged, not fabricated. RATIFIED.

## §6 — Sequencing after this countersign

1. **I apply migration `035` to preview → production** (Path α action; happening in the env-provisioning window already in flight).
2. **PR-B merges to main.**
3. Extended CI parity guard runs on every subsequent PR via the existing required check (no branch-protection change needed).
4. Engineer files deferred-E2E items (Surface 1 warn, Surface 2 banner, ack endpoint) in the fast-follow tracker per §3 condition.
5. **PR-C opens** on PR-B merge. LAHD checklist + cron scope unchanged.

## §7 — Standing rules reaffirmed

- **Anti-defaulting discipline held.** ES not fabricated. Label mapper not invented (reused existing). Column not silently added to the wizard's snapshot type.
- **As-built parity (§9)** covered all four shape reconciliations without a fresh ruling.
- **Manifest count discipline held** — attestation verified against the live file rather than deferring to the earlier ruling figure.
- **Deploy-run integration coverage** is acceptable when (i) unit + parity guard cover compliance-critical write paths, (ii) engineering flags rather than claims, (iii) the deferred items are tracked as fast-follows. All three conditions met here.

## §8 — Operator items (updated)

- Path α env provisioning §3.2 — in progress.
- **Migration `035` — my action; sequenced (a) before merge.**
- Branch protection — no PR-B action required (extension rides existing Required check).
- Prior standing items unchanged (Clifton Alexander no-serve; cron `0abb46c4` LAHD forms pinned-forms edit).

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
