// lib/produce/packetQr.ts
// Lane P2 — QR image generation for the packet cover page (ruling Item 4: qrcode dependency adopted).
// Encodes the /verify/<token> authenticity URL into a QR PNG data-URL that the cover-sheet HTML embeds as an
// <img>. Thin adapter over `qrcode` — no PII (the URL's token is authenticity-only, see packetVerification.ts).

import QRCode from 'qrcode';

/** Render a URL to a PNG data-URL QR (default error-correction M, quiet-zone margin 2). Async. */
export async function packetQrDataUrl(url: string, opts?: { size?: number }): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: opts?.size ?? 160,
  });
}
