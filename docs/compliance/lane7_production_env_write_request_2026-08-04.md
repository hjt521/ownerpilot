# Lane 7 Production Environment-Write Request — 2026-08-04

**Status:** Founder action required; no Production environment write is authorized for the engineering operator.

**Target project:** OwnerPilot Vercel Production

**Target Notion Production sibling:**

- Name: `OwnerPilot Lane 7 Cron Mirror — Production`
- Data Source ID: `a32dcbb1-54f6-4532-8784-6fe9d74018db`
- Page ID: `af32f514-d1ef-4742-9241-b082fc8c4573`

## 1. Notion integration ACL verification

Before changing any Vercel environment variable, the Founder must open the Production sibling in Notion and explicitly confirm that the approved **OwnerPilot Lane 7 Mirror** integration has write access to it.

Six existing `cron_9_geocode_audit` rows landed in this Production sibling from 2026-07-29 through 2026-08-03, so the integration probably already has access. That historical behavior is not a substitute for the required explicit ACL confirmation.

Do not change the narrative database or Preview sibling permissions as part of this step.

## 2. Production environment variables

Perform these changes only in the **Production** environment scope.

### `NOTION_TOKEN`

- Value: the same approved Notion integration token used in Preview.
- Requirement: the integration must have confirmed write access to `a32dcbb1-54f6-4532-8784-6fe9d74018db` before the token is written or retained.
- Do not print, paste into GitHub, send in chat, or include the token in screenshots.
- If the existing Production token is already the approved token, verify it in the Vercel dashboard without exposing its value and leave it unchanged unless a reset is needed.

### `NOTION_AUTOMATION_DB_ID`

Set or verify the exact Production value:

```text
a32dcbb1-54f6-4532-8784-6fe9d74018db
```

This is:

- the existing Production sibling Data Source ID;
- **not** the page ID `af32f514-d1ef-4742-9241-b082fc8c4573`;
- **not** the Preview sibling ID `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`;
- **not** the narrative database ID;
- **not** any other value.

The six existing Production `cron_9` rows indicate this environment variable may already be correct. Verify it in the Vercel dashboard and re-set it only if needed.

### `AUTOMATION_LOG_SECRET`

- Create a new high-entropy secret.
- Scope it to Production only.
- It must be distinct from Preview's value.
- Do not reuse a prior or shared secret.
- Do not disclose it in chat, screenshots, terminal history, documentation, commits, or logs.

Issuing a fresh Production-only secret closes the previously unresolved shared-scope pathology by construction.

### `DIAG_ENV_SECRET`

- Create a new high-entropy diagnostic secret.
- Scope it to Production only.
- It must be distinct from Preview's value and from `AUTOMATION_LOG_SECRET`.
- Do not disclose it in chat, screenshots, documentation, commits, or logs.

This credential gates only `/api/diag/notion-db-hash` and is temporary. The diagnostic route is marked for removal after the Lane 1 attestation and Founder countersign.

## 3. Required Vercel scope check

Before saving, confirm each of the four variables is scoped to **Production**, not Preview, Development, or all environments:

- `NOTION_TOKEN`
- `NOTION_AUTOMATION_DB_ID`
- `AUTOMATION_LOG_SECRET`
- `DIAG_ENV_SECRET`

Do not modify Preview values during Lane 1.

## 4. Production redeploy

After the ACL confirmation and any required environment-variable writes:

1. trigger one Production redeploy so the runtime loads the current Production values;
2. confirm the deployment is Ready;
3. record the Production deployment URL and deployment identifier without exposing any secret;
4. do not run the external-caller smoke yet.

## 5. Founder-run G-2 verification after redeploy

### 5.1 Compute the expected hash locally

Compute the SHA-256 hex digest of this exact 36-character string:

```text
a32dcbb1-54f6-4532-8784-6fe9d74018db
```

The raw Data Source ID must not be sent through the diagnostic route. It is hashed locally for comparison.

### 5.2 Call the Production diagnostic route

Using the new Production-only `DIAG_ENV_SECRET`, call:

```text
https://<production-url>/api/diag/notion-db-hash
```

with the request header:

```text
x-diag-secret: <DIAG_ENV_SECRET>
```

Do not paste the actual secret into chat. Run the command locally and provide only the bounded response JSON.

Expected response shape:

```json
{
  "env": "production",
  "hash": "<sha256-hex>",
  "length": 36,
  "prefix4": "a32d"
}
```

The route must never return the raw environment-variable value.

### 5.3 Return evidence for engineering comparison

Provide only:

- the bounded response JSON;
- the locally computed expected SHA-256 hash;
- the Production deployment URL or deployment ID;
- confirmation that the deployment is Ready.

Do not provide any environment-variable secret value.

## 6. Decision boundary

Engineering may continue to §L1.6 only when all of the following are confirmed:

- `env` is exactly `production`;
- `length` is exactly `36`;
- `prefix4` is exactly `a32d`;
- the returned hash exactly matches the Founder-computed expected hash;
- the Production deployment is Ready.

A mismatch, a non-Production `env`, a missing field, or an unexpected response requires an immediate stop. No §L1.7 external-caller smoke may occur until G-2 passes.

## 7. Explicit exclusions

This request does not authorize the Founder or engineering operator to:

- modify the narrative database;
- modify the Preview sibling;
- backfill missing external-caller rows;
- run the external-caller smoke before G-2 passes;
- remove the diagnostic route;
- open or merge the Lane 1 pull request;
- expose any token or secret.

---

Prepared under the Founder Omnibus Authorization dated 2026-08-04. Production environment writes and Production redeployment are Founder-executed only.