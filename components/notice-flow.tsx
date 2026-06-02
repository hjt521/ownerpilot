'use client';

import { useState, type ChangeEvent, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  createFlowState,
  FlowStep,
  NoticeFlowState,
  NoticeFlowData,
  DisputeAnswer,
  RentPeriod,
  SignerRole,
} from '@/lib/flow/noticeFlowState';
import { validateStep, advance, goBack, STEP_ORDER } from '@/lib/flow/advancement';
import { evaluateCanProduce } from '@/lib/flow/gates';
import type {
  PaymentMethod,
  PaymentMethodKind,
} from '@/lib/payments/validatePaymentMethods';
import type { ServiceMethod } from '@/lib/dates/computeCompliancePeriod';

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

  const update = (
    patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>),
  ) => {
    setState((s) => {
      const resolved = typeof patch === 'function' ? patch(s.data) : patch;
      return { ...s, data: { ...s.data, ...resolved } };
    });
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

  // Enter advances the flow, scoped to avoid hijacking other Enter behaviors:
  // - not on the last step (no forward action there),
  // - not when focus is on a <button> (dispute choices, calendar nav/icon keep
  //   their own native Enter),
  // - not in a <textarea> (Enter is a newline there).
  // Typing a date or name and pressing Enter SHOULD advance — the natural gesture.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    if (stepIndex >= totalSteps - 1) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'TEXTAREA') return;
    e.preventDefault();
    onNext();
  };

  // Hard-block to attorney handoff (dispute screen, any "yes").
  if (validation.hardBlocked) {
    return <AttorneyHandoff />;
  }

  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6 py-12 md:py-16" onKeyDown={onKeyDown}>
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
          {state.step === FlowStep.Tenants && (
            <TenantsStep data={state.data} update={update} />
          )}
          {state.step === FlowStep.AmountOwed && (
            <AmountStep data={state.data} update={update} />
          )}
          {state.step === FlowStep.PaymentInstructions && (
            <PaymentStep data={state.data} update={update} />
          )}
          {state.step === FlowStep.LandlordAgentInfo && (
            <LandlordStep data={state.data} update={update} />
          )}
          {state.step === FlowStep.Review && (
            <ReviewStep data={state.data} />
          )}
          {state.step === FlowStep.ServiceInstructions && (
            <ServiceStep />
          )}
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
          {stepIndex < totalSteps - 1 && (
            <button
              onClick={onNext}
              className="inline-flex items-center px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              Continue →
            </button>
          )}
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
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
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
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
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

// --- Shared field helpers ---------------------------------------------------

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-2">
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

/**
 * A reliable date field with an optional calendar picker.
 *
 * Background: native <input type="date"> proved unreliable in Safari (it renders
 * today's date as a visual placeholder without committing a value, so
 * onChange/onBlur never capture it). The fix was a controlled text input. This
 * version keeps that reliable text input as the SOURCE OF TRUTH (typing always
 * works, every browser) and layers a self-contained calendar popover on top for
 * point-and-click convenience. The calendar writes through the same onChange as
 * typing, so there is no separate state and the Safari failure mode cannot
 * return. No external date-picker dependency — a small month grid we control,
 * styled to match the flow.
 *
 * Interface is unchanged: { id, value, onChange } with value (storage) as
 * 'YYYY-MM-DD' — the format the legal date engine and all tests require. The
 * user sees and types US-format 'MM/DD/YYYY'; the component converts at the
 * boundary (display <-> ISO storage), so the engine never sees anything but ISO.
 */
function DateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Local DISPLAY string (MM/DD/YYYY, slashes auto-inserted). This is what the
  // user sees and edits. Storage (the `value` prop / onChange) is always ISO
  // 'YYYY-MM-DD' or empty — never a partial — so the legal engine and validators
  // only ever see a complete valid date or nothing, and the produce gate stays
  // closed until a full date is entered. We seed the display from the stored ISO
  // and keep it in sync on edits.
  const isoToDisplay = (iso: string): string => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return '';
    return `${m[2]}/${m[3]}/${m[1]}`;
  };

  const formatDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 8); // MMDDYYYY
    const mm = digits.slice(0, 2);
    const dd = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    let out = mm;
    if (digits.length > 2) out += '/' + dd;
    if (digits.length > 4) out += '/' + yyyy;
    return out;
  };

  const [display, setDisplay] = useState(isoToDisplay(value));

  const handleType = (raw: string) => {
    const formatted = formatDisplay(raw);
    setDisplay(formatted);
    const digits = raw.replace(/\D/g, '').slice(0, 8); // MMDDYYYY
    if (digits.length < 8) {
      onChange(''); // incomplete -> store empty so validators keep the gate closed
      return;
    }
    const mm = digits.slice(0, 2);
    const dd = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  // Parse the current value into a Date for the calendar's initial month/selection.
  // Returns null if value isn't a complete, valid YYYY-MM-DD.
  const parsed = ((): { y: number; m: number; d: number } | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { y, m, d };
  })();

  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed ? parsed.y : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.m - 1 : today.getMonth()); // 0-based

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const selectDay = (day: number) => {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(iso);
    setDisplay(isoToDisplay(iso)); // keep the text input in sync with the pick
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (day: number) =>
    parsed != null && parsed.y === viewYear && parsed.m - 1 === viewMonth && parsed.d === day;

  return (
    <div className="relative">
      <div className="flex">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="MM/DD/YYYY"
          value={display}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleType(e.target.value)}
          className={inputClass + ' rounded-r-none'}
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg rounded-l-none border border-l-0 border-gray-300 px-3 text-gray-600 hover:bg-gray-50 hover:text-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={prevMonth}
              className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
            >
              &#8592;
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={nextMonth}
              className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
            >
              &#8594;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`h-${i}`} className="py-1 text-xs font-medium text-gray-400">
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <div key={`e-${i}`} />
              ) : (
                <button
                  key={`d-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={
                    'rounded py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 ' +
                    (isSelected(day)
                      ? 'bg-blue-700 text-white'
                      : 'text-gray-900 hover:bg-blue-50 hover:text-blue-700')
                  }
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIntro({ children }: { children: ReactNode }) {
  return <p className="text-lg text-gray-800 leading-relaxed">{children}</p>;
}

// --- Step 2: Tenants --------------------------------------------------------

function TenantsStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  // tenantNames is always seeded (>=1 row) by createFlowState.
  const names = data.tenantNames;
  const setName = (i: number, value: string) => {
    update((d) => ({
      tenantNames: d.tenantNames.map((n, idx) => (idx === i ? value : n)),
    }));
  };
  const addRow = () => update((d) => ({ tenantNames: [...d.tenantNames, ''] }));
  const removeRow = (i: number) =>
    update((d) => ({ tenantNames: d.tenantNames.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <StepIntro>
        Who is the notice directed to? List every adult tenant named on the
        lease. The notice must name each tenant you intend to hold responsible.
      </StepIntro>
      <div className="space-y-3">
        {names.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(i, e.target.value)}
              placeholder={`Tenant ${i + 1} full name`}
              className={inputClass}
            />
            {names.length > 1 && (
              <button
                onClick={() => removeRow(i)}
                className="px-3 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label={`Remove tenant ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="text-blue-700 font-medium hover:text-blue-800 transition-colors"
      >
        + Add another tenant
      </button>
    </div>
  );
}

// --- Step 3: Amount owed ----------------------------------------------------

function AmountStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  // rentPeriods is always seeded (>=1 row) by createFlowState, so we read it
  // directly — no display-only fallback, no seeding effect. This removes the
  // state/display divergence that previously dropped an added row's start date.
  const periods = data.rentPeriods;

  const setPeriod = (i: number, patch: Partial<RentPeriod>) => {
    update((d) => ({
      rentPeriods: d.rentPeriods.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  };
  const addRow = () =>
    update((d) => ({
      rentPeriods: [...d.rentPeriods, { periodStartDate: '', periodEndDate: '', amount: 0 }],
    }));
  const removeRow = (i: number) =>
    update((d) => ({ rentPeriods: d.rentPeriods.filter((_, idx) => idx !== i) }));

  const total = periods.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <StepIntro>
        What rent is past due? Enter each rent period the tenant owes. Include
        only <strong>base rent</strong> — not late fees, utilities, or other
        charges.
      </StepIntro>

      <div className="space-y-4">
        {periods.map((p, i) => (
          <div key={i} className="rounded-lg border border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Rent period {i + 1}
              </span>
              {periods.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  className="text-gray-500 hover:text-gray-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor={`start-${i}`}>Period start</FieldLabel>
                <DateField
                  id={`start-${i}`}
                  value={p.periodStartDate}
                  onChange={(v) => setPeriod(i, { periodStartDate: v })}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`end-${i}`}>Period end</FieldLabel>
                <DateField
                  id={`end-${i}`}
                  value={p.periodEndDate}
                  onChange={(v) => setPeriod(i, { periodEndDate: v })}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`amt-${i}`}>Base rent ($)</FieldLabel>
                <input
                  id={`amt-${i}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.amount === 0 ? '' : p.amount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPeriod(i, { amount: Number(e.target.value) })
                  }
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className="text-blue-700 font-medium hover:text-blue-800 transition-colors"
      >
        + Add another rent period
      </button>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-sm font-semibold text-gray-700">Total demanded</span>
        <span className="text-lg font-bold text-gray-900">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.baseRentOnlyConfirmed === true}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ baseRentOnlyConfirmed: e.target.checked })
          }
          className="mt-1"
        />
        <span className="text-sm text-gray-800 leading-relaxed">
          I confirm this amount is <strong>base rent only</strong> — it does not
          include late fees, utilities, or other charges. (California law
          requires a 3-day notice to demand only rent.)
        </span>
      </label>
    </div>
  );
}

// --- Step 4: Payment instructions -------------------------------------------

const PAYMENT_LABELS: Record<PaymentMethodKind, string> = {
  in_person: 'In person',
  mail: 'By mail',
  bank_deposit: 'Bank deposit',
  eft: 'Electronic funds transfer (EFT)',
  cash: 'Cash',
};

function PaymentStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const methods = data.paymentMethods;
  const has = (kind: PaymentMethodKind) => methods.some((m) => m.kind === kind);
  const get = (kind: PaymentMethodKind) => methods.find((m) => m.kind === kind);

  const toggle = (kind: PaymentMethodKind) => {
    if (has(kind)) {
      update({ paymentMethods: methods.filter((m) => m.kind !== kind) });
    } else {
      update({ paymentMethods: [...methods, { kind } as PaymentMethod] });
    }
  };
  const patchMethod = (kind: PaymentMethodKind, patch: Record<string, unknown>) => {
    update({
      paymentMethods: methods.map((m) =>
        m.kind === kind ? ({ ...m, ...patch } as PaymentMethod) : m,
      ),
    });
  };

  return (
    <div className="space-y-6">
      <StepIntro>
        How can the tenant pay? California law requires offering at least one
        method that is <strong>not cash and not electronic</strong> (for
        example, a check or money order in person or by mail). The detailed
        rules are checked at the Review step.
      </StepIntro>

      <div className="space-y-3">
        {(Object.keys(PAYMENT_LABELS) as PaymentMethodKind[]).map((kind) => {
          const selected = has(kind);
          const m = get(kind);
          return (
            <div
              key={kind}
              className={`rounded-lg border px-4 py-3 ${
                selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={selected} onChange={() => toggle(kind)} />
                <span className="font-medium text-gray-900">{PAYMENT_LABELS[kind]}</span>
              </label>

              {selected && m?.kind === 'in_person' && (
                <input
                  type="text"
                  value={m.daysHours ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    patchMethod('in_person', { daysHours: e.target.value })
                  }
                  placeholder="Days & hours available (e.g. Mon–Fri 9am–5pm)"
                  className={`${inputClass} mt-3`}
                />
              )}
              {selected && m?.kind === 'mail' && (
                <input
                  type="text"
                  value={m.mailAddress ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    patchMethod('mail', { mailAddress: e.target.value })
                  }
                  placeholder="Mailing address for payment"
                  className={`${inputClass} mt-3`}
                />
              )}
              {selected && m?.kind === 'bank_deposit' && (
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={m.bankName ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      patchMethod('bank_deposit', { bankName: e.target.value })
                    }
                    placeholder="Bank name"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={m.branchAddress ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      patchMethod('bank_deposit', { branchAddress: e.target.value })
                    }
                    placeholder="Branch street address"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={m.accountNumber ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      patchMethod('bank_deposit', { accountNumber: e.target.value })
                    }
                    placeholder="Account number"
                    className={inputClass}
                  />
                  <label className="flex items-start gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={m.within5MilesConfirmed === true}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        patchMethod('bank_deposit', { within5MilesConfirmed: e.target.checked })
                      }
                      className="mt-1"
                    />
                    <span>I confirm this branch is within five miles of the rental property.</span>
                  </label>
                </div>
              )}
              {selected && m?.kind === 'eft' && (
                <label className="flex items-start gap-2 text-sm text-gray-800 mt-3">
                  <input
                    type="checkbox"
                    checked={m.previouslyEstablishedConfirmed === true}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      patchMethod('eft', { previouslyEstablishedConfirmed: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <span>
                    I confirm an EFT procedure was previously established with this tenant.
                  </span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Step 5: Landlord / agent info ------------------------------------------

const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  owner: 'The property owner',
  authorized_agent_broker: 'A licensed broker / property manager',
  other_authorized_agent: 'Another authorized agent',
};

const SERVICE_METHOD_LABELS: Record<ServiceMethod, string> = {
  personal: 'In person (personal service)',
  substituted: 'Substituted service (someone else at the property)',
  post_and_mail: 'Post and mail (posted at property + mailed)',
};

function LandlordStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  return (
    <div className="space-y-6">
      <StepIntro>
        Who is signing and serving the notice, and when?
      </StepIntro>

      <div>
        <FieldLabel htmlFor="signerName">Signer&apos;s full name</FieldLabel>
        <input
          id="signerName"
          type="text"
          value={data.signerName ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => update({ signerName: e.target.value })}
          placeholder="Full legal name of the person signing"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel htmlFor="signerRole">Who is signing?</FieldLabel>
        <div className="space-y-2">
          {(Object.keys(SIGNER_ROLE_LABELS) as SignerRole[]).map((role) => (
            <label
              key={role}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                data.signerRole === role ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="signerRole"
                checked={data.signerRole === role}
                onChange={() => update({ signerRole: role })}
              />
              <span className="text-gray-900">{SIGNER_ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      </div>

      {data.signerRole && data.signerRole !== 'owner' && (
        <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.authorityEvidenceOnFile === true}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update({ authorityEvidenceOnFile: e.target.checked })
            }
            className="mt-1"
          />
          <span className="text-sm text-amber-900 leading-relaxed">
            I confirm written authority to sign on the owner&apos;s behalf (a
            property management agreement or written authorization) is on file.
          </span>
        </label>
      )}

      <div>
        <FieldLabel htmlFor="serviceDate">Intended service date</FieldLabel>
        <DateField
          id="serviceDate"
          value={data.serviceDate ?? ''}
          onChange={(v) => update({ serviceDate: v })}
        />
      </div>

      <div>
        <FieldLabel htmlFor="serviceMethod">How will the notice be served?</FieldLabel>
        <div className="space-y-2">
          {(Object.keys(SERVICE_METHOD_LABELS) as ServiceMethod[]).map((method) => (
            <label
              key={method}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                data.serviceMethod === method ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="serviceMethod"
                checked={data.serviceMethod === method}
                onChange={() => update({ serviceMethod: method })}
              />
              <span className="text-gray-900">{SERVICE_METHOD_LABELS[method]}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Step 6: Review ---------------------------------------------------------

function ReviewStep({ data }: { data: NoticeFlowData }) {
  const result = evaluateCanProduce(data);

  return (
    <div className="space-y-6">
      <StepIntro>
        Last check before producing the notice. Everything below must be clear.
      </StepIntro>

      {result.canProduce ? (
        <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-4">
          <p className="font-semibold text-green-900 mb-1">Ready to produce.</p>
          <p className="text-sm text-green-900 leading-relaxed">
            All requirements are met.
            {result.computedDates && (
              <>
                {' '}The tenant will have until{' '}
                <strong>{result.computedDates.expirationDate}</strong> to pay or
                vacate (period begins {result.computedDates.commencementDate}).
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="font-semibold text-amber-900 mb-2">
            Not ready yet — {result.blockers.length}{' '}
            {result.blockers.length === 1 ? 'item needs' : 'items need'} attention:
          </p>
          <ul className="space-y-1 text-sm text-amber-900 list-disc pl-5">
            {result.blockers.map((b) => (
              <li key={b.code}>{b.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Step 7: Service instructions (terminal placeholder for this slice) -----

function ServiceStep() {
  return (
    <div className="space-y-4">
      <StepIntro>
        Serving the notice correctly is as important as preparing it. Detailed
        service and proof-of-service guidance is the next piece we&apos;re
        building.
      </StepIntro>
      <p className="text-sm text-gray-500 leading-relaxed">
        (This step will cover how to serve, recording proof of service, and any
        local filing obligations.)
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
