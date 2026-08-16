'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { loadDraft, type RestoredDraft } from '@/lib/flow/persistence';
import { deriveExactNoticeDemand, deriveResolveRecordContext } from '@/lib/flow/outcomeEvents';
import { restoreOutcomeHistory, type RestoredResolveOutcome } from '@/lib/flow/outcomePersistence';
import { deriveFilingReadiness } from '@/lib/flow/filingReadiness';
import type {
  Ud100PhaseASupportAnswers,
  Ud100PhaseBCompletionInput,
} from '@/lib/flow/ud100FilingPreparation';
import type { GeneratedDraftEvidence } from '@/lib/flow/officialFormGeneratedDraft';

interface Snapshot {
  draft: RestoredDraft | null;
  outcome: RestoredResolveOutcome;
}

interface SupportResponse {
  status: 'SUPPORTED' | 'NEEDS_INFORMATION' | 'UNSUPPORTED_CONFIGURATION' | 'CANNOT_CONTINUE';
  ownerState: 'Needs information' | 'Cannot continue';
  detail: string;
  blockers: readonly string[];
}

interface GeneratedResponse {
  status: 'GENERATED_DRAFT';
  ownerState: 'Needs owner review';
  detail: string;
  generatedDraft: GeneratedDraftEvidence;
  generatedBytesBase64: string;
  generatedPdfSha256: string;
  generatedByteLength: number;
}

interface ReviewResponse {
  status: 'OWNER_REVIEWED_DOCUMENT' | 'BLOCKED';
  detail: string;
  currentness?: 'CURRENT' | 'OUT_OF_DATE' | 'BLOCKED';
}

const SUPPORT_OPTIONS = {
  plaintiffRelationship: [
    ['', 'Select'],
    ['OWNER', 'I am the owner / landlord plaintiff'],
    ['OTHER', 'Another plaintiff relationship'],
  ],
  plaintiffType: [
    ['', 'Select'],
    ['INDIVIDUAL_OVER_18', 'Individual over 18'],
    ['CORPORATION', 'Corporation'],
    ['PARTNERSHIP', 'Partnership'],
    ['PUBLIC_AGENCY', 'Public agency'],
    ['OTHER', 'Other'],
  ],
  representationStatus: [
    ['', 'Select'],
    ['SELF_REPRESENTED', 'Self-represented'],
    ['OUTSIDE_ATTORNEY', 'Represented by an outside attorney'],
  ],
  dbaUse: [
    ['', 'Select'],
    ['NO_DBA', 'No DBA / fictitious business name'],
    ['USES_DBA', 'Uses a DBA / fictitious business name'],
  ],
  doePosture: [
    ['', 'Select'],
    ['NO_DOES', 'No Doe defendants'],
    ['USES_DOES', 'Include Doe defendants'],
  ],
  initialComplaintLifecycle: [
    ['', 'Select'],
    ['INITIAL_PREFILING', 'This is the initial complaint preparation'],
    ['PRIOR_COMPLAINT_EXISTS', 'A complaint already exists'],
  ],
  leasePosture: [
    ['', 'Select'],
    ['NO_AGREEMENT', 'No rental agreement'],
    ['AGREEMENT_OR_OTHER', 'Rental agreement or another agreement path'],
  ],
  noticePosture: [
    ['', 'Select'],
    ['PAY_RENT_OR_QUIT_3_DAY', '3-Day Notice to Pay Rent or Quit'],
    ['OTHER', 'Another Notice allegation'],
  ],
  servicePosture: [
    ['', 'Select'],
    ['PERSONAL_HAND_DELIVERY', 'Personal hand delivery'],
    ['OTHER', 'Another service method'],
  ],
  otherNoticesPosture: [
    ['', 'Select'],
    ['NO_OTHER_NOTICES', 'No other notices'],
    ['OTHER_NOTICES', 'Other notices are involved'],
  ],
  fixedTermPosture: [
    ['', 'Select'],
    ['DO_NOT_SELECT', 'Do not use a fixed-term expiration theory'],
    ['SELECT', 'Use a fixed-term expiration theory'],
  ],
  optionalReliefPosture: [
    ['', 'Select'],
    ['PAST_DUE_RENT_ONLY', 'Past-due rent only; no other optional relief'],
    ['OTHER_RELIEF', 'Request other optional relief'],
  ],
} as const;

type SupportKey = keyof typeof SUPPORT_OPTIONS;
type SupportSelections = Record<SupportKey, string>;

const EDITABLE_SUPPORT_KEYS: readonly SupportKey[] = [
  'plaintiffRelationship',
  'plaintiffType',
  'representationStatus',
  'dbaUse',
  'doePosture',
  'initialComplaintLifecycle',
  'leasePosture',
  'otherNoticesPosture',
  'fixedTermPosture',
  'optionalReliefPosture',
];

const SUPPORT_LABELS: Record<SupportKey, string> = {
  plaintiffRelationship: 'Plaintiff relationship',
  plaintiffType: 'Plaintiff type',
  representationStatus: 'Representation',
  dbaUse: 'DBA / fictitious business name',
  doePosture: 'Doe defendants',
  initialComplaintLifecycle: 'Complaint stage',
  leasePosture: 'Rental agreement path',
  noticePosture: 'Notice allegation',
  servicePosture: 'Recorded service method',
  otherNoticesPosture: 'Other notices',
  fixedTermPosture: 'Fixed-term expiration theory',
  optionalReliefPosture: 'Optional relief',
};

