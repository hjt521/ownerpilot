import type {
  CreatedNoticeArtifactEnvelope,
  NoticeFlowData,
  ServiceAttempt,
} from './noticeFlowState';
import { restoreServiceTaskContext } from './serviceTaskPresentation';

export const RESOLVE_OUTCOME_DEFINITIONS = [
  { id: 'FULL_PAYMENT_REPORTED', label: 'Full payment reported' },
  { id: 'PAYMENT_STATUS_REQUIRES_REVIEW', label: 'Payment status requires review' },
  { id: 'NO_RESOLUTION_REPORTED', label: 'No resolution reported' },
  { id: 'OWNER_WITHDREW_NOTICE_PATH', label: 'Owner withdrew Notice path' },
  { id: 'POSSESSION_CHANGE_REPORTED', label: 'Possession change reported' },
  { id: 'SERVICE_OR_OUTCOME_REVIEW', label: 'Service / outcome review' },
] as const;

export type ResolveOutcomeType = (typeof RESOLVE_OUTCOME_DEFINITIONS)[number]['id'];
export type YesNoNotSure = 'YES' | 'NO' | 'NOT_SURE';
export type PaymentReviewSubtype =
  | 'PARTIAL_PAYMENT_RECEIVED'
  | 'RECEIVED_THEN_RETURNED_OR_REFUNDED'
  | 'OFFERED_NOT_ACCEPTED'
  | 'OTHER_OR_NOT_SURE';

export interface FullPaymentReportedPayload {
  paymentReceivedDate: string;
  amountReceived: number;
  acceptedConfirmed: true;
  fullExactNoticeDemandConfirmed: true;
  receivedFrom?: string;
  note?: string;
}

export interface PaymentStatusRequiresReviewPayload {
  subtype: PaymentReviewSubtype;
  eventDate: string;
  amount?: number;
  accepted: YesNoNotSure;
  receivedOrOfferedBy?: string;
  note?: string;
}

export interface NoResolutionReportedPayload {
  asOfDate: string;
  note?: string;
}

export interface OwnerWithdrewNoticePathPayload {
  decisionDate: string;
  note?: string;
  withdrawalConfirmed: true;
}

export interface PossessionChangeReportedPayload {
  reportedOrObservedDate: string;
  observations: string[];
  keysReturned: YesNoNotSure;
  physicalPossession: YesNoNotSure;
  note?: string;
}

export interface ServiceOrOutcomeReviewPayload {
  reviewReason: string;
  factualNote: string;
  dateNoticed?: string;
}

export interface ResolveOutcomePayloadByType {
  FULL_PAYMENT_REPORTED: FullPaymentReportedPayload;
  PAYMENT_STATUS_REQUIRES_REVIEW: PaymentStatusRequiresReviewPayload;
  NO_RESOLUTION_REPORTED: NoResolutionReportedPayload;
  OWNER_WITHDREW_NOTICE_PATH: OwnerWithdrewNoticePathPayload;
  POSSESSION_CHANGE_REPORTED: PossessionChangeReportedPayload;
  SERVICE_OR_OUTCOME_REVIEW: ServiceOrOutcomeReviewPayload;
}

export type ResolveOutcomeCandidate = {
  [K in ResolveOutcomeType]: {
    type: K;
    payload: ResolveOutcomePayloadByType[K];
    correctionOfEventId?: string;
  };
}[ResolveOutcomeType];

export interface ResolveRecordBinding {
  noticeGeneration: string;
  successfulServiceAttemptId: string;
  serviceGeneration: string;
}

export interface ResolveRecordContext {
  binding: ResolveRecordBinding;
  artifact: CreatedNoticeArtifactEnvelope;
  noticeData: NoticeFlowData;
  serviceData: NoticeFlowData;
  successfulAttempt: ServiceAttempt;
}

export const OUTCOME_CONFIRMATION_VERSION = 1 as const;

