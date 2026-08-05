'use client';

import {
  useMemo,
  useState,
  type FormEvent,
} from 'react';

const REQUEST_VERSION =
  'cao-preview-workbench-request-v1';
const APPROVAL_REFERENCE =
  'founder-omnibus-preview-integration-2026-08-02';
const EVIDENCE_SCOPE =
  'enterprise_workforce_recovery';
const SOURCE_COMMIT =
  'b4d183573352a3fed2c072dab9fffbfaf3c21eab';

const DEFAULT_OBJECTIVE =
  'Analyze the OwnerPilot Enterprise AI Workforce recovery package and Founder intent. Produce an architecture recommendation for completing the CAO, designing the future Repository Developer Operator, and sequencing the enterprise-agent program without activating any new role.';

interface EvidenceFile {
  path: string;
  immutableReference: string;
  classification: string;
  availability: string;
  sha256: string | null;
  originalBytes: number | null;
  includedBytes: number;
  truncated: boolean;
}

interface SuccessfulResult {
  ok: true;
  completed: true;
  assignment: {
    objective: string;
    sourceCommit: string;
    requestedOutputType: string;
  };
  evidencePacket: {
    repository: string;
    sourceCommit: string;
    scopeId: string;
    collectedAt: string;
    fileCount: number;
    totalIncludedBytes: number;
    truncated: boolean;
    unavailableEvidence: boolean;
    files: readonly EvidenceFile[];
  };
  liveRun: {
    labels: readonly string[];
    roleId: string;
    taskClass: string;
    providerId: string;
    modelId: string;
    pinnedModelVersion: string;
    sourceCommitSha: string;
    evidenceReferences: readonly string[];
    draft: {
      facts: readonly string[];
      assumptions: readonly string[];
      unknowns: readonly string[];
      recommendations: readonly string[];
      dissent: readonly string[];
      requiredHumanDecisions: readonly string[];
      prohibitedOrUnavailableActions: readonly string[];
      evidenceReferences: readonly string[];
      escalationRequired: boolean;
      draftArtifact: string;
    };
  };
  exportAvailable: true;
  persistencePerformed: false;
  repositoryWritePerformed: false;
  deploymentPerformed: false;
  automaticContinuation: false;
}

interface FailedResult {
  ok: false;
  error: string;
  cause?: string;
}

type WorkbenchResult =
  | SuccessfulResult
  | FailedResult;

type HumanDisposition =
  | 'pending'
  | 'accepted_for_review'
  | 'revision_requested'
  | 'rejected';

