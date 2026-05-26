import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for Client Components (runs in the browser).
 *
 * With no cookie methods supplied, @supabase/ssr reads/writes the session via
 * `document.cookie`, staying in sync with the cookies the server sets.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
