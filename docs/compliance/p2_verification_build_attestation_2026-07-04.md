# P2 — Packet QR Verification — Build Slice (post-ruling) — Attestation

**Date:** 2026-07-04
**Ruling:** `omnibus_broker_ruling_2026-07-04` Item 3 (authenticity-only, HMAC, 90-day, no login, no PII) + Item 4 (adopt `qrcode`).
**Author:** Engineering (Claude Code), under BROKER STANDING ORDER 2026-07-03 §2 P2.

---

## §1 — What shipped (this PR)

- **`lib/produce/packetVerification.ts`** updated to the ruled spec: HMAC-SHA256 over `{manifestHash, generatedAt, packetType, exp}` (the ruled `{manifest_hash, generation_ts, packet_type, expiry_ts}` payload), keyed by `PACKET_VERIFY_SECRET`; **90-day** expiry (`PACKET_VERIFY_TTL_DAYS`); `authenticityView()` returns ONLY hash + generation time + packet type + a "not legal service, no personal information" note (the ruling's approved-exhaustive contents); `packetVerifyUrl()` → `https://ownerpilot.ai/verify/<token>`. No packetId / no PII in the token (dropped per the ruled payload).
- **`lib/produce/packetQr.ts`** (Item 4): `packetQrDataUrl(url)` — thin adapter over `qrcode` → PNG data-URL for the cover-sheet `<img>`.
- **Dependency:** `qrcode@^1.5.4` added to `package.json` + `package-lock.json` (reconciled). `@types/qrcode` could not be installed in this environment → vendored a minimal `types/qrcode.d.ts` (declares only `toDataURL`; remove if `@types/qrcode` is later added).
- **Tests:** `packetVerification.test.ts` — round-trip, tamper/forgery/wrong-secret, 90-day expiry boundary (day 89 valid / day 91 expired), malformed, PII-free view, `/verify` URL. QR render smoke-verified (valid PNG data-URL).

## §2 — §1162 (honored)

The QR/verify link is NOT service and goes on the cover page ONLY, never the 3-day notice. The verify view is authenticity-only (answers "is this cover authentic?"), no tenant data, no login.

## §3 — Not yet built (next P2 slice)

- **The `/verify/<token>` page** (public, authenticity-only view rendering `authenticityView`).
- **Cover-sheet QR embed** (call `packetQrDataUrl(packetVerifyUrl(signPacketToken(...)))` in `lahdCoverSheet` and embed the `<img>`).
- **`PACKET_VERIFY_SECRET`** on Vercel (broker-executed; omnibus §F-P2c) — until set, sign/verify throw (guarded).

## §4 — Verification

P2 verification 15/15 (90-day + packet_type) · QR render produces a valid PNG data-URL · tsc clean (vendored shim resolves) · banned-terms OK · lockfile reconciled (qrcode in, no dangling @types).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P2) + omnibus ruling 2026-07-04 Items 3–4 — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code.
