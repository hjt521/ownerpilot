"use client";
/**
 * Serve & Track (R2b, 2026-06-12; two-column + service-log print 2026-06-13).
 * Reads the SAME draft envelope the wizard autosaves (R2a, op.noticeDraft.v1),
 * gates on the produce gate, and renders the exported ServiceStep (method/date
 * echo + ReServePanel + the attorney-verbatim proof-of-service and local-filing
 * sections - none of which move or change). Attempt edits debounce-save back
 * into the same envelope, so the wizard and this page can never diverge.
 *
 * The right rail mirrors the wizard's NoticeSummaryPanel. The Service Log /
 * Proof of Service print lives here (disabled on Review) because the proof of
 * service is filled out after serving. PacketPrintOptions is reused with every
 * card except serviceLog disabled, so only the proof-of-service card is active.
 */
import { useEffect, useState } from 'react';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { loadDraft, saveDraft } from '@/lib/flow/persistence';
import { evaluateCanProduceV4 } from '@/lib/flow/gates';
import { renderNotice, NoticeRenderError } from '@/lib/produce/renderNotice';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import { buildNoticeDocumentHtml } from '@/lib/produce/buildNoticeHtml';
import { captureProductionSnapshot } from '@/lib/flow/escalation';
import { ServiceStep } from './notice-flow';
import { NoticeSummaryPanel } from './notice-summary-panel';
import { PacketPrintOptions } from './packet-print-options';

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

  const result = data ? evaluateCanProduceV4(data) : null;
  const ready = data !== null && result !== null && result.canProduce;

  // Build the notice model the same way ReviewStep does, so the service-log
  // print has what it needs. Fails closed like Review.
  let docHtml: string | null = null;
  let renderedModel: NoticeModel | null = null;
  if (ready && data && result && result.computedDates) {
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
      if (!(e instanceof NoticeRenderError)) {
        docHtml = null;
        renderedModel = null;
      }
    }
  }

  const onProduced = () => {
    if (data) update({ productionSnapshot: captureProductionSnapshot(data) });
  };

  return (
    <main className="min-h-screen bg-ivory">
      <div className="mx-auto flex max-w-6xl items-start gap-10 px-6 py-12 md:py-16">
        <article className="mx-auto w-full max-w-2xl lg:mx-0">
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
            <div className="space-y-10">
              <ServiceStep data={data} update={update} />

              {renderedModel && docHtml && (
                <section className="border-t border-gray-200 pt-8">
                  <PacketPrintOptions
                    model={renderedModel}
                    data={data}
                    noticeDocHtml={docHtml}
                    onProduced={onProduced}
                    disabledKeys={['tenant', 'owner', 'full']}
                  />
                </section>
              )}
            </div>
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
        </article>

        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-8">
            {data && <NoticeSummaryPanel data={data} />}
          </div>
        </aside>
      </div>
    </main>
  );
}
