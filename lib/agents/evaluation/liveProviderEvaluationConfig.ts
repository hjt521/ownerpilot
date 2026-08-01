/**
 * Strict configuration parser for the human-invoked live-provider evaluation command.
 *
 * This module performs no provider call, credential read, environment-variable read,
 * persistence, provider lookup, fallback selection, or model assignment.
 */

import { isAbsolute } from 'node:path';
import {
  SYNTHETIC_MODEL_EVALUATION_CASE_IDS,
} from './__fixtures__/syntheticEvaluationCases';
import {
  validateEvaluationModelCandidate,
  type EvaluationModelCandidate,
} from './modelEvaluation';
import {
  REASONING_LEVELS,
  type ReasoningLevel,
} from '../../ai/modelRegistry';
import type {
  EvaluationSuitePricing,
} from './evaluationSuite';

export const LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG =
  '--confirm-live-provider-evaluation' as const;

export const LIVE_PROVIDER_EVALUATION_ADAPTER_ID =
  'vercel-ai-gateway-v1' as const;

export const LIVE_PROVIDER_EVALUATION_PROMPT_VERSION =
  'executive-agent-live-evaluation-v1' as const;

const VALUE_FLAGS = [
  '--suite-id',
  '--source-commit',
  '--approval-reference',
  '--gateway-api-key-file',
  '--case-id',
  '--maximum-output-tokens',
  '--timeout-ms',
  '--primary-provider-id',
  '--primary-model-id',
  '--primary-pinned-model-version',
  '--primary-reasoning-level',
  '--primary-input-micros-per-million-tokens',
  '--primary-output-micros-per-million-tokens',
  '--challenger-provider-id',
  '--challenger-model-id',
  '--challenger-pinned-model-version',
  '--challenger-reasoning-level',
  '--challenger-input-micros-per-million-tokens',
  '--challenger-output-micros-per-million-tokens',
] as const;

type ValueFlag = (typeof VALUE_FLAGS)[number];

const REQUIRED_SINGLE_VALUE_FLAGS = VALUE_FLAGS.filter(
  flag => flag !== '--case-id',
);

const MAX_CASES = 4;
const MAXIMUM_OUTPUT_TOKENS_LIMIT = 8_000;
const MAXIMUM_TIMEOUT_MS = 120_000;
const MINIMUM_TIMEOUT_MS = 1_000;

export interface LiveProviderEvaluationCommandConfig {
  humanConfirmed: true;
  suiteId: string;
  sourceCommit: string;
  approvalReference: string;
  gatewayApiKeyFile: string;
  caseIds: readonly string[];
  maximumOutputTokens: number;
  timeoutMs: number;
  promptVersion:
    typeof LIVE_PROVIDER_EVALUATION_PROMPT_VERSION;
  primaryCandidate: EvaluationModelCandidate;
  challengerCandidate: EvaluationModelCandidate;
  pricing: EvaluationSuitePricing;
  gatewayProviderRestrictions: {
    primary: {
      onlyProviderId: string;
    };
    challenger: {
      onlyProviderId: string;
    };
  };
}

function isValueFlag(value: string): value is ValueFlag {
  return (VALUE_FLAGS as readonly string[]).includes(value);
}

function requireBoundedValue(
  values: ReadonlyMap<ValueFlag, string>,
  flag: ValueFlag,
  maximumLength = 500,
): string {
  const value = values.get(flag);

  if (
    value === undefined ||
    value.trim().length === 0 ||
    value.length > maximumLength
  ) {
    throw new Error(
      `${flag} must be supplied as a nonempty bounded value.`,
    );
  }

  return value;
}

