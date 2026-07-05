// components/riskpath/Dashboard.tsx — claimed-only RiskPath records list with status badges + document links.
// PR-B Surface 2 (§4.2): each row renders a staleness banner (ratified copy) when its produced face has drifted
// from the current intake; the owner can dismiss (recorded as a §5 acknowledgment) or go to Review to re-produce.

'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { statusMeta, type StatusTone } from '@/lib/riskpath/statusLabels';
import {
  chatLahdFilingChecklistHeader, chatLahdFilingChecklistBody,
  chatLahdFilingChannelsPreferred, chatLahdFilingChannelsAlternative,
  chatLahdFilingCoverSheetLabel, chatLahdFilingRecordButton,
} from '@/lib/chat/lahdFilingCopy';

interface Staleness {
  hasSnapshot: boolean;
  stale: boolean;
  reason?: 'AMOUNT_CHANGED' | 'FACE_FIELD_CHANGED' | null;
  changedFields?: string[];
  warning?: string | null;
}
interface LahdState {
  eligible: boolean;
  latestFiling?: { filing_date: string; filing_channel: string } | null;
}
interface RecordVM {
  id: string; current_state: string; notice_document_id: string | null;
  counsel_route_trigger: string | null; created_at: string; updated_at: string;
  staleness?: Staleness;
  lahd?: LahdState;
}

/** Render locked copy that contains a single markdown [label](url) link as text + an anchor (trusted content). */
function withMarkdownLinks(text: string): ReactNode {
  const m = text.match(/^([^[]*)\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <a href={m[3]} target="_blank" rel="noopener noreferrer" className="underline">{m[2]}</a>
      {m[4]}
    </>
  );
}

const CHANNEL_LABEL: Record<string, string> = {
  online_portal: 'the LAHD online portal',
  mail_with_cover_sheet: 'mail with the cover sheet',
  other: 'another method',
};

/** PR-C §7.3 — LAHD filing section on the riskpath row (LA-eligible rows only). */
function LahdFilingSection({ record }: { record: RecordVM }) {
  const [filed, setFiled] = useState(record.lahd?.latestFiling ?? null);
  const [date, setDate] = useState('');
  const [channel, setChannel] = useState<'online_portal' | 'mail_with_cover_sheet' | 'other'>('online_portal');
  const [conf, setConf] = useState('');
  const [emailMe, setEmailMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function record_() {
    setErr(null);
    if (!date) { setErr('Enter the date you filed.'); return; }
    setBusy(true);
    // B-2 consent gate: if the owner opted to be emailed the confirmation, record their one-time consent BEFORE
    // the filing record lands, so the send trigger sees ack_at set. Best-effort — never blocks recording.
    if (emailMe && conf) {
      await fetch('/api/account/email-consent', { method: 'POST' }).catch(() => null);
    }
    const r = await fetch(`/api/notices/${record.id}/lahd-filing-record`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // B1: confirmation_ref is optional — sent only if the owner typed one; the record lands either way.
      body: JSON.stringify({ filing_date: date, filing_channel: channel, confirmation_ref: conf || undefined }),
    }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) { setErr('Could not record the filing. Please try again.'); return; }
    setFiled({ filing_date: date, filing_channel: channel });
  }

  return (
    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3" data-testid="lahd-filing-section">
      <p className="text-sm font-semibold text-blue-900">{chatLahdFilingChecklistHeader}</p>
      {filed ? (
        <p className="mt-1 text-sm text-blue-900">Filed on {filed.filing_date} via {CHANNEL_LABEL[filed.filing_channel] ?? filed.filing_channel}.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-blue-900 leading-relaxed">{chatLahdFilingChecklistBody}</p>
          <ul className="mt-2 space-y-1 text-sm text-blue-900">
            <li>{withMarkdownLinks(chatLahdFilingChannelsPreferred)}</li>
            <li>{withMarkdownLinks(chatLahdFilingChannelsAlternative)}</li>
          </ul>
          <a href={`/api/notices/${record.id}/lahd-cover-sheet`} target="_blank" rel="noopener noreferrer"
             className="mt-2 inline-block min-h-[44px] text-sm font-medium text-blue-900 underline">
            {chatLahdFilingCoverSheetLabel}
          </a>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-blue-900">Date filed
              <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)}
                className="mt-1 block min-h-[44px] rounded border border-blue-300 px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-blue-900">How
              <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}
                className="mt-1 block min-h-[44px] rounded border border-blue-300 px-2 py-1 text-sm">
                <option value="online_portal">Online portal</option>
                <option value="mail_with_cover_sheet">Mail with cover sheet</option>
                <option value="other">Other</option>
              </select>
            </label>
            {/* B1: optional LAHD confirmation reference. Does not block the record. (Full "add later from your
                filing history" path lands in B-2 with the edit surface; hint kept accurate to what exists now.) */}
            <label className="text-xs text-blue-900">Confirmation reference (optional)
              <input type="text" value={conf} maxLength={64} onChange={(e) => setConf(e.target.value)}
                placeholder="Paste the number LAHD emailed you, if you have it"
                className="mt-1 block min-h-[44px] w-56 rounded border border-blue-300 px-2 py-1 text-sm" />
            </label>
            {/* B-2 consent gate: only meaningful with a confirmation reference. Records a one-time consent to
                email filing-record confirmations to the account address; owner can turn it off anytime in
                preferences. */}
            <label className={`flex items-center gap-2 text-xs ${conf ? 'text-blue-900' : 'text-blue-400'}`}>
              <input type="checkbox" checked={emailMe} disabled={!conf} onChange={(e) => setEmailMe(e.target.checked)}
                className="min-h-[20px] min-w-[20px]" />
              Email me a copy for my records
            </label>
            <button onClick={record_} disabled={busy}
              className="min-h-[44px] rounded-md bg-blue-900 px-4 py-2 text-sm text-white disabled:opacity-40">
              {chatLahdFilingRecordButton}
            </button>
          </div>
          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
        </>
      )}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  progress: 'bg-blue-50 text-blue-800',
  resolved: 'bg-green-50 text-green-800',
  attention: 'bg-amber-50 text-amber-800',
};

