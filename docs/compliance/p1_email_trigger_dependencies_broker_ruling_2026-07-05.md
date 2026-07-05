# P1 Email Trigger Dependencies — Broker Ruling

**Date:** 2026-07-05
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering)
**Re:** Four-item ruling on P1 email trigger dependencies
**Request doc:** Engineering P1 email trigger dependencies ruling request, 2026-07-05

---

## Executive summary

**Part A — Broker-intake-digest cron: AUTHORIZED. Build immediately, ships dark.**

- **A1:** `BROKER_REVIEW_EMAIL = review@ownerpilot.ai` (monitored broker alias — see provisioning note below)
- **A2:** `BROKER_REVIEW_URL = https://ownerpilot.ai/broker-review`
- **A3:** Confirmed. Query `ff3_capture_status`; no-op (send nothing) when count is zero. Stays naturally dark until FF-3 goes live.

**Part B — LAHD-confirmation email:**

- **B1:** ADOPT option (i) — add optional `confirmation_ref` field to `lahd_filing_records`, send only when owner supplies one. Small migration authorized.
- **B2:** Owner's account email may be used for this send. Authorize admin `getUserById` email lookup with the safeguards specified below. Additional in-app consent required before first send.

Full disposition below.

---

## Part A — Broker-intake-digest cron

### A1 — Recipient authorization

**RULING: AUTHORIZE `BROKER_REVIEW_EMAIL = review@ownerpilot.ai`.**

Use a monitored broker alias, not a personal mailbox. Reasoning:

- **Continuity.** A personal address (jack@ownerpilot.ai or hjt521@gmail.com) creates a single-point-of-failure recipient. If I'm unavailable, intake queue drift becomes silent.
- **Auditability.** A dedicated `review@` alias produces a clean audit trail — every broker-review touchpoint routes through one address, one inbox, one archive. That's the discipline a compliance product needs when regulators or opposing counsel eventually ask "who reviewed this and when?"
- **Delegation-ready.** When OwnerPilot scales to multiple reviewing brokers (or to a broker + broker-associate model), `review@` fans out via mailbox rules without touching env vars or code.

**Provisioning task (broker-executed today):**

1. Create `review@ownerpilot.ai` as a mail alias in the ownerpilot.ai email setup, forwarding to `jack@ownerpilot.ai` for now (single-recipient fanout — will expand later)
2. Set `BROKER_REVIEW_EMAIL = review@ownerpilot.ai` on Vercel (production + preview)
3. Add to `ADMIN_EMAILS` distribution as well (per `omnibus_broker_ruling_2026-07-04` item 13, ADMIN_EMAILS is `jack@ownerpilot.ai,hjt521@gmail.com` — add `review@ownerpilot.ai` so review-adjacent alerts reach the same channel)
4. Post-provisioning: send a test message through Resend to `review@ownerpilot.ai` and confirm receipt at `jack@ownerpilot.ai`. Log the smoke test in the env-var registry (`env_var_registry_2026-07-04.md`)

**Rotation policy:** The alias itself doesn't rotate. Forwarding target reviewed annually or on any change to reviewing-broker roster.

### A2 — Review deep-link base

**RULING: `BROKER_REVIEW_URL = https://ownerpilot.ai/broker-review`**

Adopted. This is the canonical broker-review checklist entry point. When the digest email is sent, each intake in the digest deep-links to `{BROKER_REVIEW_URL}/intake/{intake_id}` or equivalent — engineering picks the URL pattern, but the base is fixed.

**Discipline:**

