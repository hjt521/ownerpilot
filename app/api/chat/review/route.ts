// app/api/chat/review/route.ts
// GET: grouped review data for the current cookie session (account number masked).
// PATCH: inline-edit one field — validate+coerce against the locked schema, re-merge (confidence 1.0 = owner-confirmed),
// re-run the completion gate, persist. Anti-echo: never returns the full account number.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { groupIntakeForReview, validateFieldEdit } from '@/lib/chat/reviewFields';
import { INTAKE_FIELD, type IntakeState } from '@/lib/chat/intakeSchema';
import { missingRequiredFields } from '@/lib/chat/intakeMerge';

const COOKIE = 'op_chat_token';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const session = await loadSession(token);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });
  return NextResponse.json({
    groups: groupIntakeForReview(session.intake_state ?? {}),
    intakeComplete: session.intake_complete,
    missingFields: missingRequiredFields(session.intake_state ?? {}),
  });
}

const patchSchema = z.object({ field: INTAKE_FIELD, value: z.string() });

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'field + value required' }, { status: 400 });

  const edit = validateFieldEdit(parsed.data.field, parsed.data.value);
  if (!edit.ok) return NextResponse.json({ error: edit.error }, { status: 400 });

  // Owner-confirmed inline edit → confidence 1.0 (beats any prior model-extracted value).
  const nextState: IntakeState = {
    ...(session.intake_state ?? {}),
    [parsed.data.field]: { value: edit.value, confidence: 1, updated_at: new Date().toISOString() },
  };
  const missing = missingRequiredFields(nextState);
  await sb.from('chat_sessions').update({
    intake_state: nextState,
    intake_complete: missing.length === 0 && session.intake_complete,
    updated_at: new Date().toISOString(),
  }).eq('id', session.id);

  return NextResponse.json({ groups: groupIntakeForReview(nextState), missingFields: missing });
}
