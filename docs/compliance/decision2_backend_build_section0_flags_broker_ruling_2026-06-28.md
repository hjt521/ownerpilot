# Decision 2 Backend Build — §0 Flags · Broker Ruling

**Date:** 2026-06-28
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Status:** LOCKED
**Responds to:** Engineering Determination Request "Decision 2 Backend Build: §0 Flags for Ruling" (2026-06-28)
**Parents:**
- `decision2_broker_confirm_path_design_broker_ruling_2026-06-28.md`
- `county_parcel_lookup_method_broker_ruling_2026-06-28.md`

---

## 0. Disposition summary

| # | Flag | Engineering default | Ruling |
|---|---|---|---|
| 1 | Token storage | hash-only | **CONFIRM hash-only** |
| 2 | ZIMAS eligibility under `parcel_lookup_inconclusive` | subsumed | **CONFIRM subsumed mapping** |
| 3 | SLA cron cadence | hourly 24/7 | **CONFIRM hourly 24/7** |
| 4 | Edge date logic | inlined | **CONFIRM inline + lint guard** (minor add) |
| 5 | Route-to-counsel target | unresolved | **AUTHORIZE new `/route-to-counsel` page** (prerequisite slice) |

Backend ships once #5 lands. #1–#4 are accepted as built.

---

## 1. Flag 1 — Token storage: hash-only · CONFIRMED

**Ruling:** Store `requester_token_hash` (SHA-256) only. Never store the raw token at rest. Client holds the raw token; server hashes-and-looks-up.

**Rationale.** Decision A §2.4's literal text was scribed before §2.3.4 was added in the same ruling; §2.3.4 is the controlling guidance. A database-read leak of a stored raw bearer token is a single-vector compromise of every owner's request status — that's a catastrophic posture for a compliance surface. Hash-and-store is the industry default for bearer-style tokens and matches what we'd want a downstream audit (or a discovery production) to find.

**Consequences engineering must absorb:**
- The raw token is shown to the requester exactly once (at request-creation response). No "view-token-again" surface.
- If a requester loses their token, the request is dead from their side — only the broker resolve tool can advance it. Document this explicitly in the owner-facing copy at request creation: "Save this link. We cannot resend it."
- The audit-log row that records request creation must NOT include the raw token. Include `requester_token_hash` (matches the column) for forensic continuity.

**[MUST FIX]** Update Decision A §2.4 inline text on next ruling revision to read `requester_token_hash text NOT NULL` so the spec and the schema agree. Until then, this ruling is the controlling reference.

---

## 2. Flag 2 — ZIMAS eligibility subsumed · CONFIRMED

**Ruling:** Eligibility keys on `reviewReason ∈ {parcel_lookup_inconclusive, county_situs_gap, county_ambiguous}`. The resolver continues to emit `parcel_lookup_inconclusive` for all three ZIMAS dead-ends (miss / timeout / error). The specific ZIMAS branch + `failureMode` stay preserved on the linked `geocode_audit_log` row.

**Rationale.** Decision B's intent was *that ZIMAS dead-ends on an in-set LA ZIP must be escalable*, not that the resolver's terminal taxonomy be expanded. Forcing the resolver to emit `zimas_timeout` and `zimas_error` as distinct `reviewReason` values would push internal diagnostics into a surface that other consumers (audit reports, broker tool, owner UI copy) treat as a stable enum. We'd be widening a public contract to capture information that's already in `failureMode`.

The right denormalization is the one engineering already chose: keep the public `reviewReason` enum narrow, key escalation eligibility on it, and let downstream forensic work `JOIN` to `geocode_audit_log.failureMode` when the operator needs to know *which* ZIMAS branch died.

**[CONSIDER]** Broker dashboard (if/when built) should surface `failureMode` next to `reviewReason` in the broker-resolve UI so the operator can see "zimas_timeout" without leaving the queue. Not a ship blocker.

---

## 3. Flag 3 — SLA cron cadence: hourly 24/7 · CONFIRMED

