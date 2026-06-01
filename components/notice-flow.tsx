'use client';

import { useState, type ChangeEvent } from 'react';
import {
  createFlowState,
  FlowStep,
  NoticeFlowState,
  NoticeFlowData,
  DisputeAnswer,
} from '@/lib/flow/noticeFlowState';
import { validateStep, advance, goBack, STEP_ORDER } from '@/lib/flow/advancement';

/**
 * NoticeFlow — the field-collection UI for the 3-Day Notice to Pay Rent or Quit.
 *
 * This component is intentionally THIN. All validation, advancement, and gating
 * logic lives in the tested headless core (@/lib/flow). This renders state and
 * forwards input; it does not re-implement any legal rule. If a rule seems to
 * be missing, it belongs in the core, not here.
 *
 * First slice: shell + pre-flight dispute screen + property step. Remaining
 * steps render a placeholder until their forms are built. LA-ish addresses are
 * routed to a "not yet supported" state by the core's jurisdiction logic — this
 * UI never offers production for a blocked jurisdiction.
 */

const STEP_LABELS: Record<FlowStep, string> = {
  [FlowStep.PreflightDispute]: 'Before we start',
  [FlowStep.PropertyIdentification]: 'The property',
  [FlowStep.Tenants]: 'The tenant(s)',
  [FlowStep.AmountOwed]: 'Rent owed',
  [FlowStep.PaymentInstructions]: 'How to pay',
  [FlowStep.LandlordAgentInfo]: 'Who is serving',
  [FlowStep.Review]: 'Review',
  [FlowStep.ServiceInstructions]: 'Serving the notice',
};

export function NoticeFlow() {
  const [state, setState] = useState<NoticeFlowState>(createFlowState);
  const [showIssues, setShowIssues] = useState(false);

  const update = (patch: Partial<NoticeFlowData>) => {
    setState((s) => ({ ...s, data: { ...s.data, ...patch } }));
    setShowIssues(false);
  };

  const validation = validateStep(state.step, state.data);

  const onNext = () => {
    const result = advance(state);
    if (result.moved) {
      setState(result.state);
      setShowIssues(false);
    } else {
      setShowIssues(true);
    }
  };

  const onBack = () => {
    setState(goBack(state));
    setShowIssues(false);
  };

  const stepIndex = STEP_ORDER.indexOf(state.step);
  const totalSteps = STEP_ORDER.length;

  // Hard-block to attorney handoff (dispute screen, any "yes").
  if (validation.hardBlocked) {
    return <AttorneyHandoff />;
  }

  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        {/* Progress eyebrow */}
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 mb-3">
            3-Day Notice to Pay Rent or Quit
          </p>
          <div className="flex items-center gap-2 mb-4" aria-hidden>
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  i <= stepIndex ? 'bg-blue-700' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            {STEP_LABELS[state.step]}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Step {stepIndex + 1} of {totalSteps}
          </p>
        </header>

        {/* Step body */}
        <section className="mb-10">
          {state.step === FlowStep.PreflightDispute && (
            <DisputeStep data={state.data} update={update} />
          )}
          {state.step === FlowStep.PropertyIdentification && (
            <PropertyStep data={state.data} update={update} />
          )}
          {![FlowStep.PreflightDispute, FlowStep.PropertyIdentification].includes(
            state.step,
          ) && <PlaceholderStep label={STEP_LABELS[state.step]} />}
        </section>

        {/* Validation issues */}
        {showIssues && validation.issues.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <ul className="space-y-1 text-sm text-amber-900">
              {validation.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <button
            onClick={onBack}
            disabled={stepIndex === 0}
            className="text-gray-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
          >
            Continue →
          </button>
        </div>

        {/* Persistent disclaimer (matches our-approach footer tone) */}
        <footer className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            OwnerPilot AI is not a law firm and does not provide legal advice.
            This is a broker-prepared notice produced under California Licensed
            Real Estate Broker supervision. For legal matters, consult a
            California licensed attorney of your choosing.
          </p>
        </footer>
      </article>
    </main>
  );
}

// --- Pre-flight dispute step ------------------------------------------------

function DisputeStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData>) => void;
}) {
  const d = data.dispute;
  const set = (key: keyof typeof d, value: DisputeAnswer) =>
    update({ dispute: { ...d, [key]: value } });

  return (
    <div className="space-y-6">
      <p className="text-lg text-gray-800 leading-relaxed">
        Before you start: this notice is appropriate for routine non-payment
        situations. A few questions first — if any apply, this is past where a
        broker-prepared notice is the right move.
      </p>

      <TriQuestion
        question="Has your tenant filed any kind of complaint against you (court, fair housing agency, or code enforcement)?"
        value={d.tenantFiledComplaint}
        onChange={(v) => set('tenantFiledComplaint', v)}
        unknownNote={{
          tone: 'proceed',
          body: 'You can continue without confirming this — a tenant complaint doesn’t by itself prevent a routine 3-day notice. We’ll note on the record that it wasn’t confirmed. If you can, it’s still worth checking.',
        }}
      />
      <TriQuestion
        question="Has your tenant told you in writing that they're withholding rent because of habitability issues, repairs, or any other dispute?"
        value={d.tenantWrittenWithholding}
        onChange={(v) => set('tenantWrittenWithholding', v)}
        unknownNote={{
          tone: 'block',
          body: 'Please confirm this before serving. A written habitability or repair dispute can become a defense to an eviction, so this one needs a clear Yes or No. Check your messages and notices from the tenant, then come back.',
        }}
      />
      <TriQuestion
        question="Has your tenant filed for bankruptcy?"
        value={d.tenantBankruptcy}
        onChange={(v) => set('tenantBankruptcy', v)}
        unknownNote={{ tone: 'bankruptcy' }}
      />
    </div>
  );
}

