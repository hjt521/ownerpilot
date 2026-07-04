# Determination Request — Decision 2 Backend Build: §0 Flags for Ruling

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker / compliance officer ruling)
**Status:** OPEN — surfaced at the §6 step-6 review checkpoint, before the owner-facing UI slice.
**Relates to:** `decision2_broker_confirm_path_design_broker_ruling_2026-06-28.md` (Decisions A/B/C, §4, §6) and the parent `county_parcel_lookup_method_broker_ruling_2026-06-28.md` §2.

---

## 0. Context

The broker-confirm backend (migrations 023/024, core + server logic, the three owner routes, the broker-run resolve tool, and the SLA Edge function) is built and unit-green (71 tests). While building it I made five engineering decisions that touch compliance/security posture or deviate slightly from the ruling text. Per §0 I encoded a default for each and am surfacing them for your ruling rather than letting the defaults stand silently. None blocks the backend; all are reversible.

---

## 1. Flag 1 — Token storage: hash-only

**Ruling text:** Decision A §2.4 lists `requester_token text NOT NULL` (the raw opaque token stored, indexed for poll lookups). §2.3.4 separately says "Never log the token in plaintext to an audit table; if a forensic trail is needed, hash-and-store."

**What I built:** the table stores **only `requester_token_hash` (SHA-256 of the token)**, never the raw token. The client holds the raw token; poll/cancel send it, the server hashes and looks up by hash.

**Why:** a database read-leak of a stored raw token would hand an attacker the sole authority to read every owner's request status. Storing only the hash removes that exposure while preserving the indexed lookup (by hash). This is the standard posture for bearer-style tokens and is consistent with §2.3.4's hash-and-store guidance.

**Decision requested:** confirm hash-only storage (recommended), or require the raw token be stored per §2.4's literal wording.

---

## 2. Flag 2 — ZIMAS-class eligibility maps to `parcel_lookup_inconclusive`

**Ruling text:** Decision B §3.1/§3.3 lists the eligible escalation set as including `zimas_miss`, `zimas_timeout`, `zimas_error`.

**What I built:** eligibility keys on the **reviewReason**, and the eligible set is `{parcel_lookup_inconclusive, county_situs_gap, county_ambiguous}`. The resolver maps **every** ZIMAS non-confirm (miss/timeout/error) to reviewReason `parcel_lookup_inconclusive` (the specific ZIMAS branch + failureMode are preserved on the linked `geocode_audit_log` row). So `parcel_lookup_inconclusive` **subsumes** all three ZIMAS dead-ends — they are escalable.

**Why:** the resolver's terminal taxonomy doesn't expose `zimas_timeout`/`zimas_error` as distinct reviewReasons; they all surface as `parcel_lookup_inconclusive`. Keying eligibility on that reason captures the ruling's intent (ZIMAS dead-ends on an in-set LA ZIP can escalate) without inventing reviewReasons the resolver never emits.

**Decision requested:** confirm this mapping (recommended), or direct that the resolver be changed to emit distinct `zimas_timeout`/`zimas_error` reviewReasons.

---

## 3. Flag 3 — SLA cron cadence: hourly 24/7

**Ruling text:** Decision C §4.3 proposes "hourly during business hours (Pacific) on weekdays, daily otherwise," with: "If hourly during business hours is operationally costly, fall back to daily — but engineering surfaces that as a separate fork."

**What I built:** plain **hourly, 24/7** (`0 * * * *`).

**Why:** one schedule instead of a two-window split; operationally trivial (a metadata sweep plus at most a few emails per run); and **strictly better** for the owner — a breach is caught within ≤1 hour at all times, including weekends, rather than potentially sitting unsent until the next business-hours window. This is a deviation toward *more* protection, not less, which is why I'm surfacing it (§4.3 only contemplated the fallback direction).

**Decision requested:** confirm hourly 24/7 (recommended), or hold to the business-hours-weekday + daily-otherwise cadence.

---

## 4. Flag 4 — SLA Edge function: inlined date logic vs. `_core` mirror

**Context:** the repo uses a build-time mirror discipline (`build:edge-core`, `build:parcel-health-core`) to share `lib/` logic into Edge functions with a CI sync guard. The new `broker-confirm-sla` Edge function's date math (SLA window, warning lead, 90-day purge) duplicates ~10 lines of `lib/brokerConfirm/brokerConfirmCore.ts`.

**What I built:** the date logic is **inlined** in the Edge function, with a comment pointing to `brokerConfirmCore` as canonical. No third mirror pipeline.

**Why:** standing up a full mirror + CI guard for one small function is disproportionate; the duplicated logic is trivial and stable.

**Decision requested:** accept the inline (recommended), or require a `build:broker-confirm-core` mirror to match the existing discipline (engineering will add it if you prefer the consistency).

---

## 5. Flag 5 — Route-to-counsel surface dependency (§4.4 — ship blocker)

**Ruling text:** Decision C §4.2.3 + §4.4: the SLA-breach email must include a route-to-counsel link, and "the route-to-counsel link must exist before Decision 2 ships."

**What I built:** the breach email links `BROKER_CONFIRM_COUNSEL_URL` (an env var). Recon found route-to-counsel *references* in the app (footer, options page, gates) but I have **not** confirmed a single canonical linkable page.

**Decision requested:** identify the canonical route-to-counsel target — (a) an existing page (give the path/URL), or (b) authorize a small new static page (e.g., a CA landlord-tenant attorney list or the LACBA Lawyer Referral Service link) as a prerequisite slice. The breach notification cannot ship until this resolves.

---

## 6. Summary of decisions requested

1. Token storage: **hash-only** vs raw.
2. ZIMAS eligibility: **subsumed under `parcel_lookup_inconclusive`** vs distinct reviewReasons.
3. Cron cadence: **hourly 24/7** vs business-hours split.
4. Edge date logic: **inline** vs `_core` mirror.
5. Route-to-counsel: name the canonical target / authorize a prerequisite page.

Items 1–4 have working defaults already encoded; item 5 is a ship prerequisite for the breach-notification path. The owner-facing UI slice (§6 step 7) remains separately gated.

— Engineering, 2026-06-28
