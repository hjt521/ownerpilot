# PR-A3 §5.2 Core — Countersign + Open-Items Direction (Broker Ruling)

**Re:** `pr_a3_5_2_core_attestation_2026-07-01.md` (engineering, 2026-07-01)
**Parent rulings:**
- `pr_a3_produce_handoff_fork_ruling_2026-07-01.md` (Fork B(ii) client rail-caller + Fork A(iii) client verdict resolution)
- Option 2 scope-of-build ruling (operator, 2026-07-01, in-conversation)
- `broker_status_and_decision_request_omnibus_broker_ruling_2026-07-01.md` (D1: client-render preserved)
- `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` (§8 as-built parity rule of construction)

**Disposition:** COUNTERSIGNED. Two open items ruled inline; both are fast-follow, neither blocks §5.2 core merge.

---

## §1 — Countersign

**Countersigned.** The wired mechanism matches every dimension of Fork B(ii) + Fork A(iii) as ruled, and the scope matches Option 2 as ruled:

1. **Wizard-parity is structural, not aspirational.** `buildNoticeDataFromEnvelope` calls the same `toNoticeFlowData` the wizard calls. `runJurisdictionResolution` is the wizard's resolver, not a client re-implementation. `LaProducePanel` is reused as-is. `renderNotice` + `buildNoticeDocumentHtml` are the shared surface. This is the correct shape for Fork B(ii) / Fork A(iii) and matches D1 (client-render preserved).
2. **CI guard `verify_review_produce_parity.mjs` enforces the parity going forward.** This is the right instrument — it prevents the parity from silently drifting on a future refactor. See §3 below for the ops directive.
3. **No-defaulting discipline holds.** `buildNoticeDataFromEnvelope` throws on missing `serviceDate` rather than defaulting. Same posture as the day-count, produce-completeness, and Lane 2E entityType work. Asserted in test (`reviewProduce.test.ts` case). Correct.
4. **Green-path facial dates verified.** 2026-06-30 personal → 2026-07-06 asserted. This is the same day-count discipline PR-A2 landed. Consistent.
5. **Verdict routing is complete.** `confirmed_la`, `not_la`, `manual_review`, `resolution_failed`, `no-address`, `abort`, `gate_closed` — all seven verdicts route correctly with `data-testid` per reason. Asserted in test. Correct for Option 2.
6. **Broken GET-navigation → POST fixed.** The prior 405 was a latent defect; the rewire is the right fix, and it lands on the same PR as the mechanism change — appropriate because the two are inseparable.
7. **§1.6 posture correctly asserted.** No behavioral divergence from the server rail found. Shape reuse is not a behavioral change. tsc-enforced type identity (`BridgeRunResult` / `NoticeFlowData`) is the right guarantor. Matches the §1.6 escalation posture I set in the Option 2 ruling.
8. **Ratified surfaces untouched** — produce rail (`verify-la`, `la-packet`, `runLaProduceSequence`, `LaProducePanel`), §5.1 `from-chat` envelope, wizard (`notice-flow.tsx`), `toNoticeFlowData`, send-draft (Group 3). §5 non-changes list confirmed intact.

**Evidence bars cleared:** `reviewProduce.test.ts` 14/0 · 12 lib/chat suites / 0 failed · tsc clean · banned-terms clean · wizard-parity guard PASS.

**Scope boundaries per Option 2:** in-scope items built; routed-but-stubbed items wired with `data-testid` + TODO citing the fork ruling §5; deferred items flagged not silently dropped. All three categories match Option 2 as ruled.

## §2 — Open item: LA produce-audit persistence — RULED

### §2.1 — Ruling: build the produce-audit endpoint. Fast-follow. Not required for §5.2 core merge.

**Rationale.** The wizard persists `laProduceAudit` (RTC form hashes + LAHD ack timestamp) into flow state. The chat path has no equivalent sink at the §5.1 boundary because §5.1 inserted the riskpath record with `noticeDocumentId: null`. Leaving `onAudit` as a no-op on production is not acceptable long-term:

1. **Compliance parity.** RTC hash + LAHD ack persistence is a compliance artifact — it's the record that the owner acknowledged the ratified LAHD packet before producing the notice. The wizard path preserves it; the chat path must too, or the two paths are not compliance-equivalent (which the wizard-parity guard would not catch, because the guard covers the render mechanism, not the audit persistence surface).
2. **Attestation trail.** The RTC-form-refresh cron (`6528bcda`) writes hashes into the workspace; the wizard path reads them into flow state at produce time; downstream reconciliation depends on both sides recording the same hash. The chat path breaks that chain if `onAudit` stays a no-op.
3. **This is not a defaulting shortcut.** Engineering correctly declined to invent a persistence sink and instead flagged the gap — same discipline as the entityType finding in Lane 2E §6. That's the right posture and I want it preserved.

### §2.2 — Design directive

Build a `POST /api/notices/[riskpathId]/produce-audit` endpoint (name is a suggestion — engineer may adjust for repo conventions). It:

