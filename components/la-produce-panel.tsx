'use client';
/**
 * LA produce panel (Phase 2D client wiring §3). Renders for a confirmed_la notice
 * when the produce-overlay is wired. Runs the server-gated sequence
 * (verify-la → la-packet), then:
 *   - blocked / error → the locked block copy (produce NOT offered);
 *   - ready → the LAHD filing prompt + acknowledgment; only after the owner
 *     acknowledges does it expose the notice print (PacketPrintOptions) + the two
 *     RTC PDF downloads, and write the produce audit fields.
 *
 * The notice can never be printed without the RTC attachment: PacketPrintOptions
 * is mounted only inside the acknowledged-ready branch.
 */
import { useEffect, useMemo, useState } from 'react';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { PacketPrintOptions } from './packet-print-options';
import { runLaProduceSequence, type LaProduceSequenceResult, type LaProduceAuditFields } from '@/lib/produce/laProduceClient';
import { isLaProductionUnblocked } from '@/lib/jurisdiction/laRtcRules';
import {
  lahdFilingPromptHeader,
  lahdFilingPromptBody,
  lahdFilingChannelsList,
  lahdFilingPromptCopyVersion,
} from '@/lib/copy/lahd/lahdFilingPromptCopy';
import {
  JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE,
  JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED_MESSAGE,
} from '@/lib/flow/jurisdictionSupersession';

function downloadBase64Pdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function LaProducePanel({
  model,
  data,
  noticeDocHtml,
  baseName,
  verdictSource,
  onProduced,
  onAudit,
}: {
  model: NoticeModel;
  data: NoticeFlowData;
  noticeDocHtml: string;
  baseName: string;
  /** cachedResolverVerdict.source ('live_resolver' | 'broker_confirm'). */
  verdictSource: string;
  onProduced: () => void;
  onAudit: (fields: LaProduceAuditFields) => void;
}) {
  const [state, setState] = useState<LaProduceSequenceResult | { kind: 'loading' }>({ kind: 'loading' });
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    runLaProduceSequence({
      verdict: 'confirmed_la',
      lahdCopyVersion: lahdFilingPromptCopyVersion,
      baseName,
      // Bind to the global — bare `fetch` called as deps.fetchImpl(...) throws
      // "Illegal invocation" (same bug fixed in the jurisdiction bridge).
      fetchImpl: (...args: Parameters<typeof fetch>) => fetch(...args),
    })
      .then((r) => { if (active) setState(r); })
      .catch(() => { if (active) setState({ kind: 'error', detail: 'sequence failed' }); });
    return () => { active = false; };
  }, [baseName]);

  const blockMessage = useMemo(() => {
    if (state.kind === 'blocked') {
      return state.code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE'
        ? JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE
        : JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED_MESSAGE;
    }
    if (state.kind === 'error') return JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED_MESSAGE;
    return null;
  }, [state]);

  if (state.kind === 'loading') {
    return <p className="text-base text-gray-500">Preparing the Los Angeles forms…</p>;
  }
  if (blockMessage) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
        <p className="text-base text-amber-900 leading-relaxed">{blockMessage}</p>
      </div>
    );
  }
  if (state.kind !== 'ready') {
    return <p className="text-base text-gray-500">Preparing the Los Angeles forms…</p>;
  }

  const attachments = state.attachments;
  const onAck = (checked: boolean) => {
    setAcked(checked);
    if (checked) {
      onAudit({
        rtcFormHashes: state.metadata?.rtcFormHashes ?? null,
        rtcFormLastModified: state.metadata?.rtcFormLastModified ?? null,
        rtcRefreshRunAt: state.metadata?.rtcRefreshRunAt ?? null,
        lahdFilingPromptCopyVersion,
        lahdFilingPromptAcknowledgedAt: new Date().toISOString(),
        isLaProductionUnblockedAtProduce: isLaProductionUnblocked(),
        cachedResolverVerdictSource: verdictSource,
      });
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-rule bg-tint px-5 py-4">
        <h3 className="font-serif text-base font-bold text-brand">{lahdFilingPromptHeader}</h3>
        <p className="mt-2 text-sm text-gray-800 leading-relaxed">{lahdFilingPromptBody}</p>
        <p className="mt-3 text-sm text-gray-800 leading-relaxed whitespace-pre-line">{lahdFilingChannelsList}</p>
        <label className="mt-4 flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={acked} onChange={(e) => onAck(e.target.checked)} className="mt-1 min-h-[20px] min-w-[20px]" />
          <span className="text-sm text-gray-900 leading-relaxed">
            I understand I must file this notice with LAHD within 3 business days of service, and I will attach the Right-to-Counsel notice (English and Spanish) when serving.
          </span>
        </label>
      </section>

      {acked && (
        <>
          <section className="rounded-lg border border-rule bg-white px-5 py-4">
            <p className="text-sm font-semibold text-brand mb-2">Required Los Angeles attachments</p>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Both the English and Spanish Notice of Right to Counsel must be served with this notice.
            </p>
            <div className="flex flex-wrap gap-3">
              {attachments.map((a) => (
                <button
                  key={a.filename}
                  type="button"
                  onClick={() => downloadBase64Pdf(a.filename, a.contentBase64)}
                  className="inline-flex min-h-[48px] items-center px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-bar transition-colors"
                >
                  Download {a.filename.endsWith('_es.pdf') ? 'Spanish' : 'English'} RTC notice
                </button>
              ))}
            </div>
          </section>

          <PacketPrintOptions
            model={model}
            data={data}
            noticeDocHtml={noticeDocHtml}
            onProduced={onProduced}
            disabledKeys={['serviceLog']}
          />
        </>
      )}
    </div>
  );
}
