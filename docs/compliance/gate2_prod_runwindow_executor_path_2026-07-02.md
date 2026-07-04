# Gate-2 Prod Run-Window — §1.7 Executor-Path Identification

**Re:** `gate2_prod_runwindow_countersign_amendments_broker_ruling_2026-07-02.md` §1.7 (executor host capability check) + §9.3 predicate.
**By:** engineering, 2026-07-02.
**Question §1.7 answers:** how does the A14 pair actually get invoked against prod, given the prod service-role key must never enter chat and the broker machine's tooling is partly unproven (this session: `gh`, `supabase` both "command not found").

---

## §1 — The three candidate paths

### Path 1 — Broker-local execution (existing scripts, no new code)
`npm run synthetic:a14:503 -- --prod-synthetic` and `npm run synthetic:a14:exhaust -- --prod-synthetic` on the broker machine.
- **Secret handling:** needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in a **gitignored `.env.synthetic`** or shell export — local only, never chat. `.env.synthetic` is already the documented pattern (script header, line 9).
- **Tooling needed:** `node` + `npm` + `npm install`'d deps + `tsx`. **Unverified on the broker machine.**
- **Surface added:** none. Uses the verified, guarded scripts (`guardProdSyntheticTarget` B1/D5, run-uuid cleanup).
- **Verdict:** lowest-surface, preferred **iff** node/npm resolve locally and the broker can safely hold the key.

### Path 2 — Vercel-Cron manual trigger
- **Reality check:** the A14 harness is a standalone `tsx` script, **not** a cron route. The existing Vercel crons (`mirror-queue-drain`, etc.) are API routes; none invokes the A14 harness. There is nothing to "manually trigger" today.
- **Verdict:** **does not exist without new code** — collapses into Path 3.

### Path 3 — Scoped PR: broker-triggerable server endpoint
Add e.g. `app/api/test/run-a14/route.ts` that runs the harness server-side, gated defense-in-depth like the seed route:
- require `SYNTHETIC_RUN_ACTIVE==='true'` (else 404), require `Authorization: Bearer ${CRON_SECRET}` (else 401), call `guardProdSyntheticTarget()` + run both scenarios + return `{pass, fail, cleanup_remaining}`.
- **Secret handling:** the service-role key **stays in Vercel env** — never in any shell, never in chat. Broker triggers with a single authenticated `curl` (only `CRON_SECRET` in the header, which the broker already holds for cron auth).
- **Tooling needed on broker machine:** just `curl`. No node/npm/deps required.
- **Surface added:** a new prod-reachable endpoint that mutates `automation_mirror_queue`. Must be tightly gated (as above), Preview-tested, and CI-excluded from prod bundles the same way seed-session's S6 guard works (`verify_e2e_seed_guard`-style). Requires a PR through the 11-check gate.
- **Verdict:** highest-surface but **most secure on secret handling**; removes the local-tooling + local-key requirements entirely.

---

## §2 — Recommendation (a one-command decision)

The choice hinges on a single check the broker can run right now in the repo dir:

```bash
node -v && npm -v && echo "OK"
```

- **If it prints versions + OK** and the broker can place the prod key in a gitignored `.env.synthetic` → **Path 1**. No new code, fastest to T-0. Proceed to the §1.7 dry-run (below).
- **If `node`/`npm` are absent** (consistent with the `gh`/`supabase` gaps this session) **or** the broker prefers the key never leave Vercel → **Path 3**. Engineering builds + Preview-tests the gated endpoint (est. small PR: route + guard + CI exclusion + unit test), broker triggers via `curl`. Adds ~1 PR cycle to the timeline but still comfortably inside 2026-07-15.

**Engineering leans Path 1 if the machine supports it** (zero new prod surface is the conservative compliance choice), **else Path 3**. I do not recommend forcing Path 1 with an unproven toolchain at T-0 — that's the failure mode §1.7 exists to catch.

## §3 — Constraint on the §1.7 dry-run target

The countersign's §1.7 dry-run "against Preview/local" hits the **no-Supabase-branch** finding from the Preview runbook (`[DEVIATION-ENV]`): there is no separate Preview DB, and no `supabase` CLI to spin up a local one. The A14 harness is **designed to run against the prod project under its §0 synthetic carve-out** (script header: *"Exercises the REAL queue table … against PROD under the §0 carve-out"*) with run-uuid scoping + `preflightQueueQuiescent` + cleanup — there is no Preview-DB variant to dry-run against.

So the realistic pre-T-0 validation is **not** a separate-DB dry-run but:
1. **Wiring dry-run:** confirm the chosen path loads (Path 1: `node -v`/`npm ci`/args parse + `guardProdSyntheticTarget` passes; Path 3: endpoint returns 401/404 correctly when unauthenticated / flag-off on Preview).
2. **Quiescence pre-check at T-0:** `preflightQueueQuiescent` asserts 0 real DUE rows in `automation_mirror_queue` before the synthetic enqueue — this is the built-in safety that makes running against the prod queue safe, and it aborts if real backlog exists.

Recommend the amended §1.7 read: "executor-path capability check + wiring dry-run + T-0 quiescence pre-check" rather than a separate-Preview-DB dry-run that the environment can't provide.

---

## §4 — §9.2 / §9.3 predicate status

- **§9.2 (canonical residue SQL):** delivered — `gate2_prod_runwindow_residue_sweep_sql_2026-07-02.md`.
- **§9.3 (executor path):** this doc. **Awaiting the broker's `node -v && npm -v` result to lock Path 1 vs Path 3.** If Path 3, engineering builds the gated endpoint next.

---

— Engineering (Claude Code) · executor-path identification · 2026-07-02
