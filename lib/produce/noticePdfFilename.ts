/**
 * buildNoticePdfFilename — the approved download/print filename for a notice PDF.
 *
 * Format:
 *   OwnerPilot_3-Day-Notice_<Tenant>_<Street-Address>[_<Unit>]_<YYYY-MM-DD>.pdf
 *
 * Segments are joined with underscores; words within a segment use hyphens.
 * Only street number / name / suffix / unit are used from the address — never
 * city, state, zip, or country. Multiple tenants collapse to the first name
 * plus `-Et-Al`. The landlord/entity name is intentionally omitted.
 *
 * This is a presentation/util helper only — it does not touch any legal text.
 */

export interface NoticePdfFilenameInput {
  /** Raw tenant names (in listed order). */
  tenantNames?: string[];
  /** Raw property address as entered (may include city/state/zip/country). */
  streetAddress?: string;
  /** Raw unit/apt/suite value (bare value or label + value). */
  unit?: string;
  /** Production / generated date. Defaults to today when omitted. */
  date?: Date | string;
}

/** Slugify a single segment: keep letters/digits, hyphenate the rest, tidy up. */
function slug(raw: string): string {
  return raw
    .replace(/['\u2018\u2019\u02BC]/g, '') // drop apostrophes (O'Brien -> OBrien)
    .replace(/[^A-Za-z0-9]+/g, '-')        // spaces, commas, periods, slashes, symbols -> '-'
    .replace(/-+/g, '-')                   // collapse duplicate hyphens
    .replace(/^-+|-+$/g, '');              // trim leading/trailing hyphens
}

const UNIT_LABELS: Array<[RegExp, string]> = [
  [/^(apartment|apt)\b\.?/i, 'Apt'],
  [/^(suite|ste)\b\.?/i, 'Suite'],
  [/^(unit)\b\.?/i, 'Unit'],
  [/^(room|rm)\b\.?/i, 'Room'],
  [/^(floor|fl)\b\.?/i, 'Floor'],
  [/^(building|bldg)\b\.?/i, 'Bldg'],
  [/^(ph|penthouse)\b\.?/i, 'PH'],
];

/** Format the unit segment, e.g. "3" -> "Unit-3", "Apt 320" -> "Apt-320". */
function unitSegment(rawUnit: string): string {
  let u = rawUnit.trim().replace(/^#\s*/, '');
  if (!u) return '';
  for (const [re, label] of UNIT_LABELS) {
    if (re.test(u)) {
      const rest = slug(u.replace(re, ''));
      return rest ? `${label}-${rest}` : label;
    }
  }
  const s = slug(u);
  return s ? `Unit-${s}` : '';
}

/** Local-time YYYY-MM-DD for a Date or pass-through validated date string. */
function isoDate(date?: Date | string): string {
  if (typeof date === 'string') {
    const m = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MAX_LEN = 120;

export function buildNoticePdfFilename(input: NoticePdfFilenameInput): string {
  const names = (input.tenantNames ?? []).map((n) => (n ?? '').trim()).filter(Boolean);
  let tenantSlug = names.length ? slug(names[0]) : '';
  if (!tenantSlug) tenantSlug = 'Tenant';
  if (names.length > 1) tenantSlug += '-Et-Al';

  // Street only — drop city/state/zip/country (everything after the first comma).
  const streetRaw = (input.streetAddress ?? '').split(',')[0] ?? '';
  const addressSlug = slug(streetRaw) || 'Property';

  const unitSlug = unitSegment(input.unit ?? '');
  const date = isoDate(input.date);

  const parts = ['OwnerPilot_3-Day-Notice', tenantSlug, addressSlug];
  if (unitSlug) parts.push(unitSlug);
  parts.push(date);
  let name = parts.join('_');

  // Keep it reasonable: prefer trimming the (least-essential) address slug; if
  // still over, hard-truncate so the final name never exceeds MAX_LEN.
  if (name.length + 4 > MAX_LEN) {
    const fixed = name.length + 4 - addressSlug.length;
    const room = Math.max(0, MAX_LEN - 4 - fixed);
    const trimmedAddr = addressSlug.slice(0, room).replace(/-+$/g, '');
    const p2 = ['OwnerPilot_3-Day-Notice', tenantSlug];
    if (trimmedAddr) p2.push(trimmedAddr);
    if (unitSlug) p2.push(unitSlug);
    p2.push(date);
    name = p2.join('_');
  }
  if (name.length + 4 > MAX_LEN) {
    name = name.slice(0, MAX_LEN - 4).replace(/[-_]+$/g, '');
  }
  return `${name}.pdf`;
}
