import {
  evaluateFilingPreparationRecordAdmission,
  type FilingPreparationRecord,
  type FilingPreparationRecordBlockReason,
} from './filingPreparationRecord';

export interface FilingPreparationProgressionInput {
  record: unknown;
  currentGeneratedDraft: unknown;
  generatedDraftCurrentness: unknown;
}

export type FilingPreparationProgressionResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationRecordBlockReason;
      detail: string;
      record: null;
      persistenceContract: 'NOT_SATISFIED';
      persistence: 'NOT_PERFORMED';
      nextGovernedStage: 'STAGE_F_HELD';
      stageF: 'HELD';
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
      courtSubmission: 'NOT_PERFORMED';
      courtAcceptance: 'NOT_EVALUATED';
      service: 'NOT_PERFORMED';
      packetComposition: 'NOT_PERFORMED';
      legalSufficiency: 'NOT_EVALUATED';
      autonomousExecution: 'NOT_AUTHORIZED';
    }
  | {
      status: 'E2_3_RECORD_CURRENT';
      record: FilingPreparationRecord;
      persistenceContract: 'SATISFIED';
      persistence: 'NOT_PERFORMED';
      nextGovernedStage: 'STAGE_F_HELD';
      stageF: 'HELD';
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
      courtSubmission: 'NOT_PERFORMED';
      courtAcceptance: 'NOT_EVALUATED';
      service: 'NOT_PERFORMED';
      packetComposition: 'NOT_PERFORMED';
      legalSufficiency: 'NOT_EVALUATED';
      autonomousExecution: 'NOT_AUTHORIZED';
    };

const HELD_BOUNDARY = Object.freeze({
  persistence: 'NOT_PERFORMED' as const,
  nextGovernedStage: 'STAGE_F_HELD' as const,
  stageF: 'HELD' as const,
  signing: 'NOT_PERFORMED' as const,
  filing: 'NOT_PERFORMED' as const,
  courtSubmission: 'NOT_PERFORMED' as const,
  courtAcceptance: 'NOT_EVALUATED' as const,
  service: 'NOT_PERFORMED' as const,
  packetComposition: 'NOT_PERFORMED' as const,
  legalSufficiency: 'NOT_EVALUATED' as const,
  autonomousExecution: 'NOT_AUTHORIZED' as const,
});

export function evaluateFilingPreparationProgression(
  input: FilingPreparationProgressionInput,
): FilingPreparationProgressionResult {
  const admission = evaluateFilingPreparationRecordAdmission(input);
  if (admission.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      blockReason: admission.blockReason,
      detail: admission.detail,
      record: null,
      persistenceContract: 'NOT_SATISFIED',
      ...HELD_BOUNDARY,
    };
  }

  return {
    status: 'E2_3_RECORD_CURRENT',
    record: admission.record,
    persistenceContract: 'SATISFIED',
    ...HELD_BOUNDARY,
  };
}
