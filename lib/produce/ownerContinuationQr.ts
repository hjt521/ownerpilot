// lib/produce/ownerContinuationQr.ts
// Owner Continuation QR V1 — purpose-specific QR renderer. This deliberately stays
// separate from packetQr.ts / packetVerification.ts (packet authenticity semantics).

import QRCode from 'qrcode';

export async function ownerContinuationQrDataUrl(url: string, opts?: { size?: number }): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: opts?.size ?? 160,
  });
}