// §4.4 transitional fallback (engineer-authored, not locked prose): rows produced before staleness tracking.
const STALENESS_FALLBACK =
  'This notice was produced before staleness tracking was enabled. If you have edited your details since producing it, please re-produce before serving.';

export function Dashboard() {
  const [records, setRecords] = useState<RecordVM[] | null>(null);
  const [unauth, setUnauth] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/riskpath').then(async (r) => {
      if (r.status === 401) { setUnauth(true); return; }
      const d = await r.json(); setRecords(d.records ?? []);
    });
  }, []);

  // §5: record the banner dismissal as a compliance acknowledgment, then hide it locally.
  async function dismissStaleBanner(rec: RecordVM) {
    const s = rec.staleness;
    if (s?.reason) {
      await fetch(`/api/notices/${rec.id}/staleness-ack`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staleness_reason: s.reason, changed_fields: s.changedFields ?? [], action_taken: 'dismiss_banner' }),
      }).catch(() => {});
    }
    setDismissed((prev) => new Set(prev).add(rec.id));
  }

  if (unauth) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Your RiskPath</h1>
        <p className="mt-4">Sign in with the link we emailed you to view your saved records.</p>
        <a href="/chat" className="mt-6 inline-block min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">Start a notice</a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Your RiskPath</h1>
      {records === null && <p className="mt-4 text-neutral-400">Loading…</p>}
      {records?.length === 0 && <p className="mt-4 text-neutral-600">No records yet. When you generate a notice, it will appear here.</p>}
      <ul className="mt-6 space-y-3">
        {records?.map((r) => {
          const meta = statusMeta(r.current_state);
          const showStaleWarning = r.staleness?.stale && r.staleness.warning && !dismissed.has(r.id);
          const showFallback = r.staleness?.hasSnapshot === false;
          return (
            <li key={r.id} className="rounded-lg border border-neutral-200 p-4">
              {showStaleWarning && (
                <div className="mb-3 rounded-md border border-amber-400 bg-amber-50 p-3" data-testid="staleness-banner">
                  <p className="text-sm text-amber-900 leading-relaxed">{r.staleness!.warning}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <a href="/chat/review" className="min-h-[44px] text-sm font-medium text-amber-900 underline">Review &amp; produce a new notice</a>
                    <button onClick={() => dismissStaleBanner(r)} className="min-h-[44px] text-sm text-neutral-600 underline">Dismiss</button>
                  </div>
                </div>
              )}
              {showFallback && (
                <div className="mb-3 rounded-md border border-neutral-200 bg-neutral-50 p-3" data-testid="staleness-fallback">
                  <p className="text-sm text-neutral-700 leading-relaxed">{STALENESS_FALLBACK}</p>
                </div>
              )}
              {r.lahd?.eligible && <LahdFilingSection record={r} />}
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>
                <span className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.counsel_route_trigger && (
                <p className="mt-2 text-sm text-amber-700">Counsel-route: {r.counsel_route_trigger}</p>
              )}
              {r.notice_document_id && (
                <a href={`/api/documents/${r.notice_document_id}`} className="mt-2 inline-block min-h-[44px] text-sm underline">
                  View notice PDF
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
