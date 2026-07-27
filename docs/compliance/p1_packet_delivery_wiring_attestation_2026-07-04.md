# P1 — Packet-Delivery Trigger Wiring — Attestation

**Date:** 2026-07-04 · **Ruling:** `omnibus_broker_ruling_2026-07-04` Item 6 (recipient-neutral + 3 tightenings). **Author:** Engineering (Claude Code).

---

## Shipped — the packet-delivery endpoint with all three tightenings

`app/api/notice/packet/deliver/route.ts` — POST; emails a combined packet PDF (a COPY) to any recipient the authenticated user directs.

- **T1 — mandatory §1162 disclaimer.** `sendPacketDeliveryEmail` now appends the ruled verbatim `PACKET_DELIVERY_NOT_SERVICE_1162_DISCLAIMER` (new locked-prose entry, Shape-B, manifest 129) to every delivery. Verified present in the send. (Cover-page inclusion rides the cover-sheet QR/disclaimer work when the produce-path lands the secret.)
- **T2 — sender auth.** The endpoint requires a claimed session (`session.user_id`); no cookie → 401, unclaimed session → 401. Anonymous `/chat` sessions cannot deliver to arbitrary third parties (spam/phishing + SMTP/10DLC reputation control).
- **T3 — recipient logging.** Every attempt logs `{sender_user_id, recipient_log_id, manifest_hash, status, at}` to the audit sink (`evt: packet.delivery`). `recipient_log_id = SHA-256(lowercased email) + ':' + first-4-of-local-part` (`lib/email/deliveryLog.ts`) — reconstructable in a broker-review dispute, **never plaintext PII**.

Validation: recipient must be a valid email (else 400); packet attachment + `manifestHash` required (else 400). Body via `readRequestBody` (route-body-parsing guard clean).

## Not yet wired (follow-ups)
- **Cover-page §1162 verbatim** — the cover-sheet already carries a disclaimer footer; adding the ruled verbatim to the cover rides the P2 produce-path/cover work.
- **Broker-intake-digest + LAHD-confirmation triggers** — the other two P1 senders' call-sites (simpler; no third-party recipient) are a separate slice.

## Verify
deliveryLog 5/5 (hash+prefix, no plaintext) · §1162 verbatim append smoke-verified · tsc clean · locked-prose 129 · banned-terms OK · route body-parsing 35 routes clean. No migration.

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
