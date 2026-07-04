// lib/email/deliveryLog.ts
// Lane P1 (ruling omnibus_broker_ruling_2026-07-04 Item 6 Tightening 3) — packet-delivery audit logging.
// Recipient email is logged as SHA-256(lowercased email) + ':' + first 4 chars of the local-part — enough to
// reconstruct in a broker-review dispute WITHOUT a plaintext PII sink. NEVER log the full recipient address.

import { createHash } from 'node:crypto';

/** `<sha256hex>:<first4-of-localpart>` — a stable, non-reversible recipient identifier for the audit log. */
export function recipientLogId(email: string): string {
  const e = (email ?? '').trim().toLowerCase();
  const hash = createHash('sha256').update(e, 'utf8').digest('hex');
  const local = e.split('@')[0] ?? '';
  return `${hash}:${local.slice(0, 4)}`;
}

export interface PacketDeliveryLog {
  sender_user_id: string;      // authenticated user who triggered the delivery (Tightening 2)
  recipient_log_id: string;    // recipientLogId(email) — hash + prefix, no plaintext
  manifest_hash: string;       // the delivered packet's manifest hash
  status: 'sent' | 'skipped' | 'error';
  at: string;                  // ISO-8601
}

/** Emit the delivery event to the audit sink. Excerpt/identifier only — no plaintext recipient, no packet bytes. */
export function logPacketDelivery(rec: PacketDeliveryLog): void {
  console.info(JSON.stringify({ evt: 'packet.delivery', ...rec }));
}
