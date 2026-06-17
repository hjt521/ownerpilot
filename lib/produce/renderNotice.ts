/**
 * renderNotice — fills the BUILD-LOCKED 3-day notice template with collected
 * flow data and the date engine's computed compliance dates.
 *
 * VERSION v4 (payment-fields change; attorney ruling 2026-06-01).
 *
 * DISCIPLINE:
 *  - Renders attorney-reviewed template text. Fixed wording lives in
 *    NOTICE_PROSE / POS_PROSE / FORM_META as the single source for both the
 *    text rendering and the structured model. This module does NOT author or
 *    paraphrase legal language on its own authority.
 *  - The HOW-TO-PAY wording introduced in v4 (the § 1161(2) payee trio, the
 *    per-branch text, the mailbox-rule and EFT sentences) is LOCKED per the A1
 *    Part D sign-off (A1_part_d_attorney_signoff_2026-06-03.md) and countersign
 *    (A1_part_d_attorney_countersign_2026-06-04.md): the thirteen renderer prose
 *    constants are build-locked, verbatim only. Any string-level change requires
 *    a fresh attorney review packet.
 *  - Renders entered data VERBATIM (no capitalization tidying).
 *  - Consumes commencement/expiration dates; never recomputes them.
 *  - Proof of service rendered BLANK.
 *
 * v4 payment model (per ruling):
 *  - Payee = landlordContact (name + telephone + street address); distinct from
 *    the signer.
 *  - One paymentBranch: mail_only | in_person_and_mail | bank_deposit.
 *  - bank_deposit reflects a PAPER instrument (Decision 1) and the 5-mile rule
 *    (C2); the gate enforces the within-5-miles attestation before production.
 *  - The mailbox-rule sentence renders on every branch (the listed address may
 *    receive mail; ruling Decision 2 + C1).
 *  - EFT is an add-on, rendered only when previously established.
 */

import type {
  NoticeFlowData,
  OfferedMethod,
  RentPeriod,
  SignerCapacity,
  PaymentBranch,
} from '../flow/noticeFlowState';

/** The computed dates the renderer requires (from computeCompliancePeriod). */
export interface ComputedNoticeDates {
  compliancePeriodStartDate: string; // 'YYYY-MM-DD'
  compliancePeriodEndDate: string; // 'YYYY-MM-DD'
}

export interface RenderNoticeInput {
  data: NoticeFlowData;
  dates: ComputedNoticeDates;
}

/** A single label/value row in the HOW TO PAY block. */
export interface PayRow {
  label: string;
  value: string;
}

/** A single itemization row for the AMOUNT DUE table. */
export interface NoticeItemRow {
  description: string;
  amountFormatted: string; // '2,000.00'
}

// --- Notice-type chrome (presentation constants for this form) --------------

export const FORM_META = {
  title: 'THREE-DAY NOTICE TO PAY RENT OR QUIT',
  faceCitation: 'California Code of Civil Procedure \u00A7 1161(2)',
  noticeFooterCitation:
    'Three-Day Notice to Pay Rent or Quit \u00B7 Cal. Code Civ. Proc. \u00A7 1161(2)',
  posFooterCitation: 'Proof of Service \u00B7 Cal. Code Civ. Proc. \u00A7 1162',
} as const;

/**
 * Structured view of the rendered notice, for the styled HTML layout.
 */
export interface NoticeModel {
  meta: typeof FORM_META;
  recipient: {
    tenantNamesJoined: string;
    propertyAddress: string;
    propertyUnit?: string;
    propertyCounty?: string;
  };
  demand: {
    periodText: string;
    totalFormatted: string;
    rows: NoticeItemRow[];
  };
  compliance: {
    commencementFormatted: string;
    expirationFormatted: string;
  };
  pay: {
    branch?: PaymentBranch;
    payeeName: string;
    payeePhone: string;
    /** Address / bank rows for the grid. */
    rows: PayRow[];
    /** Statute sentences to render below the grid, in order (mailbox rule, etc.). */
    sentences: string[];
  };
  signature: {
    name: string;
    roleLabel: string;
    datedFormatted: string;
    /** Defect #3 (entity): present when landlordIdentity.type === 'entity'.
     *  The styled-HTML renderer (buildNoticeHtml) entity layout is a follow-up;
     *  the text face renders this block today. */
    entity?: {
      legalName: string;
      byLabel: string;
      signerName: string;
      signerTitle: string;
    };
  };
  proofOfService: {
    tenantNamesJoined: string;
  };
}

