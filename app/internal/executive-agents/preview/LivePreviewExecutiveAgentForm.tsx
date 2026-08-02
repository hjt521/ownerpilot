'use client';

import {
  useState,
  type FormEvent,
} from 'react';

const UI_REQUEST_VERSION =
  'executive-agents-preview-ui-request-v1';

type TaskClass =
  | 'architecture_analysis'
  | 'evaluation_only';

type EvidenceClassification =
  | 'synthetic'
  | 'approved_non_sensitive_repository_derived';

interface DraftOutput {
  facts: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  recommendations: readonly string[];
  dissent: readonly string[];
  requiredHumanDecisions:
    readonly string[];
  prohibitedOrUnavailableActions:
    readonly string[];
  evidenceReferences:
    readonly string[];
  escalationRequired: boolean;
  draftArtifact: string;
}

interface SuccessBody {
  ok: true;
  completed: true;
  labels: readonly string[];
  roleId: string;
  taskClass: TaskClass;
  modelSlot: 'primary';
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  sourceCommitSha: string;
  approvalReference: string;
  evidenceReferences:
    readonly string[];
  repairAttemptMaximum: 0;
  draft: DraftOutput;
  humanReviewRequired: true;
  humanDisposition: 'pending';
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  automaticApproval: false;
  automaticDispatch: false;
  automaticContinuation: false;
  fallbackPerformed: false;
  substitutionPerformed: false;
  persistencePerformed: false;
  productionEligible: false;
}

interface ErrorBody {
  ok: false;
  error: string;
}

type ResponseBody =
  | SuccessBody
  | ErrorBody;

function newRunId(): string {
  const suffix =
    globalThis.crypto
      ?.randomUUID?.()
      .replaceAll('-', '')
      .slice(0, 16) ??
    Date.now().toString(36);

  return `synthetic-cao-run-${suffix}`;
}

function errorMessage(
  error: string,
): string {
  switch (error) {
    case 'not_found':
      return 'This restricted Preview surface is unavailable.';
    case 'unsupported_media_type':
      return 'The request format was not accepted.';
    case 'payload_too_large':
      return 'The request exceeds the permitted size.';
    case 'invalid_request':
      return 'Review the fields and submit one bounded nonsensitive request.';
    case 'route_unavailable':
    case 'gateway_unavailable':
      return 'The restricted Preview configuration is incomplete.';
    case 'request_rejected':
      return 'The fail-closed Preview gate rejected this request.';
    case 'provider_authentication_failed':
      return 'The provider could not authenticate the restricted Preview request.';
    case 'provider_rate_limited':
      return 'The provider rate-limited this single Preview request.';
    case 'provider_timeout':
      return 'The single Preview request exceeded its bounded timeout.';
    case 'provider_failed':
      return 'The provider failed before a validated draft was available.';
    case 'limit_exceeded':
      return 'The completed request exceeded a configured token, cost, or latency limit.';
    case 'output_rejected':
      return 'The completed response failed strict output or authority validation.';
    default:
      return 'The restricted Preview run did not complete.';
  }
}

