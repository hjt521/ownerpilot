// lib/produce/packetManifest.ts
// Lane W3 (omnibus §3.4) — packet-artifact disposition. From the Clifton live filing: only the 3-day/5-day notice
// PDF is UPLOADED to the LAHD EFS portal; cover sheet / POS / RTC EN+ES / exhibits are RETAINED as landlord
// records (the cover sheet is additionally required for mail / in-person filing). This classifies each artifact
// so a packet-manifest generator (not yet built in-app) can tag rows + split into the three sections.

export interface ArtifactDisposition {
  upload_to_lahd_online: boolean;
  retain_landlord_records: boolean;
  mail_or_in_person_only: boolean;
}

/** Canonical packet-artifact kinds. */
export type ArtifactKind =
  | 'notice_pdf'        // the served 3-day / 5-day notice PDF
  | 'cover_sheet'
  | 'proof_of_service'
  | 'rtc_english'
  | 'rtc_spanish'
  | 'exhibit';

export const ARTIFACT_DISPOSITIONS: Record<ArtifactKind, ArtifactDisposition> = {
  // The ONLY artifact uploaded to the EFS portal online.
  notice_pdf:       { upload_to_lahd_online: true,  retain_landlord_records: true,  mail_or_in_person_only: false },
  // Retained; additionally required when filing by mail / in person (not needed for online filing).
  cover_sheet:      { upload_to_lahd_online: false, retain_landlord_records: true,  mail_or_in_person_only: true },
  proof_of_service: { upload_to_lahd_online: false, retain_landlord_records: true,  mail_or_in_person_only: false },
  rtc_english:      { upload_to_lahd_online: false, retain_landlord_records: true,  mail_or_in_person_only: false },
  rtc_spanish:      { upload_to_lahd_online: false, retain_landlord_records: true,  mail_or_in_person_only: false },
  exhibit:          { upload_to_lahd_online: false, retain_landlord_records: true,  mail_or_in_person_only: false },
};

/** Best-effort map from a free-text descriptor/filename to a canonical artifact kind (null if unrecognized). */
export function artifactKindFromDescriptor(descriptor: string): ArtifactKind | null {
  const s = descriptor.toLowerCase();
  if (/cover[\s_-]*sheet/.test(s)) return 'cover_sheet';
  if (/proof[\s_-]*of[\s_-]*service|(^|[^a-z])pos([^a-z]|$)/.test(s)) return 'proof_of_service';
  if (/rtc|right[\s_-]*to[\s_-]*counsel/.test(s)) return /spanish|espanol|_es(\b|_)/.test(s) ? 'rtc_spanish' : 'rtc_english';
  if (/exhibit|posting|photo/.test(s)) return 'exhibit';
  if (/notice/.test(s)) return 'notice_pdf';
  return null;
}

/** Disposition for a descriptor; unknown descriptors default to retain-only (never auto-upload something unknown). */
export function classifyArtifact(descriptor: string): ArtifactDisposition {
  const kind = artifactKindFromDescriptor(descriptor);
  return kind
    ? ARTIFACT_DISPOSITIONS[kind]
    : { upload_to_lahd_online: false, retain_landlord_records: true, mail_or_in_person_only: false };
}

export interface ManifestSections {
  uploadToLahdOnline: string[];
  retainInRecords: string[];
  mailOrInPersonOnly: string[];
}

/** Split a list of artifact descriptors into the three §3.4 sections by their disposition. */
export function buildManifestSections(descriptors: string[]): ManifestSections {
  const out: ManifestSections = { uploadToLahdOnline: [], retainInRecords: [], mailOrInPersonOnly: [] };
  for (const d of descriptors) {
    const disp = classifyArtifact(d);
    if (disp.upload_to_lahd_online) out.uploadToLahdOnline.push(d);
    if (disp.retain_landlord_records) out.retainInRecords.push(d);
    if (disp.mail_or_in_person_only) out.mailOrInPersonOnly.push(d);
  }
  return out;
}
