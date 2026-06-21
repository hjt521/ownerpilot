# Runbook — geocode audit-write failure

**Owner:** broker (JT) · **Severity:** major (single) / critical (sustained rate)
**Governing ruling:** `slice2_audit_sink_queue_population_broker_ruling_response_2026-06-20.md` §2.3
**Trigger:** the `supabaseAuditSink` failed to write a `geocode_audit_log` row and swallowed the error so the user request could proceed (ruling 4.3=A). The decision happened; the audit row is missing.

## What fired

The sink emits, per swallowed failure:
- a distinct structured log event `geocode_audit_write_failure` (Vercel-captured) carrying `decisionInputHash`, `disposition`, `reviewReason`, `errorClass`, `failureCount`, `ts` — never the raw address;
- an increment of the in-process `geocodeAuditWriteFailures` counter (resets per serverless instance — trend lives in the dashboard, not the counter);
- a `geocode_audit` alert on the shared channel (`channels: in_app + email`).

A single event is a blip. A sustained rate is a Supabase write outage masquerading as success on the user side — escalate to critical.

## Reconciliation (do this on every alert)

1. **Identify the affected window.** From the alert timestamp(s) and the dashboard `geocode_audit_write_failure` metric, bound the start/end of the failure window and count the events.
2. **Identify the missing decisions.** Each event carries the `decisionInputHash` and `disposition` of the decision whose audit row failed to land. Collect them; this is the set of decisions with no `geocode_audit_log` row.
3. **Log the gap as an audit event.** Record the window, the event count, the affected `decisionInputHash` values, and the alert reference into `audit_deletion_incidents` (or the agreed gap-log surface) so the gap itself is on the audit record. The gap being invisible is the failure mode this ruling exists to prevent.
4. **Backfill where business-relevant.** Where an upstream record of the decision exists (request logs, the user-facing result, the manual_review_queue row if the trigger-side did land), reconstruct and insert the missing `geocode_audit_log` row. Where no upstream record exists, the gap stands as logged in step 3 — do not fabricate.
5. **Confirm recovery.** Verify the `geocode_audit_write_failure` rate has returned to baseline (target < 0.1% of writes) before closing the incident.

## Notes

- The user-facing geocode result is unaffected by this failure by design — do not treat user impact as the signal; the audit gap is the signal.
- If `chainHeadSha` resolves to `'unknown'` in production, that is a separate deploy-config signal (the build SHA was not exposed), not an audit-write failure.
