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

const PRODUCT_STAGE_LABELS = [
  'Notice',
  'Unlawful Detainer',
  'Service & Possession',
] as const;

const MILESTONE_STATE_LABELS = {
  complete: 'Complete',
  current: 'Current',
  pending: 'Later',
  review: 'Review',
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
  const firstIncompleteMilestoneIndex = presentation.milestones.findIndex(
    (milestone) => milestone.state !== 'complete',
  );
  const allComplete = firstIncompleteMilestoneIndex === -1;
  const currentStageLabel = allComplete
    ? 'All stages complete'
    : PRODUCT_STAGE_LABELS[firstIncompleteMilestoneIndex] ?? PRODUCT_STAGE_LABELS[0];
  const nextTaskIsCurrentSurface = presentation.nextTask?.href === SURFACE_HREFS[surface];

  return (
    <section
      aria-label="Nonpayment lifecycle status"
      className="mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6"
    >
      <details className="border-y border-rule bg-white">
        <summary className="cursor-pointer list-none py-2.5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <ol
              aria-label="Nonpayment lifecycle"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs"
            >
              {presentation.milestones.map((milestone, index) => {
                const displayState =
                  allComplete || milestone.state === 'complete'
                    ? 'complete'
                    : index === firstIncompleteMilestoneIndex
                      ? 'current'
                      : 'upcoming';
                const marker =
                  displayState === 'complete'
                    ? '✓'
                    : displayState === 'current'
                      ? '▶'
                      : '○';
                const stateText =
                  displayState === 'complete'
                    ? 'Completed'
                    : displayState === 'current'
                      ? 'Current'
                      : 'Upcoming';

                return (
                  <li
                    key={milestone.key}
                    aria-current={displayState === 'current' ? 'step' : undefined}
                    className={`inline-flex items-center gap-1 whitespace-nowrap ${
                      displayState === 'current'
                        ? 'font-bold text-ink'
                        : displayState === 'complete'
                          ? 'font-semibold text-muted'
                          : 'font-medium text-muted'
                    }`}
                  >
                    <span aria-hidden="true">{marker}</span>
                    <span className="sr-only">{stateText}: </span>
                    <span>{PRODUCT_STAGE_LABELS[index]}</span>
                    {index < PRODUCT_STAGE_LABELS.length - 1 && (
                      <span aria-hidden="true" className="ml-0.5 text-muted">
                        →
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <span aria-hidden="true" className="hidden text-muted sm:inline">
              •
            </span>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <p className="text-xs leading-snug text-ink sm:text-sm">
                <span className="font-semibold">Current:</span>{' '}
                <span className="font-semibold">{currentStageLabel}</span>
                <span aria-hidden="true"> — </span>
                <span>{presentation.status}</span>
                {presentation.reviewRequired && presentation.reviewReason && (
                  <>
                    <span aria-hidden="true"> — </span>
                    <span className="font-medium">{presentation.reviewReason}</span>
                  </>
                )}
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
                Details <span aria-hidden="true">⌄</span>
              </span>
            </div>
          </div>
        </summary>

        <div className="border-t border-rule pb-4 pt-3">
          {presentation.noticeIdentity && (
            <p className="mb-3 text-xs text-muted">{presentation.noticeIdentity}</p>
          )}

          {presentation.nextTask && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted">Next task</p>
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
            <div className="mb-4 border-l-2 border-amber-500 pl-3">
              <p className="text-xs font-semibold text-ink">Review needed</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                {presentation.reviewReason}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="mt-4 border-t border-rule pt-4">
            <p className="text-sm font-semibold text-brand">Lifecycle history</p>
            <ol className="mt-3 space-y-3">
              {presentation.milestones.map((milestone, index) => (
                <li key={milestone.key} className="flex gap-3 text-sm">
                  <span className="min-w-16 text-xs font-semibold text-muted">
                    {MILESTONE_STATE_LABELS[milestone.state]}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      {PRODUCT_STAGE_LABELS[index]}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {milestone.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>
    </section>
  );
}
