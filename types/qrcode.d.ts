// types/qrcode.d.ts
// Vendored minimal type declaration for the `qrcode` runtime dependency (Lane P2, ruling Item 4). The npm
// `@types/qrcode` package is not vendored in this environment; this declares only the subset OwnerPilot uses
// (toDataURL). If `@types/qrcode` is ever added, remove this file to avoid a duplicate declaration.

declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
  }
  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  };
  export default QRCode;
}
