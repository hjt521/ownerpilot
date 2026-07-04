// lib/safety/captcha.ts
// Lane P6 — CAPTCHA (abuse throttling) verification for public forms. Cloudflare Turnstile siteverify via REST
// (no dependency). Reusable by any public intake surface (the retail funnel). Source: BROKER STANDING ORDER
// 2026-07-03 §2 P6 ("CAPTCHA / abuse throttling").
//
// Posture:
//   - Not configured (no TURNSTILE_SECRET_KEY) → allow + flag `configured:false` (rollout: form works before the
//     captcha secret is provisioned; the caller logs the unconfigured pass).
//   - Configured + token verifies → allow.
//   - Configured + token invalid/absent → BLOCK.
//   - Configured + Cloudflare verify error → BLOCK ('verify_error') — fail-closed on a public abuse surface
//     (Turnstile siteverify is highly available; a submission we cannot verify is not trusted).

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface CaptchaResult {
  ok: boolean;
  configured: boolean;
  reason?: 'missing_token' | 'invalid_token' | 'verify_error';
}

/** Verify a Turnstile token server-side. `now`/fetch mockable for tests via globalThis.fetch. */
export async function verifyCaptchaToken(token: string | null | undefined, remoteIp?: string): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, configured: false };
  if (!token) return { ok: false, configured: true, reason: 'missing_token' };

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) return { ok: false, configured: true, reason: 'verify_error' };
    const json = (await res.json().catch(() => ({}))) as { success?: boolean };
    return json.success === true
      ? { ok: true, configured: true }
      : { ok: false, configured: true, reason: 'invalid_token' };
  } catch {
    return { ok: false, configured: true, reason: 'verify_error' };
  }
}