function newRunId(): string {
  const suffix = globalThis.crypto
    ?.randomUUID?.()
    .replaceAll('-', '')
    .slice(0, 16) ?? Date.now().toString(36);

  return `cao-workbench-${suffix}`;
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function download(
  filename: string,
  content: string,
  type: string,
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function markdown(
  result: SuccessfulResult,
  disposition: HumanDisposition,
): string {
  const fileManifest = result.evidencePacket.files
    .map(file =>
      `- \`${file.path}\` — ${file.availability}; SHA-256: ${file.sha256 ?? 'unavailable'}; truncated: ${String(file.truncated)}`,
    )
    .join('\n');

  return [
    '# OwnerPilot CAO Preview Workbench Report',
    '',
    ...result.liveRun.labels.map(label => `**${label}**  `),
    '',
    `**Human disposition:** ${disposition}`,
    `**Repository:** ${result.evidencePacket.repository}`,
    `**Evidence source commit:** ${result.evidencePacket.sourceCommit}`,
    `**Preview deployment commit:** ${result.liveRun.sourceCommitSha}`,
    `**Model:** ${result.liveRun.pinnedModelVersion}`,
    '',
    '## Objective',
    result.assignment.objective,
    '',
    '## Evidence manifest',
    fileManifest,
    '',
    '## Validated advisory draft',
    result.liveRun.draft.draftArtifact,
    '',
    '## Unknowns',
    ...result.liveRun.draft.unknowns.map(item => `- ${item}`),
    '',
    '## Dissent or competing interpretation',
    ...result.liveRun.draft.dissent.map(item => `- ${item}`),
    '',
    '## Founder decisions required',
    ...result.liveRun.draft.requiredHumanDecisions.map(item => `- ${item}`),
    '',
    '## Explicit prohibition on autonomous continuation',
    'This report is advisory and draft-only. It authorizes no implementation, repository write, deployment, Production action, role activation, model change, persistence expansion, or autonomous continuation.',
    '',
  ].join('\n');
}

export function CaoPreviewWorkbenchForm() {
  const [taskClass, setTaskClass] = useState<
    'architecture_analysis' | 'evaluation_only'
  >('architecture_analysis');
  const [runId, setRunId] = useState(newRunId);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [constraints, setConstraints] = useState(
    'Keep PR #338 Draft\nNo role activation\nNo repository or deployment authority\nNo Production access\nNo autonomous continuation',
  );
  const [knownDecisions, setKnownDecisions] = useState(
    'Founder sovereign authority remains controlling\nCAO remains advisory and Preview-only\nRepository Developer Operator is not authorized',
  );
  const [unresolvedQuestions, setUnresolvedQuestions] = useState(
    'What is the smallest safe Repository Developer Operator boundary?\nWhat sequence should govern future enterprise-agent roles?',
  );
  const [requestedOutputType, setRequestedOutputType] = useState(
    'architecture_recommendation',
  );
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('Ready for explicit human initiation.');
  const [result, setResult] = useState<WorkbenchResult | null>(null);
  const [disposition, setDisposition] = useState<HumanDisposition>('pending');

  const success = result?.ok ? result : null;
  const canExport = Boolean(success);

  const manifestSummary = useMemo(() => {
    if (!success) return null;

    return `${success.evidencePacket.fileCount} files · ${success.evidencePacket.totalIncludedBytes} included bytes · truncation ${success.evidencePacket.truncated ? 'present' : 'none'}`;
  }, [success]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setResult(null);
    setDisposition('pending');

    if (!confirmed) {
      setResult({
        ok: false,
        error: 'explicit_human_confirmation_required',
      });
      return;
    }

    setSubmitting(true);
    setProgress('Validating administrator, Preview boundary, source commit, and approved evidence scope.');

    try {
      const response = await fetch(
        '/api/internal/executive-agents/preview/workbench',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            requestVersion: REQUEST_VERSION,
            taskClass,
            runId,
            objective,
            evidenceScopeId: EVIDENCE_SCOPE,
            sourceCommit: SOURCE_COMMIT,
            constraints: lines(constraints),
            knownDecisions: lines(knownDecisions),
            unresolvedQuestions: lines(unresolvedQuestions),
            founderApprovalReference: APPROVAL_REFERENCE,
            requestedOutputType,
            explicitHumanInitiation: true,
            sensitiveContentPresent: false,
          }),
        },
      );

      setProgress('Repository evidence was collected server-side. Waiting for one bounded provider request and strict final validation.');

      const body = await response.json().catch(() => ({
        ok: false,
        error: 'invalid_response',
      })) as WorkbenchResult;

      setResult(body);
      setProgress(
        body.ok
          ? 'Validated final output is ready for human review. No follow-on action was started.'
          : 'The workbench stopped without releasing an unvalidated draft.',
      );
    } catch {
      setResult({
        ok: false,
        error: 'request_failed',
      });
      setProgress('The workbench stopped before a validated result was available.');
    } finally {
      setSubmitting(false);
    }
  }

  function exportJson(): void {
    if (!success) return;

    download(
      `ownerpilot-cao-${runId}.json`,
      JSON.stringify({
        ...success,
        humanDisposition: disposition,
      }, null, 2),
      'application/json',
    );
  }

  function exportMarkdown(): void {
    if (!success) return;

    download(
      `ownerpilot-cao-${runId}.md`,
      markdown(success, disposition),
      'text/markdown',
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-rule bg-tint p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Approved repository evidence scope
        </p>
        <p className="mt-2 font-semibold text-brand">
          Enterprise AI Workforce recovery and current CAO runtime
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Repository</dt>
            <dd className="break-all text-muted">hjt521/ownerpilot</dd>
          </div>
          <div>
            <dt className="font-semibold">Immutable source commit</dt>
            <dd className="break-all font-mono text-xs text-muted">{SOURCE_COMMIT}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Field label="Task class">
          <select
            value={taskClass}
            onChange={event => setTaskClass(event.target.value as typeof taskClass)}
            className="w-full rounded-xl border border-rule bg-white px-4 py-3"
          >
            <option value="architecture_analysis">architecture_analysis</option>
            <option value="evaluation_only">evaluation_only</option>
          </select>
        </Field>

        <Field label="Objective">
          <textarea
            value={objective}
            onChange={event => setObjective(event.target.value)}
            rows={6}
            maxLength={4000}
            className="w-full rounded-xl border border-rule bg-white px-4 py-3"
          />
        </Field>

        <div className="grid gap-5 lg:grid-cols-3">
          <LineField label="Constraints" value={constraints} onChange={setConstraints} />
          <LineField label="Known decisions" value={knownDecisions} onChange={setKnownDecisions} />
          <LineField label="Unresolved questions" value={unresolvedQuestions} onChange={setUnresolvedQuestions} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Requested output type">
            <select
              value={requestedOutputType}
              onChange={event => setRequestedOutputType(event.target.value)}
              className="w-full rounded-xl border border-rule bg-white px-4 py-3"
            >
              <option value="architecture_recommendation">architecture_recommendation</option>
              <option value="implementation_handoff">implementation_handoff</option>
              <option value="technical_reconciliation">technical_reconciliation</option>
            </select>
          </Field>
          <Field label="Run ID">
            <input
              value={runId}
              onChange={event => setRunId(event.target.value)}
              maxLength={128}
              className="w-full rounded-xl border border-rule bg-white px-4 py-3 font-mono text-sm"
            />
          </Field>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-[#fffaf0] p-4 text-sm leading-6">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={event => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          <span>
            I explicitly initiate one advisory Preview run and confirm the objective and bounded fields contain no secret, customer, tenant, legal-case, payment, notice, health, financial-account, Production-data, or other sensitive information.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Running bounded analysis…' : 'Initiate one CAO run'}
        </button>
      </form>

      <section aria-live="polite" className="rounded-2xl border border-rule bg-white p-5">
        <h2 className="font-serif text-2xl text-brand">Progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{progress}</p>
      </section>

      {result && !result.ok ? (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Run withheld</h2>
          <p className="mt-2 text-sm text-red-800">{result.error}</p>
        </section>
      ) : null}

      {success ? (
        <section className="space-y-6 rounded-2xl border border-rule bg-white p-5 sm:p-7">
          <div>
            <h2 className="font-serif text-3xl text-brand">Validated advisory report</h2>
            <p className="mt-2 text-sm text-muted">{manifestSummary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {success.liveRun.labels.map(label => (
              <span key={label} className="rounded-full border border-gold/50 bg-tint px-3 py-1 text-xs font-bold text-brand">
                {label}
              </span>
            ))}
          </div>

          <details className="rounded-xl border border-rule p-4" open>
            <summary className="cursor-pointer font-semibold text-brand">Evidence manifest</summary>
            <ul className="mt-4 space-y-3 text-sm">
              {success.evidencePacket.files.map(file => (
                <li key={file.path} className="rounded-lg bg-tint p-3">
                  <p className="break-all font-mono text-xs">{file.path}</p>
                  <p className="mt-1 text-muted">{file.classification} · {file.availability} · truncated {String(file.truncated)}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-muted">SHA-256 {file.sha256 ?? 'unavailable'}</p>
                </li>
              ))}
            </ul>
          </details>

          <article className="whitespace-pre-wrap rounded-xl border border-rule bg-tint p-5 text-sm leading-7">
            {success.liveRun.draft.draftArtifact}
          </article>

          <div className="grid gap-5 md:grid-cols-2">
            <List title="Unknowns" items={success.liveRun.draft.unknowns} />
            <List title="Dissent or competing interpretation" items={success.liveRun.draft.dissent} />
            <List title="Founder decisions required" items={success.liveRun.draft.requiredHumanDecisions} />
            <List title="Prohibited or unavailable actions" items={success.liveRun.draft.prohibitedOrUnavailableActions} />
          </div>

          <Field label="Human disposition (local UI state only; not persisted)">
            <select
              value={disposition}
              onChange={event => setDisposition(event.target.value as HumanDisposition)}
              className="w-full rounded-xl border border-rule bg-white px-4 py-3"
            >
              <option value="pending">pending</option>
              <option value="accepted_for_review">accepted_for_review</option>
              <option value="revision_requested">revision_requested</option>
              <option value="rejected">rejected</option>
            </select>
          </Field>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportMarkdown} disabled={!canExport} className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">
              Export Markdown
            </button>
            <button type="button" onClick={exportJson} disabled={!canExport} className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">
              Export JSON
            </button>
          </div>

          <p className="rounded-xl border border-gold/40 bg-[#fffaf0] p-4 text-sm leading-6">
            No implementation, repository write, deployment, Production action, persistence, agent dispatch, or automatic continuation was performed or authorized.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-brand">{label}</span>
      {children}
    </label>
  );
}

function LineField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={`${label} (one per line)`}>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        rows={7}
        className="w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm"
      />
    </Field>
  );
}

function List({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="rounded-xl border border-rule p-4">
      <h3 className="font-semibold text-brand">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
