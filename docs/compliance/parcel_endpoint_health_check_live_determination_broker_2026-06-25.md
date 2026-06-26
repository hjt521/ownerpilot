# Parcel Endpoint Health-Check "Live" Determination — Broker Authoritative Compliance Ruling

**Workstream:** B (parcelEndpointHealthCheckLive)
**Date:** 2026-06-25
**Posture:** OwnerPilot AI operates under California Real Estate Broker scope per Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, is sole compliance authority on this determination. This document defines the operative meaning of "live" for the County parcel endpoint and ZIMAS endpoint health-check gate condition. No attorney attribution attaches.

---

## §0 Why this determination exists

`parcelEndpointHealthCheckLive` is one of two remaining production-traffic gate conditions blocking `isLaProductionUnblocked()`. The flag reads true only when the County parcel endpoint and the ZIMAS (LA City Zone Information & Map Access System) endpoint are demonstrably available and responsive under operational conditions. The flag exists because the OwnerPilot produce path depends on parcel-level data from both endpoints to determine LA-specific RTC-overlay applicability; if either endpoint is unavailable when production calls it, the overlay determination is unreliable and the produced notice is at compliance risk.

This determination defines what "live" means before build scopes the predicate list. It binds: the build implementation, the attestation packet's evidence shape, the gate-read semantics, and the flip sign-off.

---

## §1 Determination summary

| Fork | Determination |
|---|---|
| What counts as a healthy probe | HTTP 200 + structured-response-shape validation + latency ceiling. See §2. |
| Freshness window | Last successful probe within the last 30 minutes for each endpoint. See §3. |
| Failure tolerance | Two consecutive failed probes flip the per-endpoint status to not-live. Both endpoints must be live for the flag to be live. See §4. |
| Fail-closed posture | New produce attempts block on not-live read; in-flight produce attempts that have already passed the gate-read complete; no produced notice is retroactively invalidated by a mid-production endpoint drop. See §5. |
| §2.6 condition definition + attestation predicate list + flip sign-off | See §6 (formal text) and §7 (predicate list scope). |

---

## §2 What counts as a healthy probe

A single probe is healthy if and only if **all three** conditions hold:

1. **HTTP 200 response.** Any other status code — 3xx, 4xx, 5xx — is unhealthy. No retry within the probe itself; retry semantics live at the cron-cadence level, not the probe level.

2. **Structured-response-shape validation.** The probe must verify the response body conforms to the expected shape for that endpoint, not merely return 200. Specifically:
   - **County parcel endpoint:** the probe issues a known-good parcel query (a test parcel APN or address that has stable existence in LA County records) and validates that the response contains the expected SitusHouseNo / SitusStreet / SitusZIP structured fields with non-null values. A 200 with an empty body or a 200 with malformed JSON is unhealthy.
   - **ZIMAS endpoint:** the probe issues a known-good parcel query (a test parcel that has stable existence in LA City zoning records) and validates that the response contains the expected zoning-information structured fields. Same posture: 200-with-empty-body or 200-with-malformed-response is unhealthy.
   - Build proposes the specific test queries (test parcel selection requires an engineering call about which parcels have the lowest churn risk in each system); broker rules on the proposed test parcels before slice 1 lands. Test parcels are documented in the attestation packet so the dependency is auditable.

3. **Latency ceiling.** Probe response time ≤ 10 seconds wall-clock from request issuance to response completion. A 200 with a structurally-valid response that took 45 seconds is unhealthy. Reasoning: production produce-path calls to these endpoints carry their own latency budgets; a probe response under 10s is the threshold below which the endpoint is plausibly usable in a production critical path. Latencies above 10s indicate the endpoint is degraded even if technically responsive, and the gate should read that as not-live to protect the user-facing produce experience.

If any of the three conditions fails, the probe is unhealthy. The probe records its outcome (healthy / unhealthy + reason) to durable state regardless.

---

## §3 Freshness window

The gate reads live only if the last **successful** probe for each endpoint occurred within the last **30 minutes** (UTC basis, same convention as the predicate-6 freshness guard).

Reasoning for 30 minutes: short enough that an endpoint outage cannot persist undetected long enough to affect production produces (cron at every 15 minutes, freshness window 30 minutes = at most one missed probe before stale-fail-closed), and long enough to tolerate a single missed probe without spurious gate-flips on transient infrastructure hiccups. The cron-cadence-to-freshness-window ratio of 2:1 mirrors standard liveness-probe design.

