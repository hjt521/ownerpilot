import {
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_REGISTRY_ENTRY,
} from './caoPreviewRegistry';

import {
  collectCaoRepositoryEvidence,
  type CaoRepositoryEvidencePacket,
} from './caoRepositoryEvidence';

import {
  EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION,
} from './executiveAgentsPreviewUiContract';

import {
  executeCaoPreviewLiveRun,
  type CaoPreviewLiveRunDependencies,
  type CaoPreviewLiveRunResult,
} from './caoPreviewLiveRun';

export const CAO_PREVIEW_WORKBENCH_REQUEST_VERSION =
  'cao-preview-workbench-request-v1' as const;

export const CAO_PREVIEW_WORKBENCH_MAX_BODY_BYTES =
  32_768 as const;

export const CAO_PREVIEW_WORKBENCH_OUTPUT_TYPES = [
  'architecture_recommendation',
  'implementation_handoff',
  'technical_reconciliation',
] as const;

export type CaoPreviewWorkbenchOutputType =
  (typeof CAO_PREVIEW_WORKBENCH_OUTPUT_TYPES)[number];

export interface CaoPreviewWorkbenchRequest {
  requestVersion:
    typeof CAO_PREVIEW_WORKBENCH_REQUEST_VERSION;
  taskClass:
    | 'architecture_analysis'
    | 'evaluation_only';
  runId: string;
  objective: string;
  evidenceScopeId: string;
  sourceCommit: string;
  constraints: readonly string[];
  knownDecisions: readonly string[];
  unresolvedQuestions: readonly string[];
  founderApprovalReference: string;
  requestedOutputType:
    CaoPreviewWorkbenchOutputType;
  explicitHumanInitiation: true;
  sensitiveContentPresent: false;
}

export interface CaoPreviewWorkbenchSuccessBody {
  ok: true;
  completed: true;
  workbenchVersion: 'cao-preview-workbench-v1';
  assignment: {
    objective: string;
    evidenceScopeId: string;
    sourceCommit: string;
    constraints: readonly string[];
    knownDecisions: readonly string[];
    unresolvedQuestions: readonly string[];
    founderApprovalReference: string;
    requestedOutputType:
      CaoPreviewWorkbenchOutputType;
  };
  evidencePacket: Omit<
    CaoRepositoryEvidencePacket,
    'files'
  > & {
    files: readonly Omit<
      CaoRepositoryEvidencePacket['files'][number],
      'content'
    >[];
  };
  liveRun: Extract<
    CaoPreviewLiveRunResult['body'],
    { ok: true }
  >;
  exportAvailable: true;
  persistencePerformed: false;
  repositoryWritePerformed: false;
  deploymentPerformed: false;
  automaticContinuation: false;
}

export interface CaoPreviewWorkbenchErrorBody {
  ok: false;
  error:
    | 'invalid_request'
    | 'evidence_rejected'
    | 'evidence_unavailable'
    | 'execution_failed';
  cause?: string;
}

export interface CaoPreviewWorkbenchResult {
  status: number;
  body:
    | CaoPreviewWorkbenchSuccessBody
    | CaoPreviewWorkbenchErrorBody
    | CaoPreviewLiveRunResult['body'];
}

const REQUEST_KEYS = [
  'requestVersion',
  'taskClass',
  'runId',
  'objective',
  'evidenceScopeId',
  'sourceCommit',
  'constraints',
  'knownDecisions',
  'unresolvedQuestions',
  'founderApprovalReference',
  'requestedOutputType',
  'explicitHumanInitiation',
  'sensitiveContentPresent',
] as const;

const REQUIRED_OUTPUT_SECTIONS = [
  'Status and authority labels',
  'Executive summary',
  'Objective',
  'Evidence reviewed',
  'Source commit and evidence limitations',
  'Current-state findings',
  'Target-state interpretation',
  'Architecture options',
  'Tradeoffs',
  'Recommended architecture',
  'Security and authority boundaries',
  'Dependencies',
  'File-level implementation map',
  'Test strategy',
  'Rollout plan',
  'Rollback plan',
  'Risks',
  'Unknowns',
  'Dissent or competing interpretation',
  'Founder decisions required',
  'Engineering handoff',
  'Explicit prohibition on autonomous continuation',
] as const;

const CAO_PREVIEW_EVIDENCE_ITEM_MAXIMUM = 4_000;
const CAO_PREVIEW_EVIDENCE_BUNDLE_MAXIMUM = 3_900;
const CAO_PREVIEW_INSTRUCTIONS_MAXIMUM = 2_000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function exactKeys(
  value: Record<string, unknown>,
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...REQUEST_KEYS].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
    )
  );
}

