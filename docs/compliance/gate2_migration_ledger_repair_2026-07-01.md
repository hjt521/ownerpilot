# Gate-2 Migration Ledger Repair — Confirmation

**Re:** `gate2_preview_runbook_countersign_2026-07-01.md` — P2 pre-closure remediation directive (ledger drift for 034/035/036).
**Executed by:** JT (broker) in the Supabase dashboard SQL Editor (prod, §4.13 broker-executed).
**Confirmed by:** Claude Code (engineering) via read-only `execute_sql`.
**Date:** 2026-07-01.

---

## §1 — Route taken

`supabase migration repair --status applied 034 035 036` was **not available** — no Supabase CLI on the broker machine (`zsh: command not found: supabase`), same wall as `gh`. Broker used the **dashboard SQL-Editor fallback** (convention-matching direct insert), which reproduces the existing ledger shape (timestamp `version`, numeric prefix carried in `name`) used for rows 023–033.

## §2 — Statement executed (broker, prod SQL Editor)

```sql
insert into supabase_migrations.schema_migrations (version, name) values
 ('20260701130400','034_riskpath_produce_audit'),
 ('20260701130401','035_staleness_guard'),
 ('20260701130402','036_lahd_filing_records')
on conflict (version) do nothing;
```
Result: `Success. No rows returned` (INSERT without RETURNING — expected).

## §3 — Verification (engineering, read-only)

Query:
```sql
select version, name from supabase_migrations.schema_migrations
where name in ('034_riskpath_produce_audit','035_staleness_guard','036_lahd_filing_records')
order by name;
```
Output — **3 rows** (as required):
```
20260701130400  034_riskpath_produce_audit
20260701130401  035_staleness_guard
20260701130402  036_lahd_filing_records
```

Note on the verify key: the countersign's suggested predicate `version IN ('034','035','036')` would return 0 rows here — this ledger stores `version` as a 14-digit timestamp with the numeric prefix in `name` (e.g., `20260630230349` / `033_e2e_test_tagging`). Verification therefore keys on `name`. The three new rows follow that same convention, so they are consistent with 023–033 and with a future `supabase db push`.

## §4 — Disposition

- **P2 ledger drift: CLOSED.** Schema state was already correct (034/035/036 objects present, RLS on the two new tables); the ledger now records all three.
- No schema change was made by this repair — it is a ledger-only reconciliation.

## §5 — §4.14 locks

- Acquire: `github_write_lock_engineering_2026-07-01T2210Z.md`
- Release: `github_write_lock_engineering_2026-07-01T2210Z_release.md`
- (Both cover the Preview runbook session; this ledger read was performed under the same session scope. The prod insert itself was a broker action, outside engineering's lock.)

---

— Engineering (Claude Code) confirmation of broker-executed ledger repair · 2026-07-01