/** A produced notice: filled text, the structured model, plus an audit. */
export interface RenderedNotice {
  noticeText: string;
  proofOfServiceText: string;
  model: NoticeModel;
  variablesUsed: Record<string, string>;
}

export class NoticeRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoticeRenderError';
  }
}

// --- LOCKED prose -----------------------------------------------------------
// All face-prose constants are build-locked, verbatim only. The v4 HOW TO PAY
// sentences were locked by the A1 Part D countersign (2026-06-04).

export const NOTICE_PROSE = {
  recipientRest:
    'and all other tenants, subtenants, and occupants in possession of the premises located at:',
  amountDueHeader: 'AMOUNT DUE',
  demandLead: (periodText: string, totalFormatted: string): string =>
    `YOU ARE HEREBY NOTIFIED that rent is now due and unpaid for the premises you currently hold and occupy, for the period ${periodText}. The total amount of rent now due and demanded is $${totalFormatted}, itemized as follows:`,
  baseRentDisclaimer:
    'The amount demanded above is base rent only. It does not include late fees, utility charges, NSF/returned-payment fees, damages, repair costs, or any other non-rent charge.',
  timeToComplyHeader: 'TIME TO COMPLY',
  complianceSentence: (commencement: string, expiration: string): string =>
    `The 3-day period to comply with this notice commences on ${commencement} and expires at the end of the day on ${expiration}. The 3-day period excludes Saturdays, Sundays, and California judicial holidays.`,
  consequenceSentence: (expiration: string): string =>
    `If you do not pay the full amount demanded or deliver up possession of the premises by the end of ${expiration}, the landlord will initiate unlawful detainer (eviction) proceedings against you to recover possession of the premises, declare a forfeiture of your rental agreement, and recover unpaid rent, damages, and costs of suit.`,
  howToPayHeader: 'HOW TO PAY',
  forfeitureElection:
    'The landlord hereby elects to declare a forfeiture of the lease or rental agreement under which you occupy the premises if the amount demanded above is not paid in full within the time stated.',

  // --- v4 HOW TO PAY (LOCKED — A1 Part D countersign 2026-06-04; verbatim only) ---
  // Stored without trailing ": "; appended at render time. Locked face value is
  // "Payable to: " (attorney countersign 2026-06-05 §2). Dropping the appended
  // ": " would be a face-text change requiring a fresh ruling.
  payableToLabel: 'Payable to',
  telephoneLabel: 'Telephone',
  mailToLabel: 'By mail to',
  inPersonOrMailLabel: 'In person or by mail to',
  personalDeliveryLabel: 'Available for personal delivery',
  bankLabel: 'Bank',
  bankBranchLabel: 'Branch',
  accountNumberLabel: 'Account number',
  /** LOCKED 2026-06-04 (A1 Part D countersign) — § 1161(2) mailbox-rule (deemed received on date posted). */
  mailboxRuleSentence:
    'If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. \u00A7 1161(2).)',
  /** LOCKED 2026-06-04 (A1 Part D countersign) — § 1161(2) financial-institution 5-mile condition. */
  fiveMileSentence:
    'The branch identified above is within five miles of the rental property, as required by Cal. Code Civ. Proc. \u00A7 1161(2).',
  /** LOCKED 2026-06-04 (A1 Part D countersign) — Decision 1 (paper instrument; non-cash/non-EFT). */
  bankPaperInstrumentSentence:
    'Payment to the account above may be made by check, money order, or cashier\u2019s check.',
  /** LOCKED 2026-06-04 (A1 Part D countersign) — § 1161(2) EFT only if previously established. */
  eftElectionSentence:
    'If you have previously established an electronic funds transfer procedure with the landlord, payment may also be made pursuant to that previously established procedure. (Cal. Code Civ. Proc. \u00A7 1161(2).)',
  // --- C7a multi-select new locked constants (broker-authored 2026-06-15,
  //     verbatim only). In-person-without-mail faces. Additive only — the three
  //     pre-migration branches render byte-identically. ---
  /** LOCKED 2026-06-15 (c7a_inperson_layout_broker_determination_2026-06-15 §3,
   *  Option B) — address-row label for in-person-without-mail faces (rows 1 & 6). */
  inPersonOnlyLabel: 'In person to',
  /** LOCKED 2026-06-15 (c7a_inperson_layout_broker_determination_2026-06-15 §4) —
   *  version stamp for inPersonOnlyLabel; a change requires a new determination + bump. */
  inPersonAddressLabelVersion: 'v1',
  /** LOCKED 2026-06-15 (c7a_multiselect_face_review_broker_determination_2026-06-15 §8)
   *  — closure for In Person only (no mail, no bank deposit). */
  inPersonOnlySentence:
    'Payment must be delivered in person at the address above, on the days and during the hours stated. Mail and bank-deposit payment are not offered for this notice.',
  /** LOCKED 2026-06-15 (c7a_multiselect_face_review_broker_determination_2026-06-15 §8)
   *  — closure for In Person + Bank Deposit (no mail). */
  inPersonNoMailSentence:
    'Payment must be delivered in person at the address above, on the days and during the hours stated. Mail payment is not offered for this notice.',

  // --- Defect #2 payee-derivation face constants (ruling 2026-06-05, build-locked
  //     on attorney countersign per §4). Composition glue for the "Payable to:"
  //     line; render verbatim, no substitutions. NOTE (flag for close-out): the
  //     ruling §1.3 lists `payableToLabel` as the constant "Payable to: " (colon +
  //     trailing space); the shipped constant above is "Payable to" with the ": "
  //     added inline at render, so the rendered face is byte-identical. Kept as-is
  //     (representation detail, not a face-text change). ---
  /** §1.3 — joiner between a non-landlord payee and the landlord identity. */
  payeeOverrideAsAgentJoiner: ', as agent for ',
  /** §2.3 — joiner used when the individual owner array has exactly two names. */
  ownerLineTwoJoiner: ' and ',
  /** §2.3 — separator between non-final entries when the array has three or more. */
  ownerLineSerialComma: ', ',
  /** §2.3 — terminator before the final entry when the array has three or more
   *  (Oxford comma required per ruling §2.1). */
  ownerLineOxfordTerminator: ', and ',

  // --- Defect #3 entity signature-block constants — BUILD-LOCKED (attorney
  //     countersign 2026-06-05 §2, approved verbatim). Structural strings for the
  //     "[Entity legal name] / By: [signer], [title]" block. The countersign
  //     clarified the "third lock" is a VALIDATION RULE (signerTitleRequired for
  //     entity landlords), not a face-prose constant — enforced in advancement
  //     intake and re-checked in evaluateCanProduceV4, not here. ---
  entitySignatureByLabel: 'By:',
  entitySignerTitleJoiner: ', ',
} as const;

