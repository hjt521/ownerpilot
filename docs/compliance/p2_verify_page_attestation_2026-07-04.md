# P2 — /verify page + cover-sheet QR embed — Attestation (slice 2)

**Date:** 2026-07-04 · **Ruling:** `omnibus_broker_ruling_2026-07-04` Item 3. **Author:** Engineering (Claude Code).

---

## Shipped
- **`app/verify/[token]/page.tsx`** — public, server-rendered, authenticity-only. Verifies the token (`verifyPacketToken`) and renders the ruling's approved contents: "✓ Authentic packet" + document type + generation time + manifest hash (short display, full on hover). Invalid/expired/unavailable → a clear "could not verify" message (expired notes the 90-day window). **No login, no tenant PII, not legal service** (stated on the page). `robots: noindex`.
- **`lib/produce/lahdCoverSheet.ts`** — optional `verifyQrDataUrl` + `verifyUrl` on `CoverSheetInput`; when present, embeds the authenticity QR + a "scan to verify … confirms the document hash only, no personal information, not legal service" caption. Backward-compatible (absent → no-op; existing cover-sheet test still green).

## Not yet wired (final P2 piece)
The **produce-path call-site** that, at packet generation, signs a token + renders the QR + passes `verifyQrDataUrl`/`verifyUrl` into the cover sheet — needs `PACKET_VERIFY_SECRET` (broker-executed, omnibus §F-P2c). Until the secret is set, `signPacketToken` throws by design, so the cover simply omits the QR (safe no-op).

## Verify
tsc clean · cover-sheet test green (additive field) · banned-terms OK · `/verify` logic smoke-verified (valid + invalid paths). No migration.

— **Jack Taglyan / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**; engineering author: Claude Code.
