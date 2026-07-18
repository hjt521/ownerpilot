# Weekly Supabase Advisors Review — Scheduled Task Spec · 2026-07-15

**Status:** DRAFT for broker countersignature. The Cowork scheduled task is NOT created until this spec + the baseline snapshot are countersigned.
**Authority:** broker ruling 2026-07-15 (weekly Advisors review; Cowork scheduled task; bidirectional baseline diff).

---

## Mechanism
Cowork scheduled task (not an app-cron route). Uses the already-connected Supabase MCP `get_advisors` — **no new secret** (no management PAT provisioned into the app env; management access stays on the Cowork side, consistent with "service_role operator-only" — see ruling 2026-07-15 §1).

## Schedule
- **Mondays 09:30 America/Los_Angeles** (PT-anchored, DST-correct → 16:30 UTC PDT / 17:30 UTC PST automatically).
- Slots between LAHD forms refresh (09:00) and LA RTC packet refresh (09:15).
- **Fallback only if the scheduler can't anchor to a timezone:** fixed `30 16 * * 1` UTC now, with a follow-up ticket to flip to `30 17 * * 1` at the Nov 2026 DST transition. Do not accept a permanent twice-a-year 1-hour drift on a security task.

## Per-run behavior
1. Pull `get_advisors(security)` and `get_advisors(performance)` for `txpetdrfsmqnyooydmas`.
2. Diff the live finding set against `advisors_baseline_snapshot_2026-07-15.json` (matched by `finding_class` + `entity`).
3. **Alert on any delta, in EITHER direction:**
   - **New finding** not in the baseline → alert (drift / new exposure).
   - **Any ERROR** → alert (baseline expects 0 errors).
   - **A ratified exception that has DISAPPEARED** from live Advisors → alert (a "fix" that likely broke a load-bearing design — e.g. a Category-B `WITH CHECK (true)` moved to service_role, collapsing the Fork H-a audit wall).
   - **A status/level change** on an existing finding → alert.
4. **Silent completion** when live == baseline (all accepted exceptions/lockdowns present, no new findings, 0 errors).
5. Alert payload: the specific delta, the affected entity, and — for a disappeared ratified exception — the authorizing ruling from the baseline so the reviewer immediately sees what design property is at risk.

## Baseline governance
- The baseline (`advisors_baseline_snapshot_2026-07-15.json`) is the source of truth for "accepted state."
- It changes **only through a reviewed commit + broker countersignature** — never mutated by the task. (Standing-ruling-#3 discipline applied to the compliance record: accepted state changes through the source of truth, not the monitoring side-effect.)
- Each entry carries its authorizing-ruling citation (standing ruling #1 refined, one layer down) so the file reads cold: not "these are OK" but "these are OK, and here is the ruling that made each OK."
- When a finding is legitimately remediated or an exception re-evaluated, the baseline-update commit is the forcing function to record the new authorizing ruling.

## Initial baseline contents (2026-07-15)
- 5 Category-B ratified exceptions (`rls_policy_always_true`) → 2026-06-20 audit-durability / Fork H-a.
- 1 deferral (`pg_net`) → attestation §E.
- 12 lockdown records (`rls_enabled_no_policy`) → attestation §D (+ Category A / capstone citations where applicable).
- 1 pending-remediation note (`auth_leaked_password_protection`) → attestation §E; expected to clear on the broker toggle. If still present at first run it surfaces as a correct reminder.

## Out of scope (tracked separately)
- Advisors-in-pre-merge-CI (the other half of the process improvement) — a CI-checklist item, not this task.
- GitHub-connection branching fix — separate scoped ticket.

## Activation
On broker countersignature of this spec + the baseline snapshot, engineering creates the Cowork scheduled task per the above and confirms it is scheduled. First run: the Monday following activation.

— Engineering · weekly Advisors task spec · 2026-07-15

Broker countersignature: — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-18  (leaked-password moved to a separate `pending[]` block per broker ruling)
