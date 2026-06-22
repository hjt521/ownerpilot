# Retention cliff runbook

Operational runbook for the audit retention cliff, built for Slice 4b of the
Supabase audit-durability workstream per broker ruling 2026-06-21
(`slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md`
§2.5–§2.6).

The cliff enforces 7-year retention: rows are soft-marked at the 7-year cliff and
hard-deleted after a 90-day grace. Held rows (`legal_hold = true`) are never
deleted. There is **no autonomous deletion** — the scheduled job only ever runs
the dry-run; every live delete is an explicit broker action.

---

## 1. What runs automatically

A weekly `pg_cron` job (`audit_cliff_weekly_dryrun`, migration 009) runs the cliff
in **dry-run mode** across all eight audit tables. Dry-run deletes nothing — it
counts what *would* be deleted and writes one `cliff_runs` row per table. The
default cadence is Mondays 17:00 UTC (~9am Pacific during PDT); adjust the cron
expression in migration 009 if a different cadence is chosen.

The scheduled job runs in the database (`pg_cron`), so no `service_role` key
leaves Supabase.

## 2. Reading the dry-run report (broker read surface)

After the weekly dry-run (or any time), read the latest `cliff_runs` rows:

```
npx tsx scripts/audit_cliff_live.ts --status
```

This prints the recent runs: `run_at`, `dry_run`, `table_name`,
`would_delete_count`, `deleted_count`, `held_skip_count`, `grace_skip_count`,
`error_count`, `triggered_by`, `cli_reason`. Review `would_delete_count` and any
`error_count > 0` before running a live cliff.

(This CLI read is one option for the read surface. A Supabase view or a
completion notification are alternatives — broker's choice.)

## 3. Running a live cliff (broker-gated)

When the dry-run report looks correct, run the live cliff for ONE table:

```
export $(grep -E 'SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL' .env.local | xargs)
npx tsx scripts/audit_cliff_live.ts --table <name> --reason "<why>" --confirm "DELETE PAST-CLIFF ROWS"
```

The live cliff requires all of: a valid `--table`, a non-empty `--reason`
(recorded on the `cliff_runs` row), the exact `--confirm` literal
`DELETE PAST-CLIFF ROWS`, and an interactive terminal. Any missing/wrong value or
a non-interactive context aborts with nothing deleted.

One table per invocation — to clear multiple tables, run the CLI once per table.
Each table is a separate broker decision.

To preview a single table without deleting (read-only), use `--dry-run` instead
of `--confirm`:

```
npx tsx scripts/audit_cliff_live.ts --table <name> --reason "<why>" --dry-run
```

## 4. Live-cliff ordering (foreign-key note)

`manual_review_queue` has a foreign key referencing `geocode_audit_log(id)`. When
running **live** cliffs, process the child before the parent:

1. `manual_review_queue` (child)
2. `geocode_audit_log` (parent)

If you live-cliff `geocode_audit_log` while a past-cliff row is still referenced
by a `manual_review_queue` row, that table's hard-delete fails the FK constraint.
The cliff catches this safely — it records `error_count > 0` with an
`error_summary` on the `cliff_runs` row and emits an `audit_cliff_run_errors`
alert — but the table's hard-delete for that run is rolled back. Clearing the
child first avoids it. (The scheduled dry-run is read-only and is unaffected.)

## 5. The eight audit tables

The cliff processes: `geocode_audit_log`, `manual_review_queue`,
`classifier_audit_log`, `rate_limit_events`, `audit_deletion_incidents`,
`audit_access_grants`, `audit_exports`, and `cliff_runs`. `cliff_runs` is itself
an audit table (added in Slice 4b) with the same 7-year retention and INSERT-only
posture — the cliff eventually processes its own log, no special-casing.

## 6. Errors and alerts

`cliff_runs.error_count > 0` emits an `audit_cliff_run_errors` alert. Post-filter
the cliff should not error (held rows are excluded before any delete), so a
non-zero `error_count` warrants a look — typically a foreign-key ordering issue
(section 4) or an unexpected constraint. The shared alert transport (Resend) is
not yet built, so the alert currently emits to the console as a documented stub —
the same cross-cutting gap as the geocode and classifier sinks.

## 7. Guard rails

- The live cliff is **never scheduled**. The CI guard
  `scripts/ci/verify_no_live_cliff_schedule.mjs` fails any migration that
  schedules `audit_cliff` with a false dry-run.
- Held rows are protected twice: the cliff pre-filters `legal_hold = false`, and a
  `before delete` trigger refuses deletion of held rows regardless of caller.
- `service_role` lives only in the broker's local env. The build never enters,
  stores, or transmits it; the scheduled dry-run needs no external key.
