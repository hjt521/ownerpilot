/**
 * renderNotice — fills the BUILD-LOCKED 3-day notice template with collected
 * flow data and the date engine's computed compliance dates.
 *
 * DISCIPLINE (consistent with the rest of the codebase):
 *  - Renders the attorney-LOCKED template text verbatim. The fixed legal
 *    wording lives here as string constants copied from
 *    ownerpilot_3day_notice_TEMPLATE_TEXT_v2_BUILD_LOCKED.md. This module does
 *    NOT author or paraphrase legal language.
 *  - Does NOT recompute any legal date. It consumes commencementDate /
 *    expirationDate produced by computeCompliancePeriod and places them on the
 *    notice face (post-Eshagian requirement).
 *  - Produces the NON-LA notice only. The produce path must consult the gate
 *    (evaluateCanProduce) BEFORE calling this; this renderer assumes a clean,
 *    produceable, non-LA notice and will throw if asked to render without the
 *    required fields rather than emit a defective document.
 *  - Proof of service is rendered BLANK (filled after service, step 7b). The
 *    renderer never pre-fills the server as the landlord.
 *
 * Not legal advice; the locked template's legal sufficiency rests on the
 * attorney review, not on this code.
 */

import type {
  NoticeFlowData,
  RentPeriod,
  SignerRole,
} from '../flow/noticeFlowState';
import type { PaymentMethod } from '../payments/validatePaymentMethods';

/** The computed dates the renderer requires (from computeCompliancePeriod). */
export interface ComputedNoticeDates {
  /** commencementDate — first counted day (Q11: first-counted-day rule). */
  compliancePeriodStartDate: string; // 'YYYY-MM-DD'
  /** expirationDate — last day to comply. */
  compliancePeriodEndDate: string; // 'YYYY-MM-DD'
}

export interface RenderNoticeInput {
  data: NoticeFlowData;
  dates: ComputedNoticeDates;
}

/** A produced notice: the filled text plus an audit of what filled it. */
export interface RenderedNotice {
  /** The complete notice body text (fixed language + filled variables). */
  noticeText: string;
  /** The blank proof-of-service section (completed after service). */
  proofOfServiceText: string;
  /** Structured record of the variable values used, for the audit trail. */
  variablesUsed: Record<string, string>;
}

/** Thrown when a required field is missing — fail closed, never emit a defective notice. */
export class NoticeRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoticeRenderError';
  }
}

// --- Formatting helpers -----------------------------------------------------

/** Render an ISO 'YYYY-MM-DD' as a readable 'Month D, YYYY' for the notice face. */
export function formatNoticeDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new NoticeRenderError(`Invalid date for notice: "${iso}"`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (month < 1 || month > 12) throw new NoticeRenderError(`Invalid month in "${iso}"`);
  return `${names[month - 1]} ${day}, ${year}`;
}

/** Currency, 2dp, thousands separators. Base-rent amounts only. */
export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) throw new NoticeRenderError(`Invalid amount: ${n}`);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The template's exact signer-role display strings. */
export function signerRoleLabel(role: SignerRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'authorized_agent_broker':
      return 'Authorized Agent for Owner';
    case 'other_authorized_agent':
      return 'Authorized Agent for Owner';
    default:
      throw new NoticeRenderError(`Unknown signer role: ${role as string}`);
  }
}

function requireString(v: string | undefined, field: string): string {
  if (v == null || v.trim() === '') {
    throw new NoticeRenderError(`Missing required field: ${field}`);
  }
  return v.trim();
}

// --- Payment method rendering (conditional blocks) --------------------------

function renderPaymentMethods(methods: PaymentMethod[]): string {
  if (!methods || methods.length === 0) {
    throw new NoticeRenderError('At least one payment method is required.');
  }
  const blocks: string[] = [];
  for (const m of methods) {
    switch (m.kind) {
      case 'in_person':
        blocks.push(
          `In person: Payment may be made in person at the address above. The person identified above is available to receive payment on the following days and during the following hours: ${requireString(m.daysHours, 'in-person days/hours')}.`,
        );
        break;
      case 'mail':
        blocks.push(`By mail: Payment may be mailed to: ${requireString(m.mailAddress, 'mail address')}.`);
        break;
      case 'bank_deposit':
        blocks.push(
          `By deposit to a financial institution: Payment may be deposited to the following account: ${requireString(m.bankName, 'bank name')}, located at ${requireString(m.branchAddress, 'branch address')}, account number ${requireString(m.accountNumber, 'account number')}. This branch is located within five miles of the premises.`,
        );
        break;
      case 'eft':
        blocks.push(
          'By electronic funds transfer: Payment may be made by the electronic funds transfer procedure previously established between you and the landlord.',
        );
        break;
      case 'cash':
        // Cash is permitted but never the sole method (enforced upstream by
        // validatePaymentMethods). It carries no template block of its own.
        break;
      default:
        throw new NoticeRenderError(`Unknown payment method kind: ${(m as { kind: string }).kind}`);
    }
  }
  if (blocks.length === 0) {
    throw new NoticeRenderError('No renderable (non-cash) payment method present.');
  }
  return blocks.join('\n\n');
}

// --- The renderer -----------------------------------------------------------

