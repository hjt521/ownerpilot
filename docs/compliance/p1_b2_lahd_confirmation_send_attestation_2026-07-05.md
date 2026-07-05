# P1 B-2 — LAHD-Confirmation Send Path — Attestation

**Date:** 2026-07-05 · **Ruling:** `p1_email_trigger_dependencies_broker_ruling_2026-07-05` Part B (B1 send path + B2 safeguards). **Author:** Engineering.

---

## Shipped

- **Migration 045** — `users.email_notifications_ack_at` (consent gate) + `email_notification_suppressions` table (`user_id`, `notification_type`, `reason` ∈ opt_out/hard_bounce/spam_complaint; owner-read RLS). Additive + nullable; no VALIDATE gate.
- **`lib/email/ownerNotify.ts`** — narrowly-scoped `getOwnerNotifyContext` (SELECTs **only** `email` + `email_notifications_ack_at` from `public.users`, with an access log — never the email); `isOwnerSuppressed` (fail-closed); pure `decideLahdConfirmationSend`.
- **Send trigger** in `POST /api/notices/[riskpathId]/lahd-filing-record` — best-effort, dark-safe; never throws into the record write.
- **Consent endpoint** `POST /api/account/email-consent` (idempotent ack).
- **Preference endpoints** `GET/POST /api/account/email-preferences` (granular per-type opt-out → suppression rows).
- **UI** — consent checkbox in the filing section (records ack before the record lands); `/preferences/email` page (CAN-SPAM footer destination); preference-link footer appended to the confirmation email (outside the locked body).

## Ruling conformance

- **B1 confirmation_ref source** — send only when `confirmation_ref` is present (B-1 field). Insert-triggered on save; edit-triggered naturally (a correction row with a ref triggers, guarded by idempotency).
- **B1 idempotency** — `confirmation_email_sent_at` stamped on send; the trigger checks whether **any** filing row for the riskpath already carries a stamp, so at most one email per filing across correction rows.
- **B2 owner email + least privilege** — email read directly from `public.users` (no auth-admin needed); the lookup returns only email + consent timestamp; every read is access-logged (`evt: owner_email.lookup`, user_id + path + time, never the email).
- **B2 consent gate** — no send until `email_notifications_ack_at` is set (captured on the owner's first LAHD filing with the "email me a copy" checkbox). Hard prerequisite.
- **B2 suppression** — checked on every send (`isOwnerSuppressed`, fail-closed); opt-out/hard-bounce/spam-complaint all suppress.
- **B2 granular preference + unsubscribe** — per-type toggle at `/preferences/email`; footer link in every confirmation email.
- **Recipient-neutral policy does NOT apply** — sent only to the owner's account email; no cc/forward input (correct per ruling).

## Dark-safe

Four independent gates keep this inert until deliberately enabled: (1) `RESEND_API_KEY` unset → `send()` no-ops; (2) no `confirmation_ref` → skip; (3) no consent → skip; (4) suppressed → skip. `decideLahdConfirmationSend` unit test covers all four + idempotency.

## Trigger-logic coverage

`lib/email/__tests__/ownerNotify.test.ts` (7 assertions): send when all conditions met; block on no-ref / whitespace-ref / no-consent / suppressed / already-sent; ref-absence precedence. All green.

## Not wired (needs broker/env, per ruling)

- **Hard-bounce / spam-complaint suppression writes** — the `email_notification_suppressions` store + check are in place, but the Resend webhook that writes bounce/complaint rows is a follow-up (needs the Resend webhook secret + endpoint). Opt-out writes work today.
- **One-click token unsubscribe** — the preference page is auth-gated; a signed-token no-login unsubscribe is a possible enhancement (owners who consented have accounts).

## Verify

tsc clean · send-decision test 7/7 · banned-terms OK · attribution guard OK · locked-prose 125. Migration 045 additive/nullable.

— Engineering (Claude). Awaiting broker countersign + `RESEND_API_KEY` before the send path goes live.
