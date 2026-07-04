// lib/produce/lahdCoverSheet.ts
// PR-C — pre-filled LAHD Eviction Notice Filing Cover Sheet artifact (§2.2 / §2.4).
// Source: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §2.2; cover-sheet ruling §2.1/§2.4.
//
// A SEPARATE artifact from the notice PDF and the RTC packet (§2.2) — never modifies the notice face (§2.4 pt 3).
// Pre-fills every field OwnerPilot has from the produce-time snapshot; fields OwnerPilot does not have
// (APN pre-parcel-lookup; bedroom count; tenant phone/email; monthly rent when only a total is captured; the
// actual date served) render as BLANK ruled lines — never fabricated or defaulted (§10 anti-defaulting). The
// Declaration signature line stays blank (OwnerPilot is not the declarant). Owner prints, signs, mails.

import { COVER_SHEET_REVISION } from '@/lib/riskpath/lahdFilingRecord';

/** Everything the cover sheet can pre-fill from the produce-time snapshot. Unknowns are omitted (→ blank line). */
export interface CoverSheetInput {
  ownerName?: string;         // landlord/payee name (snapshot.payeeName or signerName)
  propertyAddress?: string;   // full property line (snapshot.propertyAddress)
  tenantName?: string;        // first named tenant (snapshot.tenantNames[0])
  totalAmountOwed?: number;   // snapshot.totalAmount
  // P2 (ruling 2026-07-04 Item 3): optional authenticity QR — a PNG data-URL (packetQrDataUrl) + the /verify URL.
  // Present ONLY when PACKET_VERIFY_SECRET is configured and the caller signed a token; omitted otherwise (no-op).
  verifyQrDataUrl?: string;
  verifyUrl?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A labeled row — pre-filled value or a blank ruled line the owner completes. */
function row(label: string, value?: string): string {
  const filled = value && value.trim() !== '';
  const cell = filled
    ? `<span class="cs-val">${esc(value!)}</span>`
    : `<span class="cs-blank">&nbsp;</span>`;
  return `<div class="cs-row"><span class="cs-label">${esc(label)}</span>${cell}</div>`;
}

/**
 * Build the pre-filled cover-sheet HTML. The caller serves this as a standalone printable document; the owner
 * prints it, signs the Declaration, and mails it with a copy of the served notice.
 */
export function buildLahdCoverSheetHtml(input: CoverSheetInput): string {
  const rows = [
    `<h2 class="cs-sec">Rental property</h2>`,
    row('Owner / landlord name', input.ownerName),
    row('Property address', input.propertyAddress),
    row('Assessor Parcel Number (APN)', undefined),
    row('Number of bedrooms', undefined),
    `<h2 class="cs-sec">Tenant</h2>`,
    row('Tenant name', input.tenantName),
    row('Tenant phone / email (if known)', undefined),
    `<h2 class="cs-sec">Notice details</h2>`,
    row('Notice type', '3-Day Notice to Pay Rent or Quit'),
    row('Date served on tenant', undefined),
    row('Reason for notice', 'Non-Payment of Rent'),
    `<h2 class="cs-sec">Rent</h2>`,
    row('Current monthly rent', undefined),
    row('Total rent amount owed', typeof input.totalAmountOwed === 'number' ? `$${money(input.totalAmountOwed)}` : undefined),
    `<h2 class="cs-sec">Declaration under penalty of perjury</h2>`,
    `<p class="cs-decl">I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.</p>`,
    `<div class="cs-sig"><span class="cs-sigline">&nbsp;</span><span class="cs-siglabel">Signature (Owner / Manager / Attorney / Other)</span></div>`,
    `<div class="cs-sig"><span class="cs-sigline">&nbsp;</span><span class="cs-siglabel">Date</span></div>`,
  ].join('\n');

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>LAHD Eviction Notice Filing Cover Sheet (pre-filled)</title>
<style>
  body{font-family:Georgia,serif;color:#111;max-width:7.5in;margin:0.5in auto;line-height:1.4}
  .cs-eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#555}
  h1{font-size:18px;margin:4px 0 2px}
  .cs-sub{font-size:12px;color:#444;margin:0 0 14px}
  .cs-note{font-size:11px;color:#444;background:#f6f6f4;border:1px solid #ddd;border-radius:4px;padding:8px 10px;margin:0 0 16px}
  h2.cs-sec{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#333;border-bottom:1px solid #ccc;margin:16px 0 6px;padding-bottom:2px}
  .cs-row{display:flex;gap:10px;align-items:flex-end;margin:5px 0;font-size:13px}
  .cs-label{flex:0 0 42%;color:#333}
  .cs-val{flex:1;font-weight:bold}
  .cs-blank{flex:1;border-bottom:1px solid #999;min-height:16px}
  .cs-decl{font-size:12px;margin:8px 0}
  .cs-sig{display:flex;gap:10px;align-items:flex-end;margin:14px 0 2px}
  .cs-sigline{flex:0 0 55%;border-bottom:1px solid #333;min-height:22px}
  .cs-siglabel{font-size:11px;color:#555}
  .cs-foot{font-size:11px;color:#444;margin-top:22px;border-top:1px solid #ccc;padding-top:8px}
  @media print{body{margin:0.5in}}
</style></head>
<body>
  <p class="cs-eyebrow">Los Angeles Housing Department</p>
  <h1>Eviction Notice Filing Cover Sheet</h1>
  <p class="cs-sub">Pre-filled by OwnerPilot AI &middot; ${esc(COVER_SHEET_REVISION)}</p>
  <p class="cs-note">This form is only required if you are submitting a physical copy of the eviction notice by mail or in person to LAHD. It is not needed if you upload the eviction notice online. Review every field, complete any blank lines, and sign the Declaration before mailing.</p>
  ${rows}
  ${input.verifyQrDataUrl ? `<div class="cs-verify"><img src="${esc(input.verifyQrDataUrl)}" alt="Authenticity QR" width="96" height="96"/><span class="cs-verify-cap">Scan to verify this cover is an authentic, unaltered OwnerPilot packet.${input.verifyUrl ? ` ${esc(input.verifyUrl)}` : ''}<br/>Verification confirms the document hash only — it is not legal service and shows no personal information.</span></div>` : ''}
  <p class="cs-foot">Mail to: LAHD Eviction Filing Section, PO BOX 17850, Los Angeles, CA 90057. File a copy of the served notice with LAHD within 3 business days of service.<br/>OwnerPilot AI is not a law firm and does not provide legal advice; this pre-filled form is a broker-prepared convenience. Verify all fields before filing.</p>
</body></html>`;
}