export const POS_PROSE = {
  header: 'PROOF OF SERVICE',
  faceCitation:
    'Declaration of Service \u00B7 California Code of Civil Procedure \u00A7 1162',
  intro: (tenantNamesJoined: string): string =>
    'I, _______________________________, declare that I am over the age of 18 years and am not a party to this action. On ______________, at approximately __________, I served the foregoing THREE-DAY NOTICE TO PAY RENT OR QUIT on ' +
    `${tenantNamesJoined} in the following manner:`,
  options: [
    {
      label: 'Personal service',
      body: 'By personally handing a copy to the tenant at ______________________________.',
    },
    {
      label: 'Substituted service',
      body: 'After attempting personal service and being unable to locate the tenant with reasonable diligence, by leaving a copy with ____________________, a person of suitable age and discretion, at ______________________________, AND mailing a copy to the tenant at ______________________________ on ______________.',
    },
    {
      label: 'Posting and mailing',
      body: 'After attempting both personal service and substituted service without success, by affixing a copy in a conspicuous place on the premises at ______________________________, AND mailing a copy to the tenant at ______________________________ on ______________.',
    },
  ],
  perjury:
    'I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.',
  servedBy: '(signature of person who served)',
} as const;

// --- Formatting helpers -----------------------------------------------------

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