1. Accepts `{ laProduceAudit: { rtcFormHashes: {...}, lahdAckAt: ISO8601 } }` in the body.
2. Authenticates against the same posture as the §5.1 `from-chat` insert (whatever RLS/service-role posture that used).
3. Writes the audit blob onto the riskpath record — either as a JSONB column on the existing record or as a child `notice_produce_audits` row keyed by `riskpath_id`. Engineer's call on the storage shape; the compliance requirement is that it's retrievable by riskpath_id and preserves the wizard's field shape (`laProduceAudit`).
4. `LaProducePanel.onAudit` on the chat path calls the endpoint with the audit blob. Wizard `onAudit` is untouched.
5. Idempotent on riskpath_id (a second call for the same riskpath overwrites, or is rejected — engineer's call, but must not silently duplicate).
6. Test coverage: unit test that the endpoint writes the blob correctly; integration test that `LaProducePanel.onAudit` on the chat path triggers the endpoint and the resulting record matches the wizard's storage shape for the same audit payload.

### §2.3 — Scope constraints for the produce-audit fast-follow

**In scope:** the endpoint, the wiring on the chat `onAudit`, tests, and any RLS/policy work needed for the endpoint.

**Out of scope for this fast-follow:** changing the wizard's persistence path, migrating existing wizard-persisted audits, expanding what's captured in `laProduceAudit`. Those are separate work if they come up.

### §2.4 — Sequencing

This fast-follow can land either:
- (a) **Immediately after §5.2 core merges** as its own PR, before PR-B opens; or
- (b) **Alongside PR-B**, if it's cleaner to bundle.

Engineer's call. Both are acceptable. It does NOT block §5.2 core merge — the no-op with a TODO is acceptable for the merge because the chat path does not silently lose the audit (it never had it in this pass; the wizard path is unaffected). The gap is documented, flagged, and now ruled.

### §2.5 — Wizard-parity guard should extend to cover this

Once the produce-audit endpoint lands, `verify_review_produce_parity.mjs` should be extended (or a sibling guard added) that fails CI if the chat `onAudit` regresses to a no-op or diverges from the wizard's persistence shape. Do not skip this — the same drift risk that motivated the render-parity guard applies to the audit-persistence surface.

## §3 — Ops directive: add `verify_review_produce_parity.mjs` to CI + required-checks

### §3.1 — Approved. Do it as part of this §5.2 core merge, not later.

The guard exists in the tree; it must run on every PR touching `lib/chat/`, `components/chat/`, `components/notice-flow.tsx`, `lib/notices/`, or any of the shared produce-rail surfaces. Leaving it as a script in the repo without CI wiring means the next refactor can silently break parity between chat and wizard renders and the countersign trail will not catch it.

### §3.2 — CI workflow addition

Add a step to the existing CI workflow (whichever `.github/workflows/*.yml` runs `tsc` + the test suite on PR):

```yaml
- name: Verify review→produce parity (chat reuses wizard surface)
  run: node scripts/ci/verify_review_produce_parity.mjs
```

Place it after `tsc` and before or alongside the test suite — engineer's call on ordering.

### §3.3 — Branch-protection required-checks (§3.3 of the D1-D5 omnibus)

Add the new check to the 17 Required guards list. Once added, `verify-branch-protection.mjs` should confirm the count moves from 17/17 to 18/18 (or the equivalent — the exact count depends on when this ruling and the environment provisioning §3.3 land). This is an operator-side action for me (Path α), not engineering; I'll fold it into the branch-protection step already in flight.

### §3.4 — What "required" enforces

Once the check is required, no PR merges to `main` without wizard-parity passing. That is the correct posture for compliance-critical structural parity. This matches the same reasoning that made the locked-prose guard required.

### §3.5 — Sequencing

CI workflow addition lands **with** §5.2 core (same PR). Branch-protection update is my Path α action once the CI check is in `main` and observed passing on at least one PR run. Do not race the branch-protection update ahead of the workflow addition — the check must exist and pass before it can be required.

## §4 — Sequencing after this ruling

1. Engineering appends the CI workflow addition (§3.2) to the §5.2 core PR (same commit or a follow-up commit on the same branch — engineer's call). Re-runs CI to confirm green.
2. **§5.2 core merges to main.**
3. I add the new check to branch-protection required-checks (Path α, my action).
4. Lane 2E §3 + §4 fast-follow lands (per the omnibus §6 sequencing) if it hasn't already.
5. Produce-audit fast-follow lands per §2.4 (before or alongside PR-B — engineer's call).
6. **PR-B opens** on the §5.2 core merged base.
7. Non-LA branch UX + broker-confirm UX + save-and-resume link land alongside PR-B (fork ruling §5 deferred items).
8. PR-C on PR-B merge.

## §5 — Standing rules reaffirmed

- **Anti-defaulting discipline held on this PR** (missing serviceDate throws; produce-audit gap surfaced not silently no-op'd forever). Preserve this pattern.
- **As-built parity (§8 rule of construction)** covered any shape reconciliations without a fresh ruling. Compliance-behavior divergences still require §1.6.
- **Structural parity guards are compliance instruments**, not niceties — treat every new one as branch-protection-eligible on first observed pass.

## §6 — Operator items (updated)

- Path α env provisioning §3.2 — in progress.
- Branch protection §3.3 — extending from the current 17 Required to include `verify_review_produce_parity.mjs` (this ruling §3.3). To be sequenced after §5.2 core merges and observed-passing CI.
- Prior standing items unchanged (Clifton Alexander no-serve; cron `0abb46c4` LAHD forms pinned-forms edit; G14 §6 closure on countersign).

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
