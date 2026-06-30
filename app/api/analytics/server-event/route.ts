// app/api/analytics/server-event/route.ts
// Lane 6 Analytics §Q — server-event endpoint (master prompt §3.2). Validates event name + denylist,
// then fires via the Measurement Protocol helper. 400 on disallowed event or denied param.

import { NextRequest, NextResponse } from 'next/server';
import { sendServerEvent, ALLOWED_SERVER_EVENTS, ServerEventError } from '@/lib/analytics/measurementProtocol';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!ALLOWED_SERVER_EVENTS.has(body?.name)) {
    return NextResponse.json({ error: 'not a server-side event' }, { status: 400 });
  }

  try {
    await sendServerEvent(body.name, body.params ?? {}, {
      clientId: req.headers.get('x-client-id') ?? undefined,
    });
  } catch (e) {
    if (e instanceof ServerEventError) {
      return NextResponse.json({ error: e.message }, { status: 400 }); // denylist / event-name violation
    }
    return NextResponse.json({ error: 'server event failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
