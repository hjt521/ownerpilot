# PR-A3 §5.2 — Produce-Audit Fast-Follow (Attestation)

**Re:** `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (ruling: build the produce-audit endpoint).
**Filed by:** engineering, 2026-07-01. Fast-follow on the §5.2-core merged base (`main` at `1d6215e`). Awaiting broker countersign.

## §1 — What was built (§2.2 directive)

- **Migration `034_riskpath_produce_audit.sql`** — adds nullable `produce_audit jsonb` to `riskpath_records`. Additive, no backfill. **⚠️ Operator must apply this migration (DB) before the endpoint can write** — apply before/with merge.
- **`lib/riskpath/produceAudit.ts`** — the wizard-shape validator. `laProduceAuditSchema` mirrors `LaProduceAuditFields` (RTC form hashes/last-modified/refresh time + LAHD copy version + LAHD ack timestamp + `isLaProductionUnblockedAtProduce` + `cachedResolverVerdictSource`) exactly, plus a **compile-time parity assertion** (`_AuditParity`) so the schema can't drift from the wizard type without a tsc failure. `produceAuditBodySchema` = `{ laProduceAudit }`.
- **`POST /api/notices/[riskpathId]/produce-audit`** — validates the body, then owner-scoped idempotent overwrite: service-role client + claimed session (same auth posture as the §5.1 `from-chat` insert), `update … where id = riskpathId and user_id = session.user_id and soft_deleted_at is null` (the `user_id` filter is the ownership gate since service role bypasses RLS). Not owner / not found → 404; invalid blob → 400; success → `{ ok, riskpathId }`.
- **Chat wiring** — `ReviewScreen` `LaProducePanel.onAudit` now POSTs the audit blob to the endpoint (`plan.riskpathId`). **The wizard's `onAudit` is untouched** (still `update({ laProduceAudit })`). `LaProducePanel` itself untouched.
- **Parity guard extended (§2.5)** — `verify_review_produce_parity.mjs` now HARD-FAILS if the chat `onAudit` regresses to a no-op (`onAudit={() => {}}`) or stops referencing the produce-audit endpoint. Same drift-instrument posture that motivated the render-parity guard.
- **`dbTypes.ts`** — `RiskPathRecordRow.produce_audit` added (keeps the hand-authored row type in sync with migration 034).

## §2 — Scope constraints honored (§2.3)

**In scope (built):** the endpoint, chat `onAudit` wiring, the validator + unit tests, the parity-guard extension, and the schema/column work. **Out of scope (untouched):** the wizard's persistence path; migrating existing wizard-persisted audits; expanding what `laProduceAudit` captures.

## §3 — Evidence

- **`lib/riskpath/produceAudit.test.ts` 9/0** — valid `LaProduceAuditFields` blob parses (typed to the wizard type); `null` hash trio allowed; missing/empty LAHD-ack rejected; non-boolean gate flag rejected; partial hash pair rejected; body `{ laProduceAudit }` valid; missing `laProduceAudit` rejected.
- **Compile-time wizard parity:** `_AuditParity` asserts the schema output is assignable to `LaProduceAuditFields` (tsc-enforced).
- **Parity guard PASS** (extended) — chat `onAudit` is not a no-op and posts to the endpoint.
- **tsc clean · 13 lib/chat + lib/riskpath suites / 0 failed · banned-terms clean.**

## §4 — Notes / follow-ups (flagged, not silent)

1. **Migration application** is an operator (DB) action — the endpoint's `update` errors until `produce_audit` exists. Sequence: apply `034` → merge.
2. **Live integration test** (chat `onAudit` → endpoint → row matches the wizard's stored shape) is deploy-run, same posture as the Group-5 E2E suite (needs the seed-session + a real riskpath row). This pass covers the drift risk via the unit test + the compile-time `_AuditParity` + the parity-guard extension; the live end-to-end assertion rides with the next deploy-run E2E pass. Flagging rather than claiming live coverage.
3. **`onAudit` is fire-and-forget** (`.catch(() => {})`) so the LAHD-ack UX isn't blocked on the write. A failed audit write is therefore not surfaced to the owner this pass. If you want a retry/surface on write failure, that's a small follow-up — flagging for your call.

## §5 — Sequencing (§2.4 / ruling §4)

Lands as its own PR immediately after §5.2 core (per §2.4 option (a)). Does not touch PR-B scope. On countersign + merge (and migration applied), the LA produce path persists a compliance-equivalent audit on both the chat and wizard paths.

— Engineering · 2026-07-01
