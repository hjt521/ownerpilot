/**
 * buildPacketHtml — RiskPath(TM) Connected Forms, Phase 1 printable packets.
 *
 * DISCIPLINE:
 *  - The notice and proof-of-service pages are REUSED VERBATIM from
 *    buildNoticeDocumentHtml (same locked prose, same styling). This module
 *    extracts those rendered pages by structural markers and FAILS CLOSED
 *    (PacketRenderError) if the markers are not exactly where expected, so a
 *    drifted notice document can never silently produce a malformed packet.
 *  - The ONLY addition to the served (tenant) page is the TENANT SERVICE COPY
 *    label, absolutely positioned outside the notice body (broker
 *    determination 2026-06-11 §6(a)). The tenant QR footer is BUILT here but
 *    gated by TENANT_QR_FOOTER_ENABLED (=false, §6(d)) and cannot render in
 *    Phase 1.
 *  - All other pages (cover sheet, owner details, attempts record, checklist)
 *    are owner-facing wrapper pages composed from packetCopy constants and
 *    the user's own entered data. No legal wording is authored here.
 */

import type { NoticeModel } from './renderNotice';
import { formatPropertyLine } from './renderNotice';
import { buildNoticeDocumentHtml } from './buildNoticeHtml';
import type { NoticeFlowData } from '../flow/noticeFlowState';
import {
  TENANT_QR_FOOTER_ENABLED,
  TENANT_QR_FOOTER_TITLE,
  TENANT_QR_FOOTER_BODY,
  TENANT_QR_FOOTER_DISCLAIMER,
  PAGE_LABELS,
  COVER_SHEET,
  CHECKLIST_TITLE,
  CHECKLIST_ITEMS,
  OWNER_FOOTER,
  PACKET_SERVICE_METHOD_LABELS,
} from './packetCopy';

export class PacketRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PacketRenderError';
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Packet-page styling (printed pages only; brand palette from the spec) --
const PACKET_STYLE = `
  .pk-banner { position:absolute; top:0.22in; right:0.85in; font-size:8pt; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B6B6B; }
  .pk-banner.pk-owner { color:#1F3D2E; }
  .pk-h1 { text-align:center; font-weight:700; font-size:16pt; margin:0.45in 0 6pt 0; color:#102018; }
  .pk-sub { text-align:center; font-size:10pt; color:#6B6B6B; margin:0 0 18pt 0; }
  .pk-label { font-size:8.5pt; font-weight:600; color:#102018; letter-spacing:1.4px; text-transform:uppercase; margin:14px 0 5px 0; }
  .pk-box { border:0.5pt solid #C8C5BD; background:#F8F5EF; padding:14px 16px; margin:0 0 14px 0; }
  .pk-box h3 { font-size:10.5pt; margin:0 0 8px 0; color:#102018; }
  .pk-item { font-size:10pt; line-height:15pt; margin:0 0 8px 0; }
  .pk-item strong { font-weight:600; }
  .pk-note { font-size:10pt; font-weight:600; margin-top:10px; }
  .pk-kv { display:grid; grid-template-columns:2.2in 1fr; row-gap:6px; column-gap:10px; margin:8pt 0; }
  .pk-kv .k { font-size:8.5pt; font-weight:600; color:#6B6B6B; letter-spacing:.3px; }
  .pk-kv .v { font-size:10pt; }
  table.pk-table { width:100%; border-collapse:collapse; margin:6pt 0; }
  table.pk-table th { font-size:8.5pt; color:#6B6B6B; text-align:left; border-bottom:0.5pt solid #C8C5BD; padding:4px 6px; }
  table.pk-table td { font-size:10pt; padding:6px; border-bottom:0.5pt solid #E5E2DA; }
  .pk-check { font-size:11pt; line-height:24pt; }
  .pk-cbx { display:inline-block; width:11px; height:11px; border:0.9pt solid #1A1A1A; margin-right:10px; }
  .pk-qr { width:1.1in; height:1.1in; border:1pt dashed #8FAE9C; display:flex; align-items:center; justify-content:center; font-size:7.5pt; color:#6B6B6B; text-align:center; padding:4px; margin:8pt 0; }
  .pk-foot { position:absolute; left:0.85in; right:0.85in; bottom:0.35in; border-top:0.5pt solid #C8C5BD; padding-top:6px; font-size:8pt; color:#6B6B6B; display:flex; justify-content:space-between; }
  .pk-ofoot { border:0.5pt solid #C8C5BD; background:#F8F5EF; padding:12px 14px; margin-top:16pt; }
  .pk-ofoot .t { font-size:10.5pt; font-weight:700; color:#1F3D2E; margin:0 0 4px 0; }
  .pk-ofoot .l { font-size:9.5pt; margin:0 0 2px 0; }
  .pk-ofoot .p { font-size:8pt; color:#6B6B6B; margin-top:6px; }
  .pk-tfoot { border:0.5pt solid #C8C5BD; background:#fff; padding:10px 12px; margin-top:16pt; }
  .pk-tfoot .t { font-size:10.5pt; font-weight:700; color:#1A1A1A; margin:0 0 4px 0; }
  .pk-tfoot .b { font-size:9.5pt; margin:0 0 2px 0; }
  .pk-tfoot .d { font-size:8pt; color:#6B6B6B; margin-top:6px; }
`;

