/**
 * packetCopy — RiskPath(TM) Connected Forms, Phase 1 copy + configuration.
 *
 * TENANT-FACE LOCKED STRINGS + GATE — per the broker determination
 * `docs/compliance/tenant_face_additions_review_packet_2026-06-11_broker_determination.md`:
 *  - §6(a): the served notice carries ONLY the TENANT SERVICE COPY label in
 *    Phase 1, rendered outside the formal notice body, neutral styling.
 *  - §6(c): the THREE tenant footer strings below are approved VERBATIM and
 *    are locked constants. Any change requires a fresh review packet. The
 *    optional fourth line was declined by the broker (2026-06-11).
 *  - §6(d): NO QR (real or placeholder) renders on a served copy in Phase 1.
 *    TENANT_QR_FOOTER_ENABLED stays false. Do not flip it without satisfying
 *    the Phase 2 gate (§6(e): Version A destination content live and
 *    reviewed under a fresh packet, all five conditions met).
 *
 * Everything else here is product copy from the RiskPath feature spec
 * (2026-06-10), wired verbatim. No California legal wording is authored in
 * this module. Exact-equality pins live in packetCopy.test.ts.
 */

// --- Tenant-face gate (§6(d)) — DO NOT FLIP without the Phase 2 packet -----
export const TENANT_QR_FOOTER_ENABLED = false as boolean;

// --- LOCKED tenant footer strings (§6(c)) — verbatim only -------------------
export const TENANT_QR_FOOTER_TITLE = 'General Information About This Notice';
export const TENANT_QR_FOOTER_BODY = 'Scan to learn more';
export const TENANT_QR_FOOTER_DISCLAIMER =
  'OwnerPilot does not represent you or your landlord. This information is not legal advice.';

// --- Page labels (spec, verbatim) -------------------------------------------
export const PAGE_LABELS = {
  tenant: 'TENANT SERVICE COPY',
  owner: 'OWNER RECORD COPY — DO NOT SERVE',
  serviceLog: 'SERVICE LOG / PROOF OF SERVICE — OWNER RECORD',
  checklist: 'OWNERPILOT SERVICE CHECKLIST — OWNER RECORD',
} as const;

// --- Print options screen (spec, verbatim) ----------------------------------
export const PRINT_OPTIONS_TITLE = 'Your printable packet is ready';
export const PRINT_OPTIONS_SUBTITLE =
  'Choose what you want to print. The tenant service copy is the only copy intended for delivery to the tenant.';

export const PRINT_CARDS = {
  tenant: { title: 'Print Tenant Service Copy', description: 'For delivery to the tenant.' },
  owner: {
    title: 'Print Owner Record Packet',
    description: 'Keep this copy for your records. Do not serve.',
  },
  serviceLog: {
    title: 'Print Service Log / Proof of Service',
    description: 'Use this to track service attempts, mailing steps, and completion.',
  },
  full: {
    title: 'Print Full Packet',
    description: 'Includes tenant copy, owner record copy, service log, and checklist.',
  },
} as const;

export const FULL_PACKET_MODAL = {
  title: 'Confirm packet use',
  body:
    'The tenant service copy is the only document intended for delivery to the tenant. ' +
    'Keep the owner record copy, service log, and checklist for your records.',
  confirmLabel: 'Continue to Full Packet',
  cancelLabel: 'Go Back',
} as const;

// --- Cover sheet (spec, verbatim) --------------------------------------------
export const COVER_SHEET = {
  header: 'OwnerPilot.AI Printable Packet',
  subheader: 'This packet contains separate copies for tenant delivery and owner records.',
  boxTitle: 'Your packet includes:',
  items: [
    { name: 'Tenant Service Copy', instruction: 'Print and serve this copy on the tenant.' },
    { name: 'Owner Record Copy', instruction: 'Keep this copy for your records. Do not serve.' },
    { name: 'Service Log / Proof of Service', instruction: 'Complete this after service.' },
    {
      name: 'OwnerPilot Service Checklist',
      instruction: 'Use this to track what still needs to be done.',
    },
  ],
  importantNote:
    'Only the page marked \u201CTENANT SERVICE COPY\u201D is intended for delivery to the tenant.',
} as const;

// --- Checklist (spec, verbatim) ----------------------------------------------
export const CHECKLIST_TITLE = 'RiskPath\u2122 Follow-Up Checklist';
export const CHECKLIST_ITEMS = [
  'Notice/form generated',
  'Tenant service copy printed',
  'First service attempt scheduled',
  'Service attempt logged',
  'Mailing required? Yes / No',
  'Mailing date logged',
  'Service record complete',
  'Final packet downloaded',
] as const;

// --- Owner footer (spec, verbatim; QR is a Phase 1 placeholder) --------------
export const OWNER_FOOTER = {
  title: 'OwnerPilot RiskPath\u2122 Connected Form',
  line1: 'Scan to continue this RiskPath\u2122',
  line2: 'Resume your service log, reminders, and next steps.',
  powered: 'Powered by OwnerPilot.AI',
  tagline: 'Every form stays connected to the next step.',
  qrPlaceholder: 'QR\u2014available in a future update',
} as const;

// --- Packet configuration -----------------------------------------------------
export type PacketType =
  | 'tenant_service_copy'
  | 'owner_record_copy'
  | 'service_log'
  | 'owner_checklist'
  | 'full_packet';

export interface PacketConfig {
  label: string;
  intendedAudience: 'tenant' | 'owner';
  includeOwnerMetadata: boolean;
  includeServiceLog: boolean;
  /** Phase 1: structural flag only; actual render additionally requires
   *  TENANT_QR_FOOTER_ENABLED (§6(d)), which is false. */
  includePublicInfoQr: boolean;
  includeSecureOwnerQr: boolean;
}

export function getPacketConfig(packetType: Exclude<PacketType, 'full_packet'>): PacketConfig {
  switch (packetType) {
    case 'tenant_service_copy':
      return {
        label: PAGE_LABELS.tenant,
        intendedAudience: 'tenant',
        includeOwnerMetadata: false,
        includeServiceLog: false,
        includePublicInfoQr: true,
        includeSecureOwnerQr: false,
      };
    case 'owner_record_copy':
      return {
        label: PAGE_LABELS.owner,
        intendedAudience: 'owner',
        includeOwnerMetadata: true,
        includeServiceLog: false,
        includePublicInfoQr: false,
        includeSecureOwnerQr: true,
      };
    case 'service_log':
      return {
        label: PAGE_LABELS.serviceLog,
        intendedAudience: 'owner',
        includeOwnerMetadata: true,
        includeServiceLog: true,
        includePublicInfoQr: false,
        includeSecureOwnerQr: true,
      };
    case 'owner_checklist':
      return {
        label: PAGE_LABELS.checklist,
        intendedAudience: 'owner',
        includeOwnerMetadata: true,
        includeServiceLog: false,
        includePublicInfoQr: false,
        includeSecureOwnerQr: true,
      };
    default: {
      const _exhaustive: never = packetType;
      throw new Error(`Unknown packet type: ${_exhaustive as string}`);
    }
  }
}

// Service-method display labels for owner-record data echoes (product copy;
// mirrors the intake labels).
export const PACKET_SERVICE_METHOD_LABELS: Record<string, string> = {
  personal: 'In person (personal service)',
  substituted: 'Substituted service (someone else at the property)',
  post_and_mail: 'Post and mail (posted at property + mailed)',
};
