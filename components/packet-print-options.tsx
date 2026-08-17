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
import { ownerContinuationQrDataUrl, withOwnerContinuationQr } from '@/lib/produce/ownerContinuationQr';
import {
  PRINT_OPTIONS_TITLE,
  PRINT_OPTIONS_SUBTITLE,
  PRINT_CARDS,
  FULL_PACKET_MODAL,
  PRINT_DIALOG_HINT,
  PRINT_DIALOG_HINT_DETAIL,
  PRINT_DIALOG_HINT_BACKGROUNDS,
} from '@/lib/produce/packetCopy';
import { buildNoticePdfFilename } from '@/lib/produce/noticePdfFilename';

/**
 * PacketPrintOptions — RiskPath(TM) Connected Forms Phase 1 print screen.
 * Artifact-use surface after a successful Create Notice action. The four packet
 * cards and Full Packet confirmation modal retain their existing builders/copy.
 * Printing never establishes production authority; Create captures the existing
 * ProductionSnapshot before this component becomes available.
 */
export function PacketPrintOptions({
  model,
  data,
  disabledKeys,
  riskpathId,
}: {
  model: NoticeModel;
  data: NoticeFlowData;
  /** Card keys to render grayed/non-clickable (e.g. 'serviceLog' before serving). */
  disabledKeys?: string[];
  /** Exact server-created RiskPath id. Optional so existing wizard callers remain unchanged. */
  riskpathId?: string;
}) {
  const disabled = new Set(disabledKeys ?? []);
  const [showFullModal, setShowFullModal] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);
  const [continuationError, setContinuationError] = useState<string | null>(null);

  // Same mounted exact-record session: at most one locator issuance attempt. A successful raw scan URL remains
  // browser-memory-only and is reused across Owner/Full/retry prints. Concurrent calls share one in-flight promise.
  const scanUrlRef = useRef<string | null>(null);
  const issuePromiseRef = useRef<Promise<string | null> | null>(null);
  const issuanceAttemptedRef = useRef(false);
  const qrDataUrlRef = useRef<string | null>(null);

  // Smart PDF filename (Save-as-PDF uses the print window's document.title).
  const pdfFilename = buildNoticePdfFilename({
    tenantNames: data.tenantNames,
    streetAddress: data.propertyAddress,
    unit: data.propertyUnit,
  });

  const openPrintable = (html: string, title?: string) => {
    // Same mechanism as the previous Download PDF action: open the styled
    // document and trigger the browser's print-to-PDF. No external dependency.
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    // Seed the browser's suggested PDF filename from the approved format.
    if (title) {
      try {
        w.document.title = title;
      } catch {
        /* cross-window title set can throw in rare cases; ignore. */
      }
    }
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
    openPrintable(html, pdfFilename);
  };

  async function ownerQrDataUrl(): Promise<string | null> {
    if (!riskpathId) return null;
    if (qrDataUrlRef.current) return qrDataUrlRef.current;

    let scanUrl = scanUrlRef.current;
    if (!scanUrl) {
      if (issuanceAttemptedRef.current && !issuePromiseRef.current) return null;
      if (!issuePromiseRef.current) {
        issuanceAttemptedRef.current = true;
        issuePromiseRef.current = (async () => {
          const r = await fetch('/api/owner-continuation/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ riskpathId }),
          });
          if (!r.ok) return null;
          const j = await r.json().catch(() => ({})) as { scanUrl?: string };
          return typeof j.scanUrl === 'string' ? j.scanUrl : null;
        })().then((url) => {
          if (url) scanUrlRef.current = url;
          return url;
        }).finally(() => { issuePromiseRef.current = null; });
      }
      scanUrl = await issuePromiseRef.current;
    }
    if (!scanUrl) return null;

    try {
      const qr = await ownerContinuationQrDataUrl(scanUrl, { size: 220 });
      qrDataUrlRef.current = qr;
      return qr;
    } catch {
      return null; // keep scanUrlRef so a later print can retry QR rendering without issuing another locator
    }
  }

  async function printOwnerPacket(build: () => string) {
    setPacketError(null);
    setContinuationError(null);
    let baseHtml: string;
    try {
      // Build the legal document first. Owner Continuation infrastructure is never a prerequisite to printing it.
      baseHtml = build();
    } catch {
      setPacketError('This packet could not be generated. Please review your entries.');
      return;
    }

    let html = baseHtml;
    const qr = await ownerQrDataUrl();
    if (riskpathId && !qr) {
      setContinuationError('The continuation code could not be added. You can still print this notice.');
    } else if (qr) {
      try { html = withOwnerContinuationQr(baseHtml, qr); }
      catch {
        setContinuationError('The continuation code could not be added. You can still print this notice.');
        html = baseHtml;
      }
    }
    openPrintable(html, pdfFilename);
  }

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
      onClick: () => { void printOwnerPacket(() => buildOwnerRecordCopyHtml(model, data)); },
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

      {/* Browser-print guidance (Option A): window.print() can't suppress the
          browser's own header/footer, so tell the user how to get a clean PDF. */}
      <div className="rounded-lg border border-rule bg-tint px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{PRINT_DIALOG_HINT}</p>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{PRINT_DIALOG_HINT_DETAIL}</p>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{PRINT_DIALOG_HINT_BACKGROUNDS}</p>
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
      {continuationError && (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          {continuationError}
        </div>
      )}

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
                  void printOwnerPacket(() => buildFullPacketHtml(model, data));
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

export function NoticePreview({ html }: { html: string }) {
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
