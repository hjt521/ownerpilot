// lib/riskpath/stampedServiceEvidence.ts
// Shared stamped-photo substrate for optional 3-Day Notice evidence and future SPARE-ready service proof.
// Capture classification is factual provenance only. It is not service legality, statutory readiness, or legal sufficiency.

import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  MAX_SERVICE_EVIDENCE_BYTES,
  type ServiceEvidenceCaptureSource,
  type ServiceEvidenceGeoStatus,
  type ServiceEvidenceMimeType,
  isUuid,
} from './durableService';

export const STAMPED_DERIVATIVE_KIND = 'STAMPED_PHOTO_PDF_V1' as const;
export const STAMP_SCHEMA_VERSION = 'STAMP_V1' as const;
export const MAX_STAMPED_DERIVATIVE_BYTES = MAX_SERVICE_EVIDENCE_BYTES;

export type ServiceEvidenceCaptureClassification =
  | 'CONTEMPORANEOUS_CAMERA_INTENT'
  | 'SUPPLEMENTAL_EXISTING_FILE'
  | 'LEGACY_CAMERA_INTENT_UNSTAMPED';

export interface ServiceEvidenceCaptureInput {
  captureSource: ServiceEvidenceCaptureSource;
  mimeType: ServiceEvidenceMimeType;
  captureClientAt?: string | null;
}

export interface ServiceEvidenceCaptureDbFields {
  capture_classification: Exclude<ServiceEvidenceCaptureClassification, 'LEGACY_CAMERA_INTENT_UNSTAMPED'>;
  capture_client_at: string | null;
}


export interface ServiceEvidenceCaptureProvenanceRecord {
  capture_classification: Exclude<ServiceEvidenceCaptureClassification, 'LEGACY_CAMERA_INTENT_UNSTAMPED'>;
  capture_client_at: string | null;
}

export function classifyServiceEvidence(
  captureSource: ServiceEvidenceCaptureSource,
  provenance: ServiceEvidenceCaptureProvenanceRecord | null | undefined,
): ServiceEvidenceCaptureClassification {
  if (provenance) {
    if (captureSource === 'CAMERA_INTENT' && provenance.capture_classification === 'CONTEMPORANEOUS_CAMERA_INTENT' && provenance.capture_client_at) {
      return 'CONTEMPORANEOUS_CAMERA_INTENT';
    }
    if (captureSource !== 'CAMERA_INTENT' && provenance.capture_classification === 'SUPPLEMENTAL_EXISTING_FILE' && provenance.capture_client_at == null) {
      return 'SUPPLEMENTAL_EXISTING_FILE';
    }
    throw new Error('stampedServiceEvidence: stored capture provenance conflicts with original evidence source');
  }
  return captureSource === 'CAMERA_INTENT' ? 'LEGACY_CAMERA_INTENT_UNSTAMPED' : 'SUPPLEMENTAL_EXISTING_FILE';
}

export interface StampedPhotoCanonicalInput {
  evidenceId: string;
  originalSha256: string;
  captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT';
  captureClientAt: string;
  geoStatus: ServiceEvidenceGeoStatus;
  geoSource: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  geoAltitudeM?: number | null;
  geoAltitudeAccuracyM?: number | null;
  geoHeadingDeg?: number | null;
  geoSpeedMps?: number | null;
  deviceClass: string;
  platformFamily: string;
  browserFamily: string;
}

export interface StampedPhotoPayload {
  schemaVersion: typeof STAMP_SCHEMA_VERSION;
  evidenceId: string;
  originalSha256: string;
  captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT';
  captureClientAt: string;
  captureDateUtc: string;
  captureTimeUtc: string;
  geoStatus: ServiceEvidenceGeoStatus;
  geoSource: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  geoAltitudeM: number | null;
  geoAltitudeAccuracyM: number | null;
  geoHeadingDeg: number | null;
  geoSpeedMps: number | null;
  deviceClass: string;
  platformFamily: string;
  browserFamily: string;
}

export interface RenderedStampedPhotoDerivative {
  bytes: Uint8Array;
  mimeType: 'application/pdf';
  sha256: string;
  stampPayload: StampedPhotoPayload;
  stampText: string;
}

