# Fork D1 — Privacy 45-Day CCPA SLA — Build Attestation

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (D1) + §9 return-trip discipline.
**By:** Claude Code (engineering), 2026-07-02. Repo HEAD `main` (post-#131). In-band.

---

## §0 — §9 recon (no return-trip trigger fired)
D1's intake infrastructure is **already as-built** and does **not contradict** the ruling (§9(d) clear):
- **Web form + route:** `app/privacy-request/*` + `app/api/privacy-request/route.ts` (5 request types, email, PII-scrubbed notes).
- **Intake table:** `privacy_requests` (migration 032) — `submitted_at`, `acknowledged_at`, `responded_at`, `status` (received→closed), `verification_status`. Broker-only (service role; no public read).
- **Ack + suppression:** `privacy-ack-send` cron + `analytics_suppression_list` (hash-keyed opt-out).

**The only missing D1 piece was the 45-day SLA itself** — there was no deadline computation or triage surface. That is this build.

## §1 — What shipped
- **`lib/privacy/sla.ts`** — pure SLA helper. `SLA_DAYS = 45` (Cal. Civ. Code §1798.130(a)(2) — respond within 45 calendar days of receipt); `slaDueAt(submittedAt)` = submitted + 45 days; `slaStatus(submittedAt, respondedAt, now?)` → `{ dueAt, daysRemaining, state }` where state ∈ `responded | overdue | due_soon (≤7d) | on_track`. No I/O, no PII (timestamps only).
- **`lib/privacy/__tests__/sla.test.ts`** — 8 assertions (due = +45, on_track / due_soon / overdue transitions, negative days when overdue, responded short-circuit). **all passed.**
- **No schema change / no prod migration.** The ruling has the broker triage **manually in Supabase Studio**, so the SLA is delivered as a helper (for any programmatic use) + the paste-ready triage query below — no new column, no §4.13 prod-apply.

## §2 — Broker triage query (paste into Supabase Studio)
Mirrors `slaStatus` exactly (`due_soon` at 45−7 = 38 days elapsed):
```sql
select id, request_type, contact_email, submitted_at,
       submitted_at + interval '45 days'                                     as sla_due_at,
       date_part('day', (submitted_at + interval '45 days') - now())::int    as days_remaining,
       case when responded_at is not null then 'responded'
            when now() >  submitted_at + interval '45 days' then 'overdue'
            when now() >= submitted_at + interval '38 days' then 'due_soon'
            else 'on_track' end                                              as sla_state,
       status, verification_status
from privacy_requests
where status not in ('responded','closed')
order by sla_due_at asc;
```

## §3 — Verification
| Check | Result |
|---|---|
| `lib/privacy/__tests__/sla.test.ts` | ✓ all passed (8/8) |
| `tsc --noEmit` | ✓ exit 0 |
| `verify-no-operator-secrets` / `verify-banned-terms` / `verify-locked-prose` | ✓ |

## §4 — Ops confirm (broker, out of PR)
- **privacy@ mailbox** is an ops/DNS item (the ruling's mailbox) — confirm `privacy@`(domain) is live and monitored; the ack cron already emails requesters. Not a code artifact.
- **45-day extension** (CCPA permits one +45 with notice) is a manual broker action; `slaStatus` reports `overdue` past day 45, which is the broker's cue to either respond or send the extension notice.

## §5 — Standing-pattern conformance
Pure helper + Studio query (no prod schema change), matching the "broker triages manually" ruling; SSOT for the 45-day constant lives in `lib/privacy/sla.ts`; no new user-facing surface.

---

— Engineering (Claude Code) · Fork D1 privacy SLA build · 2026-07-02
