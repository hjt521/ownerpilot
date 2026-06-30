# Decision 2 — Produce-Gate Reconciliation After Broker Confirm · Broker Ruling

**Date:** 2026-06-28
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Status:** LOCKED
**Responds to:** Engineering checkpoint request mid-build of the owner-facing UI slice (2026-06-28)
**Parents:**
- `decision2_broker_confirm_path_design_broker_ruling_2026-06-28.md`
- `decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md`
- `decision2_owner_facing_ui_slice_broker_signoff_2026-06-28.md`

---

## 0. Disposition summary

| Question | Disposition |
|---|---|
| Status-view writes `cachedResolverVerdict = confirmed_la` on confirmed? | **APPROVED with three guardrails** |
| Server-side broker attestation row as record of truth? | **CONFIRMED — and produce-gate cross-checks against it** |
| Address-keyed reconciliation? | **APPROVED — but with normalization spec (§3)** |
| Engineering proceeds to wire? | **GO**, once §2 + §3 + §4 guardrails are in place |

The engineering instinct is right. The mechanism is correct. The hole is that "client-trust model" + "broker attestation as record of truth" can drift apart, and the produce-gate must NOT trust the client cache alone on a broker-confirmed property. Three guardrails below close the gap.

---

## 1. Why this is the most compliance-sensitive surface in Decision 2

The produce gate is the single control that prevents an LA-jurisdiction notice from being produced for a non-LA property. Every other control in Decision 2 (token storage, escalation eligibility, SLA timing, route-to-counsel copy) is one degree removed from that core failure mode. A bug here means we produce a defective notice and hand it to an owner who relies on it.

The decoupled architecture (wizard ↔ broker-confirm queue) is the right design — separate localStorage, separate page, no live coupling. But the price of decoupling is reconciliation, and reconciliation is where bugs hide.

The engineering proposal — status-view writes `cachedResolverVerdict = confirmed_la` keyed by address — is the right mechanism. It preserves the existing client-trust model and avoids inventing a parallel server-poll path in the wizard. The three guardrails below ensure the mechanism stays compliance-safe.

---

## 2. Guardrail 1 — Server-side cross-check at produce time

**Rule:** The produce action MUST verify against the server-side broker attestation row before producing, NOT solely against `cachedResolverVerdict`.

### 2.1 Mechanism

When the wizard's produce action fires AND `cachedResolverVerdict === 'confirmed_la'` AND the verdict was set by the broker-confirm path (vs the live resolver), the server-side produce endpoint MUST:

1. Look up the broker attestation row for the property address (normalized — see §3)
2. Verify the row exists and `outcome === 'confirmed_la'`
3. Verify the row's `resolved_at` is within an acceptable freshness window (see §2.4)
4. Verify the row's `requester_token_hash` matches what the client presents (proves the same anonymous session that submitted the request is producing — prevents one owner's confirm from unlocking another owner's address)
5. Only then allow produce

If any check fails: produce is blocked, client cache is invalidated, owner is shown a re-resolution prompt.

### 2.2 How the client signals "this was broker-confirmed"

Extend `cachedResolverVerdict` shape to include provenance:

```typescript
type CachedResolverVerdict = {
  outcome: 'confirmed_la' | 'not_la' | 'manual_review' | ...
  source: 'live_resolver' | 'broker_confirm'
  broker_confirm_token?: string  // present iff source === 'broker_confirm'
  resolved_at: string  // ISO timestamp
  address_normalized: string  // see §3
}
```

The status view, on confirmed, writes the full shape — not just `outcome`. The produce endpoint reads `source` and routes accordingly:
- `source === 'live_resolver'` → existing produce-gate logic (trust the cache, no server cross-check needed because the live resolver already returned this verdict during the same session)
- `source === 'broker_confirm'` → server cross-check per §2.1 mandatory

### 2.3 Why this matters

Without the server cross-check, a localStorage edit (deliberate or accidental — browser extensions, sync bugs, future code path that mutates the cache) could flip `cachedResolverVerdict = confirmed_la` without an actual broker confirm. The broker attestation row is the durable, server-side record of truth. The cross-check makes that record load-bearing instead of merely existing.

This is the same posture we already apply to the locked-prose CI guard: "the manifest is the record of truth; the code must match the manifest, not vice versa."

### 2.4 Freshness window

Broker attestations expire **30 days** after `resolved_at`. After 30 days, the cached verdict is treated as stale and the wizard re-resolves. Rationale: a parcel/jurisdiction confirm is good for a transaction, not forever; an owner who resolved a property in January and produces a notice in October should re-confirm. The 30-day window is generous enough not to be annoying, tight enough that stale state can't ride forever.

If `resolved_at` is older than 30 days at produce time, server returns a `stale_attestation` error and the wizard prompts re-resolution.

---

## 3. Guardrail 2 — Address normalization spec (LOCKED)

The engineering proposal "keyed by the address" only works if "the address" means the same thing in both the wizard and the broker-confirm queue. Today it doesn't have a written contract.

### 3.1 Normalization function

A single canonical function `normalizeAddressForJurisdictionKey(rawAddress: string): string` lives in `lib/jurisdiction/addressNormalize.ts`. Both the wizard cache write AND the broker-confirm submit AND the server cross-check call this function.

### 3.2 Normalization steps (in order)

1. Trim leading/trailing whitespace
2. Collapse internal whitespace to single space
3. Uppercase
4. Strip punctuation EXCEPT `#` (unit indicator) and `-` (hyphenated street numbers like `5537-A`)
5. Expand common abbreviations: `ST` → `STREET`, `AVE` → `AVENUE`, `BLVD` → `BOULEVARD`, `DR` → `DRIVE`, `LN` → `LANE`, `RD` → `ROAD`, `CT` → `COURT`, `PL` → `PLACE`, `WAY` → `WAY` (no-op, kept for completeness), `APT` → `UNIT`, `STE` → `SUITE`
6. Strip ZIP+4 suffix (keep base 5-digit ZIP)
7. Normalize unit number: `#202` → `UNIT 202`, `APT 202` → `UNIT 202`, `STE 202` → `SUITE 202`

