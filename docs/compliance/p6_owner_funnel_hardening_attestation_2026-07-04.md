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
