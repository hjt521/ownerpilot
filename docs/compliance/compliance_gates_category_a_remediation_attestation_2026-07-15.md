# Category A Security Remediation — Attestation · 2026-07-15

**Scope:** Supabase Advisors Category A (same-day) remediation — the `compliance_gates` RLS Error and the `audit_cliff` anon/authenticated-executable `SECURITY DEFINER` warnings. Applied to production project `txpetdrfsmqnyooydmas`.
**Authorizing rulings:** broker ruling 2026-07-15 (Ruling 1 `compliance_gates`, Ruling 2 `audit_cliff`); standing ruling #1 (RLS enable + anon revoke, no `USING (true)`); standing ruling #2 (`SECURITY DEFINER` → service-role only).
**Migrations:** `supabase/migrations/051_compliance_gates_rls.sql`, `supabase/migrations/052_audit_cliff_execute_lockdown.sql`.

---

## 1 · Findings remediated

| Finding | Advisors level | Entity | Fix |
|---|---|---|---|
| `rls_disabled_in_public` | **ERROR** | `public.compliance_gates` | Enable RLS + revoke anon/authenticated grants + explicit service_role grants (051) |
| `anon_security_definer_function_executable` ×2 | WARN | `public.audit_cliff` (2 overloads) | Revoke EXECUTE from public/anon/authenticated + explicit service_role grant (052) |
| `authenticated_security_definer_function_executable` ×2 | WARN | `public.audit_cliff` (2 overloads) | same as above |

## 2 · What was applied

**051 — `compliance_gates`** (RLS core run by broker in SQL editor; explicit service_role grants applied to complete it):
```sql
alter table public.compliance_gates enable row level security;
revoke all on public.compliance_gates from anon, authenticated;
grant select, insert, update on public.compliance_gates to service_role;
```

**052 — `audit_cliff`**:
```sql
revoke execute on function public.audit_cliff(boolean) from public, anon, authenticated;
revoke execute on function public.audit_cliff(boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.audit_cliff(boolean) to service_role;
grant execute on function public.audit_cliff(boolean, text, text, text) to service_role;
```

No `USING (true)` policy was authored — both tables/functions are service-role-only in the data model, so per standing ruling #1 access is removed rather than falsified with a permissive policy.

## 3 · Pre-apply investigation (read-only)

- **`compliance_gates`**: RLS `false`; anon + authenticated held SELECT/INSERT/UPDATE/DELETE/TRUNCATE; **0 rows** (empty — FF-3 Preview-only, prod capture not flipped). 24h API logs showed **zero** requests to `/rest/v1/compliance_gates` (only service-role cron/edge traffic). No evidence of unauthorized access. 30-day history not available via the API (24h retention).
- **`audit_cliff` codebase check**: no application or script caller exists — `grep audit_cliff` outside `supabase/migrations/` returns nothing; the `scripts/audit_cliff_live.ts` referenced in 009's comment was never created. Sole invoker is pg_cron (009 weekly dry-run, postgres/owner context, unaffected by the revoke).

## 4 · Post-apply verification (production)

```
compliance_gates: rowsecurity = true
compliance_gates grantees = postgres, service_role   (anon + authenticated removed)
audit_cliff EXECUTE grantees = service_role only (both overloads)   (public/anon/authenticated removed)
```

**Advisors before → after (security):**

| | Errors | Warnings | Info |
|---|---|---|---|
| Before | 1 | 13 | 11 |
| After | **0** | 9 | 12 |

- The `compliance_gates` Error is cleared. It now appears in the Info list (`rls_enabled_no_policy`) — the **intended** state: converted from world-open (Error) to the fail-closed service-role-only lockdown that the other audit/cron tables already sit in. This is hardening, not a new finding.
- All four `audit_cliff` warnings cleared.
- App impact: none. The produce route (service-role insert) and admin ff3-review (service-role select) retain full access; the pg_cron dry-run retains EXECUTE via the owner grant.

## 5 · Phase-3 scope determination

