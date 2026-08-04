# Lane 7 Production Notion Mirror Remediation — Broker Ruling — 2026-08-04

**Status:** Draft awaiting Founder ratification

## Prior acceptance

The following section is quoted verbatim from `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`:

> ## Two-database posture
>
> Lane 7's Notion mirror surface consists of two sibling databases under the "OwnerPilot Operations" parent page, each with a distinct role:
>
> **`OwnerPilot Automation Audit Trail`** — Data Source ID `e287f8a5-2cb4-43b1-81fc-1dadeac56c93`.
> Role: human/narrative audit surface. Schema: 13 properties as currently deployed (Event, Date, Cron ID, Cron name, Event type, Status, Root cause, Action taken, Verification, Report file, Source session, Broker sign-off, Sign-off date). Status vocabulary: `OK / PARTIAL / FAILED / RESOLVED / PENDING / INFO`. Broker sign-off column present. **No cron writes to this DB.** As of this ruling it holds 4 rows, all broker-signed narrative entries, and is untouched by this ruling and its paired reconciliation.
>
> **`OwnerPilot Lane 7 Cron Mirror`** — Data Source ID `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`.
> Role: code-authoritative cron mirror. Schema: 8-field per below. Status vocabulary: `clean / change_detected / failure / partial`. **No human sign-off column.** `NOTION_AUTOMATION_DB_ID` points here once the Founder completes the Preview env update.

The following Production-relevant paragraph is quoted verbatim from `docs/compliance/lane7_reconciliation_attestation_2026-07-28.md`:

> Prior to this session, Lane 7's Notion mirror had **never written a single row**, in Preview or Production, despite `/api/automation/log` and `/api/cron/geocode-audit` both returning HTTP 200 `{"ok":true}` on every call. The success response is generated unconditionally by the route handlers regardless of whether `mirrorToNotion` actually wrote anything — so the failure was fully silent from the outside. Three independent, stacked defects were required to reach a genuine first successful write, documented below in the order they were found.

## Statement of ratification

This ruling ratifies, subject to Founder countersign:

1. the existing Founder-created Production Notion sibling database **OwnerPilot Lane 7 Cron Mirror — Production** (`a32dcbb1-54f6-4532-8784-6fe9d74018db`) as the Production Lane 7 audit surface;
2. the six existing Production `cron_9_geocode_audit` rows spanning 2026-07-29 through 2026-08-03 as the Lane 1 audit baseline;
3. the schema-vocabulary reconciliation from 12 Cron options to the canonical 11 through a single-row remap and deletion of the noncanonical `Holiday Table Refresh` select option; and
4. the forward remediation of the external-caller producer path (`/api/automation/log`, gated by `AUTOMATION_LOG_SECRET`) through Founder-executed Production environment writes, G-2 hash verification, and one external-caller smoke row.

This ruling does not authorize backfill of the small, estimated six-or-fewer-row external-caller producer gap during the pre-remediation window. Any such backfill requires a separate future pull request and authorization.

## Three-database posture

All three databases are siblings under **OwnerPilot Operations** (`3aa60eb7-4df5-8127-b388-edc535cc7d82`):

1. **OwnerPilot Automation Audit Trail** — Data Source ID `e287f8a5-2cb4-43b1-81fc-1dadeac56c93`.
   - Human/narrative audit surface.
   - 13-property schema.
   - Broker-sign-off workflow.
   - Not written by cron producers.

2. **OwnerPilot Lane 7 Cron Mirror** — Data Source ID `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`.
   - Preview-environment cron mirror.
   - Eight-field code-authoritative schema.
   - Preview remains untouched in Lane 1.

3. **OwnerPilot Lane 7 Cron Mirror — Production** — Data Source ID `a32dcbb1-54f6-4532-8784-6fe9d74018db`; page ID `af32f514-d1ef-4742-9241-b082fc8c4573`.
   - Production-environment cron mirror.
   - Eight-field code-authoritative schema.
   - Adopted rather than recreated.

## Eight-field schema

