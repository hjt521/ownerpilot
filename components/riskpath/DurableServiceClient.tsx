'use client';

// components/riskpath/DurableServiceClient.tsx
// Cross-device factual service/evidence UI for one exact finalized Created Notice binding.
// No service method, outcome, date, mailing date, or server attestation is inferred or defaulted.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ServiceEventRow {
  id: string;
  attempt_date: string;
  method: 'personal' | 'substituted' | 'post_and_mail';
  outcome: 'SUCCESS' | 'FAILED';
  mailing_date: string | null;
  notes: string | null;
  server_name: string;
  server_address: string;
  server_age18_plus: boolean;
  server_party_to_notice: boolean;
  client_recorded_at: string;
  timezone_offset_minutes: number;
  correction_of_service_event_id: string | null;
  server_received_at: string;
  created_at: string;
}

interface EvidenceRow {
  id: string;
  service_event_id: string;
  evidence_kind: string;
  original_filename: string;
  declared_mime_type: string;
  declared_byte_size: number;
  verified_mime_type: string | null;
  verified_byte_size: number | null;
  image_width_px: number | null;
  image_height_px: number | null;
  capture_source: string;
  geo_status: string;
  geo_source: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  geo_client_captured_at: string | null;
  device_class: string;
  platform_family: string;
  browser_family: string;
  client_recorded_at: string;
  timezone_offset_minutes: number;
  correction_of_evidence_id: string | null;
  server_received_at: string;
  admitted_at: string | null;
  created_at: string;
}

interface HistoryResponse {
  ok: boolean;
  serviceDate: string;
  events: ServiceEventRow[];
  evidence: EvidenceRow[];
}

type GeoCapture = {
  geoStatus: 'CAPTURED' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OPTED_OUT';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  geoClientCapturedAt?: string;
};