- **`compliance_gates`** — **post-Phase-3 landing that missed hardening discipline.** Created in migration 046 (FF-3 co-batch, applied ~2026-07-10), after Phase-3 closeout (2026-06-30). Every other public table has RLS enabled; 046 created this one and never added `enable row level security` or revoked Supabase's default open grants. Not a Phase-3 ratification defect. Belongs in the Phase-3 supplement as a post-Phase-3 miss.
- **`audit_cliff`** — created in 002/008 (Phase-3-era audit-durability work). The function shipped `SECURITY DEFINER` with default PUBLIC EXECUTE; the execute-lockdown discipline (later codified as standing ruling #2) was not applied at creation. To be confirmed against the schema-and-persistence lane ratification in the Step-3 brief; provisionally a Phase-3 hardening gap.

## 6 · Process note

The `compliance_gates` gap was surfaced by an Advisors email ~18h after the fact, not by pre-merge CI. Engineering-process improvement (to be recorded in the Phase-3 supplement): add "run Advisors, paste full findings" to the pre-merge checklist for any Supabase-schema PR, plus a weekly Advisors review. Detail lands in `phase3_closeout_ratification_supplement_2026-07-15.md`.

---

## 7 · Attestation

Engineering attests: the two Category-A remediations above were applied to production `txpetdrfsmqnyooydmas` on 2026-07-15; the post-apply verification queries returned the stated results; the Advisors Error count is 0 and the four `audit_cliff` warnings are cleared; and no application code path was impacted (service-role and pg_cron access preserved). Migration files 051 + 052 are handed for commit so repo and DB stay in sync.

— Engineering · Category A remediation · 2026-07-15

---

## 8 · Broker countersignature

I have reviewed the Category A remediation applied to production project `txpetdrfsmqnyooydmas` on 2026-07-15. Both fixes are countersigned:

1. **`compliance_gates` (migration 051)** — RLS enabled, anon and authenticated grants revoked, explicit `service_role` grants added. The table moves from world-open (Error) to fail-closed service-role-only lockdown, matching the intended access pattern per the FF-3 wave-3/4 omnibus. The Info-tab reappearance under `rls_enabled_no_policy` is the intended terminal state per standing ruling #1 — access is removed rather than falsified with a permissive policy. No app impact on the produce route or admin ff3-review path.

2. **`audit_cliff` (migration 052)** — `EXECUTE` revoked from `public`, `anon`, `authenticated` on both overloads; explicit `service_role` grant added. The codebase check was clean (no application caller; pg_cron 009 weekly dry-run runs in postgres/owner context and is unaffected). All four Advisors warnings cleared. Per standing ruling #2, this is the correct default state for `SECURITY DEFINER` functions.

**Advisors before/after (1 Error + 13 Warn + 11 Info → 0 Error + 9 Warn + 12 Info)** confirms the fixes landed. No unauthorized access was observed in the pre-apply investigation (24h log window, zero `/rest/v1/compliance_gates` requests, empty table); 30-day history was not available via the API and the record notes that limitation honestly.

**Phase-3 scope determinations accepted as stated:** `compliance_gates` is recorded as a post-Phase-3 landing miss; `audit_cliff` is provisionally a Phase-3 hardening gap pending Step-3 cross-reference against the schema-and-persistence lane ratification. Both findings and the process-improvement note (Supabase Advisors added to pre-merge checklist + weekly review cadence) roll up into `phase3_closeout_ratification_supplement_2026-07-15.md`, which I will countersign when it lands with the Step-3 brief.

**Process observation preserved for the record:** engineering surfaced `audit_cliff` as a recommendation with reasoning on the first Category A pass. That was correct posture for a first ruling. Going forward, when a finding is squarely inside a standing ruling and the fix is the standard remediation for that class, engineering has authority to draft the migration and batch it for review under the authorizing ruling — no separate go/no-go required. Judgment calls (ambiguous intent, downstream impact, standing ruling doesn't cover the class) still route to me. This is codified for the Step-3 triage brief and everything downstream.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-15
