// lib/chat/toNoticeFlowData.ts
// Lane 2E mapper — pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md §4.6.
// Maps the chat intake_state to the wizard's NoticeFlowData, byte-identical in structure to the object
// la-produce-panel.tsx renders against (wizard-parity, PR-A3 fork ruling §2.3). NO DEFAULTING ANYWHERE:
// a missing required field throws NoticeFlowMapError with a category-specific message — the anti-defaulting
// stop-line that prevents re-creating the Clifton failure mode on a produce-face field.
//
// Construction rules (ruling §8): field-shape governed by wizard-parity; gate semantics are NOT (behavioral
// divergences remain §1.6 escalations). Deviations recorded for the PR attestation "Deviations" subsection:
//   D-1: chat `payment_methods_accepted: 'eft'` maps to the wizard OfferedMethod `'bank_deposit'` — the chat
//        field carries the account-detail path (payee_bank_*), which is structurally bank_deposit; the chat
//        enum name is a drafting misnomer (§8 rule 1: reuse wizard type, no new ruling).
//   D-2: gate-only attestations (within-5-miles, paper-instrument, eft-previously-established, produce
//        attestation, safety-check override) are NOT set here — they are produce-time/Review-step concerns,
//        not intake face data. renderNotice does not require them; the produce gate does (Review step / §5.2).

import type {
  NoticeFlowData,
  OfferedMethod,
  PaymentBranch,
  DisputeScreen,
  LandlordIdentity,
  SignerCapacity,
} from '@/lib/flow/noticeFlowState';
import type { ServiceMethod } from '@/lib/dates/computeCompliancePeriod';
import type { IntakeState } from './intakeSchema';

export class NoticeFlowMapError extends Error {}

type Entry = { value?: unknown } | undefined;
function fieldValue(state: IntakeState, field: string): unknown {
  return (state as Record<string, Entry>)[field]?.value;
}
function req<T>(state: IntakeState, field: string, category: string): T {
  const v = fieldValue(state, field);
  if (v === undefined || v === null || v === '') {
    throw new NoticeFlowMapError(
      `Lane 2E mapper: missing ${category} (intake field "${field}") — required to produce; no defaulting.`,
    );
  }
  return v as T;
}

interface SignerCapture {
  capacity: SignerCapacity;
  landlordIdentity: LandlordIdentity;
  signerName: string;
  signerTitle?: string;
}
interface PersonalDelivery { days: string; hours: string }
type ChatMethod = 'in_person' | 'by_mail' | 'eft';

export function toNoticeFlowData(state: IntakeState, intendedServiceDate: string): NoticeFlowData {
  if (!intendedServiceDate) {
    throw new NoticeFlowMapError('Lane 2E mapper: missing service date (intendedServiceDate).');
  }

  // Property & tenant
  const propertyAddress = req<string>(state, 'property_address', 'property address');
  const tenantNames = req<string[]>(state, 'tenant_names', 'tenant names');

  // Rent periods (dated) — the day-count + itemization source.
  const rentPeriods = req<{ periodStartDate: string; periodEndDate: string; amount: number }[]>(
    state, 'rent_periods', 'rent periods',
  );

  // Signer capacity + landlord identity (corporate-landlord shape).
  const signer = req<SignerCapture>(state, 'signer_capacity', 'signer capacity');

  // Preflight dispute (tri-state; feeds the wizard produce gate).
  const dispute = req<DisputeScreen>(state, 'preflight_dispute', 'dispute answers');

  // Payee identity trio (§1161(2)).
  const landlordPhone = req<string>(state, 'landlord_phone', 'landlord phone');
  const landlordStreet = req<string>(state, 'landlord_mailing_address', 'payee street address');

  // Payment methods (chat enum → wizard OfferedMethod; see D-1).
  const chatMethods = req<ChatMethod[]>(state, 'payment_methods_accepted', 'payment methods');
  const paymentMethods: OfferedMethod[] = chatMethods.map((m) => (m === 'eft' ? 'bank_deposit' : m));

  // Per-method required face data (throws if the selected method's data is missing).
  let personalDeliveryDays: string | undefined;
  let personalDeliveryHours: string | undefined;
  if (paymentMethods.includes('in_person')) {
    const pd = req<PersonalDelivery>(state, 'personal_delivery', 'personal-delivery days/hours');
    personalDeliveryDays = pd.days;
    personalDeliveryHours = pd.hours;
  }
  let bankName: string | undefined;
  let bankBranchAddress: string | undefined;
  let bankAccountNumber: string | undefined;
  if (paymentMethods.includes('bank_deposit')) {
    bankName = req<string>(state, 'payee_bank_name', 'bank name');
    bankBranchAddress = req<string>(state, 'payee_bank_address', 'bank branch address');
    bankAccountNumber = req<string>(state, 'payee_account_number', 'bank account number');
  }

  // Service method (chat enum → engine ServiceMethod).
  const chatServiceMethod = req<'personal' | 'substituted' | 'posting_mailing'>(
    state, 'preferred_service_method', 'service method',
  );
  const serviceMethod: ServiceMethod = chatServiceMethod === 'posting_mailing' ? 'post_and_mail' : chatServiceMethod;

  // paymentBranch is audit-only for the face (renderNotice does not read it for layout); derived for parity.
  const paymentBranch: PaymentBranch = paymentMethods.includes('bank_deposit')
    ? 'bank_deposit'
    : paymentMethods.includes('in_person')
      ? 'in_person_and_mail'
      : 'mail_only';

  return {
    dispute,
    propertyAddress,
    tenantNames,
    rentPeriods,
    paymentMethods,
    landlordContact: { phone: landlordPhone, streetAddress: landlordStreet },
    paymentBranch,
    personalDeliveryDays,
    personalDeliveryHours,
    bankName,
    bankBranchAddress,
    bankAccountNumber,
    landlordIdentity: signer.landlordIdentity,
    landlordIdentityConfirmed: true,
    signerName: signer.signerName,
    signerCapacity: signer.capacity,
    signerTitle: signer.signerTitle,
    // Facial coherence (B1 superseded): Dated = serviceDate = intendedServiceDate.
    serviceDate: intendedServiceDate,
    signingDate: intendedServiceDate,
    serviceMethod,
  };
}