export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) throw new NoticeRenderError(`Invalid amount: ${n}`);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Individual-landlord signature role label, derived directly from the canonical
 * signerCapacity (Defect #3 removed the legacy derived `signerRole`). Entity
 * signers render via the entity signature block, not this label.
 */
export function signerCapacityLabel(capacity: SignerCapacity): string {
  switch (capacity) {
    case 'owner':
      return 'Owner';
    case 'broker_or_manager':
      return 'Authorized Agent for Owner';
    case 'authorized_agent':
      return 'Authorized Agent for Owner';
    case 'officer_member_trustee':
      throw new NoticeRenderError(
        'Entity signer capacity has no individual role label; render the entity signature block.',
      );
    default: {
      const _exhaustive: never = capacity;
      throw new NoticeRenderError(`Unknown signer capacity: ${_exhaustive as string}`);
    }
  }
}

function requireString(v: string | undefined, field: string): string {
  if (v == null || v.trim() === '') {
    throw new NoticeRenderError(`Missing required field: ${field}`);
  }
  return v.trim();
}

// --- Defect #2: § 1161(2) payee-name derivation -----------------------------
//
// The payee name on the "Payable to:" line is DERIVED from the Step-3 landlord
// identity (composed owner line for individuals, entity legal name for entities)
// and the non-landlord-payee override, NOT independently typed. This is the
// single composition site for that face text; the UI and the escalation snapshot
// call this helper rather than re-deriving. All joiners are build-locked face
// constants above. (Attorney ruling 2026-06-05 §1.2, §2.1.)

/** Where the derived payee name came from (audit only; never on the face). */
export type PayeeNameSource =
  | 'individual_owners'
  | 'entity_legal_name'
  | 'override_agent'
  | 'unresolved';

export interface DerivedPayeeName {
  /** Composed § 1161(2) payee name for the face. '' when unresolvable. */
  name: string;
  nameSource: PayeeNameSource;
}

/**
 * Compose the individual owner-name line from the captured names array, using
 * the build-locked joiners (ruling §2.1/§2.3): 1 → name verbatim (no joiner);
 * 2 → "A and B"; 3+ → serial commas with the Oxford "and" before the final
 * entry. Blank/whitespace entries are dropped; full names are rendered as given
 * (no surname collapsing — ruling §2.4).
 */
function composeOwnerLine(namesRaw: string[]): string {
  const names = namesRaw.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) {
    return `${names[0]}${NOTICE_PROSE.ownerLineTwoJoiner}${names[1]}`;
  }
  const head = names.slice(0, -1).join(NOTICE_PROSE.ownerLineSerialComma);
  return `${head}${NOTICE_PROSE.ownerLineOxfordTerminator}${names[names.length - 1]}`;
}

/** The landlord-identity display string (entity legal name, or composed owner line). */
function landlordIdentityDisplay(data: NoticeFlowData): string {
  const id = data.landlordIdentity;
  if (!id) return '';
  if (id.type === 'entity') return (id.entityLegalName ?? '').trim();
  return composeOwnerLine(id.names ?? []);
}

/**
 * Derive the § 1161(2) payee name for the face.
 *  - Default (payee = landlord): the landlord identity display string.
 *  - Override (non-landlord payee): "[override name], as agent for [landlord]".
 * Returns name '' / 'unresolved' when the identity (or, for the override, the
 * override name) is missing — the produce gate and renderNotice both fail closed
 * on an empty derived name, so a defective "Payable to:" line never ships.
 */