export interface ResolveOutcomeConfirmation {
  v: typeof OUTCOME_CONFIRMATION_VERSION;
  generation: string;
  confirmedAtISO: string;
  factualReportConfirmed: true;
  withdrawalPathStopConfirmed?: true;
}

export type ResolveOutcomeEvent = ResolveOutcomeCandidate & {
  recordKind: 'OUTCOME';
  id: string;
  recordedAtISO: string;
  confirmation: ResolveOutcomeConfirmation;
};

export interface ResolveRecordedInErrorCorrection {
  recordKind: 'RECORDED_IN_ERROR';
  id: string;
  targetEventId: string;
  recordedAtISO: string;
  confirmation: {
    v: typeof OUTCOME_CONFIRMATION_VERSION;
    generation: string;
    confirmedAtISO: string;
    recordedInErrorConfirmed: true;
  };
}

export type ResolveHistoryRecord = ResolveOutcomeEvent | ResolveRecordedInErrorCorrection;

export type ResolveOperationalStatus =
  | 'RESOLUTION REPORTED'
  | 'PAYMENT STATUS REQUIRES REVIEW'
  | 'NO RESOLUTION REPORTED'
  | 'CURRENT NOTICE PATH WITHDRAWN'
  | 'POSSESSION CHANGE REPORTED'
  | 'SERVICE / OUTCOME ISSUE REQUIRES REVIEW'
  | 'NO POST-SERVICE OUTCOME RECORDED';

const OUTCOME_IDS = new Set<string>(RESOLVE_OUTCOME_DEFINITIONS.map((item) => item.id));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRI_STATE = new Set<YesNoNotSure>(['YES', 'NO', 'NOT_SURE']);
const PAYMENT_SUBTYPES = new Set<PaymentReviewSubtype>([
  'PARTIAL_PAYMENT_RECEIVED',
  'RECEIVED_THEN_RETURNED_OR_REFUNDED',
  'OFFERED_NOT_ACCEPTED',
  'OTHER_OR_NOT_SURE',
]);

export function isResolveOutcomeType(value: unknown): value is ResolveOutcomeType {
  return typeof value === 'string' && OUTCOME_IDS.has(value);
}

export function getResolveOutcomeDefinition(type: ResolveOutcomeType) {
  const definition = RESOLVE_OUTCOME_DEFINITIONS.find((item) => item.id === type);
  if (!definition) throw new Error(`Unknown Resolve & Record outcome: ${type}`);
  return definition;
}

function normalizeServiceAttempt(attempt: ServiceAttempt) {
  return {
    id: attempt.id ?? '',
    attemptDate: attempt.attemptDate,
    method: attempt.method,
    outcome: attempt.outcome,
    mailingDate: attempt.mailingDate ?? '',
    notes: attempt.notes ?? '',
    server: {
      name: attempt.server?.name ?? '',
      address: attempt.server?.address ?? '',
      age18Plus: attempt.server?.age18Plus === true,
      partyToNotice: attempt.server?.partyToNotice === true,
    },
  };
}

export function deriveServiceGeneration(input: {
  noticeGeneration: string;
  successfulServiceAttemptId: string;
  serviceAttempts: readonly ServiceAttempt[];
}): string {
  return `service-v1:${JSON.stringify({
    noticeGeneration: input.noticeGeneration,
    successfulServiceAttemptId: input.successfulServiceAttemptId,
    attempts: input.serviceAttempts.map(normalizeServiceAttempt),
  })}`;
}

export function deriveResolveRecordContext(
  currentData: NoticeFlowData,
): ResolveRecordContext | null {
  const serviceContext = restoreServiceTaskContext(currentData);
  if (!serviceContext || serviceContext.display.kind !== 'recorded') return null;

  const successfulServiceAttemptId = currentData.successfulServiceAttemptId?.trim() ?? '';
  if (!successfulServiceAttemptId) return null;

  const attempts = currentData.serviceAttempts ?? [];
  const successfulAttempt = attempts.find(
    (attempt) => attempt.id === successfulServiceAttemptId && attempt.outcome === 'SUCCESS',
  );
  if (!successfulAttempt) return null;

  const noticeGeneration = serviceContext.artifact.generation;
  if (!noticeGeneration) return null;

  return {
    binding: {
      noticeGeneration,
      successfulServiceAttemptId,
      serviceGeneration: deriveServiceGeneration({
        noticeGeneration,
        successfulServiceAttemptId,
        serviceAttempts: attempts,
      }),
    },
    artifact: serviceContext.artifact,
    noticeData: serviceContext.noticeData,
    serviceData: serviceContext.serviceData,
    successfulAttempt,
  };
}