const RENTAL_ASSISTANCE_QUESTIONS = {
  rental11a: 'Has plaintiff received rental assistance or other financial compensation from any other source corresponding to the amount demanded in the notice underlying the complaint?',
  rental11b: 'Has plaintiff received rental assistance or other financial compensation from any other source for rent accruing after the date of the notice underlying the complaint?',
  rental11c: 'Does plaintiff have any pending application for rental assistance or other financial compensation from any other source corresponding to the amount demanded in the notice underlying the complaint?',
  rental11d: 'Does plaintiff have any pending application for rental assistance or other financial compensation from any other source for rent accruing after the date on the notice underlying the complaint?',
} as const;

const OPTIONAL_RELIEF_ITEMS = [
  'Fair rental value',
  'Statutory damages',
  'Relocation damages',
  'Forfeiture',
  'Attorney fees',
  'Other relief',
  'Other allegations',
] as const;

const COURT_IDENTITY_KEYS = [
  'courtCounty',
  'courtStreetAddress',
  'courtMailingAddress',
  'courtCityAndZip',
  'courtBranchName',
] as const;
type CourtIdentityKey = (typeof COURT_IDENTITY_KEYS)[number];

interface CompletionFields {
  propertyZip: string;
  propertyNoUnitConfirmed: boolean;
  premisesAge: string;
  courtCounty: string;
  courtStreetAddress: string;
  courtMailingAddress: string;
  courtCityAndZip: string;
  courtBranchName: string;
  courtConfirmed: boolean;
  filerName: string;
  filerStreetAddress: string;
  filerCity: string;
  filerState: string;
  filerZip: string;
  filerTelephone: string;
  filerEmail: string;
  rentDueAtService: string;
  rental11a: '' | 'YES' | 'NO';
  rental11b: '' | 'YES' | 'NO';
  rental11c: '' | 'YES' | 'NO';
  rental11d: '' | 'YES' | 'NO';
  noticeComplaintUse: '' | 'YES' | 'NO';
  serviceComplaintUse: '' | 'YES' | 'NO';
  pastDueSelected: '' | 'YES' | 'NO';
  pastDueAmount: string;
  optionalReliefNoneConfirmed: boolean;
}

const EMPTY_SUPPORT: SupportSelections = {
  plaintiffRelationship: '',
  plaintiffType: '',
  representationStatus: '',
  dbaUse: '',
  doePosture: '',
  initialComplaintLifecycle: '',
  leasePosture: '',
  noticePosture: '',
  servicePosture: '',
  otherNoticesPosture: '',
  fixedTermPosture: '',
  optionalReliefPosture: '',
};

const EMPTY_COMPLETION: CompletionFields = {
  propertyZip: '',
  propertyNoUnitConfirmed: false,
  premisesAge: '',
  courtCounty: '',
  courtStreetAddress: '',
  courtMailingAddress: '',
  courtCityAndZip: '',
  courtBranchName: '',
  courtConfirmed: false,
  filerName: '',
  filerStreetAddress: '',
  filerCity: '',
  filerState: 'CA',
  filerZip: '',
  filerTelephone: '',
  filerEmail: '',
  rentDueAtService: '',
  rental11a: '',
  rental11b: '',
  rental11c: '',
  rental11d: '',
  noticeComplaintUse: '',
  serviceComplaintUse: '',
  pastDueSelected: '',
  pastDueAmount: '',
  optionalReliefNoneConfirmed: false,
};

function readSnapshot(): Snapshot {
  const draft = loadDraft();
  if (!draft) return { draft: null, outcome: { status: 'absent' } };
  const context = deriveResolveRecordContext(draft.data);
  if (!context) return { draft, outcome: { status: 'absent' } };
  return {
    draft,
    outcome: restoreOutcomeHistory(
      context.binding,
      deriveExactNoticeDemand(context.artifact),
    ),
  };
}

function supportState(value: string) {
  return value ? { state: 'KNOWN' as const, value } : { state: 'UNANSWERED' as const };
}

function buildPhaseA(values: SupportSelections): Ud100PhaseASupportAnswers {
  return {
    plaintiffRelationship: supportState(values.plaintiffRelationship) as Ud100PhaseASupportAnswers['plaintiffRelationship'],
    plaintiffType: supportState(values.plaintiffType) as Ud100PhaseASupportAnswers['plaintiffType'],
    representationStatus: supportState(values.representationStatus) as Ud100PhaseASupportAnswers['representationStatus'],
    dbaUse: supportState(values.dbaUse) as Ud100PhaseASupportAnswers['dbaUse'],
    doePosture: supportState(values.doePosture) as Ud100PhaseASupportAnswers['doePosture'],
    initialComplaintLifecycle: supportState(values.initialComplaintLifecycle) as Ud100PhaseASupportAnswers['initialComplaintLifecycle'],
    leasePosture: supportState(values.leasePosture) as Ud100PhaseASupportAnswers['leasePosture'],
    noticePosture: supportState(values.noticePosture) as Ud100PhaseASupportAnswers['noticePosture'],
    servicePosture: supportState(values.servicePosture) as Ud100PhaseASupportAnswers['servicePosture'],
    otherNoticesPosture: supportState(values.otherNoticesPosture) as Ud100PhaseASupportAnswers['otherNoticesPosture'],
    fixedTermPosture: supportState(values.fixedTermPosture) as Ud100PhaseASupportAnswers['fixedTermPosture'],
    optionalReliefPosture: supportState(values.optionalReliefPosture) as Ud100PhaseASupportAnswers['optionalReliefPosture'],
  };
}

