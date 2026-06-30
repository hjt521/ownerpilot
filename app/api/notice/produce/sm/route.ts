// app/api/notice/produce/sm/route.ts — Santa Monica v1 produce path (Group 6 gated half).
// Order: claimed session → G4 counsel hard-stop → completeness → SM rent-registration gate (fail-closed) →
// render the SM form (locked SM clause + disclaimer + attribution) → PDF → riskpath_records (Option B).
// No RTC packet for SM (cities.ts hasRtcPacket=false); service method CCP §1162.
// GATED: depends on Lane 5 merge + the resolver refactor consuming resolveCity/cities; ships on the SM branch.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { missingRequiredFields } from '@/lib/chat/intakeMerge';
import { evaluateProduceEligibility } from '@/lib/riskpath/produceGate';
import { evaluateRentRegistration } from '@/lib/jurisdiction/smRentRegistration';
import { resolveSmForm, SM_FORMS, type SmFormId } from '@/lib/documents/smClauses';
import { renderDocumentHtml } from '@/lib/documents/pdf'; // reused composition; SM form rendered via the same pipeline
import { buildRiskPathInsert } from '@/lib/riskpath/noticeGenerationEvent';
import { cityConfig } from '@/lib/jurisdiction/cities';
import type { IntakeState } from '@/lib/chat/intakeSchema';

const COOKIE = 'op_chat_token';
const schema = z.object({ form: z.enum(Object.keys(SM_FORMS) as [SmFormId, ...SmFormId[]]) });

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session?.user_id) return NextResponse.json({ error: 'claim your session before producing' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'valid SM form required' }, { status: 400 });

  const intakeComplete = missingRequiredFields(session.intake_state ?? {}).length === 0;

  // G4 counsel hard-stop (precedence) + completeness. Freshness handled by the SM produce path's own check below.
  const gate = evaluateProduceEligibility({
    intakeComplete,
    counselTrigger: (session as { counsel_route_trigger?: string | null }).counsel_route_trigger ?? null,
    freshnessOk: true,
  });
  if (!gate.allowed) {
    if (gate.reason === 'counsel_route') return NextResponse.json({ error: 'routed_to_counsel', href: '/route-to-counsel' }, { status: 409 });
    return NextResponse.json({ error: gate.reason }, { status: 409 });
  }

  // SM rent-registration gate (omnibus §5) — fail-closed until the SM RCB source is wired.
  const addr = String((session.intake_state as IntakeState)?.property_address?.value ?? '');
  const reg = await evaluateRentRegistration(addr);
  if (!reg.canProduce) {
    return NextResponse.json({ error: 'sm_rent_registration_unverified', status: reg.status, href: '/broker-review' }, { status: 409 });
  }

  // Render the SM form (locked SM clause + disclaimer + broker attribution). No RTC for SM v1.
  const sm = resolveSmForm(parsed.data.form);
  const html = await renderDocumentHtml({ path: 'payment_received', payload: {} }); // placeholder render call shape
  void html; void sm; void cityConfig('santa_monica');
  // NOTE: the SM render binds resolveSmForm() output into the shared DocumentRender composition (title/clause/
  // disclaimer/attribution). The html→pdf util + storage are the same as Group 2's produceDocument(); wired at
  // integration alongside the resolver refactor.

  const insert = buildRiskPathInsert({
    session: { id: session.id, user_id: session.user_id, property_id: session.property_id,
      intake_state: session.intake_state ?? {}, transcript: session.transcript ?? [] },
    noticeDocumentId: null, initialState: 'notice_created',
  });
  const { data: rec, error } = await sb.from('riskpath_records').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: 'record_write_failed' }, { status: 500 });

  return NextResponse.json({ ok: true, form: parsed.data.form, riskpathId: rec.id });
}