// --- Extraction of the verbatim notice/PoS pages -----------------------------

interface NoticeDocParts {
  style: string;
  noticePage: string;
  posPage: string;
}

function extractNoticeDocParts(model: NoticeModel): NoticeDocParts {
  const html = buildNoticeDocumentHtml(model);
  const styleStart = html.indexOf('<style>');
  const styleEnd = html.indexOf('</style>');
  if (styleStart === -1 || styleEnd === -1 || styleEnd < styleStart) {
    throw new PacketRenderError('Notice document style block not found.');
  }
  const style = html.slice(styleStart + '<style>'.length, styleEnd);

  const open = '<section class="page">';
  const close = '</section>';
  const first = html.indexOf(open);
  if (first === -1) throw new PacketRenderError('Notice page section not found.');
  const firstClose = html.indexOf(close, first);
  if (firstClose === -1) throw new PacketRenderError('Notice page section not closed.');
  const second = html.indexOf(open, firstClose);
  if (second === -1) throw new PacketRenderError('Proof-of-service page section not found.');
  const secondClose = html.indexOf(close, second);
  if (secondClose === -1) throw new PacketRenderError('Proof-of-service section not closed.');
  const third = html.indexOf(open, secondClose);
  if (third !== -1) throw new PacketRenderError('Unexpected extra page section in notice document.');

  return {
    style,
    noticePage: html.slice(first, firstClose + close.length),
    posPage: html.slice(second, secondClose + close.length),
  };
}

// --- Page assembly helpers ----------------------------------------------------

function bannerHtml(label: string, owner: boolean): string {
  return `<div class="pk-banner${owner ? ' pk-owner' : ''}">${esc(label)}</div>`;
}

/** Insert a page label immediately after the accent bar (outside the body flow). */
function withBanner(pageHtml: string, label: string, owner: boolean): string {
  const anchor = '<div class="accent-bar"></div>';
  const i = pageHtml.indexOf(anchor);
  if (i === -1) throw new PacketRenderError('Accent-bar anchor not found on page.');
  return (
    pageHtml.slice(0, i + anchor.length) + bannerHtml(label, owner) + pageHtml.slice(i + anchor.length)
  );
}

const PAGENO_RE = /<div class="pageno">[\s\S]*?<\/div>/;

function setPageNumber(pageHtml: string, text: string): string {
  if (!PAGENO_RE.test(pageHtml)) {
    throw new PacketRenderError('Page-number slot not found on page.');
  }
  return pageHtml.replace(PAGENO_RE, `<div class="pageno">${esc(text)}</div>`);
}

function packetPage(label: string | null, owner: boolean, innerHtml: string): string {
  const banner = label ? bannerHtml(label, owner) : '';
  return (
    `<section class="page">` +
    `<div class="accent-bar"></div>` +
    banner +
    innerHtml +
    `<div class="pk-foot"><span>${esc(OWNER_FOOTER.powered)}</span><div class="pageno"></div></div>` +
    `</section>`
  );
}

