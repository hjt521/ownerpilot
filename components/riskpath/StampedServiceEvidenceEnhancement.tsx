'use client';

// Optional Issue #393 stamped-photo enhancement layered beside the accepted PR #392 service UI.
// Failure here never blocks ordinary 3-Day service recording or changes legal-sufficiency posture.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ServiceEvent = { id: string; attempt_date: string; method: string };
type ServiceHistory = { ok: boolean; events: ServiceEvent[] };
type StampedDerivative = { id: string; evidence_id: string; server_sha256: string; server_created_at: string };
type StampedHistory = { ok: boolean; derivatives: StampedDerivative[] };
type GeoCapture = {
  geoStatus: 'CAPTURED' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OPTED_OUT';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  geoAltitudeM?: number;
  geoAltitudeAccuracyM?: number;
  geoHeadingDeg?: number;
  geoSpeedMps?: number;
  geoClientCapturedAt?: string;
};

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
        geoAltitudeM: position.coords.altitude ?? undefined,
        geoAltitudeAccuracyM: position.coords.altitudeAccuracy ?? undefined,
        geoHeadingDeg: position.coords.heading ?? undefined,
        geoSpeedMps: position.coords.speed ?? undefined,
        geoClientCapturedAt: new Date(position.timestamp).toISOString(),
      }),
      (error) => resolve({ geoStatus: error.code === error.PERMISSION_DENIED ? 'PERMISSION_DENIED' : 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function eventLabel(event: ServiceEvent): string {
  const method = event.method === 'personal' ? 'Personal' : event.method === 'substituted' ? 'Substituted' : 'Post and mail';
  return `${event.attempt_date} — ${method}`;
}

export function StampedServiceEvidenceEnhancement({ riskpathId, previewMode }: { riskpathId: string; previewMode: boolean }) {
  const endpoint = useMemo(() => `/api/riskpath/${riskpathId}/service`, [riskpathId]);
  const stampedEndpoint = useMemo(() => `${endpoint}/stamped`, [endpoint]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [derivatives, setDerivatives] = useState<StampedDerivative[]>([]);
  const [eventId, setEventId] = useState('');
  const [evidenceKind, setEvidenceKind] = useState('SERVICE_PHOTO');
  const [captureGps, setCaptureGps] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [service, stamped] = await Promise.all([fetch(endpoint, { cache: 'no-store' }), fetch(stampedEndpoint, { cache: 'no-store' })]);
      if (service.ok) setEvents(((await service.json()) as ServiceHistory).events ?? []);
      if (stamped.ok) setDerivatives(((await stamped.json()) as StampedHistory).derivatives ?? []);
    } catch {
      // Optional enhancement stays silent here; the accepted ordinary service UI remains independently usable.
    }
  }, [endpoint, stampedEndpoint]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      await refresh();
      if (!cancelled) timer = setTimeout(() => { void poll(); }, 1000);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  async function addStampedPhoto(file: File, captureClientAt: string) {
    setMessage(null);
    if (!eventId) { setMessage('Choose the factual service event this optional photo belongs to.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size < 1 || file.size > 6 * 1024 * 1024) {
      setMessage('Use an original JPEG or PNG image no larger than 6 MB.');
      return;
    }
    setBusy(true);
    try {
      const geo = await captureLocation(captureGps);
      const device = coarseDeviceMetadata();
      const intentResponse = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({
          action: 'evidence_upload_intent', serviceEventId: eventId, evidenceKind,
          originalFilename: file.name, mimeType: file.type, byteSize: file.size,
          captureSource: 'CAMERA_INTENT', ...geo, ...device,
          clientRecordedAt: new Date().toISOString(), timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          correctionOfEvidenceId: null,
        }),
      });
      const intent = await intentResponse.json().catch(() => ({})) as { bucket?: string; objectPath?: string; uploadToken?: string; evidenceId?: string };
      if (!intentResponse.ok || !intent.bucket || !intent.objectPath || !intent.uploadToken || !intent.evidenceId) {
        setMessage('The optional stamped-photo upload could not be started. The ordinary service record remains available.');
        return;
      }

      const provenance = await fetch(stampedEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ action: 'register_capture_provenance', evidenceId: intent.evidenceId, captureClientAt }),
      });
      if (!provenance.ok) {
        setMessage('Capture provenance could not be frozen before admission. The stamped enhancement stopped fail-closed; ordinary service evidence remains available below.');
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from(intent.bucket)
        .uploadToSignedUrl(intent.objectPath, intent.uploadToken, file, { contentType: file.type });
      if (uploadError) { setMessage('The original image was not uploaded.'); return; }

      const finalize = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ action: 'evidence_finalize', evidenceId: intent.evidenceId }),
      });
      if (!finalize.ok) {
        setMessage('The image uploaded, but original-evidence admission did not complete. No stamped derivative was created.');
        await refresh();
        return;
      }

      const derivative = await fetch(stampedEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ action: 'finalize_stamped_derivative', evidenceId: intent.evidenceId }),
      });
      if (!derivative.ok) {
        setMessage('Original evidence is stored and verified, but the optional stamped derivative was unavailable. The ordinary service record remains available.');
        await refresh();
        return;
      }
      setMessage('Original evidence stored unchanged and verified; separate stamped-photo derivative created.');
      await refresh();
    } catch {
      setMessage('The optional stamped-photo enhancement is unavailable right now. The ordinary service record remains available.');
    } finally {
      setBusy(false);
    }
  }

  async function openDerivative(id: string) {
    try {
      const response = await fetch(stampedEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ action: 'stamped_derivative_read', derivativeId: id }),
      });
      const body = await response.json().catch(() => ({})) as { signedUrl?: string };
      if (!response.ok || !body.signedUrl) { setMessage('The stamped derivative is unavailable right now.'); return; }
      window.open(body.signedUrl, '_blank', 'noopener,noreferrer');
    } catch { setMessage('The stamped derivative is unavailable right now.'); }
  }

  async function openPreviewPos010() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`${endpoint}/pos010-preview`, { cache: 'no-store' });
      if (!response.ok) { setMessage('Preview POS-010 photographic-evidence package could not be generated from the exact stored synthetic facts.'); return; }
      const packageSha = response.headers.get('X-OwnerPilot-POS010-Package-SHA256');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(packageSha ? `Preview POS-010 attachment generated. Package SHA-256: ${packageSha}` : 'Preview POS-010 attachment generated.');
    } catch { setMessage('Preview POS-010 photographic-evidence package is unavailable right now.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-dashed border-gray-400 bg-white p-5 shadow-sm space-y-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Optional enhancement</p>
      <h2 className="mt-1 font-serif text-xl font-bold text-brand">Stamped photo + device location</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">For a 3-Day Notice, this is optional and non-blocking. “Take stamped photo” freezes explicit camera intent and the browser-return capture time, preserves the original image unchanged, and creates a separate readable stamped derivative when possible. OwnerPilot does not use it to determine whether service was legally sufficient. If GPS, provenance, or stamping is unavailable, the ordinary service record remains available.</p>
      <p className="mt-2 text-xs text-gray-500">Existing files belong in the ordinary evidence control below. Even if device GPS is captured when an existing file is uploaded, that remains supplemental evidence and is not contemporaneous stamped-photo evidence.</p>
    </div>
    {message && <div className="rounded-lg border border-rule bg-tint px-4 py-3 text-sm text-gray-800">{message}</div>}
    <label className="block text-sm font-medium text-gray-700">Recorded service event
      <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="">Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{eventLabel(event)}</option>)}
      </select>
    </label>
    <label className="block text-sm font-medium text-gray-700">Photo type
      <select value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="SERVICE_PHOTO">Service photo</option><option value="POSTING_PHOTO">Posting photo</option><option value="MAILING_ENVELOPE_PHOTO">Mailing envelope photo</option>
      </select>
    </label>
    <label className="flex items-start gap-3 rounded-lg border border-rule bg-tint p-3 text-sm text-gray-700">
      <input type="checkbox" checked={captureGps} onChange={(e) => setCaptureGps(e.target.checked)} className="mt-1" />
      <span><span className="font-medium text-gray-900">Try device geolocation for this capture</span><span className="mt-1 block text-xs text-gray-500">Location is requested only for this evidence action. Permission denied, unavailable, or opt-out is preserved factually; coordinates are never fabricated.</span></span>
    </label>
    <label className="inline-flex min-h-[48px] w-fit cursor-pointer items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white">
      Take stamped photo
      <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" disabled={busy} onChange={(e) => {
        const file = e.target.files?.[0];
        const captureClientAt = file ? new Date().toISOString() : null;
        e.currentTarget.value = '';
        if (file && captureClientAt) void addStampedPhoto(file, captureClientAt);
      }} />
    </label>
    {derivatives.length > 0 && <div className="space-y-2 border-t border-rule pt-4">
      <p className="text-sm font-semibold text-gray-800">Stamped derivatives</p>
      {derivatives.map((item) => <div key={item.id} className="rounded-lg bg-tint p-3 text-xs text-gray-600">
        <button type="button" onClick={() => { void openDerivative(item.id); }} className="font-semibold text-brand underline">Open stamped derivative</button>
        <p className="mt-1 break-all">SHA-256: {item.server_sha256}</p>
      </div>)}
    </div>}
    {previewMode && <div className="border-t border-dashed border-gray-300 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Synthetic Preview proof only</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">Generate a deterministic POS-010 supplemental photographic-evidence package from the exact synthetic stored facts. This does not file or e-file anything.</p>
      <button type="button" disabled={busy || derivatives.length < 1} onClick={() => { void openPreviewPos010(); }} className="mt-3 min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Generate Preview POS-010 photo attachment</button>
    </div>}
  </section>;
}
