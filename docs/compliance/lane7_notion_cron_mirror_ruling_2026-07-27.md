# Lane 7 Notion Cron Mirror — Broker Ruling — 2026-07-27

## Prior acceptance

The following bullet is quoted verbatim from `docs/compliance/deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md`, §1 ("Capstone acceptance"):

> - `workstream-f/automation-section-p` — Lane 7 automation + mirrorScrubber + queueDrain + Crons #9/#10/#11 + migration 027 + 2 guards + full ci.yml with all 8 guards (A–H)

## Statement of ratification

This ruling memorializes and consolidates the Lane 7 automation, mirrorScrubber, queueDrain, and A15/A14 posture accepted in the 2026-06-29 capstone. It does not create new authority.

## Two-database posture

Lane 7's Notion mirror surface consists of two sibling databases under the "OwnerPilot Operations" parent page, each with a distinct role:

**`OwnerPilot Automation Audit Trail`** — Data Source ID `e287f8a5-2cb4-43b1-81fc-1dadeac56c93`.
Role: human/narrative audit surface. Schema: 13 properties as currently deployed (Event, Date, Cron ID, Cron name, Event type, Status, Root cause, Action taken, Verification, Report file, Source session, Broker sign-off, Sign-off date). Status vocabulary: `OK / PARTIAL / FAILED / RESOLVED / PENDING / INFO`. Broker sign-off column present. **No cron writes to this DB.** As of this ruling it holds 4 rows, all broker-signed narrative entries, and is untouched by this ruling and its paired reconciliation.

**`OwnerPilot Lane 7 Cron Mirror`** — Data Source ID `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`.
Role: code-authoritative cron mirror. Schema: 8-field per below. Status vocabulary: `clean / change_detected / failure / partial`. **No human sign-off column.** `NOTION_AUTOMATION_DB_ID` points here once the Founder completes the Preview env update.

## 8-field schema

| # | Notion property | Notion type | Source | Constraint |
|---|---|---|---|---|
| 1 | Run ID | Title | Derived: `${cron_id}_${run_date.slice(0,10)}` (`notion.ts:51`) | — |
| 2 | Cron | Select | `cron_name` | Options = the 11 shipped cron names in the backfill map |
| 3 | Cron Category | Select | `cron_category` | 3 options: `external_source_watch`, `in_app_health`, `decision2_ops` |
| 4 | Status | Select | `status` | 4 options: `clean`, `change_detected`, `failure`, `partial` |
| 5 | Run Date | Date | `run_date` | ISO string |
| 6 | Changes Found | Number | `changes_found` | — |
| 7 | Summary | Rich text | `summary` | Truncated to 2000 chars; `mirrorScrubber` field |
| 8 | Report Link | URL | `report_link` | Null on empty string |

## CronCategory value set

Three values only, matching every shipped producer (`lib/automation/types.ts`, `scripts/backfill-notion-cron-category.mjs`):

- `external_source_watch`
- `in_app_health`
- `decision2_ops`

No `analytics_export`. No shipped producer emits that value; adding it would violate Ruling #5 (schema-before-flag).

## Status value set

Four values only, matching the shipped `RunStatus` type (`lib/automation/types.ts`):

- `clean`
- `change_detected`
- `failure`
- `partial`

## `Next Run` disposition

Removed from schema. Producers currently emit no `next_run` field, and `lib/automation/notion.ts` unconditionally hardcodes `'Next Run': { date: null }` regardless of input — there is no live producer for this value. If a scheduler input is later wired, the property will be reintroduced via a new ruling.

## Producer mapping

| # | Field | Source (`RunRecord`) | Producer file |
|---|---|---|---|
| 1 | Run ID | Derived from `cron_id` + `run_date` | `lib/automation/notion.ts:51` |
| 2 | Cron | `cron_name` | `lib/automation/types.ts` (shape); written by `lib/automation/notion.ts:52` |
| 3 | Cron Category | `cron_category` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:53` |
| 4 | Status | `status` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:54` |
| 5 | Run Date | `run_date` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:55` |
| 6 | Changes Found | `changes_found` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:56` |
| 7 | Summary | `summary` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:57`; scrubbed by `lib/automation/mirrorScrubber.ts` before write |
| 8 | Report Link | `report_link` | `lib/automation/types.ts`; written by `lib/automation/notion.ts:58` |

Concrete production and gate producers: `app/api/cron/geocode-audit/route.ts` (direct producer, calls `mirrorToNotion` in-process) and `app/api/automation/log/route.ts` (external-caller gate; casts the inbound POST body to `RunRecord` and forwards to `mirrorToNotion`).

## Cron allowlist reconciliation (open item — not resolved by this ruling)

`app/api/automation/log/route.ts`'s `COMPUTER_OWNED_CRONS` allowlist names the cron_9 entry `cron_9_mirror_health_check`, but the only shipped producer using a `cron_9` identifier (`app/api/cron/geocode-audit/route.ts`) emits `cron_id: 'cron_9_geocode_audit'` — a different string. This is harmless in current behavior because `geocode-audit` calls `mirrorToNotion` directly and never passes through the `/api/automation/log` gate, so the mismatch never actually blocks a write. It is flagged here as an open naming inconsistency for a follow-up ADR, not adjudicated by this ruling.

## External producers

`cron_1_ca_statute_watch`, `cron_5_lahd_forms`, `cron_6_la_rtc_packet`, `cron_7_rent_control_cities`, and `cron_8_holiday_table` are external-caller producers gated by `AUTOMATION_LOG_SECRET` via `app/api/automation/log/route.ts`. They are not Vercel-scheduled crons in this repository — `vercel.json` registers only `geocode-audit`, `mirror-queue-drain`, `mirror-queue-depth-check`, `privacy-ack-send`, and `broker-intake-digest`. The five external-caller cron_ids above correspond to run reports produced outside this deployment and POSTed in.

## Non-authority disclaimer

This is a broker ruling within the OwnerPilot governance system. It is not attorney validation, legal advice, or an ADR under RCO-001 / DECG-001. Constitutional artifacts remain awaiting Founder ratification.

---

Jack Taglyan / California Licensed Real Estate Broker / CalDRE 01871659 / Broker Compliance Review

Date: _______________
