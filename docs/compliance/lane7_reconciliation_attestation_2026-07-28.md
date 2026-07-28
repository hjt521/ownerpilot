# Lane 7 Notion Cron Mirror — §3.7 Reconciliation Attestation — 2026-07-28

## Purpose

Closes out the Lane 7 Notion Cron Mirror reconciliation opened by `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`. §3.4 (G-2 env verification) was attested separately in `lane7_g2_hash_verification_2026-07-28.md`. This document attests §3.6 (smoke tests through real `RunRecord` producers) and records the three code/config defects discovered and fixed while producing that evidence. Prepared for Founder review; not self-ratified.

## Headline finding

Prior to this session, Lane 7's Notion mirror had **never written a single row**, in Preview or Production, despite `/api/automation/log` and `/api/cron/geocode-audit` both returning HTTP 200 `{"ok":true}` on every call. The success response is generated unconditionally by the route handlers regardless of whether `mirrorToNotion` actually wrote anything — so the failure was fully silent from the outside. Three independent, stacked defects were required to reach a genuine first successful write, documented below in the order they were found.

## §3.6 evidence, in order

### 3.6.b — clean run through `/api/automation/log`

- Request: `POST /api/automation/log`, `cron_id: cron_8_holiday_table`, `status: clean`, no PII in `summary`.
- Result: HTTP 200 `{"ok":true}`.
- **Proof of actual write** (direct Notion query against data source `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`): row `cron_8_holiday_table_2026-07-28` present, all 8 fields matching the request payload exactly (Cron: "Holiday Table Refresh", Cron Category: `external_source_watch`, Status: `clean`, Changes Found: 0, Summary and Report Link verbatim).

### 3.6.c — PII denylist block proof (A15)

