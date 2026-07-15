# OwnerPilot Marketing — UTM Naming Convention

**Authority:** `marketing_tranche1_broker_ruling_2026-07-14.md` + analytics prompt §A.5. Tranche 3 references this when building campaigns. Documented in Tranche 1; no live tagging until Tranche 3.

All marketing links use lowercase snake_case UTM parameters. Consistency here is what makes attribution legible once `MARKETING_ANALYTICS_ENABLED` flips in Tranche 3.

## Parameters

| Param | Allowed values | Notes |
|---|---|---|
| `utm_source` | `google_ads`, `meta`, `blog`, `email`, `linkedin`, `direct` | The platform/origin. |
| `utm_medium` | `cpc`, `paid_social`, `organic`, `email`, `referral` | The channel type. |
| `utm_campaign` | `<campaign_slug_snake_case>` | e.g. `california_3_day_notice`, `tenant_behind_on_rent`. |
| `utm_content` | `<ad_variant_id>` or `<cta_position>` | e.g. `hero_cta`, `sidebar_cta`, `rsa_v1`. |
| `utm_term` | keyword | Paid search only. |

## Rules

- Never place PII in any UTM value (enforced by the a15 denylist on the event payload).
- Campaign slugs match the surviving SEO page slugs from the Gate T1-0 inventory where a campaign maps to a page.
- No UTM tagging fires until Tranche 3 (`MARKETING_ANALYTICS_ENABLED` default OFF through Tranches 1–2).
