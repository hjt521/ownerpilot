// components/riskpath/CourtesyReminderBuilder.tsx
// Owner-copy-only courtesy reminder (§B.7): tone selector → editable draft → Copy Text / Open SMS App / Save to RiskPath.
// §2.5 disclaimer always shown. Per-tone templates are [BROKER COPY REQUIRED] until the addendum lands.

'use client';
import { useState } from 'react';
import {
  COURTESY_REMINDER_DISCLAIMER, REMINDER_TONES, toneTemplate, buildSmsUrl, type ReminderTone,
} from '@/lib/riskpath/courtesyReminder';

export function CourtesyReminderBuilder({ riskpathRecordId }: { riskpathRecordId: string }) {
  const [tone, setTone] = useState<ReminderTone>('friendly');
  const [body, setBody] = useState(toneTemplate('friendly'));
  const [saved, setSaved] = useState(false);

  function pickTone(t: ReminderTone) { setTone(t); setBody(toneTemplate(t)); }

  async function save(channel: 'owner_copy' | 'sms_app_handoff') {
    const r = await fetch('/api/riskpath/courtesy-reminder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskpath_record_id: riskpathRecordId, tone, message_text: body, channel }),
    });
    if (r.ok) setSaved(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Courtesy reminder</h1>
      <p className="mt-2 text-sm text-neutral-600">{COURTESY_REMINDER_DISCLAIMER}</p>

      <div className="mt-6 flex gap-2">
        {REMINDER_TONES.map((t) => (
          <button key={t} onClick={() => pickTone(t)}
            className={`min-h-[44px] rounded-md border px-4 py-2 text-sm capitalize ${tone === t ? 'border-neutral-900 font-medium' : 'border-neutral-300'}`}>
            {t}
          </button>
        ))}
      </div>

      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
        className="mt-4 w-full rounded-md border border-neutral-300 p-3 text-base" aria-label="Reminder draft" />

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => { navigator.clipboard?.writeText(body); save('owner_copy'); }}
          className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">Copy text</button>
        <a href={buildSmsUrl(body)} onClick={() => save('sms_app_handoff')}
          className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">Open SMS app</a>
        <button onClick={() => save('owner_copy')} className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">Save to RiskPath</button>
        <a href="/notice/3-day" className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">Continue to 3-Day Notice</a>
      </div>
      {saved && <p className="mt-3 text-sm text-green-700">Saved to your RiskPath.</p>}
    </main>
  );
}
