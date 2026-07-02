# Fork G — Gate-3 Closure Criterion (composite)

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (G-composite) + F2 (soft-launch duration) + E1 (severity classification).
**By:** Claude Code (engineering), 2026-07-02. This is the **exit test for Gate 3** (soft-launch → GA transition).

---

## §1 — The composite criterion
Gate 3 closes when **all four** conditions hold simultaneously, **within** the F2 soft-launch window (30 days from run-window T-0, ≤ 2026-08-14; extendable in 30-day increments; early close only on explicit broker signoff):

1. **14 consecutive Sev-1-zero-days** — no Sev-1 incident (per `gate3_forkE1_oncall_runbook` §2) for 14 straight days.
2. **7 consecutive Sev-2-zero-days** — no Sev-2 incident for 7 straight days.
3. **≥ 2 clean cover-sheet drift fires** — the LAHD cover-sheet drift cron `0abb46c4` fires **≥ 2 times** with a clean result.
4. **All six Gate-3 seam specs green through soft-launch** — the six E2E seam specs pass on every Preview deploy across the window (no flake, no regression).

F2 additionally requires the soft-launch **exit condition**: timer elapsed **AND** ≥ 5 emails × ≥ 1 notice each — OR early broker signoff. G is met when §1(1–4) hold **and** F2's exit condition is satisfied.

## §2 — Operational definitions (how each is measured)

| # | Condition | Clock start | "Met" evidence | Reset rule |
|---|---|---|---|---|
| 1 | 14 Sev-1-zero-days | run-window T-0 (soft-launch open) | 14 dated entries, no Sev-1 incident note | **any** Sev-1 → counter resets to 0 |
| 2 | 7 Sev-2-zero-days | run-window T-0 | 7 dated entries, no Sev-2 incident note | **any** Sev-2 → counter resets to 0 |
| 3 | ≥2 clean drift fires | first fire Mon 2026-07-06 09:00 PT | 2+ cron run reports, each either **no-drift** (baseline hash matches) OR **drift correctly caught** → broker re-ratified → `COVER_SHEET_REVISION` bumped (the mechanism worked as designed) | a drift that is **missed** (produced a wrong cover sheet) is a Sev-1 → also resets #1 |
| 4 | 6 seam specs green | soft-launch open | each Preview deploy in the window shows the 6 specs (`staleness-reproduce`, `staleness-dashboard-banner`, `staleness-ack`, `produce-audit-eligibility`, `lahd-filing-record`, `lahd-cover-sheet`) passing | a red spec on any deploy pauses the counter until root-caused + green again |

## §3 — Tracking table (broker updates through soft-launch)

| Criterion | Target | Current | Met? |
|---|---|---|---|
| Sev-1-zero-days streak | 14 | ⬜ | ⬜ |
| Sev-2-zero-days streak | 7 | ⬜ | ⬜ |
| Clean cover-sheet drift fires | ≥2 | ⬜ | ⬜ |
| Six seam specs green (window) | 100% of deploys | ⬜ | ⬜ |
| F2 timer elapsed (≤2026-08-14) | 30d from T-0 | ⬜ | ⬜ |
| F2 usage (≥5 emails × ≥1 notice) | ≥5 | ⬜ | ⬜ |

## §4 — Dependencies / what must be true first
- **Run-window T-0** must occur (F2 timer + the Sev streak clocks start there). Run-window pre-sequence is broker-owned (`gate2_prod_runwindow_runbook_2026-07-02_amended`).
- **Monitoring (C1)** should be enabled (`SENTRY_DSN` set) so Sev-1/2 incidents are actually observed — an unobserved incident isn't a real zero-day.
- **Closed beta (B2)** live so the ≥5-email usage accrues from real (allowlisted) owners.

## §5 — Exit action (on all-met)
1. Broker files `gate3_closure_artifact_<date>.md` (promotes the G15+ predraft, fills §1–4 evidence + the tracking table final state).
2. Broker signs → **Gate 3 closes**; the **GA transition** fires, which auto-triggers: E1 on-call revisit (§7), B2 `BETA_OPEN=true` (open the gate), and F-tracker close.
3. Any criterion breach during the window resets its counter (per §2) and, if Sev-1, opens a remediation incident before the streak can resume.

---

— Engineering (Claude Code) · Fork G closure criterion · 2026-07-02
