import {
  createHash,
} from 'node:crypto';

export const CAO_EVIDENCE_REPOSITORY =
  'hjt521/ownerpilot' as const;

export const CAO_EVIDENCE_MAX_FILES = 16;
export const CAO_EVIDENCE_MAX_FILE_BYTES = 96_000;
export const CAO_EVIDENCE_MAX_TOTAL_BYTES = 640_000;

export const CAO_EVIDENCE_TEXT_EXTENSIONS = [
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.yml',
  '.yaml',
] as const;

export type CaoEvidenceClassification =
  | 'approved_non_sensitive_repository_derived'
  | 'noncanonical_source_recovery';

export type CaoEvidenceAvailability =
  | 'available'
  | 'unavailable';

export interface CaoEvidenceScopeDefinition {
  id: string;
  label: string;
  repository: typeof CAO_EVIDENCE_REPOSITORY;
  sourceCommit: string;
  paths: readonly string[];
  classifications: Readonly<Record<string, CaoEvidenceClassification>>;
}

export interface CaoEvidenceFile {
  repository: typeof CAO_EVIDENCE_REPOSITORY;
  sourceCommit: string;
  path: string;
  immutableReference: string;
  classification: CaoEvidenceClassification;
  availability: CaoEvidenceAvailability;
  sha256: string | null;
  originalBytes: number | null;
  includedBytes: number;
  truncated: boolean;
  content: string | null;
}

export interface CaoRepositoryEvidencePacket {
  version: 'cao-repository-evidence-v1';
  scopeId: string;
  repository: typeof CAO_EVIDENCE_REPOSITORY;
  sourceCommit: string;
  collectedAt: string;
  fileCount: number;
  totalIncludedBytes: number;
  truncated: boolean;
  unavailableEvidence: boolean;
  files: readonly CaoEvidenceFile[];
}

export type CaoEvidenceCollectionErrorCode =
  | 'unapproved_scope'
  | 'source_commit_mismatch'
  | 'file_count_limit_exceeded'
  | 'unapproved_evidence_path'
  | 'secret_path_rejected'
  | 'unsupported_file_type'
  | 'evidence_size_limit_exceeded';

export class CaoEvidenceCollectionError extends Error {
  constructor(
    public readonly code: CaoEvidenceCollectionErrorCode,
  ) {
    super(code);
    this.name = 'CaoEvidenceCollectionError';
  }
}

const PR_338_COMMIT =
  'b4d183573352a3fed2c072dab9fffbfaf3c21eab';

const WORKFORCE_PATHS = [
  'docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md',
  'docs/agents/ownerpilot_enterprise_ai_workforce_source_recovery.md',
  'docs/agents/ownerpilot_enterprise_ai_role_reconciliation_draft.md',
  'docs/agents/ownerpilot_ai_native_enterprise_workforce_founder_intent_consolidation.md',
  'docs/agents/charters/chief_architecture_officer.md',
  'docs/agents/runtime_model_assignment_registry_design.md',
  'lib/agents/caoPreviewRegistry.ts',
  'lib/agents/caoPreviewExecution.ts',
  'lib/agents/caoPreviewLiveRun.ts',
  'lib/agents/caoPreviewExecution.test.ts',
  'lib/agents/caoPreviewLiveRun.test.ts',
] as const;

const workforceClassifications = Object.fromEntries(
  WORKFORCE_PATHS.map(path => [
    path,
    path.startsWith('docs/agents/')
      ? 'noncanonical_source_recovery'
      : 'approved_non_sensitive_repository_derived',
  ]),
) as Readonly<Record<string, CaoEvidenceClassification>>;

export const CAO_EVIDENCE_SCOPES = {
  enterprise_workforce_recovery: {
    id: 'enterprise_workforce_recovery',
    label: 'Enterprise AI Workforce recovery and current CAO runtime',
    repository: CAO_EVIDENCE_REPOSITORY,
    sourceCommit: PR_338_COMMIT,
    paths: WORKFORCE_PATHS,
    classifications: workforceClassifications,
  },
} as const satisfies Readonly<Record<string, CaoEvidenceScopeDefinition>>;

const SECRET_PATH_PATTERNS = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(?:secrets?|credentials?)(?:\/|\.|$)/i,
  /(^|\/)(?:id_rsa|id_ed25519)(?:\.|$)/i,
  /\.(?:pem|key|p12|pfx)$/i,
  /(^|\/)node_modules\//i,
  /(^|\/)\.next\//i,
  /(^|\/)dist\//i,
  /(^|\/)build\//i,
  /(^|\/)(?:database|db)[-_]?(?:dump|export)/i,
  /(^|\/)logs?\//i,
  /(^|\/)production[-_]?exports?\//i,
] as const;

function isSecretPath(path: string): boolean {
  return SECRET_PATH_PATTERNS.some(pattern => pattern.test(path));
}

function isSupportedTextPath(path: string): boolean {
  return CAO_EVIDENCE_TEXT_EXTENSIONS.some(extension =>
    path.toLowerCase().endsWith(extension),
  );
}

