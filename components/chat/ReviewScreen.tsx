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
        {/* Group 4 — notice-rail produce. intendedServiceDate carried through as the facial serviceDate. */}
        <button disabled={!canGenerate}
          onClick={() => { window.location.href = `/api/notice/produce/from-chat?intendedServiceDate=${encodeURIComponent(serviceDate)}`; }}
          className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white disabled:opacity-40">
          Generate notice PDF
        </button>
        {/* Group 3 — magic-link send-draft */}
        <button onClick={() => { window.location.href = '/chat/review?send=1'; }}
          className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">
          Send myself this draft
        </button>
      </div>
    </main>
  );
}
