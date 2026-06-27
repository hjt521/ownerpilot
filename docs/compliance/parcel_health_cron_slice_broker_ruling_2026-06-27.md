# Parcel-Health Cron-Slice — Broker Ruling (2026-06-27)

**Author:** JT (broker). **Date:** 2026-06-27.
**Implements:** Move A / A3 (operationalize parcel-health — cron slice).
**Migration:** `supabase/migrations/020_parcel_health_cron.sql` (cites this ruling in its header).
**Honors:** the §3 freshness window (30 min) of
`parcel_endpoint_health_check_live_determination_broker_2026-06-25.md`.

> Note (build record): mechanic #4 (Vault-read) was implemented in 020 via the
> `vault.decrypted_secrets` view-read under `pg_cron`'s `postgres` role, NOT
> `vault.read_secret(...)`. `vault.read_secret` does not exist in this project (verified
> 2026-06-27); the view-read is the working, intent-preserving substitute. This ruling-as-
> archived reflects what was built.

---

## Ruling: every 30 minutes (`*/30 * * * *` UTC)

The reasoning runs across three axes, and each one independently points to 30 minutes;
together they make it the unambiguous answer.

### Axis 1 — Freshness-contract alignment (§3 of the live determination)

The §3 freshness window is 30 minutes (broker-ruled 2026-06-25). A rolled-up status older
than 30 minutes cannot be read by the gate; the gate read fails closed in that case, which
means a delinquent cron is operationally equivalent to a `not_live` endpoint regardless of
what the endpoint is actually doing.

Cadence and freshness window must be coherent or the gate self-poisons:

- **Cadence > freshness window** = the gate spends most of its life looking at stale data
  that fails the freshness check. A twice-daily cadence (12 h) keeps the gate's view fresh
  for the first 30 minutes after each run and stale for the remaining 11.5 h — effectively
  closed-by-staleness ~95.8% of the time, even when both endpoints are perfectly healthy.
  That is structural incoherence: the gate is gated by the cron's lateness, not endpoint
  health.
- **Cadence ≤ freshness window** = the gate's view is continuously fresh, because every
  cycle refreshes the rolled-up status before the prior cycle's status ages out. The cron's
  cadence is the renewal mechanism for the freshness contract.

A 30-minute cadence under a 30-minute freshness window is the minimum cadence that satisfies
the freshness contract. Any slower cadence breaks §3 the moment LA opens (the resumption
brief §7 named the "re-cadence before LA opens" landmine; 30 min avoids it entirely).

Tighter than the window (e.g. 15 min, two cycles per window) was considered and rejected:
§3 requires the gate's view to be *fresh*, not that the gate hold two recent observations
per window. One cycle per window honors the contract exactly as written; going tighter is
redundancy against `pg_cron` flakiness that has no observed history of being a problem.

### Axis 2 — Step-6 attestation runway (§9 of the resumption brief)

§9 sets the minimum at 30 cycles and ≥1 real transition before step 6 is defensible.
Cadence determines the runway:

- Every 30 min → 30 cycles in **15 hours** (step 6 attestable inside one calendar day).
- Hourly → 30 cycles in 30 hours.
- Twice daily → 30 cycles in 15 days.
- Every 15 min → 30 cycles in 7.5 hours.

Fastest is not best:

1. **30 cycles is a floor, not a target.** A faster cadence produces a thinner attestation —
   30 measurements over 7.5 h observe less of the endpoints' diurnal behavior than 30 over
   15 h. Defensibility is proportional to temporal coverage, not just cycle count. 15 hours
   catches one full day-night cycle of both endpoints, roughly the right floor for "the gate
   has seen these endpoints under varied conditions."
2. **Faster cadence doesn't accelerate LA opening.** Even at every-15-min, LA still doesn't
   open because Workstream A (predicate 5) independently blocks. The binding constraint is
   Workstream A's ruling, not parcel-health's cycle count.
3. **Operational load asymmetry / diminishing returns.** Twice-daily would make step-6
   readiness a two-week wait — too slow relative to the engineering work landing this week.
   Every-30-min makes it an overnight wait, matching the pace. Every-15-min trims hours off
   a wait that doesn't bind anything.

15 hours to step-6 readiness is the right pace — fast enough that step 6 isn't bottlenecking
the LA path, slow enough that the attestation packet has meaningful temporal coverage.

### Axis 3 — Load and politeness on public LA endpoints

Both probe targets are public California-records endpoints (County parcel MapServer; ZIMAS
LA City Planning landbase). Neither has a documented rate limit; both are observably fine
under heavy public use.

