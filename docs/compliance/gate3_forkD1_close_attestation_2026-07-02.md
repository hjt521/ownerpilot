# Fork D1 — Privacy SLA / Ack-Send — CLOSE Attestation

**Re:** `gate3_forkD1_ack_send_wiring_attestation_2026-07-02.md` §5 (deploy-run items 5–6) + mailbox confirmation.
**By:** Claude Code (engineering), 2026-07-02. Verifies D1 genuinely enabled end-to-end in production.

---

## §1 — What D1 required to close
From the ack-send wiring attestation §3.3 items 5–6 and §5:
1. Preview/prod submit → a real ack email lands, correct Reply-To.
2. Evidence of the received email showing `Reply-To: privacy@ownerpilot.ai`.
3. Broker mailbox confirmation: `privacy@ownerpilot.ai` exists + monitored.

## §2 — Mailbox (item 3)
`privacy@ownerpilot.ai` created as a **Google Workspace Group** (ownerpilot.ai is on Workspace — root MX = `aspmx.l.google.com` + alts). Access set so **External** senders can post (CCPA requesters/regulators are outside the domain). Owner `jack@ownerpilot.ai`. External-send test delivered. Cloudflare Email Routing deliberately **not** used (would have replaced the Workspace MX and broken existing mail).

## §3 — Live end-to-end run (items 1–2)
Executed against **production** on 2026-07-02 (the only place Vercel crons run):

| Step | Result |
|---|---|
| Submit `/privacy-request` (Right to Know, jack@butlered.com) | "Your request has been received" — row `status=received` written |
| `privacy-ack-send` cron (manual Run) | **HTTP 200** (earlier runs were 401 pre-`CRON_SECRET`) |
| Ack email delivered | From `noreply@ownerpilot.ai`; subject "We received your privacy request — OwnerPilot AI" |
| Body | Locked `PRIVACY_ACK_CCPA_TIMELINE_EN`, `[DATE]`→"July 2, 2026" (America/Los_Angeles); cites Cal. Civ. Code §1798.130; 45-day + one 45-day extension; directs replies to privacy@ownerpilot.ai |
| **Reply-To** | `privacy@ownerpilot.ai` (`PRIVACY_ACK_REPLY_TO`) |
| DB transition | `received → acknowledged`, `acknowledged_at = 2026-07-03T03:37:47Z` (matches the 200 run) |
| Cleanup | Test row(s) deleted; `privacy_requests` back to zero |

## §4 — Gaps found + closed during the D1 run (documented separately)
The live run surfaced and resolved a chain of latent **production** defects — none catchable by static/CI checks:
- **Intake 400** — `req.formData()` returned empty FormData on Vercel → all submissions rejected. Fixed (Content-Type dispatch, PR #139). Incident: `incident_2026-07-02_privacy_intake_400.md`.
- **Missing prod env vars** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` never provisioned → 500 then 401; also all four crons were 401. Fixed (broker env writes + redeploy). Incident: `incident_2026-07-02_prod_env_vars_missing.md`.
- (Earlier) **Transactional email Sev-1** — RESEND key + unverified sender. Incident: `incident_2026-07-02_transactional_email_prod.md`.

## §5 — Disposition
D1 items 1–6 satisfied; mailbox live + monitored; ack path proven in production with correct locked copy, Reply-To, and DB state machine. **Recommend broker countersign to close D1.** Residual watch items fold into Fork-G soft-launch monitoring (intake/cron non-2xx = 0 via C1 Sentry once `SENTRY_DSN` is set). Enablement order continues **D1 → C1 → B2**.

---

— Engineering (Claude Code) · Fork D1 close · 2026-07-02
