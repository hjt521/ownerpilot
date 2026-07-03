// app/api/admin/broker-checklist/route.ts
// Lane C1-followthrough (omnibus §3.10) — admin-gated API for the broker compliance checklist.
// GET: list actions + completion state. POST: mark an action complete/incomplete with an evidence pointer.
// Gate: the authenticated user's email must be on ADMIN_EMAILS. Writes use the service-role client.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { currentAdmin } from '@/lib/admin/isAdmin';
import { CHECKLIST_ACTIONS, loadChecklist } from '@/lib/admin/brokerChecklist';
import { readRequestBody } from '@/lib/http/requestBody';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const VALID_KEYS = new Set(CHECKLIST_ACTIONS.map((a) => a.key));
const postSchema = z.object({
  action_key: z.string().refine((k) => VALID_KEYS.has(k), 'unknown action_key'),
  completed: z.boolean(),
  evidence_path: z.string().max(500).optional(),
});

export async function GET() {
  const { isAdmin } = await currentAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ items: await loadChecklist(svc()) });
}

export async function POST(req: NextRequest) {
  const { isAdmin, email } = await currentAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = postSchema.safeParse(await readRequestBody(req));
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  const { action_key, completed, evidence_path } = parsed.data;

  const sb = svc();
  const { error } = await sb.from('broker_compliance_actions').upsert(
    {
      action_key,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? email : null,
      evidence_path: completed ? (evidence_path ?? null) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'action_key' },
  );
  if (error) {
    console.error('broker-checklist upsert failed', error.message);
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }
  return NextResponse.json({ items: await loadChecklist(sb) });
}
