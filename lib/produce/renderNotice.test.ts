/**
 * Defect #2 — § 1161(2) payee-name derivation tests.
 * Repo test convention (inline check() runner, top-level execution, ✓/✗ output).
 * Run with: npx tsx lib/produce/renderNotice.test.ts
 *
 * Covers the attorney ruling 2026-06-05:
 *   §2.1/§2.3 owner-line composition (1 / 2 / 3+ with Oxford comma)
 *   §2.4 edge cases (single owner no trailing joiner; full names on shared surname)
 *   §1.2 non-landlord override ("[payee], as agent for [landlord]")
 *   §4 nameSource audit token
 * plus renderNotice integration (the composed name reaches the "Payable to:" line).
 */

import {
  derivePayeeName,
  renderNotice,
  formatNoticeDate,
  type ComputedNoticeDates,
} from './renderNotice';
import type { NoticeFlowData } from '../flow/noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

function individual(names: string[]): Partial<NoticeFlowData> {
  return { landlordIdentity: { type: 'individual', names }, landlordIdentityConfirmed: true };
}
function entity(entityLegalName: string): Partial<NoticeFlowData> {
  return {
    landlordIdentity: { type: 'entity', entityLegalName, entityType: 'llc' },
    landlordIdentityConfirmed: true,
  };
}
function data(over: Partial<NoticeFlowData>): NoticeFlowData {
  return {
    dispute: {},
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2000 }],
    paymentMethods: [],
    ...over,
  } as NoticeFlowData;
}

console.log('\n=== Owner-line composition (ruling §2.1/§2.3) ===\n');
{
  const r = derivePayeeName(data(individual(['Maria Lopez'])));
  check('1 owner => name verbatim', r.name === 'Maria Lopez', r.name);
  check('1 owner => source individual_owners', r.nameSource === 'individual_owners');
  check('1 owner => NO trailing joiner/comma (§2.4)', !/[,]| and /.test(r.name), JSON.stringify(r.name));
}
{
  const r = derivePayeeName(data(individual(['Maria Lopez', 'Daniel Lopez'])));
  check('2 owners => "A and B"', r.name === 'Maria Lopez and Daniel Lopez', r.name);
}
{
  const r = derivePayeeName(data(individual(['Maria Lopez', 'Daniel Lopez', 'Sofia Lopez'])));
  check('3 owners => Oxford "A, B, and C"', r.name === 'Maria Lopez, Daniel Lopez, and Sofia Lopez', r.name);
}
{
  const r = derivePayeeName(data(individual(['Robert Chen', 'Linda Chen', 'James Chen', 'Amy Chen'])));
  check('4 owners => Oxford serial list', r.name === 'Robert Chen, Linda Chen, James Chen, and Amy Chen', r.name);
}
{
  // §2.4: shared surname renders full names both times, NOT "Maria and Daniel Lopez".
  const r = derivePayeeName(data(individual(['Maria Lopez', 'Daniel Lopez'])));
  check('shared surname => full names (§2.4)', r.name === 'Maria Lopez and Daniel Lopez', r.name);
}
{
  // whitespace + empty entries are dropped; remaining composed normally.
  const r = derivePayeeName(data(individual(['  Maria Lopez ', '', '  '])));
  check('blank entries dropped => single name verbatim', r.name === 'Maria Lopez', JSON.stringify(r.name));
}

console.log('\n=== Entity (default, no override) ===\n');
{
  const r = derivePayeeName(data(entity('PTAG Properties, LLC')));
  check('entity => legal name verbatim', r.name === 'PTAG Properties, LLC', r.name);
  check('entity => source entity_legal_name', r.nameSource === 'entity_legal_name');
}

console.log('\n=== Non-landlord override (ruling §1.2) ===\n');
{
  const r = derivePayeeName(data({
    ...individual(['Maria Lopez', 'Daniel Lopez']),
    payeeIsNonLandlord: true,
    payeeOverrideName: 'Westside Property Management, Inc.',
  }));
  check('override + individual => "[payee], as agent for [owners]"',
    r.name === 'Westside Property Management, Inc., as agent for Maria Lopez and Daniel Lopez', r.name);
  check('override => source override_agent', r.nameSource === 'override_agent');
}
{
  const r = derivePayeeName(data({
    ...entity('PTAG Properties, LLC'),
    payeeIsNonLandlord: true,
    payeeOverrideName: 'Westside Property Management, Inc.',
  }));
  check('override + entity => "[payee], as agent for [entity]"',
    r.name === 'Westside Property Management, Inc., as agent for PTAG Properties, LLC', r.name);
}

console.log('\n=== Unresolvable => empty (fail closed) ===\n');
{
  const r = derivePayeeName(data({}));
  check('no identity => name "" / unresolved', r.name === '' && r.nameSource === 'unresolved');
}
{
  const r = derivePayeeName(data({ ...individual(['Maria Lopez']), payeeIsNonLandlord: true }));
  check('override on, blank override name => unresolved', r.name === '' && r.nameSource === 'unresolved');
}
{
  const r = derivePayeeName(data({ ...individual([]), payeeIsNonLandlord: false }));
  check('individual with empty names => unresolved', r.name === '' && r.nameSource === 'unresolved');
}

