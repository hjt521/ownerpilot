/**
 * Defect #3 sign-off packet generator — entity signature block.
 * Renders the attorney Part-D-style packet: two sample entity notices + the
 * (PROPOSED) signature-block constants + the audit dump, for countersign.
 * Not part of the suite. Run: npx tsx scripts/defect3_signoff_packet.ts
 *
 * IMPORTANT: entity PRODUCTION remains gated (ENTITY_LANDLORD_NOT_SUPPORTED) and
 * is NOT lifted by anything in this packet. The renderer can COMPOSE the entity
 * block; the gate lifts only on attorney countersign of the prose below.
 */
import {
  renderNotice,
  NOTICE_PROSE,
  type ComputedNoticeDates,
} from '../lib/produce/renderNotice';
import type { NoticeFlowData } from '../lib/flow/noticeFlowState';

const dates: ComputedNoticeDates = {
  compliancePeriodStartDate: '2026-06-02',
  compliancePeriodEndDate: '2026-06-04',
};

function entity(over: Partial<NoticeFlowData>): NoticeFlowData {
  return {
    dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCounty: 'Fresno',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2000 }],
    baseRentOnlyConfirmed: true,
    paymentMethods: [],
    landlordContact: { phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' },
    paymentBranch: 'mail_only',
    landlordIdentityConfirmed: true,
    signingDate: '2026-06-01',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    ...over,
  } as NoticeFlowData;
}

const samples = [
  {
    title: 'Sample A — LLC, signer = Managing Member',
    data: entity({
      landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Properties, LLC', entityType: 'llc' },
      signerName: 'Daniel Lopez', signerCapacity: 'officer_member_trustee', signerTitle: 'Managing Member',
    }),
  },
  {
    title: 'Sample B — Corporation, signer = President',
    data: entity({
      landlordIdentity: { type: 'entity', entityLegalName: 'Maria Holdings, Inc.', entityType: 'corporation' },
      signerName: 'Maria Lopez', signerCapacity: 'officer_member_trustee', signerTitle: 'President',
    }),
  },
];

const out: string[] = [];
out.push('# Defect #3 — Entity Signature Block: Part-D countersign packet');
out.push('');
out.push('_Generated ' + new Date().toISOString().slice(0, 10) + ' from the build sandbox._');
out.push('');
out.push('> **Entity production is NOT cleared by this packet.** The produce gate still');
out.push('> blocks every entity notice (`ENTITY_LANDLORD_NOT_SUPPORTED`). The renderer can now');
out.push('> COMPOSE the entity signature block (so you can review it); the gate lifts and the');
out.push('> derived `signerRole` is removed only on your countersign of the prose below.');
out.push('');
out.push('## 1. Signature-block layout (handoff §5.A.2): `[Entity] / By: [name], [title] / Dated:`');
out.push('');
out.push('Rendered structure (after the "Dated:" line and signature rule):');
out.push('```');
out.push('Dated: [signing date]');
out.push('');
out.push('_______________________________________');
out.push('[Entity legal name]');
out.push(`${NOTICE_PROSE.entitySignatureByLabel} [signer name]${NOTICE_PROSE.entitySignerTitleJoiner}[signer title]`);
out.push('```');
out.push('');
out.push('## 2. Constants in this block — TWO proposed, ONE owed to you');
out.push('');
out.push('| Constant | Value | Status |');
out.push('|---|---|---|');
out.push(`| \`entitySignatureByLabel\` | \`${JSON.stringify(NOTICE_PROSE.entitySignatureByLabel)}\` | **PROPOSED** (structural label) — confirm verbatim |`);
out.push(`| \`entitySignerTitleJoiner\` | \`${JSON.stringify(NOTICE_PROSE.entitySignerTitleJoiner)}\` | **PROPOSED** (structural joiner) — confirm verbatim |`);
out.push('| _(third constant)_ | _(blank — not authored on the build side)_ | **OWED FROM YOU** |');
out.push('');
out.push('The handoff records that you specified **three** locked constants for this block.');
out.push('Only the two structural strings above are unambiguous from the layout, and the build');
out.push('side did not invent the third (it would be substantive legal text — e.g. an entity-type');
out.push('descriptor like "a California limited liability company", or a capacity/authority');
out.push('caption). Please supply the third **verbatim** (or confirm only the two are needed), and');
out.push('redline the two proposed strings if they should read differently. If you already');
out.push('specified all three in a prior ruling, send that text and the build side will transcribe');
out.push('it exactly — these proposals are only to give you something concrete to react to.');
out.push('');
out.push('## 3. Two rendered samples');

const auditRows: string[] = ['| sample | landlord_type | signer_capacity | signer_title | payee_name_source |', '|---|---|---|---|---|'];

for (const s of samples) {
  const r = renderNotice({ data: s.data, dates });
  out.push('');
  out.push(`### ${s.title}`);
  out.push('');
  out.push('Signature block (tail of the notice face):');
  out.push('```');
  out.push(r.noticeText.split('\n').slice(-5).join('\n'));
  out.push('```');
  out.push('Payee line (Defect #2 derivation — entity legal name):');
  out.push('```');
  out.push(r.noticeText.split('\n').find((l) => l.startsWith('Payable to')) ?? '(none)');
  out.push('```');
  auditRows.push(`| ${s.title.split(' — ')[0]} | ${r.variablesUsed.landlord_type} | ${r.variablesUsed.signer_capacity} | ${r.variablesUsed.signer_title} | ${r.variablesUsed.payee_name_source} |`);
}

out.push('');
out.push('## 4. Audit dump');
out.push('');
out.push(...auditRows);
out.push('');
out.push('## 5. On countersign');
out.push('');
out.push('- Replace/confirm the two PROPOSED constants + add the third (verbatim).');
out.push('- Lift `ENTITY_LANDLORD_NOT_SUPPORTED` in gates.ts (entity production opens).');
out.push('- Remove the derived `signerRole` (now unused on the entity face) and update');
out.push('  `landlord.fixture.ts` once, per the handoff.');
out.push('- Note: the styled-HTML renderer (buildNoticeHtml) entity layout is a small');
out.push('  follow-up — it arranges the SAME locked prose the text face uses.');
out.push('');
out.push('— Build side · entity signature block composed; prose + gate-lift pending your countersign');

console.log(out.join('\n'));
