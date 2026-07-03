# Incident — CCPA request intake rejecting every submission (Sev-1, FIX READY)

**Severity:** Sev-1 (per E1 on-call runbook §2 — outage of a compliance-facing behavior: CCPA/CPRA request intake could not accept any request).
**Discovered:** 2026-07-02, during Fork-D1 live end-to-end test (submitting a real Right-to-Know request at `/privacy-request`).
**Status:** ROOT-CAUSED + FIX BUILT + VERIFIED (tsc 0, unit test 9/9). Pending broker merge + deploy.

---

## §1 — Symptom
Every submission at `/privacy-request` returned the client error "A valid request type and email are required." The Vercel function log showed the route responding **400**; the Supabase API log showed **no** `privacy_requests` insert attempt; `select … from privacy_requests` returned **0 rows**. The intake had never successfully recorded a request in production.

## §2 — Root cause
`app/api/privacy-request/route.ts` read the body with a **formData-first, catch→JSON** pattern:

```ts
const form = await req.formData().catch(() => null);
const raw = form ? { request_type: form.get('request_type'), … } : await req.json()…;
```

The `/privacy-request` page posts **`application/json`**. Locally, `req.formData()` on a JSON body *throws*, so the `.catch(() => null)` triggers the JSON fallback and it works — which is why it passed dev/E2E. On **Vercel's serverless runtime**, `req.formData()` on a JSON body does **not** throw; it resolves to an **empty `FormData`**. So `form` was truthy-but-empty, the form branch was taken, every `form.get(...)` returned `null`, and `requestSchema.safeParse` failed → 400. The JSON fallback was never reached in prod.

Same failure shape as the 2026-07-02 transactional-email Sev-1: a compliance-facing path that looked wired and passed static/dev checks but was non-functional against the real production runtime. Only running the live path surfaced it.

## §3 — Fix
Dispatch on **`Content-Type`** instead of relying on `formData()` throwing. Extracted a pure, exported `readIntakeBody(req)`:
- `multipart/form-data` or `application/x-www-form-urlencoded` → parse `FormData`.
- otherwise (incl. `application/json` and unknown/empty) → best-effort `req.json()` (the app always sends JSON).

`formData()` is now only consulted for actual form encodings, so the empty-FormData runtime quirk can no longer swallow the fields.

## §4 — Verification
- `tsc --noEmit` → exit 0.
- New unit test `lib/privacy/__tests__/intakeBody.test.ts` → **9/9 pass**, including the explicit regression: a JSON request whose `formData()` returns empty (the Vercel behavior) still parses correctly because the dispatch never touches `formData()`.
- Post-deploy (broker): re-run the live D1 submit → expect a `privacy_requests` row `status=received`, then the ack path (D1 items 5–6).

## §5 — Guard gap
No CI guard catches "static/dev passes but the production runtime parses request bodies differently." Detection here was the **live D1 submit test** — the same control that caught the email Sev-1. Fast-follow (E1 §6): keep the live intake submit in the D1 close evidence, and add "privacy intake 4xx rate = 0 / at least one `received` row observed" to the Fork-G soft-launch watch (surfaced via C1 Sentry on route throws + Vercel 4xx logs once `SENTRY_DSN` is set).

## §6 — Standing-rule reinforcement
Extends the §3.4 discipline: a compliance-facing path is not "done" on green static checks — it must be exercised against the **actual production runtime** at least once. Runtime body-parsing, env presence, and external-service verification are all ops-state the code cannot self-attest.

---

— Engineering (Claude Code) · Sev-1 incident (CCPA intake 400) · 2026-07-02
