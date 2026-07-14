# FF-3 On-Call Runbook Addendum — 2026-07-13

Extends `gate3_forkE1_oncall_runbook_2026-07-02.md` with FF-3-specific incident classes for the Preview soak and the
Production activation. Authorized by `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.5
(including the three broker-added Sev classifications). The parent runbook's on-call model (§1), triage steps (§4),
and rollback mechanics (§5, broker-executed §4.13) apply unchanged; this addendum adds the FF-3 severity rows and
the FF-3-specific containment.

---

## §1 · FF-3 severity classifications (maps onto parent §2 matrix)

| Sev | FF-3 incident class | Signal / detection | Response |
|---|---|---|---|
| **Sev-1** | **Produce-gate chain silently skips a disposition write** (correctness-critical — a reconciliation halt / FMR block / W6 block does not persist and produce proceeds anyway) | `compliance_gates` row missing for an evaluated node; produce succeeded on a session whose chain should have halted; §1.2 chain-traversal synthetic asserts one row per node | Immediate. Contain via §3 flag rollback. This is the FF-3 analogue of a produced-face defect. |
| **Sev-2** | **Reconciliation-gate 500s** (`/api/notice/produce/from-chat` erroring in the FF-3 seam) | Sentry FF-3 500 rate; §1.2 reconciliation-gate 500-detection synthetic | Same day. Root-cause + fix PR; if attributable to FF-3, file the Sev-2 remediation note the soak policy (ruling §1.1) requires. |
| **Sev-2** | **`/admin/ff3-review` unreachable while awaiting-review items exist** (broker cannot resolve holds; owners stuck in held state) | `loadAwaitingReview` returns rows but the page 404s/500s; broker report | Same day. Owners are blocked mid-flow. Check `ADMIN_EMAILS` + `currentAdmin()` + the surface deploy. |
| **Sev-3** | **`ff3_resume_scope_mismatch` spike** (client/replay bug signal, or owners editing after authorization) | §1.2 anomaly monitor > threshold (see §2 baseline) | Within the week. Engineering diagnostic memo per ruling §1.1(4). Does not auto-break soak. |
| **Sev-3** | **`ff3_resume_already_consumed` spike** (replay / double-submit / client bug) | §1.2 anomaly monitor > threshold | Within the week. Diagnostic memo. |
| **Sev-3** | **Awaiting-review backlog with no broker action > 48h** (holds accumulating, owners waiting) | Count of `reconciliation_resolution='broker_review' AND broker_resolution_note IS NULL` rows older than 48h | Within the week. Broker-workflow signal, not a code defect — nudge broker to work the queue. |
| **Sev-3** | **Locked-prose guard failure on FF-3-scoped assertions during soak** (a manifest/entry drift on entries 13/14/held/pause/continue-only) | `ci:verify-locked-prose` failing specifically on an FF-3 key | Within the week. **Soak-continuation implication:** a locked-prose change during soak triggers the ruling §1.1(5) amendment-ratification path; the amendment ruling states whether the soak clock continues or resets. |

**Default-up rule (inherits parent §2):** anything that could change what an owner sees on a produced notice, or that
lets produce proceed past a halt that should have stopped it, is Sev-1.

## §2 · Anomaly thresholds for the two Sev-3 rate signals (ties to ruling §1.1(4))

`ff3_resume_scope_mismatch` and `ff3_resume_already_consumed` are **failure signals**, so their healthy rate ≈ 0 and a
naive "3× baseline" trips on the first event. Volume-gated dual method (formalized in the §1.2 monitoring parity
attestation):

- **Low-volume regime** (total `/api/chat/ff3/resume` calls in the 24h window < **N=20**): absolute thresholds —
  `scope_mismatch > 5/24h` **or** `already_consumed > 2/24h` → diagnostic memo.
- **Sufficient-volume regime** (≥ N): the ruled **> 3× rolling-7-day-median over any 24h window**.
- Always report the anomaly count alongside the total resume-call denominator so a "spike" can be distinguished from
  small-sample noise.

## §3 · FF-3 containment / rollback (broker-executed, §4.13)

- **Primary rollback:** flip `FF3_CAPTURE_ENABLED=false` in the affected scope (Preview during soak; Production
  post-flip). The produce-gate chain returns the `skip` disposition and the whole FF-3 surface goes dark with no
  owner-facing change — this is the exact behavior the §1.3 rollback drill proves. No code deploy needed; env change
  + redeploy.
- **Admin-surface issue** (`/admin/ff3-review` down): verify `ADMIN_EMAILS` in the affected scope + the deploy;
  owners in held state are unblocked once the broker can resolve again. Owner data is safe (held state persists).
- **Never** leave `E2E_RUN_ACTIVE` / `FF3_RESUME_SECRET` test values in a non-Preview scope.

## §4 · GA-transition revisit

Inherits parent §7 — this addendum re-opens with the parent runbook on the GA transition (client-side capture CX-1,
paging/alerting for a larger base). Until then, solo/broker-primary stands for FF-3 too.

— Engineering (FF-3 on-call addendum) · 2026-07-13 · for Broker Compliance Review, Jack Taglyan / CalDRE B9445457