At 30-minute cadence: 48 cycles/day × 1 GET per endpoint per cycle = 48 GETs/day each. That
is observationally invisible next to the tens of thousands of daily queries each endpoint
already serves. We are not a meaningful contributor to load at this cadence (nor at 15-min,
96/day). Load does not distinguish the options.

The one politeness discipline that matters: the `User-Agent: ownerpilot-parcel-health/1.0`
header (drip-001 §2.4 / drip-003 §3.3) makes our traffic identifiable in their access logs —
a defensive posture, not an apology for volume.

---

## Why not the other options

- **Twice daily (§8 baseline) — rejected, and the §8 baseline is corrected.** The earlier
  §8 "twice-daily" was a carry-over from the statute-watch cron's cadence, reasoned by
  analogy before the §3 freshness window was reconciled against the cron cadence. Under a
  30-minute freshness window, twice-daily is structurally incoherent. **This ruling
  supersedes §8's twice-daily framing; do not cite §8 as cadence precedent.**
- **Hourly — rejected.** Same incoherence as twice-daily, less severe: the gate's view is
  fresh for the first 30 min of each hour and stale for the second 30. Closed-by-staleness
  ~50% of the time even with both endpoints healthy.
- **Every 15 min — rejected.** Over-engineering. Doubles the cycle count for no incremental
  gain against any binding constraint. The 30-minute window is satisfied at one cycle per
  window; doubling is redundancy against unobserved `pg_cron` flakiness. If `pg_cron` ever
  proves flaky in practice, re-rule cadence then, with measured evidence.

---

## Enduring invariant: `cron_cadence ≤ freshness_window`

The two constants are coupled by the determination's structure, not independent knobs. If
the freshness window is ever eased (e.g. to 1 hour), the cron may ease in parallel; if it is
ever tightened (e.g. to 10 min), the cron must tighten in parallel. Any future ruling that
touches either constant must honor this coupling. (020 documents this as a one-line invariant
comment at the schedule-expression call site.)

---

## The four mechanics (resumption brief §2.3), now ruled

1. **Schedule expression:** `*/30 * * * *` UTC — runs at `:00` and `:30` past every hour,
   every day. No timezone offset; this is an observability cron, local-time alignment is
   irrelevant.
2. **`pg_net.http_post` call shape:** as built in 020 — 30 s timeout, custom
   `x-parcel-health-secret` header, empty JSON body, Vault-read secret.
3. **Cadence justification:** this ruling (axes 1–3 above).
4. **Vault-read mechanics:** read the invocation secret from Vault under `pg_cron`'s
   `postgres`-role context. Implemented via the `vault.decrypted_secrets` view-read (see the
   build-record note at the top — `vault.read_secret` does not exist in this project). The
   secret never appears as a literal in `cron.job`; the stored command holds the subquery,
   which resolves at each tick. Failure mode is loud: a missing/unreadable secret yields a
   null header → Edge returns 401 → `cron.job_run_details` surfaces it.

---

## Idempotent-update pattern (operational note for future edits)

`cron.schedule(name, ...)` UPSERTS by job name (`parcel-health-probe`) — re-running 020
updates the existing job rather than duplicating it. To CHANGE the cadence later, write a
NEW migration (021) that calls `cron.schedule` with the same job name and the new
expression. Do NOT use `cron.unschedule` + `cron.schedule`.

---

## Activation posture: activate now, do not hold

Both activation preconditions from the prior ruling are met:

1. Post-measurement PR merged + clean-cycle smoke test green.
2. Resend sender domain verified + manual end-to-end alert test delivered to the operator
   inbox.

The activation-blocking conditions no longer exist. Ruling: **activate 020 now.** Reasons:

1. Preconditions exist so that activation is safe once met; inventing a new precondition now
   would undermine the discipline of pre-stating gates and respecting them when they clear.
2. Step-6 readiness is the binding constraint and is purely time-elapsed; every hour 020
   sits unactivated is an hour of readiness deferred, with nothing else to verify.
3. Activation is reversible: `cron.unschedule('parcel-health-probe')` reverses it in one SQL
   call. The risk of activate-then-unschedule is bounded; the cost of hold-when-ready is
   unbounded. Asymmetric in favor of activation.

Schedule activates on the next `pg_cron` tick after the migration applies. LA gate stays
4/6; Workstream B's path to predicate 6 is now purely time-elapsed plus broker-authored
step-6 attestation work. Workstream A continues independently.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27
