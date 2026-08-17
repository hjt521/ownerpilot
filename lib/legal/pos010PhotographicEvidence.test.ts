// lib/legal/pos010PhotographicEvidence.test.ts

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { renderStampedPhotoDerivative, sha256Hex } from '@/lib/riskpath/stampedServiceEvidence';
import {
  POS010_FORM_VERSION,
  POS010_SOURCE_RELATIVE_PATH,
  generatePos010PhotographicEvidencePackage,
  type Pos010PhotoAttachmentInput,
} from './pos010PhotographicEvidence';

let passed = 0, failed = 0;
const check = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const officialPath = join(process.cwd(), ...POS010_SOURCE_RELATIVE_PATH.split('/'));
const officialBytes = new Uint8Array(readFileSync(officialPath));
const officialBefore = Buffer.from(officialBytes);
const officialBeforeHash = hash(officialBytes);
const sourceDoc = await PDFDocument.load(officialBytes, { updateMetadata: false });

const tinyJpeg = Uint8Array.from(Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooA//2Q==',
  'base64',
));
const derivative = await renderStampedPhotoDerivative(tinyJpeg, 'image/jpeg', {
  evidenceId: '49d44a79-8444-4f20-b126-14599e985c67',
  originalSha256: sha256Hex(tinyJpeg),
  captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
  captureClientAt: '2027-01-05T18:00:05.000Z',
  geoStatus: 'CAPTURED',
  geoSource: 'DEVICE_BROWSER_GEOLOCATION',
  latitude: 34.101,
  longitude: -118.326,
  accuracyMeters: 4.5,
  deviceClass: 'MOBILE',
  platformFamily: 'iOS/iPadOS',
  browserFamily: 'Safari',
});

const photo: Pos010PhotoAttachmentInput = {
  fact: {
    riskpathRecordId: '4beab2c4-caaa-4d33-aee9-1499d3bb2027',
    createdNoticeArtifactId: '13f9f3b2-6827-42b5-af20-1e352a9eb0b2',
    serviceEventId: 'a577a65c-e919-445f-aee5-ed0295bd9ae1',
    attemptDate: '2027-01-05',
    method: 'CCP_415_20',
    evidenceId: '49d44a79-8444-4f20-b126-14599e985c67',
    captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
    captureClientAt: '2027-01-05T18:00:05.000Z',
    serverReceivedAt: '2027-01-05T18:00:06.000Z',
    geoStatus: 'CAPTURED',
    geoSource: 'DEVICE_BROWSER_GEOLOCATION',
    latitude: 34.101,
    longitude: -118.326,
    accuracyMeters: 4.5,
    originalSha256: sha256Hex(tinyJpeg),
    stampedDerivativeSha256: derivative.sha256,
    stampSchemaVersion: derivative.stampPayload.schemaVersion,
    stampText: derivative.stampText,
    exceptionKind: null,
    exceptionExplanation: null,
  },
  stampedDerivativePdfBytes: derivative.bytes,
};

let mismatchedDerivativeRejected = false;
try {
  await generatePos010PhotographicEvidencePackage({
    officialPos010Bytes: officialBytes,
    photos: [{ ...photo, fact: { ...photo.fact, stampedDerivativeSha256: '0'.repeat(64) } }],
  });
} catch { mismatchedDerivativeRejected = true; }
check('POS-010 adapter rejects derivative bytes that do not match the frozen SHA', mismatchedDerivativeRejected);
check('POS-010 adapter remains pinned to the governed POS-010 asset, not POS-040', POS010_SOURCE_RELATIVE_PATH.includes('/POS-010/') && !POS010_SOURCE_RELATIVE_PATH.includes('POS-040'));

const package1 = await generatePos010PhotographicEvidencePackage({ officialPos010Bytes: officialBytes, photos: [photo] });
const package2 = await generatePos010PhotographicEvidencePackage({ officialPos010Bytes: officialBytes, photos: [photo] });
const packageDoc = await PDFDocument.load(package1.bytes, { updateMetadata: false });

check('governed POS-010 form version remains explicit and replaceable', package1.formVersion === POS010_FORM_VERSION && POS010_FORM_VERSION === '2007-01-01');
check('official POS-010 source asset remains byte-identical after generation', Buffer.compare(officialBefore, Buffer.from(officialBytes)) === 0 && hash(officialBytes) === officialBeforeHash);
check('POS-010 package is deterministic from frozen facts and derivative bytes', package1.packageSha256 === package2.packageSha256 && Buffer.compare(Buffer.from(package1.bytes), Buffer.from(package2.bytes)) === 0);
check('package preserves original source pages and appends fact + stamped-photo pages', packageDoc.getPageCount() === sourceDoc.getPageCount() + 2);
check('attachment binding is deterministic and distinct from package hash', /^[0-9a-f]{64}$/.test(package1.attachmentBindingSha256) && package1.attachmentBindingSha256 !== package1.packageSha256);
check('package source hash exactly describes the governed source bytes', package1.sourceSha256 === officialBeforeHash);
check('attachment count reflects exact photographic evidence facts', package1.attachmentCount === 1);

console.log(`\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`);
if (failed > 0) process.exit(1);