**Ruling:** Cron expression stays `0 * * * *`. No business-hours windowing.

**Rationale.** Decision C §4.3 contemplated the *cheaper* fallback (daily) as the fork; engineering's deviation runs in the *more protective* direction (catch breaches within ≤1 hour at all times, including weekends and holidays). That's the right direction for a compliance-sensitive timer that gates the breach-notification path. A weekend SLA breach that sits unsent for 48+ hours is the exact failure mode this cron exists to prevent.

Cost objection: a metadata sweep with at most a handful of emails per tick is operationally trivial. We're not paying enough per run to justify the schedule split.

**[MUST FIX]** Update Decision C §4.3 on next ruling revision to record "hourly 24/7" as the canonical cadence and demote the business-hours-split language to "rejected — would create weekend blind spots."

---

## 4. Flag 4 — Edge date logic: inline + lint guard · CONFIRMED with addition

**Ruling:** Accept the inline implementation. Do NOT stand up a `build:broker-confirm-core` mirror pipeline.

**One small addition:** add a CI lint rule that grep-fails if the SLA-window, warning-lead, or 90-day-purge numeric constants are ever modified in the Edge function without a corresponding change in `lib/brokerConfirm/brokerConfirmCore.ts`. Mechanism — simplest workable:

1. Tag the duplicated constants in both files with a comment marker: `// SYNC-WITH: brokerConfirmCore.ts SLA_CONSTANTS`
2. Add `scripts/check-broker-confirm-sla-sync.ts` that loads both files, extracts the numeric literals after the marker, and asserts equality. Run in CI.
3. If they drift, CI fails with a clear message: "SLA constants drifted between Edge function and core; reconcile both or remove the SYNC-WITH marker."

This gives us 80% of the mirror discipline's safety at <5% of the infrastructure cost. The trigger to upgrade to a full mirror pipeline is "we duplicate a third piece of logic into this Edge function" — at that point, the breakeven flips and the mirror is worth standing up.

**Rationale.** Engineering's instinct is right — 10 lines of stable date math doesn't warrant a full mirror + CI guard pipeline. But "stable" is the load-bearing word, and stability is what the lint guard enforces cheaply. If we get this wrong (constants drift, breach window calculated against the wrong number), the failure mode is silent and compliance-relevant. The lint guard makes silent drift impossible without the operator deliberately stripping the SYNC-WITH marker.

**[SHOULD FIX]** Add the SYNC-WITH lint guard before Decision 2 ships. ~30 minutes of work; ships with the rest of the backend.

---

## 5. Flag 5 — Route-to-counsel target · AUTHORIZED new page

**Ruling:** Build a new canonical page at **`/route-to-counsel`** as a prerequisite slice for Decision 2's breach-notification path. The existing footer/options/gate references will be updated in a follow-up sweep to all point at this canonical URL.

### 5.1 Page scope (LOCKED)

