# Lane 7 Production Notion Mirror Remediation Attestation — 2026-08-04

**Status:** Draft awaiting Founder countersign and Lane 1b merge.

## Scope

This attestation records the completed Lane 1 Production remediation for Lane 7 Notion audit visibility. It covers:

- adoption and reconciliation of the existing Production sibling;
- preservation of the working Notion token and database entity identifier;
- Production-only rotation or creation of two secrets;
- diagnostic G-2 verification;
- validation of both producer paths; and
- protected-state confirmation for the narrative and Preview databases.

It does not authorize backfill, Preview reconciliation, producer redesign, or removal of the diagnostic route without a separate follow-up change.

## Governing artifacts

- `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`
- `docs/compliance/lane7_reconciliation_attestation_2026-07-28.md`
- `docs/compliance/lane7_production_remediation_ruling_2026-08-04.md`
- `docs/compliance/lane7_production_env_write_request_2026-08-04.md`
- `docs/compliance/lane7_production_g2_hash_evidence_2026-08-04.md`
- PR #336 — diagnostic-only Production route extension

## Database posture

| Surface | Database entity ID | Data Source ID | Lane 1 result |
|---|---|---|---|
| Narrative audit surface | `d265399a-5764-436e-8d18-7f2b014d45cf` | `e287f8a5-2cb4-43b1-81fc-1dadeac56c93` | Preserved; 4 rows; no Lane 1 writes |
| Preview cron mirror | `46b1af89-f947-41b9-8867-8fabca459297` | `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7` | Preserved; 3 rows; no Lane 1 writes |
| Production cron mirror | `af32f514-d1ef-4742-9241-b082fc8c4573` | `a32dcbb1-54f6-4532-8784-6fe9d74018db` | Adopted, reconciled, and validated |

All three are children of OwnerPilot Operations (`3aa60eb7-4df5-8127-b388-edc535cc7d82`).

## Production schema reconciliation

The Production sibling retained all eight canonical properties with matching types:

1. Run ID — Title
2. Cron — Select
3. Cron Category — Select
4. Status — Select
5. Run Date — Date
6. Changes Found — Number
7. Summary — Rich text
8. Report Link — URL

The following authorized changes were completed:

- row `cron_8_holiday_table_2026-07-28` was remapped from `Holiday Table Refresh` to `Judicial holiday table verification`;
- every other property on that row remained unchanged;
- the `Holiday Table Refresh` option was removed;
- the Production Cron vocabulary was reduced from 12 to the canonical 11;
- the default view was reordered to the canonical eight-field order; and
- the authorized Production database header prose was added.

## Identifier reconciliation

The shipped producer captures `process.env.NOTION_AUTOMATION_DB_ID` and passes it verbatim to:

```ts
notion.pages.create({
  parent: { database_id: DB_ID },
  // ...
});
```

G-2 confirmed that Production holds the database entity ID:

```text
af32f514-d1ef-4742-9241-b082fc8c4573
```

The child data source ID is:

```text
a32dcbb1-54f6-4532-8784-6fe9d74018db
```

The July 28 finding that the data source ID caused `object_not_found` and the database entity ID was required remains correct. This session's earlier use of “page ID” for `af32f514-...` was terminology drift, not a change in the working identifier.

## Founder-executed Production phase

The Founder preserved:

- `NOTION_TOKEN`
- `NOTION_AUTOMATION_DB_ID`

The Founder generated and saved fresh, distinct, Production-only values for:

- `DIAG_ENV_SECRET`
- `AUTOMATION_LOG_SECRET`

The Founder then redeployed the merged PR #336 Production commit and confirmed the deployment was Ready/Current.

No raw secret was provided to the engineering operator or committed to the repository.

## Diagnostic verification

### Unauthorized request

Result:

```json
{"error":"unauthorized"}
```

HTTP status: `401`

### Authenticated G-2 request

Result:

