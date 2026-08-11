"use client";
/**
 * Serve & Track — actual-event task for the exact created Notice.
 * Notice identity comes only from the validated CreatedNoticeArtifactEnvelope;
 * current serviceAttempts / successfulServiceAttemptId remain the event source.
 */
import { useEffect, useState } from 'react';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { loadDraft, saveDraft } from '@/lib/flow/persistence';
import { renderNotice, formatNoticeDate, formatPropertyLine } from '@/lib/produce/renderNotice';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import { buildNoticeDocumentHtml } from '@/lib/produce/buildNoticeHtml';
import { restoreServiceTaskContext } from '@/lib/flow/serviceTaskPresentation';
import { ServiceStep } from './notice-flow';
import { NoticeSummaryPanel } from './notice-summary-panel';
import { PacketPrintOptions } from './packet-print-options';

function displayCreatedDate(createdAtISO: string): string {
  const day = createdAtISO.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? formatNoticeDate(day) : 'Created';
}

export function ServeTrack() {
  const [data, setData] = useState<NoticeFlowData | null>(null);
  const [draftPageIndex, setDraftPageIndex] = useState(0);
  const [draftFound, setDraftFound] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    setDraftFound(!!draft);
    if (draft) {
      setData(draft.data);
      setDraftPageIndex(draft.pageIndex);
    }
    setChecked(true);
  }, []);

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

  const serviceContext = data ? restoreServiceTaskContext(data) : null;

  let docHtml: string | null = null;
  let renderedModel: NoticeModel | null = null;
  if (serviceContext) {
    try {
      const rendered = renderNotice({
        data: serviceContext.serviceData,
        dates: serviceContext.artifact.dates,
      });
      docHtml = buildNoticeDocumentHtml(rendered.model);
      renderedModel = rendered.model;
    } catch {
      docHtml = null;
      renderedModel = null;
    }
  }

  const noticeData = serviceContext?.noticeData;
  const attempts = data?.serviceAttempts ?? [];
  const propertyLine = noticeData
    ? formatPropertyLine(noticeData.propertyAddress ?? '', noticeData.propertyUnit)
    : '';
  const tenants = noticeData
    ? (noticeData.tenantNames ?? []).map((name) => name.trim()).filter(Boolean).join(', ')
    : '';
  const plannedDate = noticeData?.serviceDate && /^\d{4}-\d{2}-\d{2}$/.test(noticeData.serviceDate)
    ? formatNoticeDate(noticeData.serviceDate)
    : 'Not set';

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
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight mb-2">
            Record service
          </h1>
          <p className="text-sm text-gray-700 leading-relaxed mb-8">
            Record an actual attempt only after it happens.
          </p>

          {!checked ? null : serviceContext && data && noticeData ? (
            <div className="space-y-8">
              <section className="rounded-xl border border-rule bg-white px-5 py-5 shadow-sm space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    This Notice
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-brand">
                    You are recording service for this Notice
                  </h2>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Property</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">{propertyLine || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Tenant(s)</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">{tenants || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Created</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {displayCreatedDate(serviceContext.artifact.createdAtISO)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Current service status</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {serviceContext.display.statusLabel}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-rule bg-tint px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {attempts.length > 0 ? 'Original plan' : 'Plan'}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Planned service: {plannedDate}</p>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  Plan only — no service has been recorded from this date.
                </p>
              </section>

              <ServiceStep data={data} update={update} />

              {renderedModel && docHtml && (
                <section className="border-t border-gray-200 pt-8">
                  <PacketPrintOptions
                    model={renderedModel}
                    data={serviceContext.serviceData}
                    disabledKeys={['tenant', 'owner', 'full']}
                  />
                </section>
              )}
            </div>
          ) : draftFound && data?.productionSnapshot ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
              <h3 className="font-semibold text-amber-950 mb-1">The exact created Notice isn&apos;t available</h3>
              <p className="text-sm text-amber-900 leading-relaxed mb-3">
                Return to the Notice and create it again before recording service.
              </p>
              <a href="/notice/3-day" className="text-sm font-semibold text-brand hover:underline">
                Go to 3-Day Notice &rarr;
              </a>
            </div>
          ) : draftFound ? (
            <div className="rounded-lg border border-rule bg-white px-5 py-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1">This Notice hasn&apos;t been created yet</h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Finish Review &amp; Confirm and Create Notice before recording service.
              </p>
              <a href="/notice/3-day" className="text-sm font-semibold text-brand hover:underline">
                Go to 3-Day Notice &rarr;
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-rule bg-white px-5 py-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1">No created Notice found on this browser</h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Serve &amp; Track works from a Notice that has already been created.
              </p>
              <a href="/notice/3-day" className="text-sm font-semibold text-brand hover:underline">
                Go to 3-Day Notice &rarr;
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
