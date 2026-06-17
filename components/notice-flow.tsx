'use client';

import { useState, useEffect, useRef, useContext, createContext, Fragment, type ChangeEvent, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  createFlowState,
  FlowStep,
  NoticeFlowState,
  NoticeFlowData,
  DisputeAnswer,
  RentPeriod,
  SignerCapacity,
  EntityType,
  PaymentBranch,
  LandlordContact,
  ServiceAttempt,
  LlcManagementType,
} from '@/lib/flow/noticeFlowState';
import {
  LLC_MGMT_FIELD_LABEL,
  LLC_MGMT_FIELD_HELPER,
  LLC_MGMT_OPTIONS,
  LLC_NOT_SURE_BANNER,
  LLC_MANAGER_WARNING_BANNER,
  shouldShowSignerAuthorityWarning,
  LLC_NOT_SURE_BANNER_TITLE,
  LLC_MANAGER_WARNING_BANNER_TITLE,
} from '@/lib/flow/llcCopy';
import { validateStep } from '@/lib/flow/advancement';
import { saveDraft, loadDraft, clearDraft } from '@/lib/flow/persistence';
import { evaluateCanProduceV4 } from '@/lib/flow/gates';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import {
  validateSigningDate,
  getSuccessfulAttempt,
  captureProductionSnapshot,
  evaluateStaleness,
} from '@/lib/flow/escalation';
import { renderNotice, NoticeRenderError, formatNoticeDate, derivePayeeName } from '@/lib/produce/renderNotice';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import { buildNoticeDocumentHtml } from '@/lib/produce/buildNoticeHtml';
import { PacketPrintOptions } from './packet-print-options';
import { NoticeSummaryPanel } from './notice-summary-panel';
import { PropertyAddressAutocomplete } from './places-autocomplete';
import {
  computeCompliancePeriod,
  type ServiceMethod,
  type CompliancePeriodResult,
} from '@/lib/dates/computeCompliancePeriod';

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

/**
 * The flow is presented as five PAGES, each grouping one or more underlying
 * FlowSteps. Field validation still lives per-step in advancement.ts
 * (validateStep); a page is advanceable only when every step it contains is.
 * The dispute hard-block is its own page (page 1), so the attorney handoff
 * fires before any data is collected.
 */
const PAGES: { label: string; subhead?: string; steps: FlowStep[] }[] = [
  {
    label: 'Quick Safety Check',
    subhead:
      'A few quick questions to confirm a routine 3-day notice is the right tool for this situation. If anything here applies, the routine workflow pauses and we point you to a better next step.',
    steps: [FlowStep.PreflightDispute],
  },
  {
    label: 'Property & Tenant',
    steps: [
      FlowStep.PropertyIdentification,
      FlowStep.Tenants,
    ],
  },
  {
    label: 'Rent Owed',
    steps: [FlowStep.AmountOwed],
  },
  {
    label: 'Landlord & Payment',
    subhead: 'Who the notice is from and where rent can be paid.',
    steps: [
      FlowStep.LandlordIdentity,
      FlowStep.PaymentInstructions,
    ],
  },
  {
    label: 'Signer, Dates & Review',
    steps: [
      FlowStep.LandlordAgentInfo,
      FlowStep.Review,
    ],
  },
];

/** Required-field marker. */
function Req() {
  return (
    <span className="text-red-600" aria-hidden="true">
      {' '}*
    </span>
  );
}

function renderStepBody(
  step: FlowStep,
  data: NoticeFlowData,
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void,
  goToPage?: (pageIndex: number) => void,
): ReactNode {
  switch (step) {
    case FlowStep.PreflightDispute:
      return <DisputeStep data={data} update={update} />;
    case FlowStep.PropertyIdentification:
      return <PropertyStep data={data} update={update} />;
    case FlowStep.Tenants:
      return <TenantsStep data={data} update={update} />;
    case FlowStep.LandlordIdentity:
      return <LandlordIdentityStep data={data} update={update} />;
    case FlowStep.AmountOwed:
      return <AmountStep data={data} update={update} />;
    case FlowStep.PaymentInstructions:
      return <PaymentStep data={data} update={update} />;
    case FlowStep.LandlordAgentInfo:
      return <LandlordStep data={data} update={update} />;
    case FlowStep.Review:
      return <ReviewStep data={data} update={update} goToPage={goToPage} />;
    default:
      return null;
  }
}

export function NoticeFlow() {
  const [state, setState] = useState<NoticeFlowState>(createFlowState);
  const [pageIndex, setPageIndex] = useState(0);
  const [showIssues, setShowIssues] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  // C5 soft mode: the safety-override confirmation modal.
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  // Hard mode: lets the user escape the attorney handoff to edit Step 1.

  // R2a draft persistence. Restore runs in a mount effect (not a lazy
  // initializer) so server HTML and the client's first paint agree; the
  // banner and any restored values appear in the post-hydration render.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setState((s) => ({ ...s, data: draft.data }));
      setPageIndex(Math.max(0, Math.min(draft.pageIndex, PAGES.length - 1)));
      setDraftRestored(true);
    }
    hydratedRef.current = true;
  }, []);
  // Debounced autosave; the cleanup cancels superseded saves (including the
  // pristine pre-restore state on first mount).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveDraft(pageIndex, state.data), 500);
    return () => clearTimeout(t);
  }, [state.data, pageIndex]);

  const startOver = () => {
    clearDraft();
    setState(createFlowState());
    setPageIndex(0);
    setShowIssues(false);
    setDraftRestored(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  // Restored-draft toast auto-dismisses after 8s if the user doesn't act.
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => setDraftRestored(false), 8000);
    return () => clearTimeout(t);
  }, [draftRestored]);

  const update = (
    patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>),
  ) => {
    setState((s) => {
      const resolved = typeof patch === 'function' ? patch(s.data) : patch;
      return { ...s, data: { ...s.data, ...resolved } };
    });
    setShowIssues(false);
  };

  const page = PAGES[pageIndex];
  const totalPages = PAGES.length;

  // A page is advanceable only when every step it contains validates.
  const issues: string[] = [];
  for (const step of page.steps) {
    const v = validateStep(step, state.data);
    for (const it of v.issues) issues.push(it);
  }
  const canAdvance = issues.length === 0;

  // Is the current page the dispute screen with a flagged answer (yes/unknown)
  // and no override logged yet? If so, advancing routes through the
  // confirmation modal that logs the override.
  const disp = state.data.dispute;
  const disputeFlagged =
    page.steps.includes(FlowStep.PreflightDispute) &&
    [disp.tenantFiledComplaint, disp.tenantWrittenWithholding, disp.tenantBankruptcy].some(
      (a) => a === 'yes' || a === 'unknown',
    ) &&
    !state.data.safetyCheckOverride;
  const proceedThroughOverride = () => {
    const flaggedAnswers: { question: keyof typeof disp; answer: 'yes' | 'no' | 'unknown' }[] = [];
    (['tenantFiledComplaint', 'tenantWrittenWithholding', 'tenantBankruptcy'] as const).forEach(
      (q) => {
        const a = disp[q];
        if (a === 'yes' || a === 'unknown') flaggedAnswers.push({ question: q, answer: a });
      },
    );
    update({
      safetyCheckOverride: {
        flaggedAnswers,
        acceptedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        modalCopyVersion: 'v1',
        enhancedModalShown: disp.tenantBankruptcy === 'yes',
      },
    });
    setOverrideModalOpen(false);
    setPageIndex((i) => Math.min(i + 1, totalPages - 1));
    setShowIssues(false);
  };
  const onNext = () => {
    if (!canAdvance) {
      setShowIssues(true);
      return;
    }
    if (disputeFlagged) {
      setOverrideModalOpen(true);
      return;
    }
    setPageIndex((i) => Math.min(i + 1, totalPages - 1));
    setShowIssues(false);
  };

  const onBack = () => {
    setPageIndex((i) => Math.max(i - 1, 0));
    setShowIssues(false);
  };

  // Jump directly to a page (used by the Review blockers' "Go to this"
  // buttons). Clamped; scrolls to the top so the landed page reads from
  // its heading.
  const goToPage = (i: number) => {
    setPageIndex(Math.max(0, Math.min(i, totalPages - 1)));
    setShowIssues(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Enter advances the flow, scoped to avoid hijacking other Enter behaviors:
  // - not on the last page (no forward action there),
  // - not when focus is on a <button> (dispute choices, calendar keep their own),
  // - not in a <textarea> (Enter is a newline there).
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    if (pageIndex >= totalPages - 1) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'TEXTAREA') return;
    e.preventDefault();
    onNext();
  };

  return (
    <main className="min-h-screen bg-ivory">
      {overrideModalOpen && (
        <SafetyOverrideModal
          bankruptcy={disp.tenantBankruptcy === 'yes'}
          onPause={() => setOverrideModalOpen(false)}
          onProceed={proceedThroughOverride}
        />
      )}
      <div className="mx-auto flex max-w-6xl items-start gap-10 px-6 py-12 md:py-16">
      <article className="mx-auto w-full max-w-2xl lg:mx-0" onKeyDown={onKeyDown}>
        {/* Progress eyebrow */}
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gold mb-3">
            3-Day Notice to Pay Rent or Quit
          </p>
          <div className="flex items-center gap-2 mb-4" aria-hidden>
            {PAGES.map((p, i) => (
              <div
                key={p.label}
                className={`h-1 flex-1 rounded-full ${
                  i <= pageIndex ? 'bg-brand' : 'bg-rule'
                }`}
              />
            ))}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight">
            {page.label}
          </h1>
          {page.subhead && (
            <p className="text-base text-gray-600 leading-relaxed mt-2">
              {page.subhead}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Step {pageIndex + 1} of {totalPages}
          </p>
          {!page.steps.includes(FlowStep.PreflightDispute) && (
            <p className="text-sm text-gray-500 mt-1">
              Fields marked <span className="text-red-600">*</span> are required.
            </p>
          )}
        </header>

        {/* R2a: draft restored from this browser's localStorage. Toast. */}
        {draftRestored && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-3 shadow-lg sm:w-auto"
          >
            <p className="text-sm text-gray-700">
              We restored your in-progress notice from this browser.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={startOver}
                className="text-sm font-medium text-brand hover:underline"
              >
                Start over
              </button>
              <button
                onClick={() => setDraftRestored(false)}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* Step body — every step in the current page, divided */}
        <section className="mb-10">
          {/* Slice C1a: Step-4 sections share one accordion (one open at a
              time on mobile). Provider is inert on pages with no
              CollapsibleSection. defaultOpenId opens the first payment
              section; 4A (LandlordIdentityStep) joins the same provider in C1b. */}
          <AccordionProvider defaultOpenId="landlord_4a">
          {page.steps.map((step, idx) => (
            <div
              key={step}
              className={
                idx > 0
                  ? page.steps.includes(FlowStep.PaymentInstructions)
                    ? 'mt-8'
                    : 'pt-4 mt-4 border-t border-gray-200'
                  : ''
              }
            >
              {renderStepBody(step, state.data, update, goToPage)}
            </div>
          ))}
          </AccordionProvider>
        </section>

        {/* Validation issues */}
        {showIssues && issues.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <ul className="space-y-1 text-sm text-amber-900">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <button
            onClick={onBack}
            disabled={pageIndex === 0}
            className="text-gray-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          {pageIndex < totalPages - 1 && (
            <button
              onClick={onNext}
              className="inline-flex items-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-bar transition-colors"
            >
              Continue →
            </button>
          )}
        </div>

        {/* Persistent disclaimer (matches our-approach footer tone) */}
        <footer className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
          </p>
        </footer>
      </article>
      <aside className="hidden w-80 shrink-0 lg:block">
        <div className="sticky top-8">
          <NoticeSummaryPanel data={state.data} />
        </div>
      </aside>
      </div>
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

  const flagged = [
    d.tenantFiledComplaint,
    d.tenantWrittenWithholding,
    d.tenantBankruptcy,
  ].some((a) => a === 'yes' || a === 'unknown');
  return (
    <div className="space-y-4">

      <TriQuestion
        question="Has the tenant filed a court case, complaint with a fair housing agency, or code-enforcement complaint that names you or this rental property?"
        value={d.tenantFiledComplaint}
        onChange={(v) => set('tenantFiledComplaint', v)}
        suppressNote
        unknownNote={{
          tone: 'proceed',
          body: 'You can continue without confirming this — a tenant complaint doesn’t by itself prevent a routine 3-day notice. We’ll note on the record that it wasn’t confirmed. If you can, it’s still worth checking.',
        }}
      />
      <TriQuestion
        question="Has the tenant given you anything in writing saying they are withholding rent because of repair problems, habitability issues, or another dispute?"
        value={d.tenantWrittenWithholding}
        onChange={(v) => set('tenantWrittenWithholding', v)}
        suppressNote
        unknownNote={{
          tone: 'block',
          body: 'Please confirm this before serving. A written habitability or repair dispute can become a defense to an eviction, so this one needs a clear Yes or No. Check your messages and notices from the tenant, then come back.',
        }}
      />
      <TriQuestion
        question="Has the tenant filed for bankruptcy, or told you they are about to?"
        value={d.tenantBankruptcy}
        onChange={(v) => set('tenantBankruptcy', v)}
        suppressNote
        unknownNote={{ tone: 'bankruptcy' }}
      />
      {flagged && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 space-y-3">
          <p className="text-sm text-amber-900 leading-relaxed">
            Pause here. This situation may include facts that change how a 3-day notice should be handled, or whether one should be used at all. The OwnerPilot routine workflow assumes a straightforward nonpayment situation with no active disputes or complaints. We recommend talking to a California licensed attorney before producing this notice. You can save your progress and come back.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/"
              className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              Save and exit
            </a>
            <a
              href="/notice/3-day/options"
              className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              Talk to me about my options
            </a>
          </div>
        </div>
      )}
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
  suppressNote = false,
}: {
  question: string;
  value: DisputeAnswer | undefined;
  onChange: (v: DisputeAnswer) => void;
  unknownNote: UnknownNote;
  suppressNote?: boolean;
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
    <div className="rounded-lg border border-gray-200 px-5 py-3">
      <p className="text-gray-900 mb-2 leading-relaxed">{question}</p>
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
      {value === 'unknown' && !suppressNote && (
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
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-900 leading-relaxed">
          This workflow produces a 3-day notice for nonpayment of rent only. It
          is not the right tool for lease violations, nuisance, or
          month-to-month terminations.
        </p>
      </div>
      <SectionHeader
        title="The property"
        subhead="Where is the rental unit located?"
      />
      <LearnMore>
        Where is the rental property? This determines which local rules apply.
      </LearnMore>
      <div>
        <label
          htmlFor="propertyAddress"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Property street address<Req />
        </label>
        <PropertyAddressAutocomplete
          id="propertyAddress"
          value={data.propertyAddress ?? ''}
          onChange={(v) => update({ propertyAddress: v })}
          placeholder="123 Main St, City, CA 90000"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-2">
          Note: properties in the City of Los Angeles and several other cities
          have additional local requirements. OwnerPilot will tell you if your
          property needs steps it doesn&apos;t yet fully support.
        </p>
      </div>
      <div>
        <label
          htmlFor="propertyUnit"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Unit if applicable
        </label>
        <input
          id="propertyUnit"
          type="text"
          value={data.propertyUnit ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ propertyUnit: e.target.value })
          }
          placeholder="Apt 4, Unit B, Suite 200"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-2">
          If your property has a unit number, apartment letter, or suite
          designation, enter it here.
        </p>
      </div>
    </div>
  );
}

