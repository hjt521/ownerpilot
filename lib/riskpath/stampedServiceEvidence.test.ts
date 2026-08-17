// lib/riskpath/stampedServiceEvidence.test.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildServiceEvidenceCaptureFields,
  buildStampedPhotoPayload,
  classifyServiceEvidence,
  renderStampedPhotoDerivative,
  sha256Hex,
  stampedPhotoStampLines,
  type StampedPhotoCanonicalInput,
} from './stampedServiceEvidence';

let passed = 0, failed = 0;
const check = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};
const rejects = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };

const dependencyVersion = (name: string): string => {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'node_modules', ...name.split('/'), 'package.json'), 'utf8')) as { version?: unknown };
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unavailable';
  }
};

const printable = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1').replace(/[^\x20-\x7e]/g, '.');

function boundedByteDiff(a: Uint8Array, b: Uint8Array) {
  const maxLength = Math.max(a.byteLength, b.byteLength);
  const ranges: Array<{ start: number; end: number; length: number; aHex: string; bHex: string; aText: string; bText: string }> = [];
  let firstDifferingByteIndex = -1;
  let totalDifferingRanges = 0;
  let i = 0;
  while (i < maxLength) {
    if (a[i] === b[i]) { i++; continue; }
    const start = i;
    if (firstDifferingByteIndex < 0) firstDifferingByteIndex = start;
    while (i < maxLength && a[i] !== b[i]) i++;
    const end = i - 1;
    totalDifferingRanges++;
    if (ranges.length < 8) {
      const from = Math.max(0, start - 16);
      const to = Math.min(maxLength, start + 48);
      const aSlice = a.slice(from, Math.min(to, a.byteLength));
      const bSlice = b.slice(from, Math.min(to, b.byteLength));
      ranges.push({
        start,
        end,
        length: end - start + 1,
        aHex: Buffer.from(aSlice).toString('hex'),
        bHex: Buffer.from(bSlice).toString('hex'),
        aText: printable(aSlice),
        bText: printable(bSlice),
      });
    }
  }
  return { firstDifferingByteIndex, totalDifferingRanges, ranges };
}

function nearbyPdfObject(bytes: Uint8Array, index: number) {
  if (index < 0) return null;
  const text = Buffer.from(bytes).toString('latin1');
  const objectRe = /(\d+)\s+(\d+)\s+obj\b/g;
  let selected: { objectNumber: string; generationNumber: string; start: number } | null = null;
  let match: RegExpExecArray | null;
  while ((match = objectRe.exec(text)) !== null) {
    if (match.index > index) break;
    selected = { objectNumber: match[1], generationNumber: match[2], start: match.index };
  }
  if (!selected) return { object: null, nearbyText: printable(bytes.slice(Math.max(0, index - 80), Math.min(bytes.byteLength, index + 120))) };
  const endObj = text.indexOf('endobj', selected.start);
  const objectEnd = endObj < 0 ? Math.min(text.length, selected.start + 1024) : endObj + 'endobj'.length;
  const objectText = text.slice(selected.start, Math.min(objectEnd, selected.start + 1024));
  const keys = [...new Set(objectText.match(/\/[A-Za-z0-9._-]+/g) ?? [])].slice(0, 16);
  const nearbyStart = Math.max(selected.start, index - 80);
  const nearbyEnd = Math.min(objectEnd, index + 120);
  return {
    object: `${selected.objectNumber} ${selected.generationNumber} obj`,
    objectStart: selected.start,
    objectEnd,
    keys,
    nearbyText: printable(bytes.slice(nearbyStart, nearbyEnd)),
  };
}

const tinyPng = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0N8AAAAASUVORK5CYII=',
  'base64',
));
const originalBefore = Buffer.from(tinyPng);
const originalSha = sha256Hex(tinyPng);

const capture = buildServiceEvidenceCaptureFields({
  captureSource: 'CAMERA_INTENT',
  mimeType: 'image/png',
  captureClientAt: '2026-08-17T21:15:30.123Z',
});
check('camera intent becomes explicit contemporaneous classification', capture.capture_classification === 'CONTEMPORANEOUS_CAMERA_INTENT');
check('camera intent preserves factual browser capture timestamp', capture.capture_client_at === '2026-08-17T21:15:30.123Z');

check('new camera provenance is contemporaneous only when source and timestamp agree', classifyServiceEvidence('CAMERA_INTENT', capture) === 'CONTEMPORANEOUS_CAMERA_INTENT');
check('pre-existing camera-intent evidence without provenance remains legacy/non-statutory', classifyServiceEvidence('CAMERA_INTENT', null) === 'LEGACY_CAMERA_INTENT_UNSTAMPED');
check('existing file without provenance remains supplemental', classifyServiceEvidence('FILE_PICKER', null) === 'SUPPLEMENTAL_EXISTING_FILE');
check('contradictory provenance/source fails closed', rejects(() => classifyServiceEvidence('FILE_PICKER', capture)));
check('existing file remains supplemental even when upload-time GPS may exist',
  buildServiceEvidenceCaptureFields({ captureSource: 'FILE_PICKER', mimeType: 'image/png' }).capture_classification === 'SUPPLEMENTAL_EXISTING_FILE');
