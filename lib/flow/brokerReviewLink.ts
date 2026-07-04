/**
 * Broker-review status-link helpers (Decision 2 UI slice, §3).
 *
 * The saved "review link" carries the opaque token in the URL FRAGMENT (#t=...),
 * not the query string — a fragment is never sent to the server (no access logs,
 * no Referer leakage), which is the right posture for a bearer-style token. The
 * status page reads the fragment client-side and calls /status with it.
 *
 * Pure (no DOM) so it is unit-testable; the React surfaces import these.
 */

export const BROKER_REVIEW_STATUS_PATH = '/broker-review/status';

/** Token shape: 64-hex (256-bit), matching generateRequesterToken(). */
const TOKEN_RE = /\b([0-9a-f]{64})\b/;

/** Build the saved status link path for a freshly minted token. */
export function buildStatusLinkPath(token: string): string {
  return `${BROKER_REVIEW_STATUS_PATH}#t=${token}`;
}

/** Absolute status link given an origin (used in the "save this link" notice). */
export function buildStatusLinkAbsolute(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}${buildStatusLinkPath(token)}`;
}

/**
 * Extract a token from anything the owner might paste — a full URL, a path, or
 * the raw token — accepting it in a #t=/?t= param or bare. Returns null if no
 * well-formed 64-hex token is present.
 */
export function parseTokenFromLink(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // Prefer an explicit t= param (fragment or query) if present.
  const param = s.match(/[#?&]t=([0-9a-f]{64})\b/);
  if (param) return param[1];
  // Otherwise accept a bare 64-hex token anywhere in the string.
  const bare = s.match(TOKEN_RE);
  return bare ? bare[1] : null;
}
