# Omnibus Broker Ruling Request — 2026-07-03 (revised 2026-07-04)

**By:** Engineering (Claude Code) · **For:** Jack Taglyan / CalDRE B9445457 / Broker Compliance Review
**Purpose:** Single decision queue for every open item. **Revised** to triage by timing — most items are NOT migration-042-gated and can be cleared now, which unblocks more building before the 2026-07-10 window. Only the co-batch + VALIDATE genuinely wait.

**How to use:** rule the §1 items at your convenience (each has an engineer recommendation — confirm or amend); the §1 rulings let engineering keep building before 07-10. §2 is the true 042-window batch. §3 is reference detail.

---

# §1 · RESOLVE NOW (not 042-gated — clearing these unblocks more building before 07-10)

## 1A · Decisions that unblock a build (highest leverage)

| # | Decision | Engineer lean | Unblocks |
|---|---|---|---|
| N1 | **P6 scope** — "tenant intake portal" is a mis-name; the function is the landlord/owner retail funnel (already `/chat`). | Confirm P6 = harden `/chat` (+ optional public owner form); a tenant-facing tool is NOT built without its own ruling. | The entire P6 portal build |
| N2 | **P3 §B.7 tenant-SMS reversal** — server→tenant reminders reverse the ratified "owner-copy-only" TCPA firewall. | Keep §B.7 unless there's a reason to take on direct tenant-SMS liability; if reversing, require express written consent + double opt-in + reassigned-number mitigation. | P3 tenant-reminder path (or confirms the hold) |
| N3 | **P2 verification-view + auth model** — what the scanned QR shows + who can view. | Authenticity-only (hash + time, NO PII) via short-lived signed token, no login. | P2 verify endpoint + QR render |
| N4 | **P2 QR dependency** — approve `qrcode` npm. | Approve `qrcode` + `@types/qrcode`. | P2 QR image generation |
| N5 | **W2 scope** — §2.1 "just_cause/artifacts/overlays" vs as-built `notice_type`→pathway. | Pathway = W2 (shipped); artifact/overlay routing = packet-manifest lane. | Packet-manifest lane design |
| N6 | **P1 packet-delivery recipient policy** — tenant vs owner/counsel only. | Recipient-neutral is safe (§1162 disclaimer); you set policy. | P1 trigger wiring |
| N7 | **Rate-limit config reconciliation** — ratified per-session (wired) vs Q4's per-IP/user numbers. | Keep the ratified per-session config; revise via ruling only if traffic warrants. | Closes the P4-Q4 fork |
| N8 | **P5 staging-domain intent** — `pplx.app` (per order) vs default `*.vercel.app`. | Deploy straight to `ownerpilot.ai`; `*.vercel.app` preview is staging. | P5 deploy path |

## 1B · Ratifications (quick approvals, no build blocked but clears the queue)

- **N9 · P1 email copy** (3 bodies) + **N10 · FF-3 entry-13/14 text** (author now; manifest insertion still co-lands with 042) + **N11 · synthetics** (4 W2 + 5 FF-4 call-site → catalog ~21). *Detail: §3-A/§3-C.*

## 1C · Broker-executed ops you can do NOW (none are 042-gated)

- **N12 · Branch-protection Required checks** — add `verify-route-body-parsing` + promote the 8 advisory guards (GitHub ruleset UI). *(§3-E2)*
- **N13 · `ADMIN_EMAILS`** on Vercel (unblocks the broker-checklist). *(§3-E3)*
- **N14 · Sentry** Data Scrubber + Scrub IP toggles. *(§3-E4)*
- **N15 · `cron_1_ca_statute_watch`** LAMC scope. *(§3-E5)*
- **N16 · P5 deploy + `ownerpilot.ai` DNS cutover** (checklist ready). *(§3-F/P5)*
- **N17 · Env for enabled lanes:** `PACKET_VERIFY_SECRET` (P2), Twilio envs + 10DLC registration (P3), `TURNSTILE_SECRET_KEY` (P6), rate-limit Redis env (P4) — set the ones for lanes you activate.

**If you clear 1A (N1–N8), engineering can immediately build:** the P6 owner-funnel hardening (CAPTCHA + PII gate on `/chat`), the P2 verify endpoint + QR render + cover embed, the P1 trigger wiring, and the packet-manifest lane design — all before 07-10, none 042-gated.

---

# §2 · HOLD FOR THE 042 WINDOW (~2026-07-10, genuinely gated)

Do NOT land before the soak clears (countersign §6 #3). Land as one co-batch.

- **H1 · Migration 042 VALIDATE** (broker-executed; pre-flight query in the reminder).
- **H2 · FF-3 reconciliation call-site** + entry-14 emission + three-way owner branch.
- **H3 · FF-4 FMR hook call-site** (order: reconciliation→FF-4→W6→W2) + `verbatim_hash`/`evaluated_at` retrofit.
- **H4 · Locked-prose entries 13 + 14** manifest insertion.
- **H5 · Broker-side `awaiting_broker_review` resolution surface.**
- **H6 · Produce-gate chain harness** (FF-3-gated; no-op pre-flag-on).
- **H7 · `compliance_gates` schema** (broker-executed migration; authored with the packet-manifest lane).

*Design is turnkey: `ff3_migration_042_cobatch_implementation_design_2026-07-03.md`.*

**Also broker-executed at the window (batched for convenience, not strictly 042-gated):** P3 `sms_consent`/`sms_messages` migration; the ToS user-content clause (before public launch); transcript-retention reconcile (parallel lane).

---

# §3 · Reference detail (unchanged item text)

## §3-A · Locked-prose copy ratifications
| # | Entry | Surface |
|---|---|---|
| A1–A3 | `PACKET_DELIVERY_/BROKER_INTAKE_DIGEST_/LAHD_CONFIRMATION_..._EMAIL_BODY_V1` | P1 emails (provisional) |
| A4 | `chatFf3ResumeAfterBrokerReviewCard` (entry 13) | text to author; manifest with 042 |
| A5 | `chatFf3AmountReconciliationFlag` (entry 14) | ratified §3.2; manifest with 042 |

## §3-C · Synthetic ratifications
- C1 · W2 (4): SC-W2-{3DAY-ROUTES-EFS, 60DAY-ROUTES-DECLARATION, PREREQ-INCOMPLETE, UNKNOWN-TYPE-FAILCLOSED}-01.
- C2 · FF-4 call-site (5): reconciliation-blocks-FMR, FMR-boundary-equal-owner-branch, portal-text-drift, extractor-null-amount-safe-fall-through, 3-day-pay-implies-amount. → catalog ~21.

## §3-E · Broker-executed ops
- E2 branch-protection (`branch_protection_full_inventory_baseline_2026-07-03`) · E3 `ADMIN_EMAILS` · E4 Sentry scrubbers · E5 statute-watch LAMC scope.

## §3-F · Productization (P1–P6) — as-built
- **P1** email senders ✅ (copy provisional). **P2** verification core ✅ (view/dep forks N3/N4). **P3** SMS infra ✅ (tenant-SMS held N2; broker-alert+2FA live). **P4** ✅ CLOSED (Q1–Q5; fork N7). **P5** deploy-ready ✅ (N8/N16). **P6** CAPTCHA ✅ (scope held N1).

## §G · Standing guardrails (reaffirm — no change requested)
- FF-3 dark four-gate discipline · broker-only attribution (no attorney/SBN) · G3 disclaimer + G5 footer on every user surface · no early 042 VALIDATE.

---

**Requested by Engineering (Claude Code). Governing authority: Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · revised 2026-07-04**
