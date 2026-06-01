import { detectJurisdiction, HARD_BLOCK_CITIES } from './detectJurisdiction';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n1. Each hard-block city blocks');
{
  for (const city of HARD_BLOCK_CITIES) {
    const r = detectJurisdiction({ address: `123 Main St, ${city}, CA 90000` });
    check(`${city} -> BLOCK_OVERLAY_CITY`, r.decision === 'BLOCK_OVERLAY_CITY' && r.matchedCity === city,
      `got ${r.decision}/${r.matchedCity}`);
  }
}

console.log('\n2. LA-ish address routes to NEEDS_CONFIRMATION (never silent proceed)');
{
  const r = detectJurisdiction({ address: '456 Spring St, Los Angeles, CA 90013' });
  check('NEEDS_CONFIRMATION', r.decision === 'NEEDS_CONFIRMATION', r.decision);
  check('requires confirmation', r.requiresAuthoritativeConfirmation === true);
  check('not a confident proceed', r.decision !== 'NO_KNOWN_OVERLAY');
}

console.log('\n3. SAFETY: West Hollywood in an LA-ish context blocks (not swept into LA confirm)');
{
  // WeHo sits amid LA ZIPs; the hard-block check must win over the LA-ish heuristic.
  const r = detectJurisdiction({ address: '8000 Sunset Blvd, West Hollywood, Los Angeles County, CA 90046' });
  check('blocks as West Hollywood', r.decision === 'BLOCK_OVERLAY_CITY' && r.matchedCity === 'West Hollywood',
    `got ${r.decision}/${r.matchedCity}`);
}

console.log('\n4. SAFETY: Santa Monica with "Los Angeles County" still blocks as Santa Monica');
{
  const r = detectJurisdiction({ address: '100 Ocean Ave, Santa Monica, Los Angeles County, CA 90401' });
  check('blocks as Santa Monica', r.decision === 'BLOCK_OVERLAY_CITY' && r.matchedCity === 'Santa Monica',
    `got ${r.decision}/${r.matchedCity}`);
}

console.log('\n5. Structured city field is honored');
{
  const r = detectJurisdiction({ address: '1 Market St', city: 'San Francisco' });
  check('SF via city field', r.decision === 'BLOCK_OVERLAY_CITY' && r.matchedCity === 'San Francisco');
}

console.log('\n6. "LA" abbreviation triggers confirmation');
{
  const r = detectJurisdiction({ address: '789 Foo Ave, LA, CA 90001' });
  check('LA abbrev -> NEEDS_CONFIRMATION', r.decision === 'NEEDS_CONFIRMATION', r.decision);
}

console.log('\n7. Clearly-elsewhere address -> NO_KNOWN_OVERLAY (the only silent-proceed path)');
{
  const r = detectJurisdiction({ address: '12 Almond Ln, Fresno, CA 93650' });
  check('NO_KNOWN_OVERLAY', r.decision === 'NO_KNOWN_OVERLAY', r.decision);
  check('does not require confirmation', r.requiresAuthoritativeConfirmation === false);
}

console.log('\n8. Case-insensitive matching');
{
  const r = detectJurisdiction({ address: '1 main st, oakland, ca 94601' });
  check('lowercase oakland blocks', r.decision === 'BLOCK_OVERLAY_CITY' && r.matchedCity === 'Oakland');
}

console.log('\n9. Every non-clean decision flags requiresAuthoritativeConfirmation');
{
  const block = detectJurisdiction({ address: 'x, Berkeley, CA' });
  const confirm = detectJurisdiction({ address: 'x, Los Angeles, CA' });
  check('block requires confirmation', block.requiresAuthoritativeConfirmation === true);
  check('confirm requires confirmation', confirm.requiresAuthoritativeConfirmation === true);
}

console.log('\n10. Block and confirm decisions carry a user-facing message');
{
  const block = detectJurisdiction({ address: 'x, San Jose, CA' });
  const confirm = detectJurisdiction({ address: 'x, Los Angeles, CA' });
  check('block has message', block.message.length > 0 && block.message.includes('San Jose'));
  check('confirm has message', confirm.message.length > 0);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
