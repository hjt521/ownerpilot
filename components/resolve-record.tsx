'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadDraft } from '@/lib/flow/persistence';
import {
  RESOLVE_OUTCOME_DEFINITIONS,
  appendResolveHistoryRecord,
  classifyFullPaymentAmount,
  confirmOutcomeCandidate,
  createRecordedInErrorCorrection,
  deriveCurrentResolveOutcome,
  deriveExactNoticeDemand,
  deriveResolveOperationalStatus,
  deriveResolveRecordContext,
  getResolveOutcomeDefinition,
  nextTaskForOutcome,
  outcomeConfirmationGeneration,
  reduceEffectiveOutcomeHistory,
  validateOutcomeCandidate,
  validateOutcomeConfirmation,
  type PaymentReviewSubtype,
  type ResolveHistoryRecord,
  type ResolveOutcomeCandidate,
  type ResolveOutcomeConfirmation,
  type ResolveOutcomeEvent,
  type ResolveOutcomeType,
  type ResolveRecordContext,
  type YesNoNotSure,
} from '@/lib/flow/outcomeEvents';
import {
  restoreOutcomeHistory,
  saveOutcomeHistory,
  type RestoredResolveOutcome,
} from '@/lib/flow/outcomePersistence';
import { formatNoticeDate, formatPropertyLine } from '@/lib/produce/renderNotice';

const FACT_CONFIRMATION_COPY =
  'I confirm this accurately describes the facts I am reporting happened after service for this Notice. I understand OwnerPilot is recording my report and is not independently verifying its legal effect.';
const WITHDRAWAL_CONFIRMATION_COPY =
  'I confirm I am choosing to stop this current Notice path in OwnerPilot.';

function displayDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatNoticeDate(value) : value;
}

