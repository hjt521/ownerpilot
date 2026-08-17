// lib/produce/ownerContinuationQr.ts
// Owner Continuation QR V1 — purpose-specific QR renderer + owner-footer presentation adapter.
// This deliberately stays separate from packetQr.ts / packetVerification.ts (packet authenticity semantics).

import QRCode from 'qrcode';

export const OWNER_CONTINUATION_PRINTED_PHRASE = 'Scan to continue this record' as const;
const OWNER_LABEL = 'OWNER RECORD COPY — DO NOT SERVE';
const FOOTER_ANCHOR = '<div class="footer">';
const PNG_DATA_URL_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export async function ownerContinuationQrDataUrl(url: string, opts?: { size?: number }): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: opts?.size ?? 220,
  });
}

/**
 * Add the continuation QR only to the first Owner Record Copy notice footer. The existing tenant/full-packet
 * builders remain untouched; in a Full Packet this finds the owner label after the tenant section. The legal
 * Notice body is not rewritten. If the expected owner footer seam is absent, fail so the caller can print the
 * already-built Notice without a QR.
 */
export function withOwnerContinuationQr(ownerOrFullPacketHtml: string, qrDataUrl: string): string {
  if (!PNG_DATA_URL_RE.test(qrDataUrl)) throw new Error('invalid owner continuation QR image');
  const ownerAt = ownerOrFullPacketHtml.indexOf(OWNER_LABEL);
  if (ownerAt < 0) throw new Error('owner record copy seam not found');
  const footerAt = ownerOrFullPacketHtml.indexOf(FOOTER_ANCHOR, ownerAt);
  if (footerAt < 0) throw new Error('owner record footer seam not found');
  const insertAt = footerAt + FOOTER_ANCHOR.length;
  const markup =
    `<div class="op-owner-continuation-qr" ` +
    `style="position:absolute;left:1.12in;bottom:0.025in;height:0.55in;display:flex;align-items:center;gap:0.08in;z-index:4">` +
    `<img src="${qrDataUrl}" alt="Owner continuation QR code" ` +
    `style="display:block;width:0.55in;height:0.55in;image-rendering:auto">` +
    `<span style="display:block;max-width:1.35in;font-size:6.5pt;font-weight:600;line-height:1.15;color:#1A1A1A">` +
    `${OWNER_CONTINUATION_PRINTED_PHRASE}</span></div>`;
  return ownerOrFullPacketHtml.slice(0, insertAt) + markup + ownerOrFullPacketHtml.slice(insertAt);
}
