import {
  CA_JURISDICTION_MATRIX,
  CA_JURISDICTION_DEFAULT,
  type JurisdictionOverlayRow,
  type BranchState,
} from './caJurisdictionMatrix';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n1. Row count is exactly 32 (22 from §§2.1-2.22 + 10 from §2.23)');
{
  check('32 rows', CA_JURISDICTION_MATRIX.length === 32, `got ${CA_JURISDICTION_MATRIX.length}`);
}

console.log('\n2. Every jurisdictionId is unique and slug-shaped');
{
  const ids = CA_JURISDICTION_MATRIX.map((r) => r.jurisdictionId);
  const unique = new Set(ids);
  check('all ids unique', unique.size === ids.length, `${ids.length - unique.size} dupes`);
  const slugRe = /^[a-z0-9-]+$/;
  check('all ids slug-shaped', ids.every((id) => slugRe.test(id)),
    ids.filter((id) => !slugRe.test(id)).join(','));
}

console.log('\n3. Every branchState is a valid enum value');
{
  const valid: BranchState[] = ['LIVE', 'REQUIRED_BUT_PENDING', 'MONITOR'];
  const bad = CA_JURISDICTION_MATRIX.filter((r) => !valid.includes(r.branchState));
  check('all branchState valid', bad.length === 0,
    bad.map((r) => `${r.jurisdictionId}:${r.branchState}`).join(','));
}

console.log('\n4. The committed (jurisdictionId, displayName, branchState) tuple set');
{
  // Snapshot of the committed source at f46bebf. Drift here is a re-escalation
  // per Phase 1 ruling §5 item 6 (abort + re-transcribe from committed bytes).
  const expected: Array<[string, string, BranchState]> = [
    ['ca-los-angeles-city', 'City of Los Angeles', 'REQUIRED_BUT_PENDING'],
    ['ca-san-francisco-city-county', 'San Francisco (City and County of)', 'LIVE'],
    ['ca-san-jose-city', 'City of San Jose', 'REQUIRED_BUT_PENDING'],
    ['ca-mountain-view-city', 'Mountain View', 'REQUIRED_BUT_PENDING'],
    ['ca-richmond-city', 'City of Richmond', 'REQUIRED_BUT_PENDING'],
    ['ca-pasadena-city', 'City of Pasadena', 'REQUIRED_BUT_PENDING'],
    ['ca-inglewood-city', 'City of Inglewood', 'REQUIRED_BUT_PENDING'],
    ['ca-concord-city', 'City of Concord', 'REQUIRED_BUT_PENDING'],
    ['ca-east-palo-alto-city', 'City of East Palo Alto', 'REQUIRED_BUT_PENDING'],
    ['ca-hayward-city', 'City of Hayward', 'REQUIRED_BUT_PENDING'],
    ['ca-west-hollywood-city', 'City of West Hollywood', 'REQUIRED_BUT_PENDING'],
    ['ca-santa-monica-city', 'City of Santa Monica', 'LIVE'],
    ['ca-beverly-hills-city', 'City of Beverly Hills', 'LIVE'],
    ['ca-glendale-city', 'City of Glendale', 'LIVE'],
    ['ca-long-beach-city', 'City of Long Beach', 'LIVE'],
    ['ca-antioch-city', 'City of Antioch', 'LIVE'],
    ['ca-bell-gardens-city', 'City of Bell Gardens', 'LIVE'],
    ['ca-baldwin-park-city', 'City of Baldwin Park', 'REQUIRED_BUT_PENDING'],
    ['ca-healdsburg-city', 'City of Healdsburg', 'LIVE'],
    ['ca-sacramento-city', 'City of Sacramento', 'LIVE'],
    ['ca-berkeley-city', 'City of Berkeley', 'REQUIRED_BUT_PENDING'],
    ['ca-oakland-city', 'City of Oakland', 'REQUIRED_BUT_PENDING'],
    ['ca-default-statewide', 'Other CA (statewide-only default)', 'LIVE'],
    ['ca-culver-city', 'Culver City', 'LIVE'],
    ['ca-pomona-city', 'Pomona', 'LIVE'],
    ['ca-alameda-city', 'Alameda', 'LIVE'],
    ['ca-fremont-city', 'Fremont', 'LIVE'],
    ['ca-maywood-city', 'Maywood', 'LIVE'],
    ['ca-commerce-city', 'Commerce', 'LIVE'],
    ['ca-mountain-view-mhrso', 'Mountain View Mobile Home Rent Stabilization Ordinance (MHRSO)', 'LIVE'],
    ['ca-wheatland-city', 'Wheatland', 'LIVE'],
    ['altadena-unincorporated-la-county', 'Altadena (unincorporated LA County)', 'REQUIRED_BUT_PENDING'],
  ];
  check('tuple count matches', expected.length === CA_JURISDICTION_MATRIX.length,
    `expected ${expected.length}, matrix ${CA_JURISDICTION_MATRIX.length}`);
  let mismatch = '';
  expected.forEach(([id, name, state], i) => {
    const row = CA_JURISDICTION_MATRIX[i];
    if (!row || row.jurisdictionId !== id || row.displayName !== name || row.branchState !== state) {
      mismatch = `row ${i}: expected (${id}, ${name}, ${state}), got (${row?.jurisdictionId}, ${row?.displayName}, ${row?.branchState})`;
    }
  });
  check('every tuple matches committed source in order', mismatch === '', mismatch);
}