check('existing file cannot smuggle a camera-capture timestamp', rejects(() => buildServiceEvidenceCaptureFields({
  captureSource: 'FILE_PICKER', mimeType: 'image/png', captureClientAt: '2026-08-17T21:15:30.123Z',
})));
check('camera intent requires factual browser capture timestamp', rejects(() => buildServiceEvidenceCaptureFields({ captureSource: 'CAMERA_INTENT', mimeType: 'image/png' })));
check('camera intent cannot classify a PDF as contemporaneous photo capture', rejects(() => buildServiceEvidenceCaptureFields({
  captureSource: 'CAMERA_INTENT', mimeType: 'application/pdf', captureClientAt: '2026-08-17T21:15:30.123Z',
})));

const canonical: StampedPhotoCanonicalInput = {
  evidenceId: '49d44a79-8444-4f20-b126-14599e985c67',
  originalSha256: originalSha,
  captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
  captureClientAt: '2026-08-17T21:15:30.123Z',
  geoStatus: 'CAPTURED',
  geoSource: 'DEVICE_BROWSER_GEOLOCATION',
  latitude: 34.101,
  longitude: -118.326,
  accuracyMeters: 4.5,
  geoAltitudeM: 120.25,
  geoAltitudeAccuracyM: 6.5,
  geoHeadingDeg: 180,
  geoSpeedMps: 0,
  deviceClass: 'MOBILE',
  platformFamily: 'iOS/iPadOS',
  browserFamily: 'Safari',
};

const payload = buildStampedPhotoPayload(canonical);
const lines = stampedPhotoStampLines(payload);
check('readable stamp contains capture date', lines.some((line) => line.includes('2026-08-17')));
check('readable stamp contains capture time', lines.some((line) => line.includes('21:15:30.123Z')));
check('readable stamp contains latitude and longitude', lines.some((line) => line.includes('34.101000') && line.includes('-118.326000')));
check('readable stamp contains accuracy and provenance', lines.some((line) => line.includes('4.50 m')) && lines.some((line) => line.includes('DEVICE_BROWSER_GEOLOCATION')));

