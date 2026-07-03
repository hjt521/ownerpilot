// lib/produce/__tests__/artifactFilename.test.ts
// Lane W5 (omnibus §3.6) — unit tests for each transformation + a golden test against the founding Clifton
// Alexander filing suite (the retroactively-renamed compact filenames).

import { generateArtifactFilename } from '../artifactFilename';

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
  generateArtifactFilename({ ...CLIFTON, descriptor: '3Day_Notice', date: '2026-06-29', extension: 'pdf' }),
  '5537LaMirada-202-CliftonAlexander_3Day_Notice_2026-06-29.pdf');

// 2. Golden — founding filing suite (compact-named artifacts).
eq('golden: packet manifest',
  generateArtifactFilename({ ...CLIFTON, descriptor: 'Packet_Manifest', date: '2026-07-02', extension: 'md' }),
  '5537LaMirada-202-CliftonAlexander_Packet_Manifest_2026-07-02.md');
eq('golden: LAHD filing confirmation',
  generateArtifactFilename({ ...CLIFTON, descriptor: 'LAHD_Filing_Confirmation', date: '2026-07-02', extension: 'pdf' }),
  '5537LaMirada-202-CliftonAlexander_LAHD_Filing_Confirmation_2026-07-02.pdf');

// 3. No unit → street-tenant only.
eq('no unit',
  generateArtifactFilename({ property_address: '742 Evergreen Terrace', tenant_last_name: 'Simpson', tenant_first_name: 'Homer', descriptor: '3Day_Notice', date: '2026-06-01', extension: 'pdf' }),
  '742Evergreen-HomerSimpson_3Day_Notice_2026-06-01.pdf');

// 4. Corporate tenant (multi-word entity, no first name) → collapsed.
eq('corporate tenant collapses',
  generateArtifactFilename({ property_address: '100 Main St', tenant_last_name: 'Acme Holdings LLC', descriptor: 'Cover_Sheet', date: '2026-05-10', extension: 'pdf' }),
  '100Main-AcmeHoldingsLLC_Cover_Sheet_2026-05-10.pdf');

// 5. Multiple tenants → "<LastName>EtAl" (first name dropped).
eq('et al uses last name + EtAl',
  generateArtifactFilename({ ...CLIFTON, et_al: true, descriptor: '3Day_Notice', date: '2026-06-29', extension: 'pdf' }),
  '5537LaMirada-202-AlexanderEtAl_3Day_Notice_2026-06-29.pdf');

// 6. Timestamp date is truncated to ISO date; leading dot in extension tolerated.
eq('timestamp date truncated + dotted ext',
  generateArtifactFilename({ ...CLIFTON, descriptor: 'Filing_Confirmation', date: '2026-07-02T23:08:00Z', extension: '.pdf' }),
  '5537LaMirada-202-CliftonAlexander_Filing_Confirmation_2026-07-02.pdf');

// 7. Street with directional retained (only trailing suffix dropped).
eq('street keeps words, drops only trailing suffix',
  generateArtifactFilename({ property_address: '5245 W Santa Monica Blvd', unit_number: '320', tenant_last_name: 'Home', tenant_first_name: 'Nakia', descriptor: '3Day_Notice', date: '2026-04-30', extension: 'pdf' }),
  '5245WSantaMonica-320-NakiaHome_3Day_Notice_2026-04-30.pdf');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nartifact filename generator: all passed');
