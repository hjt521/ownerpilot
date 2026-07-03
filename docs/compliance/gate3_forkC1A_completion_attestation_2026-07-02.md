# Fork C1 — Amendment-A Completion — Build Attestation

**Re:** C1 Amendment-A SDK ratification (broker countersign, 2026-07-02): `@sentry/node` standard, client-side capture deferred to CX-1, Sev-3 default for client-only failures codified.
**By:** Claude Code (engineering), 2026-07-02. Follows base wiring PR #142.

**Ratification reference (shared with concurrent GitHub actor):** C1 Amendment-A — `@sentry/node` is the C1 SDK standard for the closed-beta window (server-side capture; client-side deferred to standing item CX-1). Sev-3 default for client-only failures codified in E1 §2.

---

## §1 — What shipped (folded §7 scope: a + b + c)

**a. Email-send monitor (§5.2).** `lib/email/resend.ts::send()` now takes a `template` family (`'claim' | 'privacy-ack'`) and captures both transport failures and non-2xx Resend responses via `captureException`, tagged `service:resend`, `template:<family>`, `env:<VERCEL_ENV>`. The Resend error **code + message** are extracted; `fingerprint = ['resend', <template>, <code>]` so repeated failures of the same mode collapse into one Sentry issue. The `message` rides in scrubbed `extra` (A15-redacted before send). On success, a **soak signal** `{evt:'email.sent', template, env}` is logged (feeds the Fork-G watch: "sends observed > 0 + Resend failure rate = 0" per family). Call sites updated: `sendClaimEmail → 'claim'`, `sendPrivacyAckEmail → 'privacy-ack'`.

**b. `beforeSend` no-bypass assertion.** `scrubBeforeSend()` captures the canonical scrubber reference at module load; if `beforeSend` is ever handed a non-canonical scrub it **throws** rather than silently sending (a silent bypass of the telemetry-boundary scrub would be a PII exfil vector — A15 rule 3). `Sentry.init` now uses `scrubBeforeSend`. Unit test proves normal scrub + that a replaced scrub throws.

**c. External-service preconditions section (rule 14).** Below — the new reference shape for every attestation touching a third-party service.

Also: `captureException` extended to `(err, { extra?, tags?, fingerprint? })` (`extra` A15-scrubbed; `tags`/`fingerprint` are controlled non-PII grouping keys); `onRequestError` updated to the new shape. E1 §2 amended with the Sev-3 client-only-failure default.

## §2 — External-service preconditions (rule 14)

| Precondition | Verification method | Evidence pointer | Status |
|---|---|---|---|
| Sentry org exists | Broker created org `ownerpilotai` + project (Next.js platform) | Broker screenshot (sentry.io project create) | ✅ broker-confirmed |
| `SENTRY_DSN` set on Vercel **Production** (+ Preview) | Vercel → Environment Variables; Sensitive | Broker screenshot (env list shows `SENTRY_DSN`, Sensitive, Production+Preview) | ✅ broker-confirmed |
| **Data Scrubber** enabled (org level) | Sentry → Settings → Security & Privacy → Data Scrubber = ON | **broker action — screenshot to workspace** | ⏳ broker |
| **Scrub IP addresses** enabled (org level) | Sentry → Settings → Security & Privacy → Scrub IP = ON | **broker action — screenshot to workspace** | ⏳ broker |
| **Session Replay disabled** (project + org) | Code sets `replaysSessionSampleRate:0 / replaysOnErrorSampleRate:0`; confirm no Replay add-on enabled in project settings | Code (`lib/monitoring/index.ts`) + **broker confirm project setting** | ✅ code / ⏳ broker-confirm |

Code-side defense-in-depth (independent of the org toggles above): `sendDefaultPii:false` (no IP/cookies/headers), user identity dropped wholesale in `scrubMonitoringEvent`, every event + breadcrumb A15-scrubbed, and the `beforeSend` no-bypass assertion. The org-level Data Scrubber / Scrub IP are a second layer, not the primary control.

## §3 — Verification (static)
| # | Check | Result |
|---|---|---|
| 1 | `tsc --noEmit` | ✅ exit 0 |
| 2 | `lib/monitoring/__tests__/enable.test.ts` (feature-off no-op + new capture signature) | ✅ pass |
| 3 | `lib/monitoring/__tests__/beforeSend.test.ts` (scrub + no-bypass throw) | ✅ pass |
| 4 | `lib/monitoring/__tests__/scrub.test.ts` (unchanged) | ✅ pass |
| 5 | `lib/email/__tests__/resendMonitor.test.ts` (failure surfaces code; success soak signal; no-key no-op) | ✅ pass |
| 6 | `lib/email/__tests__/privacyAck.test.ts` (unchanged — template param not in POST body) | ✅ pass |

## §4 — Live verification (post-merge, DSN already set)
Since `SENTRY_DSN` is set on Production, after this PR deploys: trigger a captured server error (e.g. a route throw) and confirm the issue lands in the Sentry project **scrubbed** (no PII, no user identity, no IP). Capture the Sentry issue view to the workspace. This closes C1 Amendment-A and, per the D1 close-out §4, **begins formal Fork-G Sev-counter accrual from that moment**.

## §5 — Standing items recorded
- **CX-1** (client-side error capture): required before public-launch/open-beta; not for closed-beta or Gate-3 closure. Eval options at that time: `@sentry/nextjs` (if Turbopack gaps close), `@sentry/browser` manual init, or any reporter satisfying the same `beforeSend` no-bypass + `sendDefaultPii:false` + no-session-replay rules.
- **Sev-3 client-only default** codified in E1 §2 (prevents an unobservable-by-design client failure from later resetting a Sev counter).

---

— Engineering (Claude Code) · Fork C1 Amendment-A completion · 2026-07-02