export function bindingsEqual(left: ResolveRecordBinding, right: ResolveRecordBinding): boolean {
  return (
    left.noticeGeneration === right.noticeGeneration &&
    left.successfulServiceAttemptId === right.successfulServiceAttemptId &&
    left.serviceGeneration === right.serviceGeneration
  );
}

function moneyToCents(value: number): number {
  return Math.round(value * 100);
}

/** Exact demand authority is the frozen Created Notice only. */
export function deriveExactNoticeDemand(artifact: CreatedNoticeArtifactEnvelope): number {
  return artifact.createData.rentPeriods.reduce((sum, period) => sum + period.amount, 0);
}

export function fullPaymentMatchesExactDemand(amountReceived: number, exactDemand: number): boolean {
  return (
    Number.isFinite(amountReceived) &&
    Number.isFinite(exactDemand) &&
    moneyToCents(amountReceived) === moneyToCents(exactDemand)
  );
}

export function classifyFullPaymentAmount(
  amountReceived: number,
  exactDemand: number,
): 'FULL_PAYMENT_REPORTED' | 'PAYMENT_STATUS_REQUIRES_REVIEW' {
  return fullPaymentMatchesExactDemand(amountReceived, exactDemand)
    ? 'FULL_PAYMENT_REPORTED'
    : 'PAYMENT_STATUS_REQUIRES_REVIEW';
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.includes('T') && Number.isFinite(Date.parse(value));
}

