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
  ownerDetails: 'OWNER RECORD DETAILS — DO NOT SERVE',
  proofOfService: 'PROOF OF SERVICE — OWNER RECORD',
  serviceAttempt: 'SERVICE ATTEMPT RECORD — OWNER RECORD',
  serviceLog: 'SERVICE LOG / PROOF OF SERVICE — OWNER RECORD',
  checklist: 'OWNERPILOT SERVICE CHECKLIST — OWNER RECORD',
  tenantContinued: 'TENANT SERVICE COPY — CONTINUED',
  ownerContinued: 'OWNER RECORD COPY — DO NOT SERVE — CONTINUED',
} as const;

// --- Print options screen (spec, verbatim) ----------------------------------
export const PRINT_OPTIONS_TITLE = 'Your printable packet is ready';
export const PRINT_OPTIONS_SUBTITLE =
  'Choose what you want to print. The tenant service copy is the only copy intended for delivery to the tenant.';

// Browser-print guidance (Option A) — window.print() cannot suppress the
// browser's own header/footer; this tells the user how to get a clean PDF.
export const PRINT_DIALOG_HINT =
  'For a clean PDF, turn off \u201CHeaders and footers\u201D in the print dialog before saving.';
export const PRINT_DIALOG_HINT_DETAIL =
  'Browser print settings may add the URL, date, or page count unless headers and footers are turned off.';

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
  eyebrow: 'Broker-Prepared Notice Packet',
  header: '3-Day Notice Packet',
  subtitle: 'California Three-Day Notice to Pay Rent or Quit',
  boxTitle: 'This packet includes',
  items: [
    { name: 'Tenant Service Copy', instruction: 'The only notice copy intended for delivery to the tenant.' },
    { name: 'Owner Record Copy', instruction: 'Keep this copy for your records. Do not serve.' },
    { name: 'Owner Record Details', instruction: 'A summary of the notice details and RiskPath\u2122 follow-up.' },
    { name: 'Proof of Service', instruction: 'Complete after the notice has actually been served.' },
    { name: 'Service Attempt Record', instruction: 'Track attempts, mailing, dates, and server notes.' },
    { name: 'RiskPath\u2122 Follow-Up Checklist', instruction: 'Track what still needs to be done after printing.' },
  ],
  importantTitle: 'Important',
  importantNote:
    'Only pages marked TENANT SERVICE COPY are intended for delivery to the tenant. Pages marked OWNER RECORD or DO NOT SERVE are for the owner\u2019s records only.',
  footer: 'OwnerPilot.AI \u00B7 Broker-prepared workflow \u00B7 Not legal advice',
} as const;

// --- Checklist (spec, verbatim) ----------------------------------------------
export const CHECKLIST_TITLE = 'RiskPath\u2122 Follow-Up Checklist';
export const CHECKLIST_GROUPS = [
  {
    name: 'Before Service',
    items: ['Tenant service copy printed', 'Owner record copy saved', 'First service attempt scheduled'],
  },
  {
    name: 'After Each Attempt',
    items: ['Service attempt logged', 'Mailing required? Yes / No', 'Mailing date logged'],
  },
  {
    name: 'After Service',
    items: ['Proof of Service completed', 'Final packet downloaded', 'RiskPath\u2122 record updated'],
  },
] as const;

// Owner Record Details \u201CNext Step\u201D checklist (page 4, spec verbatim).
export const NEXT_STEP_ITEMS = [
  'Print tenant service copy',
  'Serve tenant service copy',
  'Log the service attempt',
  'Complete Proof of Service after service',
] as const;

// --- Owner footer (clean RiskPath follow-up; no QR until a real QR ships) -----
// Task 6 (broker review 2026-06-18): the dashed "RiskPath QR coming soon"
// placeholder is removed from production. Owner pages show this follow-up text
// instead. When a real owner-facing QR ships, replace the block — never a stub.
export const OWNER_FOOTER = {
  title: 'OwnerPilot RiskPath\u2122 Follow-Up',
  body: 'Use OwnerPilot to resume this notice record, log service attempts, complete Proof of Service, and track next steps.',
  powered: 'Powered by OwnerPilot.AI',
  tagline: 'Every form stays connected to the next step.',
} as const;

// Owner-page payment-method display labels (owner summary only).
export const PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = {
  in_person: 'In Person',
  by_mail: 'By Mail',
  bank_deposit: 'Bank Deposit',
  eft: 'Electronic Funds Transfer',
};

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