export function LivePreviewExecutiveAgentForm() {
  const [taskClass, setTaskClass] =
    useState<TaskClass>(
      'architecture_analysis',
    );
  const [runId, setRunId] =
    useState(newRunId);
  const [instructions, setInstructions] =
    useState('');
  const [evidenceReference, setEvidenceReference] =
    useState('synthetic-evidence-001');
  const [evidenceClassification, setEvidenceClassification] =
    useState<EvidenceClassification>(
      'synthetic',
    );
  const [evidenceContent, setEvidenceContent] =
    useState('');
  const [humanInitiated, setHumanInitiated] =
    useState(false);
  const [nonsensitiveConfirmed, setNonsensitiveConfirmed] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [response, setResponse] =
    useState<ResponseBody | null>(null);
  const [progress, setProgress] =
    useState<string | null>(null);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setResponse(null);

    if (
      !humanInitiated ||
      !nonsensitiveConfirmed
    ) {
      setResponse({
        ok: false,
        error: 'invalid_request',
      });
      return;
    }

    setSubmitting(true);
    setProgress(
      'Request accepted. Server validation and one bounded provider request are in progress.',
    );

    try {
      const result = await fetch(
        '/api/internal/executive-agents/preview/run',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            requestVersion:
              UI_REQUEST_VERSION,
            taskClass,
            runId,
            instructions,
            evidenceReference,
            evidenceClassification,
            evidenceContent,
            explicitHumanInitiation:
              true,
            sensitiveContentPresent:
              false,
          }),
        },
      );

      const body = await result
        .json()
        .catch(() => ({
          ok: false,
          error: 'invalid_response',
        })) as ResponseBody;

      setResponse(body);
      setProgress(
        body.ok
          ? 'Run completed. The validated draft is ready for human review.'
          : 'Run failed closed. No substantive model output was released.',
      );
    } catch {
      setResponse({
        ok: false,
        error: 'network_error',
      });
      setProgress(
        'Run failed closed. No substantive model output was released.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-7"
    >
      <div>
        <h2 className="font-serif text-3xl font-semibold text-brand">
          Initiate one CAO Preview run
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The server derives the approved role, pinned primary model,
          approval reference, administrator identity, empty tool posture,
          and advisory-only authority boundary.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Task class"
          help="Only the two approved CAO task classes are available."
        >
          <select
            value={taskClass}
            onChange={event =>
              setTaskClass(
                event.target.value as TaskClass,
              )
            }
            className={controlClass}
          >
            <option value="architecture_analysis">
              Architecture analysis
            </option>
            <option value="evaluation_only">
              Evaluation only
            </option>
          </select>
        </Field>

        <Field
          label="Run identifier"
          help="Synthetic identifier only. No customer, tenant, property, or case identifiers."
        >
          <div className="flex gap-2">
            <input
              value={runId}
              onChange={event =>
                setRunId(event.target.value)
              }
              required
              maxLength={128}
              pattern="[A-Za-z0-9._:-]+"
              className={controlClass}
            />
            <button
              type="button"
              onClick={() =>
                setRunId(newRunId())
              }
              className="shrink-0 rounded-xl border border-rule bg-tint px-4 text-sm font-semibold text-brand hover:bg-ivory"
            >
              New
            </button>
          </div>
        </Field>
      </div>

      <Field
        label="Instructions"
        help="One bounded architecture question. Maximum 8,000 characters."
      >
        <textarea
          value={instructions}
          onChange={event =>
            setInstructions(event.target.value)
          }
          required
          maxLength={8000}
          rows={7}
          className={controlClass}
          placeholder="Analyze the synthetic architecture scenario, identify facts, assumptions and unknowns, preserve dissent, and provide a noncanonical advisory draft."
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Evidence reference"
          help="A synthetic label or approved nonsensitive repository pointer."
        >
          <input
            value={evidenceReference}
            onChange={event =>
              setEvidenceReference(
                event.target.value,
              )
            }
            required
            maxLength={256}
            className={controlClass}
          />
        </Field>

        <Field
          label="Evidence classification"
          help="Sensitive, customer-derived, legal-control, and Production classifications are unavailable."
        >
          <select
            value={evidenceClassification}
            onChange={event =>
              setEvidenceClassification(
                event.target.value as
                  EvidenceClassification,
              )
            }
            className={controlClass}
          >
            <option value="synthetic">
              Synthetic
            </option>
            <option value="approved_non_sensitive_repository_derived">
              Approved nonsensitive repository-derived
            </option>
          </select>
        </Field>
      </div>

      <Field
        label="Evidence content"
        help="One bounded, human-supplied item. Maximum 4,000 characters."
      >
        <textarea
          value={evidenceContent}
          onChange={event =>
            setEvidenceContent(
              event.target.value,
            )
          }
          required
          maxLength={4000}
          rows={6}
          className={controlClass}
          placeholder="Synthetic service A depends on synthetic service B."
        />
      </Field>

      <div className="space-y-3 rounded-2xl border border-rule bg-tint p-5">
        <Checkbox
          checked={humanInitiated}
          onChange={setHumanInitiated}
          label="I affirmatively initiate this one independent CAO Preview run."
        />
        <Checkbox
          checked={nonsensitiveConfirmed}
          onChange={setNonsensitiveConfirmed}
          label="I confirm the instructions and evidence contain only synthetic or approved nonsensitive information."
        />
      </div>

      <button
        type="submit"
        disabled={
          submitting ||
          !humanInitiated ||
          !nonsensitiveConfirmed
        }
        className="w-full rounded-2xl bg-brand px-6 py-4 text-base font-bold text-white transition hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting
          ? 'Running one restricted Preview request…'
          : 'Initiate one CAO Preview run'}
      </button>

      <div aria-live="polite">
        {progress && (
          <p className="rounded-xl border border-rule bg-tint p-4 text-sm text-ink">
            {progress}
          </p>
        )}
      </div>

      {response?.ok === false && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
        >
          <p className="font-bold">
            Run not completed
          </p>
          <p className="mt-2">
            {errorMessage(response.error)}
          </p>
        </div>
      )}

      {response?.ok === true && (
        <ValidatedResult body={response} />
      )}
    </form>
  );
}

