// lib/privacy/suppression.ts
// Lane 6 / ruling §4.4 — analytics suppression registry. HASH-keyed (never raw email). Written on opt_out;
// checked at email-send / marketing points. NOTE: the anonymous server-event MP route carries no email (PII
// denylist forbids it), so suppression gates EMAIL-keyed sending (ack cron, future marketing), not the
// anonymous analytics route — surfaced for broker confirm.

import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');
}

function svc(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Add an email (by hash) to the suppression registry. Idempotent (PK on email_hash). */
export async function suppressEmail(email: string, source = 'privacy_request_opt_out'): Promise<void> {
  await svc().from('analytics_suppression_list').upsert(
    { email_hash: hashEmail(email), source },
    { onConflict: 'email_hash' },
  );
}

/** True if the email (by hash) is suppressed. Used at email-send points, not the anonymous analytics route. */
export async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await svc()
    .from('analytics_suppression_list')
    .select('email_hash')
    .eq('email_hash', hashEmail(email))
    .maybeSingle();
  return !!data;
}