function parseInteger(
  raw: string,
  flag: ValueFlag,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${flag} must be a base-10 integer.`);
  }

  const value = Number(raw);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${flag} must be between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

function parseReasoningLevel(
  raw: string,
  flag: ValueFlag,
): ReasoningLevel {
  if (
    !(REASONING_LEVELS as readonly string[]).includes(raw)
  ) {
    throw new Error(
      `${flag} must be one of: ${REASONING_LEVELS.join(', ')}.`,
    );
  }

  return raw as ReasoningLevel;
}

function buildCandidate(
  slot: 'primary' | 'challenger',
  values: ReadonlyMap<ValueFlag, string>,
): EvaluationModelCandidate {
  const providerId = requireBoundedValue(
    values,
    `--${slot}-provider-id`,
    256,
  );
  const modelId = requireBoundedValue(
    values,
    `--${slot}-model-id`,
    256,
  );
  const pinnedModelVersion = requireBoundedValue(
    values,
    `--${slot}-pinned-model-version`,
    256,
  );
  const reasoningLevel = parseReasoningLevel(
    requireBoundedValue(
      values,
      `--${slot}-reasoning-level`,
      32,
    ),
    `--${slot}-reasoning-level`,
  );

  if (!modelId.startsWith(`${providerId}/`)) {
    throw new Error(
      `--${slot}-model-id must use the --${slot}-provider-id prefix.`,
    );
  }

  if (modelId !== pinnedModelVersion) {
    throw new Error(
      `--${slot}-model-id and --${slot}-pinned-model-version must match exactly for live evaluation.`,
    );
  }

  const candidate: EvaluationModelCandidate = {
    providerId,
    modelId,
    pinnedModelVersion,
    adapterId: LIVE_PROVIDER_EVALUATION_ADAPTER_ID,
    slot,
    reasoningLevel,
  };

  const validation =
    validateEvaluationModelCandidate(candidate);

  if (!validation.ok) {
    throw new Error(
      `Invalid ${slot} candidate: ${validation.issues
        .map(issue => issue.code)
        .join(', ')}.`,
    );
  }

  return candidate;
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

export function parseLiveProviderEvaluationArguments(
  args: readonly string[],
): LiveProviderEvaluationCommandConfig {
  const values = new Map<ValueFlag, string>();
  const caseIds: string[] = [];
  let confirmed = false;

  for (let index = 0; index < args.length; index++) {
    const token = args[index];

    if (token === LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG) {
      if (confirmed) {
        throw new Error(
          `${LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG} may be supplied only once.`,
        );
      }

      confirmed = true;
      continue;
    }

    if (!isValueFlag(token)) {
      throw new Error(`Unknown live-evaluation argument: ${token}.`);
    }

    const value = args[index + 1];

    if (
      value === undefined ||
      value.startsWith('--')
    ) {
      throw new Error(`${token} requires a value.`);
    }

    index++;

    if (token === '--case-id') {
      caseIds.push(value);
      continue;
    }

    if (values.has(token)) {
      throw new Error(`${token} may be supplied only once.`);
    }

    values.set(token, value);
  }

  if (!confirmed) {
    throw new Error(
      `${LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG} is required.`,
    );
  }

  for (const flag of REQUIRED_SINGLE_VALUE_FLAGS) {
    requireBoundedValue(values, flag);
  }

  if (caseIds.length === 0) {
    throw new Error(
      'At least one explicit --case-id is required.',
    );
  }

  if (caseIds.length > MAX_CASES) {
    throw new Error(
      `No more than ${MAX_CASES} evaluation cases may be requested.`,
    );
  }

  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error(
      'Duplicate --case-id values are prohibited.',
    );
  }

  const allowedCaseIds =
    SYNTHETIC_MODEL_EVALUATION_CASE_IDS as readonly string[];

  for (const caseId of caseIds) {
    if (!allowedCaseIds.includes(caseId)) {
      throw new Error(
        `Unknown synthetic evaluation case: ${caseId}.`,
      );
    }
  }

  const sourceCommit = requireBoundedValue(
    values,
    '--source-commit',
    40,
  );

  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error(
      '--source-commit must be a full lowercase 40-character Git commit SHA.',
    );
  }

  const gatewayApiKeyFile = requireBoundedValue(
    values,
    '--gateway-api-key-file',
    1_024,
  );

  if (!isAbsolute(gatewayApiKeyFile)) {
    throw new Error(
      '--gateway-api-key-file must be an absolute path outside the repository.',
    );
  }

  const primaryCandidate =
    buildCandidate('primary', values);

  const challengerCandidate =
    buildCandidate('challenger', values);

  if (
    candidateIdentity(primaryCandidate) ===
    candidateIdentity(challengerCandidate)
  ) {
    throw new Error(
      'Primary and challenger live-evaluation candidates must be distinguishable.',
    );
  }

  return {
    humanConfirmed: true,
    suiteId: requireBoundedValue(
      values,
      '--suite-id',
      256,
    ),
    sourceCommit,
    approvalReference: requireBoundedValue(
      values,
      '--approval-reference',
      500,
    ),
    gatewayApiKeyFile,
    caseIds,
    maximumOutputTokens: parseInteger(
      requireBoundedValue(
        values,
        '--maximum-output-tokens',
        16,
      ),
      '--maximum-output-tokens',
      1,
      MAXIMUM_OUTPUT_TOKENS_LIMIT,
    ),
    timeoutMs: parseInteger(
      requireBoundedValue(
        values,
        '--timeout-ms',
        16,
      ),
      '--timeout-ms',
      MINIMUM_TIMEOUT_MS,
      MAXIMUM_TIMEOUT_MS,
    ),
    promptVersion:
      LIVE_PROVIDER_EVALUATION_PROMPT_VERSION,
    primaryCandidate,
    challengerCandidate,
    pricing: {
      primary: {
        inputMicrosPerMillionTokens:
          parseInteger(
            requireBoundedValue(
              values,
              '--primary-input-micros-per-million-tokens',
              32,
            ),
            '--primary-input-micros-per-million-tokens',
            0,
          ),
        outputMicrosPerMillionTokens:
          parseInteger(
            requireBoundedValue(
              values,
              '--primary-output-micros-per-million-tokens',
              32,
            ),
            '--primary-output-micros-per-million-tokens',
            0,
          ),
      },
      challenger: {
        inputMicrosPerMillionTokens:
          parseInteger(
            requireBoundedValue(
              values,
              '--challenger-input-micros-per-million-tokens',
              32,
            ),
            '--challenger-input-micros-per-million-tokens',
            0,
          ),
        outputMicrosPerMillionTokens:
          parseInteger(
            requireBoundedValue(
              values,
              '--challenger-output-micros-per-million-tokens',
              32,
            ),
            '--challenger-output-micros-per-million-tokens',
            0,
          ),
      },
    },
    gatewayProviderRestrictions: {
      primary: {
        onlyProviderId:
          primaryCandidate.providerId,
      },
      challenger: {
        onlyProviderId:
          challengerCandidate.providerId,
      },
    },
  };
}