function assembleDocument(title: string, style: string, pages: string[]): string {
  const numbered = pages.map((p, i) => setPageNumber(p, `Page ${i + 1} of ${pages.length}`));
  return (
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<title>${esc(title)}</title>\n<style>${style}\n${PACKET_STYLE}</style>\n</head>\n<body>\n\n` +
    numbered.join('\n\n') +
    `\n\n</body>\n</html>`
  );
}

// --- Footers -------------------------------------------------------------------

/** Owner-facing RiskPath footer with the Phase 1 placeholder QR (owner pages only). */
function ownerFooterBlockHtml(): string {
  return (
    `<div class="pk-ofoot">` +
    `<p class="t">${esc(OWNER_FOOTER.title)}</p>` +
    `<p class="l">${esc(OWNER_FOOTER.line1)}</p>` +
    `<p class="l">${esc(OWNER_FOOTER.line2)}</p>` +
    `<div class="pk-qr">${esc(OWNER_FOOTER.qrPlaceholder)}</div>` +
    `<p class="p">${esc(OWNER_FOOTER.powered)} \u00B7 ${esc(OWNER_FOOTER.tagline)}</p>` +
    `</div>`
  );
}

/**
 * Tenant QR footer — BUILT but GATED OFF (broker determination §6(d)).
 * The three strings are the LOCKED constants from packetCopy. This function is
 * only ever called behind TENANT_QR_FOOTER_ENABLED; the flag is false in
 * Phase 1 and pinned by test, so no served copy carries it.
 */
export function tenantQrFooterHtml(): string {
  return (
    `<div class="pk-tfoot">` +
    `<p class="t">${esc(TENANT_QR_FOOTER_TITLE)}</p>` +
    `<p class="b">${esc(TENANT_QR_FOOTER_BODY)}</p>` +
    `<div class="pk-qr"></div>` +
    `<p class="d">${esc(TENANT_QR_FOOTER_DISCLAIMER)}</p>` +
    `</div>`
  );
}

// --- Owner data-echo helpers ------------------------------------------------

function safeDateDisplay(iso: string | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '\u2014';
  const [y, m, d] = iso.split('-').map(Number);
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (!m || m < 1 || m > 12) return '\u2014';
  return `${names[m - 1]} ${d}, ${y}`;
}

function kvRows(rows: [string, string][]): string {
  return (
    `<div class="pk-kv">` +
    rows.map(([k, v]) => `<div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>`).join('') +
    `</div>`
  );
}

function ownerDetailsPage(model: NoticeModel, data: NoticeFlowData): string {
  const method = data.serviceMethod
    ? PACKET_SERVICE_METHOD_LABELS[data.serviceMethod] ?? data.serviceMethod
    : '\u2014';
  const attempts = data.serviceAttempts ?? [];
  const inner =
    `<h1 class="pk-h1">Owner Record Details</h1>` +
    `<p class="pk-sub">For your records only. Do not serve this page.</p>` +
    kvRows([
      ['Property', formatPropertyLine(model.recipient.propertyAddress, model.recipient.propertyUnit)],
      ['Tenant(s)', model.recipient.tenantNamesJoined],
      ['Total demanded', `$${model.demand.totalFormatted}`],
      ['Payable to', model.pay.payeeName],
      ['Compliance period', `${model.compliance.commencementFormatted} \u2013 ${model.compliance.expirationFormatted}`],
      ['Dated (signed)', model.signature.datedFormatted],
      ['Planned service method', method],
      ['Intended service date', safeDateDisplay(data.serviceDate)],
      ['Service attempts logged', String(attempts.length)],
    ]) +
    ownerFooterBlockHtml();
  return packetPage(PAGE_LABELS.owner, true, inner);
}

function attemptsRecordPage(data: NoticeFlowData): string {
  const attempts = data.serviceAttempts ?? [];
  const rows =
    attempts.length > 0
      ? attempts
          .map(
            (a) =>
              `<tr><td>${esc(safeDateDisplay(a.attemptDate))}</td>` +
              `<td>${esc(PACKET_SERVICE_METHOD_LABELS[a.method] ?? a.method)}</td>` +
              `<td>${esc(a.outcome === 'SUCCESS' ? 'Service completed' : 'Attempt failed')}</td>` +
              `<td>${esc(a.mailingDate ? safeDateDisplay(a.mailingDate) : '\u2014')}</td>` +
              `<td>${esc(a.server.name)}</td></tr>`,
          )
          .join('')
      : `<tr><td colspan="5">No attempts logged yet.</td></tr>`;
  const blankRow =
    `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
  const inner =
    `<h1 class="pk-h1">Service Attempt Record</h1>` +
    `<p class="pk-sub">Owner record. Log each attempt; the proof of service page is completed after service.</p>` +
    `<table class="pk-table"><thead><tr>` +
    `<th>Date</th><th>Method</th><th>Outcome</th><th>Mailing date</th><th>Served by</th>` +
    `</tr></thead><tbody>${rows}${blankRow}${blankRow}${blankRow}</tbody></table>` +
    ownerFooterBlockHtml();
  return packetPage(PAGE_LABELS.serviceLog, true, inner);
}

function checklistPage(): string {
  const items = CHECKLIST_ITEMS.map(
    (it) => `<div class="pk-check"><span class="pk-cbx"></span>${esc(it)}</div>`,
  ).join('');
  const inner =
    `<h1 class="pk-h1">${esc(CHECKLIST_TITLE)}</h1>` +
    `<p class="pk-sub">Owner record. Track what still needs to be done.</p>` +
    items +
    ownerFooterBlockHtml();
  return packetPage(PAGE_LABELS.checklist, true, inner);
}

function coverSheetPage(): string {
  const items = COVER_SHEET.items
    .map(
      (it, i) =>
        `<p class="pk-item"><strong>${i + 1}. ${esc(it.name)}</strong><br>${esc(it.instruction)}</p>`,
    )
    .join('');
  const inner =
    `<h1 class="pk-h1">${esc(COVER_SHEET.header)}</h1>` +
    `<p class="pk-sub">${esc(COVER_SHEET.subheader)}</p>` +
    `<div class="pk-box"><h3>${esc(COVER_SHEET.boxTitle)}</h3>${items}` +
    `<p class="pk-note">${esc(COVER_SHEET.importantNote)}</p></div>`;
  return packetPage(null, true, inner);
}

// --- Public builders -----------------------------------------------------------

/** Tenant Service Copy: the served notice page, label only (§6(a)/(d)). */
export function buildTenantServiceCopyHtml(model: NoticeModel): string {
  const { style, noticePage } = extractNoticeDocParts(model);
  let page = withBanner(noticePage, PAGE_LABELS.tenant, false);
  if (TENANT_QR_FOOTER_ENABLED) {
    // Phase 2 only — gated off (§6(d)). Placed before the page's own footer.
    const anchor = '<div class="footer">';
    const i = page.indexOf(anchor);
    if (i === -1) throw new PacketRenderError('Notice page footer anchor not found.');
    page = page.slice(0, i) + tenantQrFooterHtml() + page.slice(i);
  }
  return assembleDocument(`${PAGE_LABELS.tenant} \u2014 ${model.meta.title}`, style, [page]);
}

/** Owner Record Packet: the notice page (owner-labeled) + owner details page. */
export function buildOwnerRecordCopyHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage } = extractNoticeDocParts(model);
  const pages = [withBanner(noticePage, PAGE_LABELS.owner, true), ownerDetailsPage(model, data)];
  return assembleDocument(`${PAGE_LABELS.owner} \u2014 ${model.meta.title}`, style, pages);
}

