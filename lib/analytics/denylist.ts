// lib/analytics/denylist.ts
// Lane 6 Analytics §Q — runtime PII denylist. GENERALIZED per lane7 A15 ruling §7 item 4:
// the canonical denied-key list + checks now live in lib/safety/denylist.ts; this file re-exports for Lane 6.
// One source of truth across analytics events AND the Lane 7 Notion-mirror scrubber.

export { enforceDenylist } from '@/lib/safety/denylist';
