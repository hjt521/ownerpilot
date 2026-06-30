# Lane 8 / Surface 7 — Materialized Copy Provenance Record

**Filed:** 2026-06-29
**Type:** Engineering provenance record (NOT a new determination). Records where already-authored,
already-wired copy came from, so the locked-prose guard's `// Source:` scanner resolves.
**Status:** PENDING broker confirmation that the Surface-7 prose below is verbatim-correct.
**Governing broker authority (per section):** see each section.

---

## Purpose

`app/privacy/page.tsx` carries three privacy-policy sections wired **verbatim** (not paraphrased).
Its source comment cites this file. This record reproduces that copy byte-for-byte and points to the
broker authority that governs each section. It also indexes where the rest of the Lane 8 marketing copy
lives (manifest vs component).

## Surface 7 — Privacy-policy sections (verbatim, as wired in `app/privacy/page.tsx`)

### Broker-Confirm Requests
> If you request manual review of your property's jurisdiction, we collect: the address you provided,
> the reason our automated check was inconclusive, and (optionally) your email address. The address is
> used to resolve your jurisdiction. The email, if provided, is used only to notify you when review is
> complete. We delete the email 90 days after your request is resolved. We never share it. The address
> remains in our records for audit and compliance purposes.

*Authority:* Decision 2 broker-confirm data-handling — `decision2_owner_facing_ui_slice_broker_signoff_2026-06-28.md`
and `open_items_consolidated_broker_ruling_2026-06-29.md` (privacy_requests / 90-day email deletion).

### Analytics & Cookies
> We use Google Analytics 4 to measure how visitors use our site. We use Cookiebot to manage consent:
> no analytics cookies fire until you choose to accept them. We have disabled Google Signals and enabled
> IP anonymization on our GA4 property. We retain analytics data for 14 months. We never sell your
> information. To exercise CCPA rights, see the "Do Not Sell or Share My Personal Information" link in
> our footer.

*Authority:* Lane 6 analytics — `claude_code_master_prompt_lane6_analytics_2026-06-29.md` §Q
(GA4 + Cookiebot consent-gating, Signals off, IP anonymization, 14-month retention).

### Server-Side Events
> For certain operational events (notice generated, intake completed, broker-confirm submitted), we
> record the event server-side via Google's Measurement Protocol. These records never contain your
> address, name, email, tenant information, payment account numbers, or any other personally identifying
> detail — only the type of event, anonymous request IDs, and aggregate counts.

*Authority:* Lane 6 analytics — Measurement Protocol + PII denylist (A15);
`a15_pii_denylist_evidence_harness_spec_2026-06-29.md`.

## Index of other Lane 8 materialized copy (for completeness)

| Surface | Copy location | Locked? |
|---|---|---|
| 1 Hero (headline/subhead/CTA) | shape-B manifest `HERO_HEADLINE` / `HERO_SUBHEAD` / `HERO_CTA` | yes |
| 8 Footer legal (broker-supervised disclaimer) | shape-B manifest `DISCLAIMER_BROKER_SUPERVISED` | yes |
| Footer Do-Not-Sell link label | shape-B manifest `DISCLAIMER_DO_NOT_SELL_HEADER` | yes |
| How-It-Works / Features / FAQ | inline in `components/marketing/*` (non-locked marketing copy) | no |
| 7 Privacy sections (above) | inline in `app/privacy/page.tsx` (broker-authored, verbatim) | no — recorded here |
| 11 Route-to-counsel page | shape-B manifest `ROUTE_TO_COUNSEL_*` | yes |

---

**For broker:** confirm the three Surface-7 quotes above are verbatim-correct. On confirmation this record
stands as the provenance source; the `// Source:` reference in `app/privacy/page.tsx` resolves to it.

— Engineering provenance record · 2026-06-29
