// lib/produce/__tests__/artifactFilename.test.ts
// Lane W5 (omnibus §3.6) — unit tests for each transformation + a golden test against the founding Clifton
// Alexander filing suite (the retroactively-renamed compact filenames).

import { generateBrokerFilingFilename, generateOwnerDownloadFilename } from '../artifactFilename';

let failed = 0;
function eq(name: string, got: string, want: string) {
  if (got !== want) { failed++; console.error(`FAIL: ${name}\n   got:  ${got}\n   want: ${want}`); }
  else console.log('ok -', name);
}

const CLIFTON = {
  property_address: '5537 La Mirada Ave, Apt 202, Los Angeles CA 90029',
  unit_number: '202',
  tenant_first_name: 'Clifton',
  tenant_last_name: 'Alexander',
};

// 1. Compact street: number + street name, suffix ("Ave") dropped, spaces removed.
eq('compact street drops suffix',
  generateBrokerFilingFilename({ ...CLIFTON, descriptor: '3Day_Notice', date: '2026-06-29', extension: 'pdf' }),
  '5537LaMirada-202-CliftonAlexander_3Day_Notice_2026-06-29.pdf');

// 2. Golden — founding filing suite (compact-named artifacts).
eq('golden: packet manifest',
  generateBrokerFilingFilename({ ...CLIFTON, descriptor: 'Packet_Manifest', date: '2026-07-02', extension: 'md' }),
  '5537LaMirada-202-CliftonAlexander_Packet_Manifest_2026-07-02.md');
eq('golden: LAHD filing confirmation',
  generateBrokerFilingFilename({ ...CLIFTON, descriptor: 'LAHD_Filing_Confirmation', date: '2026-07-02', extension: 'pdf' }),
  '5537LaMirada-202-CliftonAlexander_LAHD_Filing_Confirmation_2026-07-02.pdf');

// 3. No unit → street-tenant only.
eq('no unit',
  generateBrokerFilingFilename({ property_address: '742 Evergreen Terrace', tenant_last_name: 'Simpson', tenant_first_name: 'Homer', descriptor: '3Day_Notice', date: '2026-06-01', extension: 'pdf' }),
  '742Evergreen-HomerSimpson_3Day_Notice_2026-06-01.pdf');

// 4. Corporate tenant (multi-word entity, no first name) → collapsed.
eq('corporate tenant collapses',
  generateBrokerFilingFilename({ property_address: '100 Main St', tenant_last_name: 'Acme Holdings LLC', descriptor: 'Cover_Sheet', date: '2026-05-10', extension: 'pdf' }),
  '100Main-AcmeHoldingsLLC_Cover_Sheet_2026-05-10.pdf');

// 5. Multiple tenants → "<LastName>EtAl" (first name dropped).
eq('et al uses last name + EtAl',
  generateBrokerFilingFilename({ ...CLIFTON, et_al: true, descriptor: '3Day_Notice', date: '2026-06-29', extension: 'pdf' }),
  '5537LaMirada-202-AlexanderEtAl_3Day_Notice_2026-06-29.pdf');

// 6. Timestamp date is truncated to ISO date; leading dot in extension tolerated.
eq('timestamp date truncated + dotted ext',
  generateBrokerFilingFilename({ ...CLIFTON, descriptor: 'Filing_Confirmation', date: '2026-07-02T23:08:00Z', extension: '.pdf' }),
  '5537LaMirada-202-CliftonAlexander_Filing_Confirmation_2026-07-02.pdf');

// 7. Street with directional retained (only trailing suffix dropped).
eq('street keeps words, drops only trailing suffix',
  generateBrokerFilingFilename({ property_address: '5245 W Santa Monica Blvd', unit_number: '320', tenant_last_name: 'Home', tenant_first_name: 'Nakia', descriptor: '3Day_Notice', date: '2026-04-30', extension: 'pdf' }),
  '5245WSantaMonica-320-NakiaHome_3Day_Notice_2026-04-30.pdf');

// 8. Anti-over-sweep guard (§3.6): the owner-facing generator (Convention B) keeps the OwnerPilot_ prefix and is
//    NOT swept to Convention A. This guards against a caller-sweep accidentally changing the owner download name.
{
  const ownerName = generateOwnerDownloadFilename({
    tenantNames: ['Clifton Alexander'],
    streetAddress: '5537 La Mirada Ave, Los Angeles CA 90029',
    unit: '202',
    date: '2026-06-29',
  });
  if (!ownerName.startsWith('OwnerPilot_3-Day-Notice_')) {
    failed++; console.error(`FAIL: owner download keeps OwnerPilot_ prefix\n   got: ${ownerName}`);
  } else console.log('ok - owner download keeps Convention B (OwnerPilot_ prefix)');
  if (ownerName.startsWith('5537LaMirada')) {
    failed++; console.error('FAIL: owner download must NOT be swept to Convention A');
  } else console.log('ok - owner download not swept to Convention A');
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nartifact filename generator: all passed');
