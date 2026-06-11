import {
  LLC_MGMT_FIELD_LABEL,
  LLC_MGMT_FIELD_HELPER,
  LLC_MGMT_OPTIONS,
  LLC_NOT_SURE_BANNER_TITLE,
  LLC_NOT_SURE_BANNER,
  LLC_MANAGER_WARNING_BANNER_TITLE,
  LLC_MANAGER_WARNING_BANNER,
  signerTitleLooksLikeManager,
  shouldShowSignerAuthorityWarning,
} from './llcCopy';
import type { NoticeFlowData } from './noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

// LOCKED WORDING (supplied verbatim 2026-06-10; source noted as Broker
// Compliance Review). These pins are exact-equality on purpose: any edit,
// re-wrap, or paraphrase of the shipped copy fails the suite. The banner
// constants are split TITLE/BODY only so the UI can bold the title; the
// FULL strings below are the locked verbatim prose and the concatenation
// must reproduce them byte-for-byte.

const LOCKED_FIELD_HELPER =
  `Check your Operating Agreement, or the Statement of Information (Form LLC-12) on file with the California Secretary of State. If you can't find either, choose "I'm not sure" and we'll flag it.`;
const LOCKED_MEMBER_HELPER = 'Any member can sign on behalf of the LLC.';
const LOCKED_MANAGER_HELPER =
  "Only designated managers can sign on behalf of the LLC. Members who aren't managers generally can't.";
const LOCKED_NOT_SURE_FULL =
  "Heads up: Member-managed and manager-managed LLCs have different signing-authority rules, and using the wrong one can create a defect in the notice. Before serving, confirm the management type by checking your Operating Agreement or your Statement of Information (Form LLC-12) on file with the California Secretary of State. If you can't determine it, consult a California licensed attorney of your choosing before serving.";
const LOCKED_MANAGER_WARNING_FULL =
  `Heads up — signer authority check: You've indicated this LLC is manager-managed, but the signer's title doesn't appear to be a manager role. In a manager-managed LLC, members who aren't managers generally can't sign notices that bind the entity, and a notice signed by an unauthorized person can be challenged in an unlawful-detainer action. Before continuing, confirm against your Operating Agreement or your Statement of Information (Form LLC-12) that this signer has authority to bind the LLC. If the signer is a manager, update the "Signer's capacity / title" field above (e.g., "manager" or "managing member"). If you're not sure, consult a California licensed attorney of your choosing before serving.`;

console.log('\n=== FIX 1 copy: locked wording pins (2026-06-10) ===');

console.log('\n1. Field label and helper');
{
  check('label', LLC_MGMT_FIELD_LABEL === 'How is this LLC managed?');
  check('helper locked', LLC_MGMT_FIELD_HELPER === LOCKED_FIELD_HELPER);
}

console.log('\n2. Management options: values, labels, helpers');
{
  check('three options', LLC_MGMT_OPTIONS.length === 3);
  check('opt 0 value', LLC_MGMT_OPTIONS[0].value === 'member-managed');
  check('opt 0 label', LLC_MGMT_OPTIONS[0].label === 'Member-managed');
  check('opt 0 helper locked', LLC_MGMT_OPTIONS[0].helper === LOCKED_MEMBER_HELPER);
  check('opt 1 value', LLC_MGMT_OPTIONS[1].value === 'manager-managed');
  check('opt 1 label', LLC_MGMT_OPTIONS[1].label === 'Manager-managed');
  check('opt 1 helper locked', LLC_MGMT_OPTIONS[1].helper === LOCKED_MANAGER_HELPER);
  check('opt 2 value', LLC_MGMT_OPTIONS[2].value === 'not-sure');
  check('opt 2 label', LLC_MGMT_OPTIONS[2].label === "I'm not sure");
  check('opt 2 helper empty', LLC_MGMT_OPTIONS[2].helper === '');
}