console.log('\n=== renderNotice integration (the "Payable to:" line) ===\n');
const dates: ComputedNoticeDates = {
  compliancePeriodStartDate: '2026-06-02',
  compliancePeriodEndDate: '2026-06-04',
};
function renderable(over: Partial<NoticeFlowData>): NoticeFlowData {
  return data({
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCounty: 'Fresno',
    baseRentOnlyConfirmed: true,
    landlordContact: { name: 'IGNORED LEGACY', phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' },
    paymentMethods: ['by_mail'],
    signerName: 'Maria Lopez',
    signerCapacity: 'owner',
    signingDate: '2026-06-01',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    ...over,
  });
}
{
  const out = renderNotice({ data: renderable(individual(['Maria Lopez', 'Daniel Lopez'])), dates });
  check('default individual => composed owners on face',
    out.noticeText.includes('Payable to: Maria Lopez and Daniel Lopez'),
    out.noticeText.split('\n').find((l) => l.startsWith('Payable to')));
  check('legacy landlordContact.name is IGNORED by the face',
    !out.noticeText.includes('IGNORED LEGACY'));
  check('audit payee_name_source = individual_owners',
    out.variablesUsed.payee_name_source === 'individual_owners');
}
{
  const out = renderNotice({ data: renderable({
    ...individual(['Maria Lopez', 'Daniel Lopez']),
    payeeIsNonLandlord: true,
    payeeOverrideName: 'Westside Property Management, Inc.',
  }), dates });
  check('override => "as agent for" on face',
    out.noticeText.includes('Payable to: Westside Property Management, Inc., as agent for Maria Lopez and Daniel Lopez'),
    out.noticeText.split('\n').find((l) => l.startsWith('Payable to')));
  check('audit payee_name_source = override_agent',
    out.variablesUsed.payee_name_source === 'override_agent');
}

console.log('\n=== Defect #3: entity signature block (structure; production stays gated) ===\n');
function entityData(over: Partial<NoticeFlowData> = {}): NoticeFlowData {
  return data({
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCounty: 'Fresno',
    baseRentOnlyConfirmed: true,
    landlordContact: { phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' },
    paymentMethods: ['by_mail'],
    landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Properties, LLC', entityType: 'llc' },
    landlordIdentityConfirmed: true,
    signerName: 'Daniel Lopez',
    signerCapacity: 'officer_member_trustee',
    signerTitle: 'Managing Member',
    signingDate: '2026-06-01',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    ...over,
  });
}
{
  const out = renderNotice({ data: entityData(), dates });
  const tail = out.noticeText.split('\n').slice(-3);
  check('entity renders WITHOUT throwing (used to throw on missing signerRole)', true);
  check('entity legal name on its own line', tail[1] === 'PTAG Properties, LLC', tail.join(' | '));
  check('"By: [signer], [title]" line', tail[2] === 'By: Daniel Lopez, Managing Member', tail[2]);
  check('no individual signerRole label leaks onto the entity face',
    !out.noticeText.includes('Authorized Agent for Owner') && !out.noticeText.split('\n').includes('Owner'));
  check('model.signature.entity populated', out.model.signature.entity?.legalName === 'PTAG Properties, LLC'
    && out.model.signature.entity?.signerTitle === 'Managing Member');
  check('audit landlord_type = entity', out.variablesUsed.landlord_type === 'entity');
  check('audit signer_title carried', out.variablesUsed.signer_title === 'Managing Member');
  check('entity payee line is the entity legal name (Defect #2 derivation)',
    out.noticeText.includes('Payable to: PTAG Properties, LLC'));
}
{
  // Fail closed: an entity insider with no title cannot render.
  let threw = false;
  try { renderNotice({ data: entityData({ signerTitle: undefined }), dates }); } catch { threw = true; }
  check('entity missing signer title => throws (fail closed)', threw);
}
{
  // Regression: the individual face is unchanged (name + role, no entity block).
  const out = renderNotice({ data: renderable(individual(['Maria Lopez'])), dates });
  const tail = out.noticeText.split('\n').slice(-2);
  check('individual still renders name + role', tail[0] === 'Maria Lopez' && tail[1] === 'Owner', tail.join(' | '));
  check('individual has no entity sub-model', out.model.signature.entity === undefined);
}

console.log('\n=== B1 supersession: Dated == serviceDate == intendedServiceDate (no divergence) ===\n');
{
  // Divergent inputs prove the rule: serviceDate Jun 30, signingDate Jun 20. Under the superseded B1 rule
  // the Dated line would have shown Jun 20 (signing). Under facial coherence it must show Jun 30 (service).
  const out = renderNotice({
    data: renderable({ ...individual(['Maria Lopez']), serviceDate: '2026-06-30', signingDate: '2026-06-20' }),
    dates,
  });
  const datedLine = out.noticeText.split('\n').find((l) => l.startsWith('Dated:'));
  check('Dated line prints the SERVICE date (Jun 30), not the signing date (Jun 20)',
    datedLine === `Dated: ${formatNoticeDate('2026-06-30')}`, datedLine);
  check('Dated line does NOT print the old signing date (Jun 20)',
    !out.noticeText.includes(formatNoticeDate('2026-06-20')));
  // No-divergence invariant on the audit record.
  check('audit signing_date == date_of_service (no divergence)',
    out.variablesUsed.signing_date === out.variablesUsed.date_of_service);
  check('audit signing_date == serviceDate value', out.variablesUsed.signing_date === '2026-06-30');
  check('model.signature.datedFormatted == formatted serviceDate',
    out.model.signature.datedFormatted === formatNoticeDate('2026-06-30'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
