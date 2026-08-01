/**
 * Human-initiated executive-agent model-evaluation suite.
 *
 * This suite:
 * - requires an explicit human initiation assertion and approval reference;
 * - invokes only explicitly injected primary and challenger models;
 * - performs no provider lookup, fallback, substitution, persistence, or gate activation;
 * - preserves each qualitative dimension independently;
 * - produces no composite score, model vote, ranking, or automatic winner;
 * - always requires human disposition.
 */

import type { LanguageModel } from 'ai';
import {
  compareModelEvaluationRuns,
  validateEvaluationModelCandidate,
  validateModelEvaluationCase,
  type EvaluationModelCandidate,
  type ModelEvaluationCase,
  type ModelEvaluationComparison,
  type ModelEvaluationRunEvidence,
} from './modelEvaluation';
import {
  runInjectedModelEvaluation,
  type EvaluationPricing,
} from './aiSdkEvaluationRunner';
import type {
  ExecutiveRoleId,
} from '../../ai/modelRegistry';

export interface EvaluationSuitePricing {
  primary: EvaluationPricing;
  challenger: EvaluationPricing;
}

export interface EvaluationSuiteOptions {
  suiteId: string;
  sourceCommit: string;
  approvalReference: string;
  humanInitiated: true;
  evaluationCases: readonly ModelEvaluationCase[];
  primaryCandidate: EvaluationModelCandidate;
  challengerCandidate: EvaluationModelCandidate;
  primaryModelForCase:
    (evaluationCase: ModelEvaluationCase) => LanguageModel;
  challengerModelForCase:
    (evaluationCase: ModelEvaluationCase) => LanguageModel;
  promptVersion: string;
  systemPromptForRole:
    (roleId: ExecutiveRoleId) => string;
  maximumOutputTokens: number;
  timeoutMs: number;
  pricing: EvaluationSuitePricing;
  clockFactory?: (runId: string) => () => number;
}

export interface EvaluationSuiteCaseReport {
  caseId: string;
  roleId: ExecutiveRoleId;
  primary: ModelEvaluationRunEvidence;
  challenger: ModelEvaluationRunEvidence;
  comparison: ModelEvaluationComparison;
}

export interface EvaluationSuiteReport {
  suiteId: string;
  sourceCommit: string;
  approvalReference: string;
  environment: 'local_evaluation';
  humanInitiated: true;
  caseReports: readonly EvaluationSuiteCaseReport[];
  automaticSelection: false;
  humanDecisionRequired: true;
  productionEligible: false;
  previewActivationPerformed: false;
  persistencePerformed: false;
  providerLookupPerformed: false;
  fallbackPerformed: false;
  substitutionPerformed: false;
}

function requireNonemptyBoundedString(
  value: unknown,
  field: string,
  maximumLength = 500,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > maximumLength
  ) {
    throw new Error(
      `${field} must be a nonempty bounded string.`,
    );
  }
}

function candidateIdentity(
  candidate: EvaluationModelCandidate,
): string {
  return [
    candidate.providerId,
    candidate.modelId,
    candidate.pinnedModelVersion,
    candidate.adapterId,
  ].join(':');
}