function optionalText(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function validMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateOutcomeCandidate(
  candidate: ResolveOutcomeCandidate,
  exactDemand?: number,
): void {
  if (!isResolveOutcomeType(candidate.type)) throw new Error('Outcome type is not authorized.');

  switch (candidate.type) {
    case 'FULL_PAYMENT_REPORTED': {
      const payload = candidate.payload;
      if (!isDate(payload.paymentReceivedDate)) throw new Error('Payment received date is required.');
      if (!validMoney(payload.amountReceived)) throw new Error('Amount received is required.');
      if (payload.acceptedConfirmed !== true) throw new Error('Accepted payment confirmation is required.');
      if (payload.fullExactNoticeDemandConfirmed !== true) {
        throw new Error('Full exact Notice demand confirmation is required.');
      }
      if (!optionalText(payload.receivedFrom) || !optionalText(payload.note)) {
        throw new Error('Full payment optional text fields are invalid.');
      }
      if (exactDemand !== undefined && !fullPaymentMatchesExactDemand(payload.amountReceived, exactDemand)) {
        throw new Error('Full payment amount must exactly match the amount shown on the created Notice.');
      }
      return;
    }
    case 'PAYMENT_STATUS_REQUIRES_REVIEW': {
      const payload = candidate.payload;
      if (!PAYMENT_SUBTYPES.has(payload.subtype)) throw new Error('Payment review subtype is required.');
      if (!isDate(payload.eventDate)) throw new Error('Payment event date is required.');
      if (payload.amount !== undefined && !validMoney(payload.amount)) throw new Error('Payment amount is invalid.');
      if (!TRI_STATE.has(payload.accepted)) throw new Error('Accepted status is required.');
      if (!optionalText(payload.receivedOrOfferedBy) || !optionalText(payload.note)) {
        throw new Error('Payment review optional text fields are invalid.');
      }
      if (payload.subtype === 'OTHER_OR_NOT_SURE' && !payload.note?.trim()) {
        throw new Error('A factual note is required for Other / not sure.');
      }
      return;
    }
    case 'NO_RESOLUTION_REPORTED':
      if (!isDate(candidate.payload.asOfDate)) throw new Error('As-of date is required.');
      if (!optionalText(candidate.payload.note)) throw new Error('No-resolution note is invalid.');
      return;
    case 'OWNER_WITHDREW_NOTICE_PATH':
      if (!isDate(candidate.payload.decisionDate)) throw new Error('Withdrawal decision date is required.');
      if (candidate.payload.withdrawalConfirmed !== true) throw new Error('Withdrawal confirmation is required.');
      if (!optionalText(candidate.payload.note)) throw new Error('Withdrawal note is invalid.');
      return;
    case 'POSSESSION_CHANGE_REPORTED':
      if (!isDate(candidate.payload.reportedOrObservedDate)) throw new Error('Possession observation date is required.');
      if (
        !Array.isArray(candidate.payload.observations) ||
        candidate.payload.observations.length === 0 ||
        candidate.payload.observations.some((item) => typeof item !== 'string' || !item.trim())
      ) {
        throw new Error('At least one factual possession observation is required.');
      }
      if (!TRI_STATE.has(candidate.payload.keysReturned)) throw new Error('Keys-returned status is required.');
      if (!TRI_STATE.has(candidate.payload.physicalPossession)) throw new Error('Physical-possession status is required.');
      if (!optionalText(candidate.payload.note)) throw new Error('Possession note is invalid.');
      return;
    case 'SERVICE_OR_OUTCOME_REVIEW':
      if (!candidate.payload.reviewReason.trim()) throw new Error('Review reason is required.');
      if (!candidate.payload.factualNote.trim()) throw new Error('Factual note is required.');
      if (candidate.payload.dateNoticed !== undefined && !isDate(candidate.payload.dateNoticed)) {
        throw new Error('Date noticed is invalid.');
      }
      return;
  }
}

function normalizedPayload(candidate: ResolveOutcomeCandidate): object {
  switch (candidate.type) {
    case 'FULL_PAYMENT_REPORTED':
      return {
        paymentReceivedDate: candidate.payload.paymentReceivedDate,
        amountReceived: candidate.payload.amountReceived,
        acceptedConfirmed: candidate.payload.acceptedConfirmed,
        fullExactNoticeDemandConfirmed: candidate.payload.fullExactNoticeDemandConfirmed,
        receivedFrom: candidate.payload.receivedFrom?.trim() ?? '',
        note: candidate.payload.note?.trim() ?? '',
      };
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return {
        subtype: candidate.payload.subtype,
        eventDate: candidate.payload.eventDate,
        amount: candidate.payload.amount ?? null,
        accepted: candidate.payload.accepted,
        receivedOrOfferedBy: candidate.payload.receivedOrOfferedBy?.trim() ?? '',
        note: candidate.payload.note?.trim() ?? '',
      };
    case 'NO_RESOLUTION_REPORTED':
      return { asOfDate: candidate.payload.asOfDate, note: candidate.payload.note?.trim() ?? '' };
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return {
        decisionDate: candidate.payload.decisionDate,
        note: candidate.payload.note?.trim() ?? '',
        withdrawalConfirmed: candidate.payload.withdrawalConfirmed,
      };
    case 'POSSESSION_CHANGE_REPORTED':
      return {
        reportedOrObservedDate: candidate.payload.reportedOrObservedDate,
        observations: candidate.payload.observations.map((item) => item.trim()),
        keysReturned: candidate.payload.keysReturned,
        physicalPossession: candidate.payload.physicalPossession,
        note: candidate.payload.note?.trim() ?? '',
      };
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return {
        reviewReason: candidate.payload.reviewReason.trim(),
        factualNote: candidate.payload.factualNote.trim(),
        dateNoticed: candidate.payload.dateNoticed ?? '',
      };
  }
}

export function outcomeConfirmationGeneration(
  binding: ResolveRecordBinding,
  candidate: ResolveOutcomeCandidate,
): string {
  return `resolve-confirm-v1:${JSON.stringify({
    binding,
    type: candidate.type,
    payload: normalizedPayload(candidate),
    correctionOfEventId: candidate.correctionOfEventId ?? '',
  })}`;
}

export function confirmOutcomeCandidate(
  binding: ResolveRecordBinding,
  candidate: ResolveOutcomeCandidate,
  confirmedAtISO: string,
  options: { factualReportConfirmed: boolean; withdrawalPathStopConfirmed?: boolean },
  exactDemand?: number,
): ResolveOutcomeConfirmation {
  validateOutcomeCandidate(candidate, exactDemand);
  if (!isIsoTimestamp(confirmedAtISO)) throw new Error('Outcome confirmation timestamp is invalid.');
  if (!options.factualReportConfirmed) throw new Error('Review & Confirm is required.');
  if (candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' && !options.withdrawalPathStopConfirmed) {
    throw new Error('Withdrawal requires the additional path-stop confirmation.');
  }
  return {
    v: OUTCOME_CONFIRMATION_VERSION,
    generation: outcomeConfirmationGeneration(binding, candidate),
    confirmedAtISO,
    factualReportConfirmed: true,
    ...(candidate.type === 'OWNER_WITHDREW_NOTICE_PATH'
      ? { withdrawalPathStopConfirmed: true as const }
      : {}),
  };
}

export function validateOutcomeConfirmation(
  binding: ResolveRecordBinding,
  candidate: ResolveOutcomeCandidate,
  confirmation: ResolveOutcomeConfirmation,
  exactDemand?: number,
): void {
  validateOutcomeCandidate(candidate, exactDemand);
  if (confirmation.v !== OUTCOME_CONFIRMATION_VERSION) throw new Error('Outcome confirmation version is invalid.');
  if (!isIsoTimestamp(confirmation.confirmedAtISO)) throw new Error('Outcome confirmation timestamp is invalid.');
  if (confirmation.factualReportConfirmed !== true) throw new Error('Outcome confirmation is missing.');
  if (confirmation.generation !== outcomeConfirmationGeneration(binding, candidate)) {
    throw new Error('Outcome confirmation is stale.');
  }
  if (
    candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' &&
    confirmation.withdrawalPathStopConfirmed !== true
  ) {
    throw new Error('Withdrawal path-stop confirmation is missing.');
  }
}

export function recordedInErrorConfirmationGeneration(
  binding: ResolveRecordBinding,
  targetEventId: string,
): string {
  return `resolve-error-v1:${JSON.stringify({ binding, targetEventId })}`;
}

export function createRecordedInErrorCorrection(input: {
  id: string;
  targetEventId: string;
  recordedAtISO: string;
  confirmedAtISO: string;
  binding: ResolveRecordBinding;
  recordedInErrorConfirmed: boolean;
}): ResolveRecordedInErrorCorrection {
  if (!input.id.trim() || !input.targetEventId.trim()) throw new Error('Recorded-in-error correction target is required.');
  if (!isIsoTimestamp(input.recordedAtISO) || !isIsoTimestamp(input.confirmedAtISO)) {
    throw new Error('Recorded-in-error timestamp is invalid.');
  }
  if (!input.recordedInErrorConfirmed) throw new Error('Recorded-in-error confirmation is required.');
  return {
    recordKind: 'RECORDED_IN_ERROR',
    id: input.id,
    targetEventId: input.targetEventId,
    recordedAtISO: input.recordedAtISO,
    confirmation: {
      v: OUTCOME_CONFIRMATION_VERSION,
      generation: recordedInErrorConfirmationGeneration(input.binding, input.targetEventId),
      confirmedAtISO: input.confirmedAtISO,
      recordedInErrorConfirmed: true,
    },
  };
}

function cloneRecord<T extends ResolveHistoryRecord>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T;
}

