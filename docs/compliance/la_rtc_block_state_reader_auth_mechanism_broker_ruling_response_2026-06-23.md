# RTC block-state read-route auth mechanism — Broker Ruling Response

**File:** `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md`
**Date:** 2026-06-23
**Authority:** Bus. & Prof. Code § 10131(b); OwnerPilot AI broker-scope posture
**Companion docs:**
- `la_rtc_block_state_reader_auth_mechanism_ruling_request_2026-06-23.md` (build's request, 134 lines)
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (governing R-4 / P-B / §2.6 reader-role determination)
- `service_role_vercel_exposure_broker_determination_2026-06-22.md` (standing rail)
- `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md` (W4)

**Posture:** Broker-scope only. No attorney engagement. Janna Taglyan has no operative authority. This ruling concerns substrate/auth-mechanism architecture under broker compliance review; it is not legal advice.

---

## §0 — Standing posture

OwnerPilot AI operates exclusively within broker scope under Bus. & Prof. Code § 10131(b). All determinations herein are issued under Jack Taglyan's broker compliance authority (CalDRE B9445457).

---

## §1 — Ruling summary table

| # | Determination | Ruling | Status |
|---|---|---|---|
| D-1 | Mechanism: M-1(ii) / M-1(i) / M-2 / other | **M-1(ii) — pre-signed, read-only-role JWT in Vercel runtime env.** JWT signing secret stays broker-local. One-time mint via broker-local script. PostgREST/@supabase/ssr path reused; no new client library; no new pooling concerns. | closed |
| D-2 | Token lifetime + rotation posture | **5-year `exp` + documented rotate-on-suspected-leak + scheduled re-mint at year 4 (1-year safety margin).** Re-mint is a calendar-driven broker chore, not an automated process. | closed |
| D-3 | Env var name | **`SUPABASE_RTC_READER_JWT`** (renamed from build's suggested `SUPABASE_RTC_READER_KEY`). Rationale in §2.3. | closed |
| D-4 (added) | M-1(i) rejection — make rail-spirit explicit | **REJECTED on record.** Putting `SUPABASE_JWT_SECRET` in Vercel violates the rail in spirit even though the rail names `service_role` specifically. Reasoning memorialized in §2.4 so future rulings have a clean precedent. | closed |
| D-5 (added) | M-2 rejection grounds | **REJECTED.** Direct Postgres connection from Vercel introduces (a) a second data-access path running alongside PostgREST, (b) serverless connection-pooling failure modes that aren't worth the operational cost for a read-only side-channel, and (c) a standing LOGIN role with a password — structurally heavier than a pre-signed JWT. M-1(ii) achieves the same isolation with less surface. | closed |
| D-6 (added) | M-3 sub-options — confirm rejected | **CONFIRMED REJECTED.** M-3(a) is P-A, which the runner ruling §2.3 explicitly declined; M-3(b) is service_role in Vercel, which the rail forecloses. Both stay rejected. | closed |
| D-7 (added) | One-time mint script — location and discipline | **Broker-local only, never committed to repo.** Script lives at `~/ownerpilot-ops/mint_rtc_reader_jwt.<ext>` (broker's local ops folder, NOT the project repo). Build supplies the script content as a one-time text artifact in a ruling-response or message file; broker copies it locally and runs it. Output (the JWT) is pasted directly into Vercel env. Neither the script nor the JWT secret ever touches the repo, CI, or any cloud surface other than Vercel's encrypted env store. | closed |
| D-8 (added) | Migration scope — role + GRANTs in which migration | **Migration 014 (new), separate from migration 013.** 013 = state + pins tables with service_role-only RLS (already authorized, not gated by this ruling). 014 = `create role rtc_block_state_reader` + `grant select` + `grant rtc_block_state_reader to authenticator`. Separation rationale in §2.7. | closed |
| D-9 (added) | Fail-closed behavior wiring confirmation | **Confirmed.** Build's note in §1 of the request that "bad/expired JWT → PostgREST 401 → route returns error → serve path fails closed (blocks language). Safe direction." is the correct behavior. Unit test required (§3.1). | closed |

---

## §2 — Reasoning grounds

### §2.1 — D-1: why M-1(ii) is the right mechanism

Build's diagnostic surfaced three real mechanisms (and noted M-3 has no rail-clean variant). The choice between M-1 and M-2 reduces to: does the route authenticate **through PostgREST with a JWT** or via a **direct Postgres connection with a password**?

The project's substrate already runs through PostgREST/@supabase/ssr exclusively. Every existing read path uses `createServerClient`, a JWT, and PostgREST role-mapping. The read route is a new path with a new role, but the *transport mechanism* is the one the project already uses. M-1 reuses that transport; M-2 introduces a parallel transport.

**Reusing the existing transport is structurally preferable because:**
- No new client library to audit, version, or patch.
- No new failure modes from serverless + direct Postgres (connection-pool exhaustion, pgbouncer/supavisor transaction-mode quirks, prepared-statement caching across cold starts).
- The route's behavior under load matches every other PostgREST-backed read on the project — same retry semantics, same timeout posture, same error shapes.
- Single mental model for "how does the app read Supabase?" — answer remains "@supabase/ssr → PostgREST → role mapping," with the only variation being which role.

M-2's only structural advantage is bypassing PostgREST entirely, which is occasionally desirable when PostgREST itself is a constraint (complex joins, custom SQL functions, etc.). The read route reads two columns from two tables with no joins; PostgREST is not a constraint here. M-2's advantage is not exercised; its costs are real.

**Within M-1, why (ii) and not (i):**
M-1(i) (signing secret in Vercel) is the operationally cheaper variant — no pre-mint step, JWT can be generated on demand — but it puts the **JWT minting capability** in Vercel runtime. A JWT signing secret can mint a JWT for ANY role claim, including roles with write privileges or even service_role-equivalent posture. The blast radius of a leaked signing secret is the entire Supabase project, not just the read-only role. That is the same blast-radius profile as service_role itself, just laundered through one extra step. The rail forecloses that profile.

M-1(ii) (pre-signed JWT, signing secret broker-local) puts only the **specific read-only-role token** in Vercel. The token cannot mint other tokens; it cannot change its claims; it cannot escalate privilege. Its blast radius is bounded to "an attacker can read which languages are currently blocked and which form-versions are pinned" — non-PII, low-sensitivity, and exactly the blast radius the runner ruling §2.6 authorized.

### §2.2 — D-2: 5-year exp + rotate-at-year-4 + rotate-on-suspected-leak

Build proposed "far-future exp + documented rotate-on-suspected-leak." Broker accepts the structure and pins the specifics:

- **Initial `exp`: 5 years from mint date.** Long enough that token expiration is not an operational concern in normal use; short enough that a forgotten token doesn't sit in env forever.
- **Scheduled re-mint at year 4.** Calendar-driven broker chore (will be added to the cron list or task scheduler as a yearly reminder at year 4). Gives a 1-year buffer between re-mint and expiry, so a missed re-mint week is recoverable without the serve path failing closed on every language.
- **Rotate immediately on suspected leak.** Same posture as any credential. "Suspected leak" = any of: Vercel env-var visibility broadened by misconfiguration, broker laptop compromise, suspicious access patterns in Supabase logs against the two tables, or any third-party with environment-variable access changing.
- **Rotation procedure (memorialized):**
  1. Broker re-runs the broker-local mint script with a new `iat`/`exp` and produces a new JWT.
  2. Broker pastes the new JWT into Vercel env, replacing the old value.
  3. Trigger a Vercel deploy (or wait for next deploy) to pick up the new env var.
  4. Old JWT remains technically valid until its original `exp` but is unreachable from the app once env is updated. No explicit revocation needed (PostgREST JWTs are not revocable without rotating the signing secret, which is broker-local and unchanged).
  5. If rotation is for a *signing-secret* leak (not just a leaked reader-JWT), then the signing secret must also be rotated in Supabase, which invalidates ALL pre-signed JWTs. That is a separate, heavier procedure — out of scope for this ruling but flagged here so the distinction is on record.

### §2.3 — D-3: env var name — `SUPABASE_RTC_READER_JWT`, not `SUPABASE_RTC_READER_KEY`

Build's suggested name was `SUPABASE_RTC_READER_KEY`. Broker renames to `SUPABASE_RTC_READER_JWT` for one reason: the project already has `NEXT_PUBLIC_SUPABASE_ANON_KEY` and (broker-local) `SUPABASE_SERVICE_ROLE_KEY`, both of which are Supabase-issued API keys, not JWTs in the standard sense — they're long-lived bearer tokens but they're named "KEY" because that's the Supabase nomenclature. The reader credential is structurally different: it's a JWT the broker mints with a specific role claim. Naming it `_JWT` rather than `_KEY` makes the distinction visible at the call site:

```ts
// At a glance, an engineer reading the route sees:
const readerJwt = process.env.SUPABASE_RTC_READER_JWT;
// and knows this is a pre-signed JWT, not a Supabase-issued API key.
```

This naming discipline costs nothing and prevents the failure mode of someone treating the JWT as interchangeable with an API key (e.g., trying to use it in `createClient` without passing it through the `Authorization` header, or trying to refresh it via Supabase's auth API). The names should reflect what the credential actually is.

### §2.4 — D-4: M-1(i) rejection memorialized

The rail (`service_role_vercel_exposure_broker_determination_2026-06-22.md`) names `SUPABASE_SERVICE_ROLE_KEY` explicitly. A literalist reading would permit `SUPABASE_JWT_SECRET` in Vercel because that's a different credential. The broker rejects the literalist reading and explicitly extends the rail's principle:

**Rail principle (memorialized for forward reference):** *Any credential whose blast radius includes the ability to write to or mint privileged access against Supabase is forbidden in Vercel runtime env, regardless of its specific name.*

This covers:
- `SUPABASE_SERVICE_ROLE_KEY` (named in original rail) — forbidden in Vercel.
- `SUPABASE_JWT_SECRET` — forbidden in Vercel. It can mint any role JWT including service_role-equivalent.
- Any future Postgres role with `LOGIN` and write grants on app tables — forbidden in Vercel (the M-2 problem if M-2 had been chosen).
- Any future Supabase admin API key or management token — forbidden in Vercel.

**Outside the rail:**
- Pre-signed JWTs scoped to read-only roles on non-PII tables (M-1(ii) — the current ruling) — permitted in Vercel.
- Read-only Postgres roles WITHOUT LOGIN (cannot be used directly; only via PostgREST role-switch) — the grants exist in the database but no credential enters Vercel except the scoped JWT. Permitted.
- Application-level shared secrets that authorize calling a route but grant no Supabase privilege (e.g., a webhook-auth secret) — outside this rail; subject to its own per-case review.

This §2.4 should be referenced by future runner-mechanism and substrate rulings to short-circuit re-litigation of "but the rail only names service_role." The principle, not the specific credential name, is the rail.

**Action item:** broker will fold this clarification into a one-line addendum to `service_role_vercel_exposure_broker_determination_2026-06-22.md`, per the §3.3 [CONSIDER] item in the runner ruling. The clarification stays as-is in this file regardless of whether the addendum lands quickly.

### §2.5 — D-5: M-2 rejection grounds (operational, not principle)

M-2 (direct Postgres connection) is not rail-violating in the same way M-1(i) is — a LOGIN role with SELECT-only grants on two tables is structurally similar to M-1(ii)'s scoped JWT in terms of blast radius. The rejection is on operational grounds:

- **Pooling:** Vercel serverless functions + direct Postgres requires pgbouncer or Supavisor in front. The project doesn't currently route any traffic through pgbouncer/Supavisor. Adding it for this one read path means a new infrastructure piece to monitor, scale, and reason about under load.
- **Connection lifecycle:** Direct PG connections have cold-start overhead on serverless that PostgREST/REST does not (REST is HTTP-pooled by Vercel's runtime; PG sockets aren't). The read route is called on every serve path request that needs block-state; per-request connection setup is unacceptable. Pooler dependency follows.
- **Library surface:** A new client library (`pg`, `postgres.js`, or equivalent) is one more dependency to audit, version, and patch. The project's substrate philosophy is "fewer moving parts where possible."
- **Standing credential:** M-2 requires a LOGIN role with a password that lives forever (or until rotated). M-1(ii)'s JWT also lives long, but its capability is bounded by PostgREST's role-switch boundary; a LOGIN role's password authorizes the role's full grant set against direct PG access, which has historically been a richer attack surface than PostgREST.

None of these are dispositive individually; together they make M-2 the wrong choice for the present need. If a future feature requires direct PG access (e.g., complex SQL that PostgREST can't express), M-2 can be revisited under that feature's own ruling.

### §2.6 — D-6: M-3 sub-options confirmed rejected

Listed for the record:
- **M-3(a):** anon SELECT on `rtc_refresh_state` / `rtc_refresh_pins`. Explicitly rejected in runner ruling §2.3 (no client-side use case justifies loosening RLS). Stays rejected.
- **M-3(b):** service_role in Vercel. Forecloses by rail and by §2.4's extended principle. Stays rejected.

No revisiting required.

### §2.7 — D-8: migration 014 separate from 013

Build's request implies the role + grants could land in 013 alongside the tables. Broker rules they ship in a separate migration 014. Rationale:

- **Reversibility:** if the auth mechanism ever needs to change (e.g., Supabase ships a first-class API-key-for-custom-role mechanism that replaces JWT-with-role-claim), the role + grants migration can be replaced without touching the tables. Coupling them in 013 means a schema-level change requires re-creating the tables, which is much heavier.
- **Audit clarity:** 013 = "RTC state substrate" (tables + RLS). 014 = "RTC read-role auth substrate" (role + grants). A reader of the migration history can answer "what schema does the runner write to?" by reading 013 in isolation and "how does the serve path read?" by reading 014 in isolation. Coupling them obscures both questions.
- **PR review scope:** 013 review is data-modeling and RLS posture. 014 review is auth-mechanism. Different reasoning, different reviewers in a larger team — even in a solo broker review, separating the cognitive surfaces tightens the review.

**Migration 014 contents (broker-authored, build wires byte-identical):**

```sql
-- Migration 014: RTC block-state reader role + grants
-- Companion: la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
-- Created by: Jack Taglyan, CalDRE B9445457 (broker compliance review)

-- 1. Create the role (no login; PostgREST will role-switch into it via JWT claim)
create role rtc_block_state_reader nologin;

-- 2. Grant schema usage scoped to public (required for PostgREST to address the tables)
grant usage on schema public to rtc_block_state_reader;

-- 3. Grant SELECT on the two RTC state tables ONLY
grant select on table public.rtc_refresh_state to rtc_block_state_reader;
grant select on table public.rtc_refresh_pins to rtc_block_state_reader;

-- 4. Grant the role to the PostgREST authenticator role so it can role-switch
grant rtc_block_state_reader to authenticator;

-- Intentional non-grants (documented for audit clarity):
--   - NO grants on rtc_refresh_run_results (migration 012 INSERT-only-no-SELECT wall stands)
--   - NO grants on any other public.* table
--   - NO INSERT, UPDATE, DELETE on any table
--   - NO LOGIN; role cannot be used for direct PG connections
--   - NO sequence privileges
--   - NO function execute privileges
```

The exact migration filename, header comment style, and `-- down` reversal block are build's call to match existing migration conventions in the repo; the substantive SQL above is the locked content.

### §2.8 — D-7: mint script discipline

The one-time mint script needs the JWT signing secret to produce the reader JWT. That secret is broker-local; the script must therefore be broker-local. The discipline:

- **Script location:** `~/ownerpilot-ops/mint_rtc_reader_jwt.<ext>` (broker's local ops folder). NOT the project repo. NOT a workspace file that gets archived into project history.
- **Script delivery:** build authors the script content as a code block in a ruling-response or broker message file; broker copies the code into the local file manually. The intermediate workspace file may be deleted after copying.
- **Script execution:** broker runs it locally with the JWT secret read from the broker-local `.env.local` (where the rest of the broker-local credentials live). Output goes to stdout; broker copies the JWT and pastes into Vercel env.
- **Script secrecy:** the script's CODE is not sensitive (it's a standard JWT mint with `jsonwebtoken` or equivalent). The script's RUNTIME ENVIRONMENT (specifically the JWT secret) is sensitive. Treat the script the same as any operational script in `~/ownerpilot-ops/` — gitignored, not backed up to cloud, not shared.
- **No CI involvement, ever.** This is a single broker-laptop operation. If a re-mint is needed (year 4 rotation, suspected leak), broker re-runs the script. CI is never in the loop.

---

## §3 — Action items

### §3.1 — Build work, blocking (gating `rtcFormRefreshJobBuilt`)

- [ ] [MUST FIX] Author migration 014 per §2.7 with the locked SQL content. Open as a separate PR from migration 013 (state + pins tables).
- [ ] [MUST FIX] Author the read route `/api/internal/rtc-block-state` to read `SUPABASE_RTC_READER_JWT` from env and pass it as the `Authorization: Bearer <jwt>` header to the Supabase REST endpoint (or via `createClient` with the appropriate auth-header injection — build's call on the exact `@supabase/ssr` wiring, but the JWT goes in `Authorization`, not in `apikey` and not in any session/cookie path).
- [ ] [MUST FIX] Confirm that `createServerClient` (or whatever client the read route uses) does NOT attempt to refresh the JWT (since it's broker-minted, not Supabase-auth-issued). Some `@supabase/ssr` configurations attempt token refresh on 401; that path must be disabled or unreachable for this route. If the existing client library forces refresh attempts, build raises a follow-up ruling-request rather than working around it silently.
- [ ] [MUST FIX] Unit test: read route with valid JWT returns block-state; with malformed JWT returns 401; with expired JWT returns 401; with JWT whose role claim is NOT `rtc_block_state_reader` returns 403 (or 401 — PostgREST behavior is implementation-defined, but the test asserts SOMETHING non-200). Confirms the fail-closed wiring per D-9.
- [ ] [MUST FIX] Integration test: serve path calls the read route; if the read route returns non-200, serve path fails closed (blocks the language with the standard temporary-unavailability response, same as the freshness-guard fail-closed in runner ruling §2.5).
- [ ] [MUST FIX] Author the broker-local mint script per §2.8 in a workspace markdown file titled `rtc_reader_jwt_mint_script_<date>.md`. Include: full script content, dependencies to install, exact run command, expected output format. Broker copies into local ops folder; workspace file may then be discarded.

### §3.2 — Broker work, sequencing

- [ ] [MUST FIX] Once build delivers the mint script per §3.1 final bullet, broker runs it locally and produces the initial JWT.
- [ ] [MUST FIX] Broker pastes the JWT into Vercel env as `SUPABASE_RTC_READER_JWT` (production environment; preview environments per build's deployment posture — broker leans "production only" until preview-env behavior is reviewed, but defer that to build's deployment ruling-request if it surfaces).
- [ ] [MUST FIX] Broker confirms in Vercel UI that `SUPABASE_JWT_SECRET` is NOT present in any Vercel environment (build, preview, production). If it is, that's a pre-existing rail breach unrelated to this ruling and must be remediated immediately under the standing rail's rotation procedure.
- [ ] [CONSIDER] Broker schedules a year-4 re-mint reminder as a scheduled task with `run_at` set to mint-date + 4 years. Task body: "Re-run the RTC reader JWT mint script per `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` §2.2. Replace `SUPABASE_RTC_READER_JWT` in Vercel env. Trigger a deploy."

### §3.3 — Forward-looking housekeeping [CONSIDER]

- [ ] [CONSIDER] Broker authors the rail addendum memorializing §2.4's extended principle. Single-line edit to `service_role_vercel_exposure_broker_determination_2026-06-22.md`. Non-blocking; can land any time before the next substrate ruling that touches the rail.
- [ ] [CONSIDER] Build documents in `docs/compliance/` (alongside the W4 and Step (e) files flagged for commit in the runner ruling) a one-page reference titled `rtc_block_state_read_path.md` showing the credential flow end-to-end: broker-local secret → mint script → JWT → Vercel env → read route → PostgREST role-switch → SELECT on two tables. Useful for future onboarding (even of one's future self after months away).

---

## §4 — Standing constraints carried forward

- **Service-role rail intact and extended.** §2.4's clarification applies to all future credential-placement rulings.
- **Per-language isolation, acceptance pattern, alert pattern.** All preserved from W4 and the runner ruling.
- **No-attorney-token rule.** All migration headers, route comments, mint script provenance comments cite this ruling and the runner ruling by filename. No attorney attribution.
- **Locked prose discipline.** Migration 014 SQL in §2.7 is locked. Build wires byte-identical. Any deviation requires a follow-up ruling-request.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-23

---

## §0 posture footer

This determination is issued under broker scope per Bus. & Prof. Code § 10131(b). OwnerPilot AI operates exclusively as a California licensed real estate broker. Janna Taglyan (JD, SBN 269639) has no operative authority on this project; her name does not appear on operative files going forward. All compliance review is performed by Jack Taglyan, CalDRE B9445457. This file is not legal advice; it is a broker-authority substrate determination governing OwnerPilot AI's internal build process.
