# Broker Determination — Migration 016: Scoped SELECT Policy for `rtc_block_state_reader`

**Posture:** Broker-scope compliance review (Bus. & Prof. Code § 10131(b)). Jack Taglyan, CalDRE B9445457, sole compliance authority. This determination authorizes a bounded amendment to the RLS posture ruled in the RTC refresh runner architecture determination (D-5/§2.6), creating a narrow scoped read window for the `rtc_block_state_reader` role on `rtc_refresh_state` and `rtc_refresh_pins`.

**Companion docs:**
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (D-5/§2.6 — the ruled RLS posture being amended; P-B — the sanctioned read path)
- `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` (M-1(ii) — pre-signed JWT; role `rtc_block_state_reader`; SELECT-only-on-two-tables scope)

Standalone file: yes. Matches the existing compliance-doc pattern; gives the migration a citable §0 to point at.

---

## §1 Ruling Summary

| Decision Point | Disposition |
|---|---|
| **Mechanism** | **Scoped RLS SELECT policy** for role `rtc_block_state_reader`. **REJECT** `BYPASSRLS` (globally RLS-exempt; heavier blast radius than needed; reader's privilege should derive from a named policy, not from being RLS-immune). |
| **Predicate** | **`USING (true)`** — reader sees all rows. Block-state is non-PII; serve path needs every language's status to compute the freshness/blocked-language decision. No narrower predicate buys anything. |
| **Scope** | **Both `rtc_refresh_state` and `rtc_refresh_pins`.** Migration 014 granted SELECT on both; partial coverage would leave `rtc_refresh_pins` with the identical gap. |
| **Vehicle** | **Migration 016.** Hand-applied in SQL Editor in the same sitting as 012→013→014→015 (or as a follow-up sitting if those have already been applied; broker's call at apply time). |
| **Framing** | **Completion, not reversal.** D-5/§2.6's "no policies" line was load-bearing against `anon`/`authenticated`, not against a scoped server-only reader that hadn't been built yet. |

---

## §2 Reasoning

### §2.1 Why this is a completion of D-5/§2.6, not a reversal

D-5/§2.6 ruled "RLS on, no policies → app sees/writes nothing." The word "app" in that ruling carried a specific meaning that the surrounding architecture makes explicit: the public-facing roles (`anon`, `authenticated`) that any Vercel runtime path could reach via the standard Supabase client. The intent was a wall against ambient public access — not a wall against every possible role that might later be authorized via a deliberate, broker-ruled credential.

The `rtc_block_state_reader` role did not exist at the time D-5/§2.6 was ruled. It was created later by migration 014 under the reader-auth determination (M-1(ii)), as the **sanctioned read path** — the same architecture ruling's P-B prong — explicitly to give the serve path a bounded, server-only, SELECT-only window into block-state. The role is:

- **Server-only.** Reachable only via a pre-signed JWT held in `SUPABASE_RTC_READER_JWT` (Vercel server env), not exposed to the browser.
- **NOLOGIN.** Cannot be authenticated against directly; only assumable via the pre-signed JWT path.
- **SELECT-only on two tables.** Migration 014 granted nothing else; no UPDATE, no INSERT, no DELETE, no access to any other table.
- **Distinct from the public roles.** `anon` and `authenticated` are unaffected by this policy and continue to see nothing.

Reading D-5/§2.6 as forbidding a scoped policy for this role would mean the runner architecture had ruled its own read path (P-B) impossible — which is not what the ruling did. The "no policies" line was a default-deny posture against the public-role surface, and that posture remains intact. What migration 016 does is cut **one** named-role window through the wall, sized exactly to what P-B requires, and no wider.

That is completion of the design, not contradiction of it.

### §2.2 Why scoped policy over `BYPASSRLS`

`BYPASSRLS` would work mechanically — the reader would see rows — but it makes the role globally RLS-exempt on every table it has any grant on, present or future. That is heavier than what's needed and creates a footgun: if any future migration grants `rtc_block_state_reader` SELECT on a third table (intentionally or by mistake), the reader would see all rows there too, bypassing whatever RLS posture that third table carries.

A scoped policy keeps RLS as the architectural wall and cuts one labeled window. If the role's grants ever widen, the new tables' RLS postures apply by default; the reader sees nothing on them unless a new policy is authored. That is the safer default and matches the rail principle: privilege flows from named, citable grants, not from blanket exemptions.

### §2.3 Why `USING (true)`

The serve path's freshness guard (predicate 6) needs to read every language's `last_successful_refresh_at` to decide which languages to block. There is no row-level partition that would help: the reader is not a tenant, not a user, not a per-language process; it is the singleton server-side serve path reading a small global state table. Adding a narrower predicate (e.g. by language, by jurisdiction, by recency) would be a check that the serve path itself can already make in application code against the returned rows, with no security benefit since block-state is non-PII operational data.

`USING (true)` is the honest, minimal predicate for this access pattern. It does not widen the role's reach beyond the two tables migration 014 already grants SELECT on.

### §2.4 Why both tables

Migration 014 granted `rtc_block_state_reader` SELECT on `rtc_refresh_state` and `rtc_refresh_pins` together because the reader-auth ruling treated them as a single block-state surface. Applying the policy to only one would leave the other in the same default-deny posture that triggered this determination — the probe would pass for `rtc_refresh_state` and fail identically for `rtc_refresh_pins`. Both tables, one migration, symmetric posture.

### §2.5 What stays intact (memorialized)

This determination does not touch:

- **The INSERT-only / no-public-access wall on `rtc_refresh_state`, `rtc_refresh_pins`, or `rtc_refresh_run_results`** — migrations 012, 013, and 015 remain fully in force.
- **Write access.** The policy is SELECT-only. `rtc_block_state_reader` has no INSERT, UPDATE, or DELETE grants and this determination authorizes none.
- **Public-role access.** `anon` and `authenticated` continue to see nothing on either table. The policy is role-scoped to `rtc_block_state_reader`; no other role gains anything.
- **The Edge Function's write path.** The refresh runner writes as `service_role` via the Edge Function's server-side client. That path is unchanged.
- **The rail principle.** Write-capable identities still never leave Supabase. The reader role is SELECT-only on two tables and cannot mint, escalate, or write.

### §2.6 Migration 016 must include this comment block

The migration SQL must carry a header comment block that cites this determination by filename and date, and includes the framing language from §2.1 ("completion of D-5/§2.6, not reversal"). This is non-negotiable — a future reviewer reading 016 in isolation must be able to find the determination that authorized it without reconstructing intent from the diff.

### §2.7 Probe-verify is a precondition for the route

Migration 016 is not "done" when applied. It is done when the probe sequence passes:

1. Insert a synthetic row into `rtc_refresh_state` as `service_role`.
2. Reader curl through the JWT path (M-1(ii)) against the Supabase REST endpoint.
3. Expect the row in the response.
4. Cleanup: delete the synthetic row as `service_role`.

If the probe fails post-016, the route is **not** built. Build surfaces the failure mode; broker rules on next step. The route depends on the probe being green; the freshness guard depends on the route. Order is locked.

### §2.8 No new role, no new grant, no new table

Migration 016 creates a policy. It does not create a role (014 did that), grant any new privilege (014 did that), or alter any table's structure (012/013 did that). It is a single `CREATE POLICY` operation per table — two statements total, plus the header comment block. Anything more in 016 is scope creep and must be surfaced for separate ruling before inclusion.

---

## §3 Action Items

**Build (next, after this determination lands):**

- [ ] **Author migration 016 SQL** matching this determination byte-faithfully:
  - Header comment block citing `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` by filename, with the §2.1 completion-not-reversal framing in the header prose.
  - `CREATE POLICY` on `rtc_refresh_state` — role `rtc_block_state_reader`, command `SELECT`, `USING (true)`.
  - `CREATE POLICY` on `rtc_refresh_pins` — role `rtc_block_state_reader`, command `SELECT`, `USING (true)`.
  - Policy names: explicit and citable (e.g. `rtc_block_state_reader_select_all` on each table; build's call on exact naming, but the name must reference the role and the SELECT-all predicate).
  - No other statements. No role creation, no grants, no table alterations, no data writes.
- [ ] **Surface 016 SQL for broker review** before applying. Broker reads the SQL against this determination; if byte-faithful, broker greenlights apply.

**Broker (me, at apply time):**

- [ ] Apply migration 016 by hand in Supabase SQL Editor under the existing migration discipline (same sitting as 012-015 if not yet applied; standalone sitting if those are already in).
- [ ] Confirm apply success and notify build.

**Build (after 016 applied):**

- [ ] **Re-run the reader probe** end-to-end:
  1. Insert synthetic row in `rtc_refresh_state` as `service_role` (SQL Editor or a one-off script — build's call).
  2. Curl the Supabase REST endpoint with the reader JWT.
  3. Expect the synthetic row in the response. Capture the response body for the attestation record.
  4. Repeat (1)-(3) for `rtc_refresh_pins`.
  5. Cleanup: delete both synthetic rows as `service_role`.
- [ ] **Surface probe results to broker.** If both tables return the synthetic row through the reader JWT path, broker greenlights the route build. If either fails, build surfaces the failure mode and pauses.
- [ ] **After probe green:** resume the block-two scope doc work — predicate 8 (read route + route tests) first, then predicate 6 (freshness guard) on top.

**Attestation packet:**

- [ ] Add this determination file and the probe-result capture to the attestation evidence under predicate 8 (read route deployed; serve path reads through it). The probe is the evidence that the reader role can in fact read; the migration 016 SQL is the evidence of how that access was authorized.

---

## §4 Scope Boundaries (what this determination does NOT authorize)

For clarity, and to prevent future drift:

- **No new policy on any other table.** If a future need arises for the reader to read a third table, that requires a new determination, not an extension of this one.
- **No new role.** Anyone proposing a `rtc_block_state_writer` or similar must surface a separate ruling-request; this determination does not template such a role into existence.
- **No widening of the reader's predicate.** `USING (true)` here is bounded to two tables that contain non-PII operational state. It is not a precedent for `USING (true)` on tables containing user data, financial data, or notice content.
- **No `BYPASSRLS` anywhere.** The architectural commitment is to scoped policies, not blanket exemptions. Future rulings should follow this pattern.
- **No automation of the apply step.** Migration 016 is hand-applied in SQL Editor under the same broker-applies discipline as 012-015. No CI, no migration runner, no service-account apply path is authorized by this determination.

---

## §0 Posture Footer

OwnerPilot AI = broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, sole compliance authority. No attorney attribution attaches to this determination. This determination amends D-5/§2.6 of `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` for the narrow case of the `rtc_block_state_reader` role on `rtc_refresh_state` and `rtc_refresh_pins`, on the framing that the amendment completes the runner architecture's P-B read path rather than contradicting D-5/§2.6's anti-public-role default-deny posture. All other walls — INSERT-only on run-results, no public-role access, no write capability outside the Edge Function's `service_role` path, no rail-credential exposure to Vercel runtime — remain fully in force.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