export function derivePayeeName(data: NoticeFlowData): DerivedPayeeName {
  const landlord = landlordIdentityDisplay(data);
  if (data.payeeIsNonLandlord === true) {
    const override = (data.payeeOverrideName ?? '').trim();
    if (override === '' || landlord === '') {
      return { name: '', nameSource: 'unresolved' };
    }
    return {
      name: `${override}${NOTICE_PROSE.payeeOverrideAsAgentJoiner}${landlord}`,
      nameSource: 'override_agent',
    };
  }
  if (landlord === '') return { name: '', nameSource: 'unresolved' };
  return {
    name: landlord,
    nameSource:
      data.landlordIdentity?.type === 'entity' ? 'entity_legal_name' : 'individual_owners',
  };
}

// --- v4 HOW TO PAY section --------------------------------------------------
//
// Builds the per-branch label/value rows + the statute sentences that apply.
// Fails closed if a required branch field is missing (the gate validates first;
// this is the renderer's own guard so it never emits a defective document).

/**
 * C7a multi-select HOW-TO-PAY composition (broker determinations 2026-06-15:
 * c7a_multiselect_face_review §3.5 ordering + §4 matrix; c7a_inperson_layout §3,
 * Option B). Returns the same { rows, sentences } shape as buildPaySection, but
 * from a multi-method selection. Every face string is a build-locked
 * NOTICE_PROSE constant — this function only SELECTS and ORDERS them; it authors
 * no face text. The three pre-migration faces (by_mail only; in_person + by_mail;
 * the bank rows) reproduce byte-identically.
 *
 * Disallowed combinations (no in-person/by-mail floor; EFT without by_mail)
 * throw — the validator blocks them upstream; this is defense in depth.
 *
 * This is the sole face-composition path: the single-select buildPaySection
 * was retired in C7a slice 4c.
 */
export function composeFaceText(
  methods: readonly OfferedMethod[],
  data: NoticeFlowData,
): { rows: PayRow[]; sentences: string[] } {
  const inPerson = methods.includes('in_person');
  const byMail = methods.includes('by_mail');
  const bank = methods.includes('bank_deposit');
  const eft = methods.includes('eft');

  if (!inPerson && !byMail) {
    throw new NoticeRenderError(
      'Invalid payment configuration: at least one of in person or by mail must be offered.',
    );
  }
  if (eft && !byMail) {
    throw new NoticeRenderError(
      'Invalid payment configuration: EFT requires by mail to also be offered.',
    );
  }

  const streetAddress = formatPropertyLine(
    requireString(data.landlordContact?.streetAddress, 'payee street address'),
    data.landlordContact?.unit,
  );

  const rows: PayRow[] = [];
  const sentences: string[] = [];

  // Payee block: address row, labeled by combination.
  let addressLabel: string;
  if (byMail && inPerson) addressLabel = NOTICE_PROSE.inPersonOrMailLabel;
  else if (byMail) addressLabel = NOTICE_PROSE.mailToLabel;
  else addressLabel = NOTICE_PROSE.inPersonOnlyLabel; // in person, no mail
  rows.push({ label: addressLabel, value: streetAddress });

  // In Person block: days/hours.
  if (inPerson) {
    const days = requireString(data.personalDeliveryDays, 'personal-delivery days');
    const hours = requireString(data.personalDeliveryHours, 'personal-delivery hours');
    rows.push({ label: NOTICE_PROSE.personalDeliveryLabel, value: `${days}, ${hours}` });
  }

  // Bank Deposit block: name / branch / account rows.
  if (bank) {
    rows.push({ label: NOTICE_PROSE.bankLabel, value: requireString(data.bankName, 'bank name') });
    rows.push({
      label: NOTICE_PROSE.bankBranchLabel,
      value: requireString(data.bankBranchAddress, 'bank branch address'),
    });
    rows.push({
      label: NOTICE_PROSE.accountNumberLabel,
      value: requireString(data.bankAccountNumber, 'bank account number'),
    });
  }

  // Sentences, in locked order (§3.5): mail -> bank -> eft -> in-person closure.
  if (byMail) sentences.push(NOTICE_PROSE.mailboxRuleSentence);
  if (bank) {
    sentences.push(NOTICE_PROSE.bankPaperInstrumentSentence);
    sentences.push(NOTICE_PROSE.fiveMileSentence);
  }
  if (eft) sentences.push(NOTICE_PROSE.eftElectionSentence);
  if (inPerson && !byMail) {
    sentences.push(
      bank ? NOTICE_PROSE.inPersonNoMailSentence : NOTICE_PROSE.inPersonOnlySentence,
    );
  }

  return { rows, sentences };
}

