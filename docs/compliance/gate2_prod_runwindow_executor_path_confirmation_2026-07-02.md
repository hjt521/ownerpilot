# Gate-2 Prod Run-Window — Executor Path CONFIRMED (§9.3 close)

**Re:** `gate2_prod_runwindow_executor_path_2026-07-02.md` §2 decision + §1.7 predicate.
**By:** engineering, 2026-07-02.

---

## Decision — Path 1 (broker-local execution) LOCKED

Broker capability check returned:
```
node -v → v20.20.2
npm  -v → 10.8.2
OK
```
Node + npm resolve on the broker machine → **Path 1** is viable. No new prod endpoint needed; the run uses the existing verified, guarded A14 scripts. **Path 3 (gated endpoint) is not required** and stands down unless Path 1's dry-run fails.

## Secret-handling safety — verified

The prod service-role key goes in a gitignored `.env.synthetic`, never in chat:
- `.gitignore:34` = `.env*` → covers `.env.synthetic`.
- `git ls-files` → `.env.synthetic` **not tracked**.
- `git check-ignore -v .env.synthetic` → matched by `.gitignore:34`.

So the key cannot be accidentally committed. This satisfies the §4.13 "never a secret in chat / never a secret in repo" invariant for the broker-local path.

## §1.7 broker pre-window sequence (replaces "dry-run against Preview")

Per the executor-path doc §3, there is no separate Preview DB, so the pre-window validation is a **non-writing wiring check + a T-0 quiescence gate**, not a separate-DB dry-run:

1. **Deps:** in the repo dir, `npm ci` → clean install.
2. **Wiring (no DB writes):** `npm test` — runs the harness unit tests (`drainSyntheticOnly` scoping + `guardProdSyntheticTarget` B1 guard) and typecheck. Confirms the harness logic loads and the prod-target guard behaves. **These do not touch the prod queue.**
3. **Key injection:** create `.env.synthetic` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (prod). Local only. Do **not** paste these values anywhere else.
4. **At T-0 only (inside the window, `SYNTHETIC_RUN_ACTIVE=true`):** run the pair. The scripts' built-in `preflightQueueQuiescent` aborts if `automation_mirror_queue` has any real DUE rows — this is the live safety that makes running against the prod queue safe. Do not bypass it.

Do **not** execute step 4 outside the window — the A14 scripts write to the real prod queue (run-uuid-scoped + cleaned), and their safety model assumes `SYNTHETIC_RUN_ACTIVE` cron-pause is in effect.

## Predicate status

- **§9.2** canonical residue SQL — delivered.
- **§9.3** executor path — **CONFIRMED (Path 1)**, this doc.

**Engineering-owned T-0 predicates are complete.** Remaining to open the window are broker-owned: run the §1.7 sequence above (steps 1–3 pre-window), file the T-24h notice, open T-0 on/before 2026-07-15, execute the amended 4-step spine, hand back the evidence packet for engineering assembly + countersign.

---

— Engineering (Claude Code) · §9.3 executor-path close · 2026-07-02
