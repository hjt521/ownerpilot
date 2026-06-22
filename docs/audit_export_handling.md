# Audit export handling

Operational runbook for the broker-run audit export tool (`scripts/audit_export.ts`),
built for Slice 4a of the Supabase audit-durability workstream per broker ruling
2026-06-21 (`slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md`
§2.2–§2.4).

This tool is **broker-run**. It requires the `service_role` key in the broker's
local environment. The build authored the tool; the broker operates it. There is
no CI, scheduled, or app-runtime invocation surface — the only invocation surface
is the broker's local terminal.

---

## 1. Prerequisites (local only)

The tool reads two environment variables, populated only on the broker's machine:

- `SUPABASE_SERVICE_ROLE_KEY` — the broker's `service_role` key (bypasses RLS so
  the audit tables can be read). If absent, the tool aborts immediately with:
  `SUPABASE_SERVICE_ROLE_KEY not set; this tool runs locally with the broker's service_role; abort.`
- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) — the project URL.

Both live in the gitignored `.env.local` (or a shell export). Neither leaves the
broker's machine. The build never enters, stores, or transmits the key.

Run with the key loaded into the env, e.g.:

```
export $(grep -E 'SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL' .env.local | xargs)
npx tsx scripts/audit_export.ts --out ./export.ndjson --reason "broker quarterly review"
```

---

## 2. Flags

| Flag | Required | Meaning |
| --- | --- | --- |
| `--out <path>` | yes | Destination NDJSON file, created at mode `0600`. There is no stdout fallback. |
| `--reason <text>` | yes | Why this export is run (min 12 chars). Recorded verbatim on the `audit_exports` row. |
| `--tables <a,b,..>` | no | Comma-separated subset. Default: all seven audit tables. |
| `--from <ISO>` | no | Lower bound on `decided_at` (inclusive). Default: all-time. |
| `--to <ISO>` | no | Upper bound on `decided_at` (inclusive). Default: now. |
| `--include-held` | no | Include rows under legal hold. Requires an interactive terminal and a typed `INCLUDE HELD ROWS` confirmation. |
| `--operator <text>` | no | Operator label on the row. Default: `jack_taglyan_caldre_b9445457`. |
| `--help` | no | Show usage. |

### Output format

NDJSON — one JSON object per line. Each table's block is preceded by a one-line
meta record:

```
{"_meta":"table_boundary","table":"<name>","row_count":N}
```

Rows within each table are sorted by `decided_at` ascending. Process with `jq`,
`grep`, or any line-oriented tool.

### What the tool records before it writes the file

Every run writes an `audit_exports` row **before** the file is created. The row
carries: `operator`, `tables`, `date_range_start`, `date_range_end`,
`included_held`, `reason`, `cli_version`, `host_fingerprint`, plus DB-set `id`
and `exported_at`, and `row_count` once the export completes. If the export query
fails after the row was written, the row stays and its `failed_at` /
`failure_reason` columns are populated — the row is the canonical record of
intent even when the file did not materialize.

### Held-row exports: three independent barriers

`--include-held` cannot be set without `--reason`, cannot be set without the typed
`INCLUDE HELD ROWS` confirmation, and cannot be set in a non-interactive context.
Any wrong input or non-interactive context aborts with no row and no file.

---

## 3. Handling rules

The following handling rules are authored by the broker ruling 2026-06-21 §2.3 and
are reproduced here verbatim. They govern how export files are treated once
created.

- Treat export files as evidence-grade material.
- Do NOT email exports. Do NOT upload to cloud storage (iCloud, Google Drive,
  Dropbox, etc.). Do NOT include in screenshots or screen recordings.
- Default retention on the broker's machine: review, then delete or move to
  broker's records archive per his discretion. No mandatory delete window — that
  is the broker's call.
- Held-row exports (`--include-held` files) carry heightened sensitivity
  (legal-hold rows are under preservation order); they are NOT to leave the
  broker's machine without explicit broker-authorized transfer to a legitimate
  recipient (e.g. a deposition production set).
- If an export file is lost, stolen, or improperly transmitted, the broker
  authors a `audit_deletion_incidents`-style incident note (the table or its
  equivalent) documenting the event.

### At-rest encryption

Not mandated by the ruling. The broker's machine disk encryption (FileVault on
macOS, BitLocker on Windows, LUKS on Linux) is the at-rest control. The tool sets
the output file to mode `0600` (owner read/write only) and verifies the mode
stuck after creation, removing the file and recording a failure if it did not
(e.g. on a filesystem that ignores mode bits).
