// lib/analytics/events.ts
// Lane 6 Analytics §Q — typed event firing. Master prompt §2.3.
//
// CROSS-LANE SSOT (master prompt §8 #2/#3 — "pull exact enum from Lane 3 / Lane 4"):
// The spec's inline RefusalEnum / TriggerId placeholders are SUPERSEDED by the ratified lane-3/4 types.
//   - refusal_enum     -> lane-3 Refusal (5 ratified values: legal_advice/ud_filing/settlement/non_la_city/security_concern)
//   - refusal_category -> lane-3 RefusalCategory (10 values)
//   - trigger_id       -> lane-4 CounselRouteTrigger (12 values)
// HARD cross-lane dependency: this file requires lanes 3 + 4 present in the tree (branch cut after they land,
// or the types vendored). Flagged in the lane-6 build notes.

import type { Refusal } from '@/lib/chat/intakeSchema';
import type { RefusalCategory } from '@/lib/chat/refusalBank';
import type { CounselRouteTrigger } from '@/lib/riskpath/triggers';
import { enforceDenylist } from './denylist';
import { hasConsent } from './consent';

/** Notice paths (engineering enumeration of supported notice types; not a lane-3/4 SSOT type). */
export type PathId =
  | 'pay_or_quit_3day' | 'cure_or_quit_3day' | 'unconditional_quit_3day'
  | 'termination_30day' | 'termination_60day' | 'termination_90day';

export type AnalyticsEvent =
  // --- Lane 6 new (client) ---
  | { name: 'refusal_emitted'; params: { refusal_enum: Refusal; refusal_category: RefusalCategory } }
  | { name: 'disclaimer_shown'; params: { disclaimer_id: string } }
  | { name: 'sensitive_field_anti_echo_blocked'; params: { field_type_attempted: 'account_number' | 'ssn' | 'dob' | 'other' } }
  | { name: 'counsel_route_triggered'; params: { trigger_id: CounselRouteTrigger } }
  | { name: 'path_selected'; params: { path_id: PathId } }
  | { name: 'route_to_counsel_view'; params: { source: 'broker_confirm_resolution_not_la' | 'produce_gate_block' | 'direct' } }
  // --- Server-side ---
  | { name: 'broker_confirm_request_submitted'; params: { prior_review_reason: string; had_email: boolean } }
  | { name: 'broker_confirm_resolved'; params: { outcome: string; resolution_minutes_from_submit: number } }
  | { name: 'reservation_of_rights_inert_emitted'; params: Record<string, never> }
  | { name: 'intake_complete'; params: Record<string, never> }
  | { name: 'notice_pdf_generated'; params: Record<string, never> }
  | { name: 'chat_api_error'; params: { code?: string } }
  | { name: 'structured_json_parse_fail'; params: Record<string, never> }
  | { name: 'geocode_fallback_used'; params: Record<string, never> }
  | { name: 'locked_prose_violation'; params: { entry_id?: string } }
  // --- Marketing + chat funnel (client) ---
  | { name: 'page_view'; params: { page?: string } }
  | { name: 'marketing_cta_click'; params: { cta?: string } }
  | { name: 'pricing_view'; params: Record<string, never> }
  | { name: 'concept_image_view'; params: { slug?: string } }
  | { name: 'chat_session_start'; params: Record<string, never> }
  | { name: 'chat_first_message'; params: Record<string, never> }
  | { name: 'intake_field_extracted'; params: { field?: string } }
  | { name: 'review_screen_view'; params: Record<string, never> }
  | { name: 'magic_link_requested'; params: Record<string, never> }
  | { name: 'notice_downloaded'; params: Record<string, never> }
  | { name: 'courtesy_reminder_started'; params: Record<string, never> }
  | { name: 'courtesy_reminder_copied'; params: Record<string, never> }
  | { name: 'courtesy_reminder_saved'; params: Record<string, never> };

/** Server-side event names (must match app/api/analytics/server-event ALLOWED_SERVER_EVENTS). */
export const SERVER_EVENT_NAMES = new Set<AnalyticsEvent['name']>([
  'intake_complete', 'notice_pdf_generated', 'chat_api_error',
  'structured_json_parse_fail', 'geocode_fallback_used', 'locked_prose_violation',
  'broker_confirm_request_submitted', 'broker_confirm_resolved',
  'reservation_of_rights_inert_emitted',
]);

/** Client event firing — consent-gated, denylist-enforced. */
export function fireClientEvent(event: AnalyticsEvent): void {
  if (!hasConsent()) return;
  enforceDenylist(event.params as Record<string, unknown>);
  window.gtag?.('event', event.name, event.params);
}

/** Server event firing — POSTs to the Measurement Protocol route (which re-checks the denylist). */
export async function fireServerEvent(event: AnalyticsEvent): Promise<void> {
  await fetch('/api/analytics/server-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
}
