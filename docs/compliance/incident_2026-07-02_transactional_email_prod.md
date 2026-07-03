# Incident — Transactional email never sending in production (Sev-1, RESOLVED)

**Severity:** Sev-1 (per E1 on-call runbook §2 — outage of a compliance-facing behavior: CCPA receipt-ack could not send).
**Discovered:** 2026-07-02, during Fork-D1 ack-send enablement — the §3.4 broker-confirm of `RESEND_API_KEY`.
**Status:** RESOLVED 2026-07-02.

---

## §1 — Symptom
No transactional email was sending in production — neither the magic-link claim email (`sendClaimEmail`) nor the newly-wired privacy CCPA ack (`sendPrivacyAckEmail`). Silent: `send()` no-ops when the key is missing; Resend rejects an unverified sender otherwise.

## §2 — Root cause (two independent gaps, both pre-existing)
1. **`RESEND_API_KEY` was never set on Vercel** (Project or Shared, any environment). `lib/email/resend.ts::send()` warns and returns early when it's unset → no send.
2. **Sender domain not verified in Resend.** The Resend account had only **`notifications.ownerpilot.ai`** verified, but the code sends **from `noreply@ownerpilot.ai`** (root domain). Resend rejects any send whose FROM domain isn't verified — so even with a key, sends would fail.

Both predate the email code. Unnoticed because the app is pre-launch (no claim/ack email had been triggered in prod).

## §3 — Detection
The **§3.4 Resend-key confirmation** mandated by the D1 ack-send attestation — searching Vercel env for `RESEND_API_KEY` (empty) then inspecting Resend Domains (only `notifications.ownerpilot.ai` verified). **No CI guard catches this**: prod env presence and external-service (Resend) domain-verification are runtime/ops state, not code. The unit test proves the code *calls* Resend correctly; it cannot prove prod is configured.

## §4 — Resolution
1. `RESEND_API_KEY` added to Vercel **Production + Preview** (Sensitive) + redeploy. ✓
2. **`ownerpilot.ai` added + verified in Resend** (Cloudflare DNS; DKIM `resend._domainkey`, SPF `send`, MX `send`, DMARC all green; region us-east-1). Domain-verified 2026-07-02 17:11. ✓

Sender `noreply@ownerpilot.ai` (broker-chosen, ruling option B) now sends; ack Reply-To `privacy@ownerpilot.ai` unchanged (header — routed by the domain's mail, pending the mailbox confirm).

## §5 — Guard gap + fast-follow (E1 §6)
Static guards can't assert prod email works. Detection belongs to:
- **D1 preview-submit test** (attestation items 5–6) — now unblocked and meaningful (a real send will occur).
- **Soft-launch monitoring** — add "transactional email sends observed / Resend failure rate = 0" to the Fork-G watch, surfaced via C1 Sentry (once `SENTRY_DSN` set) on send throws + Resend Logs.

## §6 — Standing-rule reinforcement
The broker's §3.4 key-confirm is what caught this. Extend the discipline: attestations that assume an "existing configured sender / external service" must verify the **external-service state is actually true** (Resend domain verified; env var present in the right scope), not just that the code references it — the same shape as the "stub comment ⇒ open gap" rule.

---

— Engineering (Claude Code) · Sev-1 incident (transactional email) · 2026-07-02
