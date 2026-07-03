// lib/produce/artifactFilename.ts
// Lane W5 (omnibus §3.6, broker ruling 2026-07-03) — TWO co-located filename conventions:
//
//   Convention A — BROKER FILING (this module, NEW): <compact_address>-<unit>-<TenantName>_<descriptor>_<date>.<ext>
//     e.g. 5537LaMirada-202-CliftonAlexander_3Day_Notice_2026-06-29.pdf. Audience: broker managing a flat
//     workspace of case files. Applied to broker filing artifacts (packet, cover sheet, POS, exhibits, receipts…).
//
//   Convention B — OWNER-FACING download (existing buildNoticePdfFilename, re-exported here as
//     generateOwnerDownloadFilename): OwnerPilot_<Notice-Type>_<Tenant>_<Address>_<date>.pdf. KEEP AS-IS — do not
//     sweep, do not drop the OwnerPilot_ prefix. For the shared notice PDF, the physical file uses Convention A and
//     the owner download endpoint sets Content-Disposition filename to Convention B at response time.
//
// Pure util — no PII stored, no legal text touched.

// Convention B is co-located per §3.6 (import + re-export; output is NOT rewritten).
export { buildNoticePdfFilename as generateOwnerDownloadFilename } from './noticePdfFilename';

/** Common US street-type suffixes dropped from the compact street (per the ratified "5537 La Mirada Ave" → "5537LaMirada"). */
const STREET_SUFFIXES = new Set([
  'ave', 'avenue', 'st', 'street', 'blvd', 'boulevard', 'rd', 'road', 'dr', 'drive', 'ln', 'lane', 'way',
  'ct', 'court', 'pl', 'place', 'ter', 'terrace', 'cir', 'circle', 'pkwy', 'parkway', 'hwy', 'highway',
  'sq', 'square', 'trl', 'trail', 'aly', 'alley', 'row', 'walk', 'path', 'loop',
]);

/** Keep letters/digits only; used to compact a name segment (drops spaces + punctuation, preserves case). */
function compact(raw: string): string {
  return (raw ?? '').replace(/[^A-Za-z0-9]+/g, '');
}

/**
 * Compact street = street number + street-name words (suffix + directionals dropped), no spaces/punctuation.
 * "5537 La Mirada Ave, Apt 202, Los Angeles CA 90029" → "5537LaMirada".
 */
function compactStreet(propertyAddress: string): string {
  const streetLine = (propertyAddress ?? '').split(',')[0]?.trim() ?? '';
  if (!streetLine) return 'Property';
  const tokens = streetLine.split(/\s+/).filter(Boolean);
  // Drop a trailing street suffix (Ave/St/Blvd/…). Keep number + street-name words.
  while (tokens.length > 1 && STREET_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase().replace(/\.$/, ''))) {
    tokens.pop();
  }
  const out = tokens.map(compact).join('');
  return out || 'Property';
}

/** ISO date passthrough (YYYY-MM-DD); tolerant of a full timestamp. */
function isoDate(date: string): string {
  const m = (date ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : (date ?? '').trim();
}

export interface ArtifactFilenameInput {
  property_address: string;   // full address; only the street line is used
  unit_number?: string;       // "202"
  tenant_last_name: string;   // "Alexander" (or full entity name for corporate)
  tenant_first_name?: string; // "Clifton" (omit/empty for corporate or et-al)
  descriptor: string;         // "3Day_Notice" | "Proof_of_Service_3Day_Notice" | "Packet_Manifest" | …
  date: string;               // ISO date (service_date or filing_date per artifact)
  extension: string;          // "pdf" | "md" | "jpg" | "json"
  et_al?: boolean;            // multiple tenants → "<LastName>EtAl" (first name dropped)
}

/** Build the ratified Convention-A broker-filing filename. See module header. */
export function generateBrokerFilingFilename(input: ArtifactFilenameInput): string {
  const street = compactStreet(input.property_address);

  const unit = compact(input.unit_number ?? '');
  const addrUnit = unit ? `${street}-${unit}` : street;

  // Tenant segment: FirstLast; corporate collapses to the entity name; et-al uses last name + "EtAl".
  const last = compact(input.tenant_last_name);
  const first = compact(input.tenant_first_name ?? '');
  let tenant: string;
  if (input.et_al) tenant = `${last || 'Tenant'}EtAl`;
  else tenant = `${first}${last}` || 'Tenant';

  const descriptor = (input.descriptor ?? '').trim().replace(/\s+/g, '_');
  const date = isoDate(input.date);
  const ext = (input.extension ?? '').replace(/^\.+/, '');

  return `${addrUnit}-${tenant}_${descriptor}_${date}.${ext}`;
}
