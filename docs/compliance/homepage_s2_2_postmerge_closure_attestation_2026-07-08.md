# Homepage §2.2 Post-Merge Closure Attestation — 2026-07-08

**Broker of record:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457.
**Execution:** All git / merge / deploy / dashboard / env actions broker-executed (§4.13). Build + verification: Engineering (Claude).

## Scope
Closes the §2.2 production-freeze conditions for the AI-first homepage. PR **#208**
("feat(homepage): AI-first canonical update — 'Ask OwnerPilot AI first.'") merged to
`main` as commit **54786dd** (23 checks passed). Follow-on nav hotfix PR **#209**
(Serve & Track link in the shared site header) merged as **2d7f247**.

## §2.2 gates — all satisfied
1. **Mobile review** — PASS. Broker reviewed the served homepage on a physical device;
   editorial illustrations render as compact accents (mobile compression pass), no
   horizontal scroll, CTAs tappable.
2. **Env (Production scope)** — PASS. Missing-var audit run against Vercel Production
   surfaced gaps; the two required vars provisioned + redeployed:
   - `NEXT_PUBLIC_APP_URL` = `https://ownerpilot.ai` (absolute URLs in magic-link email +
     broker-review page).
   - `BROKER_RESOLVE_SECRET` = 32-byte secret (broker-confirm resolve endpoint auth).
   Analytics/conversion pair also set (optional, now live):
   - `NEXT_PUBLIC_GA4_MEASUREMENT_ID` = `G-83W9QCF4PQ`
   - `GA4_API_SECRET` (from GA4 Measurement Protocol; server-only).
   Production redeploy triggered after provisioning.
3. **Live smoke** — PASS. ownerpilot.ai renders hero ("Ask OwnerPilot AI first."),
   workflow strip, AI prompt section, property-aware card, Photo Proof (Timestamped),
   Resolve & Document, footer. CTAs route: Ask OwnerPilot AI → /chat, Start 3-Day Notice
   → /notice/3-day, Serve & Track → /notice/3-day/serve. Footer shows
   "California Licensed Real Estate Broker · CalDRE B9445457". Guards on `main` PASS:
   locked-prose (125), banned-terms, attorney-attribution, tsc clean.

## Scope correction (recorded)
An earlier framing treated the broker-review email/URL pair as part of this gate. On
code review, `BROKER_REVIEW_EMAIL` and `BROKER_REVIEW_URL` are read **only** by the FF-3
broker-intake-digest cron, which the code marks "pre-provisioning dark." They are **not**
part of the §2.2 homepage gate and remain intentionally unset. `BROKER_REVIEW_URL` has a
code default (`https://ownerpilot.ai/broker-review`).

## Deferred (not blocking §2.2)
- **FF-3 broker-intake-digest walk** — separate provisioning effort (review@ownerpilot.ai
  alias, Resend domain verification, Turnstile keys, `BROKER_REVIEW_EMAIL`/`BROKER_REVIEW_URL`).
  Governed by `track2_broker_confirm_walk_prerequisites_broker_ruling_2026-07-08.md`.
  Gated behind explicit FF-3 authorization; calendar backstop ~2026-07-10.
- **Nav label drift** — inner-header "Ask OwnerPilot" vs homepage "Ask OwnerPilot AI".
  Cosmetic; optional follow-up hotfix.

## Disposition
§2.2 production freeze for the AI-first homepage is **CLOSED**. Homepage is live in
production with required env provisioned and all three gates satisfied.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-08