async function main() {
const rendered1 = await renderStampedPhotoDerivative(tinyPng, 'image/png', canonical);
const rendered2 = await renderStampedPhotoDerivative(tinyPng, 'image/png', canonical);
check('original admitted bytes remain byte-identical after derivative generation', Buffer.compare(originalBefore, Buffer.from(tinyPng)) === 0);
check('stamped derivative is deterministic for identical canonical input', rendered1.sha256 === rendered2.sha256 && Buffer.compare(Buffer.from(rendered1.bytes), Buffer.from(rendered2.bytes)) === 0);
const byteDiff = boundedByteDiff(rendered1.bytes, rendered2.bytes);
const originalShaAfter = sha256Hex(tinyPng);
console.log('STAMPED_DERIVATIVE_BYTE_DIAGNOSTIC=' + JSON.stringify({
  nodeRuntime: process.version,
  pdfLibVersion: dependencyVersion('pdf-lib'),
  pakoVersion: dependencyVersion('pako'),
  pdfLibUpngVersion: dependencyVersion('@pdf-lib/upng'),
  derivativeSha256A: rendered1.sha256,
  derivativeSha256B: rendered2.sha256,
  byteLengthA: rendered1.bytes.byteLength,
  byteLengthB: rendered2.bytes.byteLength,
  firstDifferingByteIndex: byteDiff.firstDifferingByteIndex,
  totalDifferingRanges: byteDiff.totalDifferingRanges,
  differingByteRanges: byteDiff.ranges,
  pdfObjectA: nearbyPdfObject(rendered1.bytes, byteDiff.firstDifferingByteIndex),
  pdfObjectB: nearbyPdfObject(rendered2.bytes, byteDiff.firstDifferingByteIndex),
  sameCanonicalInputObjectUsedForBothRendererCalls: true,
  canonicalInputSha256: sha256Hex(Buffer.from(JSON.stringify(canonical))),
  stampPayloadIdentical: JSON.stringify(rendered1.stampPayload) === JSON.stringify(rendered2.stampPayload),
  stampTextIdentical: rendered1.stampText === rendered2.stampText,
  originalBytesIdenticalBeforeAfter: Buffer.compare(originalBefore, Buffer.from(tinyPng)) === 0,
  originalSha256Before: originalSha,
  originalSha256After: originalShaAfter,
  originalSha256Identical: originalSha === originalShaAfter,
}));
check('rendered derivative reports PDF MIME', rendered1.mimeType === 'application/pdf');
check('rendered derivative stamp text carries the same canonical values', rendered1.stampText.includes('34.101000') && rendered1.stampText.includes('21:15:30.123Z'));

const renderedChanges = [
  { ...canonical, captureClientAt: '2026-08-17T21:15:31.123Z' },
  { ...canonical, latitude: 34.102 },
  { ...canonical, longitude: -118.327 },
  { ...canonical, accuracyMeters: 8.75 },
  { ...canonical, evidenceId: '2e109bd2-4cbe-471e-86c2-aa808ccb09ce' },
];
for (const [index, changedInput] of renderedChanges.entries()) {
  const changed = await renderStampedPhotoDerivative(tinyPng, 'image/png', changedInput);
  check(`derivative hash changes for rendered canonical stamp field ${index + 1}`, rendered1.sha256 !== changed.sha256);
}
check('renderer rejects a caller-provided original hash that does not match the original bytes',
  await (async () => { try { await renderStampedPhotoDerivative(tinyPng, 'image/png', { ...canonical, originalSha256: '0'.repeat(64) }); return false; } catch { return true; } })());

for (const status of ['PERMISSION_DENIED', 'UNAVAILABLE', 'OPTED_OUT'] as const) {
  const factual = buildStampedPhotoPayload({ ...canonical, geoStatus: status, geoSource: null, latitude: null, longitude: null, accuracyMeters: null,
    geoAltitudeM: null, geoAltitudeAccuracyM: null, geoHeadingDeg: null, geoSpeedMps: null });
  const factualLines = stampedPhotoStampLines(factual);
  check(`${status} never fabricates coordinates`, factual.latitude === null && factual.longitude === null && factualLines.some((line) => line.includes(`${status} (no coordinates recorded)`)));
}

const clientSource = readFileSync(join(process.cwd(), 'components', 'riskpath', 'DurableServiceClient.tsx'), 'utf8');
const enhancementSource = readFileSync(join(process.cwd(), 'components', 'riskpath', 'StampedServiceEvidenceEnhancement.tsx'), 'utf8');
const routeSource = readFileSync(join(process.cwd(), 'app', 'api', 'riskpath', '[id]', 'service', 'route.ts'), 'utf8');
const stampedRouteSource = readFileSync(join(process.cwd(), 'app', 'api', 'riskpath', '[id]', 'service', 'stamped', 'route.ts'), 'utf8');
const migrationSource = readFileSync(join(process.cwd(), 'supabase', 'migrations', '20260817212200_stamped_service_evidence_v1.sql'), 'utf8');
check('3-Day enhanced capture copy is explicitly optional and non-blocking', enhancementSource.toLowerCase().includes('optional enhancement') && enhancementSource.includes('ordinary service record remains available'));
check('3-Day customer copy does not claim the future statute is currently mandatory', !clientSource.includes('AB 747') && !enhancementSource.includes('AB 747'));
const serviceSchemaSource = routeSource.slice(routeSource.indexOf('const serviceEventSchema'), routeSource.indexOf('const evidenceIntentSchema'));
check('ordinary service-event recording remains independent of GPS/photo evidence', serviceSchemaSource.includes("record_service_event") && !serviceSchemaSource.includes('geoStatus') && !serviceSchemaSource.includes('evidenceId'));
const previewRouteSource = readFileSync(join(process.cwd(), 'app', 'api', 'riskpath', '[id]', 'service', 'pos010-preview', 'route.ts'), 'utf8');
check('Preview POS-010 proof surface is restricted to tagged synthetic records', previewRouteSource.includes("process.env.VERCEL_ENV !== 'preview'") && previewRouteSource.includes("record.synthetic_source !== 'e2e'") && previewRouteSource.includes('record.e2e_run_id'));
check('existing-file UI explicitly remains supplemental rather than contemporaneous', enhancementSource.includes('supplemental evidence') && enhancementSource.includes('not contemporaneous stamped-photo evidence'));
check('parent PR #392 service route is not repurposed for stamped classification', !routeSource.includes('buildServiceEvidenceCaptureFields') && !routeSource.includes('service_evidence_derivatives'));
check('server derives capture classification on the additive stamped rail rather than accepting a client classification field', stampedRouteSource.includes('buildServiceEvidenceCaptureFields') && !stampedRouteSource.includes('captureClassification: parsed.data.captureClassification'));
check('additive stamped route preserves original and creates a separate derivative', stampedRouteSource.includes('renderStampedPhotoDerivative') && stampedRouteSource.includes('source_server_sha256'));
check('migration registers new provenance only before admission, preventing retroactive upgrade of legacy admitted cameras', migrationSource.includes('service_evidence_capture_provenance') && migrationSource.includes('e.admitted_at is null'));
check('source helper explicitly preserves legacy camera-intent rows as non-statutory', readFileSync(join(process.cwd(), 'lib', 'riskpath', 'stampedServiceEvidence.ts'), 'utf8').includes("'LEGACY_CAMERA_INTENT_UNSTAMPED'"));
check('derivative table is immutable and private-table access stays service-role only', migrationSource.includes('service_evidence_derivatives_append_only') && migrationSource.includes('revoke all on public.service_evidence_derivatives from anon, authenticated'));

console.log(`\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`);
if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
