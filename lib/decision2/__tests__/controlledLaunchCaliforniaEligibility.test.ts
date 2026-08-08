import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const eligibility = read('lib/jurisdiction/californiaEligibility.ts');
const gates = read('lib/flow/gates.ts');
const places = read('components/places-autocomplete.tsx');
const serveTrack = read('components/serve-track.tsx');
const packetPrint = read('components/packet-print-options.tsx');

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n=== Controlled-launch California eligibility boundary ===\n');

check(
  'eligibility contract contains exactly the three authorized statuses',
  eligibility.includes("'CONFIRMED_CALIFORNIA'") &&
    eligibility.includes("'NON_CALIFORNIA'") &&
    eligibility.includes("'UNKNOWN'"),
);
check(
  'eligibility module is independent of overlay classifier',
  !eligibility.includes('detectJurisdiction') && !eligibility.includes('NO_KNOWN_OVERLAY'),
);
check(
  'freeform address text is not a California authorization input',
  !/address[^\n]*includes\(\s*['\"]CA['\"]\s*\)/.test(eligibility) &&
    !/address[^\n]*match\([^\n]*CA/.test(eligibility),
);
check(
  'Places details requests structured addressComponents',
  places.includes("'X-Goog-FieldMask': 'formattedAddress,addressComponents'"),
);
check(
  'manual property edits invalidate structured state evidence',
  places.includes("id === 'propertyAddress'") &&
    places.includes('clearCaliforniaEligibilityEvidence()'),
);
check(
  'successful property selection records only classified structured evidence',
  places.includes('classifyCaliforniaEligibility(json.addressComponents)') &&
    places.includes('rememberCaliforniaEligibilityEvidence(resolvedAddress, status)'),
);
check(
  'Places detail failure clears rather than invents eligibility',
  (places.match(/clearCaliforniaEligibilityEvidence\(\)/g) ?? []).length >= 3,
);

const confirmedCheck = gates.indexOf("californiaStatus !== 'CONFIRMED_CALIFORNIA'");
const overlayCall = gates.indexOf('detectJurisdiction({ address: data.propertyAddress');
check(
  'overlay classification occurs only after California eligibility check',
  confirmedCheck >= 0 && overlayCall > confirmedCheck,
  `confirmedCheck=${confirmedCheck}, overlayCall=${overlayCall}`,
);
check(
  'NO_KNOWN_OVERLAY is not itself a California eligibility status',
  !eligibility.includes("'NO_KNOWN_OVERLAY'") &&
    gates.includes("californiaStatus !== 'CONFIRMED_CALIFORNIA'"),
);
check(
  'non-California and unknown both fail closed in the shared gate',
  gates.includes("californiaStatus === 'NON_CALIFORNIA'") &&
    gates.includes("'JURISDICTION_NON_CALIFORNIA'") &&
    gates.includes("'JURISDICTION_CALIFORNIA_UNCONFIRMED'"),
);
check(
  'Serve & Track still derives readiness exclusively from shared canProduce gate',
  serveTrack.includes('const result = data ? evaluateCanProduceV4(data) : null;') &&
    serveTrack.includes('result.canProduce'),
);
check(
  'packet production remains downstream of the shared gate',
  packetPrint.includes('PacketPrintOptions') &&
    gates.includes('canProduce: blockers.length === 0'),
);

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
