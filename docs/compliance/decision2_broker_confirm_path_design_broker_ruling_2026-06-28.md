# Decision 2 — Broker-Confirm Path Backend Design

**Broker Ruling**
**Date:** 2026-06-28
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Authorizes from:** `county_parcel_lookup_method_broker_ruling_2026-06-28.md` §2 (manual broker-confirm path) and §2 four MUST FIX (positive action, audit attestation, 24-hr SLA, source-based)
**Refines:** the four §0 forks I flagged in-thread on 2026-06-28 (queue visibility, re-submission, owner cancellation, UI while pending)
**Closes:** Decisions A, B, C from engineering's determination request 2026-06-28 8:01 PM PDT
**Carries forward:** §0 (never silently author compliance disposition logic); chat-transcript persistence policy data-minimization posture; Part E account-number exposure data-minimization posture

---

## §0. Scope

Engineering surfaced that the four flagged forks (queue visibility, re-submission, owner cancellation, UI while pending) are not sufficient to design the broker-confirm queue, because the existing flow is anonymous (`localStorage`-based draft, no `auth.uid()`) and the proposed table requires an owner-identity model the prior rulings do not address. Three new decisions surfaced:

- **Decision A** — Owner-identity model for the anonymous flow
- **Decision B** — Eligible disposition set for escalation
- **Decision C** — SLA enforcement and notification mechanism

This ruling closes all three, plus reconfirms or refines the four prior forks.

---

## §1. The four prior forks — confirmation and one refinement

### §1.1 Fork 1 (queue visibility scope) — **Confirmed as proposed.** Broker-only.

Encoding accepted: resolution UPDATE restricted to the broker via service-role-backed admin surface; `broker_confirm_actor` records identity so multi-broker delegation (§2.3 SHOULD FIX from the parent ruling) is schema-ready. Owner sees only their own request via `requester_token`. Phase 1 is single-broker (me); the schema doesn't preclude Phase 2 delegation but doesn't pre-build it either.

### §1.2 Fork 2 (re-submission on prior-denied) — **Confirmed as proposed.** Re-run resolver chain; cache prior denial as soft warning.

Encoding accepted. The reason re-run is the right default rather than short-circuit-to-denial: underlying data (Predicate-5 ZIP set, County parcel layer, ZIMAS coverage) can change between submissions, and a stale denial cached forever would lock out an owner whose address became newly resolvable. The soft warning surfaces the prior determination so an owner who just typo'd the same address twice doesn't waste a broker review, but doesn't block.

### §1.3 Fork 3 (owner cancellation) — **Confirmed as proposed.** Yes, with audit retention.

Encoding accepted: `status='cancelled'` + `cancelled_at`; row retained, no delete, `soft_deleted_at` untouched. Audit retention reason: an owner who cancels mid-review may later claim the platform refused to serve them. The cancelled row is the platform's defense.

### §1.4 Fork 4 (UI while pending) — **Confirmed with one refinement.**

Confirmed: produce-path gate treats `manual_broker_pending` as not-yet-confirmed; form-draft editable. Refinement: the produce-path gate must show the pending status to the owner with the SLA deadline ("Broker review in progress · expected by [timestamp]") so the owner is not left wondering why the produce button is greyed out. Backend supports this by exposing `sla_due_at` to the owner's poll endpoint (read access scoped by `requester_token`, per Decision A below).

---

## §2. Decision A — Owner-identity model: **A-1 (anonymous-flow-compatible token + optional email).** With modifications.

### §2.1 Ruling

Adopt **A-1**: opaque `requester_token` (stored client-side in `localStorage` alongside the existing `op.noticeDraft.v1` draft) as the primary identifier, plus an **optional** `requester_contact` (email) collected at request time. **No SSO requirement. No account creation.**

### §2.2 Why not A-2 (SSO)

The friction trade-off is decisive against SSO at this stage:

