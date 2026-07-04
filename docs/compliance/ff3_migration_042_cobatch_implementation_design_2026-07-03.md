# FF-3 Migration-042 Co-Batch — Turnkey Implementation Design

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Authorized under:** BROKER STANDING ORDER 2026-07-03 §1.3 (doc-only prep) — Jack Taglyan / CalDRE B9445457.
**Purpose:** De-risk the largest held batch. Everything in §2 of the standing order co-lands in ONE PR when the 2026-07-10 migration-042 VALIDATE window opens. This is the pre-reviewed, turnkey spec so that batch is fast. **No code in this doc; nothing here is built yet — it is design only.** The held items remain held.

---

## §1 — What co-lands in the 042 batch (single PR, per countersign §6)

1. Migration 042 VALIDATE (broker-executed in Studio — reminder set).
2. FF-3 reconciliation gate **call-site** (the produce-flow wiring — HELD item).
3. FF-4 FMR produce-gate **hook call-site** (transitively reconciliation-dependent — HELD).
4. Locked-prose **entries 13 + 14** (co-land with 042).
5. Broker-side **`awaiting_broker_review` resolution surface**.
6. The **produce-gate chain** harness that runs the four gates in order behind the FF-3 gate.
7. `compliance_gates` **migration** (broker-executed; the packet-manifest lane's first reader — may split to that lane, see §6).

## §2 — The produce-gate chain (canonical order, §2.1 of the FF-4 authorization)

`runProduceGateChain(session, ff3Columns, today)` — pure aggregate, in-memory, gated to run ONLY when the FF-3 typed columns are populated (i.e. FF-3 capture completed; a no-op pre-flag-on so prod is unaffected). Order is NON-NEGOTIABLE:

```
1. FF-3 amount reconciliation   reconcileFf3Amount(amount_of_rent_owed, rent_periods)   [MERGED core, case 165]
      match | no_ledger_baseline  → continue
      mismatch                    → HALT: emit entry-14 card; owner (1)/(2)/(3):
                                       (1) notice-right/records-wrong → continue to FF-4 with case-notes flag
                                       (2) notice-wrong               → PAUSE produce (no FF-4)
                                       (3) unsure                     → route awaiting_broker_review (no FF-4)
2. FF-4 FMR                      fmrPreCheck(bedrooms, amount_of_rent_owed)               [MERGED core, case 154]
      applicability: fires only when notice_type==three_day_pay_or_quit OR just_cause==nonpayment
      block (amount<=fmr) → emit chatFmrPreCheckHardBlock; owner remediation branch
      pass                → continue
3. W6 late-filing               evaluateLateFilingGate({notice_type, service_date, today}) [MERGED, this session]
4. W2 notice-pathway            evaluateNoticePathwayGate({notice_type})                  [MERGED, this session]
```

Every node returns `{gate, result, context:{evaluated_at, verbatim_hash?, ...}}`. The chain aggregates and short-circuits on the first block/halt/pause. `prerequisite_incomplete` from any node (a null FF-3 field after capture completed) is a **defect** → fail-closed, surface for broker review.

## §3 — Reconciliation call-site (HELD item — design)

- Consumes the merged pure `reconcileFf3Amount`. The *new* work is the produce-flow branch handling + the entry-14 card emission + the (1)/(2)/(3) owner selection → next-state routing.
- Owner-selection persistence: a `reconciliation_resolution` value (branch chosen + timestamp) on `chat_sessions` (nullable; additive migration in the batch, or fold into `compliance_gates` context). **Decision for the batch: reuse `chat_sessions` (no new table) unless packet-manifest needs it queryable.**

## §4 — Locked-prose entries 13 + 14 (Shape-B, co-land with 042)

- **Entry 14 `chatFf3AmountReconciliationFlag`** — the mismatch card with the three-way branch. Text ratified in `ff3_countersign_..._2026-07-03.md` §3.2 (records-wrong / notice-wrong / broker-review). Add to `locked_prose_manifest_phase2_assembly.json` (Shape-B), compute hash, verify guard.
- **Entry 13 `chatFf3ResumeAfterBrokerReviewCard`** — the distinct resume card the owner must acknowledge after a broker clears an `awaiting_broker_review` hold (no auto-resume, per countersign Decision 2). **Text not yet authored — broker to author with the 042 batch** (surface as a fork in the batch PR if not provided).
- Both bring the FF-3 locked-prose series to 14.

## §5 — `compliance_gates` schema (design; broker-executed migration)

First real reader is the packet-manifest lane. Proposed shape (authored against that consumer, per Fork-2 ruling):

```
compliance_gates (
  id uuid pk default gen_random_uuid(),
  chat_session_id uuid not null references chat_sessions(id),
  gate text not null,                    -- 'ff3_amount_reconciliation' | 'ff4_fmr' | 'w6_late_filing' | 'w2_notice_pathway'
  result text not null,                  -- pass|block|prerequisite_incomplete|match|no_ledger_baseline|mismatch|efs|declaration_of_intent
  evaluated_at timestamptz not null,
  verbatim_hash text,                    -- null for gates without a verbatim constant (W2)
  context_json jsonb not null,
  created_at timestamptz not null default now()
)
```
Additive; nullable-tolerant; NOT VALID checks + a soak per Amendment E if any constraints are added. **Persistence is written by the chain's caller, not the pure gates.**

## §6 — FF-4 verbatim_hash retrofit (batched, per countersign)

Add `evaluated_at` + `verbatim_hash` (over `FMR_PORTAL_TEXT_VERBATIM`) to the FF-4 gate result shape — the standing rule for any gate with a verbatim constant. Pure refactor; lands in the batch.

## §7 — Wave-4 golden catalog at batch close

Ratified: 3 pure-FMR + 3 reconciliation + 3 W6 = as authored. Proposed this session (pending ratification): 5 FF-4 call-site synthetics (countersign §2.4) + 4 W2 synthetics (W2 attestation §4). Broker to ratify the call-site + W2 additions with the batch → target catalog ~18–20. Wave-4 golden test runs against the assembled chain once `FF3_CAPTURE_ENABLED` is on in Preview.

## §8 — Gating that stays in force

- Whole chain is a no-op until `FF3_CAPTURE_ENABLED` (Preview only, post-042, separate ruling for prod).
- Nothing here changes prod produce behavior until FF-3 flag-on.
- Early VALIDATE denied (countersign §6 #3). The soak is the point.

---

**Authorized under BROKER STANDING ORDER 2026-07-03 (§1.3 doc-only) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
Engineering author: Claude Code · design only, no code, held items remain held.
