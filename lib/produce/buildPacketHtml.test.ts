/**
 * Content/gating pins for the Phase 1 packet builders + Owner Continuation QR V1 owner-only presentation.
 * The underlying packet builders remain the source of the legal document; the continuation adapter may add
 * owner-footer chrome but may never alter the tenant copy or make QR availability a Notice prerequisite.
 */
import { renderNotice, NOTICE_PROSE, POS_PROSE } from './renderNotice';
import {
  buildTenantServiceCopyHtml,
  buildOwnerRecordCopyHtml,
  buildServiceLogHtml,
  buildFullPacketHtml,
} from './buildPacketHtml';
import {
  OWNER_CONTINUATION_PRINTED_PHRASE,
  ownerContinuationQrDataUrl,
  withOwnerContinuationQr,
} from './ownerContinuationQr';
import {
  TENANT_QR_FOOTER_BODY,
  TENANT_QR_FOOTER_TITLE,
  TENANT_QR_FOOTER_ENABLED,
  PAGE_LABELS,
  COVER_SHEET,
} from './packetCopy';
import { createFlowState, NoticeFlowData } from '../flow/noticeFlowState';
import { readFileSync } from 'node:fs';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) passed += 1;
  else { failures.push(name); console.error(`FAIL: ${name}`); }
}
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