- **Route:** `/route-to-counsel`
- **Title:** "Find a California landlord-tenant attorney"
- **Above the fold:** one sentence explaining why the user is here ("We can't give legal advice. Here's how to find a California attorney who can.")
- **Primary referral (one block):** **LACBA Lawyer Referral Service** — Los Angeles County Bar Association, with the phone number and the official LACBA referral page link. This is the canonical referral and goes first.
- **Secondary referrals (compact list, alphabetical):** California Lawyer Referral Service (State Bar of California), local county bar referral services (link to State Bar's directory page rather than enumerating 58 counties).
- **NEVER list specific law firms by name.** Generic referral services only. This is a hard wall — locked-prose CI guard should flag any specific-firm pattern in this file.
- **NEVER list our spouse's firm or any attorney by name.** The wall posture from prior rulings applies.
- **Bottom of page:** a short note — "OwnerPilot AI is a real estate broker service under CalDRE B9445457. We do not refer to specific attorneys and we do not receive referral fees."

### 5.2 Why a new page (not piggyback on an existing surface)

Recon found references in the footer, options, and gates — those are entry points, not destinations. A canonical destination URL needs to exist so every entry point resolves to the same page; otherwise, copy and link targets drift and the breach-email link can route somewhere that's been edited out from under us. A single owned page is the right anchor.

### 5.3 Implementation handoff

This is a **prerequisite slice** for Decision 2's breach-notification ship gate. Engineering implements before flipping the breach-email path live. Order of operations:

1. Build `/route-to-counsel` page (Next.js App Router, server component, no client JS needed)
2. Set `BROKER_CONFIRM_COUNSEL_URL` env var in Vercel to `https://www.ownerpilot.ai/route-to-counsel`
3. Update breach-email template to use the env var (no inline URL drift)
4. Sweep the existing footer / options / gate references to point at `/route-to-counsel`
5. Add the page to the locked-prose manifest so the LACBA copy + "no referral fees" disclaimer don't drift
6. Verify locked-prose CI guard catches the disclaimer text
7. Then ship the breach-notification path

### 5.4 Locked copy (paste verbatim — do not edit without a new ruling)

**Page title (H1):**
> Find a California landlord-tenant attorney

**Intro paragraph:**
> OwnerPilot AI is a California real estate broker service. We can guide you through CA landlord notice procedures, but we don't give legal advice. If you need legal advice — about an eviction, a tenant dispute, a contract issue, or anything else where a lawyer's judgment matters — please contact one of the referral services below.

**Primary referral block:**
> ### Los Angeles County Bar Association — Lawyer Referral Service
> The LACBA Lawyer Referral Service connects you with a screened California attorney for an initial consultation.
> Phone: (213) 243-1525
> Website: [LACBA Lawyer Referral Service](https://www.smartlaw.org/)

**Secondary referrals heading:**
> ### Other California referral services

**Secondary referrals list:**
- State Bar of California — Certified Lawyer Referral Services directory
- Your county bar association — most California counties run a referral service

**Bottom disclaimer (LOCKED prose — never edit without a broker ruling):**
> OwnerPilot AI operates as a California real estate broker (CalDRE B9445457). We do not refer to specific attorneys, we do not receive referral fees, and we have no fee-splitting arrangement with any attorney or law firm. The referral services above are independent of OwnerPilot AI.

### 5.5 Ship gate

Decision 2's breach-notification path **does not ship** until:
- `/route-to-counsel` is live in production
- `BROKER_CONFIRM_COUNSEL_URL` env var is set in Vercel Production
- Locked-prose CI guard covers the page's disclaimer text

Everything else in the Decision 2 backend (token-hash storage, escalation eligibility, hourly cron, inlined date logic with lint guard) is cleared to ship now.

---

## 6. Carry-forward to next ruling revision

When Decisions A/B/C are next revised, fold in these textual corrections so the spec self-documents:

- Decision A §2.4: `requester_token_hash text NOT NULL` (strike `requester_token text NOT NULL`)
- Decision B §3.1/§3.3: rewrite ZIMAS eligibility paragraph to say "ZIMAS miss / timeout / error all surface as `parcel_lookup_inconclusive`; eligibility keys on that reviewReason; `failureMode` is preserved on `geocode_audit_log` for forensic depth"
- Decision C §4.3: "hourly 24/7 (`0 * * * *`)" as the canonical cadence; demote business-hours-split to rejected-alternative status with a one-line note on weekend blind-spot risk
- Decision C §4.2.3 / §4.4: reference `/route-to-counsel` as the canonical target, with the page itself owned by this ruling

None of these textual cleanups blocks ship; they're hygiene for the next revision.

---

## 7. Acceptance — what "done" looks like

- Flags #1, #2, #3, #4 are CONFIRMED as built. No engineering work required beyond the SYNC-WITH lint guard for Flag #4.
- Flag #5: build `/route-to-counsel`, set the env var, sweep references, add locked-prose coverage, then ship breach-notification.
- The owner-facing UI slice (§6 step 7 of the parent ruling) remains separately gated — this ruling doesn't affect that gate.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
