# Lane 7 Production Notion Mirror Remediation — Broker Ruling — 2026-08-04

**Status:** Draft awaiting Founder countersign

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

1. the existing Founder-created Production Notion sibling database **OwnerPilot Lane 7 Cron Mirror — Production** as the Production Lane 7 audit surface;
2. the Production database entity ID `af32f514-d1ef-4742-9241-b082fc8c4573` as the identifier held by Production `NOTION_AUTOMATION_DB_ID` for the shipped `notion.pages.create({ parent: { database_id: ... } })` call;
3. the Production data source ID `a32dcbb1-54f6-4532-8784-6fe9d74018db` as the query/schema identifier for the Production sibling;
4. the existing Production `cron_9_geocode_audit` rows beginning 2026-07-29 as the direct-mirror audit baseline;
5. the schema-vocabulary reconciliation from 12 Cron options to the canonical 11 through a single-row remap and deletion of the noncanonical `Holiday Table Refresh` option;
6. the Founder-executed Production-only rotation or creation of `DIAG_ENV_SECRET` and `AUTOMATION_LOG_SECRET`, while preserving the working `NOTION_TOKEN` and `NOTION_AUTOMATION_DB_ID` values; and
7. the successful G-2 diagnostic verification and one bounded external-caller smoke through `/api/automation/log`.

This ruling does not authorize backfill of the small external-caller gap during the pre-remediation window. Any backfill requires a separate future pull request and authorization.

## Identifier clarification

The July 28 reconciliation finding remains correct: the child data source ID caused `object_not_found` when supplied to the shipped `parent.database_id` call, while the database entity ID succeeded.

This session initially used the term “page ID” for `af32f514-d1ef-4742-9241-b082fc8c4573`. The connected Notion surface exposes that UUID as the Production database entity and also as the URL-addressable database page. For the shipped Notion SDK call, the controlling meaning is **database entity ID**.

The identifiers are therefore:

- Production database entity ID / `NOTION_AUTOMATION_DB_ID`: `af32f514-d1ef-4742-9241-b082fc8c4573`
- Production data source ID: `a32dcbb1-54f6-4532-8784-6fe9d74018db`
- OwnerPilot Operations parent page: `3aa60eb7-4df5-8127-b388-edc535cc7d82`

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
   - Preview remained untouched in Lane 1.

3. **OwnerPilot Lane 7 Cron Mirror — Production**.
   - Database entity ID: `af32f514-d1ef-4742-9241-b082fc8c4573`.
   - Data Source ID: `a32dcbb1-54f6-4532-8784-6fe9d74018db`.
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

## Reconciliation record

The Production sibling originally had 12 Cron options. The sole row using `Holiday Table Refresh`, `cron_8_holiday_table_2026-07-28`, was remapped to `Judicial holiday table verification`. Every other property was preserved unchanged. The noncanonical select option was then removed.

The final Production Cron vocabulary contains exactly the 11 names in `scripts/backfill-notion-cron-category.mjs`. The default view was reordered to:

1. Run ID
2. Cron
3. Cron Category
4. Status
5. Run Date
6. Changes Found
7. Summary
8. Report Link

The Production database header prose was also added under the Founder authorization.

## Producer-path posture

### Direct-mirror path

`cron_9_geocode_audit → mirrorToNotion` has written daily Production rows since 2026-07-29. Those rows demonstrate that the working Notion token, database entity ID, integration ACL, and direct producer path were already operational before the external-caller remediation.

### External-caller path

On 2026-08-04, the Founder called `/api/automation/log` with the Production-only `AUTOMATION_LOG_SECRET`, exact wire header `x-automation-secret`, and a bounded synthetic `cron_5_lahd_forms` payload. The route returned HTTP 200 with `{"ok":true}`. A corresponding row was verified in the Production sibling:

- Run ID: `cron_5_lahd_forms_2026-08-04`
- Cron: `LAHD forms refresh`
- Cron Category: `external_source_watch`
- Status: `clean`
- Run Date: `2026-08-04T18:15:00.000Z`
- Changes Found: `0`
- Summary marker: `production_smoke_L1.7.1_2026-08-04T18:15:44Z SMOKE_TEST`
- Report Link: `https://ownerpilot.ai/internal/reports/production_smoke_L1.7.1_2026-08-04`

This validates the external-caller path end to end.

## Founder-executed Production actions

The Founder performed these actions:

1. preserved the working Production `NOTION_TOKEN`;
2. preserved the working Production `NOTION_AUTOMATION_DB_ID`;
3. created or rotated a fresh Production-only `AUTOMATION_LOG_SECRET`;
4. created or rotated a fresh Production-only `DIAG_ENV_SECRET`;
5. redeployed Production after PR #336 merged;
6. confirmed the unauthenticated diagnostic request returned bounded HTTP 401;
7. performed the authenticated G-2 check; and
8. performed the bounded external-caller smoke.

No raw token or secret was committed or recorded in this ruling.

## G-2 result

The authenticated Production diagnostic returned:

- `env`: `production`
- `length`: `36`
- `prefix4`: `af32`
- candidate A matched: SHA-256 of `af32f514-d1ef-4742-9241-b082fc8c4573`

The full returned hash is recorded in the separate G-2 evidence artifact. The raw environment-variable value was never returned.

## Forward-only posture

The pre-remediation external-caller gap is not backfilled in this Lane. The broker accepts the documented gap for Lane 1 closure. Any later backfill requires its own bounded authorization and pull request.

## Open items

1. Preview retains 13 Cron options, including `Holiday Table Refresh` and `Mirror Queue Depth Check`; reconciliation is deferred.
2. `/api/automation/log` uses ordinary string comparison rather than a timing-safe comparison.
3. `/api/automation/log` casts the JSON body to `RunRecord` without runtime schema validation.
4. The temporary diagnostic route must be removed after Lane 1b attestation and Founder countersign.
5. The six-day `durability_gate_open=false` geocode-audit sequence remains an operational follow-up and is not silently treated as resolved by this Lane.

## Broker signature

Jack Taglyan / California Licensed Real Estate Broker / CalDRE 01871659 / Broker Compliance Review

Date: 2026-08-04

## Non-authority disclaimer

This is a broker ruling within the OwnerPilot governance system. It is not attorney validation, legal advice, or an ADR under RCO-001 / DECG-001. Constitutional artifacts remain awaiting Founder ratification. This document is a draft and has no ratifying effect until Founder countersign.
