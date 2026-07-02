# Fork C1 — Monitoring (self-hosted Sentry + PII scrub) — Build Attestation

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (C1) + §9 return-trip discipline.
**By:** Claude Code (engineering), 2026-07-02. Repo HEAD `main` (post-#130). In-band under §0 recalibration.

---

## §0 — §9 recon (no return-trip trigger fired)
- **(a) existing hosted monitoring:** NONE. `@sentry`/datadog/relay/otel/bugsnag/rollbar = **0** in `package.json`; source grep hit only a transitive string in `package-lock.json`. No monitoring is wired → C1 is a greenfield in-band build (trigger (a) does not fire).
- **(c) A15 denylist import stability:** stable. `lib/analytics/denylist.ts` re-exports `enforceDenylist` from the canonical `lib/safety/denylist.ts` (with tests). C1 binds to the same SSOT.
- (b) email provider present (`lib/email/resend.ts`) — relevant to D1/B, not C1. (d) no as-built contradiction.

## §1 — What shipped (C1 dimensions, all present)
- **`lib/monitoring/scrub.ts`** — the compliance heart. `scrubMonitoringEvent` / `scrubValue` recursively redact **denied keys** (reusing the canonical `DENIED_KEYS` — now exported from `lib/safety/denylist.ts`, one source of truth) and **PII-shaped strings** (via the same `scanFreeText` patterns), and **drop `user` identity wholesale**. Monitoring **redacts** rather than throws (a scrub-throw would drop the error signal) — the one deliberate policy difference from the analytics surface, documented in-file.
- **`lib/monitoring/index.ts`** — `initMonitoring()` / `captureException()` that are a **safe no-op unless `SENTRY_DSN` is set** (feature-off default per C1). When enabled: `sendDefaultPii:false`, `replaysSessionSampleRate:0` + `replaysOnErrorSampleRate:0` (**no session replay**), **no user identity**, and `beforeSend: scrubMonitoringEvent` / `beforeBreadcrumb: scrubValue`. The `@sentry/node` SDK is loaded via a **runtime specifier** so the app builds + typechecks **without the dep installed**; the DSN points at self-hosted Sentry via the Relay side-car (ops enablement).
- **`lib/monitoring/__tests__/scrub.test.ts`** — 15 assertions: denied keys redacted, PII-shaped strings (email/phone/long-digit) redacted, clean values + numbers preserved, nested redaction, and event-level user-identity drop. **all passed.**
- **`.env.example`** — `SENTRY_DSN` documented, commented-out (off by default) with the no-replay / no-identity / scrub note.

## §2 — Verification
| Check | Result |
|---|---|
| `lib/monitoring/__tests__/scrub.test.ts` | ✓ all passed (15/15) |
| `lib/analytics/__tests__/denylist.test.ts` (unbroken by the `DENIED_KEYS` export) | ✓ all passed |
| `tsc --noEmit` (lazy `@sentry` import → green without the dep) | ✓ exit 0 |
| `verify-no-operator-secrets` | ✓ 627 files (SENTRY_DSN is an env read, no literal) |
| `verify-banned-terms` / `verify-locked-prose` / `verify-fetch-binding` | ✓ |

## §3 — Ops enablement (broker/ops, out of this PR)
Monitoring stays **off** until: (1) `npm i @sentry/node` (or `@sentry/nextjs`) added; (2) the self-hosted Sentry + Relay side-car stood up; (3) `SENTRY_DSN` set (pointing at Relay). Until all three, `isMonitoringEnabled()` is false and every entrypoint is a no-op — zero runtime change. Recommended wiring point on enablement: call `initMonitoring()` from `instrumentation.ts` and `captureException()` in the API route error boundaries.

## §4 — Standing-pattern conformance
- **SSOT held:** the denied-key list stays single-source in `lib/safety/denylist.ts` (exported, not duplicated).
- **Feature-off-until-configured** mirrors the E2E/synthetic flag discipline (no prod behavior change on merge).
- No new prod surface reachable by users; no secret in repo.

---

— Engineering (Claude Code) · Fork C1 monitoring build · 2026-07-02
