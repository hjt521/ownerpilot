# FF-3 Production Monitoring Parity — Attestation — 2026-07-13

Deliverable for `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.2, and the answer to its
§7 baseline-rate question. Establishes monitoring parity with parcel-health for the FF-3 stack ahead of the
production flip. Referenced by the §1.6 prod-flip attestation.

Three monitoring layers: (A) a deterministic CI canary, (B) Sentry runtime alert rules (broker-configured), and
(C) the anomaly-rate methodology for the two Sev-3 rate signals.

---

## §A · Deterministic canary (engineering-owned, in CI)

`scripts/synthetic/ff3_prod_monitoring.ts` (`npm run synthetic:ff3:monitoring`) — mirrors the SC-DAYCOUNT pattern
(no DB/Preview; runs every CI commit). **13 checks, all green** as of 2026-07-13. It asserts the invariants the
production Sev classes depend on:

- **Chain traversal / silent-skip canary (Sev-1):** a reconciliation mismatch HALTS at the reconciliation gate;
  exactly one `compliance_gates` node is recorded per evaluated gate; the clear path records ≥3 nodes with the FMR
  node present on a non-payment 3-day. If the chain ever silently skips a disposition write, this fails.
- **Resume scope-check (fail-closed):** matching live state passes; amount/ledger/note-hash drift each → `ff3_resume_scope_mismatch`.
- **Resume token:** round-trips under the correct secret; wrong-secret and >5-min-expiry rejected.

Recommend adding it to the Required CI set alongside `synthetic-daycount-jul2026` (broker branch-protection action).

## §B · Sentry runtime alert rules (broker-configured, dashboard)

Production observability is server-side (`@sentry/node`, PII-scrubbed). The FF-3 alert rules to add:

| Alert | Condition | Maps to (on-call addendum §1) |
|---|---|---|
| FF-3 produce 500s | `/api/notice/produce/from-chat` 5xx rate > 0 in 5 min (FF-3 seam) | Sev-2 reconciliation-gate 500s |
| Resume endpoint 500s | `/api/chat/ff3/resume` 5xx > 0 in 5 min | Sev-2 |
| `ff3_resume_scope_mismatch` | count crosses the §C threshold | Sev-3 |
| `ff3_resume_already_consumed` | count crosses the §C threshold | Sev-3 |
| Silent-skip proxy | produce success on a session with an expected-halt disposition and no `compliance_gates` row | Sev-1 (the canary's runtime twin) |
| Awaiting-review backlog | `reconciliation_resolution='broker_review' AND broker_resolution_note IS NULL` rows older than 48h | Sev-3 |

The two `ff3_resume_*` codes are already emitted as structured signals by the resume endpoint + produce gate, so
Sentry/log-based counting needs no new instrumentation — only the alert rules.

## §C · Anomaly-rate methodology (answers ruling §7 + defines §1.1(4) baseline)

`ff3_resume_scope_mismatch` and `ff3_resume_already_consumed` are **failure signals**; healthy rate ≈ 0, so a naive
"3× baseline" trips on the first event (3 × 0 = 0). **Volume-gated dual method:**

1. **Baseline** = rolling 7-day **count** per signal, established on soak day 7 (2026-07-20).
2. **Low-volume regime** — total `/api/chat/ff3/resume` calls in the 24h window **< N = 20**: rate is
   statistically meaningless → **absolute thresholds**: `ff3_resume_scope_mismatch > 5 / 24h` **OR**
   `ff3_resume_already_consumed > 2 / 24h` → §1.1(4) diagnostic memo.
3. **Sufficient-volume regime** — ≥ N calls: the ruled **> 3× rolling-7-day-median over any 24h window**.
4. Every anomaly readout reports the signal count **and** the total resume-call denominator, so a "spike" is
   distinguishable from small-sample noise.

Rationale for N=20: below ~20 resume attempts/day a single owner double-submitting can swing a rate by hundreds of
percent; the absolute count ("how many failures is too many") is the honest frame at that volume. Both regimes feed
the same §1.1(4) disposition (diagnostic memo, not auto soak-break).

**Baseline numbers to be filled at soak day 7 (2026-07-20):** rolling-7-day counts for both signals + the median
resume-call/day denominator. (Preview traffic is E2E-driven pre-launch, so expect the low-volume regime to govern
through soak; the absolute thresholds are the operative ones.)

## §D · Disposition

Monitoring parity components built: canary (green), alert-rule spec (broker to configure), baseline methodology
(defined; day-7 numbers pending). Satisfies §1.2 for the prod-flip attestation, contingent on the broker adding the
§B Sentry rules and the day-7 baseline capture.

— Engineering (FF-3 monitoring parity) · 2026-07-13 · for Broker Compliance Review, Jack Taglyan / CalDRE B9445457
