// app/api/notices/[riskpathId]/lahd-filing-record/route.ts
// PR-C LAHD filing-completion endpoint (§6.3). Records the owner's attestation that they filed the served notice
// with LAHD, as an insert-only compliance artifact. Owner-scoped (service-role client + claimed session, user_id
// gate — same posture as produce-audit / staleness-ack). Insert-only; a correction inserts a new row.
// Source: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §6.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { lahdFilingRecordBodySchema, COVER_SHEET_REVISION } from '@/lib/riskpath/lahdFilingRecord';
import { sendLahdConfirmationEmail } from '@/lib/email/resend';
import { getOwnerNotifyContext, isOwnerSuppressed, decideLahdConfirmationSend } from '@/lib/email/ownerNotify';

const COOKIE = 'op_chat_token';

/**
 * B-2 send path (p1_email_trigger_dependencies_broker_ruling_2026-07-05). Best-effort, dark-safe: sends a
 * LAHD-confirmation email ONLY when a confirmation_ref exists, the owner consented, they are not suppressed, and
 * no email has already gone out for this filing (idempotency per riskpath). Never throws into the record write —
 * the filing record already landed; a send failure is logged, not surfaced. Also inert until RESEND is configured
 * (sendLahdConfirmationEmail no-ops) and until the owner completes the consent gate.
 */
async function maybeSendLahdConfirmation(
  sb: ReturnType<typeof serviceClient>,
  args: { userId: string; riskpathId: string; filingRecordId: string; confirmationRef: string | null; filingDate: string },
): Promise<void> {
  try {
    if (!args.confirmationRef || !args.confirmationRef.trim()) return;

    // Idempotency: if any filing record for this riskpath already has a confirmation email stamped, do not resend.
    const { data: sentRows } = await sb
      .from('lahd_filing_records')
      .select('id')
      .eq('riskpath_id', args.riskpathId)
      .not('confirmation_email_sent_at', 'is', null)
      .limit(1);
    const alreadySent = (sentRows?.length ?? 0) > 0;

    const ctx = await getOwnerNotifyContext(sb, args.userId, 'lahd-filing-record');
    if (!ctx) return;
    const suppressed = await isOwnerSuppressed(sb, args.userId, 'lahd-confirmation');

    const decision = decideLahdConfirmationSend({
      confirmationRef: args.confirmationRef, ackAt: ctx.ackAt, suppressed, alreadySent,
    });
    if (!decision.send) {
      console.info(JSON.stringify({ evt: 'lahd_confirmation.skip', reason: decision.reason, user_id: args.userId, at: new Date().toISOString() }));
      return;
    }

    await sendLahdConfirmationEmail(ctx.email, args.confirmationRef.trim(), args.filingDate);
    await sb.from('lahd_filing_records').update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', args.filingRecordId);
    console.info(JSON.stringify({ evt: 'lahd_confirmation.sent', user_id: args.userId, at: new Date().toISOString() }));
  } catch (e) {
    console.warn('lahd-confirmation send failed (record already saved) —', (e as Error).message);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ riskpathId: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { riskpathId } = await params;

  const parsed = lahdFilingRecordBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_filing_record', detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const { data: row } = await sb
    .from('riskpath_records')
    .select('id')
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await sb
    .from('lahd_filing_records')
    .insert({
      riskpath_id: riskpathId,
      chat_session_id: session.id,
      filing_date: parsed.data.filing_date,
      filing_channel: parsed.data.filing_channel,
      cover_sheet_revision: COVER_SHEET_REVISION,
      // B1: optional owner-supplied LAHD confirmation reference (null when omitted). The send path (B-2) reads
      // this to decide whether a LAHD-confirmation email goes out; B-1 only captures it.
      confirmation_ref: parsed.data.confirmation_ref ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'filing_record_write_failed', detail: error.message }, { status: 500 });

  // B-2: best-effort owner-facing confirmation email (dark-safe; see maybeSendLahdConfirmation). Awaited so the
  // idempotency stamp lands before the response, but it never throws into this handler.
  await maybeSendLahdConfirmation(sb, {
    userId: session.user_id,
    riskpathId,
    filingRecordId: data.id,
    confirmationRef: parsed.data.confirmation_ref ?? null,
    filingDate: parsed.data.filing_date,
  });

  return NextResponse.json({ ok: true, id: data.id });
}
