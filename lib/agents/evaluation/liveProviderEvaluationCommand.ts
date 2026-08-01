/**
 * Bounded execution seam for the human-invoked live-provider evaluation.
 *
 * The caller supplies repository, credential-file, and model-factory adapters.
 * This module performs no environment-variable lookup, provider discovery,
 * persistence, Preview activation, Production action, fallback, or automatic
 * model selection.
 */

import { isAbsolute, relative, sep } from 'node:path';
import type { LanguageModel } from 'ai';
import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from './__fixtures__/syntheticEvaluationCases';
import {
  runEvaluationSuite,
  type EvaluationSuiteOptions,
  type EvaluationSuiteReport,
} from './evaluationSuite';
import type {
  LiveProviderEvaluationCommandConfig,
} from './liveProviderEvaluationConfig';
import type {
  ExecutiveRoleId,
} from '../../ai/modelRegistry';

const MAXIMUM_CREDENTIAL_FILE_BYTES = 8_192;
const MAXIMUM_API_KEY_LENGTH = 4_096;

export interface LiveProviderEvaluationRepositoryState {
  repositoryRootRealPath: string;
  headCommit: string;
  workingTreeStatus: string;
}

export interface LiveProviderEvaluationCredentialMetadata {
  realPath: string;
  isRegularFile: boolean;
  sizeBytes: number;
  mode: number;
}

export interface LiveProviderEvaluationCommandDependencies {
  inspectRepository:
    () => LiveProviderEvaluationRepositoryState;
  inspectCredentialFile:
    (path: string) => LiveProviderEvaluationCredentialMetadata;
  readCredentialFile:
    (realPath: string) => string;
  createGatewayModelFactory:
    (apiKey: string) => (modelId: string) => LanguageModel;
  runSuite?: (
    options: EvaluationSuiteOptions,
  ) => Promise<EvaluationSuiteReport>;
}

function isPathWithin(
  parentRealPath: string,
  candidateRealPath: string,
): boolean {
  const pathFromParent =
    relative(parentRealPath, candidateRealPath);

  return (
    pathFromParent === '' ||
    (
      pathFromParent !== '..' &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent)
    )
  );
}

function requireRepositoryState(
  config: LiveProviderEvaluationCommandConfig,
  state: LiveProviderEvaluationRepositoryState,
): void {
  if (
    !isAbsolute(state.repositoryRootRealPath) ||
    state.repositoryRootRealPath.trim().length === 0
  ) {
    throw new Error(
      'Repository inspection must return an absolute real path.',
    );
  }

  if (state.headCommit !== config.sourceCommit) {
    throw new Error(
      'The current Git commit does not match --source-commit.',
    );
  }

  if (state.workingTreeStatus.trim().length > 0) {
    throw new Error(
      'Live-provider evaluation requires a clean working tree.',
    );
  }
}

function readBoundedApiKey(
  config: LiveProviderEvaluationCommandConfig,
  dependencies: LiveProviderEvaluationCommandDependencies,
  repositoryRootRealPath: string,
): string {
  const metadata =
    dependencies.inspectCredentialFile(
      config.gatewayApiKeyFile,
    );

  if (!isAbsolute(metadata.realPath)) {
    throw new Error(
      'Credential inspection must return an absolute real path.',
    );
  }

  if (
    isPathWithin(
      repositoryRootRealPath,
      metadata.realPath,
    )
  ) {
    throw new Error(
      'The Gateway credential file must resolve outside the repository.',
    );
  }

  if (!metadata.isRegularFile) {
    throw new Error(
      'The Gateway credential path must resolve to a regular file.',
    );
  }

  if (
    !Number.isInteger(metadata.sizeBytes) ||
    metadata.sizeBytes <= 0 ||
    metadata.sizeBytes >
      MAXIMUM_CREDENTIAL_FILE_BYTES
  ) {
    throw new Error(
      'The Gateway credential file size is invalid or exceeds the bounded limit.',
    );
  }

  if (
    !Number.isInteger(metadata.mode) ||
    (metadata.mode & 0o077) !== 0
  ) {
    throw new Error(
      'The Gateway credential file must not grant group or other permissions.',
    );
  }

  const apiKey =
    dependencies
      .readCredentialFile(metadata.realPath)
      .trim();

  if (
    apiKey.length === 0 ||
    apiKey.length > MAXIMUM_API_KEY_LENGTH ||
    /\s/.test(apiKey)
  ) {
    throw new Error(
      'The Gateway credential file must contain one nonempty bounded token.',
    );
  }

  return apiKey;
}

function selectEvaluationCases(
  config: LiveProviderEvaluationCommandConfig,
) {
  return config.caseIds.map(caseId => {
    const evaluationCase =
      SYNTHETIC_MODEL_EVALUATION_CASES.find(
        candidate => candidate.id === caseId,
      );

    if (!evaluationCase) {
      throw new Error(
        `Unknown synthetic evaluation case: ${caseId}.`,
      );
    }

    return evaluationCase;
  });
}

function systemPromptForRole(
  roleId: ExecutiveRoleId,
): string {
  return [
    'You are participating in a bounded synthetic executive-agent model evaluation.',
    `Operate only as the approved role ${roleId}.`,
    'Return only the exact JSON structure requested by the evaluation prompt.',
    'Produce a noncanonical advisory draft only.',
    'Do not perform repository writes, deployments, database writes, external communications, provider selection, fallback, or consequential actions.',
    'Preserve facts, assumptions, unknowns, dissent, evidence references, prohibited actions, and required human decisions as separate concepts.',
    'A human retains all authority and must decide the final disposition.',
  ].join('\n');
}

export async function executeLiveProviderEvaluation(
  config: LiveProviderEvaluationCommandConfig,
  dependencies: LiveProviderEvaluationCommandDependencies,
): Promise<EvaluationSuiteReport> {
  if (config.humanConfirmed !== true) {
    throw new Error(
      'Live-provider evaluation must be explicitly human confirmed.',
    );
  }

  const repositoryState =
    dependencies.inspectRepository();

  requireRepositoryState(
    config,
    repositoryState,
  );

  const evaluationCases =
    selectEvaluationCases(config);

  const apiKey = readBoundedApiKey(
    config,
    dependencies,
    repositoryState.repositoryRootRealPath,
  );

  const modelForId =
    dependencies.createGatewayModelFactory(apiKey);

  const runSuite =
    dependencies.runSuite ?? runEvaluationSuite;

  return runSuite({
    suiteId: config.suiteId,
    sourceCommit: config.sourceCommit,
    approvalReference:
      config.approvalReference,
    humanInitiated: true,
    evaluationCases,
    primaryCandidate:
      config.primaryCandidate,
    challengerCandidate:
      config.challengerCandidate,
    primaryModelForCase:
      () =>
        modelForId(
          config.primaryCandidate.modelId,
        ),
    challengerModelForCase:
      () =>
        modelForId(
          config.challengerCandidate.modelId,
        ),
    promptVersion: config.promptVersion,
    systemPromptForRole,
    maximumOutputTokens:
      config.maximumOutputTokens,
    timeoutMs: config.timeoutMs,
    pricing: config.pricing,
    gatewayProviderRestrictions:
      config.gatewayProviderRestrictions,
  });
}
