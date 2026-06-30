// app/api/documents/[id]/route.ts — serve a produced document to its owner. Claimed-only; returns a short-lived
// signed storage URL (never a public path). Owner must match the documents row's user_id.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';

const COOKIE = 'op_chat_token';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { id } = await params;
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const { data: doc } = await sb.from('documents')
    .select('storage_path, user_id').eq('id', id).maybeSingle();
  if (!doc || doc.user_id !== session.user_id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: signed, error } = await sb.storage.from('documents').createSignedUrl(doc.storage_path, 300);
  if (error || !signed) return NextResponse.json({ error: 'could not sign url' }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
