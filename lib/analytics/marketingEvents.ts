// lib/analytics/marketingEvents.ts
// Marketing Tranche 1 — analytics event schema + scaffolding (analytics prompt §A, tightened by the 2026-07-14
// foundation review). Pre-staged behind MARKETING_ANALYTICS_ENABLED (default OFF).
//
// PII SAFETY BY CONSTRUCTION (review ruling): the event payload is a CLOSED discriminated union keyed on `event`.
// There is NO catch-all field and NO session identifier. Every field is a non-identifying scalar (route path,
// closed-enum CTA slug, section id, magnet slug, route/host destination slug, campaign UTM taxonomy). A content
// author who passes an unlisted field gets a `tsc` failure at build time — not a runtime catch. The a15 denylist
// + the verify-analytics-no-pii CI scan remain as belt-and-suspenders (second line of defense).
//
// THREE runtime gates before anything fires: (1) flag off → drop; (2) consent not granted (same Cookiebot
// statistics surface as the GA4 mount) → drop; (3) a15 PII denylist on the enriched payload. NO real GA4/Meta/Ads
// IDs in this tranche — placeholders only. NO analytics loader is mounted here (guard G stays green).

import { enforceDenylist } from '@/lib/safety/denylist';
import { hasConsent } from './consent';
import { marketingAnalyticsEnabled } from '@/lib/marketing/flags';

// Placeholder destination IDs (Tranche 3 replaces post-authentication). Deliberately NOT in the GA4 measurement-ID
// shape (the G-dash-ten-char form), so guard G (check_no_preconsent_analytics) never matches them.
export const GA4_PLACEHOLDER_ID = 'GA4-PLACEHOLDER-TRANCHE1';
export const GOOGLE_ADS_PLACEHOLDER_ID = 'AW-PLACEHOLDER-TRANCHE1';
export const META_PIXEL_PLACEHOLDER_ID = 'META-PLACEHOLDER-TRANCHE1';

/** Closed enum of marketing CTA slugs (non-identifying). Maps 1:1 to the shipped-route CTAs from the Gate T1-0 inventory. */
export const MARKETING_CTA_SLUGS = [
  'ask_ai', 'start_notice', 'serve_track', 'riskpath', 'route_to_counsel', 'blog_cta',
] as const;
export type MarketingCtaSlug = typeof MARKETING_CTA_SLUGS[number];

/** Closed set of event discriminators — no open string type on the discriminator. */
export const MARKETING_EVENT_NAMES = [
  'page_view', 'cta_click', 'lead_magnet_download', 'outbound_link',
] as const;
export type MarketingEventName = typeof MARKETING_EVENT_NAMES[number];

/**
 * Campaign UTM taxonomy — NON-identifying by construction: these carry values WE author (campaign slugs, ad-variant
 * ids), never user input. utm_term is a paid-search keyword we bid on, not a user query. Shared, all optional.
 */
export interface UtmFields {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/**
 * The marketing event payload — a CLOSED discriminated union. No `[k: string]: unknown`, no `metadata`, no
 * session id. Every field is a non-identifying scalar. `page_path` is a route path only (strip any query string
 * before constructing); `destination_slug` is a route slug or bare hostname, never a full URL with a query string.
 *
 * IMPLEMENTATION NOTE: each variant is an INTERFACE that `extends UtmFields`, not a `{...} & UtmFields`
 * intersection. TypeScript disables excess-property checking on intersection targets, which would silently allow
 * an unlisted (potentially PII) field on an object literal. Interfaces keep excess-property checking live — an
 * unlisted field is a `tsc` error. This is the property the compile-check test asserts.
 */
export interface PageViewEvent extends UtmFields { event: 'page_view'; page_path: string; }
export interface CtaClickEvent extends UtmFields { event: 'cta_click'; page_path: string; cta_slug: MarketingCtaSlug; section_id?: string; }
export interface LeadMagnetDownloadEvent extends UtmFields { event: 'lead_magnet_download'; page_path: string; magnet_slug: string; }
export interface OutboundLinkEvent extends UtmFields { event: 'outbound_link'; page_path: string; destination_slug: string; }
export type MarketingEvent = PageViewEvent | CtaClickEvent | LeadMagnetDownloadEvent | OutboundLinkEvent;

export type ConsentStatus = 'granted' | 'declined' | 'unknown';

/**
 * Fire a marketing analytics event. Returns true iff emitted. Gates in order: flag off → false; consent not
 * granted → false; denylist violation → dropped (false). Never throws. In Tranche 1 the flag is OFF so this is
 * inert; Tranche 3 wires real destinations after account authentication. The function stamps the dispatch time
 * and consent status itself — authors never pass a timestamp or an identifier.
 */
export function fireMarketingEvent(event: MarketingEvent): boolean {
  if (!marketingAnalyticsEnabled()) return false;
  if (!hasConsent()) return false;
  try {
    // Enrich at dispatch with non-identifying meta only. Author payload stays minimal + typed.
    const payload = { ...event, timestamp: Date.now(), consent_status: 'granted' as ConsentStatus };
    enforceDenylist(payload as Record<string, unknown>); // belt-and-suspenders; type system is the primary guarantee
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event.event, payload);
    }
    return true;
  } catch {
    return false; // denylist violation or serialization error — drop, never break the page
  }
}