```json
{
  "env": "production",
  "hash": "92da4ff4ba0e4a52f36e1866811d2dcf0e70372462d14752d64229cfc33bd4a0",
  "length": 36,
  "prefix4": "af32"
}
```

Candidate A, the database entity ID, matched. Candidate B, the data source ID, did not match.

## Producer-path validation

### Direct-mirror path

`cron_9_geocode_audit → mirrorToNotion` produced consecutive Production rows beginning 2026-07-29. This established that the Production Notion token, integration access, database entity ID, and direct producer path were functioning.

The previously inspected rows showed `durability_gate_open=false` with zero orphan and zero null-resolved counts. Those failure-status rows remain preserved as audit evidence.

### External-caller path

The Founder executed a bounded synthetic request to:

```text
POST https://www.ownerpilot.ai/api/automation/log
```

using:

```text
x-automation-secret: <Production AUTOMATION_LOG_SECRET>
```

The response was:

```json
{"ok":true}
```

HTTP status: `200`

The resulting Production row was verified:

| Property | Value |
|---|---|
| Run ID | `cron_5_lahd_forms_2026-08-04` |
| Cron | `LAHD forms refresh` |
| Cron Category | `external_source_watch` |
| Status | `clean` |
| Run Date | `2026-08-04T18:15:00.000Z` |
| Changes Found | `0` |
| Summary | `production_smoke_L1.7.1_2026-08-04T18:15:44Z SMOKE_TEST — Lane 1 external-caller producer path validation. No customer, tenant, owner, property, email, phone, or PII.` |
| Report Link | `https://ownerpilot.ai/internal/reports/production_smoke_L1.7.1_2026-08-04` |

The row page ID is `3b260eb7-4df5-8142-b98d-dc0178ddee14`.

## Final observed row counts

At post-smoke verification:

- Narrative database: `4`
- Preview sibling: `3`
- Production sibling: `9`

The Production total comprised the preserved historical rows, the scheduled 2026-08-04 geocode-audit row that appeared independently during the Lane 1a window, and the single authorized external-caller smoke row.

No unintended row was found in the narrative or Preview database.

## Forward-only disposition

No pre-remediation external-caller rows were backfilled. The documented gap is accepted for Lane 1 closure and remains eligible only for a separately authorized future pull request.

## Open items and follow-ups

1. **Preview vocabulary drift:** Preview retains 13 Cron options, including `Holiday Table Refresh` and `Mirror Queue Depth Check`.
2. **Timing-safe secret comparison:** `/api/automation/log` currently uses ordinary strict string comparison.
3. **Runtime body validation:** `/api/automation/log` casts the request body to `RunRecord` without runtime schema validation.
4. **Diagnostic-route removal:** `/api/diag/notion-db-hash` is temporary and must be removed after Lane 1b countersign/closure.
5. **Geocode durability gate:** the observed `durability_gate_open=false` sequence requires operational follow-up and is not resolved merely because Notion mirroring works.
6. **Success-response semantics:** the external route's HTTP 200 behavior should not be treated as durable Notion proof without post-write verification or stronger route semantics.

## Closure recommendation

Lane 1 has met its bounded objective: Production audit visibility is verified for both the direct and external-caller producer paths, the correct database entity identifier is confirmed, the Production schema is canonical, and protected databases remained untouched.

Recommended disposition: merge Lane 1b after all CI checks pass and the Founder countersigns the ruling and this attestation. Open the diagnostic-route removal as a separate immediate follow-up.

## Founder / Broker countersign

Jack Taglyan / California Licensed Real Estate Broker / CalDRE 01871659 / Broker Compliance Review

Date: 2026-08-04

Signature / countersign: ______________________________

## Non-authority disclaimer

This attestation records technical and broker-governance facts within OwnerPilot. It is not attorney validation, legal advice, or an ADR under RCO-001 / DECG-001. It has no ratifying effect until Founder countersign and authorized repository merge.
