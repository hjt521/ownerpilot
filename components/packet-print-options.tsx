'use client';

import { useEffect, useRef, useState } from 'react';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import {
  buildTenantServiceCopyHtml,
  buildOwnerRecordCopyHtml,
  buildServiceLogHtml,
  buildFullPacketHtml,
} from '@/lib/produce/buildPacketHtml';
import {
  PRINT_OPTIONS_TITLE,
  PRINT_OPTIONS_SUBTITLE,
  PRINT_CARDS,
  FULL_PACKET_MODAL,
} from '@/lib/produce/packetCopy';

/**
 * PacketPrintOptions — RiskPath(TM) Connected Forms Phase 1 print screen.
 * Renders on Review once the produce gate passes: the notice preview (moved
 * verbatim from the previous Download PDF block) plus the four packet print
 * cards and the Full Packet confirmation modal (copy from packetCopy, spec
 * verbatim). Printing any document fires onProduced (the B1 stale-guard
 * snapshot in the parent).
 */
export function PacketPrintOptions({
  model,
  data,
  noticeDocHtml,
  onProduced,
  disabledKeys,
}: {
  model: NoticeModel;
  data: NoticeFlowData;
  noticeDocHtml: string;
  onProduced: () => void;
  /** Card keys to render grayed/non-clickable (e.g. 'serviceLog' before serving). */
  disabledKeys?: string[];
}) {
  const disabled = new Set(disabledKeys ?? []);
  const [showFullModal, setShowFullModal] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);

  const openPrintable = (html: string) => {
    // Same mechanism as the previous Download PDF action: open the styled
    // document and trigger the browser's print-to-PDF. No external dependency.
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const printPacket = (build: () => string) => {
    setPacketError(null);
    let html: string;
    try {
      html = build();
    } catch {
      setPacketError('This packet could not be generated. Please review your entries.');
      return;
    }
    onProduced();
    openPrintable(html);
  };

  const cards: { key: string; title: string; description: string; onClick: () => void }[] = [
    {
      key: 'tenant',
      title: PRINT_CARDS.tenant.title,
      description: PRINT_CARDS.tenant.description,
      onClick: () => printPacket(() => buildTenantServiceCopyHtml(model)),
    },
    {
      key: 'owner',
      title: PRINT_CARDS.owner.title,
      description: PRINT_CARDS.owner.description,
      onClick: () => printPacket(() => buildOwnerRecordCopyHtml(model, data)),
    },
    {
      key: 'serviceLog',
      title: PRINT_CARDS.serviceLog.title,
      description: PRINT_CARDS.serviceLog.description,
      onClick: () => printPacket(() => buildServiceLogHtml(model, data)),
    },
    {
      key: 'full',
      title: PRINT_CARDS.full.title,
      description: PRINT_CARDS.full.description,
      onClick: () => setShowFullModal(true),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Print options */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{PRINT_OPTIONS_TITLE}</h2>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{PRINT_OPTIONS_SUBTITLE}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((c) =>
          disabled.has(c.key) ? (
            <div
              key={c.key}
              aria-disabled="true"
              className="rounded-lg border border-rule bg-tint px-4 py-3 text-left opacity-60 cursor-not-allowed"
            >
              <span className="block font-semibold text-gray-900">{c.title}</span>
              <span className="block text-sm text-gray-500">{c.description}</span>
              <span className="mt-1 block text-xs font-medium text-gray-500">
                Available after you serve &mdash; use the Serve &amp; Track page.
              </span>
            </div>
          ) : (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="rounded-lg border border-rule bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-brand hover:bg-tint"
            >
              <span className="block font-semibold text-gray-900">{c.title}</span>
              <span className="block text-sm text-gray-500">{c.description}</span>
            </button>
          ),
        )}
      </div>

      {packetError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {packetError}
        </div>
      )}

      {/* Notice preview (moved verbatim from the previous Download PDF block) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Notice preview</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          This is a broker-prepared draft for your review. Sign it in ink before
          serving, and serve it on the date shown. The proof of service is
          completed after you serve — not before.
        </p>
        <ScaledNoticePreview html={noticeDocHtml} />
      </div>

      {/* Full Packet confirmation modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{FULL_PACKET_MODAL.title}</h3>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{FULL_PACKET_MODAL.body}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {FULL_PACKET_MODAL.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFullModal(false);
                  printPacket(() => buildFullPacketHtml(model, data));
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {FULL_PACKET_MODAL.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Scale-to-fit notice preview ---------------------------------------------
// The produced document is letter width (8.5in = 816px at CSS 96dpi), which is
// wider than the wizard column. Render it at true width inside the iframe and
// scale the iframe down to the available column width, like a PDF thumbnail.
const PREVIEW_PAGE_WIDTH_PX = 816;
const PREVIEW_VIEWPORT_HEIGHT_PX = 640;

function ScaledNoticePreview({ html }: { html: string }) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / PREVIEW_PAGE_WIDTH_PX));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-100 p-4">
      <div ref={measureRef} className="w-full">
        <div
          className="mx-auto overflow-hidden"
          style={{
            width: PREVIEW_PAGE_WIDTH_PX * scale,
            height: PREVIEW_VIEWPORT_HEIGHT_PX,
          }}
        >
          <iframe
            title="Notice preview"
            srcDoc={html}
            className="border border-gray-200 bg-white shadow-sm"
            style={{
              width: PREVIEW_PAGE_WIDTH_PX,
              height: PREVIEW_VIEWPORT_HEIGHT_PX / scale,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    </div>
  );
}
