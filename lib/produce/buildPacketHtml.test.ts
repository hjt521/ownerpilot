/**
 * Content/gating pins for the Phase 1 packet builders. Renders a real notice
 * model via renderNotice (synthetic data) and asserts: the tenant copy carries
 * ONLY the label (no QR footer strings — §6(d) gate), the owner pages carry
 * the DO NOT SERVE label, the service log reuses the verbatim PoS page, and
 * the full packet assembles all pages in spec order.
 */
import { renderNotice, NOTICE_PROSE, POS_PROSE } from './renderNotice';
import {
  buildTenantServiceCopyHtml,
  buildOwnerRecordCopyHtml,
  buildServiceLogHtml,
  buildFullPacketHtml,
} from './buildPacketHtml';
import {
  TENANT_QR_FOOTER_BODY,
  TENANT_QR_FOOTER_TITLE,
  PAGE_LABELS,
  COVER_SHEET,
} from './packetCopy';
import { createFlowState, NoticeFlowData } from '../flow/noticeFlowState';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failures.push(name);
    console.error(`FAIL: ${name}`);
  }
}

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
check('tenant: locked mailbox-rule sentence present verbatim',
  tenant.includes('conclusively presumed received on the date posted'));
check('tenant: single page', tenant.includes('Page 1 of 1'));
check('tenant: NO proof of service page', !tenant.includes(POS_PROSE.header));
check('tenant: NO owner label', !tenant.includes(PAGE_LABELS.owner));
check('tenant: QR footer GATED OFF — no body string', !tenant.includes(TENANT_QR_FOOTER_BODY));
check('tenant: QR footer GATED OFF — no title string', !tenant.includes(TENANT_QR_FOOTER_TITLE));

// --- Owner Record Packet ---
const owner = buildOwnerRecordCopyHtml(model, data);
check('owner: carries DO NOT SERVE label', owner.includes('OWNER RECORD COPY'));
check('owner: includes owner details page', owner.includes('Owner Record Details'));
check('owner: two pages', owner.includes('Page 2 of 2'));
check('owner: echoes payee name', owner.includes('Jane Owner'));

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

// --- Locked-constant integrity: the notice text constants were not touched ---
check('locked: mailboxRuleSentence byte-identical',
  NOTICE_PROSE.mailboxRuleSentence ===
    'If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. \u00A7 1161(2).)');

if (failures.length > 0) {
  throw new Error(`buildPacketHtml.test.ts: ${failures.length} check(s) failed, ${passed} passed`);
}
console.log(`buildPacketHtml.test.ts: all ${passed} checks passed`);
