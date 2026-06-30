# A14 synthetic tests — runner notes

Pre-staged runtime evidence for Lane 7 A14 (Notion-mirror retry queue). They run against a Supabase **preview
branch** and fill the A14 attestation evidence (synthetic 503 + exhausted-retry) the moment a preview DB exists.

## package.json scripts (add)

```json
"scripts": {
  "synthetic:a14:503":     "tsx scripts/synthetic/a14_503_enqueue_drain_resolve.ts",
  "synthetic:a14:exhaust": "tsx scripts/synthetic/a14_exhausted_retry.ts"
}
```

## Run

```bash
SUPABASE_PREVIEW_URL=https://<preview>.supabase.co \
SUPABASE_PREVIEW_SERVICE_ROLE_KEY=<preview service role> \
npm run synthetic:a14:503 -- --preview-db
npm run synthetic:a14:exhaust -- --preview-db
```

## Safety / behavior
- **Refuses to run without `--preview-db`** and aborts if the URL looks like production (`prod` / `www.ownerpilot`).
- **Idempotent:** each script tags its rows (`SYNTHETIC_A14_503` / `SYNTHETIC_A14_EXHAUST` in `payload_jsonb.summary`) and deletes them on exit (incl. the `finally` path).
- Both share the production `drainOnce` + `nextQueueState` from `lib/automation/queueDrain.ts` with an **injected mock mirror** (503/200), so they test the real drain logic, not a copy.
- `a14:exhaust` advances a synthetic clock past each backoff so the full cadence runs in seconds (no real waits).

## Cadence note (surfaced)
`backoffMinutes(n) = min(2**(n-1), 60)` → attempts 1–7 produce waits `1,2,4,8,16,32,60`; attempt 8 reaches
`max_attempts` and **exhausts** (resolved + `last_error` + broker notify). The ruling's "(…,60,60)" is the
formula value at n=8; exhaust supersedes scheduling a literal 8th wait. If you want a literal 8th 60-min wait
before exhaust, bump `max_attempts` to 9 — flag and I'll adjust.