function validateRecordIdentity(record: ResolveHistoryRecord, prior: readonly ResolveHistoryRecord[]): void {
  if (!record.id.trim()) throw new Error('History record id is required.');
  if (prior.some((item) => item.id === record.id)) throw new Error('History record ids must be unique.');
  if (!isIsoTimestamp(record.recordedAtISO)) throw new Error('History recorded timestamp is invalid.');
}

export function reduceEffectiveOutcomeHistory(
  history: readonly ResolveHistoryRecord[],
  binding: ResolveRecordBinding,
  exactDemand?: number,
): ResolveOutcomeEvent[] {
  const prior: ResolveHistoryRecord[] = [];
  const effective: ResolveOutcomeEvent[] = [];
  const outcomeById = new Map<string, ResolveOutcomeEvent>();
  const recordedInErrorTargets = new Set<string>();

  for (const record of history) {
    validateRecordIdentity(record, prior);

    if (record.recordKind === 'RECORDED_IN_ERROR') {
      if (
        record.confirmation.v !== OUTCOME_CONFIRMATION_VERSION ||
        record.confirmation.recordedInErrorConfirmed !== true ||
        record.confirmation.generation !== recordedInErrorConfirmationGeneration(binding, record.targetEventId)
      ) {
        throw new Error('Recorded-in-error confirmation is stale or invalid.');
      }

      const targetIndex = effective.findIndex((item) => item.id === record.targetEventId);
      if (targetIndex < 0) {
        throw new Error('Recorded-in-error correction must target an effective earlier outcome.');
      }

      const [target] = effective.splice(targetIndex, 1);
      recordedInErrorTargets.add(record.targetEventId);

      if (target.correctionOfEventId) {
        const predecessor = outcomeById.get(target.correctionOfEventId);
        if (!predecessor) {
          throw new Error('Replacement predecessor is unavailable.');
        }

        if (
          !recordedInErrorTargets.has(predecessor.id) &&
          !effective.some((item) => item.id === predecessor.id)
        ) {
          effective.push(cloneRecord(predecessor));
        }
      }
    } else {
      const candidate: ResolveOutcomeCandidate = {
        type: record.type,
        payload: record.payload,
        ...(record.correctionOfEventId ? { correctionOfEventId: record.correctionOfEventId } : {}),
      } as ResolveOutcomeCandidate;

      validateOutcomeConfirmation(binding, candidate, record.confirmation, exactDemand);

      if (record.correctionOfEventId) {
        const targetIndex = effective.findIndex((item) => item.id === record.correctionOfEventId);
        if (targetIndex < 0) {
          throw new Error('Replacement correction must target an effective earlier outcome.');
        }
        effective.splice(targetIndex, 1);
      }

      const cloned = cloneRecord(record);
      effective.push(cloned);
      outcomeById.set(cloned.id, cloned);
    }

    prior.push(cloneRecord(record));
  }

  return effective;
}

