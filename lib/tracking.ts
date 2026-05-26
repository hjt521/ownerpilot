import { cookies } from 'next/headers'

/**
 * Canonical campaign-attribution values. Mirrors the users.referring_source
 * enum in supabase/migrations/001_initial_schema.sql — keep the two in sync.
 */
export type ReferringSource =
  | 'google-crisis'
  | 'facebook-retiree'
  | 'facebook-inheritor'
  | 'instagram-inheritor'
  | 'linkedin-tech'
  | 'email-business'
  | 'organic'
  | 'unknown'

/** Cookie written by proxy.ts. */
export const SOURCE_COOKIE = 'pp_source'

const VALID_SOURCES = new Set<ReferringSource>([
  'google-crisis',
  'facebook-retiree',
  'facebook-inheritor',
  'instagram-inheritor',
  'linkedin-tech',
  'email-business',
  'organic',
  'unknown',
])

/**
 * Read the first-touch attribution captured by proxy.ts and return the
 * referring_source to persist on the users row at signup.
 *
 * Call server-side (Server Action or Route Handler) during signup, e.g.:
 *   const source = await trackConversion()
 *   await supabase.from('users').update({ referring_source: source }).eq('id', user.id)
 *
 * Falls back to 'unknown' when the cookie is missing or tampered, so the
 * returned value is always a valid enum member and never breaks the insert.
 */
export async function trackConversion(): Promise<ReferringSource> {
  const store = await cookies()
  const value = store.get(SOURCE_COOKIE)?.value

  if (value && VALID_SOURCES.has(value as ReferringSource)) {
    return value as ReferringSource
  }
  return 'unknown'
}