- Base URL is prod-only (`ownerpilot.ai`). Do not point broker-review emails at preview URLs — a broker following a stale preview link into an unreviewed staging environment is a compliance leak.
- The `/broker-review` route requires authentication (session-cookie or magic-link, engineer's choice — both acceptable). Anonymous access to broker-review surfaces is a hard no.
- G3 disclaimer + G5 footer apply to the review UI itself, not just the emails linking to it.

**Set on Vercel:** production + preview, same value. I'll set alongside `BROKER_REVIEW_EMAIL` today.

### A3 — Queue source and dark-until-FF-3 behavior

**RULING: CONFIRMED. Query `ff3_capture_status`; send nothing while count is zero.**

Engineer's recommendation is correct.

**Behavior spec:**

1. Cron fires on schedule (engineer picks cadence — recommend daily 08:00 PT initially, revise via ruling if too noisy or too sparse)
2. Query `ff3_capture_status` for rows in "awaiting review" state
3. **If count = 0:** cron completes with a log entry ("digest: 0 intakes awaiting review, no email sent") and exits. No email sent. No notification. Naturally dark.
4. **If count > 0:** compose the digest email using the ratified `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1`, populate with count + per-intake deep-links, send to `BROKER_REVIEW_EMAIL` via Resend
5. Log the send event (recipient, count, timestamp, message ID) to the audit sink

**Why "dark until FF-3 goes live" is the right posture:**

- FF-3 remains dark under `omnibus_broker_ruling_2026-07-04` guardrail 2 (dark four-gate discipline)
- FF3_CAPTURE_ENABLED still requires its own separate ruling before flipping in prod
- The digest cron sitting live-but-idle is exactly what we want — when FF-3 is eventually authorized to go live, the digest starts firing automatically without a code deploy or ruling coordination gap
- If the cron accidentally sends an email during the dark period (bug, misconfig, test data), that's an incident — but it's a self-limiting incident because the intake queue is empty during the dark period

**Failure mode:**

- Query fails → log the failure, retry once after 60 seconds (same pattern as the LAHD forms refresh cron), if still failing send a broker alert to `ADMIN_EMAILS` (not to `review@`) with the error detail. Do NOT retry indefinitely.
- Resend fails → same pattern. Retry once, then alert.

**Attestation section required** in the cron delivery: query used, dark-behavior smoke test (verify no email sends when count=0), populated-behavior smoke test (populate one test row, verify email sends with correct deep-link, then clean up the test row).

**Cadence recording:** When the cron is created, add it to the standing crons list in the session context so it's visible alongside the LAHD/RTC/rent-control/holiday-table crons.

---

## Part B — LAHD-confirmation email

### B1 — Confirmation reference source

**RULING: ADOPT OPTION (i). Add optional `confirmation_ref` field. Send email only when owner supplies one.**

Rejected alternatives:

- **Option (ii) — drop confirmation_ref, key on filing_date:** Weak. An email that says "your LAHD filing on 2026-07-04 has been recorded" without a reference number is content-thin, and the owner already knows they filed. The email's actual value is the confirmation number acting as a persistent record the owner can retrieve later.
- **Option (iii) — park the email entirely:** Overcorrects. LAHD-confirmation email is a real product surface — every landlord we've serviced (Clifton Alexander included) has needed to keep the filing confirmation reference somewhere retrievable. Parking the email means owners keep confirmation numbers in personal notes/screenshots, which is exactly the fragmented record-keeping OwnerPilot is designed to solve.

**Option (i) approved with these parameters:**

**Schema change:**

- Add nullable column `confirmation_ref VARCHAR(64)` (or engineer's preferred size — LAHD reference numbers I've seen are 8-12 chars, so 64 is generous headroom for future format changes) to `lahd_filing_records`
- No NOT NULL constraint — the field is optional; owner may file without capturing a reference, and the record still exists
- Migration follows the standard phase-3 pattern (`phase3_closeout_ratification_broker_signoff_2026-06-30` established the discipline — safe additive schema change, no VALIDATE gates required for a nullable column addition)
- No index needed initially; add one only if a later feature (e.g., "look up my filing by confirmation ref") justifies it

**UI change:**

- Add an optional input to the LAHD filing intake step: "LAHD confirmation reference (optional)" with hint text: "Paste the confirmation number LAHD emailed you after filing. You can also add this later from your filing history."
- Validate as free-text, trim whitespace, cap at 64 chars (matches schema)
- Do NOT block the filing record on this field — owner can submit the record without it, and the record still lands

**Email trigger logic:**

- LAHD-confirmation email sends **only** when `confirmation_ref IS NOT NULL AND confirmation_ref != ''`
- If owner submits filing without confirmation_ref, no email sent (they can add it later — see next bullet)
- If owner later edits the record to add confirmation_ref, the email sends on that edit (edit-triggered send, not just insert-triggered)
- Idempotency: send at most one LAHD-confirmation email per filing_record_id. Track sent state via a `confirmation_email_sent_at TIMESTAMPTZ NULL` column on the same table. Add in the same migration.

**Not authorized in this ruling:**

- Any automated retrieval of the confirmation ref from LAHD's system. LAHD does not expose an API for this; a scraped/browser-automated retrieval would be brittle and outside broker scope. Owner-supplied only.
- Any parsing of screenshotted LAHD confirmation emails. Optical extraction adds complexity and failure modes for a field that's easy for the owner to type.

**Attestation section required:** migration diff, UI screenshot, trigger-logic test coverage (send-on-insert, send-on-edit-add, no-send-when-null, idempotency), email preview with populated `{{confirmation_ref}}`.

### B2 — Owner email + consent

**RULING: OWNER'S ACCOUNT EMAIL AUTHORIZED for this send. Admin `getUserById` email lookup AUTHORIZED with safeguards. Additional in-app consent required before first send.**

Reasoning:

**Why owner's account email is appropriate here:**

- The owner voluntarily supplied their account email when creating the OwnerPilot account
- The LAHD-confirmation email is **transactional** in character — it's a receipt for a filing action the owner just took on their own record inside OwnerPilot. Transactional emails are broadly permitted under CAN-SPAM (15 U.S.C. § 7702(2), 16 CFR § 316.3) because they relate to a transaction the recipient initiated
- The alternative (requiring separate opt-in for LAHD-confirmation email) creates a worse user experience for a low-risk send — most owners will want the record

**Safeguards required with the authorization:**

1. **First-time consent gate.** Before OwnerPilot sends any LAHD-confirmation email to a given owner, the owner must have acknowledged in-app that they authorize OwnerPilot to send filing-record acknowledgments to their account email. This is a **one-time per owner** acknowledgment, captured on either: (a) account creation flow (new users), or (b) first LAHD filing they save (existing users). Persist as `email_notifications_ack_at TIMESTAMPTZ NULL` on the users table.
2. **Unsubscribe / preference link in every email.** Standard CAN-SPAM footer with a working preference link that lets the owner turn off LAHD-confirmation emails specifically (not just all OwnerPilot email — granular preference). Preference stored per-notification-type.
3. **Suppression list check on every send.** Before sending, check whether the recipient has previously bounced hard, marked as spam, or opted out of this notification type. If any hit, do not send. Log the suppression.

**Admin `getUserById` lookup:**

- **AUTHORIZED** for the specific purpose of resolving `user_id → account_email` in the email-send code path
- Scoped narrowly: the lookup function used in this path must return **only** the email address (and, if useful, the `email_notifications_ack_at` timestamp for the consent-gate check), not the full user record. Least-privilege discipline.
- **Not authorized:** general-purpose admin user lookup for other paths. This is a dedicated function for the transactional-email use case. If a future feature needs a similar lookup, request a separate ruling.
- Access logging: every call to the lookup function logs (caller code path, user_id looked up, timestamp) to the audit sink. If we ever need to reconstruct "which user records were accessed for which sends," the log has it.

**Not authorized in this ruling:**

- Sending LAHD-confirmation email to any address other than the owner's ratified account email. No cc'ing counsel, no forwarding to a co-owner, no "also send to this address" input. Recipient-neutral policy (per `omnibus_broker_ruling_2026-07-04` item 6) applies to packet delivery, not to LAHD-confirmation email — different threat model, different discipline.
- Sending to owners who have not completed the first-time consent gate. The gate is a hard prerequisite.

**Attestation section required:** consent-gate UI screenshot, lookup-function scope diff (showing narrowly-scoped return type), suppression-list check coverage in tests, preference-link end-to-end (click link → land on preference page → toggle → save → next send respects the setting).

---

## Build sequencing

Given the two parts have different readiness:

**Immediate (start today):**

- Part A cron (all three sub-items authorized; env vars I'll set today alongside PACKET_VERIFY_SECRET and Turnstile from yesterday's ratification)
- Ships dark, no risk

**Design slice (start when engineer has bandwidth, ideally this week):**

- Part B (i) migration + UI field + trigger logic + consent gate + admin lookup
- Not on the 042 co-batch — this is independent of migration-042 and can land in its own PR anytime
- Requires broker countersign of the migration diff + attestation packet before flipping the send path live

**PR flow:**

- Part A: build → PR → I countersign → land → ships dark (auto-live when FF-3 flips per its own future ruling)
- Part B: build → PR (migration + UI + email trigger + consent gate as one bundle, or split if engineer prefers) → I countersign attestation → land → live for owners who complete the consent gate

---

## Env var provisioning today

Consolidated broker-executed env work as of 2026-07-05:

From `broker_ratification_2026-07-04` item 5:
- PACKET_VERIFY_SECRET (P2)
- TURNSTILE_SITE_KEY (P6, public)
- TURNSTILE_SECRET_KEY (P6, server-only)

From this ruling:
- BROKER_REVIEW_EMAIL = review@ownerpilot.ai (Part A1)
- BROKER_REVIEW_URL = https://ownerpilot.ai/broker-review (Part A2)

Plus the `review@ownerpilot.ai` alias creation on the email host.

I'll do all six + alias in one session today and update `env_var_registry_2026-07-04.md` with the additions. Ack when complete.

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`:

1. Broker-only attribution
2. FF-3 dark four-gate discipline (FF3_CAPTURE_ENABLED still requires its own ruling — this ruling does NOT flip it)
3. G3 disclaimer + G5 footer on every user surface (applies to broker-review UI, LAHD-confirmation intake UI, preference page)
4. Address + tenant name file-naming pattern preserved
5. CAR forms discipline per P4 Q1 ruling
6. All 042-window items remain in the 07-10 co-batch

---

## Ratification & signature

This ruling is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **p1_email_trigger_dependencies_broker_ruling_2026-07-05**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
