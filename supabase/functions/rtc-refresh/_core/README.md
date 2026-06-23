# rtc-refresh Edge Function — `_core/` build artifact

**This directory is generated. Do not edit.**

## What lives here

This directory contains a compiled, deploy-ready copy of `lib/jurisdiction/rtcRefresh/` and its transitive dependencies (`lib/jurisdiction/laRtcRules.ts`, `lib/jurisdiction/rtcFormBaselines.ts`) with `.ts` extensions added to all extensionless relative imports.

It exists because the Supabase Edge Function deploy bundler (Deno-based) requires explicit `.ts` extensions on relative imports, while the canonical source under `lib/jurisdiction/` uses Node/Next-style extensionless imports. Both behaviors were verified empirically in the import-strategy spike documented in `rtc_refresh_edge_function_spike_result_2026-06-23.md`.

## Canonical source

The canonical source lives at:

- `lib/jurisdiction/rtcRefresh/` — refresh job orchestration
- `lib/jurisdiction/laRtcRules.ts` — LA RTC rules + version baseline data
- `lib/jurisdiction/rtcFormBaselines.ts` — form baselines + SHA-256 hashes

**All edits go to the canonical source.** This `_core/` directory is regenerated from it.

## Why this directory is tracked in git

Unlike most build artifacts, this directory IS committed to the repository. The bytes here are the bytes that deploy to the Edge Function at production. Committing them serves the broker-reviews-everything posture: every PR that touches the canonical source shows both the source edit AND the corresponding `_core/` diff, making the actual deployed code reviewable directly in the PR. The audit surface is the diff.

## How regeneration works

Run from repo root:

```bash
npm run build:edge-core
```

This script reads from `lib/jurisdiction/rtcRefresh/` (plus its transitive deps), adds `.ts` extensions to relative imports, and writes the result here. The script also emits a per-file `// GENERATED FILE — DO NOT EDIT` header.

The script is idempotent. Running it twice on an unchanged source produces a byte-identical output.

## CI guard

The CI pipeline runs `npm run build:edge-core` followed by `git diff --exit-code supabase/functions/rtc-refresh/_core/`. If the diff is non-empty, CI fails — this means a developer edited the canonical source but did not regenerate `_core/`, OR edited `_core/` directly (forbidden), OR the source's hand-edit-resistance was bypassed somehow.

The guard exists because the Edge Function deploys these `_core/` bytes, not the canonical source. A stale `_core/` ships stale logic to production. The CI guard makes that impossible to merge.

## Editing this directory

Don't. The per-file `// GENERATED FILE — DO NOT EDIT` header is the inline reminder. If you find yourself wanting to edit a file here, find the corresponding canonical source under `lib/jurisdiction/`, edit there, run `npm run build:edge-core`, and commit both the canonical edit and the regenerated `_core/` together.

## Merge-conflict resolution

If two branches both touch the canonical source and both regenerate `_core/`, you'll get conflicts under this directory. Don't hand-resolve them. Take the merged canonical source (resolved normally), run `npm run build:edge-core` once, and commit the resulting `_core/` over the conflicted version. The conflict resolution discipline is documented in `rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md` §2.5.

## Governing rulings

- `rtc_refresh_edge_function_build_scope_broker_ruling_response_2026-06-23.md` (Strategy C rationale)
- `rtc_refresh_edge_function_spike_result_broker_acknowledgment_2026-06-23.md` (Strategy C ratification — superseded `_core/` posture)
- `rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md` (this file — Option 1; `_core/` committed; README under this section)
