// lib/riskpath/spareUdServiceContract.ts
// Preview-only SPARE readiness contract for future CCP § 417.10 photographic-evidence support.
// This is not a currently active 2026 compliance gate and does not determine legal sufficiency.

import type { ServiceEvidenceCaptureClassification } from './stampedServiceEvidence';
import type { ServiceEvidenceGeoStatus } from './durableService';

export const SPARE_UD_PHOTO_OPERATIVE_DATE = '2027-01-01' as const;

export type SpareUdServiceMethod = 'CCP_415_10' | 'CCP_415_20' | 'CCP_415_45';
export type SpareUdSiteKind = 'EFFECTED_SITE' | 'DOOR' | 'ENTRANCE';
export type SpareUdExceptionKind = 'INACCESSIBLE_DOOR' | 'NO_SIGNAL' | 'SAFETY';
export type CaptureAttemptRelation = 'BEFORE_ATTEMPT' | 'SAME_INSTANT' | 'AFTER_ATTEMPT';

export interface SpareUdPhotoEvidence {
  evidenceId: string;
  captureClassification: ServiceEvidenceCaptureClassification;
  geoStatus: ServiceEvidenceGeoStatus;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  stampedDerivativeSha256: string | null;
  captureClientAt: string | null;
}

export interface SpareUdSiteEvidence {
  siteId: string;
  siteKind: SpareUdSiteKind;
  photos: SpareUdPhotoEvidence[];
  exception?: {
    kind: SpareUdExceptionKind;
    explanation: string;
  } | null;
}

export interface SpareUdAttemptReadinessInput {
  attemptId: string;
  method: SpareUdServiceMethod;
  attemptAt: string;
  sites: SpareUdSiteEvidence[];
}

export interface SpareUdPhotoTiming {
  evidenceId: string;
  relation: CaptureAttemptRelation;
  offsetMilliseconds: number;
}

export interface SpareUdReadinessResult {
  contract: 'SPARE_UD_SERVICE_PHOTO_V1';
  operativeDate: typeof SPARE_UD_PHOTO_OPERATIVE_DATE;
  activeComplianceGate: false;
  ready: boolean;
  defects: string[];
  timing: SpareUdPhotoTiming[];
}

const SHA256_RE = /^[0-9a-f]{64}$/;
const METHODS = new Set<SpareUdServiceMethod>(['CCP_415_10', 'CCP_415_20', 'CCP_415_45']);
const SITE_KINDS = new Set<SpareUdSiteKind>(['EFFECTED_SITE', 'DOOR', 'ENTRANCE']);
const EXCEPTION_KINDS = new Set<SpareUdExceptionKind>(['INACCESSIBLE_DOOR', 'NO_SIGNAL', 'SAFETY']);

function timestamp(value: string, label: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`spareUdServiceContract: ${label} must be an ISO timestamp`);
  return ms;
}

export function relateCaptureToAttempt(attemptAt: string, captureAt: string): Omit<SpareUdPhotoTiming, 'evidenceId'> {
  const attempt = timestamp(attemptAt, 'attemptAt');
  const capture = timestamp(captureAt, 'captureAt');
  const offsetMilliseconds = capture - attempt;
  return {
    relation: offsetMilliseconds < 0 ? 'BEFORE_ATTEMPT' : offsetMilliseconds > 0 ? 'AFTER_ATTEMPT' : 'SAME_INSTANT',
    offsetMilliseconds,
  };
}

function explanation(site: SpareUdSiteEvidence): string | null {
  const value = site.exception?.explanation?.trim() ?? '';
  return value ? value : null;
}