const SHA256_RE = /^[0-9a-f]{64}$/;
const IMAGE_MIME_TYPES = new Set<ServiceEvidenceMimeType>(['image/jpeg', 'image/png']);

function isoDate(value: string, label: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`stampedServiceEvidence: ${label} must be an ISO timestamp`);
  return date.toISOString();
}

function finiteOrNull(value: number | null | undefined, label: string): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) throw new Error(`stampedServiceEvidence: ${label} must be finite`);
  return value;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function detectServiceEvidenceMime(bytes: Uint8Array): ServiceEvidenceMimeType | null {
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
  return null;
}

export function buildServiceEvidenceCaptureFields(input: ServiceEvidenceCaptureInput): ServiceEvidenceCaptureDbFields {
  const captureAt = input.captureClientAt == null ? null : isoDate(input.captureClientAt, 'captureClientAt');
  if (input.captureSource === 'CAMERA_INTENT') {
    if (!IMAGE_MIME_TYPES.has(input.mimeType)) {
      throw new Error('stampedServiceEvidence: CAMERA_INTENT requires a JPEG or PNG image');
    }
    if (!captureAt) {
      throw new Error('stampedServiceEvidence: CAMERA_INTENT requires a factual browser capture timestamp');
    }
    return {
      capture_classification: 'CONTEMPORANEOUS_CAMERA_INTENT',
      capture_client_at: captureAt,
    };
  }
  if (captureAt) {
    throw new Error('stampedServiceEvidence: existing-file/document evidence cannot carry a camera capture timestamp');
  }
  return {
    capture_classification: 'SUPPLEMENTAL_EXISTING_FILE',
    capture_client_at: null,
  };
}

export function buildStampedPhotoPayload(input: StampedPhotoCanonicalInput): StampedPhotoPayload {
  if (!isUuid(input.evidenceId)) throw new Error('stampedServiceEvidence: evidenceId must be a UUID');
  if (!SHA256_RE.test(input.originalSha256)) throw new Error('stampedServiceEvidence: originalSha256 must be lowercase SHA-256');
  const captureClientAt = isoDate(input.captureClientAt, 'captureClientAt');
  const latitude = finiteOrNull(input.latitude, 'latitude');
  const longitude = finiteOrNull(input.longitude, 'longitude');
  const accuracy = finiteOrNull(input.accuracyMeters, 'accuracyMeters');
  const altitude = finiteOrNull(input.geoAltitudeM, 'geoAltitudeM');
  const altitudeAccuracy = finiteOrNull(input.geoAltitudeAccuracyM, 'geoAltitudeAccuracyM');
  const heading = finiteOrNull(input.geoHeadingDeg, 'geoHeadingDeg');
  const speed = finiteOrNull(input.geoSpeedMps, 'geoSpeedMps');

  if (input.geoStatus === 'CAPTURED') {
    if (latitude == null || latitude < -90 || latitude > 90) throw new Error('stampedServiceEvidence: captured latitude is invalid');
    if (longitude == null || longitude < -180 || longitude > 180) throw new Error('stampedServiceEvidence: captured longitude is invalid');
    if (accuracy == null || accuracy < 0) throw new Error('stampedServiceEvidence: captured accuracy is invalid');
    if (!input.geoSource) throw new Error('stampedServiceEvidence: captured geolocation requires a provenance source');
  } else if (
    latitude != null || longitude != null || accuracy != null || altitude != null || altitudeAccuracy != null ||
    heading != null || speed != null || input.geoSource != null
  ) {
    throw new Error('stampedServiceEvidence: non-captured geolocation cannot carry coordinates or source');
  }
  if (altitudeAccuracy != null && altitudeAccuracy < 0) throw new Error('stampedServiceEvidence: altitude accuracy is invalid');
  if (heading != null && (heading < 0 || heading >= 360)) throw new Error('stampedServiceEvidence: heading is invalid');
  if (speed != null && speed < 0) throw new Error('stampedServiceEvidence: speed is invalid');

  return {
    schemaVersion: STAMP_SCHEMA_VERSION,
    evidenceId: input.evidenceId,
    originalSha256: input.originalSha256,
    captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
    captureClientAt,
    captureDateUtc: captureClientAt.slice(0, 10),
    captureTimeUtc: captureClientAt.slice(11),
    geoStatus: input.geoStatus,
    geoSource: input.geoStatus === 'CAPTURED' ? input.geoSource : null,
    latitude: input.geoStatus === 'CAPTURED' ? latitude : null,
    longitude: input.geoStatus === 'CAPTURED' ? longitude : null,
    accuracyMeters: input.geoStatus === 'CAPTURED' ? accuracy : null,
    geoAltitudeM: input.geoStatus === 'CAPTURED' ? altitude : null,
    geoAltitudeAccuracyM: input.geoStatus === 'CAPTURED' ? altitudeAccuracy : null,
    geoHeadingDeg: input.geoStatus === 'CAPTURED' ? heading : null,
    geoSpeedMps: input.geoStatus === 'CAPTURED' ? speed : null,
    deviceClass: input.deviceClass,
    platformFamily: input.platformFamily,
    browserFamily: input.browserFamily,
  };
}