// --- Shared field helpers ---------------------------------------------------

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-2">
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none';

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
  // Sync display when `value` changes EXTERNALLY (e.g. the parent calls a
  // resetForm that sets value back to ''). Without this, display keeps showing
  // a stale date after a reset while the parent state is already empty - a
  // phantom that makes validators see no date. Mid-typing partials (value ''
  // while display has fewer than 8 digits) are left untouched so we don't
  // clobber in-progress entry.
  useEffect(() => {
    const valueDisplay = isoToDisplay(value);
    if (value && valueDisplay && valueDisplay !== display) {
      setDisplay(valueDisplay);
      return;
    }
    if (!value) {
      const digits = display.replace(/\D/g, '');
      if (digits.length === 8) setDisplay('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
          className="rounded-lg rounded-l-none border border-l-0 border-gray-300 bg-white px-3 text-gray-600 shadow-sm hover:bg-tint hover:text-brand focus:border-brand focus:ring-1 focus:ring-brand outline-none"
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
// Section header + one-line subhead. Used to group Step 2 into named sections
// (JT spec, 2026-06-13). Presentation only.
function SectionHeader({ title, subhead }: { title: string; subhead: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-serif text-xl font-bold text-brand leading-tight">{title}</h2>
      <p className="text-sm text-gray-600 leading-relaxed">{subhead}</p>
    </div>
  );
}

// Slice C1a: strict one-open-at-a-time accordion for the Step-4 progressive
// disclosure. The provider holds the single open section id; CollapsibleSection
// reads it. On mobile only one body is shown (the open id); tapping a header
// opens it and collapses the rest. On desktop (lg+) every body is shown via
// lg:block and the chevron is hidden, so sections read as stacked cards.
const AccordionContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
}>({ openId: null, setOpenId: () => {} });

function AccordionProvider({
  defaultOpenId = null,
  children,
}: {
  defaultOpenId?: string | null;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);
  return (
    <AccordionContext.Provider value={{ openId, setOpenId }}>
      {children}
    </AccordionContext.Provider>
  );
}

function CollapsibleSection({
  id,
  title,
  subhead,
  required = false,
  children,
}: {
  id: string;
  title: string;
  subhead?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const { openId, setOpenId } = useContext(AccordionContext);
  const open = openId === id;
  return (
    <section className="rounded-lg border border-rule bg-white">
      <button
        type="button"
        onClick={() => setOpenId(open ? null : id)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:cursor-default"
      >
        <span className="font-serif text-xl font-bold text-brand leading-tight">
          {title}
          {required && <Req />}
        </span>
        <svg
          className={`lg:hidden h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.73a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div className={`px-4 pb-4 ${open ? 'block' : 'hidden lg:block'}`}>
        {subhead && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{subhead}</p>
        )}
        {children}
      </div>
    </section>
  );
}
// Collapsible "Learn more" disclosure. Native details/summary - accessible,
// no JS, no dependency. Holds the longer explanatory paragraphs that used to
// be always-visible body text.
function LearnMore({ children }: { children: ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
        <span className="group-open:hidden">Learn more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      <div className="mt-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </details>
  );
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
      <SectionHeader
        title="Tenants on the notice"
        subhead="List every adult tenant named on the lease."
      />
      <LearnMore>
        Who is the notice directed to? List every adult tenant named on the
        lease. The notice must name each tenant you intend to hold responsible.
      </LearnMore>
      <div className="space-y-3">
        <span className="block text-sm font-semibold text-gray-700">
          Tenant name(s)<Req />
        </span>
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
      <SectionHeader
        title="What rent is past due."
        subhead="Enter each rent period the tenant owes."
      />
      <p className="text-sm text-gray-700 leading-relaxed">
        Enter base rent only — not late fees, utilities, or other charges.
        California law requires this notice to demand only rent.
      </p>

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
                <FieldLabel htmlFor={`start-${i}`}>Period start<Req /></FieldLabel>
                <DateField
                  id={`start-${i}`}
                  value={p.periodStartDate}
                  onChange={(v) => setPeriod(i, { periodStartDate: v })}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`end-${i}`}>Period end<Req /></FieldLabel>
                <DateField
                  id={`end-${i}`}
                  value={p.periodEndDate}
                  onChange={(v) => setPeriod(i, { periodEndDate: v })}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`amt-${i}`}>Base rent ($)<Req /></FieldLabel>
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

      {/* Step 3 base-rent-only confirmation. Label is broker-supplied
          (redesign 2026-06-16), wired verbatim — [LOCKED — broker-supplied].
          Reuses the existing baseRentOnlyConfirmed field and gates Step-3
          advancement (advancement.ts). The C6 combined produce-gate
          attestation (produceAttestationConfirmed) is unchanged and still
          binds at produce; the two coexist by design. */}
      <label className="flex items-start gap-3 rounded-lg border border-rule bg-white px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.baseRentOnlyConfirmed === true}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ baseRentOnlyConfirmed: e.target.checked })
          }
          className="mt-1"
        />
        <span className="text-sm text-gray-800 leading-relaxed">
          I confirm this is base rent only &mdash; no late fees, utilities,
          damages, repair costs, or other charges.
        </span>
      </label>

    </div>
  );
}

// --- Step 4: Payment instructions (v4: § 1161(2) payee + payment branch) ----

const PAYMENT_BRANCH_LABELS: Record<PaymentBranch, string> = {
  mail_only: 'By mail only',
  in_person_and_mail: 'In person and by mail',
  bank_deposit: 'By deposit at a financial institution',
};

const PAYMENT_BRANCH_HELP: Record<PaymentBranch, string> = {
  mail_only: 'The tenant mails payment to the address above.',
  in_person_and_mail: 'The tenant may hand-deliver during set hours, or mail it.',
  bank_deposit: 'The tenant deposits a check or money order at a bank branch.',
};

// Attorney-locked operator copy for the Step-4 non-landlord payee override
// (Defect #2 cutover; ruling 2026-06-05 §3.1/§3.2/§3.3). Build VERBATIM; any
// wording change requires a one-line note to the attorney, not an edit.
const PAYEE_OVERRIDE_CHECKBOX_LABEL =
  'Rent is paid to someone other than the landlord (e.g., a property manager or agent).';
const PAYEE_OVERRIDE_CHECKED_HELPER =
  'Enter the name of the person or company that receives rent. The notice will show that they are acting as agent for the landlord identified on Step 3.';
const PAYEE_OVERRIDE_UNCHECKED_HELPER =
  'Leave this unchecked if rent is paid directly to the landlord. The payee name on the notice will match the landlord identified on Step 3.';

// Attorney-locked operator copy (Part E ruling, 2026-06-04). Build verbatim; any
// change requires a fresh short note. This is NOT one of the thirteen face-copy
// prose constants — it's a separate operator-copy lock for this surface. The
// rendered text is exactly:
//   "Heads up:" + BODY_1 + BOLD + BODY_2
const BANK_INTERSTITIAL_BODY_1 =
  ' State law requires the full account number to appear on a three-day notice ' +
  'that designates a bank for payment (Cal. Code Civ. Proc. § 1161(2)). Once the ' +
  'notice is served, it commonly ends up in tenant files, and if an unlawful ' +
  'detainer is filed it becomes part of the court record. We recommend using a ';
const BANK_INTERSTITIAL_BOLD = 'dedicated rent-collection account';
const BANK_INTERSTITIAL_BODY_2 =
  ' — not your main operating account — for the bank you list here.';

/**
 * Inline, dismissible callout shown at first entry of bank details in Step 4
 * (Part E ruling). The dismissal is sticky (stored in flow data), so it renders
 * once per bank entry and does NOT re-render on field edits or on leaving and
 * returning to Step 4 (the step remounts). A new notice shows it again. Not a
 * modal.
 */
function BankAccountInterstitial({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  if (data.bankInterstitialDismissed) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="leading-relaxed">
        <strong>Heads up:</strong>
        {BANK_INTERSTITIAL_BODY_1}
        <strong>{BANK_INTERSTITIAL_BOLD}</strong>
        {BANK_INTERSTITIAL_BODY_2}
      </p>
      <button
        type="button"
        onClick={() => update({ bankInterstitialDismissed: true })}
        className="mt-0.5 shrink-0 text-xs font-semibold text-amber-800 underline"
      >
        Got it
      </button>
    </div>
  );
}

/**
 * The two § 1161(2) bank-deposit attestations (paper-instrument + within-five-miles).
 * Single source of truth so the labels render identically on both the payment step
 * and the Review step. Writes the same flow-data fields from either surface; the
 * produce gate (evaluateCanProduceV4) reads those fields, so checking them anywhere
 * clears the corresponding blockers. Labels are attorney-approved attestation copy —
 * render verbatim; changes require a fresh note.
 */
function BankDepositAttestations({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  return (
    <>
      <label className="flex items-start gap-3 rounded-lg border border-rule bg-white px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.bankDepositPaperInstrumentConfirmed === true}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ bankDepositPaperInstrumentConfirmed: e.target.checked })
          }
          className="mt-1"
        />
        <span className="text-sm text-gray-800 leading-relaxed">
          I confirm payment is made by <strong>check, money order, or
          cashier&apos;s check</strong> deposited to the account (not cash).
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.bankBranchWithinFiveMilesAttested === true}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update({ bankBranchWithinFiveMilesAttested: e.target.checked })
          }
          className="mt-1"
        />
        <span className="text-sm text-amber-900 leading-relaxed">
          I confirm this branch is <strong>within five miles</strong> of the
          rental property (required by Cal. Code Civ. Proc. &sect; 1161(2)).
        </span>
      </label>
    </>
  );
}

function PaymentStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const c: LandlordContact = data.landlordContact ?? {};
  const setContact = (patch: Partial<LandlordContact>) =>
    update({ landlordContact: { ...c, ...patch } });
  const branch = data.paymentBranch;
  // Defect #2 cutover: the § 1161(2) payee NAME is derived from the Step-3
  // landlord identity (or the non-landlord override), never typed here.
  const derivedPayee = derivePayeeName(data);

  // Mirror the owner mailing address into the payee street address until the
  // user edits the payee street (broker direction 2026-06-16, superseding the
  // C7b explicit-click prefill). Debounced so a mailing address still being
  // typed does not flash partials; KEEPS FOLLOWING mailing changes (no
  // one-time lock — the prior version stuck on an early value). Stops once
  // data.payeeStreetUserEdited is set, which is persisted across navigation.
  const mailingForMirror = data.mailingAddress ?? '';
  useEffect(() => {
    if (data.payeeStreetUserEdited) return;
    if (!mailingForMirror) return;
    const t = setTimeout(() => {
      if (
        !data.payeeStreetUserEdited &&
        (data.landlordContact?.streetAddress ?? '') !== mailingForMirror
      ) {
        update({
          landlordContact: {
            ...(data.landlordContact ?? {}),
            streetAddress: mailingForMirror,
          },
        });
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailingForMirror, data.payeeStreetUserEdited]);

  return (
    <div className="space-y-8">
      {/* Section 1 (4B) — person to receive payment (§ 1161(2) name/phone/address) */}
      <CollapsibleSection
        id="payment_4b"
        title="Where rent is paid"
        subhead="California law requires the notice to name a person, a telephone number, and a street address."
      >
      <div className="space-y-4">
        <LearnMore>
          California law requires the notice to name the person to receive
          payment, with a telephone number and a street address. This can be the
          owner or an agent, and need not be the same person who signs.
        </LearnMore>

        <div>
          <FieldLabel htmlFor="payeeName">Name to receive payment<Req /></FieldLabel>
          <input
            id="payeeName"
            type="text"
            value={derivedPayee.name}
            readOnly
            placeholder="Set from the landlord identified on Step 3"
            className={`${inputClass} !bg-tint text-gray-700`}
          />

          <label className="mt-3 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.payeeIsNonLandlord === true}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update({ payeeIsNonLandlord: e.target.checked })
              }
              className="mt-1"
            />
            <span className="text-sm text-gray-800 leading-relaxed">
              {PAYEE_OVERRIDE_CHECKBOX_LABEL}
            </span>
          </label>

          {data.payeeIsNonLandlord ? (
            <div className="mt-3">
              <input
                id="payeeOverrideName"
                type="text"
                value={data.payeeOverrideName ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  update({ payeeOverrideName: e.target.value })
                }
                placeholder="Name of the person or company that receives rent"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                {PAYEE_OVERRIDE_CHECKED_HELPER}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {PAYEE_OVERRIDE_UNCHECKED_HELPER}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="payeePhone">Telephone<Req /></FieldLabel>
          <input
            id="payeePhone"
            type="tel"
            value={c.phone ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setContact({ phone: e.target.value })}
            placeholder="(555) 555-5555"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel htmlFor="payeeAddress">Street address to receive payment<Req /></FieldLabel>
          {/* C7b (det. 2026-06-14, item 3): explicit, non-destructive prefill
              from the owner mailing address. Shown only when a mailing address
              exists and the payee street is still empty; the click writes the
              real value (displayed == stored). */}
          {data.mailingAddress && !(c.streetAddress ?? '').trim() && (
            <button
              type="button"
              onClick={() => setContact({ streetAddress: data.mailingAddress })}
              className="mb-2 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Same as mailing address
            </button>
          )}
          <PropertyAddressAutocomplete
            id="payeeAddress"
            value={c.streetAddress ?? ''}
            onChange={(v) =>
              update({
                landlordContact: { ...c, streetAddress: v },
                payeeStreetUserEdited: true,
              })
            }
            placeholder="123 Main St, City, CA 90000"
            className={inputClass}
          />
        </div>
      </div>
      </CollapsibleSection>

      {/* Section 2 (4C) — how rent may be paid (single branch) */}
      <CollapsibleSection id="payment_4c" title="How may rent be paid?" required>
      <div className="space-y-3">
        {(Object.keys(PAYMENT_BRANCH_LABELS) as PaymentBranch[]).map((b) => (
          <Fragment key={b}>
            <label
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                branch === b ? 'border-brand bg-tint' : 'border-rule bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentBranch"
                checked={branch === b}
                onChange={() => update({ paymentBranch: b })}
                className="mt-1"
              />
              <span>
                <span className="block text-gray-900 font-medium">{PAYMENT_BRANCH_LABELS[b]}</span>
                <span className="block text-sm text-gray-500">{PAYMENT_BRANCH_HELP[b]}</span>
              </span>
            </label>

            {branch === b && b === 'in_person_and_mail' && (
              <div className="rounded-lg border border-gray-200 px-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="pdDays">Days personal delivery is available<Req /></FieldLabel>
                    <input
                      id="pdDays"
                      type="text"
                      value={data.personalDeliveryDays ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        update({ personalDeliveryDays: e.target.value })
                      }
                      placeholder="Monday through Friday"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="pdHours">Hours personal delivery is available<Req /></FieldLabel>
                    <input
                      id="pdHours"
                      type="text"
                      value={data.personalDeliveryHours ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        update({ personalDeliveryHours: e.target.value })
                      }
                      placeholder="9:00 a.m. to 5:00 p.m."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {branch === b && b === 'bank_deposit' && (
              <div className="space-y-3 rounded-lg border border-gray-200 px-4 py-4">
                <BankAccountInterstitial data={data} update={update} />
                <div>
                  <FieldLabel htmlFor="bankName">Bank name<Req /></FieldLabel>
                  <input
                    id="bankName"
                    type="text"
                    value={data.bankName ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => update({ bankName: e.target.value })}
                    placeholder="Bank name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bankBranch">Branch street address<Req /></FieldLabel>
                  <PropertyAddressAutocomplete
                    id="bankBranch"
                    value={data.bankBranchAddress ?? ''}
                    onChange={(v) => update({ bankBranchAddress: v })}
                    placeholder="Branch street address"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bankAcct">Account number<Req /></FieldLabel>
                  <input
                    id="bankAcct"
                    type="text"
                    value={data.bankAccountNumber ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      update({ bankAccountNumber: e.target.value })
                    }
                    placeholder="Account number"
                    className={inputClass}
                  />
                </div>
                <BankDepositAttestations data={data} update={update} />
              </div>
            )}
          </Fragment>
        ))}
        {/* C2a: EFT election (add-on only) lives under a "More payment
            options" disclosure so the primary methods read cleanly. The EFT
            label and the locked "previously established" attestation are
            unchanged — only wrapped. */}
        <details className="group rounded-lg border border-rule bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-brand">
            <span>
              More payment options
              {data.eftElectionAvailable === true && (
                <span className="font-normal text-gray-500"> &middot; EFT enabled</span>
              )}
            </span>
            <svg
              className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.73a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="space-y-3 px-4 pb-4">
        <label className="flex items-start gap-3 rounded-lg border border-rule bg-white px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.eftElectionAvailable === true}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update({ eftElectionAvailable: e.target.checked })
            }
            className="mt-1"
          />
          <span>
            <span className="block text-gray-900 font-medium">
              Also allow electronic funds transfer{' '}
              <span className="font-normal text-gray-500">(optional)</span>
            </span>
            <span className="block text-sm text-gray-500">
              Adds EFT as a payment option, in addition to the method above.
            </span>
          </span>
        </label>
        {data.eftElectionAvailable === true && (
          <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.eftPreviouslyEstablishedConfirmed === true}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update({ eftPreviouslyEstablishedConfirmed: e.target.checked })
              }
              className="mt-1"
            />
            <span className="text-sm text-amber-900 leading-relaxed">
              I confirm an EFT procedure was <strong>previously established</strong>
              {' '}with this tenant. (EFT may only be offered if it already exists.)
            </span>
          </label>
        )}
          </div>
        </details>
      </div>
      </CollapsibleSection>
    </div>
  );
}

// --- Step 5: Landlord / agent info ------------------------------------------

const LANDLORD_TYPE_LABELS: Record<'individual' | 'entity', { title: string; help: string }> = {
  individual: {
    title: 'An individual',
    help: 'One or more named people own the property.',
  },
  entity: {
    title: 'An entity',
    help: 'An LLC, corporation, partnership, or trust owns the property.',
  },
};

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  llc: 'LLC',
  corporation: 'Corporation',
  lp: 'Limited Partnership',
  gp: 'General Partnership',
  trust: 'Trust',
  other: 'Other',
};

// Signer-capacity options per branch (ruling §1.2). Individual insider = "owner";
// entity insider = "officer/member/trustee". Broker and other-agent appear in both.
const INDIVIDUAL_CAPACITY_LABELS: Record<'owner' | 'broker_or_manager' | 'authorized_agent', string> = {
  owner: 'The property owner',
  broker_or_manager: 'A licensed broker / property manager',
  authorized_agent: 'Another authorized agent',
};
const ENTITY_CAPACITY_LABELS: Record<
  'officer_member_trustee' | 'broker_or_manager' | 'authorized_agent',
  string
> = {
  officer_member_trustee: 'An officer, member, or trustee of the entity',
  broker_or_manager: 'A licensed broker or property manager retained by the entity',
  authorized_agent: 'Another authorized agent of the entity',
};

// Attorney-locked operator copy (Step-4 helper-disposition ruling §2). Build
// VERBATIM; rendered under the entity legal-name input on Step 3. Replaces the
// retired entity-not-supported interstitial now that entity production is
// open (Defect #3 countersign 2026-06-05).
const entityLegalNameHelper =
  `Enter the entity's full registered legal name as it appears on the deed or Secretary of State filing (e.g., 'PTAG Properties, LLC' — not 'PTAG Prop'). Using a shorthand or DBA on a three-day notice can be challenged in an unlawful-detainer action.`;

// Stage-1 toggle patch: set the landlord type (single source of truth) and mark
// it confirmed. Preserves any already-entered branch fields when re-selecting.
function setLandlordTypePatch(
  type: 'individual' | 'entity',
  data: NoticeFlowData,
): Partial<NoticeFlowData> {
  if (type === 'individual') {
    const prevNames = data.landlordIdentity?.type === 'individual' ? data.landlordIdentity.names : [];
    const names = prevNames.length > 0 ? prevNames : [''];
    return { landlordIdentity: { type: 'individual', names }, landlordIdentityConfirmed: true };
  }
  const prev = data.landlordIdentity?.type === 'entity' ? data.landlordIdentity : undefined;
  return {
    landlordIdentity: {
      type: 'entity',
      entityLegalName: prev?.entityLegalName ?? '',
      entityType: prev?.entityType ?? 'llc',
      ...(prev?.managementType ? { managementType: prev.managementType } : {}),
    },
    landlordIdentityConfirmed: true,
  };
}

const SERVICE_METHOD_LABELS: Record<ServiceMethod, string> = {
  personal: 'In person (personal service)',
  substituted: 'Substituted service (someone else at the property)',
  post_and_mail: 'Post and mail (posted at property + mailed)',
};

// Attorney-approved on-screen service guidance (ruling 2026-06-02,
// `ownerpilot_service_instructions_attorney_ruling.md`). VERBATIM — no paraphrase.
// Double-asterisks mark bold per the ruling; renderInlineBold turns them into <strong>.
// Condition 2: if POS_PROSE for a method changes, the matching copy here must be
// re-reviewed in the same pass. Condition 6: each render logged (method,
// jurisdiction, notice ID) — pending logging hookup.
type GuidanceBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] };

const SERVICE_GUIDANCE: { method: ServiceMethod; title: string; blocks: GuidanceBlock[] }[] = [
  {
    method: 'personal',
    title: 'Personal service — Instructions',
    blocks: [
      { kind: 'p', text: `Personal service is the cleanest method. Here's how it works:` },
      {
        kind: 'ul',
        items: [
          `**Someone 18 or older who is not you and not a party to this notice** hands a copy of the notice directly to the tenant.`,
          `Hand it to the tenant — not a roommate, not a family member, not a neighbor. If the tenant won't take it, setting it down at their feet after telling them what it is generally counts; running after them is not required.`,
          `The server fills in **where** the notice was handed over (street address) on page 2 of the form, **after** it is served — not before.`,
          `The 3-day clock starts the **day after** delivery. Don't count the day you served it. Weekends and court holidays don't count toward the 3 days. (This is built into how the form's deadline is calculated.)`,
        ],
      },
      { kind: 'p', text: `Keep it simple: if you can hand it to the tenant in person, do that. Every other method exists because personal service didn't work.` },
    ],
  },
  {
    method: 'substituted',
    title: 'Substituted service — Instructions',
    blocks: [
      { kind: 'p', text: `Substituted service is only allowed **after** you (or your server) have made a real, good-faith effort to hand the notice to the tenant in person and couldn't. The technical name is "reasonable diligence." Here's what that means in practice:` },
      { kind: 'h', text: `First — attempt personal service` },
      {
        kind: 'ul',
        items: [
          `Most California courts expect **at least three attempts**, on **different days and at different times of day** (e.g., one morning, one evening, one weekend). One drive-by at 2pm on a Tuesday isn't enough.`,
          `Keep notes — date, time, what happened. Your server will list these on the proof of service.`,
        ],
      },
      { kind: 'h', text: `Then — substituted service` },
      {
        kind: 'ul',
        items: [
          `Leave a copy with a **person of suitable age and discretion** at the tenant's home or usual workplace. In practice that means someone who looks like an adult (typically 18+), appears to live or work there, and seems capable of understanding what they're being handed. A young child, a stranger walking past, or someone who refuses to identify themselves doesn't qualify.`,
          `Tell that person what the document is. Don't slide it under the door.`,
        ],
      },
      { kind: 'h', text: `And — mail a copy` },
      {
        kind: 'ul',
        items: [
          `On the **same day** as the substituted hand-off, mail a copy of the notice to the tenant at the address where service was made. First-class mail is fine. Keep the postmark or a mailing receipt.`,
          `If you skip the mailing, or mail it the next day, the service is **defective** — the 3-day clock never legally starts.`,
        ],
      },
      { kind: 'h', text: `What this does to the timing` },
      { kind: 'p', text: `Substituted service requires the same 3 business days (weekends and court holidays excluded). **Most California courts also require you to add 5 calendar days to the period because of the mailing step.** That is enforced reflexively by many trial courts, and filing your unlawful detainer too early — even by one day — is grounds for dismissal. The safe path: wait the full 3 business days + 5 calendar days before filing if you served by substitution.` },
    ],
  },
  {
    method: 'post_and_mail',
    title: 'Posting and mailing — Instructions',
    blocks: [
      { kind: 'p', text: `Posting and mailing is the last-resort method. It's only available after **both** personal service has failed (the same reasonable-diligence standard — at least three good-faith attempts on different days and times) **and** substituted service couldn't be completed because no person of suitable age and discretion could be found at the home or workplace.` },
      { kind: 'p', text: `If those two conditions are met:` },
      { kind: 'h', text: `Post` },
      {
        kind: 'ul',
        items: [
          `Affix a copy of the notice in a **conspicuous place on the property** — the front door is the standard choice. Tape, tack, or otherwise attach it so it's plainly visible to anyone approaching the unit.`,
          `Take a dated photo of the posted notice showing the address. This is your evidence that posting happened on the date claimed. If you don't have a photo and the tenant contests service, you have a problem.`,
        ],
      },
      { kind: 'h', text: `Mail` },
      {
        kind: 'ul',
        items: [
          `On the **same day** as the posting, mail a copy of the notice to the tenant at the address of the rental property. First-class mail. Keep the postmark or mailing receipt.`,
          `Same trap as substituted service: skip the mailing or mail it the next day, and the service is **defective**.`,
        ],
      },
      { kind: 'h', text: `What this does to the timing` },
      { kind: 'p', text: `Same as substituted service: 3 business days + most California courts require you to add 5 calendar days for the mailing. Treat a 3-day post-and-mail as an **8-business-day-plus** timeline before you can file the unlawful detainer. Filing earlier risks dismissal.` },
    ],
  },
];

// Escalation guidance (attorney ruling 2026-06-02, A2(b)). VERBATIM — no
// paraphrase. Renders once below the method selector; the date mechanics it
// describes (same notice, clock restarts from the successful method) are the
// engine behavior A2 gates on, not yet built — copy here is informational.
const SERVICE_ESCALATION: GuidanceBlock[] = [
  { kind: 'h', text: `If a service attempt doesn't succeed` },
  { kind: 'p', text: `If you can't complete the method you picked, come back here and pick the next one — but only after you've genuinely tried the current method. The order matters legally, not just as a preference:` },
  {
    kind: 'ul',
    items: [
      `**Personal service** — if the tenant can't be reached after **at least three good-faith attempts on different days and at different times** (one morning, one evening, one weekend is the practical baseline), you may move to substituted service. Keep notes of every attempt; your server will list them on the proof of service.`,
      `**Substituted service** — if no person of suitable age and discretion can be found at the tenant's home or workplace after reasonable attempts, you may move to posting and mailing.`,
    ],
  },
  { kind: 'p', text: `When you return and pick the next method, OwnerPilot will use the **same notice** — same notice date, same amount due — but the **3-day deadline restarts from the date the new method actually succeeds**. For substituted service and posting-and-mailing, the 3 business days are counted from the date the mailing went out, and most California courts require an extra 5 calendar days on top of that before you can file an unlawful detainer.` },
  { kind: 'p', text: `**One exception:** if the amount the tenant owes changes between attempts — they paid part of it, rent rolled into a new period, you found a miscalculation — that's a new notice, not the same one served a different way. Start a new flow.` },
];

// Local-filing copy: attorney-approved GENERIC placeholder (Q5). Jurisdiction-
// specific copy (LAMC sections, day counts, form embeds) stays pending the
// verified-rules data per condition 3.
const LOCAL_FILING_COPY: string[] = [
  `California **state law** does not require you to file a 3-day pay-or-quit with any state agency at the service stage. (The court filing — the unlawful detainer complaint — comes later, only if the tenant doesn't pay or vacate.)`,
  `**Some California cities and counties do require landlords to file or report notices.** Examples include the City of Los Angeles (where copies of certain notices and other documentation must be filed with the LA Housing Department) and other rent-controlled or just-cause jurisdictions. **Whether a filing requirement applies to your notice depends on the property's exact address and the local ordinance in effect on the date of service.**`,
  `OwnerPilot's address-specific local-rules data is being built. Until that data is live for your jurisdiction, **confirm any local filing requirement with your city's housing or rent-stabilization department, or with your attorney, before you file your unlawful detainer.** A missed local filing can be a complete defense to an eviction.`,
];

// Splits attorney copy on `**` and renders odd segments bold. Text is otherwise
// reproduced exactly as approved.
function renderInlineBold(text: string): ReactNode {
  return text.split('**').map((seg, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{seg}</strong>
    ) : (
      <Fragment key={i}>{seg}</Fragment>
    ),
  );
}

function GuidanceBlocks({ blocks }: { blocks: GuidanceBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          return (
            <p key={i} className="text-sm font-semibold text-gray-900 mt-3">
              {renderInlineBold(b.text)}
            </p>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-sm text-gray-700 leading-relaxed">
              {b.items.map((it, j) => (
                <li key={j}>{renderInlineBold(it)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            {renderInlineBold(b.text)}
          </p>
        );
      })}
    </>
  );
}

// --- FIX 1: LLC management-type intake + signer-authority warning ----------
//
// TODO(broker): the banner BODY copy and the management-option helper text
// below are NON-LEGAL PLACEHOLDERS. Replace verbatim with reviewed wording
// before this ships to users. The structural labels (field/question text and
// option names) are product copy, not legal determinations. Logic and tests
// are built against these placeholders so they fail loudly when real copy
// lands. Do NOT add attorney attribution.

// FIX 1 copy constants + the Banner 1.2 trigger predicate now live in
// lib/flow/llcCopy.ts (a pure module the tsx test suites can import without
// pulling in this client component). Imported above.

/** LLC management-type radio (Field 1.1) + the not-sure banner (1.3). Renders
    only for an LLC landlord. Required selection is gated in advancement.ts. */
function LlcManagementTypeField({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const li = data.landlordIdentity;
  if (li?.type !== 'entity' || li.entityType !== 'llc') return null;
  const current = li.managementType;
  const setMgmt = (v: LlcManagementType) =>
    update((d) =>
      d.landlordIdentity?.type === 'entity'
        ? { landlordIdentity: { ...d.landlordIdentity, managementType: v } }
        : {},
    );
  return (
    <div>
      <FieldLabel>{LLC_MGMT_FIELD_LABEL}<Req /></FieldLabel>
      <p className="mb-2 text-xs text-gray-500 leading-relaxed">{LLC_MGMT_FIELD_HELPER}</p>
      <div className="space-y-2">
        {LLC_MGMT_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
              current === opt.value ? 'border-brand bg-tint' : 'border-rule bg-white'
            }`}
          >
            <input
              type="radio"
              name="llcManagementType"
              className="mt-1"
              checked={current === opt.value}
              onChange={() => setMgmt(opt.value)}
            />
            <span>
              <span className="block text-gray-900">{opt.label}</span>
              {opt.helper && <span className="block text-sm text-gray-500">{opt.helper}</span>}
            </span>
          </label>
        ))}
      </div>
      {current === 'not-sure' && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
          <strong>{LLC_NOT_SURE_BANNER_TITLE}</strong> {LLC_NOT_SURE_BANNER}
        </div>
      )}
    </div>
  );
}

/** Banner 1.2: manager-managed LLC + entity-insider capacity + a signer title
    that doesn't look like a manager role. Non-gating; dismissible. */
function SignerAuthorityWarning({
  data,
}: {
  data: NoticeFlowData;
}) {
  const [dismissed, setDismissed] = useState(false);
  const triggered = shouldShowSignerAuthorityWarning(data);
  if (!triggered || dismissed) return null;
  const focusTitle = () => {
    const el = typeof document !== 'undefined' ? document.getElementById('signerTitle') : null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLInputElement).focus();
    }
  };
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
      <p>
        <strong>{LLC_MANAGER_WARNING_BANNER_TITLE}</strong> {LLC_MANAGER_WARNING_BANNER}
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-semibold text-amber-800 underline"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={focusTitle}
          className="text-xs font-semibold text-amber-800 underline"
        >
          I need to fix the signer
        </button>
      </div>
    </div>
  );
}

function LandlordIdentityStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const li = data.landlordIdentity;
  const entityName = li?.type === 'entity' ? li.entityLegalName : '';
  const entityTypeVal: EntityType = li?.type === 'entity' ? li.entityType : 'llc';
  // Toggle-stash: switching landlord type REPLACES landlordIdentity, which
  // used to destroy the other branch's entered fields (entity legal name,
  // entity type, LLC managementType; individual owner names). Stash the
  // branch being left and restore it when the user toggles back.
  type EntityIdentity = Extract<
    NonNullable<NoticeFlowData['landlordIdentity']>,
    { type: 'entity' }
  >;
  const [entityStash, setEntityStash] = useState<EntityIdentity | null>(null);
  const [namesStash, setNamesStash] = useState<string[] | null>(null);
  const selectType = (t: 'individual' | 'entity') => {
    const cur = data.landlordIdentity;
    if (cur?.type === 'entity') setEntityStash(cur);
    else if (cur?.type === 'individual') setNamesStash(cur.names);
    const restored =
      t === 'entity'
        ? cur?.type === 'entity'
          ? cur
          : entityStash ?? cur
        : cur?.type === 'individual'
          ? cur
          : namesStash
            ? { type: 'individual' as const, names: namesStash }
            : cur;
    update(setLandlordTypePatch(t, { ...data, landlordIdentity: restored }));
  };
  return (
    <CollapsibleSection
      id="landlord_4a"
      title="Landlord (the party serving this notice)."
      subhead="Who is the landlord on this notice?"
    >
    <div className="space-y-6">
      <LearnMore>
        Who is the landlord on this notice? This determines whose name appears
        as the party the notice is from, and (unless you say otherwise on the
        payment step) who rent is payable to.
      </LearnMore>

      {/* Stage 1 - who is the landlord (Defect #1, ruling 2.1) */}
      <div>
        <FieldLabel>Who is the landlord on this notice?<Req /></FieldLabel>
        <div className="space-y-2">
          {(['individual', 'entity'] as const).map((t) => (
            <label
              key={t}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                li?.type === t ? 'border-brand bg-tint' : 'border-rule bg-white'
              }`}
            >
              <input
                type="radio"
                name="landlordType"
                className="mt-1"
                checked={li?.type === t}
                onChange={() => selectType(t)}
              />
              <span>
                <span className="block text-gray-900">{LANDLORD_TYPE_LABELS[t].title}</span>
                <span className="block text-sm text-gray-500">{LANDLORD_TYPE_LABELS[t].help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Individual owner names — feeds derivePayeeName's composed owner line
          (1 name verbatim; 2 → "A and B"; 3+ → Oxford comma). The renderer and
          gate fail closed on an empty list; this intake was missing. */}
      {li?.type === 'individual' && (
        <div>
          <FieldLabel>Owner name(s)<Req /></FieldLabel>
          <p className="mb-2 text-xs text-gray-500 leading-relaxed">
            Enter each owner&apos;s full name as it appears on the deed or title.
            Every owner listed here is named on the notice, and (unless you say
            otherwise on the payment step) rent is payable to them.
          </p>
          <div className="space-y-2">
            {(li.names.length > 0 ? li.names : ['']).map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update((d) => {
                      if (d.landlordIdentity?.type !== 'individual') return {};
                      const names =
                        d.landlordIdentity.names.length > 0
                          ? [...d.landlordIdentity.names]
                          : [''];
                      names[i] = e.target.value;
                      return { landlordIdentity: { ...d.landlordIdentity, names } };
                    })
                  }
                  placeholder="Full name, e.g. Jane Q. Owner"
                  className={inputClass}
                />
                {li.names.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        if (d.landlordIdentity?.type !== 'individual') return {};
                        const kept = d.landlordIdentity.names.filter((_, j) => j !== i);
                        return {
                          landlordIdentity: {
                            ...d.landlordIdentity,
                            names: kept.length > 0 ? kept : [''],
                          },
                        };
                      })
                    }
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              update((d) => {
                if (d.landlordIdentity?.type !== 'individual') return {};
                const names =
                  d.landlordIdentity.names.length > 0
                    ? [...d.landlordIdentity.names, '']
                    : ['', ''];
                return { landlordIdentity: { ...d.landlordIdentity, names } };
              })
            }
            className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            + Add another owner
          </button>
        </div>
      )}

      {/* Entity identity fields */}
      {li?.type === 'entity' && (
        <>
          <div>
            <FieldLabel htmlFor="entityLegalName">Entity legal name<Req /></FieldLabel>
            <input
              id="entityLegalName"
              type="text"
              value={entityName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update((d) =>
                  d.landlordIdentity?.type === 'entity'
                    ? { landlordIdentity: { ...d.landlordIdentity, entityLegalName: e.target.value } }
                    : {},
                )
              }
              placeholder={'Full registered legal name, e.g. "PTAG Properties, LLC"'}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {entityLegalNameHelper}
            </p>
          </div>
          <div>
            <FieldLabel htmlFor="entityType">Entity type<Req /></FieldLabel>
            <select
              id="entityType"
              value={entityTypeVal}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update((d) =>
                  d.landlordIdentity?.type === 'entity'
                    ? {
                        landlordIdentity: {
                          ...d.landlordIdentity,
                          entityType: e.target.value as EntityType,
                        },
                      }
                    : {},
                )
              }
              className={inputClass}
            >
              {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((et) => (
                <option key={et} value={et}>
                  {ENTITY_TYPE_LABELS[et]}
                </option>
              ))}
            </select>
          </div>

          {/* FIX 1.1 — LLC management type (member- vs manager-managed) + 1.3 banner */}
          <LlcManagementTypeField data={data} update={update} />
        </>
      )}
      {/* C7b (det. 2026-06-14, Step 3 item 3): owner mailing/correspondence
          address. Shown once a landlord type is chosen; applies to both
          branches. Seeds the payee street-address prefill on the payment step. */}
      {li && (
        <div>
          <FieldLabel htmlFor="mailingAddress">Mailing address<Req /></FieldLabel>
          <PropertyAddressAutocomplete
            id="mailingAddress"
            value={data.mailingAddress ?? ''}
            onChange={(v) => update({ mailingAddress: v })}
            placeholder="123 Main St, City, CA 90000"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            Where you receive mail about this notice. We&apos;ll use it to
            prefill the payment address on the next step (you can change it
            there).
          </p>
        </div>
      )}
    </div>
    </CollapsibleSection>
  );
}

/**
 * Live deadline preview (JT request 2026-06-12). Renders the SAME computation
 * the produce gate and Review use - computeCompliancePeriod over the verified
 * holiday set (single-year, mirroring gates.ts) - so the customer can watch
 * the commencement/expiration dates arise as they pick a method and date.
 * The engine never extends the face deadline for mailing methods; the
 * filing-stage +5 guidance (A2(b), mailingExtensionFlag) is a separate,
 * attorney-copy-gated follow-up. No date math is authored here.
 */
function DeadlinePreview({ data }: { data: NoticeFlowData }) {
  if (!data.serviceDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.serviceDate)) {
    return null;
  }
  let period: CompliancePeriodResult | null = null;
  try {
    const year = Number(data.serviceDate.slice(0, 4));
    const holidays = getVerifiedHolidaySet(year);
    period = computeCompliancePeriod({
      serviceDate: data.serviceDate,
      // Face deadline is method-independent (engine invariant; the +5 mailing
      // buffer is filing-stage only and never appears on the face), so the
      // preview may run before a method is chosen.
      serviceMethod: data.serviceMethod ?? 'personal',
      holidays,
    });
  } catch {
    period = null;
  }
  if (!period) {
    return (
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        The deadline can&apos;t be computed for this date yet (the holiday calendar for
        that year may not be verified). Computed dates will appear on the Review step.
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-rule bg-white px-4 py-3 shadow-sm text-sm space-y-1.5">
      <p className="font-semibold text-gray-900">Deadline preview</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">3-day period begins</span>
        <span className="font-medium text-gray-900">
          {formatNoticeDate(period.commencementDate)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Pay or vacate by end of</span>
        <span className="font-medium text-gray-900">
          {formatNoticeDate(period.expirationDate)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Days counted</span>
        <span className="font-medium text-gray-900 text-right">
          {period.countedDays.map((d) => formatNoticeDate(d)).join(', ')}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed pt-1">
        The count skips the day of service, Saturdays, Sundays, and California judicial
        holidays &mdash; so the deadline can land more than three calendar days after
        service. These are the same dates that will print on the notice.
      </p>
    </div>
  );
}

function LandlordStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  // B1: the signing (execution) date is distinct from the service date. Inline
  // feedback — hard error if signed after service, soft warning if >30 days
  // before. The hard error also blocks advancement (advancement.ts) and
  // production (gates.ts); the warning does neither (build decision: warn only).
  const signingCheck = validateSigningDate(data.signingDate, data.serviceDate);
  const li = data.landlordIdentity;
  return (
    <div className="space-y-6">
      <StepIntro>
        Who is signing and serving the notice, and when?
      </StepIntro>
      <p className="text-sm text-gray-600 leading-relaxed -mt-2">
        This is the last step before producing the notice. Tell us who will sign
        it, and how and when you plan to serve it. You&apos;ll get
        method-specific service instructions on the next screen.
      </p>

      {/* Signer name — shown once the landlord type is chosen */}
      {li && (
        <div>
          <FieldLabel htmlFor="signerName">Signer&apos;s full name<Req /></FieldLabel>
          <input
            id="signerName"
            type="text"
            value={data.signerName ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ signerName: e.target.value })}
            placeholder="Full legal name of the person signing"
            className={inputClass}
          />
        </div>
      )}

      {/* Capacity — individual branch */}
      {li?.type === 'individual' && (
        <div>
          <FieldLabel>Who is signing?<Req /></FieldLabel>
          <div className="space-y-2">
            {(Object.keys(INDIVIDUAL_CAPACITY_LABELS) as (keyof typeof INDIVIDUAL_CAPACITY_LABELS)[]).map(
              (cap) => (
                <label
                  key={cap}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                    data.signerCapacity === cap ? 'border-brand bg-tint' : 'border-rule bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="signerCapacity"
                    checked={data.signerCapacity === cap}
                    onChange={() => update({ signerCapacity: cap })}
                  />
                  <span className="text-gray-900">{INDIVIDUAL_CAPACITY_LABELS[cap]}</span>
                </label>
              ),
            )}
          </div>
        </div>
      )}

      {/* Capacity — entity branch */}
      {li?.type === 'entity' && (
        <div>
          <FieldLabel>In what capacity is the signer acting for the entity?<Req /></FieldLabel>
          <div className="space-y-2">
            {(Object.keys(ENTITY_CAPACITY_LABELS) as (keyof typeof ENTITY_CAPACITY_LABELS)[]).map((cap) => (
              <label
                key={cap}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                  data.signerCapacity === cap ? 'border-brand bg-tint' : 'border-rule bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="signerCapacity"
                  checked={data.signerCapacity === cap}
                  onChange={() => update({ signerCapacity: cap })}
                />
                <span className="text-gray-900">{ENTITY_CAPACITY_LABELS[cap]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Signer title — required for an entity insider (officer/member/trustee) */}
      {li?.type === 'entity' && data.signerCapacity === 'officer_member_trustee' && (
        <div>
          <FieldLabel htmlFor="signerTitle">Signer&apos;s capacity / title<Req /></FieldLabel>
          <input
            id="signerTitle"
            type="text"
            value={data.signerTitle ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ signerTitle: e.target.value })}
            placeholder="e.g. Managing Member, President, Trustee"
            className={inputClass}
          />
        </div>
      )}

      {/* FIX 1.2 — signer-authority warning (manager-managed LLC + non-manager title) */}
      <SignerAuthorityWarning data={data} />

      {/* Authority evidence — when the signer is not the insider */}
      {data.signerCapacity &&
        data.signerCapacity !== 'owner' &&
        data.signerCapacity !== 'officer_member_trustee' && (
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
        <FieldLabel htmlFor="signingDate">Date you sign the notice<Req /></FieldLabel>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          This is the &ldquo;Dated:&rdquo; line on the notice itself &mdash; the day you
          execute it. It can be the same day you serve, or a few days before, but it
          cannot be after the service date.
        </p>
        <DateField
          id="signingDate"
          value={data.signingDate ?? ''}
          onChange={(v) => update({ signingDate: v })}
        />
        {!signingCheck.ok && signingCheck.error && (
          <p className="mt-2 text-sm text-red-700">{signingCheck.error}</p>
        )}
        {signingCheck.ok && signingCheck.warning && (
          <p className="mt-2 text-sm text-amber-700">{signingCheck.warning}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="serviceDate">Intended service date<Req /></FieldLabel>
        <DateField
          id="serviceDate"
          value={data.serviceDate ?? ''}
          onChange={(v) => update({ serviceDate: v })}
        />
        <DeadlinePreview data={data} />
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          You&apos;ll pick your service method on the Serve &amp; Track page, after the
          notice is produced.
        </p>
      </div>

    </div>
  );
}

// --- Step 6: Review ---------------------------------------------------------

// Maps a produce-gate blocker code (gates.ts, evaluateCanProduceV4) to the
// wizard PAGE that owns the fields behind it, for the "Go to this" jump.
// JURISDICTION_* codes are handled by prefix in pageForBlocker.
// TEMPLATE_NOT_SIGNED_OFF is a system gate with no owning page - no button.
const BLOCKER_PAGE: Record<string, number> = {
  DISPUTE_NOT_CLEARED: 0,
  PROPERTY_ADDRESS_MISSING: 1,
  NO_TENANT: 1,
  NO_RENT_PERIODS: 2,
  PAYMENT_CONFIG_INVALID: 3,
  BANK_5_MILE_NOT_VERIFIED: 3,
  PAYEE_NAME_UNRESOLVED: 3,
  LANDLORD_TYPE_UNCONFIRMED: 3,
  SIGNER_MISSING: 4,
  SIGNER_ROLE_MISSING: 4,
  AUTHORITY_EVIDENCE_MISSING: 4,
  SIGNER_TITLE_REQUIRED: 4,
  SERVICE_DATE_OR_METHOD_MISSING: 4,
  SIGNING_DATE_MISSING: 4,
  SIGNING_AFTER_SERVICE: 4,
  SERVICE_ATTEMPT_INCOMPLETE: 4,
  DATES_NOT_COMPUTABLE: 4,
};

function pageForBlocker(code: string): number | null {
  if (code.startsWith('JURISDICTION_')) return 1;
  return code in BLOCKER_PAGE ? BLOCKER_PAGE[code] : null;
}

function ReviewStep({
  data,
  update,
  goToPage,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
  goToPage?: (pageIndex: number) => void;
}) {
  const [produceAttempted, setProduceAttempted] = useState(false);
  const result = evaluateCanProduceV4(data);

  // When the gate says ready, render the notice from the build-locked template
  // and build the styled document. The renderer fails closed; wrap it so any
  // unexpected gap surfaces as a clear message rather than a crash.
  let docHtml: string | null = null;
  let renderedModel: NoticeModel | null = null;
  let renderError: string | null = null;
  // C6: render the face as soon as the notice is DATA-complete (every
  // blocker cleared except the produce attestation), so the user can READ
  // the face before attesting (Eshagian v. Cepeda). The attestation gates
  // PRINTING, not previewing.
  const onlyAttestationLeft =
    result.blockers.length === 0 ||
    (result.blockers.length === 1 &&
      result.blockers[0].code === 'PRODUCE_ATTESTATION_MISSING');
  const isRenderable = onlyAttestationLeft && !!result.computedDates;
  // The produce attestation surfaces only as the green confirm-step (when it is
  // the SOLE remaining blocker), never as a bullet alongside real blockers - the
  // checkbox it points to isn't shown in the multi-blocker state.
  const visibleBlockers = result.blockers.filter(
    (b) => b.code !== 'PRODUCE_ATTESTATION_MISSING',
  );
  if (isRenderable && result.computedDates) {
    try {
      const rendered = renderNotice({
        data,
        dates: {
          compliancePeriodStartDate: result.computedDates.commencementDate,
          compliancePeriodEndDate: result.computedDates.expirationDate,
        },
      });
      docHtml = buildNoticeDocumentHtml(rendered.model);
      renderedModel = rendered.model;
    } catch (e) {
      renderError =
        e instanceof NoticeRenderError
          ? e.message
          : 'The notice could not be generated. Please review your entries.';
    }
  }

  // B1 stale-guard: record the face-determining fields at the moment of
  // production. evaluateStaleness (in ReServePanel) later compares current
  // data against this snapshot to detect a drifted face on re-serve. Called
  // by PacketPrintOptions whenever any packet document is printed.
  const onProduced = () => {
    update({ productionSnapshot: captureProductionSnapshot(data) });
  };

  // Slice A.1: don't surface the produce-gate readout (green/amber) the
  // instant the user lands on Step 5. The signer/date fields live on this
  // same page and are still empty on arrival, so an immediate "Not ready
  // yet" list nags about fields the user hasn't filled. Gate the readout
  // behind an explicit produce attempt; local state resets on each entry to
  // Step 5, so arriving (or returning via a "Go to this" jump) starts clean.
  // Once attempted, the checklist updates live as fields above are filled.
  if (!produceAttempted) {
    return (
      <div className="space-y-6">
        <StepIntro>
          When the signer and dates above are filled in, produce your notice
          packet. We&apos;ll check everything and flag anything that still
          needs attention before it prints.
        </StepIntro>
        <button
          type="button"
          onClick={() => setProduceAttempted(true)}
          className="inline-flex items-center justify-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-bar transition-colors"
        >
          Produce Notice Packet
        </button>
      </div>
    );
  }

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
                <strong>{formatNoticeDate(result.computedDates.expirationDate)}</strong> to pay or
                vacate (period begins {formatNoticeDate(result.computedDates.commencementDate)}).
              </>
            )}
          </p>
        </div>
      ) : (
        <div
          className={`rounded-lg border px-5 py-4 ${
            onlyAttestationLeft
              ? 'border-green-300 bg-green-50'
              : 'border-amber-300 bg-amber-50'
          }`}
        >
          {!onlyAttestationLeft && (
          <p className="font-semibold text-amber-900 mb-2">
            Not ready yet — {visibleBlockers.length}{' '}
            {visibleBlockers.length === 1 ? 'item needs' : 'items need'} attention:
          </p>
          )}
          {!onlyAttestationLeft && (
          <ul className="space-y-2 text-sm text-amber-900 list-disc pl-5">
            {visibleBlockers.map((b) => {
              const targetPage = pageForBlocker(b.code);
              return (
                <li key={b.code}>
                  <span>{b.message}</span>
                  {targetPage !== null && goToPage && (
                    <button
                      type="button"
                      onClick={() => goToPage(targetPage)}
                      className="ml-2 align-baseline text-xs font-semibold text-amber-800 underline whitespace-nowrap"
                    >
                      Go to this &rarr;
                    </button>
                  )}
                  {b.code === 'PAYMENT_CONFIG_INVALID' && result.paymentErrors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-5 list-disc">
                      {result.paymentErrors.map((pe) => (
                        <li key={pe.code}>{pe.message}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          )}
          {onlyAttestationLeft && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-green-900">
                California law requires you to confirm the following before
                producing this notice:
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.produceAttestationConfirmed === true}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update({
                      produceAttestationConfirmed: e.target.checked,
                      ...(e.target.checked
                        ? { produceAttestationAcceptedAt: new Date().toISOString() }
                        : { produceAttestationAcceptedAt: undefined }),
                    })
                  }
                  className="mt-1"
                />
                <span className="text-sm text-green-900 leading-relaxed">
                  By producing this notice, I confirm: the amounts entered are base rent only (no late fees, utilities, or other charges); the tenants and landlord(s) named are correct; and the signer is authorized.
                </span>
              </label>
              {goToPage && (
                <button
                  type="button"
                  onClick={() => goToPage(2)}
                  className="text-xs font-semibold text-green-800 underline"
                >
                  &larr; Back to rent amount
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!result.canProduce &&
        data.paymentBranch === 'bank_deposit' &&
        (data.bankDepositPaperInstrumentConfirmed !== true ||
          data.bankBranchWithinFiveMilesAttested !== true) && (
          <div className="space-y-3 rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900">
              Confirm these to finish the bank-deposit method
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              These are the same confirmations from the payment step. Check them here
              to clear the items above without going back.
            </p>
            <BankDepositAttestations data={data} update={update} />
          </div>
        )}

      {renderError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {renderError}
        </div>
      )}

      {docHtml && renderedModel && (
        <PacketPrintOptions
          model={renderedModel}
          data={data}
          noticeDocHtml={docHtml}
          onProduced={onProduced}
          disabledKeys={
            result.canProduce ? ['serviceLog'] : ['tenant', 'owner', 'serviceLog', 'full']
          }
        />
      )}

      {/* C6: posture line (locked) on the produce screen. */}
      {docHtml && renderedModel && (
        <div className="rounded-lg border border-rule bg-white px-5 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
          </p>
        </div>
      )}

      {/* R2b: service tracking lives on its own page. Whole card is clickable. */}
      {result.canProduce && (
        <a
          href="/notice/3-day/serve"
          className="block rounded-lg border border-rule bg-white px-5 py-4 shadow-sm transition-colors hover:border-brand hover:bg-tint"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Next: serve &amp; track</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Once you print and serve the notice, record your service attempts and
            complete the proof of service on the Serve &amp; Track page.
          </p>
          <span className="text-sm font-semibold text-brand">
            Go to Serve &amp; Track &rarr;
          </span>
        </a>
      )}
    </div>
  );
}

// --- Step 7: Service instructions -------------------------------------------
// Post-production guidance. The legal substance (how to serve under CCP § 1162,
// local filing) is NOT authored here — it renders as "pending attorney review"
// until the service-instruction copy is signed off, then drops into these
// sections. This shell only structures the step and echoes data already captured.

function newAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `att_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Re-serve panel (attorney ruling B1, slice 2). Records each service attempt
 * into serviceAttempts[]: failed attempts are the reasonable-diligence record
 * that lets the landlord escalate to the next method; the one SUCCESS sets the
 * 3-day clock (via deriveComplianceInputs in the produce gate). The notice FACE
 * never changes here — only the off-face computation and the diligence record
 * move. This panel does NOT auto-fill the rendered proof of service (that stays
 * the attorney-locked hand-filled form) and does NOT enforce method ordering.
 */
function ReServePanel({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const attempts = data.serviceAttempts ?? [];
  const success = getSuccessfulAttempt(data);
  const computed = evaluateCanProduceV4(data).computedDates;
  // B1 stale-guard: compare current data against the snapshot taken at produce.
  // Computed on the fly (not persisted — persisting stalenessReason + the
  // re-generation audit event is the deferred D2 slice).
  const staleness = evaluateStaleness(data);

  const [method, setMethod] = useState<ServiceMethod>(data.serviceMethod ?? 'personal');
  const [attemptDate, setAttemptDate] = useState('');
  const [outcome, setOutcome] = useState<'SUCCESS' | 'FAILED'>('FAILED');
  const [mailingDate, setMailingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverAddress, setServerAddress] = useState('');
  const [serverIs18, setServerIs18] = useState(false);
  const [serverNotParty, setServerNotParty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [recordedFlash, setRecordedFlash] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const needsMailing = method === 'substituted' || method === 'post_and_mail';
  const mailingRequiredNow = needsMailing && outcome === 'SUCCESS';

  const resetForm = () => {
    setAttemptDate('');
    setMailingDate('');
    setNotes('');
    setServerName('');
    setServerAddress('');
    setServerIs18(false);
    setServerNotParty(false);
    setOutcome('FAILED');
    setErrors([]);
  };

  const handleAdd = () => {
    const errs: string[] = [];
    if (!attemptDate) errs.push('Enter the date of the attempt.');
    // Server identity is required when service was COMPLETED (it backs the
    // proof of service). Optional on a failed attempt (JT, 2026-06-12).
    if (outcome === 'SUCCESS' && !serverName.trim()) errs.push('Enter the name of the person who served.');
    if (outcome === 'SUCCESS' && !serverAddress.trim()) errs.push('Enter the address of the person who served.');
    if (!serverIs18) errs.push('Confirm the person who served is 18 or older.');
    if (!serverNotParty) errs.push('Confirm the person who served is not a party to this notice.');
    if (mailingRequiredNow && !mailingDate) {
      errs.push('Enter the mailing date — it sets the 3-day clock for substituted or posting-and-mailing service.');
    }
    setErrors(errs);
    if (errs.length) return;

    const attempt: ServiceAttempt = {
      id: newAttemptId(),
      attemptDate,
      method,
      outcome,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(needsMailing && mailingDate ? { mailingDate } : {}),
      server: {
        name: serverName.trim(),
        address: serverAddress.trim(),
        age18Plus: serverIs18,
        partyToNotice: !serverNotParty,
      },
    };
    update((d) => {
      const next = [...(d.serviceAttempts ?? []), attempt];
      return outcome === 'SUCCESS'
        ? { serviceAttempts: next, successfulServiceAttemptId: attempt.id }
        : { serviceAttempts: next };
    });
    resetForm();
    setRecordedFlash(true);
    setLastAddedId(attempt.id ?? null);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setRecordedFlash(false);
        setLastAddedId(null);
      }, 6000);
    }
  };

  const handleRemove = (id: string | undefined) => {
    update((d) => {
      const next = (d.serviceAttempts ?? []).filter((a) => a.id !== id);
      return d.successfulServiceAttemptId === id
        ? { serviceAttempts: next, successfulServiceAttemptId: undefined }
        : { serviceAttempts: next };
    });
  };

  // B1: a stale notice is legally a NEW notice. Clear the signing date (forces a
  // fresh re-sign), empty serviceAttempts[] (no carry-over of prior failed
  // attempts), and drop the prior snapshot/staleness. Current face details are
  // intentionally KEPT — they are the updated values the new notice will carry.
  const handleStartNew = () => {
    update({
      signingDate: undefined,
      serviceAttempts: [],
      successfulServiceAttemptId: undefined,
      productionSnapshot: undefined,
      stalenessReason: null,
    });
    resetForm();
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Record what happened when you served</h3>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Log each attempt as you make it. Failed attempts are the reasonable-diligence
          record that lets you move to the next method; the successful attempt is what
          starts the tenant&apos;s 3-day clock. This does not change the notice itself —
          only the proof of service and the off-the-notice deadline.
        </p>
      </div>

      {recordedFlash && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-900">
          Attempt recorded &mdash; added to the log below.
        </p>
      )}

      {attempts.length > 0 && (
        <ul className="space-y-2">
          {attempts.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
                a.id === lastAddedId ? 'border-green-400 bg-green-50' : 'border-rule bg-white'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      a.outcome === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {a.outcome === 'SUCCESS' ? 'Served' : 'Failed'}
                  </span>
                  <span className="font-medium text-gray-900">{SERVICE_METHOD_LABELS[a.method]}</span>
                  <span className="text-gray-500">on {formatNoticeDate(a.attemptDate)}</span>
                </div>
                {a.mailingDate && (
                  <div className="text-gray-600">Mailing completed {formatNoticeDate(a.mailingDate)}</div>
                )}
                {a.server.name && (
                  <div className="text-gray-600">
                    {a.outcome === 'SUCCESS' ? 'Served by' : 'Attempted by'} {a.server.name}
                  </div>
                )}
                {a.notes && <div className="text-gray-500 italic">{a.notes}</div>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                className="text-xs text-gray-500 underline shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {staleness.reason ? (
        <div className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-4 space-y-3">
          <p className="font-semibold text-amber-900">This notice is now out of date.</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            Since you produced it,{' '}
            {staleness.amountChanged
              ? 'the amount demanded changed'
              : 'something on the notice changed'}
            {staleness.changedFields.length > 0
              ? ` (${staleness.changedFields.join(', ')})`
              : ''}
            . Because the notice changed after it was produced, this one can&apos;t be
            re-served &mdash; you&apos;ll need a new notice with the updated details. Starting
            a new notice keeps your current entries but clears the prior signing date and
            service attempts, so you&apos;ll re-sign and record fresh attempts. The earlier
            failed attempts do not carry over.
          </p>
          <button
            type="button"
            onClick={handleStartNew}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Start a new notice
          </button>
        </div>
      ) : success ? (
        <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-4 space-y-1">
          <p className="font-semibold text-green-900">Service recorded as complete.</p>
          {computed ? (
            <p className="text-sm text-green-900 leading-relaxed">
              Counting from your successful {SERVICE_METHOD_LABELS[success.method]} above, the
              tenant has until <strong>{formatNoticeDate(computed.expirationDate)}</strong> to pay
              or vacate (period begins {formatNoticeDate(computed.commencementDate)}). The notice
              face is unchanged.
            </p>
          ) : (
            <p className="text-sm text-green-900 leading-relaxed">
              The deadline can&apos;t be computed for this date yet (the holiday calendar for that
              year may not be verified). The notice face is unchanged.
            </p>
          )}
          <p className="text-xs text-green-800">
            Need to change something? Remove the successful attempt above first.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 px-5 py-4 space-y-4">
          <p className="text-sm font-medium text-gray-900">Add an attempt</p>

          <div>
            <FieldLabel htmlFor="reserveMethod">Method used</FieldLabel>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {renderInlineBold(`California recognizes three service methods, and they aren't interchangeable. Start with **personal service** — handing the notice directly to the tenant. If that doesn't work after reasonable, repeated attempts, **substituted service** becomes available. Only if substituted service can't be completed either does **posting and mailing** become available. Pick the method you plan to use first. If a method fails, you'll come back here and select the next one — keep reading for how that works.`)}
            </p>
            <div className="space-y-2">
              {(Object.keys(SERVICE_METHOD_LABELS) as ServiceMethod[]).map((m) => {
                const guide = SERVICE_GUIDANCE.find((g) => g.method === m);
                return (
                  <Fragment key={m}>
                    <label
                      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer ${
                        method === m ? 'border-brand bg-tint' : 'border-rule bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reserveMethod"
                        checked={method === m}
                        onChange={() => setMethod(m)}
                      />
                      <span className="text-gray-900">{SERVICE_METHOD_LABELS[m]}</span>
                    </label>
                    {method === m && guide && (
                      <div className="rounded-lg border border-rule bg-white px-5 py-4 space-y-2">
                        <p className="font-semibold text-gray-900">{guide.title}</p>
                        <GuidanceBlocks blocks={guide.blocks} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-rule bg-white px-5 py-4 space-y-2">
              <GuidanceBlocks blocks={SERVICE_ESCALATION} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="reserveDate">Date of this attempt<Req /></FieldLabel>
            <DateField id="reserveDate" value={attemptDate} onChange={setAttemptDate} />
          </div>

          <div>
            <FieldLabel htmlFor="reserveOutcome">What happened?<Req /></FieldLabel>
            <div className="space-y-2">
              {(['FAILED', 'SUCCESS'] as const).map((o) => (
                <label
                  key={o}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer ${
                    outcome === o ? 'border-brand bg-tint' : 'border-rule bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="reserveOutcome"
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                  />
                  <span className="text-gray-900">
                    {o === 'SUCCESS' ? 'Service was completed' : 'Attempt failed (no one available / refused)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {mailingRequiredNow && (
            <div>
              <FieldLabel htmlFor="reserveMailing">Date mailing was completed<Req /></FieldLabel>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                For substituted service and posting-and-mailing, the 3-day clock counts from
                the day the copy was mailed.
              </p>
              <DateField id="reserveMailing" value={mailingDate} onChange={setMailingDate} />
            </div>
          )}

          <div>
            <FieldLabel htmlFor="reserveServerName">
              Name of person who served
              {outcome === 'SUCCESS' ? (
                <Req />
              ) : (
                <span className="ml-1 text-xs font-normal text-gray-500">(optional for a failed attempt)</span>
              )}
            </FieldLabel>
            <input
              id="reserveServerName"
              type="text"
              value={serverName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setServerName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel htmlFor="reserveServerAddress">
              Address of person who served
              {outcome === 'SUCCESS' ? (
                <Req />
              ) : (
                <span className="ml-1 text-xs font-normal text-gray-500">(optional for a failed attempt)</span>
              )}
            </FieldLabel>
            <input
              id="reserveServerAddress"
              type="text"
              value={serverAddress}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setServerAddress(e.target.value)}
              placeholder="Street address"
              className={inputClass}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={serverIs18}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setServerIs18(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-800 leading-relaxed">
              The person who served is 18 years of age or older.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={serverNotParty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setServerNotParty(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-800 leading-relaxed">
              The person who served is not a party to this notice (not the owner or landlord
              named on it).
            </span>
          </label>

          {errors.length > 0 && (
            <ul className="space-y-1 text-sm text-red-700 list-disc pl-5">
              {errors.map((er, i) => (
                <li key={i}>{er}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Add attempt
          </button>
        </div>
      )}
    </section>
  );
}

export function ServiceStep({
  data,
  update,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
}) {
  const serviceDateDisplay =
    data.serviceDate && /^\d{4}-\d{2}-\d{2}$/.test(data.serviceDate)
      ? formatNoticeDate(data.serviceDate)
      : null;

  return (
    <div className="space-y-6">
      <StepIntro>
        You&apos;ve produced the notice. Serving it correctly is what makes it
        count — here&apos;s what happens next.
      </StepIntro>

      {/* Echo of choices already captured (the user's own data). */}
      <div className="rounded-lg border border-gray-200 px-5 py-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Intended service date</span>
          <span className="font-medium text-gray-900">
            {serviceDateDisplay ?? 'Not set'}
          </span>
        </div>
      </div>

      {/* Re-serve / attempt recording (slice 2). Sits between the summary and
          the attorney-verbatim guidance below; does not touch either. */}
      <ReServePanel data={data} update={update} />

      {/* How to serve guidance now lives on the Step 3 method selector (expands
          under each option). Step 4 keeps proof-of-service + local filing only. */}

      {/* Complete the proof of service — Q4 revised wording (verbatim). */}
      <section className="space-y-2">
        <h3 className="font-semibold text-gray-900">Complete the proof of service</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          The proof of service is page 2 of the notice you produced. As the
          produced notice states, it is completed and signed after you serve —
          not before.{' '}
          <strong className="font-semibold">
            The person who serves the notice must be 18 or older and cannot be a
            party to the notice (i.e., not you, if the notice is from you).
          </strong>{' '}
          The exact wording for each method is on the form itself.
        </p>
      </section>

      {/* Local filing — Q5 attorney-approved generic placeholder (verbatim). */}
      <section className="space-y-2">
        <h3 className="font-semibold text-gray-900">Local filing — does your city require it?</h3>
        <div className="space-y-2">
          {LOCAL_FILING_COPY.map((para, i) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">
              {renderInlineBold(para)}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Attorney handoff (dispute hard-block) ----------------------------------

function SafetyOverrideModal({
  bankruptcy = false,
  onPause,
  onProceed,
}: {
  bankruptcy?: boolean;
  onPause: () => void;
  onProceed: () => void;
}) {
  const heading = bankruptcy
    ? 'Before you continue — bankruptcy situations require special handling'
    : 'Before you continue';
  const body = bankruptcy
    ? 'You indicated the tenant has filed for bankruptcy or is about to. Bankruptcy triggers an automatic stay under federal law (11 U.S.C. § 362). Serving a 3-day notice during the stay can expose you to sanctions in bankruptcy court — even if the notice would otherwise be valid under California law. We strongly recommend talking to a bankruptcy attorney before proceeding. If you want to continue anyway, we’ll log your decision.'
    : 'One or more of your answers suggests this situation may be outside the routine workflow’s scope. The 3-day notice may not be the right tool here, and serving it without legal guidance can create problems. We recommend pausing to talk to a California licensed attorney before proceeding. If you want to continue anyway, we’ll log your decision.';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-rule bg-white p-6 shadow-xl space-y-4">
        <h2 className="font-serif text-xl font-bold text-brand">{heading}</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{body}</p>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onPause}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>
  );
}