function dateLabel(iso: string | null): string {
  if (!iso) return '—';
  const day = iso.slice(0, 10);
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function methodLabel(method: ServiceEventRow['method']): string {
  if (method === 'personal') return 'Personal';
  if (method === 'substituted') return 'Substituted';
  return 'Post and mail';
}

function evidenceKindLabel(kind: string): string {
  return ({
    POSTING_PHOTO: 'Posting photo',
    MAILING_ENVELOPE_PHOTO: 'Mailing envelope photo',
    PROOF_OF_MAILING: 'Proof of mailing',
    SERVICE_PHOTO: 'Service photo',
    OTHER_SERVICE_DOCUMENT: 'Other service document',
  } as Record<string, string>)[kind] ?? 'Evidence';
}

function coarseDeviceMetadata(): { deviceClass: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'UNKNOWN'; platformFamily: string; browserFamily: string } {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  let platformFamily = 'Other';
  if (/Android/i.test(ua)) platformFamily = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platformFamily = 'iOS/iPadOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) platformFamily = 'macOS';
  else if (/Windows/i.test(ua)) platformFamily = 'Windows';
  else if (/Linux/i.test(ua)) platformFamily = 'Linux';

  let browserFamily = 'Other';
  if (/Edg\//i.test(ua)) browserFamily = 'Edge';
  else if (/Firefox\//i.test(ua)) browserFamily = 'Firefox';
  else if (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) browserFamily = 'Chrome';
  else if (/Safari\//i.test(ua)) browserFamily = 'Safari';

  let deviceClass: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'UNKNOWN' = 'UNKNOWN';
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) deviceClass = 'TABLET';
  else if (/Mobile|iPhone|iPod|Android/i.test(ua)) deviceClass = 'MOBILE';
  else if (ua) deviceClass = 'DESKTOP';
  return { deviceClass, platformFamily, browserFamily };
}

async function captureLocation(enabled: boolean): Promise<GeoCapture> {
  if (!enabled) return { geoStatus: 'OPTED_OUT' };
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { geoStatus: 'UNAVAILABLE' };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        geoStatus: 'CAPTURED',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        geoClientCapturedAt: new Date(position.timestamp).toISOString(),
      }),
      (error) => resolve({ geoStatus: error.code === error.PERMISSION_DENIED ? 'PERMISSION_DENIED' : 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export function DurableServiceClient({ riskpathId }: { riskpathId: string }) {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [attemptDate, setAttemptDate] = useState('');
  const [method, setMethod] = useState('');
  const [outcome, setOutcome] = useState('');
  const [mailingDate, setMailingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverAddress, setServerAddress] = useState('');
  const [serverAge18, setServerAge18] = useState('');
  const [serverParty, setServerParty] = useState('');
  const [correctionEventId, setCorrectionEventId] = useState('');

  const [evidenceEventId, setEvidenceEventId] = useState('');
  const [evidenceKind, setEvidenceKind] = useState('');
  const [captureGps, setCaptureGps] = useState(true);
  const [correctionEvidenceId, setCorrectionEvidenceId] = useState('');

  const endpoint = useMemo(() => `/api/riskpath/${riskpathId}/service`, [riskpathId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(endpoint, { cache: 'no-store' });
      if (!r.ok) { setHistory(null); setMessage('Service history is unavailable for this notice.'); return; }
      const body = await r.json() as HistoryResponse;
      setHistory(body);
    } catch {
      setHistory(null);
      setMessage('Service history is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function recordEvent() {
    setMessage(null);
    if (!attemptDate || !method || !outcome || !serverName.trim() || !serverAddress.trim() || !serverAge18 || !serverParty) {
      setMessage('Complete each factual service field before saving this event.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'record_service_event',
          attemptDate,
          method,
          outcome,
          mailingDate: mailingDate || null,
          notes: notes.trim() || null,
          serverName: serverName.trim(),
          serverAddress: serverAddress.trim(),
          serverAge18Plus: serverAge18 === 'yes',
          serverPartyToNotice: serverParty === 'yes',
          clientRecordedAt: new Date().toISOString(),
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          correctionOfServiceEventId: correctionEventId || null,
        }),
      });
      if (!r.ok) { setMessage('The service event could not be saved. No service status was inferred.'); return; }
      setAttemptDate(''); setMethod(''); setOutcome(''); setMailingDate(''); setNotes('');
      setServerName(''); setServerAddress(''); setServerAge18(''); setServerParty(''); setCorrectionEventId('');
      setMessage('Service event saved.');
      await refresh();
    } catch {
      setMessage('The service event could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence(file: File, source: 'CAMERA_INTENT' | 'FILE_PICKER' | 'DOCUMENT_UPLOAD') {
    setMessage(null);
    if (!evidenceEventId || !evidenceKind) {
      setMessage('Choose the service event and evidence type before adding a file.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setMessage('Use a JPEG, PNG, or PDF file.');
      return;
    }
    if (file.size < 1 || file.size > 6 * 1024 * 1024) {
      setMessage('The file must be 6 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      const geo = await captureLocation(captureGps);
      const device = coarseDeviceMetadata();
      const intentResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'evidence_upload_intent',
          serviceEventId: evidenceEventId,
          evidenceKind,
          originalFilename: file.name,
          mimeType: file.type,
          byteSize: file.size,
          captureSource: source,
          ...geo,
          ...device,
          clientRecordedAt: new Date().toISOString(),
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          correctionOfEvidenceId: correctionEvidenceId || null,
        }),
      });
      const intent = await intentResponse.json().catch(() => ({})) as {
        bucket?: string; objectPath?: string; uploadToken?: string; evidenceId?: string;
      };
      if (!intentResponse.ok || !intent.bucket || !intent.objectPath || !intent.uploadToken || !intent.evidenceId) {
        setMessage('Evidence upload could not be started.');
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(intent.bucket)
        .uploadToSignedUrl(intent.objectPath, intent.uploadToken, file, { contentType: file.type });
      if (uploadError) { setMessage('The original file was not uploaded.'); return; }

      const finalize = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action: 'evidence_finalize', evidenceId: intent.evidenceId }),
      });
      if (!finalize.ok) {
        setMessage('The file uploaded, but evidence verification did not complete. It has not been admitted as evidence.');
        await refresh();
        return;
      }
      setCorrectionEvidenceId('');
      setMessage('Evidence stored and verified.');
      await refresh();
    } catch {
      setMessage('Evidence could not be added.');
    } finally {
      setBusy(false);
    }
  }

  async function openEvidence(evidenceId: string) {
    setMessage(null);
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action: 'evidence_read', evidenceId }),
      });
      const body = await r.json().catch(() => ({})) as { signedUrl?: string };
      if (!r.ok || !body.signedUrl) { setMessage('This evidence file is unavailable right now.'); return; }
      window.open(body.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setMessage('This evidence file is unavailable right now.');
    }
  }

  const evidenceForSelectedEvent = (history?.evidence ?? []).filter((e) => e.service_event_id === evidenceEventId);

  return (
    <div className="space-y-8">
      {message && <div className="rounded-lg border border-rule bg-tint px-4 py-3 text-sm text-gray-800">{message}</div>}

      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">This Notice</p>
        <h2 className="mt-1 font-serif text-xl font-bold text-brand">Service record</h2>
        <p className="mt-2 text-sm text-gray-700">Planned service date: {history ? dateLabel(history.serviceDate) : loading ? 'Loading…' : 'Unavailable'}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">Record actual events only after they happen. OwnerPilot stores the facts you enter; it does not decide whether service was legally sufficient.</p>
      </section>

      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-brand">Record an actual service event</h2>
          <p className="mt-1 text-sm text-gray-600">Nothing below is preselected. Enter what actually occurred.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Attempt date
            <input type="date" value={attemptDate} onChange={(e) => setAttemptDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Method
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select what occurred</option><option value="personal">Personal</option><option value="substituted">Substituted</option><option value="post_and_mail">Post and mail</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select outcome</option><option value="SUCCESS">Successful attempt</option><option value="FAILED">Unsuccessful attempt</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Mailing date, if one occurred
            <input type="date" value={mailingDate} onChange={(e) => setMailingDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Server name
            <input value={serverName} onChange={(e) => setServerName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Server address
            <input value={serverAddress} onChange={(e) => setServerAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Server age 18 or older?
            <select value={serverAge18} onChange={(e) => setServerAge18(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select>
          </label>
          <label className="text-sm font-medium text-gray-700">Server a party to the Notice?
            <select value={serverParty} onChange={(e) => setServerParty(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select>
          </label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Notes, if any
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          {(history?.events.length ?? 0) > 0 && <label className="text-sm font-medium text-gray-700 sm:col-span-2">Is this a correction to an earlier event?
            <select value={correctionEventId} onChange={(e) => setCorrectionEventId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">No — new event</option>{history!.events.map((event, index) => <option key={event.id} value={event.id}>Correct event {index + 1}: {dateLabel(event.attempt_date)} — {methodLabel(event.method)}</option>)}
            </select>
          </label>}
        </div>
        <button type="button" disabled={busy} onClick={() => { void recordEvent(); }} className="min-h-[48px] rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Save service event</button>
      </section>

      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-bold text-brand">Service history</h2>
        {loading ? <p className="mt-3 text-sm text-gray-500">Loading…</p> : !history?.events.length ? <p className="mt-3 text-sm text-gray-600">No service events recorded yet.</p> : (
          <ol className="mt-4 space-y-3">
            {history.events.map((event, index) => <li key={event.id} className="rounded-lg border border-rule bg-tint p-4 text-sm">
              <p className="font-semibold text-gray-900">Event {index + 1}: {dateLabel(event.attempt_date)} — {methodLabel(event.method)}</p>
              <p className="mt-1 text-gray-700">Outcome recorded: {event.outcome === 'SUCCESS' ? 'Successful attempt' : 'Unsuccessful attempt'}</p>
              {event.mailing_date && <p className="mt-1 text-gray-700">Mailing date recorded: {dateLabel(event.mailing_date)}</p>}
              <p className="mt-1 text-gray-700">Server: {event.server_name}</p>
              {event.correction_of_service_event_id && <p className="mt-1 text-xs text-gray-500">Recorded as a correction to an earlier event; the earlier event remains in history.</p>}
            </li>)}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-brand">Add service evidence</h2>
          <p className="mt-1 text-sm text-gray-600">Attach an original photo or document to a recorded service event. JPEG, PNG, or PDF; 6 MB maximum.</p>
        </div>
        <label className="block text-sm font-medium text-gray-700">Service event
          <select value={evidenceEventId} onChange={(e) => { setEvidenceEventId(e.target.value); setCorrectionEvidenceId(''); }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select event</option>{(history?.events ?? []).map((event, index) => <option key={event.id} value={event.id}>Event {index + 1}: {dateLabel(event.attempt_date)} — {methodLabel(event.method)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">Evidence type
          <select value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select evidence type</option><option value="POSTING_PHOTO">Posting photo</option><option value="MAILING_ENVELOPE_PHOTO">Mailing envelope photo</option><option value="PROOF_OF_MAILING">Proof of mailing</option><option value="SERVICE_PHOTO">Service photo</option><option value="OTHER_SERVICE_DOCUMENT">Other service document</option>
          </select>
        </label>
        {evidenceForSelectedEvent.length > 0 && <label className="block text-sm font-medium text-gray-700">Is this a correction/replacement record for earlier evidence?
          <select value={correctionEvidenceId} onChange={(e) => setCorrectionEvidenceId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">No — new evidence</option>{evidenceForSelectedEvent.map((asset) => <option key={asset.id} value={asset.id}>{evidenceKindLabel(asset.evidence_kind)} — {asset.original_filename}</option>)}
          </select>
        </label>}
        <label className="flex items-start gap-3 rounded-lg border border-rule bg-tint p-3 text-sm text-gray-700">
          <input type="checkbox" checked={captureGps} onChange={(e) => setCaptureGps(e.target.checked)} className="mt-1" />
          <span><span className="font-medium text-gray-900">Try to capture device location when I add evidence</span><span className="mt-1 block text-xs text-gray-500">Location is requested only for this evidence action. You may turn it off; denied or unavailable location is recorded as such.</span></span>
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex min-h-[48px] cursor-pointer items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white">
            Take photo
            <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) void addEvidence(f, 'CAMERA_INTENT'); }} />
          </label>
          <label className="inline-flex min-h-[48px] cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800">
            Choose existing file
            <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) void addEvidence(f, f.type === 'application/pdf' ? 'DOCUMENT_UPLOAD' : 'FILE_PICKER'); }} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-bold text-brand">Evidence record</h2>
        {!history?.evidence.length ? <p className="mt-3 text-sm text-gray-600">No evidence files recorded yet.</p> : <ul className="mt-4 space-y-3">
          {history.evidence.map((asset) => <li key={asset.id} className="rounded-lg border border-rule bg-tint p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-gray-900">{evidenceKindLabel(asset.evidence_kind)}</p><p className="mt-1 text-gray-600">{asset.original_filename}</p></div><span className="rounded-full border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700">{asset.admitted_at ? 'Stored & verified' : 'Pending verification'}</span></div>
            <p className="mt-2 text-xs text-gray-500">Location: {asset.geo_status.replaceAll('_', ' ').toLowerCase()} · Device: {asset.device_class.toLowerCase()} / {asset.platform_family} / {asset.browser_family}</p>
            {asset.image_width_px && asset.image_height_px && <p className="mt-1 text-xs text-gray-500">Image dimensions: {asset.image_width_px} × {asset.image_height_px}px</p>}
            {asset.correction_of_evidence_id && <p className="mt-1 text-xs text-gray-500">Correction/replacement record; the earlier evidence record remains preserved.</p>}
            {asset.admitted_at && <button type="button" onClick={() => { void openEvidence(asset.id); }} className="mt-3 min-h-[44px] text-sm font-semibold text-brand underline">Open original file</button>}
          </li>)}
        </ul>}
      </section>
    </div>
  );
}
