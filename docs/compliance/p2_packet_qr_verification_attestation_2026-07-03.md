# P2 — Packet QR Authenticity Verification — Attestation

**Date:** 2026-07-03
**Built under:** BROKER STANDING ORDER — Productization 2026-07-03 §2 P2.
**Author:** Engineering (Claude Code).

---

## §1 — What shipped (PII-safe core)

`lib/produce/packetVerification.ts` — the QR target's stateless, PII-safe core:
- `signPacketToken(claims)` / `verifyPacketToken(token)` — HMAC-SHA256 (`node:crypto`, no new dep), secret `PACKET_VERIFY_SECRET`. Binds ONLY `{packetId, manifestHash, generatedAt, exp}` — **no tenant name / address / amount**. 72h default TTL (short-lived).
- Constant-time signature check, tamper + forgery + expiry rejection.
- `authenticityView(claims)` — the PII-free payload a scan would show: manifest hash + generation time + a "verified, not legal service, no personal information" note.

11/11 tests: round-trip, tamper, wrong-secret, forged-payload, expiry boundary, malformed, PII-free view. tsc clean, banned-terms OK.

## §2 — §1162 compliance (ruled, honored)

The QR / verification link is **not** service and goes on the **cover page ONLY, never on the 3-day notice itself** (standing order §2 P2). This module encodes an authenticity check, not a servable document.

## §3 — FORKS surfaced (per standing order §4.4 — built the clean core, paused these sub-lanes)

Two decisions needed before the endpoint + QR image + cover wiring land:

**Fork P2-A — verification-view content + auth model.** The order says "broker-side auth-gated," but the value prop is "a filing clerk verifies authenticity in one scan" (a clerk is not an authenticated broker), and the packet carries tenant PII. These conflict, and PII exposure via a photographable QR is a privacy decision not yet ruled.
- **Engineer lean:** the scanned URL shows the **authenticity view only** (`authenticityView` — manifest hash + generation time + "verified", NO PII), served via the **short-lived signed token** (possession of the QR = time-limited read access, no login). This satisfies "clerk verifies in one scan" WITHOUT exposing tenant PII to anyone who photographs the cover page. The full packet stays behind the existing broker-auth document route.
- **Alternative:** broker-login-gated full-packet view (defeats the clerk-scan value) — not recommended.
- **Broker to rule:** authenticity-only + signed-token (lean), or full-packet + broker-login, or a hybrid.

**Fork P2-B — QR image library.** No JS QR lib is installed. Rendering the token URL into a QR bitmap needs a dependency (`qrcode` npm, per the order's option) added to `package.json` — a JT-executed `npm install` on merge.
- **Engineer lean:** add `qrcode` (+ `@types/qrcode`); a thin `packetQrDataUrl(url)` adapter renders a PNG/SVG data-URL embedded as `<img>` in the cover-sheet HTML. Deferred until Fork P2-A is ruled (the QR encodes the endpoint URL, whose shape depends on P2-A).

## §4 — What is NOT built (follows the fork ruling)

- The verification endpoint (`app/api/verify/[token]`) — shape depends on Fork P2-A.
- The `qrcode` dependency + `packetQrDataUrl` adapter — Fork P2-B.
- Cover-sheet QR embedding (`lahdCoverSheet.ts`) — depends on both.
- `PACKET_VERIFY_SECRET` env — broker-executed (Vercel), add to the 07-10 checklist.

## §5 — Omnibus additions (§F productization queue)

Append to `omnibus_broker_ruling_request_2026-07-03.md` §F:
- **F4 · P2 verification-view fork** (P2-A) — rule content + auth model.
- **F5 · P2 QR dependency** (P2-B) — approve `qrcode` npm dep.
- **F6 · `PACKET_VERIFY_SECRET`** — set on Vercel (07-10).

## §6 — Verification

P2 core 11/11 · tsc clean · banned-terms OK. No migration, no manifest change, no new dependency in this PR (pure `node:crypto`).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P2) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
Engineering author: Claude Code.