console.log('\n3. Banner prose: TITLE + " " + BODY reproduces the locked verbatim string');
{
  check('banner 1.3 title', LLC_NOT_SURE_BANNER_TITLE === 'Heads up:');
  check('banner 1.3 full prose locked',
    `${LLC_NOT_SURE_BANNER_TITLE} ${LLC_NOT_SURE_BANNER}` === LOCKED_NOT_SURE_FULL);
  check('banner 1.2 title', LLC_MANAGER_WARNING_BANNER_TITLE === 'Heads up \u2014 signer authority check:');
  check('banner 1.2 full prose locked',
    `${LLC_MANAGER_WARNING_BANNER_TITLE} ${LLC_MANAGER_WARNING_BANNER}` === LOCKED_MANAGER_WARNING_FULL);
}

console.log('\n=== signerTitleLooksLikeManager ===');

console.log('\n4. Manager-like titles match');
{
  check('"Manager"', signerTitleLooksLikeManager('Manager') === true);
  check('"manager" lowercase', signerTitleLooksLikeManager('manager') === true);
  check('"Managing Member"', signerTitleLooksLikeManager('Managing Member') === true);
  check('"managing  member" (double space)', signerTitleLooksLikeManager('managing  member') === true);
  check('"Property Manager"', signerTitleLooksLikeManager('Property Manager') === true);
}

console.log('\n5. Non-manager titles do not match');
{
  check('"member"', signerTitleLooksLikeManager('member') === false);
  check('"Member"', signerTitleLooksLikeManager('Member') === false);
  check('"President"', signerTitleLooksLikeManager('President') === false);
  check('empty string', signerTitleLooksLikeManager('') === false);
  check('undefined', signerTitleLooksLikeManager(undefined) === false);
}

console.log('\n=== shouldShowSignerAuthorityWarning (Banner 1.2 trigger) ===');

type Slice = Pick<NoticeFlowData, 'landlordIdentity' | 'signerCapacity' | 'signerTitle'>;

function warnSlice(over: Partial<Slice> = {}): Slice {
  return {
    landlordIdentity: {
      type: 'entity',
      entityLegalName: 'PTAG Properties, LLC',
      entityType: 'llc',
      managementType: 'manager-managed',
    },
    signerCapacity: 'officer_member_trustee',
    signerTitle: 'member',
    ...over,
  };
}

console.log('\n6. Fires: manager-managed LLC + insider capacity + non-manager title');
{
  check('title "member"', shouldShowSignerAuthorityWarning(warnSlice()) === true);
  check('title undefined', shouldShowSignerAuthorityWarning(warnSlice({ signerTitle: undefined })) === true);
  check('title "President"', shouldShowSignerAuthorityWarning(warnSlice({ signerTitle: 'President' })) === true);
}

console.log('\n7. Clears when the title looks like a manager role');
{
  check('"managing member"', shouldShowSignerAuthorityWarning(warnSlice({ signerTitle: 'managing member' })) === false);
  check('"Manager"', shouldShowSignerAuthorityWarning(warnSlice({ signerTitle: 'Manager' })) === false);
}

console.log('\n8. Does not fire outside the manager-managed-LLC-insider case');
{
  check('member-managed LLC', shouldShowSignerAuthorityWarning(warnSlice({
    landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Properties, LLC', entityType: 'llc', managementType: 'member-managed' },
  })) === false);
  check('"not-sure" LLC', shouldShowSignerAuthorityWarning(warnSlice({
    landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Properties, LLC', entityType: 'llc', managementType: 'not-sure' },
  })) === false);
  check('non-LLC entity', shouldShowSignerAuthorityWarning(warnSlice({
    landlordIdentity: { type: 'entity', entityLegalName: 'PTAG Holdings, Inc.', entityType: 'corporation' },
  })) === false);
  check('individual landlord', shouldShowSignerAuthorityWarning(warnSlice({
    landlordIdentity: { type: 'individual', names: ['Owner Name'] },
  })) === false);
  check('broker/manager capacity', shouldShowSignerAuthorityWarning(warnSlice({
    signerCapacity: 'broker_or_manager',
  })) === false);
  check('no identity at all', shouldShowSignerAuthorityWarning({
    landlordIdentity: undefined,
    signerCapacity: 'officer_member_trustee',
    signerTitle: 'member',
  }) === false);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