function confirmation(id: string, at: string) {
  return { confirmationId: id, confirmedAtISO: at };
}

function numericFact(value: string) {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed)
    ? { state: 'KNOWN' as const, value: parsed }
    : { state: 'UNANSWERED' as const };
}

function booleanFacts(value: '' | 'YES' | 'NO') {
  return value === '' ? null : value === 'YES';
}

function buildPhaseB(
  fields: CompletionFields,
  support: SupportSelections,
  frozenUnitPresent: boolean,
  confirmedAtISO: string,
  confirmationId: string,
): Ud100PhaseBCompletionInput {
  const shared = confirmation(confirmationId, confirmedAtISO);
  const rentalValues = [fields.rental11a, fields.rental11b, fields.rental11c, fields.rental11d].map(booleanFacts);
  const rentalComplete = rentalValues.every(value => value !== null);
  const pastDueAmount = Number(fields.pastDueAmount);
  const pastDueKnown = fields.pastDueSelected !== ''
    && (fields.pastDueSelected === 'NO' || (fields.pastDueAmount.trim() !== '' && Number.isFinite(pastDueAmount)));

  return {
    propertyZip: fields.propertyZip.trim()
      ? { state: 'KNOWN', value: fields.propertyZip.trim() }
      : { state: 'UNANSWERED' },
    propertyUnitConfirmation: frozenUnitPresent
      ? undefined
      : fields.propertyNoUnitConfirmed
        ? { state: 'KNOWN', value: 'NO_UNIT' }
        : { state: 'UNANSWERED' },
    selectedFilingCourt: fields.courtConfirmed && [
      fields.courtCounty,
      fields.courtStreetAddress,
      fields.courtMailingAddress,
      fields.courtCityAndZip,
      fields.courtBranchName,
    ].every(value => value.trim())
      ? {
          state: 'KNOWN',
          value: {
            county: fields.courtCounty.trim(),
            streetAddress: fields.courtStreetAddress.trim(),
            mailingAddress: fields.courtMailingAddress.trim(),
            cityAndZip: fields.courtCityAndZip.trim(),
            branchName: fields.courtBranchName.trim(),
          },
          confirmation: shared,
        }
      : { state: 'REQUIRES_CONFIRMATION', reason: 'Owner-selected filing court requires complete values and explicit owner confirmation.' },
    filerContact: [
      fields.filerName,
      fields.filerStreetAddress,
      fields.filerCity,
      fields.filerState,
      fields.filerZip,
      fields.filerTelephone,
      fields.filerEmail,
    ].every(value => value.trim())
      ? {
          state: 'KNOWN',
          value: {
            name: fields.filerName.trim(),
            streetAddress: fields.filerStreetAddress.trim(),
            city: fields.filerCity.trim(),
            state: fields.filerState.trim(),
            zip: fields.filerZip.trim(),
            telephone: fields.filerTelephone.trim(),
            email: fields.filerEmail.trim(),
            representationStatus: support.representationStatus === 'SELF_REPRESENTED'
              ? 'SELF_REPRESENTED'
              : 'OUTSIDE_ATTORNEY',
          },
        }
      : { state: 'UNANSWERED' },
    premisesAge: fields.premisesAge.trim()
      ? { state: 'KNOWN', value: fields.premisesAge.trim() }
      : { state: 'UNANSWERED' },
    rentDueAtService: numericFact(fields.rentDueAtService),
    rentalAssistanceFacts: rentalComplete
      ? {
          state: 'KNOWN',
          value: {
            item11aReceived: rentalValues[0] as boolean,
            item11bReceived: rentalValues[1] as boolean,
            item11cHas: rentalValues[2] as boolean,
            item11dHas: rentalValues[3] as boolean,
          },
        }
      : { state: 'UNANSWERED' },
    doeElection: {
      state: 'KNOWN',
      value: { include: false },
      confirmation: shared,
    },
    noticeComplaintElection: fields.noticeComplaintUse === 'YES'
      ? {
          state: 'KNOWN',
          value: 'PAY_RENT_OR_QUIT_3_DAY',
          confirmation: shared,
        }
      : fields.noticeComplaintUse === 'NO'
        ? { state: 'REQUIRES_CONFIRMATION', reason: 'The current E.2.2 path requires the owner to elect use of the exact Created Notice for this complaint.' }
        : { state: 'UNANSWERED' },
    serviceComplaintElection: fields.serviceComplaintUse === 'YES'
      ? {
          state: 'KNOWN',
          value: 'PERSONAL_HAND_DELIVERY',
          confirmation: shared,
        }
      : fields.serviceComplaintUse === 'NO'
        ? { state: 'REQUIRES_CONFIRMATION', reason: 'The current E.2.2 path requires the owner to elect use of the recorded personal hand delivery for this complaint.' }
        : { state: 'UNANSWERED' },
    fixedTermExpirationElection: {
      state: 'KNOWN',
      value: 'DO_NOT_SELECT',
      confirmation: shared,
    },
    pastDueRentRelief: pastDueKnown
      ? {
          state: 'KNOWN',
          value: fields.pastDueSelected === 'YES'
            ? { selected: true, amount: pastDueAmount }
            : { selected: false },
          confirmation: shared,
        }
      : { state: 'UNANSWERED' },
    otherReliefSelections: fields.optionalReliefNoneConfirmed
      ? {
          state: 'KNOWN',
          value: {
            fairRentalValue: false,
            statutoryDamages: false,
            relocationDamages: false,
            forfeiture: false,
            attorneyFees: false,
            otherRelief: false,
            otherAllegations: false,
          },
          confirmation: shared,
        }
      : { state: 'UNANSWERED' },
  };
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function phaseBConfirmationIdentity(preparedAtISO: string) {
  return {
    confirmedAtISO: preparedAtISO,
    confirmationId: `e2-2-filing-choice:${preparedAtISO}`,
  };
}

function serviceMethodLabel(method: string | undefined): string {
  if (method === 'personal') return 'Personal hand delivery';
  if (method === 'substituted') return 'Substituted service';
  if (method === 'post_and_mail') return 'Posting and mailing';
  return 'Unavailable';
}

function formatMoney(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? 'Unavailable'
    : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function FilingReadiness() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const signatureRef = useRef('');
  const [supportSelections, setSupportSelections] = useState<SupportSelections>(EMPTY_SUPPORT);
  const [supportResult, setSupportResult] = useState<SupportResponse | null>(null);
  const [completion, setCompletion] = useState<CompletionFields>(EMPTY_COMPLETION);
  const [busy, setBusy] = useState<'support' | 'prepare' | 'review' | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [filingChoiceConfirmed, setFilingChoiceConfirmed] = useState(false);
  const [generated, setGenerated] = useState<GeneratedResponse | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [renderedAtISO, setRenderedAtISO] = useState<string | null>(null);
  const [ownerReviewConfirmed, setOwnerReviewConfirmed] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      if (disposed) return;
      const next = readSnapshot();
      const signature = JSON.stringify(next);
      if (signature === signatureRef.current) return;
      if (signatureRef.current && signature !== signatureRef.current) {
        setSupportResult(null);
        setFilingChoiceConfirmed(false);
        setGenerated(null);
        setPdfUrl(previous => {
          if (previous) URL.revokeObjectURL(previous);
          return null;
        });
        setRenderedAtISO(null);
        setOwnerReviewConfirmed(false);
        setReviewResult({ status: 'BLOCKED', detail: 'Out of date — prepare an updated document for review.', currentness: 'OUT_OF_DATE' });
      }
      signatureRef.current = signature;
      setSnapshot(next);
    };
    refresh();
    const interval = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  if (!snapshot) return null;
  const draftData = snapshot.draft?.data ?? null;
  const resolveContext = draftData ? deriveResolveRecordContext(draftData) : null;
  const createdNotice = resolveContext?.artifact ?? null;
  const noticeData = createdNotice?.createData ?? null;
  const successfulService = resolveContext?.successfulAttempt ?? null;
  const effectiveSupportSelections: SupportSelections = {
    ...supportSelections,
    noticePosture: createdNotice ? 'PAY_RENT_OR_QUIT_3_DAY' : '',
    servicePosture: successfulService
      ? successfulService.method === 'personal' ? 'PERSONAL_HAND_DELIVERY' : 'OTHER'
      : '',
  };
  const phaseA = buildPhaseA(effectiveSupportSelections);

  const readiness = deriveFilingReadiness({
    data: draftData,
    noticePageIndex: snapshot.draft?.pageIndex ?? null,
    outcome: snapshot.outcome,
  });
  const attention = readiness.checklist.filter(item =>
    item.status === 'Needs information' ||
    item.status === 'Needs owner review' ||
    item.status === 'Cannot continue',
  );
  const canStartE22 = readiness.state === 'Ready for packet review' && !!draftData;
  const frozenUnit = noticeData?.propertyUnit?.trim() ?? '';
  const hasFrozenUnit = frozenUnit !== '';
  const noticeAddress = noticeData
    ? [noticeData.propertyAddress, noticeData.propertyUnit, noticeData.propertyCity, noticeData.propertyCounty]
        .filter(value => typeof value === 'string' && value.trim() !== '')
        .join(', ')
    : 'Unavailable';
  const noticeTenantNames = noticeData?.tenantNames?.filter(name => name.trim() !== '').join(', ') || 'Unavailable';
  const noticeDemand = createdNotice ? deriveExactNoticeDemand(createdNotice) : null;

  const courtComplete = completion.courtConfirmed && COURT_IDENTITY_KEYS.every(key => completion[key].trim() !== '');
  const filerComplete = [
    completion.filerName,
    completion.filerStreetAddress,
    completion.filerCity,
    completion.filerState,
    completion.filerZip,
    completion.filerTelephone,
    completion.filerEmail,
  ].every(value => value.trim() !== '');
  const rentalAssistanceComplete = [
    completion.rental11a,
    completion.rental11b,
    completion.rental11c,
    completion.rental11d,
  ].every(value => value !== '');
  const pastDueComplete = completion.pastDueSelected !== ''
    && (completion.pastDueSelected === 'NO'
      || (completion.pastDueAmount.trim() !== '' && Number.isFinite(Number(completion.pastDueAmount))));
  const unitComplete = hasFrozenUnit || completion.propertyNoUnitConfirmed;
  const filingPrerequisitesComplete = supportResult?.status === 'SUPPORTED'
    && completion.propertyZip.trim() !== ''
    && completion.premisesAge.trim() !== ''
    && completion.rentDueAtService.trim() !== ''
    && Number.isFinite(Number(completion.rentDueAtService))
    && unitComplete
    && courtComplete
    && filerComplete
    && rentalAssistanceComplete
    && completion.noticeComplaintUse === 'YES'
    && completion.serviceComplaintUse === 'YES'
    && pastDueComplete
    && completion.optionalReliefNoneConfirmed;

  const setSupport = (key: SupportKey, value: string) => {
    setSupportSelections(previous => ({ ...previous, [key]: value }));
    setSupportResult(null);
    setFilingChoiceConfirmed(false);
    setGenerated(null);
    setRenderedAtISO(null);
    setOwnerReviewConfirmed(false);
    setReviewResult(null);
  };

  const setField = <K extends keyof CompletionFields>(key: K, value: CompletionFields[K]) => {
    const invalidatesCourtConfirmation = COURT_IDENTITY_KEYS.includes(key as CourtIdentityKey);
    setCompletion(previous => ({
      ...previous,
      [key]: value,
      ...(invalidatesCourtConfirmation ? { courtConfirmed: false } : {}),
    }));
    setFilingChoiceConfirmed(false);
    setGenerated(null);
    setRenderedAtISO(null);
    setOwnerReviewConfirmed(false);
    setReviewResult(generated ? { status: 'BLOCKED', detail: 'Out of date — prepare an updated document for review.', currentness: 'OUT_OF_DATE' } : null);
  };

  async function checkSupport() {
    setBusy('support');
    setOperationError(null);
    try {
      const response = await fetch('/api/notice/filing-preparation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'support',
          context: { data: draftData, phaseA },
        }),
      });
      const payload = await response.json() as SupportResponse;
      setSupportResult(payload);
    } catch {
      setOperationError('OwnerPilot could not complete the filing-information support check. No Notice facts were changed.');
    } finally {
      setBusy(null);
    }
  }

  async function prepare() {
    if (!filingChoiceConfirmed || !filingPrerequisitesComplete) {
      setOperationError('Complete the current filing choices and affirm them before preparing the UD-100.');
      return;
    }
    const preparedAtISO = new Date().toISOString();
    const identity = phaseBConfirmationIdentity(preparedAtISO);
    const phaseB = buildPhaseB(
      completion,
      effectiveSupportSelections,
      hasFrozenUnit,
      identity.confirmedAtISO,
      identity.confirmationId,
    );
    setBusy('prepare');
    setOperationError(null);
    try {
      const response = await fetch('/api/notice/filing-preparation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'prepare',
          context: { data: draftData, phaseA, phaseB },
          filingChoiceConfirmation: {
            confirmed: true,
            confirmationId: identity.confirmationId,
            confirmedAtISO: identity.confirmedAtISO,
          },
          preparedAtISO,
        }),
      });
      const payload = await response.json() as GeneratedResponse | { status: 'BLOCKED'; detail: string };
      if (payload.status !== 'GENERATED_DRAFT') {
        setGenerated(null);
        setOperationError(payload.detail);
        return;
      }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const bytes = bytesFromBase64(payload.generatedBytesBase64);
      const exactArrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const nextUrl = URL.createObjectURL(new Blob([exactArrayBuffer], { type: 'application/pdf' }));
      setPdfUrl(nextUrl);
      setGenerated(payload);
      setRenderedAtISO(null);
      setOwnerReviewConfirmed(false);
      setReviewResult(null);
    } catch {
      setOperationError('OwnerPilot could not prepare the UD-100. No document was filed or sent.');
    } finally {
      setBusy(null);
    }
  }

  async function reviewGeneratedDocument() {
    if (!generated || !renderedAtISO || !ownerReviewConfirmed) {
      setOperationError('Render and review the exact generated document, then affirm that exact document before continuing.');
      return;
    }
    const identity = phaseBConfirmationIdentity(generated.generatedDraft.preparedAtISO);
    const phaseB = buildPhaseB(
      completion,
      effectiveSupportSelections,
      hasFrozenUnit,
      identity.confirmedAtISO,
      identity.confirmationId,
    );
    setBusy('review');
    setOperationError(null);
    try {
      const response = await fetch('/api/notice/filing-preparation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'review',
          context: { data: draftData, phaseA, phaseB },
          generatedDraft: generated.generatedDraft,
          generatedBytesBase64: generated.generatedBytesBase64,
          renderedAcknowledgment: {
            renderedGeneratedDocumentId: generated.generatedDraft.generatedDocumentId,
            renderedPdfSha256: generated.generatedPdfSha256,
            renderedByteLength: generated.generatedByteLength,
            renderedAtISO,
          },
          ownerConfirmedExactRenderedDocument: true,
          reviewedAtISO: new Date().toISOString(),
        }),
      });
      const payload = await response.json() as ReviewResponse;
      setReviewResult(payload);
      if (payload.status === 'BLOCKED') setOperationError(payload.detail);
    } catch {
      setOperationError('OwnerPilot could not record the document review. Nothing was signed, filed, or sent.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-labelledby="filing-preparation-heading">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filing preparation</p>
        <h1 id="filing-preparation-heading" className="mt-2 font-serif text-2xl font-bold text-brand sm:text-3xl">
          {readiness.state}
        </h1>
        {readiness.noticeIdentity && <p className="mt-2 text-sm text-muted">{readiness.noticeIdentity}</p>}
        <p className="mt-4 text-sm leading-relaxed text-ink">{readiness.summary}</p>

        <div className="mt-5 rounded-lg bg-tint p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What to do next</p>
          {readiness.nextTask.href ? (
            <Link href={readiness.nextTask.href} className="mt-1 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline">
              {readiness.nextTask.label} →
            </Link>
          ) : (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">{readiness.nextTask.label}</p>
          )}
        </div>

        {attention.length > 0 && (
          <div className="mt-5 rounded-lg border border-rule p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Needs attention</p>
            <ul className="mt-3 space-y-2">
              {attention.map(item => (
                <li key={item.key} className="text-sm leading-relaxed text-ink">
                  <span className="font-semibold">{item.title}:</span>{' '}
                  {item.missingOrReview ?? item.ownerPilotKnows}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {canStartE22 && (
        <section className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-labelledby="complete-filing-information-heading">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next preparation task</p>
          <h2 id="complete-filing-information-heading" className="mt-2 font-serif text-xl font-bold text-brand">Complete filing information</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            OwnerPilot checks whether this matter fits the UD-100 configuration this version can prepare before asking for the remaining filing information.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Keep this page open while you finish. These filing-preparation answers are not saved as a durable filing record yet. If you refresh or leave, you may need to confirm them again.
          </p>

          <div className="mt-5 rounded-lg border border-rule p-4">
            <h3 className="text-sm font-semibold text-ink">1. Check this configuration</h3>
            <p className="mt-2 text-sm text-muted">These answers check the current Product capability. They do not determine whether you legally may file.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-tint p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your Notice</p>
                <p className="mt-2 text-sm font-semibold text-ink">3-Day Notice to Pay Rent or Quit</p>
                <p className="mt-1 text-sm text-ink">Property: {noticeAddress}</p>
                <p className="mt-1 text-sm text-ink">Tenant/defendant: {noticeTenantNames}</p>
                <p className="mt-1 text-sm text-ink">Notice amount: {formatMoney(noticeDemand)}</p>
              </div>
              <div className="rounded-md bg-tint p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your service record</p>
                <p className="mt-2 text-sm font-semibold text-ink">{serviceMethodLabel(successfulService?.method)}</p>
                <p className="mt-1 text-sm text-ink">Service date: {successfulService?.attemptDate ?? 'Unavailable'}</p>
                <p className="mt-1 text-sm text-ink">Tenant/defendant: {noticeTenantNames}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">These historical Notice and service facts are reused from their exact records here; they are not editable filing answers.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {EDITABLE_SUPPORT_KEYS.map(key => (
                <label key={key} className="text-sm text-ink">
                  <span className="mb-1 block font-semibold">{SUPPORT_LABELS[key]}</span>
                  <select
                    className="w-full rounded-md border border-rule bg-white px-3 py-2"
                    value={supportSelections[key]}
                    onChange={event => setSupport(key, event.target.value)}
                  >
                    {SUPPORT_OPTIONS[key].map(([value, label]) => <option key={value || 'blank'} value={value}>{label}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={checkSupport}
              disabled={busy !== null}
              className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === 'support' ? 'Checking…' : 'Check this configuration'}
            </button>

            {supportResult && (
              <div className="mt-4 rounded-md bg-tint p-4" role="status">
                <p className="text-sm font-semibold text-ink">{supportResult.ownerState}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{supportResult.detail}</p>
                {supportResult.blockers.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Checked by OwnerPilot</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                      {supportResult.blockers.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {supportResult?.status === 'SUPPORTED' && (
            <div className="mt-5 rounded-lg border border-rule p-4">
              <h3 className="text-sm font-semibold text-ink">2. Complete the remaining filing information</h3>

              <div className="mt-4 rounded-md bg-tint p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your Notice</p>
                <p className="mt-2 text-sm text-ink">Property: {noticeAddress}</p>
                {hasFrozenUnit ? (
                  <p className="mt-1 text-sm text-ink">Unit/suite: <span className="font-semibold">{frozenUnit}</span> — reused from the Created Notice.</p>
                ) : (
                  <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" checked={completion.propertyNoUnitConfirmed} onChange={event => setField('propertyNoUnitConfirmed', event.target.checked)} className="mt-1" />
                    <span>This property has no unit/suite number.</span>
                  </label>
                )}
                <p className="mt-1 text-sm text-ink">Tenant/defendant: {noticeTenantNames}</p>
                <p className="mt-1 text-sm text-ink">Notice amount: {formatMoney(noticeDemand)}</p>
                <label className="mt-3 block text-sm text-ink">
                  <span className="mb-1 block font-semibold">Use this 3-Day Notice to Pay Rent or Quit as the notice allegation for this complaint?</span>
                  <select className="w-full rounded-md border border-rule bg-white px-3 py-2" value={completion.noticeComplaintUse} onChange={event => setField('noticeComplaintUse', event.target.value as CompletionFields['noticeComplaintUse'])}>
                    <option value="">Select</option><option value="YES">Yes</option><option value="NO">No</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-md bg-tint p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your service record</p>
                <p className="mt-2 text-sm text-ink">Method: <span className="font-semibold">{serviceMethodLabel(successfulService?.method)}</span></p>
                <p className="mt-1 text-sm text-ink">Service date: {successfulService?.attemptDate ?? 'Unavailable'}</p>
                <p className="mt-1 text-sm text-ink">Tenant/defendant: {noticeTenantNames}</p>
                <label className="mt-3 block text-sm text-ink">
                  <span className="mb-1 block font-semibold">Use this recorded personal hand delivery as the service statement for this complaint?</span>
                  <select className="w-full rounded-md border border-rule bg-white px-3 py-2" value={completion.serviceComplaintUse} onChange={event => setField('serviceComplaintUse', event.target.value as CompletionFields['serviceComplaintUse'])}>
                    <option value="">Select</option><option value="YES">Yes</option><option value="NO">No</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-1 block font-semibold">Property ZIP</span><input className="w-full rounded-md border border-rule px-3 py-2" value={completion.propertyZip} onChange={event => setField('propertyZip', event.target.value)} /></label>
                <label className="text-sm"><span className="mb-1 block font-semibold">Approximate year premises were built</span><input className="w-full rounded-md border border-rule px-3 py-2" value={completion.premisesAge} onChange={event => setField('premisesAge', event.target.value)} /></label>
              </div>

              <div className="mt-5 rounded-md bg-tint p-4">
                <p className="text-sm font-semibold text-ink">Which court do you intend to file this case in?</p>
                <p className="mt-1 text-sm text-muted">OwnerPilot will use the court you confirm on these filing documents. OwnerPilot has not determined that this is the legally correct filing location.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    ['courtCounty', 'County'],
                    ['courtStreetAddress', 'Street address'],
                    ['courtMailingAddress', 'Mailing address'],
                    ['courtCityAndZip', 'City and ZIP'],
                    ['courtBranchName', 'Branch name'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-sm"><span className="mb-1 block font-semibold">{label}</span><input className="w-full rounded-md border border-rule bg-white px-3 py-2" value={completion[key]} onChange={event => setField(key, event.target.value)} /></label>
                  ))}
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" checked={completion.courtConfirmed} onChange={event => setField('courtConfirmed', event.target.checked)} className="mt-1" />
                  <span>I confirm this is the court I intend to use for this filing.</span>
                </label>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">You confirm — filer/contact facts</p>
                <p className="mt-1 text-sm text-muted">Do not enter legal-role text for the form caption. OwnerPilot uses your factual representation status and the governed caption control.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    ['filerName', 'Full name'],
                    ['filerStreetAddress', 'Street address'],
                    ['filerCity', 'City'],
                    ['filerState', 'State'],
                    ['filerZip', 'ZIP'],
                    ['filerTelephone', 'Telephone'],
                    ['filerEmail', 'Email'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-sm"><span className="mb-1 block font-semibold">{label}</span><input className="w-full rounded-md border border-rule px-3 py-2" value={completion[key]} onChange={event => setField(key, event.target.value)} /></label>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-1 block font-semibold">Rent actually unpaid at the recorded service event</span><input inputMode="decimal" className="w-full rounded-md border border-rule px-3 py-2" value={completion.rentDueAtService} onChange={event => setField('rentDueAtService', event.target.value)} /></label>
                <label className="text-sm"><span className="mb-1 block font-semibold">Request past-due rent in this complaint?</span><select className="w-full rounded-md border border-rule px-3 py-2" value={completion.pastDueSelected} onChange={event => setField('pastDueSelected', event.target.value as CompletionFields['pastDueSelected'])}><option value="">Select</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
                {completion.pastDueSelected === 'YES' && <label className="text-sm"><span className="mb-1 block font-semibold">Past-due amount to request</span><input inputMode="decimal" className="w-full rounded-md border border-rule px-3 py-2" value={completion.pastDueAmount} onChange={event => setField('pastDueAmount', event.target.value)} /></label>}
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rental-assistance facts</p>
                <p className="mt-1 text-sm text-muted">Answer each factual question Yes or No. Leaving a question unselected remains unanswered.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(Object.entries(RENTAL_ASSISTANCE_QUESTIONS) as Array<[keyof typeof RENTAL_ASSISTANCE_QUESTIONS, string]>).map(([key, label]) => (
                    <label key={key} className="text-sm"><span className="mb-1 block font-semibold">{label}</span><select className="w-full rounded-md border border-rule px-3 py-2" value={completion[key]} onChange={event => setField(key, event.target.value as CompletionFields[typeof key])}><option value="">Select</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-md border border-rule p-4">
                <p className="text-sm font-semibold text-ink">Additional relief items</p>
                <p className="mt-1 text-sm text-muted">This E.2.2 path can proceed only when none of these additional items is being requested:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
                  {OPTIONAL_RELIEF_ITEMS.map(item => <li key={item}>{item}</li>)}
                </ul>
                <label className="mt-4 flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" checked={completion.optionalReliefNoneConfirmed} onChange={event => setField('optionalReliefNoneConfirmed', event.target.checked)} className="mt-1" />
                  <span>I am not asking OwnerPilot to include any of these additional relief items in this complaint.</span>
                </label>
                <p className="mt-2 text-sm text-muted">If you want any listed item, this current E.2.2 preparation path does not support it.</p>
              </div>

              <div className="mt-5 rounded-md border border-rule p-4" aria-label="Pre-generation provenance summary">
                <p className="text-sm font-semibold text-ink">Review what will be used</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your Notice</p>
                    <p className="mt-1 text-sm text-ink">{noticeAddress}</p>
                    <p className="mt-1 text-sm text-ink">{noticeTenantNames}; notice amount {formatMoney(noticeDemand)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">From your service record</p>
                    <p className="mt-1 text-sm text-ink">{serviceMethodLabel(successfulService?.method)} on {successfulService?.attemptDate ?? 'Unavailable'} for {noticeTenantNames}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">You confirmed for this filing</p>
                    <p className="mt-1 text-sm text-ink">Court: {completion.courtBranchName || 'Not yet complete'}</p>
                    <p className="mt-1 text-sm text-ink">Notice election: {completion.noticeComplaintUse || 'Unanswered'}; service election: {completion.serviceComplaintUse || 'Unanswered'}</p>
                    <p className="mt-1 text-sm text-ink">Past-due rent: {completion.pastDueSelected || 'Unanswered'}; additional relief: {completion.optionalReliefNoneConfirmed ? 'None selected' : 'Not yet confirmed'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Checked by OwnerPilot</p>
                    <p className="mt-1 text-sm text-ink">{supportResult.detail}</p>
                    <p className="mt-1 text-sm text-ink">The exact Created Notice and successful service record remain the historical sources for the facts shown above.</p>
                  </div>
                </div>
              </div>

              {!filingPrerequisitesComplete && (
                <p className="mt-4 text-sm text-muted">Complete every required factual answer, separate complaint election, court confirmation, no-unit confirmation when applicable, and additional-relief nonselection before the final filing-choice affirmation.</p>
              )}
              <label className="mt-5 flex items-start gap-2 rounded-md bg-tint p-4 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={filingChoiceConfirmed}
                  disabled={!filingPrerequisitesComplete}
                  onChange={event => {
                    setFilingChoiceConfirmed(event.target.checked);
                    setGenerated(null);
                    setRenderedAtISO(null);
                    setOwnerReviewConfirmed(false);
                    setReviewResult(null);
                  }}
                  className="mt-1"
                />
                <span>I reviewed these filing choices and want OwnerPilot to use them to prepare this complaint.</span>
              </label>
              <button type="button" onClick={prepare} disabled={busy !== null || !filingChoiceConfirmed || !filingPrerequisitesComplete} className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'prepare' ? 'Preparing…' : 'Prepare UD-100 for review'}
              </button>
            </div>
          )}

          {generated && pdfUrl && (
            <div className="mt-5 rounded-lg border border-rule p-4">
              <h3 className="text-sm font-semibold text-ink">3. Review the exact generated document</h3>
              <p className="mt-2 text-sm text-muted">This is the same generated PDF byte sequence retained for review. OwnerPilot has not signed or filed it.</p>
              <iframe
                title="Generated UD-100 for owner review"
                src={pdfUrl}
                className="mt-4 h-[70vh] w-full rounded-md border border-rule"
                onLoad={() => setRenderedAtISO(previous => previous ?? new Date().toISOString())}
              />
              <label className="mt-4 flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" checked={ownerReviewConfirmed} onChange={event => setOwnerReviewConfirmed(event.target.checked)} className="mt-1" />
                <span>I reviewed this exact rendered document.</span>
              </label>
              <button type="button" onClick={reviewGeneratedDocument} disabled={busy !== null || !renderedAtISO || !ownerReviewConfirmed} className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'review' ? 'Recording review…' : 'Record document review'}
              </button>
              {reviewResult?.status === 'OWNER_REVIEWED_DOCUMENT' && (
                <p className="mt-3 rounded-md bg-tint p-3 text-sm font-semibold text-ink">Owner review recorded for this exact generated document. Nothing has been signed or filed.</p>
              )}
            </div>
          )}

          {operationError && <p className="mt-4 rounded-md border border-rule p-3 text-sm leading-relaxed text-ink" role="alert">{operationError}</p>}
        </section>
      )}

      <section className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-labelledby="readiness-checklist-heading">
        <h2 id="readiness-checklist-heading" className="font-serif text-xl font-bold text-brand">Preparation checklist</h2>
        <ol className="mt-5 space-y-5">
          {readiness.checklist.map(item => (
            <li key={item.key} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <span className="text-xs font-semibold text-muted">{item.status}</span>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="font-semibold text-muted">Why it matters now</p><p className="mt-1 leading-relaxed text-ink">{item.whyItMatters}</p></div>
                <div><p className="font-semibold text-muted">What OwnerPilot already knows</p><p className="mt-1 leading-relaxed text-ink">{item.ownerPilotKnows}</p></div>
                <div><p className="font-semibold text-muted">What is missing or needs review</p><p className="mt-1 leading-relaxed text-ink">{item.missingOrReview ?? 'Nothing for this item right now.'}</p></div>
                <div><p className="font-semibold text-muted">What you can do next</p><p className="mt-1 leading-relaxed text-ink">{item.nextTask ?? 'No action is needed for this item right now.'}</p></div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-label="Filing preparation boundaries">
        <h2 className="font-serif text-xl font-bold text-brand">What this status means</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{readiness.readinessMeaning}</p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-ink">{readiness.whatOwnerPilotHasNotDone}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">Prepared does not mean signed. Signed does not mean filed. Filed does not mean accepted by the court. This page does not create legal-sufficiency or execution authority.</p>
      </section>

      <details className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-brand">View lifecycle context</summary>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="font-semibold text-muted">Lifecycle stage</p><p className="mt-1 text-ink">{readiness.lifecycle.stage}</p></div>
          <div><p className="font-semibold text-muted">Lifecycle status</p><p className="mt-1 text-ink">{readiness.lifecycle.status}</p></div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{readiness.lifecycle.detail}</p>
      </details>
    </main>
  );
}