- Request: `POST /api/automation/log`, `cron_id: cron_7_rent_control_cities`, `summary` deliberately containing a phone-number-shaped string (`555-123-4567`).
- Result: HTTP 200 `{"ok":true}` (expected — the route's response is independent of mirror outcome by design).
- **Proof of correct block, not a false pass**: direct Notion query shows **zero** rows for `cron_7_rent_control_cities` at any timestamp. Vercel runtime log (Preview, `lane7/diag-preview-check`) corroborates: `[broker-notify] Lane 7 mirror payload rejected by denylist — code review required :: rejected fields/patterns: summary:phone` — pattern name only, offending string never logged, per A15 §4.3.

### 3.6.a — geocode-audit direct producer (`CRON_SECRET` auth)

- Request: `GET /api/cron/geocode-audit`, `Authorization: Bearer <CRON_SECRET>`.
- Result: HTTP 200, real check payload returned (`durability_gate_open: false, orphan_audits: 0, null_resolved_at_count: 0`), overall `status: "failure"` — this is the route's own business-logic classification (line 41-43 of `route.ts`: `!durability_gate_open` alone forces `failure`), not an auth or mirror failure. The `geocode_audit_durability_open` feature flag is unset/false in this Preview Supabase project; unrelated to Lane 7 mirror correctness.
- **Proof of actual write**: row `cron_9_geocode_audit_2026-07-28` present in the Cron Mirror DB, Cron Category `in_app_health`, Summary `"Integrity issues: gate=false, orphans=0, null_resolved_24h+=0."` — exact match to the route's computed summary.

### 3.6.d — A14 retry-queue drain proof

- Setup: synthetic row inserted directly into `automation_mirror_queue` (Supabase, executed by JT per standing DB-action governance) with `cron_id: cron_11_mirror_queue_depth_check`, clean summary, default `next_retry_at = now()`.
- Request: `GET /api/cron/mirror-queue-drain`, `Authorization: Bearer <CRON_SECRET>`.
- Result: HTTP 200 `{"ok":true,"processed":1,"resolved":1,"requeued":0,"exhausted":0}`.
- **Proof of actual resolution**: Supabase row now shows `resolved_at = 2026-07-28 19:17:58.777+00` (was `NULL`), `attempts` unchanged at 0 (resolved on first tick). Notion row `cron_11_mirror_queue_depth_check_2026-07-28` present, Status `clean`, timestamps consistent with the drain call.

### 3.6.f — zero-touch confirmation (Founder ruling P-1)

Checked before, during, and after all of the above: `OwnerPilot Automation Audit Trail` (data source `e287f8a5-2cb4-43b1-81fc-1dadeac56c93`) held **exactly 4 rows** at every check, unchanged. No cron write path in this reconciliation ever targets that database — confirmed both by code inspection (`lib/automation/notion.ts` only ever addresses `NOTION_AUTOMATION_DB_ID`) and by direct row-count query.

## Defects found and fixed

All three were required, in sequence, before 3.6.b's first successful write.

**1. `NOTION_TOKEN` did not exist in the Vercel project (Preview or Production).** Every prior mirror attempt returned `MirrorResult.reason: 'env_unset'` silently, with no signal in the HTTP response. Fixed by creating a new Notion internal integration ("OwnerPilot Lane 7 Mirror"), connecting it to the OwnerPilot Operations page tree, and adding the resulting token as `NOTION_TOKEN` (Preview-scoped) in Vercel.

**2. `NOTION_AUTOMATION_DB_ID` held a data-source ID, not a database ID.** `lib/automation/notion.ts` calls `notion.pages.create({ parent: { database_id: DB_ID } })`, which requires the Notion **database's own ID**. The env var held `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7` — the correct sibling database's *data source* ID (this is what §3.4's G-2 hash check verified, and correctly so: it confirmed the right target). Notion's API returned `object_not_found` for this ID because it genuinely isn't a database ID. Fixed by resolving the actual database ID (`46b1af89-f947-41b9-8867-8fabca459297`) via direct Notion API inspection and updating the env var — no code change required. This does not invalidate §3.4's evidence; it identifies that the code's SDK call site needs a different ID *type* than what G-2 checked for.

**3. `lib/automation/notion.ts` unconditionally wrote a `'Next Run': { date: null }` property that does not exist in the live Notion schema.** Every insert failed with `validation_error: 'Next Run is not a property that exists.'`, regardless of (1) and (2) being fixed. This defect was already anticipated by the governing ruling itself — `lane7_notion_cron_mirror_ruling_2026-07-27.md`, "`Next Run` disposition" section, states the property was "Removed from schema" and flags this exact hardcoded write as dead code with no live producer. Fixed by deleting the line (commit `2f8f3d0`, `lane7/diag-preview-check`):

```diff
       'Report Link':   { url: payload.report_link || null },
-      'Next Run':      { date: null },
     },
```

This is the only application-code change in this reconciliation. Everything else was environment configuration.

## Secret rotations performed this session

- `AUTOMATION_LOG_SECRET`: did not exist in Vercel at all; created fresh (Preview-scoped).
- `CRON_SECRET` (Preview-scoped row): rotated. The prior Preview-only value had been accidentally exposed in two commit messages on the public `hjt521/ownerpilot` repo (`88c1fab`, `0278ec0`, both on `lane7/diag-preview-check`, neither merged to `main`). The new value was generated and verified working end-to-end (3.6.a, 3.6.d) without ever appearing in a commit message, following the clean rotation procedure (shell variable → `printf` to clipboard → paste directly into Vercel, no retyping). The exposed old value remains visible in that commit history; rotating it renders the old string inert. Purging it from git history is a separate, optional cleanup not required for security once rotated, and is not part of this attestation.
- Production `CRON_SECRET` (the original, still-shared Production+Preview row prior to the split) was **not** the value exposed in commit messages and was not touched by this reconciliation.

## Commit trail (`lane7/diag-preview-check`, chronological)

| Commit | Change |
|---|---|
| `7f3c283` | Retrigger deploy after adding `NOTION_TOKEN` |
| `17ce5f8`, `da7405b`, `085f74f` | Retrigger deploys during `AUTOMATION_LOG_SECRET` creation/rotation |
| `7a5f14f` | Retrigger deploy after `NOTION_TOKEN` fix (clean re-copy from Notion) |
| `cb74ef3` | Retrigger deploy after `NOTION_AUTOMATION_DB_ID` fix (env var only) |
| `2f8f3d0` | **Code fix**: remove dead `'Next Run'` property write |
| `9b3bd09` | Rotate Preview `CRON_SECRET` (prior value publicly exposed) |

## Open items not resolved by this attestation

- The `cron_9` naming inconsistency between `COMPUTER_OWNED_CRONS` (`cron_9_mirror_health_check`) and the shipped `geocode-audit` producer (`cron_9_geocode_audit`), flagged as harmless-but-open in the governing ruling, remains unresolved — out of scope here since it doesn't block any write path.
- The two commits containing the exposed (now-rotated, inert) `CRON_SECRET` value remain in public git history. Optional history rewrite, JT's call.
- `geocode_audit_durability_open` feature flag is unset/false in Preview Supabase, causing 3.6.a's `status: "failure"` classification. Not a Lane 7 mirror defect; flagged for whoever owns that flag's lifecycle.

## Non-authority disclaimer

This is a broker attestation within the OwnerPilot governance system. It is not attorney validation, legal advice, or an ADR under RCO-001 / DECG-001. It documents evidence gathered under Claude's assistance per DOC-003; it is not self-ratified. The Founder's review and countersign are required before the paired PR (`lane7/notion-cron-mirror-reconciliation`, code change only: `lib/automation/notion.ts` commit `2f8f3d0`) is merged.

---

Jack Taglyan / California Licensed Real Estate Broker / CalDRE 01871659 / Broker Compliance Review

Date: _______________