/** Service Log: the verbatim proof-of-service page (labeled) + attempts record. */
export function buildServiceLogHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, posPage } = extractNoticeDocParts(model);
  const pages = [withBanner(posPage, PAGE_LABELS.serviceLog, true), attemptsRecordPage(data)];
  return assembleDocument(`${PAGE_LABELS.serviceLog} \u2014 ${model.meta.title}`, style, pages);
}

/** Full packet: cover, tenant copy, owner copy, service log, checklist (spec order). */
export function buildFullPacketHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage, posPage } = extractNoticeDocParts(model);
  let tenantPage = withBanner(noticePage, PAGE_LABELS.tenant, false);
  if (TENANT_QR_FOOTER_ENABLED) {
    const anchor = '<div class="footer">';
    const i = tenantPage.indexOf(anchor);
    if (i === -1) throw new PacketRenderError('Notice page footer anchor not found.');
    tenantPage = tenantPage.slice(0, i) + tenantQrFooterHtml() + tenantPage.slice(i);
  }
  const pages = [
    coverSheetPage(),
    tenantPage,
    withBanner(noticePage, PAGE_LABELS.owner, true),
    ownerDetailsPage(model, data),
    withBanner(posPage, PAGE_LABELS.serviceLog, true),
    attemptsRecordPage(data),
    checklistPage(),
  ];
  return assembleDocument(`${COVER_SHEET.header} \u2014 ${model.meta.title}`, style, pages);
}
