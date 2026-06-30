# Addendum — Locked-Prose CI Guard now spans TWO manifests

**Filed:** 2026-06-29
**Addendum to:** `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`
**Authority / source ruling:** `locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md` (CalDRE B9445457)

---

## What changed

The original determination scoped CI Guard A (`scripts/ci/verify_locked_prose.ts`) to a single
manifest, `docs/compliance/locked_prose_manifest.json`, in which **prose lives in `.ts` exports** and
the manifest is an **audit layer** (byte-for-byte + SHA-256 over the live export). That model
(call it **Shape A**) is unchanged and still governs the original 9 entries
(`bankDepositMethodHelper`, etc.).

Per the schema-reconciliation ruling, Guard A now ALSO validates a second, peer manifest:
`docs/compliance/locked_prose_manifest_phase2_assembly.json` (**Shape B**, 54 entries). In Shape B the
**prose lives in the manifest itself** (it is the runtime source); `.ts`/`.tsx` modules import it via
`@/lib/compliance/lockedProse`. Guard A protects Shape B by recomputing SHA-256 over each entry's
`value` and comparing to the entry's own `hash` (tamper detection on the manifest file).

## Guard behavior (authoritative summary)

| | Shape A (`locked_prose_manifest.json`) | Shape B (`locked_prose_manifest_phase2_assembly.json`) |
|---|---|---|
| Where prose lives | `.ts` export literal | the manifest `value` field |
| Hash target | SHA-256 of the live `.ts` export | SHA-256 of the manifest `value` |
| Schema | `entries[]` of `{constant, file, verbatim, hash, …}` | `entries[]` of `{key, value, hash, tier, version, source_ruling}` |
| Failure on drift | `verbatim-mismatch` / `hash-mismatch` / `missing-export` | `shapeb-hash-mismatch` / `shapeb-schema-violation` / `shapeb-duplicate-key` |
| Reference scanner | `// Source: <file>.md` must resolve to `docs/compliance/` | `// LockedKey: <KEY>` must resolve to a Shape-B key |

Both shapes hard-fail CI (exit 1) on any drift; internal errors exit 2. A schema validator runs first
on Shape B and hard-fails if an entry mixes shapes (e.g., a Shape-B entry carrying `constant`/`file`/
`verbatim`, or missing `key`/`value`/`hash`).

## Authoring discipline (unchanged in spirit)

- Broker authors all locked prose. Engineering never edits a `value` (Shape B) or a `verbatim` export
  (Shape A) without a broker determination.
- After a broker re-ratifies an edited Shape-B `value`, run `npm run lockedprose:hash` to recompute the
  `hash`, and cite the determination filename in the PR. The CI guard remains the enforcement gate;
  the hash script is convenience only.
- New code that consumes Shape-B prose annotates the call site with `// LockedKey: <KEY>`.

## Scripts

- `npm run ci:verify-locked-prose` — the guard (unchanged script name; now two-manifest aware).
- `npm run lockedprose:verify` — alias to run the guard locally before pushing.
- `npm run lockedprose:hash` — recompute Shape-B hashes from values (use only post-ratification).
- `node scripts/ci/verify_locked_prose.test.mjs` — guard unit tests (7 cases, both shapes).

— Recorded per the schema-reconciliation ruling. Engineering execution; broker authority CalDRE B9445457.
