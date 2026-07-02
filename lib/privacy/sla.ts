// lib/privacy/sla.ts
// Fork D1 — CCPA/CPRA response SLA. A business must respond to a verifiable consumer request within 45 calendar
// days of receipt (Cal. Civ. Code §1798.130(a)(2)); one 45-day extension is permitted with notice. This module
// computes the 45-day due date + a triage state from a privacy_requests row's submitted_at / responded_at, for
// the broker's manual triage (Supabase Studio; ruling: broker triages manually). Pure — timestamps only, no PII.
// Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (D1).

export const SLA_DAYS = 45;
export const DUE_SOON_DAYS = 7;

const DAY_MS = 86_400_000;

export type SlaState = 'responded' | 'overdue' | 'due_soon' | 'on_track';

export interface SlaStatus {
  /** ISO date-time: submitted_at + 45 days. */
  dueAt: string;
  /** Whole days from `now` to dueAt (negative = overdue); 0 once responded. */
  daysRemaining: number;
  state: SlaState;
}

/** The 45-day response deadline for a request received at `submittedAtISO`. */
export function slaDueAt(submittedAtISO: string): string {
  return new Date(new Date(submittedAtISO).getTime() + SLA_DAYS * DAY_MS).toISOString();
}

/** Triage status for a privacy request. A non-null `respondedAtISO` means the SLA obligation was met. */
export function slaStatus(
  submittedAtISO: string,
  respondedAtISO: string | null | undefined,
  nowISO: string = new Date().toISOString(),
): SlaStatus {
  const dueAt = slaDueAt(submittedAtISO);
  if (respondedAtISO) return { dueAt, daysRemaining: 0, state: 'responded' };
  const daysRemaining = Math.floor((new Date(dueAt).getTime() - new Date(nowISO).getTime()) / DAY_MS);
  const state: SlaState = daysRemaining < 0 ? 'overdue' : daysRemaining <= DUE_SOON_DAYS ? 'due_soon' : 'on_track';
  return { dueAt, daysRemaining, state };
}