export function appendResolveHistoryRecord(
  history: readonly ResolveHistoryRecord[],
  record: ResolveHistoryRecord,
  binding: ResolveRecordBinding,
  exactDemand?: number,
): ResolveHistoryRecord[] {
  const next = [...history.map(cloneRecord), cloneRecord(record)];
  reduceEffectiveOutcomeHistory(next, binding, exactDemand);
  return next;
}

export function validateResolveOutcomeHistory(
  history: readonly ResolveHistoryRecord[],
  binding: ResolveRecordBinding,
  exactDemand?: number,
): void {
  reduceEffectiveOutcomeHistory(history, binding, exactDemand);
}

export function deriveCurrentResolveOutcome(
  history: readonly ResolveHistoryRecord[],
  binding: ResolveRecordBinding,
  exactDemand?: number,
): ResolveOutcomeEvent | null {
  const effective = reduceEffectiveOutcomeHistory(history, binding, exactDemand);
  return effective.length > 0 ? effective[effective.length - 1] : null;
}

export function operationalStatusForOutcome(event: ResolveOutcomeEvent | null): ResolveOperationalStatus {
  if (!event) return 'NO POST-SERVICE OUTCOME RECORDED';
  switch (event.type) {
    case 'FULL_PAYMENT_REPORTED':
      return 'RESOLUTION REPORTED';
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return 'PAYMENT STATUS REQUIRES REVIEW';
    case 'NO_RESOLUTION_REPORTED':
      return 'NO RESOLUTION REPORTED';
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return 'CURRENT NOTICE PATH WITHDRAWN';
    case 'POSSESSION_CHANGE_REPORTED':
      return 'POSSESSION CHANGE REPORTED';
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return 'SERVICE / OUTCOME ISSUE REQUIRES REVIEW';
  }
}