1. **The audience the platform serves includes 50+/mobile/stressed landlords** who have a tenant in payment default and need to act fast. Adding a Google SSO step before a broker can confirm jurisdiction is exactly the kind of friction that pushes a landlord to use a non-compliant alternative (a Google-doc template, a notario, a forms vendor with no California-specific compliance posture). The fail-closed UX problem the parent ruling §2 is solving is "dead-end with no actionable next step." A login wall is a different dead-end.

2. **The chat-transcript persistence policy precedent** (`chat_transcript_persistence_policy_attorney_countersign_2026-06-06.md`) ratified "minimize data on tenant-adjacent surfaces" as a deliberate posture. SSO would introduce a `users` table with `auth.uid()` joining to broker-review rows that contain landlord-side fact patterns a UD challenger would find very interesting. The Part E account-number exposure ruling's logic (`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`) compounds this: we deliberately don't accumulate identifying data on the platform when we can accomplish the workflow without it.

3. **Account creation creates a future erasure/portability obligation under CCPA** that the anonymous flow doesn't. Each authenticated user becomes a data subject with downstream rights administration costs. A token-based anonymous flow with optional email keeps that scope small.

### §2.3 Required modifications to A-1 as proposed

1. **`requester_contact` is optional, not required.** The request form must allow submission without an email. Owner gets a token-only flow (poll the status URL via the token) with a clear disclosure: "Without an email, you'll only see status by returning to this URL — we cannot notify you when broker review completes." If the owner provides an email, we use it for SLA-deadline notification and breach notification only.

2. **`requester_contact` is transactional-only.** Per the marketing-compliance polish memo just received (transactional vs. marketing separation), the email captured here is **not** added to any marketing list. The collection form must say so verbatim: "Used only for broker review status updates on this request. We will not add you to marketing emails." No pre-checked marketing opt-in. No marketing opt-in at all on this surface.

3. **CCPA notice-at-collection language** must appear at the email field (not buried in a footer privacy policy link). Required minimum: "We collect this email to notify you when your broker review completes. We do not sell or share this email. We delete it 90 days after your request resolves." (Engineering implements the actual copy; this is the substantive requirement.)

4. **`requester_token` is opaque, cryptographically random, and not derivable from any other field.** Minimum 128 bits of entropy (UUIDv4 minimum acceptable; UUIDv7 or a 256-bit random hex preferred for guess-resistance). The token is the sole authority for an owner to read their own request status. Never log the token in plaintext to an audit table; if a forensic trail is needed, hash-and-store.

5. **`requester_contact` retention class: 90-day post-resolution.** Once `resolved_at` or `cancelled_at` is set, the email column is purged via a daily cleanup job (similar pattern to the existing soft-delete sweeps). The row itself is retained per audit posture, but the email column nullifies after 90 days. This satisfies CCPA minimization and matches the chat-transcript policy's posture of "we don't accumulate what we don't need."

6. **`address_input` is the owner's data and rides under the same retention class as the rest of the broker-review row.** Not subject to the 90-day email purge. The address is the substantive fact the broker reviewed; deleting it would gut the audit value.

### §2.4 Schema impact

```
requester_contact text NULL           -- optional, nullified at resolved_at + 90 days
requester_token text NOT NULL         -- opaque random, indexed for poll lookups
requester_contact_purged_at timestamptz NULL  -- audit of the purge
```

Indexes: `requester_token` is the lookup key, must be unique and indexed.

RLS: owner-read access scoped by `requester_token` (passed as a query param or header on the poll endpoint, verified server-side, never used in a SQL `WHERE` literal — bound parameter only). Resolution UPDATE restricted to service-role.

---

## §3. Decision B — Eligible disposition set for escalation: **Confirmed as proposed, with input_corrected and address-quality reasons excluded.**

### §3.1 Ruling

Eligible disposition set = **`{parcel_lookup_inconclusive, county_situs_gap, county_ambiguous, zimas_miss, zimas_timeout, zimas_error}`**.

