/**
 * buildNoticeDocumentHtml (v4) — turns the renderer's structured `model` into
 * the attorney-approved STYLED two-page HTML document (forest top bar,
 * letterhead, tinted recipient panel, itemization table, signature block, page
 * break, Proof-of-Service with real drawn checkboxes + per-page citations).
 *
 * SINGLE SOURCE OF WORDING: composes the SAME locked/proposed prose constants
 * and the SAME data the text rendering uses (renderNotice). It only arranges
 * and styles them; it does not restate or paraphrase any sentence. v4 HOW TO
 * PAY wording is PROPOSED pending attorney sign-off; production stays gated.
 *
 * Output is a complete standalone HTML string (own <style>, logos inlined as
 * data URIs). Used for print-to-PDF and for the in-app preview (sandboxed
 * <iframe srcDoc>). ALWAYS white-paper / black-ink, independent of the reader's
 * system color scheme.
 */

import type { NoticeModel } from './renderNotice';
import { POS_PROSE, NOTICE_PROSE } from './renderNotice';
import { LETTERHEAD_DATA_URI, MARK_DATA_URI } from './noticeAssets';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function boldTokens(escaped: string, tokens: string[]): string {
  let out = escaped;
  for (const t of tokens) {
    const e = esc(t);
    if (e) out = out.split(e).join(`<strong>${e}</strong>`);
  }
  return out;
}

const STYLE = `
  :root {
    --accent:#102018; --bar:#1C352A; --accent-gold:#A8895A; --ink:#1A1A1A;
    --muted:#6B6B6B; --rule:#C8C5BD; --bg-tint:#F5F2EC;
  }
  * { box-sizing:border-box; }
  html,body { margin:0; padding:0; background:#fff; }
  body {
    font-family:'Inter','Noto Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); -webkit-font-smoothing:antialiased;
  }
  .page { position:relative; width:8.5in; height:11in; margin:0 auto; background:#fff; padding:0.55in 0.85in 0.95in 0.85in; overflow:hidden; }
  .accent-bar { position:absolute; top:0; left:0; right:0; height:0.16in; background:var(--bar); }
  .footer { position:absolute; left:0; right:0; bottom:0; height:0.72in; }
  .footer .rule { position:absolute; left:0.85in; right:0.85in; bottom:0.72in; border-top:0.5pt solid var(--rule); }
  .footer .mark { position:absolute; left:0.85in; bottom:0.30in; height:0.34in; width:auto; }
  .footer .cite { position:absolute; left:0; right:0; bottom:0.47in; text-align:center; font-size:8pt; color:var(--muted); }
  .footer .pageno { position:absolute; right:0.85in; bottom:0.47in; font-size:8pt; color:var(--muted); }
  .letterhead { text-align:center; }
  .letterhead img { width:1.25in; height:auto; }
  .lh-space { height:6pt; }
  .doc-title { text-align:center; text-transform:uppercase; font-weight:700; font-size:14pt; letter-spacing:1.2px; color:var(--ink); margin:0; }
  .doc-sub { text-align:center; font-size:9pt; font-weight:500; color:var(--muted); margin:4px 0 10px 0; }
  .hr { border:0; border-top:0.5pt solid var(--rule); margin:0 0 12px 0; }
  .recipient { background:var(--bg-tint); border-top:0.5pt solid var(--rule); border-bottom:0.5pt solid var(--rule); padding:12px 14px; margin-bottom:14px; }
  .recipient .to { font-size:10pt; line-height:14pt; margin:0; }
  .recipient .to strong { font-weight:600; }
  .recipient .addr { font-size:11pt; font-weight:600; margin:8px 0 0 0; }
  .label { font-size:8.5pt; font-weight:600; color:var(--accent); letter-spacing:1.4px; text-transform:uppercase; margin:14px 0 5px 0; }
  p.body { font-size:10pt; line-height:14pt; text-align:justify; margin:0 0 9px 0; }
  p.body strong { font-weight:600; }
  .small { font-size:8.5pt; color:var(--muted); line-height:12pt; margin:0 0 5px 0; }
  table.items { width:100%; border-collapse:collapse; margin:4px 0 6px 0; }
  table.items th { font-size:8.5pt; font-weight:600; color:var(--muted); text-align:left; padding:0 0 5px 0; border-bottom:0.5pt solid var(--rule); }
  table.items th.amt, table.items td.amt { text-align:right; }
  table.items td { font-size:10pt; color:var(--ink); padding:7px 0; }
  table.items tr.total td { font-weight:700; background:var(--bg-tint); border-top:0.5pt solid var(--rule); padding:7px 8px; }
  .pay-grid { display:grid; grid-template-columns:1.7in 1fr; row-gap:5px; column-gap:8px; margin:2px 0 8px 0; }
  .pay-grid .k { font-size:8.5pt; font-weight:600; color:var(--muted); letter-spacing:.3px; padding-top:1px; }
  .pay-grid .v { font-size:10pt; }
  .pay-notes { margin:4px 0 8px 0; }
  .sig { margin-top:16px; }
  .sig .line { width:3.2in; border-top:0.6pt solid var(--ink); }
  .sig .name { font-size:11pt; font-weight:600; margin-top:4px; }
  .sig .role { font-size:9pt; font-weight:500; color:var(--muted); }
  .sig .dated { font-size:10pt; margin-top:8px; }
  .sig .dated strong { font-weight:600; }
  .pos-intro { font-size:10pt; line-height:15pt; text-align:left; margin:0 0 12px 0; }
  .pos-intro strong { font-weight:600; }
  .blank { display:inline-block; border-bottom:0.6pt solid var(--ink); min-width:120px; height:11pt; vertical-align:baseline; }
  .blank.sm { min-width:80px; } .blank.lg { min-width:200px; }
  .opt { border:0.5pt solid var(--rule); padding:10px 12px; margin-bottom:8px; }
  .opt .head { display:flex; align-items:center; gap:8px; }
  .opt .head .lbl { font-size:10.5pt; font-weight:600; }
  .cbx { width:11px; height:11px; border:0.9pt solid var(--ink); background:#fff; display:inline-block; flex:0 0 auto; }
  .opt .obody { font-size:10pt; line-height:16pt; text-align:left; margin:6px 0 0 0; }
  .perjury { font-size:10pt; line-height:15pt; margin:6px 0 0 0; }
  .perjury strong { font-weight:600; }
  @media print { .page { margin:0; } .page + .page { page-break-before:always; } }
  @page { size:Letter; margin:0; }
`;