function immutableReference(
  commit: string,
  path: string,
): string {
  return `https://github.com/${CAO_EVIDENCE_REPOSITORY}/blob/${commit}/${path}`;
}

function rawReference(
  commit: string,
  path: string,
): string {
  return `https://raw.githubusercontent.com/${CAO_EVIDENCE_REPOSITORY}/${commit}/${path}`;
}

function utf8Prefix(
  content: string,
  maximumBytes: number,
): string {
  const bytes = Buffer.from(content, 'utf8');

  if (bytes.length <= maximumBytes) {
    return content;
  }

  return bytes
    .subarray(0, maximumBytes)
    .toString('utf8')
    .replace(/\uFFFD$/u, '');
}

function scopeById(scopeId: string): CaoEvidenceScopeDefinition {
  const scope = (
    CAO_EVIDENCE_SCOPES as Readonly<Record<string, CaoEvidenceScopeDefinition>>
  )[scopeId];

  if (!scope) {
    throw new CaoEvidenceCollectionError('unapproved_scope');
  }

  return scope;
}

export interface CollectCaoRepositoryEvidenceInput {
  scopeId: string;
  sourceCommit: string;
  nowIso: string;
}

export interface CollectCaoRepositoryEvidenceDependencies {
  fetchText?: (
    url: string,
    init: RequestInit,
  ) => Promise<Response>;
}

export async function collectCaoRepositoryEvidence(
  input: CollectCaoRepositoryEvidenceInput,
  dependencies: CollectCaoRepositoryEvidenceDependencies = {},
): Promise<CaoRepositoryEvidencePacket> {
  const scope = scopeById(input.scopeId);

  if (input.sourceCommit !== scope.sourceCommit) {
    throw new CaoEvidenceCollectionError('source_commit_mismatch');
  }

  if (scope.paths.length > CAO_EVIDENCE_MAX_FILES) {
    throw new CaoEvidenceCollectionError('file_count_limit_exceeded');
  }

  const approvedPaths = new Set(scope.paths);

  for (const path of scope.paths) {
    if (!approvedPaths.has(path)) {
      throw new CaoEvidenceCollectionError('unapproved_evidence_path');
    }

    if (isSecretPath(path)) {
      throw new CaoEvidenceCollectionError('secret_path_rejected');
    }

    if (!isSupportedTextPath(path)) {
      throw new CaoEvidenceCollectionError('unsupported_file_type');
    }
  }

  const fetchText = dependencies.fetchText ?? fetch;
  const files: CaoEvidenceFile[] = [];
  let totalIncludedBytes = 0;

  for (const path of scope.paths) {
    const reference = immutableReference(scope.sourceCommit, path);
    let response: Response;

    try {
      response = await fetchText(
        rawReference(scope.sourceCommit, path),
        {
          method: 'GET',
          cache: 'no-store',
          redirect: 'error',
          headers: {
            Accept: 'text/plain',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      files.push({
        repository: scope.repository,
        sourceCommit: scope.sourceCommit,
        path,
        immutableReference: reference,
        classification: scope.classifications[path],
        availability: 'unavailable',
        sha256: null,
        originalBytes: null,
        includedBytes: 0,
        truncated: false,
        content: null,
      });
      continue;
    }

    if (!response.ok) {
      files.push({
        repository: scope.repository,
        sourceCommit: scope.sourceCommit,
        path,
        immutableReference: reference,
        classification: scope.classifications[path],
        availability: 'unavailable',
        sha256: null,
        originalBytes: null,
        includedBytes: 0,
        truncated: false,
        content: null,
      });
      continue;
    }

    const content = await response.text();
    const originalBytes = Buffer.byteLength(content, 'utf8');
    const remainingTotal =
      CAO_EVIDENCE_MAX_TOTAL_BYTES - totalIncludedBytes;

    if (remainingTotal <= 0) {
      throw new CaoEvidenceCollectionError('evidence_size_limit_exceeded');
    }

    const maximumIncluded = Math.min(
      CAO_EVIDENCE_MAX_FILE_BYTES,
      remainingTotal,
    );
    const includedContent = utf8Prefix(content, maximumIncluded);
    const includedBytes = Buffer.byteLength(includedContent, 'utf8');
    const truncated = includedBytes < originalBytes;

    files.push({
      repository: scope.repository,
      sourceCommit: scope.sourceCommit,
      path,
      immutableReference: reference,
      classification: scope.classifications[path],
      availability: 'available',
      sha256: createHash('sha256')
        .update(content, 'utf8')
        .digest('hex'),
      originalBytes,
      includedBytes,
      truncated,
      content: includedContent,
    });

    totalIncludedBytes += includedBytes;
  }

  return {
    version: 'cao-repository-evidence-v1',
    scopeId: scope.id,
    repository: scope.repository,
    sourceCommit: scope.sourceCommit,
    collectedAt: input.nowIso,
    fileCount: files.length,
    totalIncludedBytes,
    truncated: files.some(file => file.truncated),
    unavailableEvidence: files.some(
      file => file.availability === 'unavailable',
    ),
    files,
  };
}
