// lib/legal/pos010PhotographicEvidence.ts
// Form-versioned POS-010 package adapter with deterministic supplemental photographic-evidence pages.
// The governed official POS-010 source bytes are never mutated. This adapter does not determine legal sufficiency.

import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const POS010_FORM_VERSION = '2007-01-01' as const;
export const POS010_SOURCE_RELATIVE_PATH =
  'docs/legal/official-forms/california/judicial-council/POS-010/2007-01-01/POS-010.pdf' as const;
export const POS010_ATTACHMENT_SCHEMA_VERSION = 'POS010_PHOTO_ATTACHMENT_V1' as const;

export interface Pos010PhotoAttachmentFact {
  riskpathRecordId: string;
  createdNoticeArtifactId: string;
  serviceEventId: string;
  attemptDate: string;
  method: string;
  evidenceId: string;
  captureClassification: string;
  captureClientAt: string | null;
  serverReceivedAt: string;
  geoStatus: string;
  geoSource: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  originalSha256: string;
  stampedDerivativeSha256: string;
  stampSchemaVersion: string;
  stampText: string;
  exceptionKind?: string | null;
  exceptionExplanation?: string | null;
}

export interface Pos010PhotoAttachmentInput {
  fact: Pos010PhotoAttachmentFact;
  stampedDerivativePdfBytes: Uint8Array;
}

export interface Pos010PackageResult {
  bytes: Uint8Array;
  formVersion: typeof POS010_FORM_VERSION;
  sourceSha256: string;
  attachmentBindingSha256: string;
  packageSha256: string;
  attachmentCount: number;
}

const SHA256_RE = /^[0-9a-f]{64}$/;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalFacts(photos: Pos010PhotoAttachmentInput[]): Pos010PhotoAttachmentFact[] {
  return photos
    .map((photo) => ({ ...photo.fact }))
    .sort((a, b) =>
      a.attemptDate.localeCompare(b.attemptDate) ||
      a.serviceEventId.localeCompare(b.serviceEventId) ||
      a.evidenceId.localeCompare(b.evidenceId));
}

