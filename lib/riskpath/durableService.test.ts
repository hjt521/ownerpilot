// lib/riskpath/durableService.test.ts
// Focused identity + GPS provenance invariants for Durable Service Evidence V1.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IntakeState } from '@/lib/chat/intakeSchema';
import {
  buildPendingCreatedNoticeBinding,
  buildServiceEvidenceGeoFields,
  hasCompleteCreatedNoticeBinding,
  hasFinalizedCreatedNoticeBinding,
  recomputeCreatedNoticeBinding,
  type ServiceEvidenceGeoInput,
} from './durableService';

let passed = 0, failed = 0;
const check = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};
const rejects = (input: ServiceEvidenceGeoInput): boolean => {
  try { buildServiceEvidenceGeoFields(input); return false; } catch { return true; }
};
function state(obj: Record<string, unknown>): IntakeState {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, { value, confidence: 1, updated_at: '2026-08-17T00:00:00Z' }])) as IntakeState;
}

const intake = state({
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_phone: '(213) 555-0100',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  rent_periods: [{ periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 6000 }],
  signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
  preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
  payment_methods_accepted: ['in_person'],
  preferred_service_method: 'personal',
  personal_delivery: { days: 'Monday through Friday', hours: '9:00 a.m. to 5:00 p.m.' },
});

const a = buildPendingCreatedNoticeBinding({
  intakeState: intake,
  intendedServiceDate: '2026-08-17',
  artifactId: '49d44a79-8444-4f20-b126-14599e985c67',
});
const b = buildPendingCreatedNoticeBinding({
  intakeState: intake,
  intendedServiceDate: '2026-08-17',
  artifactId: '2e109bd2-4cbe-471e-86c2-aa808ccb09ce',
});

check('pending binding stores exact frozen service date', a.created_notice_service_date === '2026-08-17');
check('pending binding is not finalized before successful client production', a.created_notice_finalized_at === null);
check('complete pending identity is structurally present', hasCompleteCreatedNoticeBinding(a));
check('pending identity is not service-authoritative', !hasFinalizedCreatedNoticeBinding(a));
check('same material Create state deterministically yields same generation', a.created_notice_generation === b.created_notice_generation);
check('same material generation event facts still receive distinct opaque artifact IDs', a.created_notice_artifact_id !== b.created_notice_artifact_id);
check('same generation yields same build-owned semantic binding', a.created_notice_semantic_binding_id === b.created_notice_semantic_binding_id);

const recomputed = recomputeCreatedNoticeBinding({ intakeState: intake, intendedServiceDate: '2026-08-17' });
check('server recomputation matches stored material generation', recomputed.created_notice_generation === a.created_notice_generation);
check('server recomputation matches stored semantic binding', recomputed.created_notice_semantic_binding_id === a.created_notice_semantic_binding_id);

const finalized = { ...a, created_notice_finalized_at: '2026-08-17T07:30:00.000Z' };
check('finalized exact binding becomes service-authoritative', hasFinalizedCreatedNoticeBinding(finalized));

let badUuidRejected = false;
try { buildPendingCreatedNoticeBinding({ intakeState: intake, intendedServiceDate: '2026-08-17', artifactId: 'not-an-id' }); } catch { badUuidRejected = true; }
check('artifact event identity cannot be derived from arbitrary caller text', badUuidRejected);

const capturedBase: ServiceEvidenceGeoInput = {
  geoStatus: 'CAPTURED',
  latitude: 34.101,
  longitude: -118.326,
  accuracyMeters: 4.5,
  geoClientCapturedAt: '2026-08-17T07:45:00.000Z',
};

const altitude = buildServiceEvidenceGeoFields({ ...capturedBase, geoAltitudeM: 121.75 });
check('altitude round-trips when supplied', altitude.geo_altitude_m === 121.75);
const negativeAltitude = buildServiceEvidenceGeoFields({ ...capturedBase, geoAltitudeM: -12.25 });
check('altitude may be negative', negativeAltitude.geo_altitude_m === -12.25);
check('non-finite altitude NaN rejected', rejects({ ...capturedBase, geoAltitudeM: Number.NaN }));
check('non-finite altitude infinity rejected', rejects({ ...capturedBase, geoAltitudeM: Number.POSITIVE_INFINITY }));

