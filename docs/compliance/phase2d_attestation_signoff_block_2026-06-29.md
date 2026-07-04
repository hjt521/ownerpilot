# Phase 2D — Attestation Sign-Off Block (§0.B engineering + §4 + §5)

**Drop-in for:** `la_phase2d_production_attestation_2026-06-29.md`
**Date:** 2026-06-29
**PR:** hjt521/ownerpilot #100 — `feat(la-phase2d): wire LA notice production behind PHASE2D_ASSEMBLY_ENGINE_WIRED`
**Branch:** `workstream-b/la-phase2d`
**Build under test (pre-squash branch HEAD):** `8bc7ed9c989076e2504c15dee80f43f99670abc8`
**Parent rulings:**
- `la_phase2d_production_attestation_2026-06-29.md` (this packet)
- `phase2d_env_driven_flag_mechanics_addendum_ratification_broker_ruling_2026-06-29.md` (env-var name + flip mechanics)
- `decision2_carve_out_from_phase2d_release_broker_ruling_2026-06-29.md` (scope)
- `phase2d_test_c_address_swap_broker_ruling_2026-06-29.md` (Test C address)
- `fetch_binding_regression_guard_broker_ratification_2026-06-29.md` (regression guard) + spec `docs/compliance/fetch_binding_regression_test_spec_2026-06-29.md`

---

## §0.B — Engineering self-check (completed)

All items verified on the build under test (`8bc7ed9`) and its preview deploy.

- [x] `_hashgen.mts` removed from tree (absent host-side; not in any commit)
- [x] Phase 2D PR opened (own PR, no unrelated work) — **PR #100**. Decision 2 + GA4 carved out per the carve-out ruling.
- [x] Pre-squash branch HEAD SHA: `8bc7ed9c989076e2504c15dee80f43f99670abc8`
- [x] Merge commit SHA on `main`: `5942d7b84564a934d9e5c35dd1b7bf57b1ee0584` — **deviation note:** merged as a regular merge commit (13 commits), not the ratified squash. Code on `main` is identical to the reviewed branch HEAD `8bc7ed9`; the fetch-binding post-mortem lives in the committed spec `docs/compliance/fetch_binding_regression_test_spec_2026-06-29.md` rather than the squash commit body. Non-blocking, recorded for the record.
- [x] Post-commit RTC PDF SHA re-verification (git object store == locked baselines):
  - [x] English `d0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a`
  - [x] Spanish `947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371`
- [x] `.gitattributes` `*.pdf binary` rule present; `git check-attr` shows `binary: set` on both PDFs
- [x] `next.config.ts` `outputFileTracingIncludes` covers `lib/rtc/packet/**`
- [x] Flag ON in test env: **`NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED=true`** (Preview, branch-scoped to `workstream-b/la-phase2d`). Note the env-var name carries the `NEXT_PUBLIC_` prefix per the env-flag mechanics addendum.
- [x] Flag confirmed **absent from production** env (prod inlines `false`) — verified via `vercel env ls production`
- [x] Predicate gate **OPEN** in every build (code constant `LA_PRODUCTION_DEPENDENCIES`, all six predicates `true`, committed)
- [x] Preview URL (branch alias): `https://ownerpilot-git-workstream-b-la-phase2d-jt-s-projects3.vercel.app`
- [x] Locked prose: 6 Phase 2D entries only; `ci:verify-locked-prose` PASS (9 constants, no dangling refs)
- [x] Fetch-binding regression guard live: `ci:verify-fetch-binding` PASS; 3 runtime binding suites green (`boundFetch`, `jurisdictionBridge.binding`, `laProduceClient.binding`); CI workflow `fetch-binding-lock.yml` added
- [x] Test suites: **76 suites, 0 failed** (incl. the 3 new binding suites); `tsc --noEmit` clean
- [x] PR #100 CI: **all 11 checks green** — `ci/test-and-typecheck`, `locked-prose-lock`, `system-prompt-lock`, `verify-classifier-lock`, `verify-edge-core-sync`, `verify-geocode-failure-event`, `verify-no-live-cliff`, `verify-no-operator-secrets`, `verify-parcel-health-core-sync`, `fetch-binding-lock`, Vercel deployment (run IDs: see PR #100 → Checks)

### §0.B.1 — Material callout: the squash ships an UNFLAGGED production fix

The squash-merge to `main` carries **two** production changes, only one of which is gated by the flag:

1. **Flagged (dormant in prod until §5 flip):** the Phase 2D assembly engine — verify-la/la-packet endpoints, `LaProducePanel`, supersession `cleared_la` path, RTC packet. Gated by `NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED` (absent in prod → `false`).
2. **UNFLAGGED — ships live on merge:** the fetch-binding fix in `components/notice-flow.tsx` (jurisdiction bridge) + the shared `lib/http/boundFetch.ts`. This is **not** behind the flag and takes effect the moment Vercel redeploys `main`.

Production behavioral consequence, by phase:

- **Before merge:** every LA address on prod falls to `resolution_failed` ("couldn't verify jurisdiction") — caused by the bridge-side `Illegal invocation`.
- **After merge, before flag flip:** LA addresses correctly resolve to `confirmed_la` and render the **gated NOT_YET_AVAILABLE block** (produce path still off, flag false). Non-LA addresses resolve and route to the normal print path as today.
- **After flag flip (§5):** produce panel + LAHD prompt + RTC EN/ES downloads go live for `confirmed_la`.

This is a desirable fix to a pre-existing production bug, **not** a new risk surface — but it is a real production behavior change at merge time, independent of the flag flip, and the §5 monitoring window therefore starts at **merge**, not at flag flip (see §5 two-phase plan).

*Engineering self-check executed on `8bc7ed9`. CI gap that hid the original bug (tests inject a stub fetch with no receiver requirement) is closed by the Layer A static guard + Layer B runtime binding suites.*

**Engineering signature:** JT — engineering executor  **Date:** 2026-06-29

---

## §1 — Test A–D results (live + unit coverage)

| Test | Address | Expected | Result |
|---|---|---|---|
| A | 5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038 | `confirmed_la` → produce panel + LAHD + RTC EN/ES | ✅ PASS (live, preview) |
| B | 1200 Wilshire Blvd, Los Angeles, CA 90017 | `confirmed_la` → produce panel + LAHD + RTC EN/ES | ✅ PASS (live, preview) |
| C | 2600 Wilshire Blvd, Santa Monica, CA 90403 | `not_la` → no LA overlay, no LAHD, no RTC | ✅ PASS (live, preview) — see §4 note |
| D.1 | flag OFF, 5537 La Mirada | legacy NOT_YET_AVAILABLE block, no produce | ✅ PASS (live; flag removed → rebuilt → confirmed → restored) |
| D.2 | predicate gate closed → 409 NOT_YET_AVAILABLE | engineering-induced | ✅ Covered: `laProduceGate` 10/10, `supersession` 16/16 |
| D.3 | SHA mismatch → 409 ATTACHMENT_FAILED | engineering-induced | ✅ Covered: `loadCurrentPacket` 6/6, `laProduceGate` 10/10 |
| D.4 | audit row on every 409 | engineering-induced | ✅ Covered: `laProduceServer` 10/10, `laPacketDelivery` 6/6 |

Independent jurisdiction corroboration (per `phase2d_test_c_address_swap` + the Perplexity ground-truth check): A/B = City of LA, C = City of Santa Monica — matching the `geocode_dispositions` rows (`confirmed_la`/`confirmed_la`/`not_la`).

---

## §4 — Anomalies / deviations

| Item | Severity | Notes |
|---|---|---|
| Test C Santa Monica render | [CONSIDER] | For `2600 Wilshire Blvd, Santa Monica` the resolver correctly returns `not_la` and the **LA overlay does not engage** (no `LaProducePanel`, no LAHD prompt, no RTC) — the substantive Test C assertion. Rather than plain statewide `PacketPrintOptions`, the UI shows a Santa-Monica "additional local requirements — consult a CA attorney" advisory and blocks production for that address. This is **existing product scope** (Santa Monica is not yet a supported produce target), not a Phase 2D regression. No fix required for this release; flag if SM support is later in scope. |
| Address-entry typos during testing | [INFO] | Several test runs were initially confounded by mistyped addresses (`miarada`, `537`, `90027`); each resolved correctly once the canonical address was entered. No product defect — operator entry only. |

---

## §5 — Broker determination + two-phase monitoring

`[BROKER COUNTERSIGN PENDING]`

### §5.1 — Acknowledgment of the unflagged bridge fix (sign separately from the flag-flip authorization)

> I acknowledge that the squash-merge of PR #100 ships, **unflagged and live on merge**, the jurisdiction-bridge `Illegal invocation` fix (`notice-flow.tsx` + `boundFetch`). On merge (before any flag flip), production LA addresses will stop returning `resolution_failed` and will correctly resolve to `confirmed_la`, rendering the gated NOT_YET_AVAILABLE block. The produce path remains off until §5.3. I am signing the merge with this production behavior change understood.
>
> `[BROKER COUNTERSIGN PENDING]` — Jack Taglyan / CalDRE B9445457 / Date: `[FILL]`