function displayMoney(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function methodLabel(method: ResolveRecordContext['successfulAttempt']['method']): string {
  if (method === 'personal') return 'Personal service';
  if (method === 'substituted') return 'Substituted service';
  return 'Posting and mailing';
}

function triLabel(value: YesNoNotSure): string {
  if (value === 'YES') return 'Yes';
  if (value === 'NO') return 'No';
  return 'Not sure';
}

function subtypeLabel(value: PaymentReviewSubtype): string {
  switch (value) {
    case 'PARTIAL_PAYMENT_RECEIVED': return 'Partial payment received';
    case 'RECEIVED_THEN_RETURNED_OR_REFUNDED': return 'Received, then returned or refunded';
    case 'OFFERED_NOT_ACCEPTED': return 'Offered but not accepted';
    case 'OTHER_OR_NOT_SURE': return 'Other / not sure';
  }
}

const POSSESSION_OBSERVATION_CHOICES = [
  'Tenant said they moved out',
  'Keys were returned',
  'Property appeared vacant',
  'I entered / recovered physical possession',
  'Other / not sure',
] as const;

function customerStatusLabel(status: string): string {
  switch (status) {
    case 'RESOLUTION REPORTED': return 'Resolution reported';
    case 'PAYMENT STATUS REQUIRES REVIEW': return 'Payment needs review';
    case 'NO RESOLUTION REPORTED': return 'No resolution reported';
    case 'CURRENT NOTICE PATH WITHDRAWN': return 'Notice path stopped';
    case 'POSSESSION CHANGE REPORTED': return 'Possession change reported';
    case 'SERVICE / OUTCOME ISSUE REQUIRES REVIEW': return 'Service or outcome needs review';
    default: return 'Waiting for an outcome';
  }
}

function friendlyReviewLines(candidate: ResolveOutcomeCandidate, exactDemand: number): string[] {
  switch (candidate.type) {
    case 'FULL_PAYMENT_REPORTED': {
      const lines = [
        `Payment received date: ${displayDate(candidate.payload.paymentReceivedDate)}`,
        `Amount received: ${displayMoney(candidate.payload.amountReceived)}`,
        `Amount shown on this Notice: ${displayMoney(exactDemand)}`,
        `Payment accepted: ${candidate.payload.acceptedConfirmed ? 'Yes' : 'No'}`,
        `Reported as the full amount on this Notice: ${candidate.payload.fullExactNoticeDemandConfirmed ? 'Yes' : 'No'}`,
      ];
      if (candidate.payload.receivedFrom) lines.push(`Received from: ${candidate.payload.receivedFrom}`);
      if (candidate.payload.note) lines.push(`Note: ${candidate.payload.note}`);
      return lines;
    }
    case 'PAYMENT_STATUS_REQUIRES_REVIEW': {
      const lines = [
        `Payment status: ${subtypeLabel(candidate.payload.subtype)}`,
        `Date: ${displayDate(candidate.payload.eventDate)}`,
        `Accepted: ${triLabel(candidate.payload.accepted)}`,
      ];
      if (candidate.payload.amount !== undefined) lines.splice(2, 0, `Amount: ${displayMoney(candidate.payload.amount)}`);
      if (candidate.payload.receivedOrOfferedBy) lines.push(`Received or offered by: ${candidate.payload.receivedOrOfferedBy}`);
      if (candidate.payload.note) lines.push(`Note: ${candidate.payload.note}`);
      return lines;
    }
    case 'NO_RESOLUTION_REPORTED': {
      const lines = [`No resolution reported as of: ${displayDate(candidate.payload.asOfDate)}`];
      if (candidate.payload.note) lines.push(`Note: ${candidate.payload.note}`);
      return lines;
    }
    case 'OWNER_WITHDREW_NOTICE_PATH': {
      const lines = [`Decision date: ${displayDate(candidate.payload.decisionDate)}`];
      if (candidate.payload.note) lines.push(`Note: ${candidate.payload.note}`);
      return lines;
    }
    case 'POSSESSION_CHANGE_REPORTED': {
      const lines = [
        `Reported / observed date: ${displayDate(candidate.payload.reportedOrObservedDate)}`,
        `What was observed: ${candidate.payload.observations.join('; ')}`,
        `Keys returned: ${triLabel(candidate.payload.keysReturned)}`,
        `Physical possession: ${triLabel(candidate.payload.physicalPossession)}`,
      ];
      if (candidate.payload.note) lines.push(`Note: ${candidate.payload.note}`);
      return lines;
    }
    case 'SERVICE_OR_OUTCOME_REVIEW': {
      const lines = [
        `Reason for review: ${candidate.payload.reviewReason}`,
        `What happened: ${candidate.payload.factualNote}`,
      ];
      if (candidate.payload.dateNoticed) lines.push(`Date noticed: ${displayDate(candidate.payload.dateNoticed)}`);
      return lines;
    }
  }
}

function choiceDescription(type: ResolveOutcomeType): string {
  switch (type) {
    case 'FULL_PAYMENT_REPORTED': return 'Report an accepted payment that exactly matches the amount shown on this created Notice.';
    case 'PAYMENT_STATUS_REQUIRES_REVIEW': return 'Record payment facts that do not fit the exact full-payment report.';
    case 'NO_RESOLUTION_REPORTED': return 'Record that no post-service resolution has been reported as of a specific date.';
    case 'OWNER_WITHDREW_NOTICE_PATH': return 'Record the owner’s deliberate decision to stop this current Notice path in OwnerPilot.';
    case 'POSSESSION_CHANGE_REPORTED': return 'Record factual observations about a reported or observed possession change.';
    case 'SERVICE_OR_OUTCOME_REVIEW': return 'Record service or post-service facts that require review before another Notice-related step.';
  }
}

function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function ResolveRecord() {
  const [checked, setChecked] = useState(false);
  const [draftFound, setDraftFound] = useState(false);
  const [context, setContext] = useState<ResolveRecordContext | null>(null);
  const [restoreState, setRestoreState] = useState<RestoredResolveOutcome>({ status: 'absent' });
  const [history, setHistory] = useState<ResolveHistoryRecord[]>([]);

  const [stage, setStage] = useState<'CHOOSE' | 'FACTS' | 'REVIEW'>('CHOOSE');
  const [selectedType, setSelectedType] = useState<ResolveOutcomeType | ''>('');
  const [correctionOfEventId, setCorrectionOfEventId] = useState<string | undefined>();
  const [recordedInErrorTarget, setRecordedInErrorTarget] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<ResolveOutcomeConfirmation | null>(null);
  const [factConfirmed, setFactConfirmed] = useState(false);
  const [withdrawalReviewConfirmed, setWithdrawalReviewConfirmed] = useState(false);
  const [recordedInErrorConfirmed, setRecordedInErrorConfirmed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const [fullDate, setFullDate] = useState('');
  const [fullAmount, setFullAmount] = useState('');
  const [fullAccepted, setFullAccepted] = useState(false);
  const [fullExactDemandConfirmed, setFullExactDemandConfirmed] = useState(false);
  const [fullReceivedFrom, setFullReceivedFrom] = useState('');
  const [fullNote, setFullNote] = useState('');

  const [paymentSubtype, setPaymentSubtype] = useState<PaymentReviewSubtype | ''>('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccepted, setPaymentAccepted] = useState<YesNoNotSure | ''>('');
  const [paymentBy, setPaymentBy] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [noResolutionDate, setNoResolutionDate] = useState('');
  const [noResolutionNote, setNoResolutionNote] = useState('');

  const [withdrawalDate, setWithdrawalDate] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');

  const [possessionDate, setPossessionDate] = useState('');
  const [possessionObservations, setPossessionObservations] = useState('');
  const [keysReturned, setKeysReturned] = useState<YesNoNotSure | ''>('');
  const [physicalPossession, setPhysicalPossession] = useState<YesNoNotSure | ''>('');
  const [possessionNote, setPossessionNote] = useState('');

  const [reviewReason, setReviewReason] = useState('');
  const [reviewFactualNote, setReviewFactualNote] = useState('');
  const [reviewDateNoticed, setReviewDateNoticed] = useState('');

  const exactDemand = context ? deriveExactNoticeDemand(context.artifact) : 0;

  useEffect(() => {
    const draft = loadDraft();
    setDraftFound(!!draft);
    if (!draft) {
      setChecked(true);
      return;
    }
    const resolvedContext = deriveResolveRecordContext(draft.data);
    setContext(resolvedContext);
    if (resolvedContext) {
      const demand = deriveExactNoticeDemand(resolvedContext.artifact);
      const restored = restoreOutcomeHistory(resolvedContext.binding, demand);
      setRestoreState(restored);
      if (restored.status === 'ready') setHistory(restored.envelope.events);
    }
    setChecked(true);
  }, []);

  const effectiveHistory = useMemo(() => {
    if (!context || restoreState.status === 'blocked') return [];
    try {
      return reduceEffectiveOutcomeHistory(history, context.binding, exactDemand);
    } catch {
      return [];
    }
  }, [context, exactDemand, history, restoreState.status]);

  const effectiveIds = useMemo(() => new Set(effectiveHistory.map((event) => event.id)), [effectiveHistory]);
  const currentOutcome = context
    ? deriveCurrentResolveOutcome(history, context.binding, exactDemand)
    : null;
  const operationalStatus = context
    ? deriveResolveOperationalStatus(history, context.binding, exactDemand)
    : 'NO POST-SERVICE OUTCOME RECORDED';
  const nextTask = context
    ? nextTaskForOutcome(currentOutcome, context.artifact.dates.compliancePeriodEndDate)
    : 'Record what happens after service';

  const invalidateConfirmation = () => {
    setConfirmation(null);
    setFactConfirmed(false);
    setWithdrawalReviewConfirmed(false);
  };

  const resetEntry = () => {
    setStage('CHOOSE');
    setSelectedType('');
    setCorrectionOfEventId(undefined);
    setRecordedInErrorTarget(undefined);
    setConfirmation(null);
    setFactConfirmed(false);
    setWithdrawalReviewConfirmed(false);
    setRecordedInErrorConfirmed(false);
    setSaveError(null);
    setTransitionMessage(null);

    setFullDate(''); setFullAmount(''); setFullAccepted(false); setFullExactDemandConfirmed(false); setFullReceivedFrom(''); setFullNote('');
    setPaymentSubtype(''); setPaymentDate(''); setPaymentAmount(''); setPaymentAccepted(''); setPaymentBy(''); setPaymentNote('');
    setNoResolutionDate(''); setNoResolutionNote('');
    setWithdrawalDate(''); setWithdrawalNote('');
    setPossessionDate(''); setPossessionObservations(''); setKeysReturned(''); setPhysicalPossession(''); setPossessionNote('');
    setReviewReason(''); setReviewFactualNote(''); setReviewDateNoticed('');
  };

  const chooseOutcome = (type: ResolveOutcomeType) => {
    resetEntry();
    setSelectedType(type);
    setStage('FACTS');
  };

  const buildCandidate = (): ResolveOutcomeCandidate | null => {
    const correction = correctionOfEventId ? { correctionOfEventId } : {};
    switch (selectedType) {
      case 'FULL_PAYMENT_REPORTED':
        return {
          type: 'FULL_PAYMENT_REPORTED',
          payload: {
            paymentReceivedDate: fullDate,
            amountReceived: fullAmount === '' ? Number.NaN : Number(fullAmount),
            acceptedConfirmed: fullAccepted as true,
            fullExactNoticeDemandConfirmed: fullExactDemandConfirmed as true,
            receivedFrom: blankToUndefined(fullReceivedFrom),
            note: blankToUndefined(fullNote),
          },
          ...correction,
        };
      case 'PAYMENT_STATUS_REQUIRES_REVIEW':
        if (!paymentSubtype || !paymentAccepted) return null;
        return {
          type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
          payload: {
            subtype: paymentSubtype,
            eventDate: paymentDate,
            ...(paymentAmount !== '' ? { amount: Number(paymentAmount) } : {}),
            accepted: paymentAccepted,
            receivedOrOfferedBy: blankToUndefined(paymentBy),
            note: blankToUndefined(paymentNote),
          },
          ...correction,
        };
      case 'NO_RESOLUTION_REPORTED':
        return { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: noResolutionDate, note: blankToUndefined(noResolutionNote) }, ...correction };
      case 'OWNER_WITHDREW_NOTICE_PATH':
        return {
          type: 'OWNER_WITHDREW_NOTICE_PATH',
          payload: { decisionDate: withdrawalDate, note: blankToUndefined(withdrawalNote), withdrawalConfirmed: true },
          ...correction,
        };
      case 'POSSESSION_CHANGE_REPORTED':
        if (!keysReturned || !physicalPossession) return null;
        return {
          type: 'POSSESSION_CHANGE_REPORTED',
          payload: {
            reportedOrObservedDate: possessionDate,
            observations: possessionObservations.split('\n').map((item) => item.trim()).filter(Boolean),
            keysReturned,
            physicalPossession,
            note: blankToUndefined(possessionNote),
          },
          ...correction,
        };
      case 'SERVICE_OR_OUTCOME_REVIEW':
        return {
          type: 'SERVICE_OR_OUTCOME_REVIEW',
          payload: { reviewReason, factualNote: reviewFactualNote, dateNoticed: blankToUndefined(reviewDateNoticed) },
          ...correction,
        };
      default:
        return null;
    }
  };

  const goToReview = () => {
    if (!context) return;
    setSaveError(null);
    setSavedMessage(null);
    setTransitionMessage(null);
    const candidate = buildCandidate();
    if (!candidate) {
      setSaveError('Complete the required factual fields before review.');
      return;
    }

    if (candidate.type === 'FULL_PAYMENT_REPORTED') {
      if (!Number.isFinite(candidate.payload.amountReceived)) {
        setSaveError('Amount received is required.');
        return;
      }
      const classification = classifyFullPaymentAmount(candidate.payload.amountReceived, exactDemand);
      if (classification === 'PAYMENT_STATUS_REQUIRES_REVIEW') {
        setSelectedType('PAYMENT_STATUS_REQUIRES_REVIEW');
        setPaymentDate(candidate.payload.paymentReceivedDate);
        setPaymentAmount(Number.isFinite(candidate.payload.amountReceived) ? String(candidate.payload.amountReceived) : '');
        setPaymentAccepted(candidate.payload.acceptedConfirmed ? 'YES' : 'NOT_SURE');
        setPaymentBy(candidate.payload.receivedFrom ?? '');
        setPaymentSubtype('');
        setPaymentNote('');
        setStage('FACTS');
        invalidateConfirmation();
        setTransitionMessage(
          `The amount entered does not match the amount shown on this Notice (${displayMoney(exactDemand)}). Full payment cannot be confirmed. Review the payment facts under Payment status requires review, then complete a fresh Review & Confirm.`,
        );
        return;
      }
    }

    try {
      validateOutcomeCandidate(candidate, exactDemand);
      setStage('REVIEW');
      invalidateConfirmation();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Review the required factual fields.');
    }
  };

  const confirmReview = (checkedValue: boolean) => {
    if (!context) return;
    setFactConfirmed(checkedValue);
    setConfirmation(null);
    if (!checkedValue) return;
    const candidate = buildCandidate();
    if (!candidate) return;
    try {
      const next = confirmOutcomeCandidate(
        context.binding,
        candidate,
        new Date().toISOString(),
        {
          factualReportConfirmed: true,
          withdrawalPathStopConfirmed:
            candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' ? withdrawalReviewConfirmed : undefined,
        },
        exactDemand,
      );
      setConfirmation(next);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Review & Confirm could not be completed.');
    }
  };

  const confirmWithdrawalReview = (checkedValue: boolean) => {
    setWithdrawalReviewConfirmed(checkedValue);
    setConfirmation(null);
    setFactConfirmed(false);
  };

  const recordOutcome = () => {
    if (!context || !confirmation || restoreState.status === 'blocked') return;
    const candidate = buildCandidate();
    if (!candidate) return;
    setSaveError(null);
    setSavedMessage(null);
    try {
      validateOutcomeConfirmation(context.binding, candidate, confirmation, exactDemand);
      const recordedAtISO = new Date().toISOString();
      const event: ResolveOutcomeEvent = {
        ...candidate,
        recordKind: 'OUTCOME',
        id: `outcome-${recordedAtISO.replace(/[^0-9]/g, '')}-${history.length + 1}`,
        recordedAtISO,
        confirmation,
      };
      const nextHistory = appendResolveHistoryRecord(history, event, context.binding, exactDemand);
      if (!saveOutcomeHistory(context.binding, nextHistory, exactDemand)) {
        throw new Error('This browser could not save the factual record. Nothing was added.');
      }
      setHistory(nextHistory);
      setRestoreState({ status: 'ready', envelope: { v: 1, savedAt: recordedAtISO, binding: context.binding, events: nextHistory } });
      setSavedMessage(correctionOfEventId ? 'Correction recorded.' : 'Outcome recorded.');
      resetEntry();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The confirmed outcome could not be recorded.');
    }
  };

  const beginReplacementCorrection = (event: ResolveOutcomeEvent) => {
    resetEntry();
    setCorrectionOfEventId(event.id);
    setSelectedType(event.type);
    setStage('FACTS');
    switch (event.type) {
      case 'FULL_PAYMENT_REPORTED':
        setFullDate(event.payload.paymentReceivedDate); setFullAmount(String(event.payload.amountReceived)); setFullAccepted(true); setFullExactDemandConfirmed(true); setFullReceivedFrom(event.payload.receivedFrom ?? ''); setFullNote(event.payload.note ?? '');
        break;
      case 'PAYMENT_STATUS_REQUIRES_REVIEW':
        setPaymentSubtype(event.payload.subtype); setPaymentDate(event.payload.eventDate); setPaymentAmount(event.payload.amount === undefined ? '' : String(event.payload.amount)); setPaymentAccepted(event.payload.accepted); setPaymentBy(event.payload.receivedOrOfferedBy ?? ''); setPaymentNote(event.payload.note ?? '');
        break;
      case 'NO_RESOLUTION_REPORTED': setNoResolutionDate(event.payload.asOfDate); setNoResolutionNote(event.payload.note ?? ''); break;
      case 'OWNER_WITHDREW_NOTICE_PATH': setWithdrawalDate(event.payload.decisionDate); setWithdrawalNote(event.payload.note ?? ''); break;
      case 'POSSESSION_CHANGE_REPORTED': setPossessionDate(event.payload.reportedOrObservedDate); setPossessionObservations(event.payload.observations.join('\n')); setKeysReturned(event.payload.keysReturned); setPhysicalPossession(event.payload.physicalPossession); setPossessionNote(event.payload.note ?? ''); break;
      case 'SERVICE_OR_OUTCOME_REVIEW': setReviewReason(event.payload.reviewReason); setReviewFactualNote(event.payload.factualNote); setReviewDateNoticed(event.payload.dateNoticed ?? ''); break;
    }
  };

  const beginRecordedInError = (event: ResolveOutcomeEvent) => {
    resetEntry();
    setRecordedInErrorTarget(event.id);
    setStage('REVIEW');
  };

  const recordInErrorCorrection = () => {
    if (!context || !recordedInErrorTarget || !recordedInErrorConfirmed) return;
    const now = new Date().toISOString();
    try {
      const correction = createRecordedInErrorCorrection({
        id: `outcome-error-${now.replace(/[^0-9]/g, '')}-${history.length + 1}`,
        targetEventId: recordedInErrorTarget,
        recordedAtISO: now,
        confirmedAtISO: now,
        binding: context.binding,
        recordedInErrorConfirmed: true,
      });
      const nextHistory = appendResolveHistoryRecord(history, correction, context.binding, exactDemand);
      if (!saveOutcomeHistory(context.binding, nextHistory, exactDemand)) throw new Error('This browser could not save the correction.');
      setHistory(nextHistory);
      setRestoreState({ status: 'ready', envelope: { v: 1, savedAt: now, binding: context.binding, events: nextHistory } });
      setSavedMessage('Correction recorded.');
      resetEntry();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The correction could not be recorded.');
    }
  };

  const propertyLine = context ? formatPropertyLine(context.noticeData.propertyAddress ?? '', context.noticeData.propertyUnit) : '';
  const tenants = context ? (context.noticeData.tenantNames ?? []).map((name) => name.trim()).filter(Boolean).join(', ') : '';
  const createdDay = context?.artifact.createdAtISO.slice(0, 10) ?? '';
  const successfulAttempt = context?.successfulAttempt;
  const candidate = stage === 'REVIEW' && !recordedInErrorTarget ? buildCandidate() : null;
  const reviewLines = candidate ? friendlyReviewLines(candidate, exactDemand) : [];
  const confirmationCurrent = !!(
    context && candidate && confirmation &&
    confirmation.generation === outcomeConfirmationGeneration(context.binding, candidate)
  );

  const triSelect = (id: string, label: string, value: YesNoNotSure | '', onChange: (value: YesNoNotSure) => void) => (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900">{label}</label>
      <select id={id} value={value} onChange={(event) => { invalidateConfirmation(); onChange(event.target.value as YesNoNotSure); }} className="mt-2 w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm sm:max-w-sm">
        <option value="">Select</option><option value="YES">Yes</option><option value="NO">No</option><option value="NOT_SURE">Not sure</option>
      </select>
    </div>
  );

  return (
    <main className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <a href="/notice/3-day/serve" className="inline-block text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">&larr; Back to service record</a>
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gold mb-3">3-Day Notice to Pay Rent or Quit</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight mb-2">Resolve &amp; Record</h1>
        <p className="text-sm text-gray-700 leading-relaxed mb-8">Record what happened after service for this Notice.</p>

        {!checked ? null : !draftFound || !context ? (
          <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-brand">A completed service record is required</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">Resolve &amp; Record becomes available after service is recorded as completed for this Notice.</p>
            <a href="/notice/3-day/serve" className="mt-4 inline-flex text-sm font-semibold text-brand underline">Return to Serve &amp; Track &rarr;</a>
          </section>
        ) : restoreState.status === 'blocked' ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-amber-950">Resolve &amp; Record is paused</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">The saved outcome history cannot be safely matched to this Notice and service record. Review the service record before continuing.</p>
            <a href="/notice/3-day/serve" className="mt-4 inline-flex text-sm font-semibold text-brand underline">Verify the service record &rarr;</a>
          </section>
        ) : (
          <div className="space-y-8">
            <section className="rounded-xl border border-rule bg-white p-5 shadow-sm space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-tint p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Current status</p>
                  <p className="mt-1 font-serif text-xl font-bold text-brand">{customerStatusLabel(operationalStatus)}</p>
                </div>
                <div className="rounded-lg bg-tint p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">What to do next</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-brand">{nextTask}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">This Notice and service record</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <div><dt className="text-xs font-medium text-gray-500">Property</dt><dd className="mt-0.5 font-medium text-gray-900">{propertyLine || 'Not available'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Tenant(s)</dt><dd className="mt-0.5 font-medium text-gray-900">{tenants || 'Not available'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Notice created</dt><dd className="mt-0.5 font-medium text-gray-900">{displayDate(createdDay)}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Service method</dt><dd className="mt-0.5 font-medium text-gray-900">{successfulAttempt ? methodLabel(successfulAttempt.method) : 'Not available'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Amount shown on this Notice</dt><dd className="mt-0.5 font-bold text-gray-900">{displayMoney(exactDemand)}</dd></div>
                </dl>
              </div>
              <p className="text-xs text-gray-600">Saved on this browser.</p>
            </section>

            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="font-semibold text-blue-950">Factual record only</p>
              <p className="mt-1 text-sm leading-6 text-blue-900">OwnerPilot recorded this. Nothing was sent or filed. The legal effect of what happened is not independently determined here.</p>
            </section>

            {savedMessage && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">{savedMessage}</p>}
            {transitionMessage && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">{transitionMessage}</p>}
            {saveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{saveError}</p>}

            <section id="resolve-record-entry" className="rounded-xl border border-rule bg-white p-5 shadow-sm space-y-5 scroll-mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Post-service outcome</p><h2 className="mt-1 font-serif text-xl font-bold text-brand">{stage === 'CHOOSE' ? 'Choose what happened' : stage === 'FACTS' ? 'Enter facts' : 'Review what you\'re recording'}</h2></div>
                {stage !== 'CHOOSE' && <button type="button" onClick={resetEntry} className="text-sm font-semibold text-brand underline">Start over</button>}
              </div>

              {stage === 'CHOOSE' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {RESOLVE_OUTCOME_DEFINITIONS.map((definition) => (
                    <button key={definition.id} type="button" onClick={() => chooseOutcome(definition.id)} className="rounded-lg border border-rule bg-white p-4 text-left hover:bg-tint">
                      <span className="block text-sm font-semibold text-brand">{definition.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-gray-600">{choiceDescription(definition.id)}</span>
                    </button>
                  ))}
                </div>
              )}

              {stage === 'FACTS' && selectedType === 'FULL_PAYMENT_REPORTED' && (
                <div className="space-y-4">
                  <p className="rounded-lg border border-rule bg-tint px-4 py-3 text-sm font-semibold text-gray-900">Amount shown on this Notice: {displayMoney(exactDemand)}</p>
                  <div><label className="block text-sm font-semibold text-gray-900">Payment received date</label><input type="date" value={fullDate} onChange={(e) => { invalidateConfirmation(); setFullDate(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-semibold text-gray-900">Amount received</label><input type="number" min="0" step="0.01" value={fullAmount} onChange={(e) => { invalidateConfirmation(); setFullAmount(e.target.value); }} placeholder="" className="mt-2 w-full max-w-xs rounded-lg border border-rule px-3 py-2 text-sm" /><p className="mt-1 text-xs text-gray-500">Begins blank. Enter the actual amount received.</p></div>
                  <label className="flex gap-3 text-sm text-gray-800"><input type="checkbox" checked={fullAccepted} onChange={(e) => { invalidateConfirmation(); setFullAccepted(e.target.checked); }} />I confirm the payment was accepted.</label>
                  <label className="flex gap-3 text-sm text-gray-800"><input type="checkbox" checked={fullExactDemandConfirmed} onChange={(e) => { invalidateConfirmation(); setFullExactDemandConfirmed(e.target.checked); }} />I confirm I am reporting this as the full exact demand shown on this Notice.</label>
                  <div><label className="block text-sm font-semibold text-gray-900">Received from (optional)</label><input value={fullReceivedFrom} onChange={(e) => { invalidateConfirmation(); setFullReceivedFrom(e.target.value); }} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-semibold text-gray-900">Note (optional)</label><textarea value={fullNote} onChange={(e) => { invalidateConfirmation(); setFullNote(e.target.value); }} rows={3} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                </div>
              )}

              {stage === 'FACTS' && selectedType === 'PAYMENT_STATUS_REQUIRES_REVIEW' && (
                <div className="space-y-4">
                  <div><label className="block text-sm font-semibold text-gray-900">Payment status subtype</label><select value={paymentSubtype} onChange={(e) => { invalidateConfirmation(); setPaymentSubtype(e.target.value as PaymentReviewSubtype); }} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm"><option value="">Select</option><option value="PARTIAL_PAYMENT_RECEIVED">Partial payment received</option><option value="RECEIVED_THEN_RETURNED_OR_REFUNDED">Received, then returned or refunded</option><option value="OFFERED_NOT_ACCEPTED">Offered but not accepted</option><option value="OTHER_OR_NOT_SURE">Other / not sure</option></select></div>
                  <div><label className="block text-sm font-semibold text-gray-900">Event / payment date</label><input type="date" value={paymentDate} onChange={(e) => { invalidateConfirmation(); setPaymentDate(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-semibold text-gray-900">Amount (when applicable / known)</label><input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => { invalidateConfirmation(); setPaymentAmount(e.target.value); }} className="mt-2 w-full max-w-xs rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  {triSelect('payment-accepted', 'Accepted?', paymentAccepted, setPaymentAccepted)}
                  <div><label className="block text-sm font-semibold text-gray-900">Received or offered by (optional)</label><input value={paymentBy} onChange={(e) => { invalidateConfirmation(); setPaymentBy(e.target.value); }} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-semibold text-gray-900">Factual note {paymentSubtype === 'OTHER_OR_NOT_SURE' ? '(required)' : '(optional)'}</label><textarea value={paymentNote} onChange={(e) => { invalidateConfirmation(); setPaymentNote(e.target.value); }} rows={3} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                </div>
              )}

              {stage === 'FACTS' && selectedType === 'NO_RESOLUTION_REPORTED' && (
                <div className="space-y-4"><div><label className="block text-sm font-semibold text-gray-900">As-of date</label><input type="date" value={noResolutionDate} onChange={(e) => { invalidateConfirmation(); setNoResolutionDate(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold text-gray-900">Note (optional)</label><textarea value={noResolutionNote} onChange={(e) => { invalidateConfirmation(); setNoResolutionNote(e.target.value); }} rows={3} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div></div>
              )}

              {stage === 'FACTS' && selectedType === 'OWNER_WITHDREW_NOTICE_PATH' && (
                <div className="space-y-4"><div><label className="block text-sm font-semibold text-gray-900">Decision date</label><input type="date" value={withdrawalDate} onChange={(e) => { invalidateConfirmation(); setWithdrawalDate(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold text-gray-900">Reason / note (optional)</label><textarea value={withdrawalNote} onChange={(e) => { invalidateConfirmation(); setWithdrawalNote(e.target.value); }} rows={3} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div></div>
              )}

              {stage === 'FACTS' && selectedType === 'POSSESSION_CHANGE_REPORTED' && (
                <div className="space-y-4">
                  <div><label className="block text-sm font-semibold text-gray-900">Reported / observed date</label><input type="date" value={possessionDate} onChange={(e) => { invalidateConfirmation(); setPossessionDate(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                  <fieldset>
                    <legend className="block text-sm font-semibold text-gray-900">What did you observe?</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {POSSESSION_OBSERVATION_CHOICES.map((choice) => {
                        const selected = possessionObservations.split('\n').filter(Boolean).includes(choice);
                        return <label key={choice} className="flex gap-3 rounded-lg border border-rule bg-white px-3 py-2 text-sm text-gray-800"><input type="checkbox" checked={selected} onChange={(event) => { const values = possessionObservations.split('\n').filter(Boolean); const next = event.target.checked ? [...values, choice] : values.filter((value) => value !== choice); invalidateConfirmation(); setPossessionObservations(next.join('\n')); }} />{choice}</label>;
                      })}
                    </div>
                  </fieldset>
                  {triSelect('keys-returned', 'Keys returned?', keysReturned, setKeysReturned)}
                  {triSelect('physical-possession', 'Physical possession?', physicalPossession, setPhysicalPossession)}
                  <div><label className="block text-sm font-semibold text-gray-900">Note (optional)</label><textarea value={possessionNote} onChange={(e) => { invalidateConfirmation(); setPossessionNote(e.target.value); }} rows={3} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div>
                </div>
              )}

              {stage === 'FACTS' && selectedType === 'SERVICE_OR_OUTCOME_REVIEW' && (
                <div className="space-y-4"><div><label className="block text-sm font-semibold text-gray-900">Review reason</label><input value={reviewReason} onChange={(e) => { invalidateConfirmation(); setReviewReason(e.target.value); }} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold text-gray-900">Factual note</label><textarea value={reviewFactualNote} onChange={(e) => { invalidateConfirmation(); setReviewFactualNote(e.target.value); }} rows={4} className="mt-2 w-full rounded-lg border border-rule px-3 py-2 text-sm" /></div><div><label className="block text-sm font-semibold text-gray-900">Date noticed (optional)</label><input type="date" value={reviewDateNoticed} onChange={(e) => { invalidateConfirmation(); setReviewDateNoticed(e.target.value); }} className="mt-2 rounded-lg border border-rule px-3 py-2 text-sm" /></div></div>
              )}

              {stage === 'FACTS' && <div className="flex flex-wrap gap-3"><button type="button" onClick={goToReview} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">Review what you&apos;re recording</button><button type="button" onClick={() => { setStage('CHOOSE'); invalidateConfirmation(); }} className="rounded-lg border border-rule px-4 py-2.5 text-sm font-semibold text-brand">Back</button></div>}

              {stage === 'REVIEW' && recordedInErrorTarget && (
                <div className="space-y-4"><p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">You are marking an earlier record as recorded in error. The earlier entry will remain visible in history.</p><label className="flex gap-3 text-sm text-gray-800"><input type="checkbox" checked={recordedInErrorConfirmed} onChange={(e) => setRecordedInErrorConfirmed(e.target.checked)} />I confirm this earlier factual record was recorded in error.</label><button type="button" disabled={!recordedInErrorConfirmed} onClick={recordInErrorCorrection} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Record error correction</button></div>
              )}

              {stage === 'REVIEW' && candidate && !recordedInErrorTarget && (
                <div className="space-y-5">
                  {correctionOfEventId && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">You are correcting an earlier record. The earlier record will remain visible in history.</p>}
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{getResolveOutcomeDefinition(candidate.type).label}</p><ul className="mt-3 space-y-2 text-sm text-gray-800">{reviewLines.map((line) => <li key={line} className="rounded-lg bg-tint px-3 py-2">{line}</li>)}</ul></div>
                  {candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' && <label className="flex gap-3 text-sm text-gray-800"><input type="checkbox" checked={withdrawalReviewConfirmed} onChange={(e) => confirmWithdrawalReview(e.target.checked)} />{WITHDRAWAL_CONFIRMATION_COPY}</label>}
                  <label className="flex gap-3 text-sm text-gray-800"><input type="checkbox" disabled={candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' && !withdrawalReviewConfirmed} checked={factConfirmed && confirmationCurrent} onChange={(e) => confirmReview(e.target.checked)} />{FACT_CONFIRMATION_COPY}</label>
                  <div className="flex flex-wrap gap-3"><button type="button" disabled={!confirmationCurrent} onClick={recordOutcome} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Record outcome</button><button type="button" onClick={() => { setStage('FACTS'); invalidateConfirmation(); }} className="rounded-lg border border-rule px-4 py-2.5 text-sm font-semibold text-brand">Back to edit facts</button></div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-brand">Outcome history</h2>
              {history.length === 0 ? <p className="mt-2 text-sm text-gray-600">No outcome recorded yet.</p> : (
                <ol className="mt-4 space-y-3">{[...history].reverse().map((record) => {
                  if (record.recordKind === 'RECORDED_IN_ERROR') return <li key={record.id} className="rounded-lg border border-rule bg-tint p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Corrected</p><p className="mt-1 font-semibold text-brand">An earlier record was marked as recorded in error.</p><p className="mt-1 text-xs text-gray-600">{displayDate(record.recordedAtISO.slice(0, 10))}</p></li>;
                  const effective = effectiveIds.has(record.id);
                  return <li key={record.id} className="rounded-lg border border-rule bg-tint p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{effective ? 'Current' : 'Earlier record'}</p>{record.correctionOfEventId && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600">Corrected</span>}</div><p className="mt-1 font-semibold text-brand">{getResolveOutcomeDefinition(record.type).label}</p><p className="mt-1 text-xs text-gray-600">{displayDate(record.recordedAtISO.slice(0, 10))}</p></div>{effective && <div className="flex flex-wrap gap-3"><button type="button" onClick={() => beginReplacementCorrection(record)} className="text-sm font-semibold text-brand underline">Correct this record</button><button type="button" onClick={() => beginRecordedInError(record)} className="text-sm font-semibold text-brand underline">Mark recorded in error</button></div>}</div></li>;
                })}</ol>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  );
}
