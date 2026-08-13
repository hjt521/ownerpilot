'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { loadDraft, type RestoredDraft } from '@/lib/flow/persistence';
import { deriveExactNoticeDemand, deriveResolveRecordContext } from '@/lib/flow/outcomeEvents';
import { restoreOutcomeHistory, type RestoredResolveOutcome } from '@/lib/flow/outcomePersistence';
import { deriveFilingReadiness } from '@/lib/flow/filingReadiness';

interface Snapshot {
  draft: RestoredDraft | null;
  outcome: RestoredResolveOutcome;
}

function readSnapshot(): Snapshot {
  const draft = loadDraft();
  if (!draft) return { draft: null, outcome: { status: 'absent' } };
  const context = deriveResolveRecordContext(draft.data);
  if (!context) return { draft, outcome: { status: 'absent' } };
  return {
    draft,
    outcome: restoreOutcomeHistory(
      context.binding,
      deriveExactNoticeDemand(context.artifact),
    ),
  };
}

export function FilingReadiness() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const signatureRef = useRef('');

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      if (disposed) return;
      const next = readSnapshot();
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

  const readiness = deriveFilingReadiness({
    data: snapshot.draft?.data ?? null,
    noticePageIndex: snapshot.draft?.pageIndex ?? null,
    outcome: snapshot.outcome,
  });
  const attention = readiness.checklist.filter(item =>
    item.status === 'Needs information' ||
    item.status === 'Needs owner review' ||
    item.status === 'Cannot continue',
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-labelledby="filing-preparation-heading">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filing preparation</p>
        <h1 id="filing-preparation-heading" className="mt-2 font-serif text-2xl font-bold text-brand sm:text-3xl">
          {readiness.state}
        </h1>
        {readiness.noticeIdentity && <p className="mt-2 text-sm text-muted">{readiness.noticeIdentity}</p>}
        <p className="mt-4 text-sm leading-relaxed text-ink">{readiness.summary}</p>

        <div className="mt-5 rounded-lg bg-tint p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What to do next</p>
          {readiness.nextTask.href ? (
            <Link href={readiness.nextTask.href} className="mt-1 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline">
              {readiness.nextTask.label} →
            </Link>
          ) : (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">{readiness.nextTask.label}</p>
          )}
        </div>

        {attention.length > 0 && (
          <div className="mt-5 rounded-lg border border-rule p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Needs attention</p>
            <ul className="mt-3 space-y-2">
              {attention.map(item => (
                <li key={item.key} className="text-sm leading-relaxed text-ink">
                  <span className="font-semibold">{item.title}:</span>{' '}
                  {item.missingOrReview ?? item.ownerPilotKnows}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-labelledby="readiness-checklist-heading">
        <h2 id="readiness-checklist-heading" className="font-serif text-xl font-bold text-brand">Preparation checklist</h2>
        <ol className="mt-5 space-y-5">
          {readiness.checklist.map(item => (
            <li key={item.key} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <span className="text-xs font-semibold text-muted">{item.status}</span>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="font-semibold text-muted">Why it matters now</p><p className="mt-1 leading-relaxed text-ink">{item.whyItMatters}</p></div>
                <div><p className="font-semibold text-muted">What OwnerPilot already knows</p><p className="mt-1 leading-relaxed text-ink">{item.ownerPilotKnows}</p></div>
                <div><p className="font-semibold text-muted">What is missing or needs review</p><p className="mt-1 leading-relaxed text-ink">{item.missingOrReview ?? 'Nothing for this item right now.'}</p></div>
                <div><p className="font-semibold text-muted">What you can do next</p><p className="mt-1 leading-relaxed text-ink">{item.nextTask ?? 'No action is needed for this item right now.'}</p></div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6" aria-label="Filing preparation boundaries">
        <h2 className="font-serif text-xl font-bold text-brand">What this status means</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{readiness.readinessMeaning}</p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-ink">{readiness.whatOwnerPilotHasNotDone}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">Prepared does not mean signed. Signed does not mean filed. Filed does not mean accepted by the court. This page does not create legal-sufficiency or execution authority.</p>
      </section>

      <details className="mt-5 rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-brand">View lifecycle context</summary>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="font-semibold text-muted">Lifecycle stage</p><p className="mt-1 text-ink">{readiness.lifecycle.stage}</p></div>
          <div><p className="font-semibold text-muted">Lifecycle status</p><p className="mt-1 text-ink">{readiness.lifecycle.status}</p></div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{readiness.lifecycle.detail}</p>
      </details>
    </main>
  );
}
