# Fork E1 — On-Call Runbook

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (E1 — solo on-call, broker primary; revisits automatically on GA transition).
**By:** Claude Code (engineering), 2026-07-02. Scope: closed-beta / soft-launch (A1 LA-only).

---

## §1 — On-call model
- **Solo on-call. Broker (JT) is primary responder** for the closed-beta window. No secondary rotation until the GA transition (this runbook auto-revisits then — see §7).
- Engineering (Claude Code) assists on triage/diagnosis and prepares fixes as PRs; **all prod-side actions (Vercel env, prod deploy/promote/revert, prod DB) remain broker-executed (§4.13).**

## §2 — Severity matrix

| Sev | Definition (OwnerPilot-specific) | Response target | Examples |
|---|---|---|---|
| **Sev-1** | Compliance-critical defect or outage: a produced notice is facially wrong, PII exposure, or the app is down | Immediate; drop everything | Day-count regression (a served-notice date is wrong); LAHD cover-sheet **fabricates** one of the six blanks; PII leaks to analytics/monitoring/logs; produce hard-stop (G4 counsel route) bypassed; prod 5xx on `/chat` or produce; auth/claim broken for all |
| **Sev-2** | Core flow degraded but not producing wrong compliance output | Same day | Produce succeeds but PDF/render broken; magic-link claim failing intermittently; staleness gate not firing; dashboard not loading records |
| **Sev-3** | Peripheral/automation degraded; no owner-facing compliance impact | Within the week | A watch cron PARTIAL (rent-control `2faf60f6`, LAHD forms `0abb46c4`); monitoring gap; advisor WARN regression; non-LA path issue |
| **Sev-4** | Cosmetic / low-impact | Backlog | Copy typo (non-locked), spacing, minor UX |

**Escalation rule:** anything touching the **produced-notice face, day-count, PII, or the LAHD cover sheet is Sev-1 by default** — these are the compliance surfaces the whole gate program protects. When in doubt, treat as one sev higher.

**Client-only failures (Sev-3 default — C1 Amendment-A ratification, 2026-07-02).** A client-only failure (browser JS error, hydration error, client-side render fault) that does **not** corrupt produced output is **Sev-3 by default**, escalating to **Sev-2 only if a broker directly observes it and confirms a user-facing broken state**. Rationale: the closed-beta monitoring posture is server-side only (`@sentry/node`); client-side observability is deferred to standing item **CX-1** (client-side capture; required before public-launch/open-beta, not for closed-beta or Gate-3 closure). This is codified so an unobservable-by-design client failure cannot later be argued to reset a Fork-G Sev counter.

## §3 — How incidents surface (alert sources)
- **Merge-time guard wall:** the 11 Required checks on `main` (incl. `synthetic-daycount-jul2026`, `verify-review-produce-parity`, `verify-no-operator-secrets`, `verify-banned-terms`) block a Sev-1-class regression from ever merging. First line of defense.
- **Monitoring (C1):** once `SENTRY_DSN` is set, runtime exceptions surface in self-hosted Sentry (PII-scrubbed). Until enabled, rely on Vercel runtime logs.
- **Watch crons:** LAHD cover-sheet drift `0abb46c4` (first baseline Mon 2026-07-06) fires `[COVER SHEET REVISION DRIFT — broker follow-up required]`; rent-control `2faf60f6` PARTIAL reports. These are Sev-3 signals unless they imply a produced-face change (then Sev-1).
- **Owner reports** (email / privacy@ / support): triage by §2.
- **Advisor sweeps:** a new ERROR-severity Supabase security advisor = Sev-1; new WARN = Sev-2/3.

## §4 — Triage steps
1. **Classify** severity per §2 (round up when unsure).
2. **Contain.** For a Sev-1 produced-face defect: identify the last-known-good, and **stop the bleeding** — if a bad deploy, broker reverts (Vercel/PR revert, §5); if a data issue, broker gates the affected flow (feature flag / `BETA_OPEN=false` to halt new claims). Engineering advises; broker executes prod.
3. **Diagnose.** Engineering reproduces (synthetic where one exists — e.g. SC-DAYCOUNT for day-count), root-causes, and prepares a fix PR through the 11-check gate.
4. **Fix + verify.** PR merges only green. For compliance-critical fixes, add/extend a synthetic or guard so the regression can't recur (the day-count synthetic is the template).
5. **File an incident note** (`incident_<date>_<slug>.md`): timeline, sev, root cause, fix PR, and whether a new guard was added. Sev-1/2 always; Sev-3 if recurring.

## §5 — Rollback / containment mechanics (broker-executed, §4.13)
- **Bad deploy → revert:** GitHub PR **Revert** button (opens a revert PR through the gate) or promote the prior good Vercel deployment. Fastest for a regression that shipped.
- **Feature-level halt:** flip the relevant flag off — `BETA_OPEN=false` / clear `BETA_ALLOWLIST` (halt new claims), unset `SENTRY_DSN` (if monitoring itself misbehaves). No code deploy needed; env change + redeploy.
- **DB:** any prod DB correction is broker-executed via Studio (§4.13); engineering supplies the exact SQL + a read-back verify (never a blind write).
- **Never** leave a synthetic/E2E flag set in prod (`SYNTHETIC_RUN_ACTIVE`, `E2E_RUN_ACTIVE`) — a lingering flag silently disables a cron or exposes a test surface.

## §6 — Compliance-critical incident classes (all Sev-1)
These map to the gate program's protected surfaces; each has a guard/synthetic that should have caught it — if one reaches prod, the incident note must record the guard gap:
- **Day-count / service-date wrong on a produced notice** → SC-DAYCOUNT-JUL2026 covers this; a miss means the synthetic's scenario set needs extension.
- **PII in analytics / monitoring / Notion mirror / logs** → the A15 denylist (`enforceDenylist` / `scanFreeText` / monitoring scrub) covers this.
- **LAHD cover-sheet fabricates a blank** (anti-defaulting breach) → the Seam-6 E2E asserts the six blanks; a miss means the render path changed without the assertion.
- **Counsel-route hard-stop (G4) bypassed** → produce E2E + `evaluateProduceEligibility` cover this.

## §7 — GA-transition revisit (automatic)
On the GA transition (F2 exit / `BETA_OPEN=true`), this runbook is **re-opened** as a fresh broker determination: reassess solo-vs-rotation on-call, paging/alerting (Sentry alerting rules, escalation contact), and response targets for a larger user base. Until then, solo/broker-primary stands.

---

— Engineering (Claude Code) · Fork E1 on-call runbook · 2026-07-02
