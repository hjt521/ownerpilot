// lib/admin/isAdmin.ts
// Lane C1-followthrough (omnibus §3.10) — admin gate for broker-only surfaces (e.g. /admin/broker-checklist).
// The authenticated Supabase user's email must be on the ADMIN_EMAILS allowlist (comma-separated, case/space
// -insensitive). Default: closed (empty allowlist → nobody is admin). Server-only.

import { createClient } from '@/lib/supabase/server';

/** The configured admin allowlist as a normalized Set (lowercased, trimmed). Empty when unset → closed. */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True iff the given email is on the admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** Resolve the current authenticated user and whether they are an admin. */
export async function currentAdmin(): Promise<{ email: string | null; isAdmin: boolean }> {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email ?? null;
  return { email, isAdmin: isAdminEmail(email) };
}
