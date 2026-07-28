# Lane 7 G-2 — Notion DB Hash Verification Evidence — 2026-07-28

## Purpose

Raw evidence that `NOTION_AUTOMATION_DB_ID` on the Preview environment points at the
`OwnerPilot Lane 7 Cron Mirror` sibling database, not the `OwnerPilot Automation Audit Trail`
database, verified without ever exposing the raw Data Source ID in a request/response.
Governing doc: `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`. This file is
raw evidence intended to carry forward unchanged into the eventual §3.7 attestation packet.

## Verification result: MATCH

- Sibling Data Source ID (expected target): `0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`
- Expected SHA-256 (computed locally, `printf '%s' "0ca120e3-068e-4c97-b7ed-89bfbf21f3d7" | shasum -a 256`):
  `8c74847b7206d3d9e1d2631717563ef1286474385c582333d8041632425b42f0`
- Hash returned by `/api/diag/notion-db-hash` on Preview:
  `8c74847b7206d3d9e1d2631717563ef1286474385c582333d8041632425b42f0`
- `length`: 36
- `prefix4`: `0ca1`
- **Match: YES**

## Request details

- Route: `app/api/diag/notion-db-hash/route.ts` (Preview-only diagnostic, no raw value ever returned)
- Deployment tested: branch `lane7/diag-preview-check`, commit `ccde775`
- URL hit: `https://ownerpilot-8kk6aycgj-jt-s-projects3.vercel.app/api/diag/notion-db-hash`
  (also reachable via the stable branch alias `https://ownerpilot-git-lane7-diag-preview-check-jt-s-projects3.vercel.app/api/diag/notion-db-hash`)
- Auth: `x-diag-secret` header matched against Preview-scoped `DIAG_ENV_SECRET`
- Response timestamp (`date` header): `Tue, 28 Jul 2026 00:20:12 GMT`
- Full response body: `{"hash":"8c74847b7206d3d9e1d2631717563ef1286474385c582333d8041632425b42f0","length":36,"prefix4":"0ca1"}`

## Conclusion

`NOTION_AUTOMATION_DB_ID` on Preview is confirmed correctly scoped to the Lane 7 Cron Mirror
sibling database. §3.4 (G-2 env verification) is closed. §3.6 (smoke tests through real
`RunRecord` producers) remains open as of this writing.

## Zero-touch re-check, same session (2026-07-28)

Queried directly (read-only, via Notion API):

- `OwnerPilot Automation Audit Trail` (`e287f8a5-2cb4-43b1-81fc-1dadeac56c93`): row count = **4** (unchanged)
- `OwnerPilot Lane 7 Cron Mirror` (`0ca120e3-068e-4c97-b7ed-89bfbf21f3d7`): row count = **0** (expected — no smoke-test writes have landed yet)

Both hold. Zero-touch guarantee on the Audit Trail DB intact.
