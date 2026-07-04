# Omnibus Broker Ruling Request — 2026-07-03

**By:** Engineering (Claude Code) · **For:** Jack Taglyan / CalDRE B9445457 / Broker Compliance Review
**Purpose:** Single consolidated list of every open item that needs a broker decision, copy ratification, or broker-executed ops action — so the 2026-07-10 countersign session (migration-042 window) can clear all of it in one pass. Nothing here blocks in-flight engineering under the standing orders; this is the decision queue.

**How to use:** rule inline per item (Adopt / Amend / Reject), or batch-adopt a section. Items are grouped by type. Each cites its source.

---

## A · Locked-prose copy ratifications (PROVISIONAL → ratify byte-exact)

These are live or ready-to-wire but marked PROVISIONAL until you ratify the exact wording (the guard enforces byte-fidelity once ratified).

| # | Entry | Surface | Source |
|---|---|---|---|
| A1 | `PACKET_DELIVERY_EMAIL_BODY_V1` | P1 packet-delivery email (carries the CCP §1162 non-service disclaimer) | standing order §2 P1 |
| A2 | `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1` | P1 broker digest (count + link, no PII) | standing order §2 P1 |
| A3 | `LAHD_CONFIRMATION_FORWARD_EMAIL_BODY_V1` | P1 LAHD confirmation forward | standing order §2 P1 |
| A4 | `chatFf3ResumeAfterBrokerReviewCard` (entry 13) | **text not yet authored** — broker to author with the 042 batch | FF-3 countersign Decision 2 |
| A5 | `chatFf3AmountReconciliationFlag` (entry 14) | mismatch three-way card — text ratified in FF-3 countersign §3.2; confirm final at manifest insertion (042 co-batch) | FF-3 countersign §3.2 |

## B · Design / scope forks (need a ruling before wiring)

| # | Fork | Engineer lean | Source |
|---|---|---|---|
| B1 | **W2 scope:** §2.1 describes W2 as reading `just_cause` → "which packet artifacts / jurisdictional overlays." As-built W2 is `notice_type` → EFS-vs-Declaration pathway. | Pathway = W2 (shipped); artifact/overlay routing = packet-manifest lane (#4). Confirm or redirect. | W2 attestation §3 |
| B2 | **P1 packet-delivery recipient policy:** may the packet email go to the **tenant**, or restrict to owner/counsel? (The §1162 disclaimer makes any recipient safe; recipient policy is a broker call.) | Recipient-neutral with the non-service disclaimer; broker sets policy. | P1 attestation §3 |

## C · Synthetic-catalog ratifications (Wave-4 golden test)

| # | Additions | Effect | Source |
|---|---|---|---|
| C1 | **W2** — SC-W2-3DAY-ROUTES-EFS-01, -60DAY-ROUTES-DECLARATION-01, -PREREQ-INCOMPLETE-01, -UNKNOWN-TYPE-FAILCLOSED-01 | catalog +4 | W2 attestation §4 |
| C2 | **FF-4 call-site** (5) — reconciliation-blocks-FMR, FMR-boundary-equal-owner-branch, portal-text-drift, extractor-null-amount-safe-fall-through, 3-day-pay-implies-amount | catalog +5 | FF-4 hook authorization §2.4 |
| C3 | Confirm final Wave-4 catalog total (ratified 9 + W6 3 = 12; + C1/C2 → ~21) | — | — |

## D · Migration-042 co-batch (all HELD until 2026-07-10; land as one PR)

Turnkey design: `ff3_migration_042_cobatch_implementation_design_2026-07-03.md`. Items to countersign as they land:
- D1 · FF-3 reconciliation gate call-site + entry-14 emission + three-way owner branch.
- D2 · FF-4 FMR hook call-site (ordering reconciliation→FF-4→W6→W2) + `verbatim_hash`/`evaluated_at` retrofit.
- D3 · Entries 13 + 14 into the Shape-B manifest.
- D4 · Broker-side `awaiting_broker_review` resolution surface.
- D5 · `compliance_gates` schema — **broker-executed migration** (design in §5 of the co-batch doc); sign off on the shape.
- D6 · Produce-gate chain harness (FF-3-gated; no-op pre-flag-on).

## E · Broker-executed ops actions (dashboard / DB / GitHub — engineering has no access)

| # | Action | Where | Source |
|---|---|---|---|
| E1 | **Migration 042 VALIDATE** (7 FF-3 constraints; NOT before 07-10; pre-flight query provided) | Supabase Studio (`txpetdrfsmqnyooydmas`) | reminder set |
| E2 | Branch-protection Required checks — add `verify-route-body-parsing`; promote the 8 advisory guards (recommend all 20); record the live set into the baseline §2 | GitHub "main protection" ruleset | branch_protection_full_inventory_baseline_2026-07-03 |
| E3 | `ADMIN_EMAILS` — confirm value (`jack@ownerpilot.ai`?) + set on Vercel Prod | Vercel env | C1 broker-checklist attestation |
| E4 | Sentry **Data Scrubber** + **Scrub IP** org toggles | Sentry dashboard | brokerChecklist.ts (C1) |
| E5 | `cron_1_ca_statute_watch` — add LAMC §151.09.C.9 / §165.05.B.5 / Ord.188,681 + housing.lacity.gov URLs | Computer automation / Notion | statute_watch_scope_lamc_amendment_2026-07-03 |
| E6 | FF-3 series doc drop already merged; historical doc-sweep + INDEX merged — **no action, informational** | — | — |

## F · Productization console / registration steps (accumulate as P1–P6 land)

Per standing order §7 — broker completes these in the 07-10 session alongside the code:
- F1 · **P3 Twilio** — 10DLC brand + campaign registration (DUNS/EIN attestation in Twilio console); confirm STOP/HELP Advanced Opt-Out wired flow. *(pending P3 build)*
- F2 · **P5 domain** — DNS records for production cutover if the homepage is staged at a pplx.app subdomain (engineering will supply the exact record checklist with the P5 attestation). *(pending P5 build)*
- F3 · Any credential/console step P2/P4/P6 surface — engineering will append to this section as each lane lands.

## G · Standing guardrails (reaffirm — no change requested, listed for completeness)

- G1 · FF-3 dark-flag four-gate discipline holding; `FF3_CAPTURE_ENABLED` prod flip needs its own ruling.
- G2 · Attorney-attribution guardrail: all sign-offs = broker (CalDRE B9445457); **no attorney signature, no SBN 269639**, anywhere.
- G3 · Every user-facing surface carries the G3 disclaimer + G5 footer.
- G4 · Early migration-042 VALIDATE denied even if clean before 07-10 (the soak is the point).

---

## Engineer-recommended disposition (for a fast countersign)

- **A1–A3, C1, C2:** batch-adopt (copy is conservative + factual; synthetics mirror the ratified pattern).
- **A4:** author entry-13 text at the 042 batch.
- **B1:** confirm pathway-only W2 (artifact/overlay → packet-manifest lane).
- **B2:** rule the packet-delivery recipient policy.
- **D1–D6:** countersign as the 042 co-batch PR lands (07-10).
- **E1–E5:** execute in the 07-10 session.
- **F:** append + complete as P2–P6 land.

---

**Requested by Engineering (Claude Code). Governing authority: Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
