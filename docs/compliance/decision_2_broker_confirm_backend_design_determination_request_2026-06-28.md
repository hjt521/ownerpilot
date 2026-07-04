# Determination Request — Decision 2 Broker-Confirm Path: Backend Design & Forks

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker/compliance ruling)
**Decision owner:** California Licensed Real Estate Broker (CalDRE B9445457)
**Status:** OPEN — blocks writing the broker-confirm queue migration.
**Authorizes from:** `county_parcel_lookup_method_broker_ruling_2026-06-28` §2 (manual broker-confirm path) + the four §0 forks JT flagged + §2 four MUST FIX.

---

## 1. Why this request (the "stop and surface" trigger)

Building to §2, I hit design decisions with security/compliance surface that I won't encode unilaterally:

1. **The notice flow is anonymous.** The wizard persists a localStorage draft (`op.noticeDraft.v1`) with no login — there is no `auth.uid()` for an owner. So "owner-initiated request," "owner sees status," "owner cancels," and the 24h-SLA "notify the owner" all depend on an owner-identity model we have not yet defined.
2. **Existing audit tables are insert-only with zero read-back** (migration 002 posture). A broker-confirm queue the owner *reads* (to see status) departs from that posture and needs its own RLS design.
3. The four forks you flagged interact with both of the above.

Everything below is proposed; the **bold decisions in §4** need your ruling.

---

## 2. Proposed schema (concrete, for approval)

New table `public.broker_confirm_requests` (migration 023), following the 002 conventions (uuid PK, `retention_class`, `legal_hold`, `soft_deleted_at`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `requester_contact` | text | owner contact for follow-up — see Decision A (identity model) |
| `requester_token` | text | opaque per-request token the client holds to poll status (anonymous-flow friendly) |
| `address_input` | text | the owner's own address (their data) |
| `decision_input_hash` | text | joins to `geocode_audit_log` (the inconclusive decision being escalated) |
| `prior_disposition` | text | e.g. `manual_review` |
| `prior_review_reason` | text | the inconclusive reason that made it eligible (Decision B) |
| `status` | text | `pending` \| `confirmed` \| `denied` \| `cancelled` \| `expired` |
| `sla_due_at` | timestamptz | `created_at + 24h` |
| `resolved_at` | timestamptz | |
| `cancelled_at` | timestamptz | owner cancellation (fork 3) |
| `broker_confirm_actor` | text | §2.2 MUST FIX — who attested |
| `broker_confirm_timestamp` | timestamptz | §2.2 |
| `broker_confirm_basis` | text | §2.2 — sources consulted + what they returned |
| `broker_confirm_outcome` | text | `confirmed_la` \| `denied_la` (§2.2) |
| `retention_class` / `legal_hold` / `soft_deleted_at` | … | 002 retention parity |

Audit-code additions (per the spatial ruling §5): `manual_broker_pending` (queued), `manual_broker_confirmed` (resolved confirm), and a broker `denied_la`.

---

## 3. The four flagged forks — encoded as your stated defaults (please confirm)

| Fork | Your default | How I'd encode it |
|---|---|---|
| 1. Queue visibility scope | broker-only (Phase 1) | Resolution (the attest UPDATE) restricted to the broker via a service-role-backed admin surface; `broker_confirm_actor` records identity so multi-broker delegation (§2.3 SHOULD FIX) is schema-ready. Owner sees only their own request (via `requester_token`), never the queue. |
| 2. Re-submission on prior-denied | re-run resolver; cache prior denial as soft warning | No DB block on re-request; on a new request for an address with a prior `denied` row, surface that denial as a non-blocking warning. History retained. |
| 3. Owner cancellation | yes, with audit retention | `status='cancelled'` + `cancelled_at`; row retained (no delete), `soft_deleted_at` untouched. |
| 4. UI while pending | block notice-generation, allow draft work | Produce-path gate treats `manual_broker_pending` as not-yet-confirmed (no packet); the rest of the form stays editable. (UI slice, but noted so the backend status supports it.) |

If any of these is wrong, say so and I'll re-encode.

---

## 4. New decisions that need your ruling (not covered by the four forks)

### Decision A — Owner-identity model for an anonymous flow
The flow has no login. To support "owner requests / sees status / gets the 24h-SLA notice," I propose:

- **A-1 (proposed):** capture an **email** at request time (`requester_contact`) purely for broker follow-up + SLA-breach notification, plus an opaque `requester_token` (stored client-side) to poll status without auth. No account required.
- A-2: require login (Google SSO) before a broker-confirm request; key on `auth.uid()`. Higher friction; conflicts with the anonymous wizard.

**Question:** A-1, A-2, or other? If A-1, is collecting an email at this step acceptable for a 50+/mobile/stressed audience, and what's the retention class for `requester_contact`?

### Decision B — Eligible disposition set for escalation
§2.4 forbids escalating `not_la`. I propose **eligible = {`parcel_lookup_inconclusive`, `county_situs_gap`, `county_ambiguous`}**. Open: should `input_corrected` (correction-suppressed) and the granularity/`no_locality` manual-review reasons be **excluded** (they're address-quality issues better fixed by re-entering the address, not broker attestation)?

**Question:** Confirm the eligible set; rule on `input_corrected` and address-quality reasons.

### Decision C — SLA enforcement + notification mechanism
§2.2 MUST FIX requires a 24h SLA and, on breach, owner notification + route-to-counsel.

- **C-1 (proposed):** a daily cron (pattern of migrations 020/022) flips `pending`→`expired` past `sla_due_at` and triggers a Resend email to `requester_contact`; status is also computed-on-read as a fallback.
- C-2: on-read only (no proactive notification).

**Question:** C-1 or C-2? If C-1, confirm Resend as the notification channel and the route-to-counsel copy owner-facing.

---

## 5. What I'll build the moment §4 is ruled

Migration 023 (table + RLS per Decision A + retention parity), the TS queue contract + audit-code additions, the request/resolve route wiring, and unit tests — then stop for your review before the owner-facing UI slice. Mirror/CI/deploy remain your host-side steps.

— Engineering, 2026-06-28
