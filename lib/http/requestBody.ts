// lib/http/requestBody.ts
// Canonical request-body reader for API routes. Dispatches on Content-Type — it does NOT rely on req.formData()
// throwing on a JSON body. On Vercel's serverless runtime req.formData() returns an EMPTY FormData (instead of
// throwing) for a JSON body, so the old "formData-first, catch → json" pattern silently read every field as null
// and rejected requests with 400. This bit /api/privacy-request (#139) and then /api/waitlist — hence one shared
// reader + a CI guard (scripts/ci/verify_route_body_parsing.mjs) that forbids direct req.formData() in routes.
//
// Behavior: application/json (and unknown/empty) → parsed JSON object; multipart/x-www-form-urlencoded → the form
// entries as a plain object (text fields are strings). Never throws — returns {} on an unparseable body so the
// caller's schema validation produces the 400, not a 500.

export interface BodyReadable {
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  formData(): Promise<FormData>;
}

export async function readRequestBody(req: BodyReadable): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData().catch(() => null);
    if (!form) return {};
    return Object.fromEntries(form.entries());
  }
  // application/json, or unknown/empty content-type → best-effort JSON (the app always sends JSON).
  const parsed = (await req.json().catch(() => ({}))) as unknown;
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
}