const altitudeAccuracy = buildServiceEvidenceGeoFields({ ...capturedBase, geoAltitudeAccuracyM: 8.25 });
check('altitude accuracy round-trips when supplied', altitudeAccuracy.geo_altitude_accuracy_m === 8.25);
check('negative altitude accuracy rejected', rejects({ ...capturedBase, geoAltitudeAccuracyM: -0.01 }));
check('non-finite altitude accuracy rejected', rejects({ ...capturedBase, geoAltitudeAccuracyM: Number.POSITIVE_INFINITY }));

const headingZero = buildServiceEvidenceGeoFields({ ...capturedBase, geoHeadingDeg: 0 });
check('heading 0 accepted and round-trips', headingZero.geo_heading_deg === 0);
const headingBelow360 = buildServiceEvidenceGeoFields({ ...capturedBase, geoHeadingDeg: 359.999 });
check('heading below 360 accepted and round-trips', headingBelow360.geo_heading_deg === 359.999);
check('negative heading rejected', rejects({ ...capturedBase, geoHeadingDeg: -0.001 }));
check('heading 360 rejected', rejects({ ...capturedBase, geoHeadingDeg: 360 }));
check('heading above 360 rejected', rejects({ ...capturedBase, geoHeadingDeg: 721 }));
check('non-finite heading rejected', rejects({ ...capturedBase, geoHeadingDeg: Number.NaN }));

const speed = buildServiceEvidenceGeoFields({ ...capturedBase, geoSpeedMps: 3.4 });
check('speed round-trips when supplied', speed.geo_speed_mps === 3.4);
const zeroSpeed = buildServiceEvidenceGeoFields({ ...capturedBase, geoSpeedMps: 0 });
check('speed zero accepted', zeroSpeed.geo_speed_mps === 0);
check('negative speed rejected', rejects({ ...capturedBase, geoSpeedMps: -0.01 }));
check('non-finite speed rejected', rejects({ ...capturedBase, geoSpeedMps: Number.NEGATIVE_INFINITY }));

const absentOptional = buildServiceEvidenceGeoFields(capturedBase);
check('absent optional GPS values remain null',
  absentOptional.geo_altitude_m === null &&
  absentOptional.geo_altitude_accuracy_m === null &&
  absentOptional.geo_heading_deg === null &&
  absentOptional.geo_speed_mps === null);

check('latitude below -90 rejected', rejects({ ...capturedBase, latitude: -90.0001 }));
check('latitude above 90 rejected', rejects({ ...capturedBase, latitude: 90.0001 }));
check('non-finite latitude rejected', rejects({ ...capturedBase, latitude: Number.NaN }));
check('longitude below -180 rejected', rejects({ ...capturedBase, longitude: -180.0001 }));
check('longitude above 180 rejected', rejects({ ...capturedBase, longitude: 180.0001 }));
check('non-finite longitude rejected', rejects({ ...capturedBase, longitude: Number.POSITIVE_INFINITY }));
check('negative accuracy rejected', rejects({ ...capturedBase, accuracyMeters: -0.01 }));
check('non-finite accuracy rejected', rejects({ ...capturedBase, accuracyMeters: Number.NaN }));

for (const status of ['PERMISSION_DENIED', 'OPTED_OUT', 'UNAVAILABLE'] as const) {
  const factual = buildServiceEvidenceGeoFields({ geoStatus: status });
  check(`${status} remains non-blocking factual provenance`,
    factual.geo_status === status && factual.geo_source === null && factual.latitude === null && factual.geo_altitude_m === null);
}

const authForbiddenKeys = ['user_id', 'riskpath_record_id', 'created_notice_artifact_id', 'service_event_id'];
check('GPS helper produces provenance only and no authorization identifiers',
  authForbiddenKeys.every((key) => !(key in absentOptional)));

const clientSource = readFileSync(join(process.cwd(), 'components', 'riskpath', 'DurableServiceClient.tsx'), 'utf8');
const geoQueryLeakPatterns = [
  'latitude=', 'longitude=', 'accuracyMeters=', 'geoAltitudeM=', 'geoAltitudeAccuracyM=', 'geoHeadingDeg=', 'geoSpeedMps=',
  'URLSearchParams(',
];
check('GPS values do not enter URL/query telemetry', geoQueryLeakPatterns.every((pattern) => !clientSource.includes(pattern)));
check('GPS provenance is carried in the evidence POST body', clientSource.includes('...geo') && clientSource.includes("action: 'evidence_upload_intent'"));
check('file-picker semantics explicitly identify device location at evidence-add time', clientSource.includes('device location when the evidence is added'));

console.log(`\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`);
if (failed > 0) process.exit(1);