export function pos010AttachmentBindingSha256(photos: Pos010PhotoAttachmentInput[]): string {
  const text = JSON.stringify({
    schemaVersion: POS010_ATTACHMENT_SCHEMA_VERSION,
    formVersion: POS010_FORM_VERSION,
    facts: canonicalFacts(photos),
  });
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function wrap(text: string, width = 94): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return ['—'];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) { current = word; continue; }
    if (`${current} ${word}`.length <= width) current = `${current} ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function validatePhotoAttachment(item: Pos010PhotoAttachmentInput): void {
  const fact = item.fact;
  if (fact.captureClassification !== 'CONTEMPORANEOUS_CAMERA_INTENT') {
    throw new Error('pos010PhotographicEvidence: supplemental or legacy files are not stamped-photo attachments');
  }
  if (Number.isNaN(Date.parse(fact.serverReceivedAt))) throw new Error('pos010PhotographicEvidence: server receipt timestamp is invalid');
  if (!SHA256_RE.test(fact.originalSha256) || !SHA256_RE.test(fact.stampedDerivativeSha256)) {
    throw new Error('pos010PhotographicEvidence: exact SHA-256 bindings are required');
  }
  if (sha256(item.stampedDerivativePdfBytes) !== fact.stampedDerivativeSha256) {
    throw new Error('pos010PhotographicEvidence: stamped derivative bytes do not match the frozen SHA-256');
  }
  if (fact.geoStatus === 'CAPTURED') {
    if (fact.latitude == null || !Number.isFinite(fact.latitude) || fact.latitude < -90 || fact.latitude > 90) {
      throw new Error('pos010PhotographicEvidence: captured latitude is invalid');
    }
    if (fact.longitude == null || !Number.isFinite(fact.longitude) || fact.longitude < -180 || fact.longitude > 180) {
      throw new Error('pos010PhotographicEvidence: captured longitude is invalid');
    }
    if (fact.accuracyMeters == null || !Number.isFinite(fact.accuracyMeters) || fact.accuracyMeters < 0) {
      throw new Error('pos010PhotographicEvidence: captured accuracy is invalid');
    }
  } else if (fact.latitude != null || fact.longitude != null || fact.accuracyMeters != null) {
    throw new Error('pos010PhotographicEvidence: non-captured GPS status cannot carry coordinates');
  }
}

function factLines(fact: Pos010PhotoAttachmentFact): string[] {
  const gps = fact.geoStatus === 'CAPTURED'
    ? `${fact.latitude?.toFixed(6)}, ${fact.longitude?.toFixed(6)} +/- ${fact.accuracyMeters?.toFixed(2)} m (${fact.geoSource ?? 'UNKNOWN_SOURCE'})`
    : `${fact.geoStatus} — no coordinates recorded`;
  return [
    `Service event: ${fact.serviceEventId}`,
    `Attempt date / method: ${fact.attemptDate} / ${fact.method}`,
    `Evidence: ${fact.evidenceId}`,
    `Capture classification: ${fact.captureClassification}`,
    `Browser capture timestamp: ${fact.captureClientAt ?? 'not recorded'}`,
    `Server receipt timestamp: ${fact.serverReceivedAt}`,
    `GPS/provenance: ${gps}`,
    `Original SHA-256: ${fact.originalSha256}`,
    `Stamped derivative SHA-256: ${fact.stampedDerivativeSha256}`,
    `Stamp schema: ${fact.stampSchemaVersion}`,
    `Exact binding: RiskPath ${fact.riskpathRecordId} / Created Notice ${fact.createdNoticeArtifactId}`,
    `Exception: ${fact.exceptionKind ?? 'none'}`,
    `Explanation: ${fact.exceptionExplanation?.trim() || 'none'}`,
    `Rendered stamp values: ${fact.stampText.replace(/\n/g, ' | ')}`,
  ];
}

export async function generatePos010PhotographicEvidencePackage(input: {
  officialPos010Bytes: Uint8Array;
  photos: Pos010PhotoAttachmentInput[];
}): Promise<Pos010PackageResult> {
  if (input.officialPos010Bytes.byteLength < 1) throw new Error('pos010PhotographicEvidence: official POS-010 bytes are required');
  if (input.photos.length < 1) throw new Error('pos010PhotographicEvidence: at least one photographic-evidence attachment is required');

  input.photos.forEach(validatePhotoAttachment);
  const sourceSha256 = sha256(input.officialPos010Bytes);
  const attachmentBindingSha256 = pos010AttachmentBindingSha256(input.photos);
  const doc = await PDFDocument.load(input.officialPos010Bytes, { updateMetadata: false });
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sorted = [...input.photos].sort((a, b) =>
    a.fact.attemptDate.localeCompare(b.fact.attemptDate) ||
    a.fact.serviceEventId.localeCompare(b.fact.serviceEventId) ||
    a.fact.evidenceId.localeCompare(b.fact.evidenceId));

  for (let index = 0; index < sorted.length; index++) {
    const item = sorted[index];
    const page = doc.addPage([612, 792]);
    page.drawText('SUPPLEMENTAL PHOTOGRAPHIC EVIDENCE ATTACHMENT — POS-010', {
      x: 36, y: 748, size: 11, font: bold, color: rgb(0.05, 0.05, 0.05),
    });
    page.drawText(`Form version: ${POS010_FORM_VERSION} | Attachment ${index + 1} of ${sorted.length}`, {
      x: 36, y: 730, size: 8.5, font: regular, color: rgb(0.15, 0.15, 0.15),
    });
    page.drawText('SPARE-ready Preview attachment only; this package does not determine service legality or sufficiency.', {
      x: 36, y: 714, size: 8, font: regular, color: rgb(0.15, 0.15, 0.15),
    });
    page.drawText(`Attachment binding SHA-256: ${attachmentBindingSha256}`, {
      x: 36, y: 698, size: 7.5, font: regular, color: rgb(0.15, 0.15, 0.15),
    });

    let y = 675;
    for (const raw of factLines(item.fact)) {
      for (const line of wrap(raw)) {
        page.drawText(line, { x: 42, y, size: 8.3, font: regular, color: rgb(0.05, 0.05, 0.05), maxWidth: 528 });
        y -= 13;
        if (y < 54) throw new Error('pos010PhotographicEvidence: attachment fact text exceeded deterministic page budget');
      }
      y -= 3;
    }

    const derivativeDoc = await PDFDocument.load(item.stampedDerivativePdfBytes, { updateMetadata: false });
    if (derivativeDoc.getPageCount() < 1) throw new Error('pos010PhotographicEvidence: stamped derivative PDF has no page');
    const [derivativePage] = await doc.copyPages(derivativeDoc, [0]);
    doc.addPage(derivativePage);
  }

  const bytes = await doc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  return {
    bytes,
    formVersion: POS010_FORM_VERSION,
    sourceSha256,
    attachmentBindingSha256,
    packageSha256: sha256(bytes),
    attachmentCount: sorted.length,
  };
}