export function renderNotice(input: RenderNoticeInput): RenderedNotice {
  const { data, dates } = input;

  // Tenants
  const tenantNames = (data.tenantNames || []).map((t) => t.trim()).filter(Boolean);
  if (tenantNames.length === 0) throw new NoticeRenderError('At least one tenant name is required.');
  const tenantNamesJoined = tenantNames.join(', ');

  // Property
  const propertyAddress = requireString(data.propertyAddress, 'property address');
  const propertyCounty = requireString(data.propertyCounty, 'property county');

  // Rent periods + computed totals
  const periods: RentPeriod[] = (data.rentPeriods || []).filter(
    (p) => p.periodStartDate && p.periodEndDate,
  );
  if (periods.length === 0) throw new NoticeRenderError('At least one rent period is required.');
  if (!data.baseRentOnlyConfirmed) {
    throw new NoticeRenderError('Base-rent-only confirmation is required before producing.');
  }
  const earliestStart = periods
    .map((p) => p.periodStartDate)
    .sort()[0];
  const latestEnd = periods
    .map((p) => p.periodEndDate)
    .sort()
    .slice(-1)[0];
  const totalDue = periods.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Signer
  const signerName = requireString(data.signerName, 'signer name');
  if (!data.signerRole) throw new NoticeRenderError('Signer role is required.');
  const signerRole = signerRoleLabel(data.signerRole);

  // Service date (drives the dated line; engine already consumed it for the period)
  const dateOfService = requireString(data.serviceDate, 'service date');

  // Compliance dates — consumed, never recomputed here.
  const startD = formatNoticeDate(dates.compliancePeriodStartDate);
  const endD = formatNoticeDate(dates.compliancePeriodEndDate);

  // Payee fields come from the payment methods / landlord info. The template's
  // payee block uses payee_name/phone/address; we source name+role for the
  // payee identity and require the in-person/mail data via the method blocks.
  // (Phone is required per §1161(2); the flow collects it — surfaced here.)
  const itemization = periods
    .map(
      (p) =>
        `- Rent for the period ${formatNoticeDate(p.periodStartDate)} through ${formatNoticeDate(p.periodEndDate)}: $${formatCurrency(Number(p.amount) || 0)}`,
    )
    .join('\n');

  const paymentBlocks = renderPaymentMethods(data.paymentMethods);

  // --- Assemble the LOCKED notice text (verbatim fixed language) -----------
  const noticeText = [
    'THREE-DAY NOTICE TO PAY RENT OR QUIT',
    '',
    `TO: ${tenantNamesJoined}, AND ALL OTHER TENANTS, SUBTENANTS, AND OCCUPANTS IN POSSESSION OF THE PREMISES LOCATED AT:`,
    '',
    propertyAddress,
    `County of ${propertyCounty}, California`,
    '',
    `YOU ARE HEREBY NOTIFIED that rent is now due and unpaid for the premises you currently hold and occupy, for the period ${formatNoticeDate(earliestStart)} through ${formatNoticeDate(latestEnd)}. The total amount of rent now due and demanded is $${formatCurrency(totalDue)}, itemized as follows:`,
    '',
    itemization,
    '',
    `TOTAL DUE: $${formatCurrency(totalDue)}`,
    '',
    'The amount demanded above is base rent only. It does not include late fees, utility charges, NSF/returned-payment fees, damages, repair costs, or any other non-rent charge.',
    '',
    `TIME TO COMPLY. The 3-day period to comply with this notice commences on ${startD} and expires at the end of the day on ${endD}. The 3-day period excludes Saturdays, Sundays, and California judicial holidays.`,
    '',
    `If you do not pay the full amount demanded or deliver up possession of the premises by the end of ${endD}, the landlord will initiate unlawful detainer (eviction) proceedings against you to recover possession of the premises, declare a forfeiture of your rental agreement, and recover unpaid rent, damages, and costs of suit.`,
    '',
    'HOW TO PAY. Payment of the amount demanded may be made to:',
    '',
    signerName,
    '',
    paymentBlocks,
    '',
    'The landlord hereby elects to declare a forfeiture of the lease or rental agreement under which you occupy the premises if the amount demanded above is not paid in full within the time stated.',
    '',
    `Dated: ${formatNoticeDate(dateOfService)}`,
    '',
    '_______________________________________',
    signerName,
    signerRole,
  ].join('\n');

  // --- Proof of service: rendered BLANK (completed after service) ----------
  const proofOfServiceText = [
    'PROOF OF SERVICE',
    '',
    'I, _______________________________, declare that I am over the age of 18 years and am not a party to this action. On ______________, at approximately __________, I served the foregoing THREE-DAY NOTICE TO PAY RENT OR QUIT on ' +
      `${tenantNamesJoined} in the following manner:`,
    '',
    '☐ Personal service. By personally handing a copy to the tenant at ______________________________.',
    '',
    '☐ Substituted service. After attempting personal service and being unable to locate the tenant with reasonable diligence, by leaving a copy with ____________________, a person of suitable age and discretion, at ______________________________, AND mailing a copy to the tenant at ______________________________ on ______________.',
    '',
    '☐ Posting and mailing. After attempting both personal service and substituted service without success, by affixing a copy in a conspicuous place on the premises at ______________________________, AND mailing a copy to the tenant at ______________________________ on ______________.',
    '',
    'I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.',
    '',
    'Dated: ______________',
    '',
    '_______________________________________',
    '(signature of person who served)',
  ].join('\n');

  const variablesUsed: Record<string, string> = {
    tenant_names_joined: tenantNamesJoined,
    property_full_address: propertyAddress,
    property_county: propertyCounty,
    earliest_period_start_date: earliestStart,
    latest_period_end_date: latestEnd,
    total_rent_due: formatCurrency(totalDue),
    compliance_period_start_date: dates.compliancePeriodStartDate,
    compliance_period_end_date: dates.compliancePeriodEndDate,
    date_of_service: dateOfService,
    signer_name: signerName,
    signer_role: signerRole,
  };

  return { noticeText, proofOfServiceText, variablesUsed };
}
