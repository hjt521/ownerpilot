'use client';
/**
 * Serve & Track (R2b, 2026-06-12) - the post-production service module as its
 * own page. Reads the SAME draft envelope the wizard autosaves (R2a,
 * op.noticeDraft.v1), gates on the produce gate, and renders the exported
 * ServiceStep (method/date echo + ReServePanel + the attorney-verbatim
 * proof-of-service and local-filing sections - none of which move or change).
 * Attempt edits debounce-save back into the same envelope, so the wizard and
 * this page can never diverge.
 */
import { useEffect, useState } from 'react';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { loadDraft, saveDraft } from '@/lib/flow/persistence';
import { evaluateCanProduceV4 } from '@/lib/flow/gates';
import { ServiceStep } from './notice-flow';

export function ServeTrack() {
  const [data, setData] = useState<NoticeFlowData | null>(null);
  const [draftPageIndex, setDraftPageIndex] = useState(0);
  const [checked, setChecked] = useState(false);

  // Same mount-effect pattern as the wizard shell: server HTML and the
  // client's first paint agree; storage is read post-hydration.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setData(draft.data);
      setDraftPageIndex(draft.pageIndex);
    }
    setChecked(true);
  }, []);

  // Debounced save-back. pageIndex is preserved as loaded so returning to
  // the wizard lands on the same page the user left.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => saveDraft(draftPageIndex, data), 500);
    return () => clearTimeout(t);
  }, [data, draftPageIndex]);

  const update = (
    patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>),
  ) => {
    setData((d) => {
      if (!d) return d;
      const resolved = typeof patch === 'function' ? patch(d) : patch;
      return { ...d, ...resolved };
    });
  };

  const ready = data !== null && evaluateCanProduceV4(data).canProduce;

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <a
          href="/notice/3-day"
          className="inline-block text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          &larr; Back to notice
        </a>
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gold mb-3">
          3-Day Notice to Pay Rent or Quit
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight mb-8">
          Serve &amp; track
        </h1>

        {!checked ? null : ready && data ? (
          <ServiceStep data={data} update={update} />
        ) : (
          <div className="rounded-lg border border-rule bg-white px-5 py-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">
              No notice ready to serve
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Finish your notice in the 3-Day Notice flow first. Once it is
              ready to produce, come back here to record service attempts and
              complete the proof of service.
            </p>
            <a
              href="/notice/3-day"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Go to the notice flow &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
