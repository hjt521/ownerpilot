# Phase II P1 — Security Findings Evidence Report · 2026-07-23

**Scope:** independent evidence phase for the four CA-001 findings (`initial_audit_queue_2026-07-23.md`). Evidence collection + remediation design only. **No production DB, policy, extension, auth, grant, function, or Edge Function was modified.**

**Authority & independence (CA-001):** the Engineering Organization gathered this evidence and drafts remediation; it does **not** issue the final independent audit disposition on its own work. Conclusions here are **engineering assessments**; the **Constitutional Auditor reserves the final disposition**. Nothing is converted from `Indeterminate` to `Compliant` here.

**Evidence labels used:** `[DET]` deterministic DB/repo introspection · `[INF]` AI-assisted inference · `[GAP]` missing evidence · `[HUMAN]` human-only decision · `[AUDITOR]` reserved for independent disposition.

---

## Executive summary
The `constitution` schema is **operator-only by construction**: anon/authenticated have no schema USAGE, no grants, no function EXECUTE, and no application code path — so its RLS-no-policy posture is deny-by-default at the *grant* layer, not merely RLS (P1-A, strong). The five public audit tables are verified intact Fork H-a append-only walls: INSERT-only for anon/authenticated, no read/update/delete path, operator-only SELECT (P1-C, strong). `pg_net` in `public` is a Supabase-managed default with a real `pg_cron`→edge-function dependency; relocation is risky and unproven (P1-B). Leaked-password protection is off but exposure is low because password auth is barely used vs magic-link/SSO (P1-D). Two residual gaps require non-DB evidence: the PostgREST exposed-schema config `[GAP]` (moot given grants) and Auth dashboard confirmation `[GAP]`.

---

## P1-A — Constitution RLS deny-by-default

**Grant matrix (constitution schema)** `[DET]`:
| Principal | Schema USAGE | Table grants | Function EXECUTE |
|---|---|---|---|
| `anon` | **false** | **none** | **none** |
| `authenticated` | **false** | **none** | **none** |
| `service_role` | yes | 413 grants (operator) | yes |
| bypass-RLS roles | `postgres, service_role, supabase_admin, supabase_etl_admin, supabase_read_only_user` (standard Supabase; no unexpected actor) | | |

**Access-path inventory** `[DET]`: repo grep across `app/ lib/ supabase/ components/` for `constitution.*` / `from('constitution…')` → **zero application references**. The notice platform (public schema) never touches `constitution`. SECURITY DEFINER functions (5) are all `search_path`-pinned to `constitution, public` (+`pg_catalog` on discovery). No RPC/PostgREST path is reachable by anon/authenticated because they lack schema USAGE.

**Engineering assessment** `[INF]`: deny-by-default is **provable at the grant layer** — anon/authenticated cannot reach `constitution` at all, independent of RLS. This is stronger than RLS-no-policy alone. **Residual `[GAP]`:** the PostgREST `db_schemas` exposure config was not readable via SQL (`current_setting('pgrst.db_schemas')` = null; it's a platform/API setting). This is **moot** — even if `constitution` were exposed, the absent USAGE/grants deny access — but the Auditor should confirm the exposed-schema list (dashboard/API) for completeness. **`[AUDITOR]` disposition reserved** (evidence supports Compliant-with-observation; not declared here).

## P1-B — `pg_net` in `public`

`[DET]`: `pg_net` extension registered in `public`; its callable functions are in the **`net`** schema (`net.http_get/http_post/http_delete/http_collect_response`, `net._await_response`). No user/constitution function calls `net.*` directly (only pg_net's own internals + `extensions.grant_pg_net_access`). **Dependency** `[DET]`: the repo's Edge Functions document the **cron contract** — `pg_cron` + `pg_net` POST the parcel-health, city-zip-refresh, and RTC Edge Function URLs. So `net.http_post` is invoked from `pg_cron` job commands, backing three production cron paths.

**Engineering assessment** `[INF]`: relocating the extension is **risky and unproven** — it is a Supabase-managed default, its functions are already namespaced under `net`, and three cron paths depend on `net.http_post`. Relocation could break the managed HTTP path with unclear rollback. **Recommendation:** renew the documented deferral (see remediation roadmap), revisit only if Supabase provides a supported relocation. **Do not relocate.** `[AUDITOR]` disposition reserved (evidence supports Compliant-with-observation / justified deferral).

## P1-C — Append-only audit walls (5 public tables)

`[DET]` for `classifier_audit_log`, `geocode_audit_log`, `geocode_dispositions`, `manual_review_queue`, `rate_limit_events`:
- **Policies:** exactly one — `"app insert only"`, command **INSERT**, roles `{anon, authenticated}`, `USING`=null, `WITH CHECK`=**true**. **No SELECT / UPDATE / DELETE policy exists.**
- **Grants:** `anon INSERT` + `authenticated INSERT` only; `service_role` full (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…). **anon/authenticated have no SELECT grant.**

**Engineering assessment** `[INF]`: the Fork H-a **"app can append, cannot read"** wall is **accurately implemented** — the `WITH CHECK(true)` is the deliberate append capability, and it is paired with *both* an absent SELECT policy *and* an absent SELECT grant, so a request-path compromise cannot read (exfiltrate) or mutate; only the operator (`service_role`) reads. **Observations (least-privilege) `[INF]`:** `WITH CHECK(true)` permits arbitrary-shape inserts from anon — abuse/cost risk is **bloat**, not exfiltration (junk can't be read back to poison decisions); `rate_limit_events` is itself the rate-limiting store; app-layer validation runs before insert. **Optional enhancement** (not a defect): constrain `WITH CHECK` to expected columns/shape. `[AUDITOR]` disposition reserved (evidence supports Compliant-with-observation; ratified design intact).

## P1-D — Leaked-password protection disabled

`[DET]` (repo): magic-link (18+ references) and Google SSO are the primary auth paths (CLAUDE.md: "Google SSO primary, magic link secondary, password never first"); `signInWithPassword` appears **once** (minimal password use, likely admin/E2E). `[GAP]`: active OAuth/SSO provider list and whether any prod human relies on password require **Auth dashboard** confirmation (not introspectable here).

**Engineering assessment** `[INF]`: real exposure is **low** (password path is rare) but **nonzero**, and enabling leaked-password protection has **no incompatibility** with magic-link/SSO — it only strengthens the rare password path. The Preview E2E admin uses a password; enabling could reject a weak test password (fix: use a strong one). **Recommendation:** enable it (Founder dashboard action — see remediation roadmap), then verify. This is the only finding with a clear **Noncompliant** posture pending remediation; `[AUDITOR]`/`[HUMAN]` final disposition after enablement is confirmed.

---

## Evidence unavailable (`[GAP]` summary)
1. PostgREST `db_schemas` exposed-schema list (moot given the constitution grant matrix; confirm via dashboard/API for completeness).
2. Auth dashboard state: active SSO/OAuth providers, whether password auth is used by any prod human, confirmation after leaked-password enablement.

## Items requiring independent Auditor disposition `[AUDITOR]`
All four findings' **final** dispositions. Evidence supports: A → Compliant-with-observation (confirm exposure list); B → Compliant-with-observation / justified deferral; C → Compliant-with-observation (walls intact); D → Noncompliant→remediate then re-disposition.

## Items requiring Founder / human action `[HUMAN]`
- Enable leaked-password protection (Auth dashboard) + confirm.
- Confirm PostgREST exposed-schema list excludes `constitution`.
- Decide pg_net deferral renewal vs future supported relocation.

## Database changes applied
**None.** No policy, grant, extension, auth setting, function, or Edge Function was modified.
