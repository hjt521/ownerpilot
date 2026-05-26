import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * `cookies()` is async in Next.js 16, so this factory is async too — always
 * `await createClient()`. Session refresh itself happens in proxy.ts (see
 * lib/supabase/middleware.ts); the empty-catch below covers the case where
 * this client is used during a Server Component render, where cookies are
 * read-only and `set` throws.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // proxy.ts refreshes the session on each request, so this is safe.
          }
        },
      },
    },
  )
}