Ineligible (must not be escalable):
- `confirmed_la` — the resolver has spoken; no broker review needed
- `not_la` — the resolver has spoken (parent ruling §2.4 forbids escalating not_la; carries forward)
- `input_corrected` — address quality issue, owner re-enters address
- All `no_locality` / `granularity_too_low` / address-quality manual-review reasons — owner re-enters address; broker can't attest a fact the geocoder couldn't establish
- `manual_broker_pending` — already in the queue; no double-submission

### §3.2 Why input_corrected and address-quality reasons are excluded

The broker-confirm path exists to attest a **jurisdictional fact** the automated chain couldn't establish (which city governs this parcel). It does not exist to attest **the address itself**. If the geocoder corrected the input or returned an insufficient-granularity result, the underlying issue is "we don't know what address you mean," and the broker cannot resolve that any better than the geocoder — only the owner can, by re-entering. Routing those to broker review would:

1. Waste broker review on a class of problem broker review can't solve
2. Create a path where an owner could pressure the broker to attest a parcel against an ambiguous address ("just confirm 1234 Main St LA, you know what I mean") — a defect in the address survives to the notice and gets defeated on a Bermudez-class facial challenge
3. Bloat the queue with submissions that don't belong there, raising the SLA-breach risk on the submissions that do

### §3.3 The added ZIMAS-class codes

I added `zimas_miss`, `zimas_timeout`, `zimas_error` to the eligible set (engineering's proposal only listed the County-class codes). Reason: a ZIMAS miss/timeout/error on a Predicate-5 in-set ZIP is exactly the class of failure-closed dead-end the parent ruling §2 is solving. An owner with a true-LA address whose parcel ZIMAS doesn't have indexed (or whose ZIMAS query timed out twice) should be able to escalate. The broker can attest via the Assessor portal or LAHD inquiry the parcel exists and is in LA.

### §3.4 Schema impact

Add a `CHECK` constraint on `prior_disposition` against the eligible set (or enforce in the API layer if the eligible set is expected to grow). I'll defer to engineering on the enforcement layer; the substantive rule is the set.

---

## §4. Decision C — SLA enforcement and notification: **C-1 (proactive notification) with conditions.**

### §4.1 Ruling

Adopt **C-1**: a daily cron job (pattern of migrations 020/022) computes pending requests past `sla_due_at` and:

1. Flips `status` from `pending` to `expired` for breach-tracking purposes
2. Sends a notification to `requester_contact` (if provided) per the conditions below
3. The status-poll endpoint also computes `expired` on read as a fallback for any cron miss

Status-on-read fallback per C-2 is preserved as defense-in-depth; we don't rely on the cron alone.

### §4.2 Conditions on the notification

1. **Channel:** **Email via the platform's existing transactional email provider** (Resend, per engineering's proposal — confirmed). Not SMS at this stage (TCPA/Rosenthal exposure on uninitiated SMS to a non-opted-in number; the polish memo flagged this risk class for courtesy reminders, and SLA notifications fall in the same risk class even when transactional). If we ever add SMS, it's a separate ruling.

2. **Two notifications per request, maximum.** One at `sla_due_at` minus 1 hour ("your broker review is due within the hour") if still pending, and one at `sla_due_at` ("your broker review is delayed; we'll route you to counsel"). No further notifications after that. Avoids the spam class of email behavior that triggers spam-complaint scoring and damages deliverability for the transactional channel we depend on.

3. **Owner-facing copy must include the route-to-counsel option at SLA breach.** Required substantive elements (engineering writes the copy, this is the substance):
   - Acknowledgment that the broker review took longer than expected
   - The owner's address (so they remember which request this is about)
   - A direct route-to-counsel link: "If you cannot wait further, here are California-licensed landlord-tenant attorneys: [link]." (The link target is the existing route-to-counsel surface; if that surface doesn't exist yet, that's a separate slice and Decision 2 cannot ship until it does.)
   - The option to cancel the request from the email (one-click, token-authenticated)

4. **Notifications only fire if `requester_contact` is non-null.** Token-only owners (no email) see expired status on poll but receive no proactive notification. The collection form's disclosure (per §2.3 modification 1) covered this.

