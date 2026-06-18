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

/** Owner-facing RiskPath block with the Phase 1 placeholder QR (owner pages only). */
function ownerRiskPathBlock(scanLine: string): string {
  return (
    `<div class="pk-risk">` +
    `<div class="copy">` +
    `<p class="rt">${esc(OWNER_FOOTER.title)}</p>` +
    `<p class="rb">${esc(scanLine)}</p>` +
    `<p class="rf">${esc(OWNER_FOOTER.tagline)}</p>` +
    `</div>` +
    `<div class="pk-qr"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i>` +
    `<span class="qc">${esc(OWNER_FOOTER.qrPlaceholder)}</span></div>` +
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
  const cells =
    detailCell('Property', formatPropertyLine(model.recipient.propertyAddress, model.recipient.propertyUnit), true) +
    detailCell('Tenant(s)', model.recipient.tenantNamesJoined) +
    detailCell('Total demanded', `$${model.demand.totalFormatted}`) +
    detailCell('Payable to', model.pay.payeeName) +
    detailCell('Payment phone', model.pay.payeePhone) +
    detailCell('Compliance period', `${model.compliance.commencementFormatted} \u2013 ${model.compliance.expirationFormatted}`) +
    detailCell('Dated / signed', model.signature.datedFormatted) +
    detailCell('Intended service date', safeDateDisplay(data.serviceDate)) +
    detailCell('Service attempts logged', String(attempts.length));

  const steps = NEXT_STEP_ITEMS.map(
    (it) => `<li><span class="pk-cbx"></span>${esc(it)}</li>`,
  ).join('');

  const inner =
    `<div class="pk-mast"><div><h1 class="pk-mast-title">Owner Record Details</h1>` +
    `<p class="pk-mast-sub">For your records only. Do not serve this page.</p></div></div>` +
    `<div class="pk-section"><span class="n">1</span><span class="t">Notice Details</span><span class="r"></span></div>` +
    `<div class="pk-card"><div class="grid">${cells}</div></div>` +
    `<div class="pk-section"><span class="n">2</span><span class="t">Next Step</span><span class="r"></span></div>` +
    `<ul class="pk-steps">${steps}</ul>` +
    `<div class="pk-section"><span class="n">3</span><span class="t">RiskPath\u2122 Connected Form</span><span class="r"></span></div>` +
    ownerRiskPathBlock(OWNER_FOOTER.scanDetails);
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
    ownerRiskPathBlock(OWNER_FOOTER.scanAttempts);
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
    ownerRiskPathBlock(OWNER_FOOTER.scanChecklist);
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

/** Owner Record Packet: the notice page (owner-labeled, watermarked) + owner details. */
export function buildOwnerRecordCopyHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage } = extractNoticeDocParts(model);
  let ownerNotice = withBanner(noticePage, PAGE_LABELS.owner, true);
  ownerNotice = withWatermark(ownerNotice, 'OWNER RECORD ONLY');
  ownerNotice = setFooterCite(ownerNotice, 'Owner Record Copy \u00B7 Do Not Serve');
  const pages = [ownerNotice, ownerDetailsPage(model, data)];
  return assembleDocument(`${PAGE_LABELS.owner} \u2014 ${model.meta.title}`, style, pages);
}

/** Service Log: the verbatim proof-of-service page (labeled) + attempts record. */
export function buildServiceLogHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, posPage } = extractNoticeDocParts(model);
  const pages = [withBanner(posPage, PAGE_LABELS.proofOfService, true), attemptsRecordPage(data)];
  return assembleDocument(`${PAGE_LABELS.proofOfService} \u2014 ${model.meta.title}`, style, pages);
}

/** Full packet: cover, tenant copy, owner copy, owner details, PoS, attempts, checklist. */
export function buildFullPacketHtml(model: NoticeModel, data: NoticeFlowData): string {
  const { style, noticePage, posPage } = extractNoticeDocParts(model);
  let tenantPage = withBanner(noticePage, PAGE_LABELS.tenant, false);
  if (TENANT_QR_FOOTER_ENABLED) {
    const anchor = '<div class="footer">';
    const i = tenantPage.indexOf(anchor);
    if (i === -1) throw new PacketRenderError('Notice page footer anchor not found.');
    tenantPage = tenantPage.slice(0, i) + tenantQrFooterHtml() + tenantPage.slice(i);
  }
  let ownerNotice = withBanner(noticePage, PAGE_LABELS.owner, true);
  ownerNotice = withWatermark(ownerNotice, 'OWNER RECORD ONLY');
  ownerNotice = setFooterCite(ownerNotice, 'Owner Record Copy \u00B7 Do Not Serve');

  const pages = [
    coverSheetPage(),
    tenantPage,
    ownerNotice,
    ownerDetailsPage(model, data),
    withBanner(posPage, PAGE_LABELS.proofOfService, true),
    attemptsRecordPage(data),
    checklistPage(),
  ];
  return assembleDocument(`${COVER_SHEET.header} \u2014 ${model.meta.title}`, style, pages);
}
