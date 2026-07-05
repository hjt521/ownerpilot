# Broker-Intake-Digest Cron — Attestation (P1 ruling Part A)

**Date:** 2026-07-05 · **Ruling:** `p1_email_trigger_dependencies_broker_ruling_2026-07-05` Part A (A1/A2/A3). **Author:** Engineering.

---

## Shipped

- `app/api/cron/broker-intake-digest/route.ts` — cron, `Bearer CRON_SECRET` auth (same posture as `privacy-ack-send`).
- `lib/cron/brokerIntakeDigest.ts` — pure `decideDigestSend(count, recipient)` (send only when recipient configured **and** count > 0).
- `lib/email/resend.ts` — `sendAdminAlertEmail(subject, text)` (internal ops alert to `ADMIN_EMAILS`; new `admin-alert` template family; never owner-facing, no locked prose).
- `vercel.json` — cron registered at `0 15 * * *` (15:00 UTC ≈ 08:00 PT; A3 recommended daily 08:00 PT).
- `lib/cron/__tests__/brokerIntakeDigest.test.ts` — dark-behavior coverage.

## Query used (A3)

```
select id from chat_sessions where ff3_capture_status = 'awaiting_broker_review'  (count: exact, head: true)
```

`ff3_capture_status` lives on `chat_sessions` (migration 043). `awaiting_broker_review` is the parked-for-review value.

## Dark-until-FF-3 posture (A3)

Two independent skip conditions, both silent (log + exit, no email):

1. **`unconfigured`** — `BROKER_REVIEW_EMAIL` unset → no send (safe pre-provisioning).
2. **`empty_queue`** — count 0 → no send. This is the **steady state until FF-3 goes live**: FF-3 is dark under `omnibus_broker_ruling_2026-07-04` guardrail 2, so no `awaiting_broker_review` rows can exist. When FF-3 is separately authorized, the digest begins firing automatically — no code deploy, no ruling-coordination gap.

## Failure mode (A3)

Both the count query and the send are wrapped in `withOneRetryThenAlert`: run once → on failure wait 60s → run once more → on second failure log + email `ADMIN_EMAILS` (**not** `review@`) with the error detail, then stop (HTTP 500). No indefinite retry. `maxDuration = 90` accommodates the single 60s delay.

## Smoke tests

- **Dark-behavior (automated, PASSING):** `brokerIntakeDigest.test.ts` asserts skip for count 0, unset recipient, empty-string recipient, and negative/NaN counts; send only for count > 0 with a recipient. `tsx` run green.
- **Populated-behavior (post-provisioning, broker-executed):** after `BROKER_REVIEW_EMAIL` is set, insert one `chat_sessions` row with `ff3_capture_status = 'awaiting_broker_review'`, invoke the cron with the `CRON_SECRET` bearer, confirm one email arrives at `review@ownerpilot.ai` (forwarded to `jack@`) carrying `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1` with the count and `BROKER_REVIEW_URL` link, then delete the test row. Cannot be run in the sandbox (no DB/Resend network; recipient unset). Runbook step for JT once the alias + env are live.

## Notes

- Email body is the ratified `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1` (`{{count}}` + `{{review_url}}`); the ratified copy is a single checklist link, not per-intake deep-links — honored as-ratified.
- Send audit logs `recipient_domain` only (never the full address), per the standing recipient-logging discipline.
- Standing crons list now: geocode-audit, mirror-queue-drain, mirror-queue-depth-check, privacy-ack-send, **broker-intake-digest**.

## Verify

tsc clean · dark-behavior test green · banned-terms OK · vercel.json valid. No migration.

— Engineering (Claude). Awaiting broker countersign per Part A PR flow.

---

**COUNTERSIGNED** — approved per `queue_drainer_four_items_broker_ruling_2026-07-05` item 4. Reservation carried to the 042 follow-up queue (not a blocker): the cron's **first live fire after FF-3 goes on is treated as the populated smoke test** — the broker reviews the delivered digest email before the second fire is authorized.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
