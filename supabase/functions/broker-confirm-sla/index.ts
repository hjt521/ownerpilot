// supabase/functions/broker-confirm-sla/index.ts
// Lane 5 Decision 2 — hourly SLA sweep edge function. Byte-exact from master prompt §6.
// SLA_CRON_EXPRESSION MUST match migration 024's cron schedule (enforced by ci:verify-broker-confirm-sla-sync).

// Repo edge-function convention (see supabase/functions/deno.d.ts): Deno.serve built-in +
// the `npm:` specifier for supabase-js — not the https://deno.land / https://esm.sh imports.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SLA_CRON_EXPRESSION = '0 * * * *';  // MUST match migration 024

Deno.serve(async () => {
  // createClient is loosely typed by the deno.d.ts shim (returns unknown); cast to the rpc surface we use.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ) as { rpc: (fn: string) => Promise<{ error: { message: string } | null }> };

  const { error } = await supabase.rpc('mark_expired_broker_confirms');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, expression: SLA_CRON_EXPRESSION }));
});
