# DRAFT addendum to la_phase2d_production_attestation_2026-06-29 — env-driven flag mechanics

**Date:** 2026-06-29
**Raised by:** Engineering (Claude) — DRAFT for broker ratification
**Status:** DRAFT — fold into / attach to `la_phase2d_production_attestation_2026-06-29.md` at §0.B / §5 on signing
**Parent:** `decision2_carve_out_from_phase2d_release_broker_ruling_2026-06-29.md` (env-driven flag selected this session)

---

## Why this addendum

The attestation packet §0.B/§5 was written assuming `PHASE2D_ASSEMBLY_ENGINE_WIRED`
is set as an environment variable (true in test, false in prod). The implementation
was a hardcoded constant; per the broker's 2026-06-29 ruling it was converted to an
env-driven flag (commit `90fffe0`). Two mechanical facts changed and should be
reflected when the attestation is signed.

## 1. Env variable name

The flag reads **`NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED`** — not the bare
`PHASE2D_ASSEMBLY_ENGINE_WIRED`. The `NEXT_PUBLIC_` prefix is required because the
flag also gates **client** rendering (`notice-flow.tsx` chooses `LaProducePanel` vs the
normal print options); a non-public env var never reaches the browser. Wherever §0.B
says `PHASE2D_ASSEMBLY_ENGINE_WIRED=true/false`, read `NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED`.

The exported constant name in code (`PHASE2D_ASSEMBLY_ENGINE_WIRED`) is unchanged; only
the env var it reads is prefixed. Fail-closed default preserved: unset / anything but
the string `"true"` ⇒ false. Deno-guarded (`typeof process !== 'undefined'`) so the
rtc-refresh edge function does not throw.

## 2. Production flip mechanism (revises §5)

`NEXT_PUBLIC_` env vars are inlined at **build time**, not read at runtime. Therefore:

- **Production flip** is NOT a code/PR change to a constant. It is:
  1. `vercel env add NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED production` → value `true`
  2. Redeploy production (rebuild so the value inlines)
- **Rollback** is: remove/disable the production env var + redeploy. This is a
  few-minute rebuild, **not** an instant runtime toggle. The §5 rollback-trigger
  conditions are unchanged; only the rollback *action* is "unset env + redeploy."
- The §5 "Authorized commit/PR for flag flip" field should record the **deploy ID**
  of the flag-on production rebuild (and, if desired, the env-change timestamp), since
  there is no flip commit.

The gating is unchanged: production must not have the env var set until the broker
signs §5. Until then, production inlines false and the produce path stays at the
locked NOT_YET_AVAILABLE block.

## 3. Test-environment posture (confirms §0.B)

- Test/preview flag ON: `NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED=true`, Preview
  environment, **branch-scoped to `workstream-b/la-phase2d`** (no other preview branch
  is affected).
- Production: env var absent ⇒ false (verified via `vercel env ls production`).
- Predicate gate: committed code constant, all six predicates true ⇒ OPEN in every
  build including this preview.

---

*Engineering note for broker ratification. No locked prose, statutory text, or
tenant-defense logic changed — this documents the flag-delivery mechanism only.*
