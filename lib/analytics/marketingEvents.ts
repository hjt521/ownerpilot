// lib/analytics/marketingEvents.ts
// Marketing Tranche 1 — analytics event schema + scaffolding (analytics prompt §A). Pre-staged behind
// MARKETING_ANALYTICS_ENABLED (default OFF). THREE gates before anything fires: (1) flag off → drop;
// (2) consent not granted (same Cookiebot statistics surface as the GA4 mount) → drop; (3) a15 PII denylist
// enforced on every payload. NO real GA4/Meta/Ads IDs in this tranche — placeholders only; Tranche 3 replaces
// them after Jack authenticates the accounts. NO analytics loader is mounted here (guard G stays green).

import { enforceDenylist } from '@/lib/safety/denylist';
import { hasConsent } from './consent';
import { marketingAnalyticsEnabled } from '@/lib/marketing/flags';

// Placeholder destination IDs (Tranche 3 replaces post-authentication). Deliberately NOT in the GA4
// measurement-ID shape (the G-dash-ten-char form), so guard G (check_no_preconsent_analytics) never matches them.
export const GA4_PLACEHOLDER_ID = 'GA4-PLACEHOLDER-TRANCHE1';
export const GOOGLE_ADS_PLACEHOLDER_ID = 'AW-PLACEHOLDER-TRANCHE1';
export const META_PIXEL_PLACEHOLDER_ID = 'META-PLACEHOLDER-TRANCHE1';

/** GA4 marketing events (analytics prompt §A.1). */
export const GA4_MARKETING_EVENTS = [
  'ask_ai_click', 'start_notice_click', 'start_notice_workflow', 'complete_notice_packet',
  'email_packet_click', 'text_workflow_click', 'serve_track_click', 'photo_proof_click',
  'resolve_document_click', 'move_out_agreement_click', 'payment_success', 'abandoned_notice_workflow',
  'blog_cta_click', 'lead_magnet_download', 'outbound_contact_click',
] as const;
export type Ga4MarketingEventName = typeof GA4_MARKETING_EVENTS[number];

/** Google Ads conversion subset (high-value only). */
export const GOOGLE_ADS_CONVERSION_EVENTS = [
  'ask_ai_click', 'start_notice_workflow', 'complete_notice_packet', 'payment_success', 'lead_magnet_download',
] as const;

/** Meta Pixel / CAPI events. */
export const META_PIXEL_EVENTS = [
  'ViewContent', 'Lead', 'InitiateCheckout', 'Purchase', 'AskAI', 'StartNotice', 'ResolveDocument',
] as const;

export type ConsentStatus = 'granted' | 'declined' | 'unknown';

/** Base payload shape (analytics prompt §A.2). No PII — enforced by the denylist below. */
export interface MarketingEvent {
  event: Ga4MarketingEventName;
  timestamp: number;
  page_path: string;
  page_title: string;
  session_id: string;
  consent_status: ConsentStatus;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [k: string]: unknown; // event-specific fields (no PII — denylist-enforced)
}

/**
 * Fire a marketing analytics event. Returns true iff emitted. Gates in order: flag off → false; consent not
 * granted → false; denylist violation → dropped (false). Never throws. In Tranche 1 the flag is OFF so this is
 * inert; Tranche 3 wires real destinations after account authentication.
 */
export function fireMarketingEvent(event: MarketingEvent): boolean {
  if (!marketingAnalyticsEnabled()) return false;
  if (!hasConsent()) return false;
  try {
    enforceDenylist(event as Record<string, unknown>);
    // No real destination is configured in Tranche 1 (placeholder IDs). When Tranche 3 wires GA4/Pixel/Ads,
    // dispatch goes here. window.gtag is a no-op if the (consent-gated) GTM path has not mounted it.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event.event, event);
    }
    return true;
  } catch {
    return false; // denylist violation or serialization error — drop, never break the page
  }
}