### §5.2 — Phase-2D readiness determination

Based on Tests A–D (A/B/C/D.1 live PASS; D.2–D.4 unit coverage) and all engineering §0.B items:

☐ **READY FOR FLAG FLIP** — `[BROKER TO CHECK]`
☐ **NOT READY** — `[BROKER TO CHECK]`
☐ **CONDITIONAL READY** — `[BROKER TO CHECK]`  (note the §4 [CONSIDER] is non-blocking)

`[BROKER COUNTERSIGN PENDING]` — Jack Taglyan / CalDRE B9445457 / Date: `[FILL]`

### §5.3 — Production flip authorization (only if READY / CONDITIONAL READY)

- Flip mechanism (env-flag addendum): `vercel env add NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED true` on **production** → redeploy → verify produce panel renders for an LA address on `ownerpilot.ai`. **Executed:** env-var added to Production (sensitive `n`), then redeployed via the Vercel dashboard with **"Use existing Build Cache" unchecked** (required — `NEXT_PUBLIC_` is build-time inlined).
- **Authorized flip deploy ID:** `dpl_64q38PAmVRXcBKKtCDCGNuXSDnDp` (redeploy of merge deploy `dpl_GSkNaHSyGVqVHAQnWvVYWiWZ5U2z`, commit `5942d7b`; URL alias `ownerpilot-1ewt4mpsx-jt-s-projects3.vercel.app`)
- **Flip env-change / redeploy READY timestamp:** 2026-06-29 18:51:03 UTC (merge redeploy was 17:53:34 UTC → Phase 1 observed 57.4 min before flip, ≥ 30-min minimum)
- Authorized by: Jack Taglyan / CalDRE B9445457 (broker countersigned READY FOR FLAG FLIP, conditional on clean Phase 1 — condition met). Flip executed by JT (engineering executor, broker-authorized).
- **Live flip verification (ownerpilot.ai, `5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038`):** produce panel renders in Safari + Chrome; LAHD 3-business-day prompt renders (authority LAMC §§151.09.C.9, 165.05.B.5); ack-checkbox interlock holds (RTC downloads + printable packet gated behind ack); served EN RTC PDF SHA-256 `d0653950…beb5f7a` **== locked baseline** (byte-identical, no SHA drift / no `ATTACHMENT_FAILED`).

### §5.4 — Two-phase monitoring (window STARTS AT MERGE, not at flag flip)

**Phase 1 — merge → flag flip (the unflagged bridge fix is live)** — COMPLETE, all green, 57.4 min observed (17:53:34 → 18:51:03 UTC):
- [x] `resolution_failed` rate on prod drops materially after merge (the `Illegal invocation` is gone) — LA addresses resolve `confirmed_la` post-merge
- [x] LA addresses render the gated NOT_YET_AVAILABLE block correctly (pre-flip, flag false)
- [x] Non-LA addresses unaffected — normal statewide print path
- [x] No unexpected 500s from the resolver/geocode route in prod logs

**Phase 2 — flag flip → flip + 72h (produce path live)** — flip anchored at 2026-06-29 18:51 UTC:
- [ ] +24h checkpoint — due 2026-06-30 18:51 UTC
- [ ] +48h checkpoint — due 2026-07-01 18:51 UTC
- [ ] +72h checkpoint — due 2026-07-02 18:51 UTC (final sign-off ruling closes the release)
- [ ] Produce-panel success rate; LAHD ack-checkbox interlock holds (no print/download before ack)
- [ ] RTC EN/ES download success; **no** `ATTACHMENT_FAILED`
- [ ] Audit rows carry `rtcFormHashes` on every `confirmed_la` produce; no PII leakage
- Rollback trigger (any one): unexpected 500 from verify-la/la-packet; SHA mismatch flagged by `loadCurrentPacket`; audit row missing `rtcFormHashes` on a `confirmed_la` produce; tenant-defense escalation traced to a Phase 2D produce
- Rollback action (env-flag addendum): `vercel env rm NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED production` → redeploy → verify legacy NOT_YET_AVAILABLE renders. (~minutes, build-time inlined; the prior deploy serves during rebuild.)

---

— Engineering sign-off block prepared 2026-06-29 · broker countersign pending