function ValidatedResult({
  body,
}: {
  body: SuccessBody;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-sage bg-[#f2f8f4] p-5 sm:p-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-brand">
          Validated draft ready
        </p>
        <h3 className="mt-2 font-serif text-2xl font-semibold text-brand">
          Human review required
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {body.labels.map(label => (
          <span
            key={label}
            className="rounded-full border border-sage bg-white px-3 py-1 text-xs font-bold text-brand"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <ResultRow label="Role" value={body.roleId} />
        <ResultRow label="Task" value={body.taskClass} />
        <ResultRow label="Model" value={body.modelId} />
        <ResultRow label="Slot" value={body.modelSlot} />
        <ResultRow
          label="Evidence"
          value={body.evidenceReferences.join(', ')}
        />
        <ResultRow
          label="Source commit"
          value={body.sourceCommitSha.slice(0, 12)}
        />
      </div>

      <OutputSection
        title="Draft artifact"
        values={[body.draft.draftArtifact]}
      />
      <OutputSection title="Facts" values={body.draft.facts} />
      <OutputSection title="Assumptions" values={body.draft.assumptions} />
      <OutputSection title="Unknowns" values={body.draft.unknowns} />
      <OutputSection title="Recommendations" values={body.draft.recommendations} />
      <OutputSection title="Dissent" values={body.draft.dissent} />
      <OutputSection
        title="Required human decisions"
        values={body.draft.requiredHumanDecisions}
      />
      <OutputSection
        title="Prohibited or unavailable actions"
        values={body.draft.prohibitedOrUnavailableActions}
      />

      <p className="text-sm leading-6 text-ink">
        This result is noncanonical, advisory, draft-only, and pending human
        disposition. No implementation authority, Production authority,
        persistence, tool use, fallback, substitution, automatic dispatch,
        continuation, or approval was created.
      </p>
    </section>
  );
}

function OutputSection({
  title,
  values,
}: {
  title: string;
  values: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-sage/50 bg-white p-4">
      <h4 className="font-bold text-brand">
        {title}
      </h4>
      {values.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          None recorded.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-ink">
          {values.map((value, index) => (
            <li key={`${title}-${index}`}>
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-sage/50 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-xs text-brand">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-brand">
        {label}
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted">
        {help}
      </span>
      <span className="mt-2 block">
        {children}
      </span>
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={event =>
          onChange(event.target.checked)
        }
        className="mt-1 h-4 w-4 accent-[#102018]"
      />
      <span>{label}</span>
    </label>
  );
}

const controlClass =
  'w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-neutral-400 focus:border-gold focus:ring-2 focus:ring-gold/20';
