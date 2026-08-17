'use client';
/**
 * LA produce panel (Phase 2D client wiring §3). Renders for a confirmed_la notice
 * when the produce-overlay is wired. Runs the server-gated sequence
 * (verify-la → la-packet), then:
 *   - blocked / error → the locked block copy (Create is NOT offered);
 *   - ready → the LAHD filing prompt + acknowledgment;
 *   - acknowledged + current C6 → Create Notice;
 *   - prepared → existing notice print + RTC PDF downloads.
 *
 * UX2 preserves the LA acknowledgment as a separate conditional testimony.
 * Download/print is artifact use after Create and no longer establishes
 * production authority.
 */
import { useEffect, useMemo, useState } from 'react';
import type { NoticeModel } from '@/lib/produce/renderNotice';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { PacketPrintOptions } from './packet-print-options';
import { runLaProduceSequence, type LaProduceSequenceResult, type LaProduceAuditFields } from '@/lib/produce/laProduceClient';
import { boundFetch } from '@/lib/http/boundFetch';
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
  baseName,
  verdictSource,
  riskpathId,
  noticePrepared,
  canCreate,
  onCreateNotice,
  onAudit,
}: {
  model: NoticeModel;
  data: NoticeFlowData;
  baseName: string;
  /** cachedResolverVerdict.source ('live_resolver' | 'broker_confirm'). */
  verdictSource: string;
  /** Exact server-created RiskPath row when this caller has one (chat produce path). */
  riskpathId?: string;
  /** True only when this exact prepared generation has completed Create (wizard UX2). */
  noticePrepared?: boolean;
  /** Current final C6 + deterministic gate eligibility for the current generation (wizard UX2). */
  canCreate?: boolean;
  onCreateNotice?: () => void;
  /** Legacy chat-mount compatibility only; wizard UX2 does not use print as Create authority. */
  noticeDocHtml?: string;
  /** Legacy chat-mount compatibility only; existing chat caller's state is observational. */
  onProduced?: () => void;
  onAudit: (fields: LaProduceAuditFields) => void;
}) {
  const [state, setState] = useState<LaProduceSequenceResult | { kind: 'loading' }>({ kind: 'loading' });
  const [acked, setAcked] = useState(false);
  const ux2CreateMode =
    typeof noticePrepared === 'boolean' &&
    typeof canCreate === 'boolean' &&
    typeof onCreateNotice === 'function';

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    runLaProduceSequence({
      verdict: 'confirmed_la',
      lahdCopyVersion: lahdFilingPromptCopyVersion,
      baseName,
      // Global-bound fetch (lib/http/boundFetch). Never pass bare `fetch`: called
      // as deps.fetchImpl(...) it rebinds `this` and throws "Illegal invocation".
      fetchImpl: boundFetch,
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

          {!ux2CreateMode ? (
            <PacketPrintOptions
              model={model}
              data={data}
              riskpathId={riskpathId}
              disabledKeys={['serviceLog']}
            />
          ) : !noticePrepared ? (
            <section className="rounded-lg border border-rule bg-white px-5 py-4">
              <h3 className="font-semibold text-gray-900">Create Notice</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Create the notice after the final confirmation above is current. Download and
                print remain available after creation.
              </p>
              <button
                type="button"
                data-testid="create-notice-button"
                onClick={() => onCreateNotice?.()}
                disabled={!canCreate}
                className="mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Notice
              </button>
              {!canCreate && (
                <p className="mt-2 text-xs text-gray-500">
                  Complete the final Review &amp; Confirm step before creating.
                </p>
              )}
            </section>
          ) : (
            <PacketPrintOptions
              model={model}
              data={data}
              riskpathId={riskpathId}
              disabledKeys={['serviceLog']}
            />
          )}
        </>
      )}
    </div>
  );
}
