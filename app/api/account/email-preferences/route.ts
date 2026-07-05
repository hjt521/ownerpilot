// app/api/account/email-preferences/route.ts
// Part B-2 (p1_email_trigger_dependencies_broker_ruling_2026-07-05 B2 safeguard 2). Per-notification-type email
// preferences. GET returns the owner's current opt-out set; POST toggles opt-out for one type (granular, not
// all-or-nothing). Owner-scoped (claimed session + user_id). Opt-out writes a suppression row (reason=opt_out);
// opt-in removes the owner's opt_out rows for that type (bounce/spam suppressions are NOT clearable here).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';

const COOKIE = 'op_chat_token';

// The notification types an owner can manage. Kept explicit so an unknown type can't create junk suppression rows.
const MANAGEABLE_TYPES = ['lahd-confirmation'] as const;

const bodySchema = z.object({
  notification_type: z.enum(MANAGEABLE_TYPES),
  opted_out: z.boolean(),
});

async function authed(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return null;
  return { sb, userId: session.user_id as string };
}

export async function GET(req: NextRequest) {
  const ctx = await authed(req);
  if (!ctx) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { data } = await ctx.sb
    .from('email_notification_suppressions')
    .select('notification_type, reason')
    .eq('user_id', ctx.userId);
  // opted_out types = any type the owner has an opt_out row for.
  const optedOut = (data ?? []).filter((r) => r.reason === 'opt_out').map((r) => r.notification_type);
  return NextResponse.json({ manageableTypes: MANAGEABLE_TYPES, optedOut });
}

export async function POST(req: NextRequest) {
  const ctx = await authed(req);
  if (!ctx) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_preference' }, { status: 400 });
  const { notification_type, opted_out } = parsed.data;

  if (opted_out) {
    // Insert an opt_out suppression if none exists yet (idempotent).
    const { data: existing } = await ctx.sb
      .from('email_notification_suppressions')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('notification_type', notification_type)
      .eq('reason', 'opt_out')
      .limit(1);
    if (!existing?.length) {
      const { error } = await ctx.sb.from('email_notification_suppressions').insert({
        user_id: ctx.userId, notification_type, reason: 'opt_out',
      });
      if (error) return NextResponse.json({ error: 'preference_write_failed' }, { status: 500 });
    }
  } else {
    // Opt back in: remove the owner's opt_out rows for this type only (never touch bounce/spam suppressions).
    const { error } = await ctx.sb
      .from('email_notification_suppressions')
      .delete()
      .eq('user_id', ctx.userId)
      .eq('notification_type', notification_type)
      .eq('reason', 'opt_out');
    if (error) return NextResponse.json({ error: 'preference_write_failed' }, { status: 500 });
  }

  console.info(JSON.stringify({ evt: 'email_preference.updated', user_id: ctx.userId, type: notification_type, opted_out, at: new Date().toISOString() }));
  return NextResponse.json({ ok: true, notification_type, opted_out });
}