function boundedString(
  value: unknown,
  maximum: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function boundedStringList(
  value: unknown,
): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(item => boundedString(item, 1_000))
  );
}

function parseRequest(
  rawBody: unknown,
): CaoPreviewWorkbenchRequest | null {
  if (
    typeof rawBody !== 'string' ||
    Buffer.byteLength(rawBody, 'utf8') >
      CAO_PREVIEW_WORKBENCH_MAX_BODY_BYTES
  ) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    !exactKeys(parsed) ||
    parsed.requestVersion !==
      CAO_PREVIEW_WORKBENCH_REQUEST_VERSION ||
    (
      parsed.taskClass !== 'architecture_analysis' &&
      parsed.taskClass !== 'evaluation_only'
    ) ||
    !boundedString(parsed.runId, 128) ||
    !/^[A-Za-z0-9._:-]+$/.test(parsed.runId) ||
    !boundedString(parsed.objective, 4_000) ||
    !boundedString(parsed.evidenceScopeId, 128) ||
    !boundedString(parsed.sourceCommit, 64) ||
    !/^[a-f0-9]{40}$/.test(parsed.sourceCommit) ||
    !boundedStringList(parsed.constraints) ||
    !boundedStringList(parsed.knownDecisions) ||
    !boundedStringList(parsed.unresolvedQuestions) ||
    parsed.founderApprovalReference !==
      CAO_PREVIEW_APPROVAL_REFERENCE ||
    typeof parsed.requestedOutputType !== 'string' ||
    !(
      CAO_PREVIEW_WORKBENCH_OUTPUT_TYPES as
        readonly string[]
    ).includes(parsed.requestedOutputType) ||
    parsed.explicitHumanInitiation !== true ||
    parsed.sensitiveContentPresent !== false
  ) {
    return null;
  }

  return parsed as unknown as CaoPreviewWorkbenchRequest;
}

function architectureInstructions(
  request: CaoPreviewWorkbenchRequest,
): string {
  const sections = REQUIRED_OUTPUT_SECTIONS
    .map((section, index) => `${index + 1}. ${section}`)
    .join('\n');

  return [
    `Objective: ${request.objective}`,
    `Requested output: ${request.requestedOutputType}`,
    `Constraints: ${request.constraints.join(' | ') || 'None stated'}`,
    `Known decisions: ${request.knownDecisions.join(' | ') || 'None stated'}`,
    `Open questions: ${request.unresolvedQuestions.join(' | ') || 'None stated'}`,
    '',
    'Required sections:',
    sections,
    '',
    'Output rules:',
    `- Return complete valid JSON first within ${CAO_PREVIEW_REGISTRY_ENTRY.limits.maximumOutputTokens} tokens; draft_artifact <=8000 characters.`,
    '- Use each heading once; one paragraph or two bullets; top-level arrays <=6 items.',
    '- Do not duplicate evidence or analysis; copy required labels and evidence IDs exactly.',
    '- No composite score. Preserve unknowns, dissent, competing views, and human decisions. End by prohibiting autonomous continuation.',
  ].join('\n');
}

export function buildCaoPreviewEvidenceBundle(
  packet: CaoRepositoryEvidencePacket,
): string {
  const header = [
    'EVIDENCE MANIFEST',
    `REPOSITORY: ${packet.repository}`,
    `SOURCE COMMIT: ${packet.sourceCommit}`,
    `SCOPE: ${packet.scopeId}`,
    `TRUNCATED: ${String(packet.truncated)}`,
    `UNAVAILABLE: ${String(packet.unavailableEvidence)}`,
    '',
  ].join('\n');

  const available = packet.files.filter(
    file => file.content !== null,
  );
  const records = packet.files.map(file => [
    `FILE: ${file.path}`,
    `HASH12: ${file.sha256?.slice(0, 12) ?? 'unavailable'}`,
    `META: ${file.availability}|${file.originalBytes}/${file.includedBytes}|${file.truncated ? 'truncated' : 'complete'}`,
  ].join('\n'));
  const fixed = `${header}${records.join('\n---\n')}`;
  const contentSeparators = available.length > 0
    ? available.length * 7
    : 0;
  const availableCharacters = Math.max(
    0,
    CAO_PREVIEW_EVIDENCE_BUNDLE_MAXIMUM -
      fixed.length -
      contentSeparators,
  );
  const excerptMaximum = available.length > 0
    ? Math.floor(availableCharacters / available.length)
    : 0;
  const excerpts = available.map(file =>
    file.content?.slice(0, excerptMaximum) ?? '',
  );
  const content = excerpts.length > 0
    ? `\n---\n${excerpts.join('\n---\n')}`
    : '';
  const bundle = `${fixed}${content}`;

  if (
    fixed.length > CAO_PREVIEW_EVIDENCE_BUNDLE_MAXIMUM ||
    fixed.length > CAO_PREVIEW_EVIDENCE_ITEM_MAXIMUM
  ) {
    throw new Error(
      'CAO preview evidence metadata exceeds the bounded item limit',
    );
  }

  return bundle.slice(
    0,
    Math.min(
      CAO_PREVIEW_EVIDENCE_BUNDLE_MAXIMUM,
      CAO_PREVIEW_EVIDENCE_ITEM_MAXIMUM,
    ),
  );
}