If the last successful probe is older than 30 minutes — for any reason, including the cron itself having failed to run — the gate reads not-live. **Fail-closed on staleness is uniform across all causes**, same posture as predicate 6: stale-because-endpoint-down, stale-because-cron-missed, stale-because-DB-unreachable, stale-because-clock-skew all produce the same not-live read. Build does not distinguish stale causes in the gate-read; cause information is recorded in durable state for operational diagnosis but does not affect the gate's binary read.

---

## §4 Failure tolerance

**Two consecutive failed probes** for a given endpoint flip that endpoint's per-endpoint status to not-live. A single failed probe does not flip the status; it is recorded as a failure event in durable state but the rolled-up status remains live until the second consecutive failure.

A subsequent successful probe — even one immediately after a single failure — resets the consecutive-failure count to zero for that endpoint.

The flag `parcelEndpointHealthCheckLive` reads true only when **both** endpoints' rolled-up statuses are live. If County is live and ZIMAS is not-live (or vice versa), the flag reads not-live. There is no partial-live state.

Reasoning for the 2-consecutive threshold: single-probe failures are not uncommon on internet-facing government endpoints (transient TLS errors, momentary load issues, single dropped packets). A 2-consecutive threshold filters out one-off transients while still detecting genuine outages within at most 30 minutes (two missed 15-minute-cadence probes). The reasoning chain — single failures filter, two consecutive fail-closed, freshness window cap at 30 minutes regardless — produces a maximum gate-down detection time of 30 minutes for any genuine endpoint outage, which is the acceptable operational ceiling for a produce path that is itself not real-time-critical (LA produce attempts are not high-frequency).

---

## §5 Fail-closed posture mid-production

When the gate transitions from live to not-live mid-production:

1. **New produce attempts block.** Any produce attempt initiated *after* the gate read returns not-live is blocked. The block surface is the same `isLaProductionUnblocked()` return — false reads halt the produce path at the same gate check that already exists for the other five conditions. No new code path required.

2. **In-flight produce attempts that already passed the gate-read complete.** A produce attempt that read the gate as live before the transition continues through to notice generation and delivery. The produce path holds the gate-read result for the duration of the produce attempt; mid-flight re-reads are not performed.

3. **No retroactive invalidation.** A notice produced before the gate transition is not retroactively invalidated by a subsequent not-live read. The notice was produced under a live-gate read, which was the operative compliance condition at the moment of production, and that determination stands.

Reasoning: re-reading the gate mid-produce would introduce nondeterminism (the same produce attempt could succeed or fail depending on probe timing within its execution window), which is a worse compliance posture than letting in-flight produces complete on their original gate-read. The freshness window (§3) and the 2-consecutive failure tolerance (§4) together ensure that the gate cannot be "stale-live" for more than 30 minutes after a genuine endpoint outage starts, which caps the worst-case window during which an in-flight produce could complete on a now-outdated gate-read. That 30-minute cap is acceptable for the produce path on the same operational reasoning given in §4.

**Operational corollary, not gate-read scope:** if a produce attempt encounters a parcel-endpoint failure *during* its execution (after gate-read but during the actual parcel data fetch), that's a produce-path error to surface at the user level — not a gate-read posture question. Build handles that error path under existing produce-path error handling, which is separately ruled; the gate-read fail-closed posture defined here governs gate-read semantics only.

---

## §6 Formal §2.6 condition definition

The `parcelEndpointHealthCheckLive` condition reads true if and only if all of the following hold:

(a) For the County parcel endpoint, the last successful probe (per §2 healthy-probe definition) occurred within the freshness window (§3) AND the consecutive-failure count is below the failure tolerance threshold (§4).

(b) For the ZIMAS endpoint, the last successful probe occurred within the freshness window AND the consecutive-failure count is below the failure tolerance threshold.

(c) Both (a) and (b) hold simultaneously at the moment of the gate read.

Any condition not met causes the gate to read false (not-live), per the uniform fail-closed posture (§3, §5).

---

## §7 Attestation predicate list scope

Build scopes the detailed predicate list against this determination. The predicate list must, at minimum, attest:

1. The County parcel endpoint health-check Edge Function is deployed and probes successfully against the broker-approved test parcel under the §2 healthy-probe definition.

2. The ZIMAS health-check Edge Function (or shared function probing both endpoints) is deployed and probes successfully against the broker-approved test parcel under the §2 healthy-probe definition.