// --- The renderer -----------------------------------------------------------

/**
 * Compose the property line for DISPLAY: "address, unit" when a unit is present,
 * else the raw address. Used by the face address block, the summary panel, and
 * the owner-record packet so all three render the unit consistently. The model
 * keeps raw `propertyAddress` + optional `propertyUnit`; composition happens at
 * each display site via this helper (no double-compose).
 */
export function formatPropertyLine(address: string, unit?: string): string {
  const u = (unit ?? '').trim();
  const a = (address ?? '').trim();
  // JT direction 2026-06-16 (face-affecting display format): drop a trailing
  // country segment Google Places appends ("USA" / "United States"), and place
  // the unit right after the street rather than at the very end.
  const parts = a.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (last === 'usa' || last === 'united states' || last === 'us') parts.pop();
  }
  if (!u) return parts.join(', ');
  const unitLabel = /^(unit|apt|apartment|suite|ste|#|rm|room|fl|floor|ph|bldg|building)\b/i.test(u)
    ? u
    : `Unit ${u}`;
  return parts.length >= 1 ? [parts[0], unitLabel, ...parts.slice(1)].join(', ') : unitLabel;
}

export function renderNotice(input: RenderNoticeInput): RenderedNotice {
  const { data, dates } = input;

  // Tenants
  const tenantNames = (data.tenantNames || []).map((t) => t.trim()).filter(Boolean);
  if (tenantNames.length === 0) throw new NoticeRenderError('At least one tenant name is required.');
  const tenantNamesJoined = tenantNames.join(', ');

  // Property — verbatim.
  const propertyAddress = requireString(data.propertyAddress, 'property address');
  const propertyUnit = (data.propertyUnit ?? '').trim();
  const propertyCounty = (data.propertyCounty ?? '').trim();

  // Rent periods + totals
  const periods: RentPeriod[] = (data.rentPeriods || []).filter(
    (p) => p.periodStartDate && p.periodEndDate,
  );
  if (periods.length === 0) throw new NoticeRenderError('At least one rent period is required.');
  // C6 (det. 2026-06-14): no base-rent render guard. Attestation is a produce-
  // GATE concern (evaluateCanProduceV4 blocks printing until the Step 4 combined
  // attestation is checked), not a rendering concern - the face renders the same
  // bytes regardless, so the user can read it before attesting.
  const earliestStart = periods.map((p) => p.periodStartDate).sort()[0];
  const latestEnd = periods.map((p) => p.periodEndDate).sort().slice(-1)[0];
  const totalDue = periods.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // v4 payee (§ 1161(2) name + telephone + address) — distinct from signer.
  // Defect #2: the NAME is derived from the Step-3 landlord identity (or the
  // non-landlord override), not read from landlordContact.name (deprecated).
  // Telephone + street address remain on landlordContact.
  const derivedPayee = derivePayeeName(data);
  const payeeName = requireString(derivedPayee.name, 'payee name');
  const payeePhone = requireString(data.landlordContact?.phone, 'payee telephone');

  // Signer (signature block).
  //  - Individual: role label derived from signerCapacity (Defect #3 removed the
  //    legacy `signerRole`).
  //  - Entity (Defect #3, countersigned 2026-06-05): "[Entity legal name] / By:
  //    [signer], [title]". The entity insider has no individual role label, so the
  //    capacity→label mapping applies only to the individual branch. Entity
  //    PRODUCTION is gated/ungated by evaluateCanProduceV4, not here.
  const signerName = requireString(data.signerName, 'signer name');
  const id = data.landlordIdentity;
  let signerRoleLabelText = '';
  let entitySignature: { legalName: string; signerTitle: string } | undefined;
  if (id?.type === 'entity') {
    const legalName = requireString(id.entityLegalName, 'entity legal name');
    const signerTitle = requireString(data.signerTitle, 'signer title (entity)');
    entitySignature = { legalName, signerTitle };
  } else {
    if (!data.signerCapacity) throw new NoticeRenderError('Signer capacity is required.');
    signerRoleLabelText = signerCapacityLabel(data.signerCapacity);
  }

  const dateOfService = requireString(data.serviceDate, 'service date');
  // B1 (attorney ruling 2026-06-02): the face "Dated:" line prints the SIGNING
  // (execution) date, never the service date. serviceDate is retained here only
  // for the audit variable (date_of_service) and the off-face compliance
  // computation, which is performed upstream and passed in via `dates`.
  const signingDate = requireString(data.signingDate, 'signing date');
  const startD = formatNoticeDate(dates.compliancePeriodStartDate);
  const endD = formatNoticeDate(dates.compliancePeriodEndDate);

  // Itemization
  const rows: NoticeItemRow[] = periods.map((p) => ({
    description: `Rent for the period ${formatNoticeDate(p.periodStartDate)} through ${formatNoticeDate(p.periodEndDate)}`,
    amountFormatted: formatCurrency(Number(p.amount) || 0),
  }));
  const itemizationText = rows.map((r) => `- ${r.description}: $${r.amountFormatted}`).join('\n');
  const periodText = `${formatNoticeDate(earliestStart)} through ${formatNoticeDate(latestEnd)}`;
  const totalFormatted = formatCurrency(totalDue);

  // v4 HOW TO PAY. C7a: compose from the locked multi-select matrix (the only
  // render path; the single-select buildPaySection was retired in slice 4c).
  // model.pay.branch is audit-only (no layout consumer reads it), so it is
  // optional and absent here; the audit records offered_methods as the
  // authoritative record.
  const branch = data.paymentBranch;
  if ((data.paymentMethods?.length ?? 0) === 0) {
    throw new NoticeRenderError('Missing required field: payment methods');
  }
  const { rows: payRows, sentences: paySentences } = composeFaceText(
    data.paymentMethods,
    data,
  );

  const propertyLine = formatPropertyLine(propertyAddress, propertyUnit);
  const addressBlock = propertyCounty
    ? `${propertyLine}\nCounty of ${propertyCounty}, California`
    : propertyLine;

  const payTextLines = [
    `${NOTICE_PROSE.payableToLabel}: ${payeeName}`,
    `${NOTICE_PROSE.telephoneLabel}: ${payeePhone}`,
    ...payRows.map((r) => `${r.label}: ${r.value}`),
    '',
    ...paySentences,
  ];

  // --- LOCKED notice text --------------------------------------------------
  const noticeText = [
    FORM_META.title,
    FORM_META.faceCitation,
    '',
    `TO: ${tenantNamesJoined}, ${NOTICE_PROSE.recipientRest}`,
    '',
    addressBlock,
    '',
    NOTICE_PROSE.amountDueHeader,
    '',
    NOTICE_PROSE.demandLead(periodText, totalFormatted),
    '',
    itemizationText,
    '',
    `TOTAL DUE: $${totalFormatted}`,
    '',
    NOTICE_PROSE.baseRentDisclaimer,
    '',
    NOTICE_PROSE.timeToComplyHeader,
    '',
    NOTICE_PROSE.complianceSentence(startD, endD),
    '',
    NOTICE_PROSE.consequenceSentence(endD),
    '',
    NOTICE_PROSE.howToPayHeader,
    '',
    ...payTextLines,
    '',
    NOTICE_PROSE.forfeitureElection,
    '',
    `Dated: ${formatNoticeDate(signingDate)}`,
    '',
    '_______________________________________',
    ...(entitySignature
      ? [
          entitySignature.legalName,
          `${NOTICE_PROSE.entitySignatureByLabel} ${signerName}${NOTICE_PROSE.entitySignerTitleJoiner}${entitySignature.signerTitle}`,
        ]
      : [signerName, signerRoleLabelText]),
  ].join('\n');

  const proofOfServiceText = [
    POS_PROSE.header,
    '',
    POS_PROSE.intro(tenantNamesJoined),
    '',
    ...POS_PROSE.options.flatMap((o) => [`\u2610 ${o.label}. ${o.body}`, '']),
    POS_PROSE.perjury,
    '',
    'Dated: ______________',
    '',
    '_______________________________________',
    POS_PROSE.servedBy,
  ].join('\n');

  const model: NoticeModel = {
    meta: FORM_META,
    recipient: {
      tenantNamesJoined,
      propertyAddress,
      ...(propertyUnit ? { propertyUnit } : {}),
      ...(propertyCounty ? { propertyCounty } : {}),
    },
    demand: { periodText, totalFormatted, rows },
    compliance: { commencementFormatted: startD, expirationFormatted: endD },
    pay: { branch, payeeName, payeePhone, rows: payRows, sentences: paySentences },
    signature: {
      name: signerName,
      roleLabel: signerRoleLabelText,
      datedFormatted: formatNoticeDate(signingDate),
      ...(entitySignature
        ? {
            entity: {
              legalName: entitySignature.legalName,
              byLabel: NOTICE_PROSE.entitySignatureByLabel,
              signerName,
              signerTitle: entitySignature.signerTitle,
            },
          }
        : {}),
    },
    proofOfService: { tenantNamesJoined },
  };

  const variablesUsed: Record<string, string> = {
    tenant_names_joined: tenantNamesJoined,
    property_full_address: propertyAddress,
    property_county: propertyCounty,
    earliest_period_start_date: earliestStart,
    latest_period_end_date: latestEnd,
    total_rent_due: totalFormatted,
    compliance_period_start_date: dates.compliancePeriodStartDate,
    compliance_period_end_date: dates.compliancePeriodEndDate,
    signing_date: signingDate,
    date_of_service: dateOfService,
    payee_name: payeeName,
    payee_phone: payeePhone,
    // Defect #2 audit (ruling §4): which branch composed the payee name.
    // AUDIT ONLY — the face shows the composed name, never this source token.
    payee_name_source: derivedPayee.nameSource,
    payment_branch: branch ?? '',
    // C7a §9 audit: the authoritative record of the offered payment methods.
    // payment_branch above is the legacy single-select token (empty under
    // multi-select); offered_methods carries the actual selection.
    offered_methods: (data.paymentMethods ?? []).join(', '),
    // C7a §9 audit (composition determination 2026-06-15): the composed face
    // prose frozen at produce time, the closure-sentence version stamp (empty
    // when no closure sentence rendered — the string map cannot hold null), and
    // the determination / authorization references.
    rendered_face_composition: paySentences.join(' '),
    in_person_closure_sentence_version:
      paySentences.includes(NOTICE_PROSE.inPersonOnlySentence) ||
      paySentences.includes(NOTICE_PROSE.inPersonNoMailSentence)
        ? 'v1'
        : '',
    composition_determination_date: '2026-06-15',
    composition_authorization_ref: 'broker_blanket_authorization_2026-06-15',
    signer_name: signerName,
    signer_role: signerRoleLabelText,
    // Defect #1 audit (ruling §1.4): record the canonical landlord_type and
    // signer_capacity alongside the rendered signer_role label. signer_role is
    // the individual-face label derived from signer_capacity (Defect #3 removed
    // the legacy signerRole field); for entity notices it is blank and the
    // entity signature block carries the signer/title instead.
    landlord_type: data.landlordIdentity?.type ?? '',
    signer_capacity: data.signerCapacity ?? '',
    signer_title: data.signerTitle ?? '',
  };

  return { noticeText, proofOfServiceText, model, variablesUsed };
}
