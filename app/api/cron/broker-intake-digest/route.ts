// app/api/cron/broker-intake-digest/route.ts
// Part A of p1_email_trigger_dependencies_broker_ruling_2026-07-05 — broker-intake-digest cron. Fires daily;
// counts intakes parked in the awaiting-review state and, when non-empty, emails the reviewing broker alias the
// ratified BROKER_INTAKE_DIGEST_EMAIL_BODY_V1 with the count + review-checklist link.
//
// SHIPS DARK (A3): FF-3 is dark under omnibus_broker_ruling_2026-07-04 guardrail 2, so `awaiting_broker_review`
// rows cannot exist yet — count is always 0 and the cron no-ops (logs, no email). It also no-ops if
// BROKER_REVIEW_EMAIL is unset (pre-provisioning). When FF-3 is separately authorized to go live, the digest
// starts firing automatically — no code deploy, no ruling-coordination gap.
//
// Failure mode (A3): query or send failing → retry once after 60s → if still failing, alert ADMIN_EMAILS
// (NOT review@) with the error detail and stop. No indefinite retry.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendBrokerIntakeDigestEmail, sendAdminAlertEmail } from '@/lib/email/resend';
import { AWAITING_REVIEW_STATUS, decideDigestSend } from '@/lib/cron/brokerIntakeDigest';

// Allow the single 60s retry delay (A3 failure mode) without hitting the function timeout.
export const maxDuration = 90;

const RETRY_DELAY_MS = 60_000;
const DEFAULT_REVIEW_URL = 'https://ownerpilot.ai/broker-review';

function svc(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Count chat_sessions parked in the awaiting-review state. Throws on query error (caller handles retry). */
async function countAwaitingReview(sb: SupabaseClient): Promise<number> {
  const { count, error } = await sb
    .from('chat_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('ff3_capture_status', AWAITING_REVIEW_STATUS);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Run `fn` once; on failure wait 60s and run once more; on second failure alert ADMIN_EMAILS and rethrow. */
async function withOneRetryThenAlert<T>(fn: () => Promise<T>, evt: string, alertSubject: string): Promise<T> {
  try {
    return await fn();
  } catch (first) {
    await sleep(RETRY_DELAY_MS);
    try {
      return await fn();
    } catch (second) {
      const detail = (second as Error).message;
      console.error(JSON.stringify({ evt, detail, at: new Date().toISOString() }));
      // The alert itself must never throw out of the cron (best-effort).
      await sendAdminAlertEmail(alertSubject, `Failed twice (retry after 60s).\n\nError: ${detail}`).catch(() => {});
      throw second;
    }
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = svc();
  const recipient = process.env.BROKER_REVIEW_EMAIL;
  const reviewUrl = process.env.BROKER_REVIEW_URL ?? DEFAULT_REVIEW_URL;
  const at = new Date().toISOString();

  // Count (retry-once-then-alert per A3).
  let count: number;
  try {
    count = await withOneRetryThenAlert(
      () => countAwaitingReview(sb),
      'broker_digest.query_failed',
      'OwnerPilot broker-intake-digest: awaiting-review query failed',
    );
  } catch {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const decision = decideDigestSend(count, recipient);
  if (decision.action === 'skip') {
    // Dark behavior: log and exit, no email. (empty_queue = the expected steady state until FF-3 is live.)
    console.info(JSON.stringify({ evt: 'broker_digest.skip', reason: decision.reason, count, at }));
    return NextResponse.json({ ok: true, sent: false, count, reason: decision.reason });
  }

  // count > 0 and recipient configured → send the ratified digest body (retry-once-then-alert per A3).
  try {
    await withOneRetryThenAlert(
      () => sendBrokerIntakeDigestEmail(recipient!, count, reviewUrl),
      'broker_digest.send_failed',
      'OwnerPilot broker-intake-digest: send failed',
    );
  } catch {
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }

  // Audit the send. Recipient is the internal review@ alias (not owner PII); log its domain only, per the
  // standing "never log a full recipient address" discipline.
  console.info(JSON.stringify({
    evt: 'broker_digest.sent',
    count,
    recipient_domain: recipient!.split('@')[1] ?? '',
    at,
  }));
  return NextResponse.json({ ok: true, sent: true, count });
}
