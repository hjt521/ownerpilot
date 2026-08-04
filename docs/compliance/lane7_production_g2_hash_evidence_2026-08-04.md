# Lane 7 Production G-2 Hash Evidence — 2026-08-04

**Status:** Completed Production evidence; pending incorporation into Founder-countersigned Lane 1b closure.

## Purpose

This artifact records the bounded G-2 verification that the Production `NOTION_AUTOMATION_DB_ID` runtime value points to the intended Production database entity without exposing the raw environment-variable value through the diagnostic route.

## Deployment posture

- Diagnostic route: `GET /api/diag/notion-db-hash`
- Route introduced to Production through PR #336
- Production domain used: `https://www.ownerpilot.ai`
- Environment reported by route: `production`
- Secret gate: `x-diag-secret` compared against Production-only `DIAG_ENV_SECRET`

## Unauthorized-path verification

A request without `x-diag-secret` returned:

```json
{"error":"unauthorized"}
```

HTTP status:

```text
401
```

This confirmed the Production route was live and the secret gate remained active.

## Authenticated bounded response

The Founder executed the authenticated request locally and supplied the following bounded response:

```json
{
  "env": "production",
  "hash": "92da4ff4ba0e4a52f36e1866811d2dcf0e70372462d14752d64229cfc33bd4a0",
  "length": 36,
  "prefix4": "af32"
}
```

No raw environment-variable value was returned.

## Candidate comparison

### Candidate A — Production database entity ID

```text
af32f514-d1ef-4742-9241-b082fc8c4573
```

Result: **MATCH**

### Candidate B — Production data source ID

```text
a32dcbb1-54f6-4532-8784-6fe9d74018db
```

Result: **NO MATCH**

## Conclusion

Production `NOTION_AUTOMATION_DB_ID` holds:

```text
af32f514-d1ef-4742-9241-b082fc8c4573
```

This is the Production database entity ID accepted by the shipped call:

```ts
notion.pages.create({
  parent: { database_id: DB_ID },
  // ...
});
```

The result confirms that the July 28 reconciliation finding remains valid: the database entity ID, not the child data source ID, is required by the current producer path.

## Security handling

The following were not recorded in this artifact:

- `DIAG_ENV_SECRET`
- `AUTOMATION_LOG_SECRET`
- `NOTION_TOKEN`
- any authentication header value

The SHA-256 digest is evidence of the non-secret database identifier and is intentionally recorded for audit comparison.