3. The cron schedule is configured for the agreed cadence (target: every 15 minutes, build proposes specific cron expression; broker confirms before slice ships) and the cron is observed running on schedule.

4. The durable state tables for probe history and rolled-up status are migrated, RLS-tightened in the 012–016 discipline, and reader-role/policy configured.

5. The freshness-window guard and 2-consecutive-failure logic are implemented in the gate-read path, tested at boundary conditions (29 minutes stale, 30 minutes stale, 1 consecutive failure, 2 consecutive failures, both endpoints live, one live one not-live).

6. The fail-closed posture (§5) is implemented and tested for new-produce-blocks-on-not-live AND in-flight-produces-complete behaviors.

7. The gate-read mechanism (internal route + reader-auth pattern from predicate 8, OR simpler in-process equivalent — build proposes, broker rules separately as a sub-fork) is implemented and exercised by the gate.

8. Test parcel selection for each endpoint is documented in the attestation packet (per §2.2) with broker sign-off on the chosen parcels.

Build may add additional predicates as engineering surfaces them; the eight above are the minimum. Final predicate count and ordering are build's scoping call against this determination.

---

## §8 Flip sign-off scope

The `parcelEndpointHealthCheckLive` flip from false to true requires:

1. The attestation packet committed under the same shape as the RTC form-refresh packet (§1 evidence index with predicate verdicts, §2 committed inventory, §3 external evidence, §4 broker authority chain, §5 scope notes, §6 broker §0 posture + per-predicate verdicts + overall attestation + CalDRE signature).

2. Broker §6 attestation per-predicate PASS verdicts on every predicate in the final list (§7 minimum or whatever build expands to).

3. The flip patch follows the exact-match-or-abort discipline established in the RTC PR — comment-sync requirement for both `laRtcRules.ts` and `laOverlay.test.ts` in the same PR as the boolean flip.

4. The go-live attestation reservation: if this workstream's flip is the **second** of the final two to land (the gate-opening flip), the per-predicate attestation here is not sufficient on its own — it must be supplemented by the go-live attestation referenced in the kickoff prompt (full operational-readiness sign-off, exercising the produce path end-to-end on a real LA address, broker go-live verdict above the per-predicate ones). Broker will author the go-live attestation shape as a separate determination before the second flip lands. If `cityOfLaZipsAuthoritative` lands second, this workstream's per-predicate attestation is sufficient and the go-live attestation attaches to that one instead. Order of landing is open per the kickoff doc; broker will rule on order before either workstream nears flip.

---

## §9 Scope boundaries

This determination governs:
- The operative definition of "live" for the `parcelEndpointHealthCheckLive` flag
- The healthy-probe, freshness-window, failure-tolerance, and fail-closed posture for the gate-read semantics
- The minimum attestation predicate list and the flip sign-off requirements

This determination does **not** govern:
- Specific test parcel selection (build proposes, broker rules separately before slice 1)
- The gate-read transport mechanism — internal route + reader-auth vs. simpler in-process equivalent (build proposes, broker rules separately as a sub-fork)
- Produce-path mid-execution error handling when parcel endpoints fail after gate-read (separately ruled under existing produce-path error handling)
- The go-live attestation shape (separately authored before second-flip)
- The order in which Workstream A and Workstream B land (separately ruled before either nears flip)
- The cron expression specifics (build proposes target 15-minute cadence; broker confirms before slice ships)

---

## §10 Open sub-forks build must surface as ruling-requests before slice 1 ships

1. **Test parcel selection** for County and ZIMAS — build's research, broker rules on chosen parcels. Documented in attestation packet (§7.8).
2. **Gate-read transport** — internal-route + reader-auth (predicate-8 pattern) vs. simpler in-process boolean read. Build proposes with reasoning; broker rules. Driver: whether anything outside the serve path needs to read the flag.
3. **Cron expression confirmation** — target 15-minute cadence per §3 reasoning; build proposes specific cron syntax (e.g., `*/15 * * * *` UTC), broker confirms.
4. **Alerting destination** — failure-mode notifications need a routing target (broker contact, on-call alias, or other). Broker rules on alert destination before alerting code lands.

Surface each as a small ruling-request inline; no need for a full determination file unless the fork has §0-class compliance prose. The four above are operational and can ride inline rulings same as the read-route and caller-auth gating rulings from the RTC packet.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
