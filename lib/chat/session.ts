/**
 * Product-session gate for the help chatbox (Jack's decision 2026-06-07).
 *
 * This is NOT authentication. No login, no credentials, no PII. The server issues
 * a pseudonymous random session id as an HttpOnly cookie on first contact; the
 * chat endpoint reads it on each request to give rate limiting a stable, anonymous
 * thing to count against. A user clicking in from an ad just starts chatting — the
 * cookie is set silently in the background.
 *
 * Soft boundary by design: clearing cookies yields a fresh session. That trades a
 * little robustness for zero user friction, which is the point of the session-gate
 * (vs. login) choice. A hard boundary would require real auth and is out of scope.
 */

export const SESSION_COOKIE = 'op_sid';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Pseudonymous, unguessable session id. Web Crypto is present in node + edge. */
export function newSessionId(): string {
  return crypto.randomUUID();
}

/** Extract the session id from a raw Cookie header, or null if absent/malformed. */
export function parseSessionId(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) {
      const val = decodeURIComponent(v.join('='));
      // accept only uuid-shaped values (the only thing we ever set)
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        ? val
        : null;
    }
  }
  return null;
}

/** Build the Set-Cookie header value for a session id. HttpOnly (not readable by
 *  JS), SameSite=Lax, Secure, Path=/. No personal data — just the random id. */
export function sessionCookie(id: string): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join('; ');
}