Example: `5537 La Mirada Ave. #202, Los Angeles, CA 90029-1234` → `5537 LA MIRADA AVENUE UNIT 202 LOS ANGELES CA 90029`

### 3.3 Test coverage

Unit-test the normalization with at least these cases:
- The 5537 La Mirada example above
- The 1200 Wilshire confirm-already-shipped case
- A non-LA case (`123 Main St., Pasadena, CA 91101`)
- An ambiguous case (`PO Box 123, Beverly Hills, CA 90210`)
- An edge case (`5537-A La Mirada Ave Apt 202`)

If two normalized forms differ for the same physical address, that's a bug — write a test, fix the function, lock the new behavior in the manifest.

### 3.4 Manifest entry

The normalization function's behavior gets a locked-prose-equivalent guard: a snapshot test that asserts the normalized output of ~10 reference addresses. If the function's behavior ever changes silently, the test fails. Same discipline as locked-prose, applied to a code-path invariant.

---

## 4. Guardrail 3 — Cache invalidation on denial/inconclusive/expired

**Rule:** If the broker review resolves to anything OTHER than `confirmed_la`, the status view MUST invalidate any stale `cachedResolverVerdict` for that address (write `outcome: 'not_la'` or clear it), not merely show the route-to-counsel CTA.

### 4.1 Why

If the original resolver verdict was `manual_review` (which is what triggered the broker-confirm flow), there's no `confirmed_la` cache to invalidate — fine. But the wizard's logic might re-call the resolver between submit and resolution (page refresh, etc.) and land on a different verdict. If the broker then resolves to `denied`, the wizard cache could in principle contain a transient `confirmed_la` from a different code path, and the user could navigate back and produce.

This is a low-probability race but high-consequence. Closing it is cheap.

### 4.2 Mechanism

On status view, when polling returns a terminal non-confirm outcome (`denied`, `inconclusive`, `expired`):

1. Write `cachedResolverVerdict = { outcome: 'not_la', source: 'broker_confirm', resolved_at: <now>, address_normalized: <same key>, broker_confirm_token: <token> }` for the address-keyed draft
2. Show the route-to-counsel CTA per §2 G1/G2/G3 of the prior sign-off
3. The produce gate, reading `outcome: 'not_la'`, stays blocked. The owner cannot circumvent by navigating back to the wizard.

If the owner wants to retry (e.g., they think the broker got it wrong), they re-run the resolver from scratch — they don't get to revert the broker's denial via cache state.

---

## 5. What stays unchanged

- The decoupled architecture (separate page, separate localStorage) — correct, keep it
- Token-in-localStorage primary path + saved-link recovery + `/broker-review/check-status` secondary path — all unchanged
- The locked copy from the prior sign-off (§2 A–H, §3.3) — unchanged
- The wizard's existing produce-gate logic for `source === 'live_resolver'` — unchanged; this ruling only adds cross-check logic for the `source === 'broker_confirm'` branch
- The SLA cron, breach-notification path, route-to-counsel page — all unchanged

---

## 6. Acceptance criteria for the integration

Before merging the in-wizard integration PR:

1. `CachedResolverVerdict` type extended with `source`, `broker_confirm_token`, `resolved_at`, `address_normalized` fields
2. `normalizeAddressForJurisdictionKey` function lives in `lib/jurisdiction/addressNormalize.ts` with the §3.3 test coverage
3. Status-view-on-confirm writes the full extended shape, not just `outcome`
4. Produce endpoint, on `source === 'broker_confirm'`, performs the §2.1 server cross-check (attestation exists + outcome confirms + freshness < 30 days + token hash matches)
5. Stale attestation (> 30 days) returns `stale_attestation` and prompts wizard re-resolution
6. Terminal non-confirm outcomes write `outcome: 'not_la'` to the cache per §4.2
7. Unit tests covering: confirmed-then-produce (happy path), denied-then-tries-to-produce-via-cache-edit (blocked), stale-attestation-30-days-later (blocked), different-token-trying-to-produce (blocked), address-normalization-mismatch (blocked)
8. Manual mobile + desktop UI review per the prior sign-off §8

---

## 7. What I want to see at UI review

When you ping me for the §8 mobile/desktop review, walk me through these four scenarios on a real device:

1. **Happy path:** request review → broker confirms → status page shows confirmed → return to wizard → produce works
2. **Denied path:** request review → broker denies → status page shows denial + route-to-counsel CTA → try to navigate back to wizard → produce stays blocked
3. **Stale path:** mock a 31-day-old attestation → wizard prompts re-resolution → produce blocked until re-resolved
4. **Recovery path:** submit request → close browser → reopen on same device, localStorage cleared → use `/broker-review/check-status` with the saved link → status loads correctly

If all four behave correctly, the slice ships.

---

## 8. Housekeeping you flagged

- `rm _hashgen.mts host-side` — confirmed, do it
- Decision 2 files staying uncommitted for their own PR — correct posture; keep them out of any other branch
- Reference sweep — do it gently, only at the natural entry points you identified (footer, options "find an attorney"). Do NOT touch any locked-prose strings. If you find a "consult counsel" surface that already uses locked-prose wording, leave the wording and only swap the link target.

---

## 9. Authorization to proceed

Wire the integration with the §2, §3, §4 guardrails. Stop for review per §7 before merging. The produce gate is the single control that matters most in Decision 2 — these guardrails make it durable across the decoupled architecture.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
