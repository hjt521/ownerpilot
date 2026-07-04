# Determination request — Decision 2 inclusion in the Phase 2D production release

**Date:** 2026-06-29
**Raised by:** Engineering (Claude), flagging a §0 fork
**Status:** DETERMINATION REQUESTED — blocks the Phase 2D PR scope
**Decision owner:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457

---

## §0 — Why this is a fork

During Phase 2D §0.B pre-flight, engineering surfaced that the working branch
mixes four uncommitted workstreams (Phase 2D, Decision 2 broker-confirm, GA4,
leftover docs). When asked how to scope the PR, the broker selected
**"Phase 2D + Decision 2"** — ship Decision 2 in the same release.

This **contradicts an existing written ruling**:

> `phase2d_client_wiring_ratification_and_attestation_packet_skeleton_broker_ruling_2026-06-29.md`
> records Decision 2 client wiring as **paused** until Phase 2D ships.

A scope selection in tooling is not a verbatim broker ruling, and it conflicts
with the above. Per §0 (broker authors all compliance/disposition rulings
verbatim; engineering flags forks), engineering will not fold Decision 2 into a
production-bound PR until this is ruled in writing.

## §1 — What "Phase 2D + Decision 2" actually ships to production

Beyond the Phase 2D surface (already attested via the Tests A–D packet), this adds:

1. **Database migrations** `023_broker_confirm_requests.sql`,
   `024_broker_confirm_sla_cron.sql`, `025_broker_confirm_attestation_lookup.sql`
   — new tables + a pg_cron/Edge SLA job that begins firing on deploy.
2. **Live API endpoints** `/api/notice/broker-confirm/{route,status,cancel,verify-produce}`
   — including PII intake (owner email). The locked copy makes a retention promise:
   *"We delete it 90 days after your request resolves."* That retention behavior must
   actually exist in production for the promise to be truthful.
3. **Live pages** `/broker-review/{status,check-status}` and `/route-to-counsel`.
4. **~20 owner-facing locked-prose strings** (broker-confirm flow, attorney-referral
   language, the fee-splitting / no-referral-fee disclaimer).
5. Supporting tooling: `broker-confirm-sla` Edge function, the SLA-sync CI script,
   the `ci:verify-broker-confirm-sla-sync` npm script.

## §2 — The attestation gap

The production gate for Phase 2D is `la_phase2d_production_attestation_2026-06-29.md`,
Tests A–D + §5 broker sign-off. **None of those tests exercise Decision 2.** There is
no equivalent attestation for the broker-confirm path, the email PII handling, the
90-day retention behavior, the SLA cron, or the attorney-referral copy. Shipping
Decision 2 to production under the Phase 2D attestation would put un-attested,
compliance-surfaced code (incl. PII intake) live.

## §3 — Reachability / dormancy

Decision 2 **client wiring is incomplete**: `components/notice-flow.tsx` has no
broker-confirm entry point (only a comment). So if shipped now, Decision 2 would be
**dormant/unsurfaced** — the endpoints, pages, and migrations would be live, but
there is no path to them from the main wizard flow. That bounds the risk (no owner
reaches it via the product) but does not eliminate it (direct-URL reachable endpoints
+ PII intake + a running SLA cron + DB schema change).

## §4 — Questions for the broker to rule on

1. **Supersede the pause?** Do you authorize lifting the Decision 2 pause from
   `phase2d_client_wiring_ratification_...md` so Decision 2 may ship in the Phase 2D
   release? (Yes / No)
2. **If yes — attestation posture for Decision 2's surface?** Choose one:
   - (a) Ship Decision 2 **dormant** (backend + migrations + pages deployed, no
     main-flow entry point), with a follow-up attestation required before any
     owner-facing surfacing; or
   - (b) Require a Decision 2 attestation (analogous to Tests A–D, covering
     broker-confirm flow, email PII intake + 90-day retention, SLA cron, referral
     copy) **before** this release; or
   - (c) Other (specify).
3. **PII / retention sign-off.** Confirm the 90-day email-retention promise in the
   locked copy is actually implemented and acceptable to go live (privacy posture),
   since the endpoint accepts owner email in production.
4. **CI guard.** The locked-prose manifest's ~20 Decision 2 entries require their
   source files (`routeToCounselCopy.ts`, `brokerConfirmCopy.ts`) to be present, or
   the locked-prose CI guard fails. Confirm Decision 2 source files ship together
   with the manifest entries (they do, under this scope) — no hunk-split needed if
   Decision 2 is in scope.

## §5 — Engineering recommendation (non-binding)

Recommend **(2a) ship Decision 2 dormant** if it must be in this release: it keeps the
release moving, avoids a second branch/merge, and the incomplete client wiring means
there is no owner-facing surface to attest yet anyway — with a written commitment that
a Decision 2 attestation gates any later surfacing (the in-wizard affordance). The
cleaner alternative remains **Phase 2D only** (the prior plan), with Decision 2
following on its own PR once its client wiring is finished and attested.

Either way, **GA4 stays out** of this release until its privacy-policy addendum is
authored (separate determination), independent of the Decision 2 question.

---

*Raised under §0. Engineering holds the Phase 2D commit/PR until this is ruled.*
