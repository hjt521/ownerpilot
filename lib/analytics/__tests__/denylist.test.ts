// lib/analytics/__tests__/denylist.test.ts
// Lane 6 Analytics §Q — denylist rejects all 14 denied keys + email-shaped values (master prompt §7.1).

import { enforceDenylist } from '../denylist';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}
function rejects(params: Record<string, unknown>): boolean {
  try { enforceDenylist(params); return false; } catch { return true; }
}

const DENIED = [
  'address', 'address_raw', 'address_normalized', 'tenant_name', 'landlord_name',
  'email', 'requester_contact', 'phone', 'payee_account_number',
  'magic_link_token', 'requester_token', 'free_text', 'field_value',
  'ip', 'ip_address', 'user_agent_full',
];
for (const k of DENIED) check(`rejects denied key "${k}"`, rejects({ [k]: 'x' }));

check('rejects email-shaped value in an allowed key', rejects({ note: 'reach me at a@b.com' }));
check('allows clean enumerated params', !rejects({ refusal_enum: 'legal_advice', had_email: true }));
check('allows empty params', !rejects({}));
check('allows numeric param', !rejects({ resolution_minutes_from_submit: 42 }));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\ndenylist: all passed');