export function buildNoticeDocumentHtml(model: NoticeModel): string {
  const { meta, recipient, demand, compliance, pay, signature } = model;

  const recipientLine =
    `<strong>TO: ${esc(recipient.tenantNamesJoined)}</strong>, ${esc(NOTICE_PROSE.recipientRest)}`;
  const countyLine = recipient.propertyCounty
    ? `<div class="addr">County of ${esc(recipient.propertyCounty)}, California</div>`
    : '';

  const demandLead = boldTokens(
    esc(NOTICE_PROSE.demandLead(demand.periodText, demand.totalFormatted)),
    [demand.periodText, `$${demand.totalFormatted}`],
  );

  const itemRows = demand.rows
    .map((r) => `<tr><td>${esc(r.description)}</td><td class="amt">$${esc(r.amountFormatted)}</td></tr>`)
    .join('');

  const complianceSentence = boldTokens(
    esc(NOTICE_PROSE.complianceSentence(compliance.commencementFormatted, compliance.expirationFormatted)),
    [compliance.commencementFormatted, compliance.expirationFormatted],
  );
  const consequenceSentence = esc(NOTICE_PROSE.consequenceSentence(compliance.expirationFormatted));

  // v4 HOW TO PAY: payee trio + branch rows (grid) + statute sentences below.
  const payGrid =
    `<div class="k">${esc(NOTICE_PROSE.payableToLabel)}</div><div class="v">${esc(pay.payeeName)}</div>` +
    `<div class="k">${esc(NOTICE_PROSE.telephoneLabel)}</div><div class="v">${esc(pay.payeePhone)}</div>` +
    pay.rows.map((r) => `<div class="k">${esc(r.label)}</div><div class="v">${esc(r.value)}</div>`).join('');
  const payNotes = pay.sentences.map((s) => `<p class="small">${esc(s)}</p>`).join('');

  const forfeiture = boldTokens(esc(NOTICE_PROSE.forfeitureElection), [
    'The landlord hereby elects to declare a forfeiture',
  ]);

  const posIntro = boldTokens(esc(POS_PROSE.intro(recipient.tenantNamesJoined)), [
    'THREE-DAY NOTICE TO PAY RENT OR QUIT',
    recipient.tenantNamesJoined,
  ]).replace(/_{6,}/g, (m) => `<span class="blank${m.length > 24 ? ' lg' : m.length < 16 ? ' sm' : ''}"></span>`);

  const posOptions = POS_PROSE.options
    .map((o) => {
      const body = esc(o.body).replace(/_{4,}/g, (m) => `<span class="blank${m.length > 24 ? '' : ' sm'}"></span>`);
      return `<div class="opt"><div class="head"><span class="cbx"></span><span class="lbl">${esc(o.label)}</span></div><p class="obody">${body}</p></div>`;
    })
    .join('');

  const perjury = boldTokens(esc(POS_PROSE.perjury), ['I declare under penalty of perjury']);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(meta.title)}${recipient.propertyAddress ? ' — ' + esc(recipient.propertyAddress) : ''}</title>
