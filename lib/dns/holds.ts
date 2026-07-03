// lib/dns/holds.ts
// Lane W7 (omnibus §3.8) — DO NOT SERVE holds: types, active-hold lookup, gate summary, and the locked banner
// message. A hold on a chat_sessions(id) blocks progression past intake (no produce / packet / cover sheet /
// filing) until a broker lifts it. Pure helpers + a service-role fetch; the enforcement lives at the produce entry.

import type { SupabaseClient } from '@supabase/supabase-js';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

export interface DnsGate {
  id: string;
  description: string;
  required: boolean;
  satisfied_at?: string | null;
  satisfied_by?: string | null;
  evidence_path?: string | null;
}

export interface DnsHold {
  id: string;
  case_id: string;
  imposed_at: string;
  imposed_by: string;
  basis_document_path: string;
  basis_section: string | null;
  gates: DnsGate[];
  lifted_at: string | null;
  lifted_by: string | null;
  countersign_path: string | null;
}

/** A hold blocks only while unlifted. */
export function isHoldActive(hold: Pick<DnsHold, 'lifted_at'> | null | undefined): boolean {
  return !!hold && hold.lifted_at == null;
}

/** Human summary of the gates still required before service can proceed (for the banner's ${gates_summary}). */
export function summarizeGates(gates: DnsGate[] | null | undefined): string {
  const list = Array.isArray(gates) ? gates : [];
  const outstanding = list.filter((g) => g.required && !g.satisfied_at).map((g) => g.description);
  if (outstanding.length) return outstanding.join('; ');
  const required = list.filter((g) => g.required).map((g) => g.description);
  return required.length ? required.join('; ') : 'see basis document';
}

/** Render the locked DO NOT SERVE banner (DNS_ACTIVE_HOLD_BANNER_EN) with the hold's values interpolated. */
export function activeHoldBannerMessage(hold: DnsHold): string {
  // LockedKey: DNS_ACTIVE_HOLD_BANNER_EN
  const tpl = lockedProseEntry('DNS_ACTIVE_HOLD_BANNER_EN').value;
  return tpl
    .replace('${imposed_at}', hold.imposed_at)
    .replace('${imposed_by}', hold.imposed_by)
    .replace('${basis_document_path}', hold.basis_document_path)
    .replace('${basis_section}', hold.basis_section ?? '')
    .replace('${gates_summary}', summarizeGates(hold.gates));
}

/** Fetch the active (unlifted) hold for a case/session, or null. Service-role client (RLS-exempt). */
export async function fetchActiveHold(sb: SupabaseClient, caseId: string): Promise<DnsHold | null> {
  const { data } = await sb
    .from('do_not_serve_holds')
    .select('id, case_id, imposed_at, imposed_by, basis_document_path, basis_section, gates, lifted_at, lifted_by, countersign_path')
    .eq('case_id', caseId)
    .is('lifted_at', null)
    .maybeSingle();
  return (data as DnsHold | null) ?? null;
}