| # | Notion property | Notion type | Source | Constraint |
|---|---|---|---|---|
| 1 | Run ID | Title | Derived: `${cron_id}_${run_date.slice(0,10)}` | — |
| 2 | Cron | Select | `cron_name` | Options equal the 11 shipped cron names in the backfill map |
| 3 | Cron Category | Select | `cron_category` | `external_source_watch`, `in_app_health`, `decision2_ops` |
| 4 | Status | Select | `status` | `clean`, `change_detected`, `failure`, `partial` |
| 5 | Run Date | Date | `run_date` | ISO string |
| 6 | Changes Found | Number | `changes_found` | — |
| 7 | Summary | Rich text | `summary` | Truncated to 2000 characters; scrubbed before write |
| 8 | Report Link | URL | `report_link` | Null on empty string |

Ruling #5 remains controlling: schema and select vocabularies must exist before activation, and each select value must correspond to a shipped code path.

## Cron select vocabulary reconciliation record

The Production sibling originally had 12 Cron options. One value was noncanonical:

- Removed: `Holiday Table Refresh`
- Canonical replacement: `Judicial holiday table verification`

The sole row using the removed value was `cron_8_holiday_table_2026-07-28`, a Founder-controlled Production smoke row. Its `Cron` property was remapped to `Judicial holiday table verification`. Its Summary, Run Date, Status, Report Link, Changes Found, Run ID, and Cron Category were preserved unchanged.

The final Production Cron vocabulary contains exactly the 11 names in `scripts/backfill-notion-cron-category.mjs`.

## Producer-path posture

### Direct-mirror path

`cron_9_geocode_audit → mirrorToNotion` has worked in Production since 2026-07-29. Six rows dated 2026-07-29 through 2026-08-03 are preserved and ratified as the Lane 1 baseline. No additional direct-mirror smoke is required in Lane 1.

### External-caller path

`/api/automation/log`, gated by `AUTOMATION_LOG_SECRET`, is the remaining remediation target. It will be validated only after Founder-executed Production environment writes, Production redeployment, successful G-2 hash verification, and one bounded Production smoke using `cron_5_lahd_forms`.

## Founder-executed Production items

Only the Founder may perform the following Production actions:

1. confirm the Notion integration has write access to `a32dcbb1-54f6-4532-8784-6fe9d74018db`;
2. verify or set Production `NOTION_TOKEN` to the approved integration token;
3. verify or set Production `NOTION_AUTOMATION_DB_ID` to `a32dcbb1-54f6-4532-8784-6fe9d74018db`;
4. create a fresh Production-only `AUTOMATION_LOG_SECRET`, distinct from Preview;
5. create a fresh Production-only `DIAG_ENV_SECRET`, distinct from Preview;
6. trigger a Production redeploy;
7. call the Production diagnostic route with the new diagnostic secret and provide the bounded JSON response for G-2 verification.

G-2 verification compares the route-returned SHA-256 hash against the locally computed SHA-256 hash of `a32dcbb1-54f6-4532-8784-6fe9d74018db`. The response must also report `env: "production"`. The raw environment-variable value must never be returned.

## Forward-only posture

The estimated six-or-fewer missing external-caller rows across `cron_1`, `cron_5`, `cron_6`, `cron_7`, and `cron_8` during 2026-07-28 through 2026-08-04 are not backfilled in this Lane. The broker accepts the documented gap for Lane 1 closure. Any later backfill requires its own bounded authorization and pull request.

## Preview open item

The Preview sibling currently has 13 Cron options, including two noncanonical values:

- `Holiday Table Refresh`
- `Mirror Queue Depth Check`

Preview reconciliation is expressly deferred to a future small pull request. Lane 1 performs no write to the Preview sibling.

## Broker signature

Jack Taglyan / California Licensed Real Estate Broker / CalDRE 01871659 / Broker Compliance Review

Date: 2026-08-04

## Non-authority disclaimer

This is a broker ruling within the OwnerPilot governance system. It is not attorney validation, legal advice, or an ADR under RCO-001 / DECG-001. Constitutional artifacts remain awaiting Founder ratification. This document is a draft and has no ratifying effect until Founder countersign.