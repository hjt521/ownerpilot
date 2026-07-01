// components/chat/ReviewScreen.tsx
// Renders grouped captured fields with inline edit; CTAs for produce (Group 4) + send-draft magic-link (Group 3).
// Account number arrives already masked from /api/chat/review (G8).
//
// PR-A2 (daycount_defect_workflow_fork_broker_ruling_2026-06-30 §2.3 + field-placement ruling §1): the intended
// service date is captured HERE (Review-step date picker, placement (a)), drives the facial day-count in real time
// (req 5), and is the value produce computes against (Dated = serviceDate = intendedServiceDate).

'use client';
import { useEffect, useMemo, useState } from 'react';
import { computeCompliancePeriod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { validateIntendedServiceDate, MAX_LEAD_DAYS } from '@/lib/dates/intendedServiceDate';
import { intendedServiceDateExplainer } from '@/lib/flow/intendedServiceDateCopy';
// PR-A3 §5.2 core — client produce path (Fork B(ii) rail-caller + Fork A(iii) client verdict resolution).
// Source: pr_a3_produce_handoff_fork_ruling_2026-07-01.md.
import { planProduce, type ProducePlan } from '@/lib/chat/reviewProduce';
import { renderNotice } from '@/lib/produce/renderNotice';
import { buildNoticeDocumentHtml } from '@/lib/produce/buildNoticeHtml';
import { LaProducePanel } from '@/components/la-produce-panel';
import { isLaProductionUnblocked } from '@/lib/jurisdiction/laRtcRules';
import { boundFetch } from '@/lib/http/boundFetch';
import { chatStalenessAckButton } from '@/lib/chat/stalenessCopy';

interface ReviewField { field: string; label: string; display: string; sensitive: boolean; }
interface ReviewGroup { heading: string; fields: ReviewField[]; }

function isoDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

/** Pure client-side recompute of the facial expiration for a candidate service date. */
function computeExpiration(serviceDate: string): { expiration: string | null; error: string | null } {
  const v = validateIntendedServiceDate(serviceDate, isoDay(0));
  if (!v.ok) return { expiration: null, error: v.message ?? 'Invalid service date.' };
  try {
    const year = Number(serviceDate.slice(0, 4));
    const holidays = getVerifiedHolidaySet(year);
    const period = computeCompliancePeriod({ serviceDate, serviceMethod: 'personal', holidays });
    return { expiration: period.expirationDate, error: null };
  } catch {
    return { expiration: null, error: 'The holiday calendar for that year is not available yet.' };
  }
}

export function ReviewScreen() {
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);

  // PR-A2: intended service date — default = today (a valid "generate-and-serve-same-day" value).
  const today = useMemo(() => isoDay(0), []);
  const maxDate = useMemo(() => isoDay(MAX_LEAD_DAYS), []);
  const [serviceDate, setServiceDate] = useState<string>(today);
  const [expiration, setExpiration] = useState<string | null>(null);
  const [dateErr, setDateErr] = useState<string | null>(null);

  // PR-A3 §5.2 core — produce mode. idle → working → ready (LA overlay or stub) | error.
  // PR-B Surface 1: a `stale` phase interposes when the face drifted since a prior produce (warn-then-require-
  // new-row; the owner must acknowledge before a new row is produced). The produce rail is never called until
  // the owner clicks Generate.
  interface StaleInfo { warning: string; reason: 'AMOUNT_CHANGED' | 'FACE_FIELD_CHANGED'; changedFields: string[]; priorRiskpathId: string; }
  const [produce, setProduce] = useState<
    { phase: 'idle' | 'working' | 'ready' | 'error' | 'stale'; plan?: ProducePlan; error?: string; stale?: StaleInfo }
  >({ phase: 'idle' });

  async function onGenerate(opts?: { acknowledged?: boolean }) {
    setProduce({ phase: 'working' });
    try {
      const r = await fetch('/api/notice/produce/from-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intendedServiceDate: serviceDate, acknowledgedStaleness: opts?.acknowledged === true }),
      });
      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        if (j.error === 'routed_to_counsel' && typeof j.href === 'string') { window.location.href = j.href; return; }
        // PR-B Surface 1: the face drifted since the prior produce — warn + require an explicit acknowledgment.
        if (j.error === 'stale_notice' && j.staleness?.warning) {
          setProduce({ phase: 'stale', stale: { warning: j.staleness.warning, reason: j.staleness.reason, changedFields: j.staleness.changedFields ?? [], priorRiskpathId: j.priorRiskpathId } });
          return;
        }
        setProduce({ phase: 'error', error: 'This notice needs review before it can be produced.' });
        return;
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setProduce({ phase: 'error', error: j.detail ?? j.error ?? 'We couldn’t start producing the notice. Please try again.' });
        return;
      }
      const env = await r.json();
      // Fork A(iii): resolve jurisdiction client-side reusing the wizard resolver; Fork B(ii): the rail is
      // called client-side (inside LaProducePanel) for the confirmed_la branch.
      const plan = await planProduce(env, { isGateOpen: isLaProductionUnblocked, fetchImpl: boundFetch });
      setProduce({ phase: 'ready', plan });
    } catch {
      setProduce({ phase: 'error', error: 'Something went wrong producing the notice. Please try again.' });
    }
  }

  // PR-B §5: record the staleness acknowledgment (compliance artifact) on the prior stale row before acting.
  async function recordStalenessAck(
    s: StaleInfo, action: 'proceed_to_reproduce' | 'cancel_at_generate',
  ) {
    await fetch(`/api/notices/${s.priorRiskpathId}/staleness-ack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staleness_reason: s.reason, changed_fields: s.changedFields, action_taken: action }),
    }).catch(() => {});
  }

  async function load() {
    const r = await fetch('/api/chat/review');
    if (!r.ok) { setErr('No review session found. Start a chat first.'); return; }
    const d = await r.json(); setGroups(d.groups); setMissing(d.missingFields ?? []);
  }
  useEffect(() => { load(); }, []);

  // req 5 — real-time recompute: the displayed expiration updates in the same render cycle as the date edit.
  useEffect(() => {
    const { expiration: exp, error } = computeExpiration(serviceDate);
    setExpiration(exp);
    setDateErr(error);
  }, [serviceDate]);

  async function saveEdit(field: string) {
    setErr(null);
    const r = await fetch('/api/chat/review', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: draft }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error ?? 'Could not save.'); return; }
    setGroups(d.groups); setMissing(d.missingFields ?? []); setEditing(null); setDraft('');
  }

  const canGenerate = missing.length === 0 && !!expiration && !dateErr;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Review your details</h1>
      <p className="mt-2 text-sm text-neutral-600">Check every detail before we generate the PDF. Edit anything that&apos;s off.</p>

      {groups.map((g) => (
        <section key={g.heading} className="mt-6 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-medium">{g.heading}</h2>
          <dl className="mt-3 space-y-2">
            {g.fields.map((f) => (
              <div key={f.field} className="flex items-start justify-between gap-3">
                <dt className="text-sm text-neutral-500">{f.label}</dt>
                <dd className="flex-1 text-right text-sm">
                  {editing === f.field ? (
                    <span className="flex items-center justify-end gap-2">
                      <input value={draft} onChange={(e) => setDraft(e.target.value)}
                        className="min-h-[44px] w-48 rounded border border-neutral-300 px-2 py-1 text-left" autoFocus />
                      <button onClick={() => saveEdit(f.field)} className="min-h-[44px] text-sm underline">Save</button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-2">
                      <span>{f.display}</span>
                      <button onClick={() => { setEditing(f.field); setDraft(f.sensitive ? '' : f.display === '—' ? '' : f.display); }}
                        className="min-h-[44px] text-xs underline text-neutral-500">Edit</button>
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* PR-A2 — intended service date + real-time facial-date recompute */}
      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="font-medium">Service date</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <label htmlFor="intended-service-date" className="text-sm text-neutral-500">
            Date you intend to serve
          </label>
          <input
            id="intended-service-date"
            type="date"
            value={serviceDate}
            min={today}
            max={maxDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="min-h-[48px] rounded border border-neutral-300 px-3 py-2 text-right"
          />
        </div>
        <p className="mt-3 text-sm" data-testid="expiration-display">
          <span className="text-neutral-500">3-day notice expires: </span>
          <span className="font-medium">{expiration ? formatLong(expiration) : '—'}</span>
        </p>
        {dateErr && <p className="mt-2 text-sm text-red-600">{dateErr}</p>}
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">{intendedServiceDateExplainer}</p>
      </section>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {missing.length > 0 && (
        <p className="mt-4 text-sm text-amber-700">Still needed before generating: {missing.join(', ')}.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {/* PR-A3 §5.2 core — produce path. POSTs the from-chat envelope (§5.1), resolves the jurisdiction
            verdict client-side (Fork A(iii)), then renders: LA overlay for confirmed_la (Fork B(ii) rail-caller
            inside LaProducePanel), or a stub for the non-LA / manual-review / unresolved branches this pass. */}
        <button disabled={!canGenerate || produce.phase === 'working'}
          onClick={() => onGenerate()}
          className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white disabled:opacity-40">
          {produce.phase === 'working' ? 'Preparing your notice…' : 'Generate notice PDF'}
        </button>
        {/* Group 3 — magic-link send-draft */}
        <button onClick={() => { window.location.href = '/chat/review?send=1'; }}
          className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">
          Send myself this draft
        </button>
      </div>

      {produce.phase === 'error' && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{produce.error}</p>
          <button onClick={() => onGenerate()} className="mt-2 min-h-[44px] text-sm underline">Try again</button>
        </div>
      )}

      {/* PR-B Surface 1: staleness warning — warn-then-require-new-row. The owner must acknowledge (a compliance
          artifact) before a new notice is produced. Ratified copy (server-filled {{changedFields}}). */}
      {produce.phase === 'stale' && produce.stale && (
        <div className="mt-6 rounded-lg border border-amber-400 bg-amber-50 p-4" data-testid="staleness-warning">
          <p className="text-sm text-amber-900 leading-relaxed">{produce.stale.warning}</p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={async () => { const s = produce.stale!; await recordStalenessAck(s, 'proceed_to_reproduce'); onGenerate({ acknowledged: true }); }}
              className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
              {chatStalenessAckButton}
            </button>
            <button
              onClick={async () => { const s = produce.stale!; await recordStalenessAck(s, 'cancel_at_generate'); setProduce({ phase: 'idle' }); }}
              className="min-h-[44px] text-sm underline text-neutral-600">
              Cancel — let me review first
            </button>
          </div>
        </div>
      )}

      {produce.phase === 'ready' && produce.plan && (
        produce.plan.route.kind === 'la_overlay'
          ? <LaProduceMount plan={produce.plan} />
          : <ProduceStub reason={produce.plan.route.reason} />
      )}
    </main>
  );
}

/**
 * LA green path (§5.2 core): render the notice from the chat-assembled NoticeFlowData (wizard parity — same
 * renderNotice) and mount the server-gated LaProducePanel (verify-la → la-packet → LAHD prompt → print).
 */
function LaProduceMount({ plan }: { plan: ProducePlan }) {
  const [, setProduced] = useState(false);
  let html: string | null = null;
  let model: ReturnType<typeof renderNotice>['model'] | null = null;
  let renderErr: string | null = null;
  try {
    const rendered = renderNotice({ data: plan.data, dates: plan.dates });
    model = rendered.model;
    html = buildNoticeDocumentHtml(model);
  } catch {
    renderErr = 'The notice could not be generated. Please review your entries.';
  }
  if (renderErr || !model || !html) {
    return <p className="mt-6 text-sm text-red-600">{renderErr ?? 'The notice could not be generated.'}</p>;
  }
  return (
    <section className="mt-8">
      <LaProducePanel
        model={model}
        data={plan.data}
        noticeDocHtml={html}
        baseName={plan.baseName}
        verdictSource="live_resolver"
        onProduced={() => setProduced(true)}
        // §5.2 produce-audit fast-follow (pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md
        // §2): persist the LA produce audit (RTC hashes + LAHD ack) onto the riskpath record — compliance
        // parity with the wizard's flow-state persistence. Wizard onAudit is untouched.
        onAudit={(f) => {
          void fetch(`/api/notices/${plan.riskpathId}/produce-audit`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ laProduceAudit: f }),
          }).catch(() => {});
        }}
      />
    </section>
  );
}

/**
 * §5.2-core stub for the non-LA / manual-review / unresolved / gate-closed branches: WIRED and routed
 * correctly, intentionally minimal. Full branch UX + copy, non-LA production, broker-confirm (Decision B), and
 * the save-and-resume link (chatIntakeCaptureEscalation) are the fast-follow (fork ruling §5).
 */
function ProduceStub({ reason }: { reason: string }) {
  return (
    <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4" data-testid={`produce-stub-${reason}`}>
      <p className="text-sm text-neutral-700">
        We can’t finish producing this notice automatically in this version. We’ve saved your details — you can
        come back and pick up where you left off.
      </p>
    </section>
  );
}
