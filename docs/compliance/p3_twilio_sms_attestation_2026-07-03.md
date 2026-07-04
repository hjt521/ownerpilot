# P3 — Twilio SMS Channel — Attestation

**Date:** 2026-07-03
**Built under:** BROKER STANDING ORDER — Productization 2026-07-03 §2 P3.
**Author:** Engineering (Claude Code).

---

## §1 — HEADLINE FORK: P3 reverses a prior standing ruling (§B.7) — server→tenant SMS is HELD

The P3 order authorizes **server-sent tenant courtesy reminders via Twilio**. A prior **ratified** ruling directly prohibits this:

> `lib/riskpath/courtesyReminder.ts` — *"§B.7: owner-copy-only, NO server→tenant SMS."* Copy ratified in `deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md §2`. The courtesy reminder is rendered for the **owner to send from their own phone** (`sms:` deep-link handoff); the OwnerPilot server never texts the tenant.

§B.7 almost certainly exists for TCPA reasons: owner-initiated SMS keeps OwnerPilot **out of the sender chain**, avoiding direct TCPA liability for texting tenants (reassigned-number risk, consent-provenance, autodialer classification). Server-sending reminders to tenants moves OwnerPilot INTO the sender role.

**Per standing order §4.4, I paused the tenant-SMS sub-lane and did NOT silently reverse §B.7.** The `tenant_reminder` purpose is **hard-blocked in code** (`sendGate` returns `purpose_blocked_pending_ruling` regardless of consent), fail-closed, until the broker **explicitly reverses §B.7 with the TCPA rationale addressed**. Engineer recommendation: keep §B.7 (owner-copy handoff) unless there's a specific reason to take on direct tenant-SMS liability; if reversing, require explicit prior express written consent + double opt-in + reassigned-number mitigation.

## §2 — What shipped (the non-conflicting P3 infrastructure)

Full TCPA-disciplined SMS infra, usable now for the two **non-tenant** purposes:
- `lib/sms/quietHours.ts` — recipient-local 8pm–8am enforcement; area-code→timezone inference; unknown → Pacific + `inferred` flag (logged).
- `lib/sms/smsConsent.ts` — inbound STOP/START/HELP keyword parsing; consent record + `applyKeyword`; `sendGate(purpose, consent)` (tenant_reminder hard-blocked; broker_alert + auth_2fa allowed).
- `lib/sms/twilio.ts` — Twilio REST sender (fetch, **no dependency**), gated by sendGate → quiet-hours (exempt for user-initiated `auth_2fa`) → send; structured compliance log per attempt (recipient, purpose, template, opt-in evidence, outcome). **Not a service channel — CCP §1162 excludes SMS.**

**Live purposes now:** `broker_alert` (intake/packet/review-pending → the operating broker) and `auth_2fa` (login codes → account user). Both TCPA-clean (operator / transactional).

24 tests pass (quiet-hours boundaries incl. 2FA exemption, keyword parsing, gate blocking, sender mocked). tsc clean, banned-terms OK.

## §3 — Broker-executed / held items (07-10 checklist → omnibus §F)

- **F7 · §B.7 reversal ruling** — rule the headline fork before any server→tenant SMS. *(blocks tenant_reminder only)*
- **F8 · Twilio env** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `TWILIO_STATUS_CALLBACK_URL` on Vercel.
- **F9 · 10DLC brand + campaign registration** — DUNS/EIN attestation in the Twilio console (per order §2 P3). STOP/HELP via Twilio Advanced Opt-Out — confirm the wired flow at registration.
- **F10 · SMS persistence migration** (broker-executed) — `sms_consent` + `sms_messages` tables (the sender emits log records the wiring layer persists; deferred like `compliance_gates`). Consent enforcement for any reminder-class purpose requires stored opt-in — cannot ship tenant reminders without this AND F7.
- Cost: Twilio per-message billing acknowledged; broker monitors from console (order §2 P3).

## §4 — Not wired (follows F7/F8/F10)

Inbound webhook (STOP/HELP handling endpoint), the broker-alert/2FA trigger call-sites, and any persistence are follow-ups — the sender + gates are the callable, tested core.

## §5 — Verification

P3 suite 24/24 · tsc clean · banned-terms OK · no new dependency (Twilio via REST/fetch) · no migration in this PR.

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P3) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
Engineering author: Claude Code.
