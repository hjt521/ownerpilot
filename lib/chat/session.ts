// lib/chat/session.ts
// AI-first /chat — anonymous session identity + persistence. Opaque token lives in the browser
// (localStorage + httpOnly cookie); only the SHA-256 hash is stored (chat_sessions.anon_token_hash).

import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatSessionRow } from './dbTypes';

export function generateAnonToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashAnonToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function serviceClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Load a session by raw anon token, or null. Anonymous reads go through the service role (no public RLS). */
export async function loadSession(rawToken: string, sb = serviceClient()): Promise<ChatSessionRow | null> {
  const { data } = await sb
    .from('chat_sessions')
    .select('*')
    .eq('anon_token_hash', hashAnonToken(rawToken))
    .is('soft_deleted_at', null)
    .maybeSingle();
  return (data as ChatSessionRow) ?? null;
}

/**
 * Create a fresh anonymous session; returns the raw token (to set in cookie/localStorage) + the row id.
 * `tag` is the E2E run tag (e2e_run_id + synthetic_source) — {} for every real request, so the insert is
 * unchanged in production. See lib/testing/e2eRunTag.
 */
export async function createSession(
  sb = serviceClient(),
  tag: { e2e_run_id?: string; synthetic_source?: string } = {},
): Promise<{ rawToken: string; id: string }> {
  const rawToken = generateAnonToken();
  const { data, error } = await sb
    .from('chat_sessions')
    .insert({ anon_token_hash: hashAnonToken(rawToken), status: 'active', ...tag })
    .select('id')
    .single();
  if (error) throw new Error(`createSession failed: ${error.message}`);
  return { rawToken, id: data.id };
}
