'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { loadDraft, type RestoredDraft } from '@/lib/flow/persistence';
import {
  deriveExactNoticeDemand,
  deriveResolveRecordContext,
} from '@/lib/flow/outcomeEvents';
import {
  restoreOutcomeHistory,
  type RestoredResolveOutcome,
} from '@/lib/flow/outcomePersistence';
import {
  deriveNonpaymentLifecyclePresentation,
  type NonpaymentLifecycleSurface,
} from '@/lib/flow/nonpaymentLifecyclePresentation';

interface LifecycleSnapshot {
  draft: RestoredDraft | null;
  outcome: RestoredResolveOutcome;
}

const MILESTONE_STATE_LABELS = {
  complete: 'Complete',
  current: 'Current',
  pending: 'Later',
  review: 'Review',
} as const;

const LIFECYCLE_STAGE_LABELS = {
  1: 'Notice',
  2: 'Service',
  3: 'After service',
} as const;

const SURFACE_HREFS: Record<NonpaymentLifecycleSurface, string> = {
  notice: '/notice/3-day',
  serve: '/notice/3-day/serve',
  resolve: '/notice/3-day/resolve',
};

function readLifecycleSnapshot(): LifecycleSnapshot {
  const draft = loadDraft();
  if (!draft) return { draft: null, outcome: { status: 'absent' } };

  const resolveContext = deriveResolveRecordContext(draft.data);
  if (!resolveContext) return { draft, outcome: { status: 'absent' } };

  return {
    draft,
    outcome: restoreOutcomeHistory(
      resolveContext.binding,
      deriveExactNoticeDemand(resolveContext.artifact),
    ),
  };
}

export function NonpaymentLifecycleSummary({
  surface,
}: {
  surface: NonpaymentLifecycleSurface;
}) {
  const [snapshot, setSnapshot] = useState<LifecycleSnapshot | null>(null);
  const signatureRef = useRef('');

  useEffect(() => {
    let disposed = false;

    const refresh = () => {
      if (disposed) return;
      const next = readLifecycleSnapshot();
      const signature = JSON.stringify(next);
      if (signature === signatureRef.current) return;
      signatureRef.current = signature;
      setSnapshot(next);
    };

    refresh();
    const interval = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  if (!snapshot) return null;

  const presentation = deriveNonpaymentLifecyclePresentation({
    surface,
    data: snapshot.draft?.data ?? null,
    noticePageIndex: snapshot.draft?.pageIndex ?? null,
    outcome: snapshot.outcome,
  });
  const lifecycleStageLabel = LIFECYCLE_STAGE_LABELS[presentation.currentStep];
  const nextTaskIsCurrentSurface = presentation.nextTask?.href === SURFACE_HREFS[surface];

  return (
    <section
      aria-label="Nonpayment lifecycle status"
      className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6"
    >
      <div className="rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Current stage · {lifecycleStageLabel}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Status
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-brand">
              {presentation.status}
            </h2>
            {presentation.noticeIdentity && (
              <p className="mt-1 text-sm text-muted">{presentation.noticeIdentity}</p>
            )}
          </div>
          <p className="text-xs font-medium text-muted">
            Step {presentation.currentStep} of 3
          </p>
        </div>

        {presentation.nextTask && (
          <div className="mt-5 rounded-lg bg-tint p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              What to do next
            </p>
            {presentation.nextTask.href && !nextTaskIsCurrentSurface ? (
              <Link
                href={presentation.nextTask.href}
                className="mt-1 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                {presentation.nextTask.label} →
              </Link>
            ) : (
              <p className="mt-1 text-sm font-semibold text-ink">
                {presentation.nextTask.label}
              </p>
            )}
          </div>
        )}

        {presentation.reviewRequired && presentation.reviewReason && (
          <div className="mt-4 rounded-lg border border-rule bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">
              Review needed
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              {presentation.reviewReason}
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-muted">What happened</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              {presentation.whatHappened}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted">What OwnerPilot recorded</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              {presentation.whatOwnerPilotRecorded}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-xs font-semibold text-muted">What OwnerPilot has not done</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {presentation.whatOwnerPilotHasNotDone}
          </p>
        </div>

        <details className="mt-5 border-t border-rule pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">
            View lifecycle history
          </summary>
          <ol className="mt-3 space-y-3">
            {presentation.milestones.map((milestone) => (
              <li key={milestone.key} className="flex gap-3 text-sm">
                <span className="min-w-16 text-xs font-semibold text-muted">
                  {MILESTONE_STATE_LABELS[milestone.state]}
                </span>
                <div>
                  <p className="font-semibold text-ink">{milestone.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {milestone.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
