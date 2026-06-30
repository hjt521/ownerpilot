// lib/decision2/db.ts
// Lane 5 Decision 2 — service-role Supabase client for broker-confirm server routes.
// SERVICE_ROLE key is server-only (no NEXT_PUBLIC_). If the repo already exports a service-role client,
// re-export from there instead of constructing a second one.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function serviceRoleClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