<style>${STYLE}</style>
</head>
<body>

<section class="page">
  <div class="accent-bar"></div>
  <div class="letterhead"><img src="${LETTERHEAD_DATA_URI}" alt="OwnerPilot.AI"></div>
  <div class="lh-space"></div>
  <h1 class="doc-title">${esc(meta.title)}</h1>
  <div class="doc-sub">${esc(meta.faceCitation)}</div>
  <hr class="hr">

  <div class="recipient">
    <p class="to">${recipientLine}</p>
    <div class="addr">${esc(recipient.propertyAddress)}</div>
    ${countyLine}
  </div>

  <div class="label">${esc(NOTICE_PROSE.amountDueHeader)}</div>
  <p class="body">${demandLead}</p>
  <table class="items">
    <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${itemRows}
      <tr class="total"><td>TOTAL DUE</td><td class="amt">$${esc(demand.totalFormatted)}</td></tr>
    </tbody>
  </table>
  <p class="small">${esc(NOTICE_PROSE.baseRentDisclaimer)}</p>

  <div class="label">${esc(NOTICE_PROSE.timeToComplyHeader)}</div>
  <p class="body">${complianceSentence}</p>
  <p class="body">${consequenceSentence}</p>

  <div class="label">${esc(NOTICE_PROSE.howToPayHeader)}</div>
  <div class="pay-grid">${payGrid}</div>
  <div class="pay-notes">${payNotes}</div>
  <p class="body">${forfeiture}</p>

  <div class="sig">
    <div class="dated" style="margin:0 0 16px 0">Dated: <strong>${esc(signature.datedFormatted)}</strong></div>
    <div class="line"></div>
    <div class="name">${esc(signature.name)}</div>
    <div class="role">${esc(signature.roleLabel)}</div>
  </div>

  <div class="footer">
    <div class="rule"></div>
    <img class="mark" src="${MARK_DATA_URI}" alt="">
    <div class="cite">${esc(meta.noticeFooterCitation)}</div>
    <div class="pageno">Page 1 of 2</div>
  </div>
</section>

<section class="page">
  <div class="accent-bar"></div>
  <h1 class="doc-title" style="margin-top:6px">${esc(POS_PROSE.header)}</h1>
  <div class="doc-sub">${esc(POS_PROSE.faceCitation)}</div>
  <hr class="hr">

  <p class="pos-intro">${posIntro}</p>
  ${posOptions}
  <p class="perjury">${perjury}</p>

  <div class="sig" style="margin-top:24px">
    <div class="dated" style="margin-bottom:24px">Dated: <span class="blank"></span></div>
    <div class="line"></div>
    <div class="role">Signature of person who served</div>
  </div>

  <div class="footer">
    <div class="rule"></div>
    <img class="mark" src="${MARK_DATA_URI}" alt="">
    <div class="cite">${esc(meta.posFooterCitation)}</div>
    <div class="pageno">Page 2 of 2</div>
  </div>
</section>

</body>
</html>`;
}
