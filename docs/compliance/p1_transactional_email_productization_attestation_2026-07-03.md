# P1 — Transactional Email Productization — Attestation

**Date:** 2026-07-03
**Built under:** BROKER STANDING ORDER — Productization Lane Authorization 2026-07-03 §2 P1.
**Author:** Engineering (Claude Code).

---

## §1 — Pipeline status (per P1 "confirm current status first")

**Working.** The Sev-1 email incident (`incident_2026-07-02_transactional_email_prod.md`) is **RESOLVED** — `RESEND_API_KEY` set on Vercel Prod+Preview, `ownerpilot.ai` verified in Resend (DKIM/SPF/MX/DMARC green, 2026-07-02 17:11). Existing families (`claim`, `privacy-ack`) send. No fix needed — proceeded to the "add" path.

## §2 — What shipped (sender layer)

`lib/email/resend.ts`:
- `send()` extended with an optional `attachments` param (Resend format) — no other behavior change.
- Three new `EmailTemplate` families + senders, each backed by a **PROVISIONAL** Shape-B locked-prose body (G5 footer baked in), tagged for the C1-A send monitor:
  - `sendPacketDeliveryEmail(to, packet)` — combined packet PDF attached; body carries a mandatory **CCP § 1162 non-service disclaimer** (see §3).
  - `sendBrokerIntakeDigestEmail(to, count, reviewUrl)` — broker notification; **no case PII in the body** (count + auth-gated link only).
  - `sendLahdConfirmationEmail(to, confirmationRef, filedDateISO)` — LAHD filing confirmation forward (ref + date only).
- 3 provisional locked-prose entries added to the phase-2 manifest (128 total): `PACKET_DELIVERY_EMAIL_BODY_V1`, `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1`, `LAHD_CONFIRMATION_FORWARD_EMAIL_BODY_V1`.

## §3 — Compliance surface handled: CCP § 1162 (packet-delivery)

Emailing an eviction packet is **not** legal service. To prevent any email delivery from being mistaken for service, the packet-delivery body carries a prominent, mandatory disclaimer: *"this email delivers a COPY only. It is NOT legal service… Under California Code of Civil Procedure section 1162, service must be performed in person or by another method the statute allows… does not begin any legal deadline."* Recipient-neutral (owner / counsel / tenant copy). **Broker to ratify** the §1162 framing + confirm whether tenant-recipient delivery is desired or should be restricted to owner/counsel (flagged, not assumed — the disclaimer makes any recipient safe, but the recipient policy is the broker's call).

## §4 — What is NOT wired (follow-up / 07-10 checklist)

- **Copy ratification:** all three bodies are PROVISIONAL — broker ratifies the exact wording at the 07-10 countersign (they're locked-prose entries; the guard already enforces byte-fidelity once ratified).
- **Trigger wiring:** the senders are the callable layer. Wiring them to triggers (packet-delivery from the broker-checklist / produce path; intake-digest from a cron or intake-completion hook; LAHD-confirmation from the `lahd_filing_records` flow) is a follow-up slice — surfaced so it's not assumed shipped.
- **No prod send occurs** from this PR; it adds senders + copy only.

## §5 — Verification

P1 email suite 15/15 (attachment carried, §1162 disclaimer present, G5 footer present, no-PII digest, no-op on missing key) · tsc clean · locked-prose PASS 128 · banned-terms OK. No migration.

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P1) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
Engineering author: Claude Code.
