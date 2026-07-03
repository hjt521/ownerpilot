# Incident — Waitlist submit 400 (formData-parse antipattern RECURRENCE) — Sev-2, RESOLVED + guarded

**Severity:** Sev-2 (per E1 §2 — core flow degraded, no wrong compliance output, no PII). B2 closed-beta waitlist capture failed on every submit. Caught **pre-traffic** during the B2 enablement verification.
**Discovered:** 2026-07-02, testing the B2 `/waitlist` submit right after enabling the closed beta.
**Status:** RESOLVED (fix built + verified) + a CI guard added so the class cannot recur.

---

## §1 — Symptom
`/waitlist` submit showed "Something went wrong. Please try again." Vercel: `POST /api/waitlist 400`. DB: no `waitlist_signups` row.

## §2 — Root cause (same class as #139)
`app/api/waitlist/route.ts` used the **formData-first, catch → JSON** body-read pattern:
```ts
const form = await req.formData().catch(() => null);
const raw = form ? { email: form.get('email'), ... } : await req.json()...;
```
The `WaitlistForm` posts `application/json`. On Vercel's serverless runtime `req.formData()` on a JSON body returns an **empty FormData** (it does not throw), so the form branch was taken, `email` read as `null`, `safeParse` failed → **400**. Identical to the `/api/privacy-request` Sev-1 (#139). Two occurrences of the same antipattern ⇒ treat as a class, not a one-off.

## §3 — Fix (durable, DRY)
1. **One canonical reader:** `lib/http/requestBody.ts::readRequestBody(req)` — dispatches on `Content-Type` (JSON / unknown → `req.json()`; multipart/urlencoded → `FormData` entries), never relies on `formData()` throwing, never throws (returns `{}` so schema validation yields the 400, not a 500).
2. **Both routes refactored** to use it: `/api/waitlist` and `/api/privacy-request` (the latter's local `readIntakeBody` retired; its real JSON path is unchanged, and a `z.preprocess` keeps the form-encoded boolean coercion).
3. **Test consolidated:** `lib/http/__tests__/requestBody.test.ts` (JSON, the empty-FormData regression, multipart, urlencoded, empty CT, unparseable → `{}`). Old `lib/privacy/__tests__/intakeBody.test.ts` removed.

## §4 — Guard (prevents recurrence)
New CI guard `scripts/ci/verify_route_body_parsing.mjs` + workflow `route-body-parsing-lock.yml` (npm: `ci:verify-route-body-parsing`): **any `route.ts` under `app/api` that calls `.formData(` must import `readRequestBody`** — so no route can hand-roll the antipattern again. (Routes reading only `req.json()` are not at risk and are not flagged.) An `ALLOW` list exists for a future route that legitimately needs raw multipart, with justification. Verified: passes on all 31 current routes; fails when a route reads the body directly; passes after restore.

**Branch-protection follow-up (broker):** add **`route-body-parsing-lock / verify-route-body-parsing`** to the Required checks on `main` (same as the other `*-lock` guards) so the guard is merge-blocking.

## §5 — Verification
- `tsc --noEmit` → 0.
- `lib/http/__tests__/requestBody.test.ts` → pass; `privacyAck`, `beta/allowlist` → pass.
- Guard: clean (31 routes) / fails-on-violation / clean-after-restore.
- Post-deploy: re-submit `/waitlist` → expect a `waitlist_signups` row (engineering verifies + cleans the test row).

## §6 — Standing-rule reinforcement
Same lesson as #139 and the env-var Sev-1s: a runtime-behavior gap (Vercel body parsing) is invisible to dev/local and only surfaces against the real runtime. The durable answer to a *recurring* runtime gap is a **CI guard on the pattern**, not a second point-fix.

---

— Engineering (Claude Code) · Sev-2 incident (waitlist body-parse recurrence) + guard · 2026-07-02