function withoutContent(
  file: CaoRepositoryEvidencePacket['files'][number],
): Omit<
  CaoRepositoryEvidencePacket['files'][number],
  'content'
> {
  return {
    repository: file.repository,
    sourceCommit: file.sourceCommit,
    path: file.path,
    immutableReference: file.immutableReference,
    classification: file.classification,
    availability: file.availability,
    sha256: file.sha256,
    originalBytes: file.originalBytes,
    includedBytes: file.includedBytes,
    truncated: file.truncated,
  };
}

function publicEvidencePacket(
  packet: CaoRepositoryEvidencePacket,
): CaoPreviewWorkbenchSuccessBody['evidencePacket'] {
  return {
    ...packet,
    files: packet.files.map(withoutContent),
  };
}

export interface CaoPreviewWorkbenchDependencies
  extends CaoPreviewLiveRunDependencies {
  collectEvidence?: typeof collectCaoRepositoryEvidence;
}

export async function executeCaoPreviewWorkbench(
  dependencies: CaoPreviewWorkbenchDependencies,
  invocation: {
    contentType: unknown;
    rawBody: unknown;
  },
): Promise<CaoPreviewWorkbenchResult> {
  if (
    typeof invocation.contentType !== 'string' ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      invocation.contentType,
    )
  ) {
    return {
      status: 415,
      body: {
        ok: false,
        error: 'invalid_request',
      },
    };
  }

  const request = parseRequest(invocation.rawBody);

  if (request === null) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'invalid_request',
      },
    };
  }

  const instructions =
    architectureInstructions(request);

  if (
    instructions.length >
      CAO_PREVIEW_INSTRUCTIONS_MAXIMUM
  ) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'invalid_request',
      },
    };
  }

  let evidencePacket: CaoRepositoryEvidencePacket;

  try {
    evidencePacket = await (
      dependencies.collectEvidence ??
      collectCaoRepositoryEvidence
    )({
      scopeId: request.evidenceScopeId,
      sourceCommit: request.sourceCommit,
      nowIso:
        typeof dependencies.nowIso === 'string'
          ? dependencies.nowIso
          : new Date().toISOString(),
    });
  } catch (error) {
    return {
      status: 422,
      body: {
        ok: false,
        error: 'evidence_rejected',
        cause:
          error instanceof Error
            ? error.message
            : 'unknown',
      },
    };
  }

  if (evidencePacket.unavailableEvidence) {
    return {
      status: 422,
      body: {
        ok: false,
        error: 'evidence_unavailable',
      },
    };
  }

  const liveRun = await executeCaoPreviewLiveRun(
    dependencies,
    {
      contentType: 'application/json',
      rawBody: JSON.stringify({
        requestVersion:
          EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION,
        taskClass: request.taskClass,
        runId: request.runId,
        instructions,
        evidenceReference:
          `repository-scope:${evidencePacket.scopeId}@${evidencePacket.sourceCommit}`,
        evidenceClassification:
          'approved_non_sensitive_repository_derived',
        evidenceContent:
          buildCaoPreviewEvidenceBundle(evidencePacket),
        explicitHumanInitiation: true,
        sensitiveContentPresent: false,
      }),
    },
  );

  if (!liveRun.body.ok) {
    return {
      status: liveRun.status,
      body: liveRun.body,
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      completed: true,
      workbenchVersion: 'cao-preview-workbench-v1',
      assignment: {
        objective: request.objective,
        evidenceScopeId: request.evidenceScopeId,
        sourceCommit: request.sourceCommit,
        constraints: request.constraints,
        knownDecisions: request.knownDecisions,
        unresolvedQuestions: request.unresolvedQuestions,
        founderApprovalReference:
          request.founderApprovalReference,
        requestedOutputType:
          request.requestedOutputType,
      },
      evidencePacket:
        publicEvidencePacket(evidencePacket),
      liveRun: liveRun.body,
      exportAvailable: true,
      persistencePerformed: false,
      repositoryWritePerformed: false,
      deploymentPerformed: false,
      automaticContinuation: false,
    },
  };
}
