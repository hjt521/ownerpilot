// app/api/diag/notion-db-hash/route.ts
// Lane 7 G-2 — Preview-only diagnostic: confirms which Notion database NOTION_AUTOMATION_DB_ID
// currently points at, without ever exposing the raw value. The Founder computes SHA-256 locally
// over the expected Data Source ID and compares it against this route's response. Diagnostic-only:
// not part of any production write path, not wired into mirrorToNotion, not logged, no Notion call.
// Slated for removal after the Lane 7 Cron Mirror sibling-DB reconciliation lands — see
// docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md (attestation doc follows at §3.7).

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  const secret = req.headers.get('x-diag-secret');
  if (!secret || secret !== process.env.DIAG_ENV_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = process.env.NOTION_AUTOMATION_DB_ID ?? '';
  const hash = createHash('sha256').update(raw).digest('hex');
  const length = raw.length;

  const body: { hash: string; length: number; prefix4?: string } = { hash, length };
  if (length === 36) {
    body.prefix4 = raw.slice(0, 4);
  }

  return NextResponse.json(body);
}