5. **CCPA notice-at-collection text from the form survives into the email footer.** "You received this because you submitted a broker review request on [date]. We use this email only for broker review status; we do not add you to marketing emails. [Cancel this request] · [Privacy policy]." This makes the transactional-only posture observable to the recipient (and to any reviewing regulator).

### §4.3 Cron cadence

Daily is the proposed cadence. Refinement: **hourly during business hours (Pacific) on weekdays**, daily otherwise. Reason: a 24-hour SLA with a daily cron means the breach can sit unsent for up to 24 hours past breach, which materially worsens the dead-end UX we're solving. Hourly business-hours catches breaches within an hour of occurrence. Off-hours daily is fine because broker action also typically happens in business hours.

If hourly during business hours is operationally costly, fall back to daily — but engineering surfaces that as a separate fork rather than silently adopting.

### §4.4 Route-to-counsel surface dependency

Per §4.2 condition 3, the route-to-counsel link must exist before Decision 2 ships. If it doesn't, that's a blocker. Engineering should verify whether a route-to-counsel surface exists; if not, it's a prerequisite slice. (Probable answer: a static page listing CA landlord-tenant attorneys or the LACBA Lawyer Referral Service link. Doesn't need to be elaborate; needs to exist and be linkable.)

---

## §5. Audit-code additions

Per the parent ruling §5 and engineering's proposal, the audit codes added are:

- `manual_broker_pending` — request queued
- `manual_broker_confirmed_la` — broker attested LA at resolution
- `manual_broker_denied_la` — broker attested not-LA at resolution
- `manual_broker_inconclusive` — broker could not determine; routes to counsel (terminal)
- `manual_broker_cancelled` — owner cancelled
- `manual_broker_expired` — SLA breached without resolution

I added `manual_broker_inconclusive` to the engineering proposal. Reason: there is a class of address where the broker, after consulting all available sources, genuinely cannot determine jurisdiction (e.g., a parcel split between LA and unincorporated where the unit number's location within the parcel is ambiguous and the Assessor's portal doesn't resolve at unit granularity). Routing those to counsel is the right answer; treating them as `denied_la` would be a misrepresentation of the broker's attestation.

---

## §6. Build sequence

1. Migration 023 (table + RLS per Decision A + CHECK constraint per Decision B + retention parity)
2. TS queue contract + audit-code additions (§5)
3. Request/resolve route wiring (anonymous owner submit + token poll + broker service-role resolve)
4. Daily/hourly cron for SLA expiration + Resend notification (Decision C)
5. Unit tests covering: eligible disposition gate (Decision B), token-scoped read access, broker-only resolve, SLA expiry transitions, notification firing only when email present, cancellation flow with audit retention
6. **Stop for broker review before the owner-facing UI slice.**
7. UI slice (separate ruling/sign-off): request form (email-optional, CCPA notice-at-collection, transactional-only disclosure), pending-status polling display, cancellation affordance, breach copy + route-to-counsel link, produce-path gate update per §1.4

The route-to-counsel surface dependency (§4.4) — engineering verifies during step 1, flags as a blocker if it doesn't exist.

---

## §7. What this ruling does NOT change

- Parent ruling §2 four MUST FIX (positive action, audit attestation, 24-hr SLA, source-based) — all four carry forward unchanged
- Parent ruling §1, §3, §4 (spatial adapter, ZIMAS hardening, fallback order) — unchanged
- Disposition fork ruling (`county_spatial_zero_and_multi_feature_disposition_broker_ruling_2026-06-28.md`) §2 — unchanged
- §0 (never silently author compliance disposition logic) — unchanged
- Chat-transcript persistence policy — unchanged (this ruling expands the data-minimization posture to broker-review rows, doesn't change the chat policy itself)

---

## §8. Authorizations

Engineering authorized to proceed with §6 steps 1-5. Stop for broker review before §6 step 7 (UI slice). Surface any §0 fork I haven't anticipated; default behaviors above govern only if you don't surface.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
