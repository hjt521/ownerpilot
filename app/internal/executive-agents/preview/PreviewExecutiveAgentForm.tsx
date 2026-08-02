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

interface AcceptedBody {
  ok: true;
  accepted: true;
  executionPerformed: false;
  labels: readonly string[];
  roleId: string;
  taskClass: TaskClass;
  modelSlot: 'primary';
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  registryVersion: string;
  charterVersion: string;
  sourceCommitSha: string;
  approvalReference: string;
  evidenceReferences:
    readonly string[];
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  humanReviewRequired: true;
  automaticApproval: false;
  automaticDispatch: false;
  automaticContinuation: false;
  fallbackAllowed: false;
  providerSubstitutionAllowed: false;
  persistencePerformed: false;
  productionEligible: false;
}

interface ErrorBody {
  ok: false;
  error: string;
  issueCodes?: readonly string[];
  registryIssueCodes?:
    readonly string[];
}

type ResponseBody =
  | AcceptedBody
  | ErrorBody;

function newRunId(): string {
  const suffix =
    globalThis.crypto
      ?.randomUUID?.()
      .replaceAll('-', '')
      .slice(0, 16) ??
    Date.now().toString(36);

  return `synthetic-cao-ui-${suffix}`;
}

function errorMessage(
  body: ErrorBody,
): string {
  switch (body.error) {
    case 'not_found':
      return 'This restricted Preview surface is unavailable.';
    case 'unauthorized':
      return 'The request was not authorized.';
    case 'unsupported_media_type':
      return 'The request format was not accepted.';
    case 'payload_too_large':
      return 'The request exceeds the permitted size.';
    case 'invalid_request':
      return 'Review the fields and submit a bounded nonsensitive request.';
    case 'route_unavailable':
      return 'The restricted server configuration is incomplete.';
    case 'request_rejected':
      return 'The fail-closed Preview gate rejected this request.';
    default:
      return 'The preflight request could not be validated.';
  }
}

export function PreviewExecutiveAgentForm() {
  const [
    taskClass,
    setTaskClass,
  ] = useState<TaskClass>(
    'architecture_analysis',
  );

  const [
    runId,
    setRunId,
  ] = useState(
    newRunId,
  );

  const [
    instructions,
    setInstructions,
  ] = useState('');

  const [
    evidenceReference,
    setEvidenceReference,
  ] = useState(
    'synthetic-evidence-001',
  );

  const [
    evidenceClassification,
    setEvidenceClassification,
  ] =
    useState<EvidenceClassification>(
      'synthetic',
    );

  const [
    evidenceContent,
    setEvidenceContent,
  ] = useState('');

  const [
    humanInitiated,
    setHumanInitiated,
  ] = useState(false);

  const [
    nonsensitiveConfirmed,
    setNonsensitiveConfirmed,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    response,
    setResponse,
  ] = useState<ResponseBody | null>(
    null,
  );

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

    try {
      const result =
        await fetch(
          '/api/internal/executive-agents/preview/ui',
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

      const body =
        await result
          .json()
          .catch(
            () => ({
              ok: false,
              error:
                'invalid_response',
            }),
          ) as ResponseBody;

      setResponse(body);
    } catch {
      setResponse({
        ok: false,
        error: 'network_error',
      });
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
          Prepare a preflight request
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The server derives the authorized role, pinned model slot,
          approval reference, administrator identity, authority boundary,
          registry entry, and empty tool posture.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Task class"
          help="Only the two Founder-authorized task classes are available."
        >
          <select
            value={taskClass}
            onChange={event =>
              setTaskClass(
                event.target
                  .value as TaskClass,
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
          help="Synthetic identifier only. No customer or case identifiers."
        >
          <div className="flex gap-2">
            <input
              value={runId}
              onChange={event =>
                setRunId(
                  event.target.value,
                )
              }
              required
              maxLength={128}
              pattern="[A-Za-z0-9._:-]+"
              className={controlClass}
            />
            <button
              type="button"
              onClick={() =>
                setRunId(
                  newRunId(),
                )
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
        help="Describe one bounded architecture question. Maximum 8,000 characters."
      >
        <textarea
          value={instructions}
          onChange={event =>
            setInstructions(
              event.target.value,
            )
          }
          required
          maxLength={8000}
          rows={7}
          className={controlClass}
          placeholder="Analyze the synthetic dependency, identify assumptions and unknowns, preserve dissent, and provide a noncanonical advisory draft."
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
          help="Sensitive or customer-derived classifications are unavailable."
        >
          <select
            value={
              evidenceClassification
            }
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
        help="One bounded item only. Maximum 4,000 characters."
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
          onChange={
            setHumanInitiated
          }
          label="I am explicitly initiating this single preflight request."
        />

        <Checkbox
          checked={
            nonsensitiveConfirmed
          }
          onChange={
            setNonsensitiveConfirmed
          }
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
          ? 'Validating preflight…'
          : 'Validate preflight — no model execution'}
      </button>

      <div
        aria-live="polite"
        className="min-h-6"
      >
        {response?.ok === true && (
          <AcceptedResult
            body={response}
          />
        )}

        {response?.ok === false && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
          >
            <p className="font-bold">
              Preflight not accepted
            </p>
            <p className="mt-2">
              {errorMessage(response)}
            </p>

            {response.issueCodes &&
              response.issueCodes
                .length > 0 && (
                <p className="mt-2 font-mono text-xs">
                  {response.issueCodes
                    .join(', ')}
                </p>
              )}
          </div>
        )}
      </div>
    </form>
  );
}

function AcceptedResult({
  body,
}: {
  body: AcceptedBody;
}) {
  return (
    <section className="rounded-2xl border border-sage bg-[#f2f8f4] p-5">
      <p className="text-sm font-bold uppercase tracking-wider text-brand">
        Preflight accepted
      </p>

      <h3 className="mt-2 font-serif text-2xl font-semibold text-brand">
        Validation completed without execution
      </h3>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <ResultRow
          label="Role"
          value={body.roleId}
        />
        <ResultRow
          label="Task"
          value={body.taskClass}
        />
        <ResultRow
          label="Model"
          value={body.modelId}
        />
        <ResultRow
          label="Slot"
          value={body.modelSlot}
        />
        <ResultRow
          label="Evidence reference"
          value={
            body.evidenceReferences
              .join(', ')
          }
        />
        <ResultRow
          label="Source commit"
          value={
            body.sourceCommitSha
              .slice(0, 12)
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {body.labels.map(label => (
          <span
            key={label}
            className="rounded-full border border-sage bg-white px-3 py-1 text-xs font-bold text-brand"
          >
            {label}
          </span>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-ink">
        Human review remains required. No provider call, model execution,
        tool use, persistence, fallback, substitution, automatic dispatch,
        continuation, approval, or Production action occurred.
      </p>
    </section>
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
  onChange:
    (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={event =>
          onChange(
            event.target.checked,
          )
        }
        className="mt-1 h-4 w-4 accent-[#102018]"
      />
      <span>{label}</span>
    </label>
  );
}

const controlClass =
  'w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-neutral-400 focus:border-gold focus:ring-2 focus:ring-gold/20';
