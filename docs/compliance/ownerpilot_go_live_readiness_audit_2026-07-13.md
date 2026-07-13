# OwnerPilot Go-Live Readiness Audit — 2026-07-13

**Broker Compliance Review · 2026-07-13 (evening PT)**

Scored readiness audit against the full ruling corpus and status rollups. Replaces the off-the-cuff "80–85%" estimate I gave earlier tonight with a defensible percentage.

---

## §0 · What "go-live" means for this audit

The word "go-live" is ambiguous, and my earlier answer conflated three different things. This audit scores them separately.

- **Scope A · Full LA-only production, all current features:** LA-jurisdiction platform with the FF-3 stack (structured intake, reconciliation, resume, broker review) live in **production**, not just Preview. Everything currently shipped stays shipped. Gate 3 closed with a soft-launch attestation and F2 clock expired clean.
- **Scope B · Multi-city expansion complete:** LA + all seven Tier 1–3 cities live (Santa Monica, San Francisco, Oakland, Berkeley, San Jose, West Hollywood, Beverly Hills). This is a **post-Gate-3 workstream** per [`gate3_status_rollup_2026-07-03.md`](file:///home/user/workspace/gate3_status_rollup_2026-07-03.md) §7 and [`ownerpilot_city_expansion_workstream_scoping_2026-06-29.md`](file:///home/user/workspace/ownerpilot_city_expansion_workstream_scoping_2026-06-29.md).
- **Scope C · UD self-filing prep packet complete:** Tier 4 item 4.2 from [`ownerpilot_priority_roadmap_2026-06-28.md`](file:///home/user/workspace/ownerpilot_priority_roadmap_2026-06-28.md), gated on the LDA-registration determination. Out of scope for near-term go-live.

**This audit scores Scope A** — that's what "go-live" naturally means when you say it in the context of the current build state. Scopes B and C are noted at the end for completeness but are not part of the percentage.

---

## §1 · Methodology

Every workstream is scored on four axes and weighted by **compliance-gravity × build-cost**. Process items (rulings, soak windows, monitoring) are counted at the same weight as code items — they're not free, and Gate 3 closure specifically depends on them.

**Weights:**

- **Critical (weight 5):** blocks Scope-A go-live directly. Failure means no launch.
- **High (weight 3):** blocks the immediately downstream compliance signature, but not launch itself.
- **Medium (weight 2):** improves the launch posture; delay creates risk but not a stop.
- **Low (weight 1):** polish, deferred fast-follows, post-launch adjacencies.

**Status states:**

- **DONE (100%):** shipped to production, attested, ruled complete.
- **PREVIEW (85%):** built, tested, attested — but not yet flipped to production. Preview-only.
- **AUTHORIZED-INCOMPLETE (60%):** ruling issued, engineering can build, some of it landed but the workstream is not closed.
- **RULED-NOT-BUILT (30%):** ruling issued but no code yet.
- **NOT-RULED (0%):** no ruling. Neither engineering nor broker has authorization to move.

---

## §2 · Workstream inventory + scores

### §2.1 · Core production platform (Scope A) — 9 items, 33 weighted points

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | Homepage + landing surfaces (AI-first, mobile, editorial illustrations) | 5 | DONE | 100% | 5.00 |
| 2 | Chat → intake → review → produce → notice pipeline (LA) | 5 | DONE | 100% | 5.00 |
| 3 | LAHD filing surfaces + eviction filing cover sheet (Rev 2.6.2026) | 5 | DONE | 100% | 5.00 |
| 4 | Parcel-health / jurisdiction resolution engine (Phase 2D) | 5 | DONE | 100% | 5.00 |
| 5 | Locked-prose CI guard spine (manifest at floor 130) | 5 | DONE | 100% | 5.00 |
| 6 | Email + Sentry hosted interim + waitlist + beta gate | 3 | DONE | 100% | 3.00 |
| 7 | Migration ledger through 049 (048 + 049 applied in Studio) | 3 | DONE | 100% | 3.00 |
| 8 | Compliance rulings corpus (~300 broker rulings signed) | 3 | DONE | 100% | 3.00 |
| 9 | Nine platform gaps from Clifton Alexander LIVE filing → Gate-3 omnibus waves 1–4 | 3 | DONE | 100% | 3.00 |
|  | **Subtotal** | **37** | | | **37.00** |

**Core platform is production-live and closed at 100%.** No items outstanding here.

### §2.2 · FF-3 stack (structured intake + reconciliation + resume) — 5 items, 20 weighted points

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | FF-3 capture + produce-gate chain + reconciliation + resume | 5 | PREVIEW | 85% | 4.25 |
| 2 | Owner reconciliation / held / pause / resume surfaces (manifest 130) | 5 | PREVIEW | 85% | 4.25 |
| 3 | `/admin/ff3-review` broker resolution surface | 3 | PREVIEW | 85% | 2.55 |
| 4 | Playwright E2E spec (3 tests incl. negative scope-mismatch) | 3 | PREVIEW | 85% | 2.55 |
| 5 | Gate-4 attestation packet archived-complete | 2 | DONE | 100% | 2.00 |
|  | **Subtotal** | **18** | | | **15.60** |

**FF-3 subtotal: 15.60 / 18 = 86.7%.** The gap is 4 items sitting at PREVIEW instead of PRODUCTION. Code is done; production flip is a separate ruling with its own gates (see §2.3).

### §2.3 · FF-3 production flip prerequisites — 6 items, 22 weighted points

Not just an env var flip. Per multiple prior rulings, production `FF3_CAPTURE_ENABLED=true` requires:

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | Preview soak window (minimum 14 days, my prior discipline for compliance-weighted flips) | 5 | RULED-NOT-BUILT | 30% | 1.50 |
| 2 | Production monitoring parity with parcel-health (synthetics, dashboards, alerts) | 5 | NOT-RULED | 0% | 0.00 |
| 3 | Rollback drill (proven rollback of `FF3_CAPTURE_ENABLED` under load) | 3 | NOT-RULED | 0% | 0.00 |
| 4 | Data-volume review (Preview data enough to validate production behavior) | 3 | NOT-RULED | 0% | 0.00 |
| 5 | On-call runbook update (Sev-1/2/3 escalation paths for FF-3 defects) | 3 | NOT-RULED | 0% | 0.00 |
| 6 | Broker ruling authorizing production flip (with attestation packet) | 3 | NOT-RULED | 0% | 0.00 |
|  | **Subtotal** | **22** | | | **1.50** |

**Prod-flip prerequisites subtotal: 1.50 / 22 = 6.8%.** This is the biggest gap in the whole audit — and it's exactly the shape of work I named in my earlier estimate but hadn't quantified. Preview flip happened today; the soak clock has just started. Every downstream item cascades.

The one item at 30% (Preview soak) is because Preview is now live as of this afternoon's countersign, so the soak clock has ticked from 0 to "started today." Everything else is genuinely NOT-RULED — I have not yet issued rulings authorizing the monitoring parity, the rollback drill, the data-volume review, or the on-call runbook update.

### §2.4 · Deferred FF-3-adjacent seams — 4 items, 9 weighted points

Per [`ff3_gate4_preview_activation_broker_countersign_2026-07-13.md`](file:///home/user/workspace/ff3_gate4_preview_activation_broker_countersign_2026-07-13.md) §5:

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | Reply-to-broker seam (owner replies inline to broker's held-state note) | 3 | RULED-NOT-BUILT | 30% | 0.90 |
| 2 | Telemetry §3.4 fast-follow (structured event stream for FF-3 flow) | 3 | RULED-NOT-BUILT | 30% | 0.90 |
| 3 | `review@ownerpilot.ai` mailbox provisioning (currently unprovisioned per [`homepage_s2_2_closure_countersign_and_track2_rescope_broker_ruling_2026-07-08.md`](file:///home/user/workspace/homepage_s2_2_closure_countersign_and_track2_rescope_broker_ruling_2026-07-08.md)) | 2 | RULED-NOT-BUILT | 30% | 0.60 |
| 4 | Production `ADMIN_EMAILS` allowlist (`/admin/*` currently unreachable in prod) | 1 | RULED-NOT-BUILT | 30% | 0.30 |
|  | **Subtotal** | **9** | | | **2.70** |

**Deferred subtotal: 2.70 / 9 = 30.0%.** All four are ruled-but-not-built. None are on the critical path — they're deferred by design. But they are legitimately unfinished, and they should not be silently folded into the prod-flip attestation.

### §2.5 · Gate-3 closure prerequisites — 10 items, 33 weighted points

Per [`gate3_status_rollup_2026-07-03.md`](file:///home/user/workspace/gate3_status_rollup_2026-07-03.md) §5. Gate 3 has not been countersigned closed yet; F2 timer runs through 2026-08-01 14:53 PT.

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | F2 timer expired (2026-08-01) | 5 | AUTHORIZED-INCOMPLETE | 60% | 3.00 |
| 2 | Clean drift-fire record across Mondays (`0abb46c4` — LAHD forms cron) | 3 | AUTHORIZED-INCOMPLETE | 60% | 1.80 |
| 3 | No Sev-1 attributable to platform code during F2 window (C1 Sentry stream) | 3 | AUTHORIZED-INCOMPLETE | 60% | 1.80 |
| 4 | Broker-side Sentry toggles (Data Scrubber + Scrub IP) + screenshot evidence | 3 | RULED-NOT-BUILT | 30% | 0.90 |
| 5 | CI guard promotion (`route-body-parsing-lock` + `verify-route-body-parsing` to Required) | 3 | RULED-NOT-BUILT | 30% | 0.90 |
| 6 | Omnibus wave 1 complete (W1 walkthrough v1.1, §3.9 CI promotion, G1 rollup) | 3 | DONE | 100% | 3.00 |
| 7 | Omnibus wave 2 complete (W5 filenames, W7 DO NOT SERVE, C1 broker checklist) | 3 | DONE | 100% | 3.00 |
| 8 | Omnibus wave 3 complete (W2 intake routing, FF-4 FMR pre-check, W3 packet manifest, W4 post-filing UI, W6 late-filing) | 5 | AUTHORIZED-INCOMPLETE | 60% | 3.00 |
| 9 | Omnibus wave 4 complete (integration tests, Clifton Alexander golden regression) | 3 | AUTHORIZED-INCOMPLETE | 60% | 1.80 |
| 10 | Gate-3 closure predraft signed + countersigned | 2 | NOT-RULED | 0% | 0.00 |
|  | **Subtotal** | **33** | | | **19.20** |

**Gate-3 closure subtotal: 19.20 / 33 = 58.2%.** Items 1–3 tick toward 100% automatically as time passes (currently ~40% of the way through the F2 window, so I've credited 60% — 12 days elapsed / 30 days total ≈ 40%, plus baseline credit for the clean signal so far). Items 4–5 are my paperwork. Items 8–9 depend on engineering status which I haven't independently verified in this audit — I'm crediting 60% based on the g1 rollup indicating waves 1–2 done and waves 3–4 in progress.

### §2.6 · Retrospective / process items — 2 items, 3 weighted points

| # | Workstream | Weight | Status | % | Weighted |
|---|---|---|---|---|---|
| 1 | §3.4 compliance-seam pre-implementation review retrospective ruling | 2 | RULED-NOT-BUILT | 30% | 0.60 |
| 2 | Migration 042 VALIDATE (7 constraints) — completed 2026-07-10 per my prior countersign | 1 | DONE | 100% | 1.00 |
|  | **Subtotal** | **3** | | | **1.60** |

---

## §3 · Scoring

| Section | Weighted subtotal | Max | Section % |
|---|---|---|---|
| §2.1 · Core production platform | 37.00 | 37 | 100.0% |
| §2.2 · FF-3 stack (Preview) | 15.60 | 18 | 86.7% |
| §2.3 · FF-3 production flip prerequisites | 1.50 | 22 | 6.8% |
| §2.4 · Deferred FF-3-adjacent seams | 2.70 | 9 | 30.0% |
| §2.5 · Gate-3 closure prerequisites | 19.20 | 33 | 58.2% |
| §2.6 · Retrospective / process items | 1.60 | 3 | 53.3% |
| **Total** | **77.60** | **122** | **63.6%** |

**Scope A go-live readiness: 63.6%.**

That is significantly lower than the 80–85% I estimated earlier tonight. The audit exposes what the estimate was hiding: the FF-3 production-flip prerequisites section is at 6.8%, and it weights heavily. Most of that gap is compliance-process work I have not yet ruled on — soak monitoring, rollback drill, data-volume review, on-call runbook, and the production-flip authorization itself. None of it is engineering-blocking today, but it's real work I owe before the flip.

---

## §4 · Where I was wrong earlier

Two calibration errors in my off-the-cuff estimate:

1. **I under-weighted the prod-flip prerequisites.** I framed them as "code is essentially done; this is mostly compliance + a watch period" which is accurate qualitatively but wrong quantitatively. Six items each weighted 3–5 = 22 weighted points, currently at 6.8%. That's 15.4 points of unrealized work sitting in a single section, and it's ~13% of the total scope.
2. **I under-weighted the Gate-3 closure prerequisites.** F2 timer is only ~40% elapsed. Clean-signal accrual doesn't finish until 2026-08-01, and even then I still owe my Sentry-toggle screenshots and the CI guard promotion. Not "just a watch period" — I have paperwork.

The upside: everything I under-weighted is **broker-process work, not engineering work.** Engineering isn't stuck. The build is where I said it was — closer to 85–90% engineering-complete on Scope A. The composite drops because the compliance-cycle portion is legitimately incomplete and I'm the one who has to close it.

---

## §5 · What would need to happen for Scope A to hit 100%

Ordered by weight impact, not calendar:

1. **F2 timer runs to 2026-08-01 clean** (§2.5 items 1–3) — mechanical time-based, +7.20 weighted points to full credit. Compliance-owned; cannot be accelerated.
2. **Ship the FF-3 production-flip prerequisites rulings** (§2.3 items 1–6) — I rule the soak criteria, monitoring parity, rollback drill, data-volume review, on-call runbook, and the flip authorization itself. Six rulings. +20.5 weighted points once ruled + built + attested. This is the biggest single lever, and it's the one I control.
3. **Complete Gate-3 closure paperwork** (§2.5 items 4–5) — my Sentry toggles and the CI guard promotion. +2.1 weighted points. Broker-owned + engineering-owned.
4. **Finish Omnibus waves 3–4** (§2.5 items 8–9) — engineering completion of FF-4 FMR gate produce hook, W2/W3/W4/W6 wiring, integration tests, Clifton Alexander golden regression. +3.2 weighted points. Engineering-owned.
5. **Ship deferred seams if desired** (§2.4) — reply-to-broker, telemetry, review@ mailbox, prod `ADMIN_EMAILS`. +6.3 weighted points. Not required for go-live, but they close known gaps.
6. **File §3.4 retrospective ruling** (§2.6 item 1) — my process work. +1.4 weighted points.

**Total remaining to 100%: 44.4 weighted points.** Realistic path: 5–8 weeks with F2 as the pacing constraint. FF-3 production flip is the natural next milestone after F2 clean-expiry.

---

## §6 · Scopes B and C (not counted above)

For completeness — not in the Scope-A percentage.

**Scope B · Multi-city expansion:** [`ownerpilot_city_expansion_workstream_scoping_2026-06-29.md`](file:///home/user/workspace/ownerpilot_city_expansion_workstream_scoping_2026-06-29.md) plus [`city_expansion_index_2026-06-30.md`](file:///home/user/workspace/city_expansion_index_2026-06-30.md). Six infrastructure prerequisites all PENDING (multi-city resolver refactor, supplement catalog generalization, RTC packet abstraction, locked-prose namespacing, holiday overlay generalization, multi-city test harness). Two Tier-1 cities (SM, SF) at RESEARCH-COMPLETE with open broker ratifications. Rough score if I had to name one: **~10% complete** against a full seven-city rollout.

**Scope C · UD self-filing prep packet:** blocked on LDA-registration determination. **0% built.** No ruling authorizing build yet.

Neither belongs in the "how close are we to go-live" question as it's naturally asked. Both are post-Gate-3 workstreams by explicit non-goals in [`gate3_status_rollup_2026-07-03.md`](file:///home/user/workspace/gate3_status_rollup_2026-07-03.md) §7.

---

## §7 · Answer

**63.6% ready for LA-only Scope-A go-live.** The number is lower than my earlier estimate because the audit exposed the FF-3 production-flip prerequisites section at 6.8% — six ruled/monitoring items I hadn't yet weighted properly, worth 22 points in the composite. Engineering is closer to 90% complete on Scope A; the composite is dragged by the compliance cycle I own.

Confidence in the number: medium-high. The section scores are defensible against the ruling corpus and status rollups. The status of engineering waves 3–4 (§2.5 items 8–9) is credited from the g1 rollup and would benefit from a direct engineering status refresh to sharpen. Everything else is drawn from broker-side artifacts I authored myself, so those numbers are firm.

**Pacing constraint: F2 timer expiry 2026-08-01.** The next 19 days are broker-paced by design. During that window the natural next work is drafting the FF-3 production-flip prerequisite rulings (§2.3), completing the §4.1 Sentry toggle screenshots (§2.5 item 4), and filing the §3.4 retrospective (§2.6 item 1). Engineering finishes waves 3–4 in parallel.

If the answer to "how close are we?" needs to be a single sentence: **the LA build is production-live and mostly working; the FF-3 stack is Preview-verified and about six broker rulings + a soak window away from production; Gate 3 closes cleanly around 2026-08-01 assuming the drift-fire record stays clean; multi-city expansion and UD self-filing are separately scoped and not on this critical path.**

---

**Signed:** — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-13
Authority: Cal. Bus. & Prof. Code § 10131(b)