export function evaluateSpareUdAttemptReadiness(input: SpareUdAttemptReadinessInput): SpareUdReadinessResult {
  const defects: string[] = [];
  const timing: SpareUdPhotoTiming[] = [];
  timestamp(input.attemptAt, 'attemptAt');
  if (!input.attemptId?.trim()) defects.push('attempt_id_required');
  if (!METHODS.has(input.method)) defects.push('supported_service_method_required');

  if (input.sites.length < 1) defects.push('attempt_requires_at_least_one_affected_site');

  const seenSites = new Set<string>();
  const seenEvidence = new Set<string>();
  for (const site of input.sites) {
    if (!site.siteId?.trim()) defects.push('site_id_required');
    else if (seenSites.has(site.siteId)) defects.push(`${site.siteId}:duplicate_site_id`);
    else seenSites.add(site.siteId);
    if (!SITE_KINDS.has(site.siteKind)) defects.push(`${site.siteId}:supported_site_kind_required`);
    if (site.exception && !EXCEPTION_KINDS.has(site.exception.kind)) defects.push(`${site.siteId}:supported_exception_kind_required`);
    const exceptionText = explanation(site);
    if (site.exception && !exceptionText) defects.push(`${site.siteId}:exception_requires_exact_explanation`);

    if (site.exception?.kind === 'INACCESSIBLE_DOOR' && site.siteKind !== 'ENTRANCE') {
      defects.push(`${site.siteId}:inaccessible_door_requires_entrance_site_semantics`);
    }

    const safetyExcused = site.exception?.kind === 'SAFETY' && !!exceptionText;
    if (!safetyExcused && site.photos.length < 1) {
      defects.push(`${site.siteId}:photo_required_or_safety_exception_required`);
    }

    for (const photo of site.photos) {
      if (!photo.evidenceId?.trim()) defects.push(`${site.siteId}:evidence_id_required`);
      else if (seenEvidence.has(photo.evidenceId)) defects.push(`${site.siteId}:${photo.evidenceId}:duplicate_evidence_id`);
      else seenEvidence.add(photo.evidenceId);
      if (photo.captureClassification !== 'CONTEMPORANEOUS_CAMERA_INTENT') {
        defects.push(`${site.siteId}:${photo.evidenceId}:existing_or_legacy_file_does_not_count_as_contemporaneous_capture`);
      }
      if (!photo.captureClientAt) {
        defects.push(`${site.siteId}:${photo.evidenceId}:capture_timestamp_required`);
      } else {
        const relation = relateCaptureToAttempt(input.attemptAt, photo.captureClientAt);
        timing.push({ evidenceId: photo.evidenceId, ...relation });
      }
      if (!photo.stampedDerivativeSha256 || !SHA256_RE.test(photo.stampedDerivativeSha256)) {
        defects.push(`${site.siteId}:${photo.evidenceId}:immutable_stamped_derivative_required`);
      }

      if (photo.geoStatus !== 'CAPTURED' && (photo.latitude != null || photo.longitude != null || photo.accuracyMeters != null)) {
        defects.push(`${site.siteId}:${photo.evidenceId}:noncaptured_geo_must_not_carry_coordinates`);
      }

      if (photo.geoStatus === 'CAPTURED') {
        if (photo.latitude == null || !Number.isFinite(photo.latitude) || photo.latitude < -90 || photo.latitude > 90) {
          defects.push(`${site.siteId}:${photo.evidenceId}:captured_latitude_required`);
        }
        if (photo.longitude == null || !Number.isFinite(photo.longitude) || photo.longitude < -180 || photo.longitude > 180) {
          defects.push(`${site.siteId}:${photo.evidenceId}:captured_longitude_required`);
        }
        if (photo.accuracyMeters == null || !Number.isFinite(photo.accuracyMeters) || photo.accuracyMeters < 0) {
          defects.push(`${site.siteId}:${photo.evidenceId}:captured_accuracy_required`);
        }
      } else if (photo.geoStatus === 'UNAVAILABLE' && site.exception?.kind === 'NO_SIGNAL' && exceptionText) {
        // Factual no-signal explanation preserves the missing-coordinate state without fabrication.
      } else if (safetyExcused) {
        // Safety exception may preserve missing photo/GPS facts; it does not manufacture coordinates.
      } else {
        defects.push(`${site.siteId}:${photo.evidenceId}:captured_coordinates_or_no_signal_explanation_required`);
      }
    }
  }

  return {
    contract: 'SPARE_UD_SERVICE_PHOTO_V1',
    operativeDate: SPARE_UD_PHOTO_OPERATIVE_DATE,
    activeComplianceGate: false,
    ready: defects.length === 0,
    defects,
    timing,
  };
}
