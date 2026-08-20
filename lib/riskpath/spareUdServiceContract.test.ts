// lib/riskpath/spareUdServiceContract.test.ts

import {
  SPARE_UD_PHOTO_OPERATIVE_DATE,
  evaluateSpareUdAttemptReadiness,
  relateCaptureToAttempt,
  type SpareUdAttemptReadinessInput,
} from './spareUdServiceContract';

let passed = 0, failed = 0;
const check = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};

const valid: SpareUdAttemptReadinessInput = {
  attemptId: 'attempt-1',
  method: 'CCP_415_20',
  attemptAt: '2027-01-05T18:00:00.000Z',
  sites: [{
    siteId: 'front-door',
    siteKind: 'DOOR',
    photos: [{
      evidenceId: 'photo-1',
      captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
      geoStatus: 'CAPTURED',
      latitude: 34.101,
      longitude: -118.326,
      accuracyMeters: 4.5,
      stampedDerivativeSha256: 'a'.repeat(64),
      captureClientAt: '2027-01-05T18:00:05.000Z',
    }],
  }],
};

const ready = evaluateSpareUdAttemptReadiness(valid);
check('future SPARE contract is explicitly non-active in this slice', ready.activeComplianceGate === false);
check('operative date is January 1 2027', ready.operativeDate === SPARE_UD_PHOTO_OPERATIVE_DATE && ready.operativeDate === '2027-01-01');
check('complete contemporaneous stamped capture is SPARE-ready', ready.ready && ready.defects.length === 0);
check('attempt/capture relationship records exact offset without inventing a minute threshold', ready.timing[0]?.offsetMilliseconds === 5000 && ready.timing[0]?.relation === 'AFTER_ATTEMPT');


const missingAttemptId = structuredClone(valid);
missingAttemptId.attemptId = ' ';
check('missing future attempt identity fails closed', !evaluateSpareUdAttemptReadiness(missingAttemptId).ready);

const duplicateSite = structuredClone(valid);
duplicateSite.sites.push(structuredClone(duplicateSite.sites[0]));
duplicateSite.sites[1].photos[0].evidenceId = 'photo-2';
check('duplicate affected-site identity fails closed', !evaluateSpareUdAttemptReadiness(duplicateSite).ready);

const existing = structuredClone(valid);
existing.sites[0].photos[0].captureClassification = 'SUPPLEMENTAL_EXISTING_FILE';
check('existing-file upload cannot count as contemporaneous statutory capture', !evaluateSpareUdAttemptReadiness(existing).ready);

const missingPhoto = structuredClone(valid);
missingPhoto.sites[0].photos = [];
check('required future-state photo absence fails closed', evaluateSpareUdAttemptReadiness(missingPhoto).defects.some((d) => d.includes('photo_required')));

const noSignal = structuredClone(valid);
noSignal.sites[0].photos[0].geoStatus = 'UNAVAILABLE';
noSignal.sites[0].photos[0].latitude = null;
noSignal.sites[0].photos[0].longitude = null;
noSignal.sites[0].photos[0].accuracyMeters = null;
noSignal.sites[0].exception = { kind: 'NO_SIGNAL', explanation: 'No browser/device coordinate signal was available at the affected site.' };
const noSignalResult = evaluateSpareUdAttemptReadiness(noSignal);
check('no-signal path preserves exact explanation and can satisfy readiness without coordinates', noSignalResult.ready);


const capturedMissingCoordinates = structuredClone(valid);
capturedMissingCoordinates.sites[0].photos[0].latitude = null;
check('CAPTURED status without actual coordinates fails closed', !evaluateSpareUdAttemptReadiness(capturedMissingCoordinates).ready);

const noncapturedFabricated = structuredClone(noSignal);
noncapturedFabricated.sites[0].photos[0].latitude = 34.1;
check('non-captured state cannot carry fabricated coordinates', !evaluateSpareUdAttemptReadiness(noncapturedFabricated).ready);

const noSignalMissingExplanation = structuredClone(noSignal);
noSignalMissingExplanation.sites[0].exception = { kind: 'NO_SIGNAL', explanation: '   ' };
check('no-signal without factual explanation fails closed', !evaluateSpareUdAttemptReadiness(noSignalMissingExplanation).ready);

const safety = structuredClone(valid);
safety.sites[0].photos = [];
safety.sites[0].exception = { kind: 'SAFETY', explanation: 'Server stopped capture because remaining at the site presented a safety concern.' };
check('safety exception can preserve absence of photo/GPS without fabricating facts', evaluateSpareUdAttemptReadiness(safety).ready);

const inaccessible = structuredClone(valid);
inaccessible.sites[0].siteKind = 'ENTRANCE';
inaccessible.sites[0].exception = { kind: 'INACCESSIBLE_DOOR', explanation: 'Specific unit door was inaccessible; entrance evidence was captured.' };
check('inaccessible-door path requires entrance semantics and explanation', evaluateSpareUdAttemptReadiness(inaccessible).ready);

const inaccessibleWrongSite = structuredClone(inaccessible);
inaccessibleWrongSite.sites[0].siteKind = 'DOOR';
check('inaccessible-door explanation cannot silently use incompatible site semantics', !evaluateSpareUdAttemptReadiness(inaccessibleWrongSite).ready);

const before = relateCaptureToAttempt('2027-01-05T18:00:05.000Z', '2027-01-05T18:00:00.000Z');
check('capture before attempt is preserved factually rather than normalized', before.relation === 'BEFORE_ATTEMPT' && before.offsetMilliseconds === -5000);

console.log(`\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`);
if (failed > 0) process.exit(1);