function validateSuiteOptions(
  options: EvaluationSuiteOptions,
): void {
  requireNonemptyBoundedString(
    options.suiteId,
    'suiteId',
  );
  requireNonemptyBoundedString(
    options.sourceCommit,
    'sourceCommit',
  );
  requireNonemptyBoundedString(
    options.approvalReference,
    'approvalReference',
  );
  requireNonemptyBoundedString(
    options.promptVersion,
    'promptVersion',
  );

  if (options.humanInitiated !== true) {
    throw new Error(
      'Every evaluation suite must be explicitly human initiated.',
    );
  }

  if (
    !Array.isArray(options.evaluationCases) ||
    options.evaluationCases.length === 0
  ) {
    throw new Error(
      'At least one evaluation case is required.',
    );
  }

  const primaryResult =
    validateEvaluationModelCandidate(
      options.primaryCandidate,
    );

  if (!primaryResult.ok) {
    throw new Error(
      `Invalid primary candidate: ${primaryResult.issues
        .map(issue => issue.code)
        .join(', ')}`,
    );
  }

  const challengerResult =
    validateEvaluationModelCandidate(
      options.challengerCandidate,
    );

  if (!challengerResult.ok) {
    throw new Error(
      `Invalid challenger candidate: ${challengerResult.issues
        .map(issue => issue.code)
        .join(', ')}`,
    );
  }

  if (options.primaryCandidate.slot !== 'primary') {
    throw new Error(
      'The primary candidate must use the primary slot.',
    );
  }

  if (
    options.challengerCandidate.slot !==
    'challenger'
  ) {
    throw new Error(
      'The challenger candidate must use the challenger slot.',
    );
  }

  if (
    candidateIdentity(options.primaryCandidate) ===
    candidateIdentity(options.challengerCandidate)
  ) {
    throw new Error(
      'Primary and challenger candidates must be distinguishable.',
    );
  }

  for (const evaluationCase of
    options.evaluationCases) {
    const result =
      validateModelEvaluationCase(
        evaluationCase,
      );

    if (!result.ok) {
      throw new Error(
        `Invalid evaluation case ${String(
          evaluationCase.id,
        )}: ${result.issues
          .map(issue => issue.code)
          .join(', ')}`,
      );
    }
  }

  if (
    !Number.isInteger(options.maximumOutputTokens) ||
    options.maximumOutputTokens <= 0
  ) {
    throw new Error(
      'maximumOutputTokens must be a positive integer.',
    );
  }

  if (
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs <= 0
  ) {
    throw new Error(
      'timeoutMs must be a positive integer.',
    );
  }
}

function defaultClockFactory(): () => number {
  return Date.now;
}

export async function runEvaluationSuite(
  options: EvaluationSuiteOptions,
): Promise<EvaluationSuiteReport> {
  validateSuiteOptions(options);

  const caseReports:
    EvaluationSuiteCaseReport[] = [];

  for (const evaluationCase of
    options.evaluationCases) {
    const primaryRunId =
      `${options.suiteId}:${evaluationCase.id}:primary`;

    const challengerRunId =
      `${options.suiteId}:${evaluationCase.id}:challenger`;

    const primary =
      await runInjectedModelEvaluation({
        runId: primaryRunId,
        evaluationCase,
        candidate: options.primaryCandidate,
        model:
          options.primaryModelForCase(
            evaluationCase,
          ),
        promptVersion: options.promptVersion,
        systemPrompt:
          options.systemPromptForRole(
            evaluationCase.roleId,
          ),
        maximumOutputTokens:
          options.maximumOutputTokens,
        timeoutMs: options.timeoutMs,
        pricing: options.pricing.primary,
        clock:
          options.clockFactory?.(
            primaryRunId,
          ) ?? defaultClockFactory(),
      });

    const challenger =
      await runInjectedModelEvaluation({
        runId: challengerRunId,
        evaluationCase,
        candidate:
          options.challengerCandidate,
        model:
          options.challengerModelForCase(
            evaluationCase,
          ),
        promptVersion: options.promptVersion,
        systemPrompt:
          options.systemPromptForRole(
            evaluationCase.roleId,
          ),
        maximumOutputTokens:
          options.maximumOutputTokens,
        timeoutMs: options.timeoutMs,
        pricing:
          options.pricing.challenger,
        clock:
          options.clockFactory?.(
            challengerRunId,
          ) ?? defaultClockFactory(),
      });

    const comparison =
      compareModelEvaluationRuns(
        primary,
        challenger,
      );

    caseReports.push({
      caseId: evaluationCase.id,
      roleId: evaluationCase.roleId,
      primary,
      challenger,
      comparison,
    });
  }

  return {
    suiteId: options.suiteId,
    sourceCommit: options.sourceCommit,
    approvalReference:
      options.approvalReference,
    environment: 'local_evaluation',
    humanInitiated: true,
    caseReports,
    automaticSelection: false,
    humanDecisionRequired: true,
    productionEligible: false,
    previewActivationPerformed: false,
    persistencePerformed: false,
    providerLookupPerformed: false,
    fallbackPerformed: false,
    substitutionPerformed: false,
  };
}