export function deriveResolveOperationalStatus(
  history: readonly ResolveHistoryRecord[],
  binding: ResolveRecordBinding,
  exactDemand?: number,
): ResolveOperationalStatus {
  return operationalStatusForOutcome(deriveCurrentResolveOutcome(history, binding, exactDemand));
}

export function nextTaskForOutcome(
  event: ResolveOutcomeEvent | null,
  compliancePeriodEndDate: string,
): string {
  if (!event) return 'Record what happens after service';
  switch (event.type) {
    case 'FULL_PAYMENT_REPORTED':
      return 'Review the recorded outcome';
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return 'Review payment status before another Notice-related step';
    case 'NO_RESOLUTION_REPORTED':
      return event.payload.asOfDate < compliancePeriodEndDate
        ? 'Continue monitoring'
        : 'Review available next options';
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return 'No further task on this Notice path';
    case 'POSSESSION_CHANGE_REPORTED':
      return 'Review the possession-change record';
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return 'Review the service / outcome facts';
  }
}

export function describeOutcomeCandidate(
  candidate: ResolveOutcomeCandidate,
  exactDemand: number,
): string[] {
  switch (candidate.type) {
    case 'FULL_PAYMENT_REPORTED':
      return [
        `Amount shown on this Notice: $${exactDemand.toFixed(2)}`,
        `Payment received: $${candidate.payload.amountReceived.toFixed(2)} on ${candidate.payload.paymentReceivedDate}`,
        'Owner reports the payment was accepted.',
        'Owner reports this is the full exact Notice demand.',
        ...(candidate.payload.receivedFrom ? [`Received from: ${candidate.payload.receivedFrom}`] : []),
        ...(candidate.payload.note ? [`Note: ${candidate.payload.note}`] : []),
      ];
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return [
        `Payment status: ${candidate.payload.subtype}`,
        `Event/payment date: ${candidate.payload.eventDate}`,
        `Accepted: ${candidate.payload.accepted}`,
        ...(candidate.payload.amount !== undefined ? [`Amount: $${candidate.payload.amount.toFixed(2)}`] : []),
        ...(candidate.payload.receivedOrOfferedBy ? [`Received/offered by: ${candidate.payload.receivedOrOfferedBy}`] : []),
        ...(candidate.payload.note ? [`Note: ${candidate.payload.note}`] : []),
      ];
    case 'NO_RESOLUTION_REPORTED':
      return [`No resolution reported as of ${candidate.payload.asOfDate}`, ...(candidate.payload.note ? [`Note: ${candidate.payload.note}`] : [])];
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return [`Owner chose to stop this current Notice path on ${candidate.payload.decisionDate}`, ...(candidate.payload.note ? [`Reason/note: ${candidate.payload.note}`] : [])];
    case 'POSSESSION_CHANGE_REPORTED':
      return [
        `Reported/observed date: ${candidate.payload.reportedOrObservedDate}`,
        ...candidate.payload.observations.map((item) => `Observation: ${item}`),
        `Keys returned: ${candidate.payload.keysReturned}`,
        `Physical possession: ${candidate.payload.physicalPossession}`,
        ...(candidate.payload.note ? [`Note: ${candidate.payload.note}`] : []),
      ];
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return [
        `Review reason: ${candidate.payload.reviewReason}`,
        `Factual note: ${candidate.payload.factualNote}`,
        ...(candidate.payload.dateNoticed ? [`Date noticed: ${candidate.payload.dateNoticed}`] : []),
      ];
  }
}
