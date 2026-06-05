/**
 * Defect #2 sign-off packet generator (attorney ruling 2026-06-05 §4).
 * Emits five rendered samples + the new build-locked constants + an audit dump.
 * Not part of the suite; run with: npx tsx scripts/defect2_signoff_packet.ts
 */
import {
  renderNotice,
  derivePayeeName,
  NOTICE_PROSE,
  type ComputedNoticeDates,
} from '../lib/produce/renderNotice';
import type { NoticeFlowData } from '../lib/flow/noticeFlowState';

const dates: ComputedNoticeDates = {
  compliancePeriodStartDate: '2026-06-02',
  compliancePeriodEndDate: '2026-06-04',
};

function base(over: Partial<NoticeFlowData>): NoticeFlowData {
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
    signerName: 'Maria Lopez',
    signerCapacity: 'owner',
    signingDate: '2026-06-01',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    ...over,
  } as NoticeFlowData;
}
function individual(names: string[]): Partial<NoticeFlowData> {
  return { landlordIdentity: { type: 'individual', names }, landlordIdentityConfirmed: true };
}

const samples: { n: number; title: string; data: NoticeFlowData; rendersFully: boolean }[] = [
  { n: 1, title: 'Override OFF + 1 individual owner', rendersFully: true,
    data: base(individual(['Maria Lopez'])) },
  { n: 2, title: 'Override OFF + 2 individual owners', rendersFully: true,
    data: base(individual(['Maria Lopez', 'Daniel Lopez'])) },
  { n: 3, title: 'Override OFF + 3 individual owners', rendersFully: true,
    data: base(individual(['Maria Lopez', 'Daniel Lopez', 'Sofia Lopez'])) },
  { n: 4, title: 'Override ON + individual landlord', rendersFully: true,
    data: base({ ...individual(['Maria Lopez', 'Daniel Lopez']),
      payeeIsNonLandlord: true, payeeOverrideName: 'Westside Property Management, Inc.' }) },
  { n: 5, title: 'Override ON + entity landlord', rendersFully: false,
    data: base({
      landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Properties, LLC', entityType: 'llc' },
      landlordIdentityConfirmed: true, signerCapacity: 'officer_member_trustee', signerTitle: 'Managing Member',
      payeeIsNonLandlord: true, payeeOverrideName: 'Westside Property Management, Inc.' }) },
];

const out: string[] = [];
out.push('# Defect #2 — Payee Derivation: sign-off packet');
out.push('');
out.push('_Generated ' + new Date().toISOString().slice(0, 10) + ' from the build sandbox. ' +
  'Five rendered samples + new build-locked constants + audit dump, per ruling §4. ' +
  'Build-lock attaches on countersign._');
out.push('');
out.push('---');
out.push('## 1. New build-locked FACE constants (renderNotice.ts → NOTICE_PROSE)');
out.push('Exact values (JSON-quoted to show whitespace):');
out.push('');
out.push('| Constant | Value |');
out.push('|---|---|');
const faceConstants: [string, string][] = [
  ['payableToLabel', NOTICE_PROSE.payableToLabel],
  ['payeeOverrideAsAgentJoiner', NOTICE_PROSE.payeeOverrideAsAgentJoiner],
  ['ownerLineTwoJoiner', NOTICE_PROSE.ownerLineTwoJoiner],
  ['ownerLineSerialComma', NOTICE_PROSE.ownerLineSerialComma],
  ['ownerLineOxfordTerminator', NOTICE_PROSE.ownerLineOxfordTerminator],
];
for (const [k, v] of faceConstants) {
  out.push(`| \`${k}\` | \`${JSON.stringify(v)}\` |`);
}
out.push('');
out.push('> FLAG: `payableToLabel` ships as `"Payable to"` with the `": "` added inline at render, ' +
  'so the rendered face reads `Payable to: <name>` — byte-identical to the ruling §1.3 value ' +
  '`"Payable to: "`. Kept as-is (representation detail, not a face-text change). Confirm acceptable.');
out.push('');
out.push('## 2. New build-locked OPERATOR constants (Step-4 UI — verbatim from ruling §3)');
out.push('Pending the Step-4 UI cutover (held on the helper flag); recorded here for countersign.');
out.push('');
out.push('- **Checkbox label (§3.1):** Rent is paid to someone other than the landlord (e.g., a property manager or agent).');
out.push('- **Checked helper (§3.2):** Enter the name of the person or company that receives rent. The notice will show that they are acting as agent for the landlord identified on Step 3.');
out.push('- **Unchecked helper (§3.3):** Leave this unchecked if rent is paid directly to the landlord. The payee name on the notice will match the landlord identified on Step 3.');
out.push('');
out.push('---');
out.push('## 3. Rendered samples');

const auditRows: string[] = ['| # | scenario | payee_name_source | landlord_type | rendered "Payable to:" line |', '|---|---|---|---|---|'];

for (const s of samples) {
  out.push('');
  out.push(`### Sample ${s.n} — ${s.title}`);
  const derived = derivePayeeName(s.data);
  if (s.rendersFully) {
    const r = renderNotice({ data: s.data, dates });
    const payLine = r.noticeText.split('\n').find((l) => l.startsWith('Payable to')) ?? '(none)';
    out.push('');
    out.push('Payee line on the face:');
    out.push('```');
    out.push(payLine);
    out.push('```');
    out.push('Audit variables:');
    out.push('```');
    out.push(`payee_name        = ${r.variablesUsed.payee_name}`);
    out.push(`payee_name_source = ${r.variablesUsed.payee_name_source}`);
    out.push(`landlord_type     = ${r.variablesUsed.landlord_type || '(individual)'}`);
    out.push(`signer_capacity   = ${r.variablesUsed.signer_capacity || '(legacy owner)'}`);
    out.push('```');
    auditRows.push(`| ${s.n} | ${s.title} | ${r.variablesUsed.payee_name_source} | ${r.variablesUsed.landlord_type || 'individual'} | \`${payLine}\` |`);
  } else {
    // Entity full-notice production is gated (ENTITY_LANDLORD_NOT_SUPPORTED) and the
    // entity signature block is Defect #3 (not built), so the FULL render is not
    // produced here. The payee-line composition is shown via derivePayeeName.
    out.push('');
    out.push('Composed payee line (full-notice render gated — entity production is `ENTITY_LANDLORD_NOT_SUPPORTED`; entity signature block is Defect #3):');
    out.push('```');
    out.push(`Payable to: ${derived.name}`);
    out.push('```');
    out.push('Audit:');
    out.push('```');
    out.push(`payee_name        = ${derived.name}`);
    out.push(`payee_name_source = ${derived.nameSource}`);
    out.push(`landlord_type     = entity`);
    out.push('```');
    auditRows.push(`| ${s.n} | ${s.title} | ${derived.nameSource} | entity | \`Payable to: ${derived.name}\` |`);
  }
}

out.push('');
out.push('---');
out.push('## 4. Audit dump (which branch fired + nameSource)');
out.push('');
out.push(...auditRows);
out.push('');
out.push('— Build side · derivation locked pending countersign');

console.log(out.join('\n'));