type UnknownNote =
  | { tone: 'proceed'; body: string }
  | { tone: 'block'; body: string }
  | { tone: 'bankruptcy' };

function TriQuestion({
  question,
  value,
  onChange,
  unknownNote,
}: {
  question: string;
  value: DisputeAnswer | undefined;
  onChange: (v: DisputeAnswer) => void;
  unknownNote: UnknownNote;
}) {
  const options: { label: string; v: DisputeAnswer }[] = [
    { label: 'No', v: 'no' },
    { label: 'Yes', v: 'yes' },
    { label: "I don't know", v: 'unknown' },
  ];
  const styleFor = (v: DisputeAnswer, selected: boolean) => {
    if (!selected)
      return 'bg-white border-gray-300 text-gray-700 hover:border-gray-400';
    if (v === 'yes') return 'bg-amber-100 border-amber-400 text-amber-900';
    if (v === 'unknown') return 'bg-amber-50 border-amber-300 text-amber-800';
    return 'bg-blue-50 border-blue-400 text-blue-900';
  };
  return (
    <div className="rounded-lg border border-gray-200 px-5 py-4">
      <p className="text-gray-900 mb-3 leading-relaxed">{question}</p>
      <div className="flex flex-wrap gap-3">
        {options.map(({ label, v }) => (
          <button
            key={label}
            onClick={() => onChange(v)}
            className={`px-5 py-2 rounded-lg font-medium border transition-colors ${styleFor(
              v,
              value === v,
            )}`}
          >
            {label}
          </button>
        ))}
      </div>
      {value === 'unknown' && (
        <div className="mt-4">
          {unknownNote.tone === 'bankruptcy' ? (
            <BankruptcyCheckGuidance />
          ) : (
            <div
              className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
                unknownNote.tone === 'block'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              {unknownNote.tone === 'block' && (
                <p className="font-semibold mb-1">
                  Please confirm this before serving.
                </p>
              )}
              {unknownNote.tone === 'proceed' && (
                <p className="font-semibold mb-1">
                  You can continue — but it&apos;s worth a quick check.
                </p>
              )}
              <p>{unknownNote.body}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BankruptcyCheckGuidance() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <p className="font-semibold text-amber-900 mb-2">
        Please confirm this before serving.
      </p>
      <p className="text-sm text-amber-900 leading-relaxed mb-3">
        If the tenant has filed for bankruptcy, serving this notice can violate
        the federal <strong>automatic stay</strong>. That isn&apos;t a defective
        notice you fix by re-serving — it&apos;s a federal violation that can
        carry sanctions, actual damages, and in some cases punitive damages
        against the landlord. It&apos;s worth two minutes to confirm.
      </p>
      <p className="text-sm font-semibold text-amber-900 mb-1">
        Three quick ways to check:
      </p>
      <ul className="text-sm text-amber-900 leading-relaxed list-disc pl-5 space-y-1">
        <li>
          Search federal court records on{' '}
          <a
            href="https://pacer.uscourts.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            PACER
          </a>{' '}
          (the federal court case lookup) by the tenant&apos;s name.
        </li>
        <li>
          Check whether the tenant has sent you any bankruptcy filing paperwork
          or a case number.
        </li>
        <li>Ask the tenant directly, or call to confirm.</li>
      </ul>
      <p className="text-sm text-amber-900 leading-relaxed mt-3">
        Once you know, come back and answer <strong>Yes</strong> or{' '}
        <strong>No</strong>. You can&apos;t continue while this is marked
        &ldquo;I don&apos;t know.&rdquo;
      </p>
    </div>
  );
}

// --- Property step ----------------------------------------------------------

function PropertyStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData>) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-lg text-gray-800 leading-relaxed">
        Where is the rental property? This determines which local rules apply.
      </p>
      <div>
        <label
          htmlFor="propertyAddress"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Property street address
        </label>
        <input
          id="propertyAddress"
          type="text"
          value={data.propertyAddress ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ propertyAddress: e.target.value })
          }
          placeholder="123 Main St, City, CA 90000"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Note: properties in the City of Los Angeles and several other cities
          have additional local requirements. OwnerPilot will tell you if your
          property needs steps it doesn&apos;t yet fully support.
        </p>
      </div>
    </div>
  );
}

// --- Placeholder for unbuilt steps ------------------------------------------

function PlaceholderStep({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-5 py-10 text-center">
      <p className="text-gray-500">
        “{label}” — this step&apos;s form is coming next.
      </p>
    </div>
  );
}

// --- Attorney handoff (dispute hard-block) ----------------------------------

function AttorneyHandoff() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700 mb-3">
          Talk to an attorney first
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
          This is past where a broker-prepared notice is the right move.
        </h1>
        <div className="space-y-4 text-lg text-gray-800 leading-relaxed">
          <p>
            Based on what you told us, your situation involves more than a
            routine non-payment. When a tenant has asserted a legal claim,
            disputed rent in writing, or filed for bankruptcy, serving a notice
            without legal guidance can create real problems.
          </p>
          <p>
            Talk to a California licensed attorney before serving any notice.
            You can read about why OwnerPilot keeps attorney services separate
            on our{' '}
            <a href="/our-approach" className="text-blue-700 underline">
              approach page
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