console.log('\n5. MV and MV-MHRSO are distinct rows with distinct slugs (ruling §2)');
{
  const mv = CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-mountain-view-city');
  const mhrso = CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-mountain-view-mhrso');
  check('Mountain View row present', Boolean(mv));
  check('MV-MHRSO row present', Boolean(mhrso));
  check('distinct slugs', mv?.jurisdictionId !== mhrso?.jurisdictionId);
}

console.log('\n6. §2.23 produces 10 rows (1 DEFAULT + 8 statewide-only + 1 Altadena)');
{
  const defaultRow = CA_JURISDICTION_MATRIX.filter((r) => r.jurisdictionId === 'ca-default-statewide');
  const pointsAtDefault = CA_JURISDICTION_MATRIX.filter((r) => r.pointsAtDefault === true);
  const altadena = CA_JURISDICTION_MATRIX.filter((r) => r.jurisdictionId === 'altadena-unincorporated-la-county');
  check('exactly 1 synthetic DEFAULT', defaultRow.length === 1);
  check('exactly 8 pointsAtDefault statewide-only', pointsAtDefault.length === 8, `got ${pointsAtDefault.length}`);
  check('Altadena present and pending', altadena.length === 1 && altadena[0].branchState === 'REQUIRED_BUT_PENDING');
  check('Altadena does NOT point at default', altadena[0]?.pointsAtDefault !== true);
}

console.log('\n7. CA_JURISDICTION_DEFAULT resolves to the synthetic row');
{
  check('DEFAULT export id', CA_JURISDICTION_DEFAULT.jurisdictionId === 'ca-default-statewide');
  check('DEFAULT is LIVE', CA_JURISDICTION_DEFAULT.branchState === 'LIVE');
  check('DEFAULT no supplemental filing', CA_JURISDICTION_DEFAULT.supplementalFilingRequired === false);
}

console.log('\n8. Verbatim-cell spot checks against committed source (drift sentinels)');
{
  function cell(id: string): JurisdictionOverlayRow {
    const r = CA_JURISDICTION_MATRIX.find((x) => x.jurisdictionId === id);
    if (!r) throw new Error(`missing row ${id}`);
    return r;
  }
  // Richmond: 2 business days, the tightest window — a high-signal verbatim check.
  check('Richmond postServiceFiling verbatim',
    cell('ca-richmond-city').postServiceFiling ===
      'File copy of **all** termination notices, **including 3-day notices to pay rent or quit and notices to perform covenant or quit**, with the Rent Board within **2 business days** of service. Proof of service with time and date must accompany');
  // SF: the nonpayment carve-out wording.
  check('SF postServiceFiling verbatim',
    cell('ca-san-francisco-city-county').postServiceFiling ===
      '**NOT required for 3-day pay-or-quit for nonpayment of rent.** SF Admin. Code § 37.9(c) explicitly excludes "three-day notices to pay rent or quit" from the Rent Board filing requirement that applies to other termination notices');
  // Santa Monica: LIVE but the carve-out language.
  check('Santa Monica postServiceFiling verbatim',
    cell('ca-santa-monica-city').postServiceFiling ===
      'File copy of termination notice with the Rent Control Board within **3 days** of service. **Does NOT apply to 3-day notices for nonpayment of rent.** Applies to other termination grounds');
}

console.log('\n9. supplementalFilingRequired derivation sanity (no-filing carve-outs are false)');
{
  const byId = (id: string) => CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === id)!;
  // Cities with an explicit carve-out / statewide-only => false.
  check('SF false (carve-out)', byId('ca-san-francisco-city-county').supplementalFilingRequired === false);
  check('Santa Monica false (carve-out)', byId('ca-santa-monica-city').supplementalFilingRequired === false);
  check('Sacramento false (statewide-only)', byId('ca-sacramento-city').supplementalFilingRequired === false);
  // Cities with an active filing duty => true.
  check('Richmond true (2-day duty)', byId('ca-richmond-city').supplementalFilingRequired === true);
  check('LA true (3-business-day duty)', byId('ca-los-angeles-city').supplementalFilingRequired === true);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