export function stampedPhotoStampLines(payload: StampedPhotoPayload): string[] {
  const geoLine = payload.geoStatus === 'CAPTURED'
    ? `GPS: ${payload.latitude!.toFixed(6)}, ${payload.longitude!.toFixed(6)} +/- ${payload.accuracyMeters!.toFixed(2)} m`
    : `GPS: ${payload.geoStatus} (no coordinates recorded)`;
  const provenance = payload.geoStatus === 'CAPTURED'
    ? `Provenance: ${payload.geoSource} | accuracy ${payload.accuracyMeters!.toFixed(2)} m`
    : `Provenance: factual status ${payload.geoStatus}`;
  return [
    'OwnerPilot stamped service evidence',
    `Capture date (UTC): ${payload.captureDateUtc}`,
    `Capture time (UTC): ${payload.captureTimeUtc}`,
    geoLine,
    provenance,
    `Capture: ${payload.captureClassification}`,
    `Evidence ID: ${payload.evidenceId}`,
    `Original SHA-256: ${payload.originalSha256}`,
  ];
}

export async function renderStampedPhotoDerivative(
  originalBytes: Uint8Array,
  originalMimeType: 'image/jpeg' | 'image/png',
  input: StampedPhotoCanonicalInput,
): Promise<RenderedStampedPhotoDerivative> {
  if (originalBytes.byteLength < 1 || originalBytes.byteLength > MAX_SERVICE_EVIDENCE_BYTES) {
    throw new Error('stampedServiceEvidence: original image is outside the admitted byte ceiling');
  }
  const detected = detectServiceEvidenceMime(originalBytes);
  if (detected !== originalMimeType) throw new Error('stampedServiceEvidence: original image MIME does not match magic bytes');
  if (sha256Hex(originalBytes) !== input.originalSha256) throw new Error('stampedServiceEvidence: original image bytes do not match canonical SHA-256');

  const payload = buildStampedPhotoPayload(input);
  const lines = stampedPhotoStampLines(payload);
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const image = originalMimeType === 'image/jpeg'
    ? await pdf.embedJpg(originalBytes)
    : await pdf.embedPng(originalBytes);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const stampHeight = 164;
  const imageTop = pageHeight - margin;
  const imageBottom = margin + stampHeight + 12;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = imageTop - imageBottom;
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height, 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x: margin + (availableWidth - drawWidth) / 2,
    y: imageBottom + (availableHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
  page.drawRectangle({
    x: margin,
    y: margin,
    width: availableWidth,
    height: stampHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1,
  });

  let y = margin + stampHeight - 20;
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: margin + 10,
      y,
      size: index === 0 ? 10 : 8.5,
      font: index === 0 ? bold : regular,
      color: rgb(0.05, 0.05, 0.05),
      maxWidth: availableWidth - 20,
    });
    y -= index === 0 ? 18 : 15;
  });

  const bytes = await pdf.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  if (bytes.byteLength > MAX_STAMPED_DERIVATIVE_BYTES) {
    throw new Error('stampedServiceEvidence: stamped derivative exceeds the existing 6 MiB evidence ceiling');
  }
  return {
    bytes,
    mimeType: 'application/pdf',
    sha256: sha256Hex(bytes),
    stampPayload: payload,
    stampText: lines.join('\n'),
  };
}
