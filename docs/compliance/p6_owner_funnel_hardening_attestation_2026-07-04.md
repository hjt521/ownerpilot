# P6 — Owner-Funnel Hardening (CAPTCHA gate) — Attestation

**Date:** 2026-07-04 · **Ruling:** `omnibus_broker_ruling_2026-07-04` Item 1 (P6 = owner retail funnel; harden `/chat`). **Author:** Engineering (Claude Code).

---

## Shipped

`app/api/chat/route.ts` — CAPTCHA gate on **new-session creation** (the funnel entry). When a request arrives with no session cookie, `verifyCaptchaToken(captchaToken, remoteIp)` runs before `createSession`; on failure → **403** + audit log (`evt: chat.captcha_blocked`). `captchaToken` added to the body schema (optional). Existing sessions (cookie present) are never re-challenged — the gate is one-time at funnel entry, not per-message.

**Dark by default:** with `TURNSTILE_SECRET_KEY` unset, `verifyCaptchaToken` returns `configured:false ⇒ allow`, so the gate is a safe no-op until the secret is provisioned (omnibus §F-P6b). Same posture as the rate-limit/classifier.

## Funnel hardening — complete picture

- **Rate-limit** ✅ (P4-Q4, `/api/chat`).
- **CAPTCHA** ✅ (this PR, new-session gate).
- **PII** — the owner legitimately enters tenant PII during intake (that IS the funnel); the lane7 a15/a14 denylist scrubs PII **downstream** (mirror/analytics) so it never leaks — already in place. No input-block gate (that would break intake).

## Not yet wired
- **Client Turnstile widget** — the `/chat` page must render the Turnstile challenge and send `captchaToken` with the first message. Client-UI follow-up; harmless while the secret is unset (server allows).
- **`TURNSTILE_SECRET_KEY`** + site key on Vercel (§F-P6b, broker-executed).

## Verify
tsc clean · captcha unit tests green · banned-terms OK · route body-parsing 35 clean. No migration.

— **Jack Taglyan / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**; engineering author: Claude Code.


---

> **Annotated correction — CalDRE license number (2026-07-28):** This document's original text above
> references CalDRE **B9445457**. That number was an error; the broker's correct license number is
> **CalDRE 01871659**. Per DOC-003 §9, this is an annotated correction appended to this closed record —
> the original text above is preserved unmodified, not rewritten or deleted. See the broker's direct
> instruction (session of 2026-07-27/28) authorizing this correction, and the paired
> `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`, which already carries the corrected
> number.
>
> — Appended by engineering (Claude/Cowork) per broker instruction, 2026-07-28. Not a new ruling; does
> not reopen or otherwise alter this document's original disposition.