async function run() {
  const data: NoticeFlowData = {
    ...createFlowState().data,
    tenantNames: ['Alex Tenant'],
    propertyAddress: '123 Main St, Glendale, CA 91201',
    rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 }],
    baseRentOnlyConfirmed: true,
    landlordIdentity: { type: 'individual', names: ['Jane Owner'] },
    landlordIdentityConfirmed: true,
    landlordContact: { phone: '5555555555', streetAddress: '500 Oak Ave, Glendale, CA 91201' },
    paymentMethods: ['by_mail'],
    signerName: 'Jane Owner',
    signerCapacity: 'owner',
    signingDate: '2026-06-01',
    serviceDate: '2026-06-03',
  };

  const model = renderNotice({
    data,
    dates: { compliancePeriodStartDate: '2026-06-04', compliancePeriodEndDate: '2026-06-08' },
  }).model;

  // --- Tenant Service Copy ---
  const tenant = buildTenantServiceCopyHtml(model);
  check('tenant: carries the TENANT SERVICE COPY label', tenant.includes(PAGE_LABELS.tenant));
  check('tenant: locked mailbox-rule sentence present verbatim', tenant.includes('conclusively presumed received on the date posted'));
  check('tenant: single page', tenant.includes('Page 1 of 1'));
  check('tenant: NO proof of service page', !tenant.includes(POS_PROSE.header));
  check('tenant: NO owner label', !tenant.includes(PAGE_LABELS.owner));
  check('tenant: QR footer GATED OFF — no body string', !tenant.includes(TENANT_QR_FOOTER_BODY));
  check('tenant: QR footer GATED OFF — no title string', !tenant.includes(TENANT_QR_FOOTER_TITLE));
  check('tenant: negative gate remains false', TENANT_QR_FOOTER_ENABLED === false);

  // --- Owner Record Packet ---
  const owner = buildOwnerRecordCopyHtml(model, data);
  check('owner: carries DO NOT SERVE label', owner.includes('OWNER RECORD COPY'));
  check('owner: includes owner details page', owner.includes('Owner Record Details'));
  check('owner: two pages', owner.includes('Page 2 of 2'));
  check('owner: echoes payee name', owner.includes('Jane Owner'));
  check('owner: remains printable with no QR', !owner.includes(OWNER_CONTINUATION_PRINTED_PHRASE) && owner.includes('</html>'));

  // --- Service Log ---
  const log = buildServiceLogHtml(model, data);
  check('log: PoS page carries PROOF OF SERVICE label', log.includes(PAGE_LABELS.proofOfService));
  check('log: attempts page carries SERVICE ATTEMPT RECORD label', log.includes(PAGE_LABELS.serviceAttempt));
  check('log: reuses verbatim PoS header', log.includes(POS_PROSE.header));
  check('log: reuses verbatim perjury sentence', log.includes('penalty of perjury'));
  check('log: includes attempts record page', log.includes('Service Attempt Record'));

  // --- Full Packet ---
  const full = buildFullPacketHtml(model, data);
  check('full: cover sheet header', full.includes(COVER_SHEET.header));
  check('full: cover important note', full.includes('intended for delivery to the tenant'));
  check('full: seven pages', full.includes('Page 7 of 7'));
  check('full: tenant label present', full.includes(PAGE_LABELS.tenant));
  check('full: checklist title present', full.includes('Follow-Up Checklist'));
  check('full: QR footer GATED OFF in full packet too', !full.includes(TENANT_QR_FOOTER_BODY));

  // --- Owner Continuation QR ---
  const scanUrl = `https://ownerpilot.ai/owner-continuation#${'a'.repeat(64)}`;
  const qrData = await ownerContinuationQrDataUrl(scanUrl, { size: 220 });
  const ownerWithQr = withOwnerContinuationQr(owner, qrData);
  const fullWithQr = withOwnerContinuationQr(full, qrData);

  check('owner QR: approved phrase exact', ownerWithQr.includes(OWNER_CONTINUATION_PRINTED_PHRASE));
  check('owner QR: approved phrase byte-exact', OWNER_CONTINUATION_PRINTED_PHRASE === 'Scan to continue this record');
  check('owner QR: appears exactly once', count(ownerWithQr, 'op-owner-continuation-qr') === 1 && count(ownerWithQr, OWNER_CONTINUATION_PRINTED_PHRASE) === 1);
  check('owner QR: footer relationship places QR right of existing house mark', ownerWithQr.includes('class="mark"') && ownerWithQr.includes('left:1.12in'));
  check('owner QR: QR is in footer', ownerWithQr.indexOf('op-owner-continuation-qr') > ownerWithQr.indexOf('<div class="footer">'));
  check('owner QR: pagination unchanged', ownerWithQr.includes('Page 2 of 2'));
  check('full QR: exactly once', count(fullWithQr, OWNER_CONTINUATION_PRINTED_PHRASE) === 1);
  check('full QR: appears after Owner Record label', fullWithQr.indexOf(OWNER_CONTINUATION_PRINTED_PHRASE) > fullWithQr.indexOf(PAGE_LABELS.owner));
  check('full QR: remains in seven-page packet', fullWithQr.includes('Page 7 of 7'));
  check('tenant: no Owner Continuation phrase', !tenant.includes(OWNER_CONTINUATION_PRINTED_PHRASE));
  check('tenant: no Owner Continuation class', !tenant.includes('op-owner-continuation-qr'));

  // Legal Notice content before the owner footer is byte-identical; the adapter adds only footer chrome.
  const ownerBody = owner.slice(0, owner.indexOf('<div class="footer">'));
  const qrOwnerBody = ownerWithQr.slice(0, ownerWithQr.indexOf('<div class="footer">'));
  check('owner QR: locked Notice body unchanged', ownerBody === qrOwnerBody);
  check('owner QR: mailbox-rule locked text unchanged', ownerWithQr.includes(NOTICE_PROSE.mailboxRuleSentence));

  // QR failure is isolated from Notice production: invalid QR chrome fails, while already-built Notice stays valid.
  let qrFailure = false;
  try { withOwnerContinuationQr(owner, 'not-a-qr'); } catch { qrFailure = true; }
  check('owner QR failure: adapter fails independently', qrFailure);
  check('owner QR failure: base Notice remains printable', owner.includes(PAGE_LABELS.owner) && owner.includes('</html>'));
  const printSource = readFileSync('components/packet-print-options.tsx', 'utf8');
  check('owner QR failure: print component falls back to baseHtml', printSource.includes('html = baseHtml') && printSource.includes('You can still print this notice.'));

  // Deterministic machine-readable artifact evidence available without a new decoder dependency: qrcode produced
  // a real 220px PNG (PNG signature + IHDR width), not placeholder markup.
  check('QR machine artifact: PNG data URL', qrData.startsWith('data:image/png;base64,'));
  const png = Buffer.from(qrData.slice(qrData.indexOf(',') + 1), 'base64');
  check('QR machine artifact: PNG signature', png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
  check('QR machine artifact: 220px source width', png.readUInt32BE(16) === 220);

  // --- Locked-constant integrity: the notice text constants were not touched ---
  check('locked: mailboxRuleSentence byte-identical',
    NOTICE_PROSE.mailboxRuleSentence ===
      'If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. § 1161(2).)');

  // --- Continuation pages: long notice still splits/paginates exactly as before. ---
  const longModel = JSON.parse(JSON.stringify(model));
  longModel.demand.rows = Array.from({ length: 10 }, (_unused, i) => ({
    description: `Rent period ${i + 1}`,
    amountFormatted: '3,000.00',
  }));
  longModel.pay.rows = [
    { label: 'Bank', value: 'First Bank' },
    { label: 'Branch', value: 'Glendale Branch' },
    { label: 'Account number', value: '1234' },
  ];
  longModel.pay.sentences = [
    NOTICE_PROSE.mailboxRuleSentence,
    NOTICE_PROSE.bankPaperInstrumentSentence,
    NOTICE_PROSE.fiveMileSentence,
  ];
  const tLong = buildTenantServiceCopyHtml(longModel);
  const fullLong = buildFullPacketHtml(longModel, data);
  const fullLongQr = withOwnerContinuationQr(fullLong, qrData);
  check('cont: normal notice stays a single tenant page', tenant.includes('Page 1 of 1'));
  check('cont: long notice splits tenant copy to two pages', tLong.includes('Page 2 of 2'));
  check('cont: tenant continuation label present', tLong.includes(PAGE_LABELS.tenantContinued));
  check('cont: owner continuation label present in full packet', fullLong.includes(PAGE_LABELS.ownerContinued));
  check('cont: full packet grows past seven pages', fullLong.includes('Page 9 of 9'));
  check('cont: QR does not alter long-packet page count', fullLongQr.includes('Page 9 of 9'));
  check('cont: forfeiture text relocated (still present verbatim)', tLong.includes('hereby elects to declare a forfeiture'));
  check('cont: page 1 no longer carries the forfeiture paragraph', tLong.split(PAGE_LABELS.tenantContinued)[0].includes('hereby elects to declare a forfeiture') === false);

  // Existing packet product assertions.
  check('no "coming soon" in full packet', !full.includes('coming soon'));
  check('no "RiskPath QR" placeholder text', !full.includes('RiskPath QR'));
  check('owner copy has Payment Summary section', owner.includes('Payment Summary'));
  check('owner record details shows RiskPath follow-up note (not the box)', owner.includes('included in the checklist at the end'));
  check('full packet keeps the RiskPath Follow-Up block on the checklist page', full.includes('RiskPath™ Follow-Up'));
  check('owner record details has no boxed RiskPath section header', !owner.includes('>RiskPath™ Follow-Up<'));
  check('tenant copy stays clean of RiskPath follow-up', !tenant.includes('RiskPath™ Follow-Up'));

  if (failures.length > 0) throw new Error(`buildPacketHtml.test.ts: ${failures.length} check(s) failed, ${passed} passed`);
  console.log(`buildPacketHtml.test.ts: all ${passed} checks passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
