/**
 * buildPacketHtml — RiskPath(TM) Connected Forms printable packets.
 *
 * DISCIPLINE (unchanged):
 *  - The notice and proof-of-service pages are REUSED VERBATIM from
 *    buildNoticeDocumentHtml (same locked prose, same locked rendering). This
 *    module extracts those rendered pages by structural markers and FAILS
 *    CLOSED (PacketRenderError) if the markers are not exactly where expected.
 *  - The ONLY addition to the served (tenant) page is the TENANT SERVICE COPY
 *    label, outside the notice body (broker determination 2026-06-11 §6(a)).
 *    The tenant QR footer is BUILT here but gated by TENANT_QR_FOOTER_ENABLED
 *    (=false, §6(d)) and cannot render in Phase 1.
 *  - All owner-facing wrapper pages (cover, owner details, attempts record,
 *    checklist) are composed from packetCopy constants + the user's own entered
 *    data. No California legal wording is authored here.
 *
 * 2026-06-17 packet redesign: layout / labels / print styling only. The locked
 * notice and PoS pages are still extracted and reused byte-identically; this
 * pass restyles the wrapper pages and the page chrome to the approved
 * broker-prepared look. No legal text is authored, paraphrased, or moved.
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
  CHECKLIST_GROUPS,
  NEXT_STEP_ITEMS,
  OWNER_FOOTER,
  PAYMENT_METHOD_LABELS,
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

// --- Fonts (linked; Georgia/system fallbacks keep print intact if offline) ---
const PACKET_FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';

// --- Packet-page styling (printed wrapper pages; brand palette from the spec) --
const PACKET_STYLE = `
  .page.pk-ivory { background:#FAF7F0; }
  .pk-watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
  .pk-watermark span { font-family:'Inter',sans-serif; font-weight:800; font-size:58pt; letter-spacing:6px; color:rgba(16,32,24,.045); transform:rotate(-32deg); white-space:nowrap; }
  .pk-banner { position:absolute; top:0.30in; right:0.8in; z-index:3; font-size:8pt; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#102018; border:1pt solid #102018; border-radius:3px; padding:5pt 9pt; background:#fff; }
  .pk-banner.pk-owner { color:#102018; border-color:#A8884C; background:#F3EEE2; }
  .pk-mast { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding-bottom:10pt; border-bottom:1pt solid #A8884C; margin:0.18in 0 16pt 0; }
  .pk-mast-title { font-family:'Playfair Display',Georgia,serif; font-weight:600; font-size:19pt; color:#102018; margin:0; line-height:1.12; }
  .pk-mast-sub { font-size:9.5pt; color:#515853; margin:5pt 0 0 0; }
  .pk-eyebrow { font-size:7.5pt; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#A8884C; margin:0 0 6pt 0; }
  .pk-content { position:relative; z-index:1; }
  .pk-section { display:flex; align-items:center; gap:9pt; margin:0 0 10pt 0; }
  .pk-section .n { font-family:'Playfair Display',Georgia,serif; font-size:12pt; font-weight:700; color:#A8884C; }
  .pk-section .t { font-size:10.5pt; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:#102018; }
  .pk-section .r { flex:1; height:0.75pt; background:#D9D2C2; }
  .pk-card { border:0.75pt solid #D9D2C2; border-radius:4px; overflow:hidden; margin:0 0 16pt 0; }
  .pk-card .grid { display:grid; grid-template-columns:1fr 1fr; }
  .pk-card .cell { padding:8pt 13pt; border-bottom:0.5pt solid #E7E1D4; }
  .pk-card .cell:nth-child(odd) { border-right:0.5pt solid #E7E1D4; }
  .pk-card .cell.full { grid-column:1 / -1; }
  .pk-card .k { font-size:7.2pt; font-weight:700; letter-spacing:.9px; text-transform:uppercase; color:#6B6B6B; margin-bottom:2pt; }
  .pk-card .v { font-size:10pt; color:#102018; font-weight:500; }
  .pk-steps { list-style:none; margin:0 0 16pt 0; padding:0; }
  .pk-steps li { display:flex; align-items:center; gap:10pt; padding:5.5pt 0; font-size:10pt; color:#1A1A1A; }
  .pk-cbx { flex:none; width:13px; height:13px; border:1pt solid #102018; border-radius:2px; background:#fff; }
  .pk-group { margin:0 0 13pt 0; }
  .pk-group .gh { display:flex; align-items:center; gap:9pt; margin:0 0 7pt 0; }
  .pk-group .gn { font-size:9.5pt; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#102018; }
  .pk-group .gp { font-size:7pt; font-weight:700; color:#A8884C; border:0.75pt solid #C8B488; border-radius:20px; padding:1.5pt 7pt; letter-spacing:.5px; }
  .pk-group .gr { flex:1; height:0.75pt; background:#D9D2C2; }
  .pk-group ul { list-style:none; margin:0; padding:0; }
  .pk-group li { display:flex; align-items:center; gap:10pt; padding:4pt 0; font-size:9.7pt; color:#1A1A1A; }
  .pk-group li .yn { margin-left:auto; font-size:8.5pt; font-weight:600; color:#6B6B6B; }
  table.pk-table { width:100%; border-collapse:collapse; margin:0 0 16pt 0; }
  table.pk-table th { font-size:6.8pt; font-weight:700; letter-spacing:.4px; text-transform:uppercase; color:#fff; background:#102018; border:0.5pt solid #102018; padding:6pt 4pt; text-align:left; }
  table.pk-table td { border:0.5pt solid #D9D2C2; height:30pt; padding:3pt 5pt; font-size:8pt; color:#1A1A1A; vertical-align:top; }
  table.pk-table tr:nth-child(even) td { background:#FBFAF6; }
  .pk-risk { border:0.75pt solid #A8884C; border-radius:5px; background:#F3EEE2; padding:13pt 15pt; display:flex; gap:15pt; align-items:center; }
  .pk-risk .copy { flex:1; }
  .pk-risk .rt { font-family:'Playfair Display',Georgia,serif; font-size:12pt; font-weight:600; color:#102018; margin:0 0 4pt 0; }
  .pk-risk .rb { font-size:9.2pt; line-height:1.45; color:#1A1A1A; margin:0 0 6pt 0; }
  .pk-risk .rf { font-size:7.8pt; font-weight:600; letter-spacing:.3px; color:#A8884C; margin:0; }
  .pk-qr { flex:none; width:1.2in; height:1.2in; background:#fff; border:1.25pt dashed #102018; border-radius:5px; position:relative; display:flex; align-items:center; justify-content:center; text-align:center; background-image:radial-gradient(rgba(16,32,24,.10) 1px, transparent 1.3px); background-size:8px 8px; }
  .pk-qr .qc { font-size:7pt; font-weight:700; color:#102018; letter-spacing:.3px; line-height:1.3; background:#fff; padding:2px 4px; border-radius:2px; }
  .pk-qr i { position:absolute; width:11px; height:11px; border:1.75pt solid #102018; }
  .pk-qr i.a { top:5px; left:5px; border-right:none; border-bottom:none; }
  .pk-qr i.b { top:5px; right:5px; border-left:none; border-bottom:none; }
  .pk-qr i.c { bottom:5px; left:5px; border-right:none; border-top:none; }
  .pk-qr i.d { bottom:5px; right:5px; border-left:none; border-top:none; }
  .pk-foot { position:absolute; left:0.8in; right:0.8in; bottom:0.38in; padding-top:6pt; border-top:0.5pt solid #D9D2C2; font-size:7.5pt; letter-spacing:.3px; color:#6B6B6B; display:flex; align-items:center; justify-content:space-between; }
  .pk-foot::before { content:""; position:absolute; left:0; top:-0.5pt; width:0.5in; height:1pt; background:#A8884C; }
  .pk-foot .pk-foot-l b { color:#102018; font-weight:600; }
  .pk-foot .sep { color:#A8884C; padding:0 5px; }
  /* Cover page */
  .pk-cover-wm { display:flex; align-items:center; gap:8px; margin:0.10in 0 0 0; }
  .pk-cover-wm .m { width:15px; height:15px; border-radius:4px; background:#102018; position:relative; flex:none; }
  .pk-cover-wm .m::after { content:""; position:absolute; inset:3.5px; border:1.4px solid #C8B488; border-radius:2px; }
  .pk-cover-wm .w { font-family:'Playfair Display',Georgia,serif; font-size:12.5pt; font-weight:600; color:#102018; }
  .pk-cover-wm .w b { color:#A8884C; font-weight:600; }
  .pk-cover-title { font-family:'Playfair Display',Georgia,serif; font-weight:600; font-size:29pt; color:#102018; margin:24pt 0 2pt 0; line-height:1.1; }
  .pk-cover-subtitle { font-size:12.5pt; font-weight:500; color:#2C3D33; margin:0; }
  .pk-cover-rule { width:52pt; height:2.5pt; background:#A8884C; margin:15pt 0 20pt 0; }
  .pk-inc-h { font-size:8.5pt; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:#102018; margin:0 0 11pt 0; }
  .pk-inc { list-style:none; margin:0; padding:0; }
  .pk-inc li { display:flex; gap:11pt; padding:7.5pt 0; border-bottom:0.5pt solid #D9D2C2; }
  .pk-inc li:last-child { border-bottom:none; }
  .pk-inc .num { flex:none; width:20px; height:20px; border-radius:50%; border:1pt solid #A8884C; color:#102018; font-size:9pt; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .pk-inc .it { font-size:10pt; font-weight:600; color:#102018; }
  .pk-inc .id { font-size:9pt; color:#515853; margin-top:1pt; line-height:1.4; }
  .pk-callout { margin-top:18pt; background:#F3EEE2; border:0.75pt solid #A8884C; border-radius:4px; padding:12pt 14pt; display:flex; gap:11pt; align-items:flex-start; }
  .pk-callout .i { flex:none; width:19px; height:19px; border-radius:50%; background:#102018; color:#C8B488; font-weight:800; font-size:11pt; line-height:19px; text-align:center; font-family:Georgia,serif; }
  .pk-callout .ct { font-size:9pt; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#102018; margin:1pt 0 4pt 0; }
  .pk-callout .cb { font-size:9.4pt; line-height:1.5; color:#1A1A1A; }
  /* Phase 2 (gated) tenant QR footer */
  .pk-tfoot { border:0.5pt solid #D9D2C2; background:#fff; padding:10px 12px; margin-top:14pt; text-align:center; }
  .pk-tfoot .t { font-size:10.5pt; font-weight:700; color:#1A1A1A; margin:0 0 4px 0; }
  .pk-tfoot .b { font-size:9.5pt; margin:0 0 2px 0; }
  .pk-tfoot .d { font-size:8pt; color:#6B6B6B; margin-top:6px; }
  /* Small non-boxed RiskPath pointer (Owner Record Details / Service Attempts). */
  .pk-note { font-size:8.5pt; color:#515853; margin:6pt 0 0 0; font-style:italic; }
  /* Print readability on white paper (broker review 2026-06-18): darken pale
     gold/gray; ensure the dark table header reads even without background graphics. */
  @media print {
    .pk-mast-sub, .pk-card .k, .pk-foot, .pk-inc .id, .pk-cover-subtitle, .pk-note { color:#3A3A3A; }
    .pk-section .n, .pk-eyebrow, .pk-risk .rf, .pk-cover-wm .w b { color:#7A5A1E; }
    .pk-group .gn, .pk-group .gp { color:#5A4A28; }
    .pk-mast { border-bottom-color:#8A6A2A; }
    .pk-group .gp { border-color:#8A6A2A; }
    .pk-risk { border-color:#8A6A2A; }
    .pk-callout { border-color:#8A6A2A; }
    .pk-section .r, .pk-group .gr { background:#B8B0A0; }
    .pk-foot::before, .pk-cover-rule { background:#8A6A2A; }
    .pk-foot .sep, .pk-callout .ct { color:#7A5A1E; }
    .pk-inc .num { border-color:#8A6A2A; color:#102018; }
    table.pk-table th { color:#102018; background:#EAE3D4; border-color:#8A6A2A; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    table.pk-table td { border-color:#B8B0A0; }
    .pk-banner, .pk-banner.pk-owner, .page.pk-ivory, .pk-watermark span, .pk-callout .i, .pk-cover-wm .m { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
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

/** Insert a faint owner-record watermark after the accent bar (owner copy only). */
function withWatermark(pageHtml: string, text: string): string {
  const anchor = '<div class="accent-bar"></div>';
  const i = pageHtml.indexOf(anchor);
  if (i === -1) throw new PacketRenderError('Accent-bar anchor not found on page.');
  const wm = `<div class="pk-watermark"><span>${esc(text)}</span></div>`;
  return pageHtml.slice(0, i + anchor.length) + wm + pageHtml.slice(i + anchor.length);
}

const PAGENO_RE = /<div class="pageno">[\s\S]*?<\/div>/;

function setPageNumber(pageHtml: string, text: string): string {
  if (!PAGENO_RE.test(pageHtml)) {
    throw new PacketRenderError('Page-number slot not found on page.');
  }
  return pageHtml.replace(PAGENO_RE, `<div class="pageno">${esc(text)}</div>`);
}

const CITE_RE = /<div class="cite">[\s\S]*?<\/div>/;

/** Override the footer citation line on an extracted page (presentation label
 *  for an owner file copy; the legal citation remains inline in the body). */
function setFooterCite(pageHtml: string, text: string): string {
  if (!CITE_RE.test(pageHtml)) {
    throw new PacketRenderError('Footer citation slot not found on page.');
  }
  return pageHtml.replace(CITE_RE, `<div class="cite">${esc(text)}</div>`);
}

function packetPage(
  label: string | null,
  owner: boolean,
  footerText: string,
  innerHtml: string,
): string {
  const banner = label ? bannerHtml(label, owner) : '';
  return (
    `<section class="page pk-ivory">` +
    `<div class="accent-bar"></div>` +
    banner +
    `<div class="pk-content">${innerHtml}</div>` +
    `<div class="pk-foot"><span class="pk-foot-l">${footerText}</span><div class="pageno"></div></div>` +
    `</section>`
  );
}

function assembleDocument(title: string, style: string, pages: string[]): string {
  const numbered = pages.map((p, i) => setPageNumber(p, `Page ${i + 1} of ${pages.length}`));
  return (
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<title>${esc(title)}</title>\n${PACKET_FONT_LINK}\n<style>${style}\n${PACKET_STYLE}</style>\n</head>\n<body>\n\n` +
    numbered.join('\n\n') +
    `\n\n</body>\n</html>`
  );
}

// --- RiskPath owner block + footers ------------------------------------------

/** Small non-boxed RiskPath pointer for pages that shouldn't carry the full
 *  block (Owner Record Details, Service Attempt Record). Task 4 (2026-06-18). */
function riskPathNote(): string {
  return `<p class="pk-note">${esc(OWNER_FOOTER.note)}</p>`;
}

/** Owner-facing RiskPath follow-up block (owner pages only; no QR placeholder). */
function ownerRiskPathBlock(): string {
  return (
    `<div class="pk-risk">` +
    `<div class="copy">` +
    `<p class="rt">${esc(OWNER_FOOTER.title)}</p>` +
    `<p class="rb">${esc(OWNER_FOOTER.body)}</p>` +
    `<p class="rf">${esc(OWNER_FOOTER.tagline)}</p>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Tenant QR footer — BUILT but GATED OFF (broker determination §6(d)).
 * The three strings are the LOCKED constants from packetCopy. Only ever called
 * behind TENANT_QR_FOOTER_ENABLED, which is false in Phase 1 and pinned by test.
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

function detailCell(k: string, v: string, full = false): string {
  return `<div class="cell${full ? ' full' : ''}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;
}

// --- Owner-facing wrapper pages ----------------------------------------------

function ownerDetailsPage(model: NoticeModel, data: NoticeFlowData): string {
  const attempts = data.serviceAttempts ?? [];
  const noticeCells =
    detailCell('Property', formatPropertyLine(model.recipient.propertyAddress, model.recipient.propertyUnit), true) +
    detailCell('Tenant(s)', model.recipient.tenantNamesJoined) +
    detailCell('Total demanded', `$${model.demand.totalFormatted}`) +
    detailCell('Compliance period', `${model.compliance.commencementFormatted} \u2013 ${model.compliance.expirationFormatted}`) +
    detailCell('Dated / signed', model.signature.datedFormatted) +
    detailCell('Intended service date', safeDateDisplay(data.serviceDate)) +
    detailCell('Service attempts logged', String(attempts.length));

  // Payment summary (owner-only; bank name normalized + phone formatted upstream).
  const methods = ((data.paymentMethods ?? []) as readonly string[])
    .map((mth) => PAYMENT_METHOD_LABELS[mth] ?? mth)
    .join(', ');
  const payCells =
    detailCell('Payment method(s)', methods || '\u2014', true) +
    detailCell('Payable to', model.pay.payeeName) +
    detailCell('Payment phone', model.pay.payeePhone) +
    model.pay.rows.map((r) => detailCell(r.label, r.value)).join('');

  const steps = NEXT_STEP_ITEMS.map(
    (it) => `<li><span class="pk-cbx"></span>${esc(it)}</li>`,
  ).join('');

  const inner =
    `<div class="pk-mast"><div><h1 class="pk-mast-title">Owner Record Details</h1>` +
    `<p class="pk-mast-sub">For your records only. Do not serve this page.</p></div></div>` +
    `<div class="pk-section"><span class="n">1</span><span class="t">Notice Details</span><span class="r"></span></div>` +
    `<div class="pk-card"><div class="grid">${noticeCells}</div></div>` +
    `<div class="pk-section"><span class="n">2</span><span class="t">Payment Summary</span><span class="r"></span></div>` +
    `<div class="pk-card"><div class="grid">${payCells}</div></div>` +
    `<div class="pk-section"><span class="n">3</span><span class="t">Next Step</span><span class="r"></span></div>` +
    `<ul class="pk-steps">${steps}</ul>` +
    riskPathNote();
  return packetPage(
    PAGE_LABELS.ownerDetails,
    true,
    `<span class="pk-foot-l"><b>Owner Record Details</b></span> \u00B7 Owner Record Only`,
    inner,
  );
}

function attemptsRecordPage(data: NoticeFlowData): string {
  const attempts = data.serviceAttempts ?? [];
  const filled = attempts
    .map(
      (a) =>
        `<tr><td>${esc(safeDateDisplay(a.attemptDate))}</td><td></td>` +
        `<td>${esc(PACKET_SERVICE_METHOD_LABELS[a.method] ?? a.method)}</td>` +
        `<td>${esc(a.outcome === 'SUCCESS' ? 'Service completed' : 'Attempt failed')}</td>` +
        `<td>${esc(a.mailingDate ? safeDateDisplay(a.mailingDate) : '\u2014')}</td>` +
        `<td>${esc(a.server.name)}</td><td></td></tr>`,
    )
    .join('');
  const blankCount = Math.max(2, 7 - attempts.length);
  const blankRow = `<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  const blanks = Array.from({ length: blankCount }, () => blankRow).join('');

  const inner =
    `<div class="pk-mast"><div><h1 class="pk-mast-title">Service Attempt Record</h1>` +
    `<p class="pk-mast-sub">Owner record. Log each attempt; complete Proof of Service only after service is completed.</p></div></div>` +
    `<table class="pk-table"><thead><tr>` +
    `<th style="width:11%">Date</th><th style="width:9%">Time</th><th style="width:15%">Method</th>` +
    `<th style="width:14%">Outcome</th><th style="width:12%">Mailing date</th>` +
    `<th style="width:13%">Served by</th><th style="width:26%">Notes</th>` +
    `</tr></thead><tbody>${filled}${blanks}</tbody></table>` +
    riskPathNote();
  return packetPage(
    PAGE_LABELS.serviceAttempt,
    true,
    `<span class="pk-foot-l"><b>Service Attempt Record</b></span> \u00B7 Owner Record Only`,
    inner,
  );
}

function checklistPage(): string {
  const groups = CHECKLIST_GROUPS.map((g, gi) => {
    const items = g.items
      .map((it) => {
        const yn = it.includes('Yes / No');
        const text = yn ? it.replace(/\s*Yes \/ No\s*$/, '') : it;
        return `<li><span class="pk-cbx"></span>${esc(text)}${yn ? '<span class="yn">Yes&nbsp;/&nbsp;No</span>' : ''}</li>`;
      })
      .join('');
    return (
      `<div class="pk-group"><div class="gh"><span class="gn">${esc(g.name)}</span>` +
      `<span class="gp">Step ${gi + 1}</span><span class="gr"></span></div>` +
      `<ul>${items}</ul></div>`
    );
  }).join('');

  const inner =
    `<div class="pk-mast"><div><h1 class="pk-mast-title">${esc(CHECKLIST_TITLE)}</h1>` +
    `<p class="pk-mast-sub">Owner record. Track what still needs to be done after printing.</p></div></div>` +
    groups +
    ownerRiskPathBlock();
  return packetPage(
    PAGE_LABELS.checklist,
    true,
    `<span class="pk-foot-l"><b>OwnerPilot Service Checklist</b></span> \u00B7 Owner Record Only`,
    inner,
  );
}

function coverSheetPage(): string {
  const items = COVER_SHEET.items
    .map(
      (it, i) =>
        `<li><span class="num">${i + 1}</span><div><div class="it">${esc(it.name)}</div>` +
        `<div class="id">${esc(it.instruction)}</div></div></li>`,
    )
    .join('');
  const inner =
    `<div class="pk-cover-wm"><span class="m"></span><span class="w">OwnerPilot<b>.AI</b></span></div>` +
    `<p class="pk-eyebrow" style="margin-top:24pt">${esc(COVER_SHEET.eyebrow)}</p>` +
    `<h1 class="pk-cover-title">${esc(COVER_SHEET.header)}</h1>` +
    `<p class="pk-cover-subtitle">${esc(COVER_SHEET.subtitle)}</p>` +
    `<div class="pk-cover-rule"></div>` +
    `<p class="pk-inc-h">${esc(COVER_SHEET.boxTitle)}</p>` +
    `<ul class="pk-inc">${items}</ul>` +
    `<div class="pk-callout"><span class="i">!</span><div>` +
    `<div class="ct">${esc(COVER_SHEET.importantTitle)}</div>` +
    `<div class="cb">${esc(COVER_SHEET.importantNote)}</div></div></div>`;
  return packetPage(null, true, COVER_SHEET.footer, inner);
}

// --- Legal-notice continuation (pages 2/3) -----------------------------------
// When a notice is long enough that the closing forfeiture paragraph + signature
// block would collide with the reserved footer band, those trailing blocks are
// moved VERBATIM onto a clearly-labeled continuation sheet. No legal text is
// authored or altered here — the tail is relocated byte-for-byte. The trigger is
// a conservative content-size estimate (window.print + CSS cannot measure real
// layout); it errs toward splitting early, which is the safe failure mode (a
// clean extra sheet rather than overlap or clipped text).

const FORFEITURE_ANCHOR =
  '<p class="body"><strong>The landlord hereby elects to declare a forfeiture</strong>';
const FOOTER_ANCHOR = '<div class="footer">';

/** Available legal-notice body height on one Letter sheet after tightening (pt). */
const NOTICE_BODY_BUDGET_PT = 700;

/** Conservative estimated rendered height (pt) of the notice body, from the model. */
function estimateNoticeContentPt(model: NoticeModel): number {
  const CPL = 90;     // ~chars per justified body line at 10pt
  const LINE = 13.5;  // body line height (pt)
  const lines = (str: string) => Math.max(1, Math.ceil(str.length / CPL));
  let pt = 150;                                                    // letterhead/title/subtitle/hr/recipient
  pt += 16 + lines(model.demand.periodText) * LINE + 14;          // AMOUNT DUE label + demand lead
  pt += 16 + model.demand.rows.length * 18;                       // items header + rows
  pt += 28;                                                       // base-rent disclaimer
  pt += 16 + 2 * LINE + 3 * LINE;                                 // TIME TO COMPLY label + 2 paras
  pt += 16 + (2 + model.pay.rows.length) * 16;                    // HOW TO PAY label + payee/phone + rows
  pt += model.pay.sentences.reduce((a, str) => a + lines(str) * 12.5, 0); // pay sentences (small)
  pt += 30 + 64;                                                  // tail: forfeiture + signature
  return pt;
}

function noticeNeedsContinuation(model: NoticeModel): boolean {
  return estimateNoticeContentPt(model) > NOTICE_BODY_BUDGET_PT;
}

/** Split the extracted notice page into { page1, tail } at the forfeiture
 *  paragraph. Returns null (no split) if the anchors are absent — fail safe. */
function splitNoticeTail(rawNoticePage: string): { page1: string; tail: string } | null {
  const f = rawNoticePage.indexOf(FORFEITURE_ANCHOR);
  if (f === -1) return null;
  const foot = rawNoticePage.indexOf(FOOTER_ANCHOR, f);
  if (foot === -1) return null;
  return {
    page1: rawNoticePage.slice(0, f) + rawNoticePage.slice(foot),
    tail: rawNoticePage.slice(f, foot),
  };
}

/** A continuation sheet carrying the relocated (verbatim) forfeiture + signature. */
function continuationSection(tail: string, footerCite: string): string {
  return (
    `<section class="page">` +
    `<div class="accent-bar"></div>` +
    `<div class="doc-sub" style="margin-top:0.45in">(continued)</div>` +
    `<hr class="hr">` +
    tail +
    `<div class="footer"><div class="rule"></div>` +
    `<div class="cite">${esc(footerCite)}</div><div class="pageno"></div></div>` +
    `</section>`
  );
}

/** Build the 1-2 notice sheets for one copy (tenant or owner): banner label on
 *  each; owner copies also get the watermark + the Do-Not-Serve footer label. */
function noticeCopySheets(
  rawNoticePage: string,
  model: NoticeModel,
  opts: { label: string; continuedLabel: string; owner: boolean; footerCite?: string },
): string[] {
  const decorate = (pageHtml: string, label: string): string => {
    let p = withBanner(pageHtml, label, opts.owner);
    if (opts.owner) p = withWatermark(p, 'OWNER RECORD ONLY');
    if (opts.footerCite) p = setFooterCite(p, opts.footerCite);
    return p;
  };
  const split = noticeNeedsContinuation(model) ? splitNoticeTail(rawNoticePage) : null;
  if (!split) return [decorate(rawNoticePage, opts.label)];
  const cite = opts.footerCite ?? model.meta.noticeFooterCitation;
  return [
    decorate(split.page1, opts.label),
    decorate(continuationSection(split.tail, cite), opts.continuedLabel),
  ];
}

// --- Public builders -----------------------------------------------------------

/** Insert the gated (Phase 2) tenant QR footer into the first tenant sheet. */
function applyTenantQrGate(sheets: string[]): void {
  if (!TENANT_QR_FOOTER_ENABLED) return;
  const i = sheets[0].indexOf(FOOTER_ANCHOR);
  if (i === -1) throw new PacketRenderError('Notice page footer anchor not found.');
  sheets[0] = sheets[0].slice(0, i) + tenantQrFooterHtml() + sheets[0].slice(i);
}

/** Tenant Service Copy: the served notice page, label only (§6(a)/(d)); a
 *  continuation sheet is added only if the notice would overrun the footer. */
export function buildTenantServiceCopyHtml(model: NoticeModel): string {
  const { style, noticePage } = extractNoticeDocParts(model);
  const sheets = noticeCopySheets(noticePage, model, {
    label: PAGE_LABELS.tenant,
    continuedLabel: PAGE_LABELS.tenantContinued,
    owner: false,
  });
  applyTenantQrGate(sheets);
  return assembleDocument(`${PAGE_LABELS.tenant} \u2014 ${model.meta.title}`, style, sheets);
}

/** Owner Record Packet: the notice page(s) (owner-labeled, watermarked) + details. */
export function buildOwnerRecordCopyHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage } = extractNoticeDocParts(model);
  const sheets = noticeCopySheets(noticePage, model, {
    label: PAGE_LABELS.owner,
    continuedLabel: PAGE_LABELS.ownerContinued,
    owner: true,
    footerCite: 'Owner Record Copy \u00B7 Do Not Serve',
  });
  return assembleDocument(
    `${PAGE_LABELS.owner} \u2014 ${model.meta.title}`,
    style,
    [...sheets, ownerDetailsPage(model, data)],
  );
}

/** Service Log: the verbatim proof-of-service page (labeled) + attempts record. */
export function buildServiceLogHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, posPage } = extractNoticeDocParts(model);
  const pages = [withBanner(posPage, PAGE_LABELS.proofOfService, true), attemptsRecordPage(data)];
  return assembleDocument(`${PAGE_LABELS.proofOfService} \u2014 ${model.meta.title}`, style, pages);
}

/** Full packet: cover, tenant copy (+cont), owner copy (+cont), owner details,
 *  PoS, attempts, checklist. Page numbering is dynamic — continuation sheets
 *  grow the total beyond 7 when a notice is long. */
export function buildFullPacketHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage, posPage } = extractNoticeDocParts(model);
  const tenantSheets = noticeCopySheets(noticePage, model, {
    label: PAGE_LABELS.tenant,
    continuedLabel: PAGE_LABELS.tenantContinued,
    owner: false,
  });
  applyTenantQrGate(tenantSheets);
  const ownerSheets = noticeCopySheets(noticePage, model, {
    label: PAGE_LABELS.owner,
    continuedLabel: PAGE_LABELS.ownerContinued,
    owner: true,
    footerCite: 'Owner Record Copy \u00B7 Do Not Serve',
  });

  const pages = [
    coverSheetPage(),
    ...tenantSheets,
    ...ownerSheets,
    ownerDetailsPage(model, data),
    withBanner(posPage, PAGE_LABELS.proofOfService, true),
    attemptsRecordPage(data),
    checklistPage(),
  ];
  return assembleDocument(`${COVER_SHEET.header} \u2014 ${model.meta.title}`, style, pages);
}
