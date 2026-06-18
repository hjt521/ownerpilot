import { buildNoticePdfFilename } from './noticePdfFilename';

let passed = 0;
const failures: string[] = [];
function check(label: string, cond: boolean) {
  if (cond) passed++;
  else failures.push(label);
}
function eq(label: string, got: string, want: string) {
  check(`${label} (got "${got}")`, got === want);
}

const DATE = '2026-06-18';

eq('no unit',
  buildNoticePdfFilename({ tenantNames: ['Jason Short'], streetAddress: '1045 Sierra Star Pkwy', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jason-Short_1045-Sierra-Star-Pkwy_2026-06-18.pdf');

eq('bare unit -> Unit-3',
  buildNoticePdfFilename({ tenantNames: ['Jason Short'], streetAddress: '1045 Sierra Star Pkwy', unit: '3', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jason-Short_1045-Sierra-Star-Pkwy_Unit-3_2026-06-18.pdf');

eq('apt label',
  buildNoticePdfFilename({ tenantNames: ['Jason Short'], streetAddress: '1045 Sierra Star Pkwy', unit: 'Apt 320', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jason-Short_1045-Sierra-Star-Pkwy_Apt-320_2026-06-18.pdf');

eq('suite label',
  buildNoticePdfFilename({ tenantNames: ['Jason Short'], streetAddress: '1045 Sierra Star Pkwy', unit: 'Suite 2B', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jason-Short_1045-Sierra-Star-Pkwy_Suite-2B_2026-06-18.pdf');

eq('multiple tenants -> Et-Al',
  buildNoticePdfFilename({ tenantNames: ['Jason Short', 'Maria Lopez'], streetAddress: '1045 Sierra Star Pkwy', unit: '3', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jason-Short-Et-Al_1045-Sierra-Star-Pkwy_Unit-3_2026-06-18.pdf');

eq('drops city/state/zip (comma-split)',
  buildNoticePdfFilename({ tenantNames: ['Alex Tenant'], streetAddress: '123 Main St, Glendale, CA 91201', date: DATE }),
  'OwnerPilot_3-Day-Notice_Alex-Tenant_123-Main-St_2026-06-18.pdf');

eq('apostrophe stripped',
  buildNoticePdfFilename({ tenantNames: ["Sean O'Brien"], streetAddress: '7 St. Charles Ave', date: DATE }),
  'OwnerPilot_3-Day-Notice_Sean-OBrien_7-St-Charles-Ave_2026-06-18.pdf');

eq('hash unit -> Unit',
  buildNoticePdfFilename({ tenantNames: ['Jane Doe'], streetAddress: '5 Oak Rd', unit: '#12', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jane-Doe_5-Oak-Rd_Unit-12_2026-06-18.pdf');

eq('missing tenant -> Tenant',
  buildNoticePdfFilename({ tenantNames: [], streetAddress: '5 Oak Rd', date: DATE }),
  'OwnerPilot_3-Day-Notice_Tenant_5-Oak-Rd_2026-06-18.pdf');

eq('missing address -> Property',
  buildNoticePdfFilename({ tenantNames: ['Jane Doe'], streetAddress: '', date: DATE }),
  'OwnerPilot_3-Day-Notice_Jane-Doe_Property_2026-06-18.pdf');

const todayName = buildNoticePdfFilename({ tenantNames: ['Jane Doe'], streetAddress: '5 Oak Rd' });
check('missing date -> today (YYYY-MM-DD)', /_\d{4}-\d{2}-\d{2}\.pdf$/.test(todayName));

check('no city/state/zip leaked',
  !/Glendale|CA|91201/.test(
    buildNoticePdfFilename({ tenantNames: ['Alex Tenant'], streetAddress: '123 Main St, Glendale, CA 91201', date: DATE }),
  ));

check('sanitized: no spaces/commas/periods (except .pdf)',
  (() => {
    const n = buildNoticePdfFilename({ tenantNames: ['Jason  Short, Jr.'], streetAddress: '1045 Sierra Star Pkwy.', unit: 'Apt 320', date: DATE });
    return /^[A-Za-z0-9_-]+\.pdf$/.test(n) && !n.includes('--');
  })());

check('reasonable length (<120)',
  buildNoticePdfFilename({
    tenantNames: ['Bartholomew Featherstonehaugh', 'Someone Else'],
    streetAddress: '12345 Very Long Boulevard Of Broken Dreams Extension Road',
    unit: 'Suite 9999', date: DATE,
  }).length < 120);

if (failures.length) {
  console.error(`noticePdfFilename.test.ts: ${failures.length} FAILED`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`noticePdfFilename.test.ts: all ${passed} checks passed`);
