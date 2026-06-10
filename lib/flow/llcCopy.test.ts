import {
  LLC_MGMT_FIELD_LABEL,
  LLC_MGMT_FIELD_HELPER,
  LLC_MGMT_OPTIONS,
  LLC_NOT_SURE_BANNER,
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

console.log('\n=== FIX 1 copy: placeholder pinning (these FAIL when real copy lands — update them then) ===');

console.log('\n1. Field label (real product copy) and helper (placeholder)');
{
  check('label', LLC_MGMT_FIELD_LABEL === 'How is this LLC managed?');
  check('helper is the pinned placeholder',
    LLC_MGMT_FIELD_HELPER === '[PLACEHOLDER \u2014 where to verify member- vs manager-managed. Final wording pending.]');
}

console.log('\n2. Management options: values, labels, helpers');
{
  check('three options', LLC_MGMT_OPTIONS.length === 3);
  check('opt 0 value', LLC_MGMT_OPTIONS[0].value === 'member-managed');
  check('opt 0 label', LLC_MGMT_OPTIONS[0].label === 'Member-managed');
  check('opt 0 helper pinned',
    LLC_MGMT_OPTIONS[0].helper === '[PLACEHOLDER \u2014 member-managed description. Pending.]');
  check('opt 1 value', LLC_MGMT_OPTIONS[1].value === 'manager-managed');
  check('opt 1 label', LLC_MGMT_OPTIONS[1].label === 'Manager-managed');
  check('opt 1 helper pinned',
    LLC_MGMT_OPTIONS[1].helper === '[PLACEHOLDER \u2014 manager-managed description. Pending.]');
  check('opt 2 value', LLC_MGMT_OPTIONS[2].value === 'not-sure');
  check('opt 2 label', LLC_MGMT_OPTIONS[2].label === "I'm not sure");
  check('opt 2 helper empty', LLC_MGMT_OPTIONS[2].helper === '');
}

console.log('\n3. Banner bodies pinned to placeholders');
{
  check('banner 1.3 pinned',
    LLC_NOT_SURE_BANNER === '[PLACEHOLDER \u2014 management-type-unconfirmed notice body. Final wording pending.]');
  check('banner 1.2 pinned',
    LLC_MANAGER_WARNING_BANNER === '[PLACEHOLDER \u2014 signer-authority warning body. Final wording pending.]');
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
