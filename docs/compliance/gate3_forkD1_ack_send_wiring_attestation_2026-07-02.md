# Fork D1 — Privacy Ack-Send Wiring — Build Attestation

**Re:** `gate3_forkD1_privacy_sla_attestation_2026-07-02.md` correction + D1 ack-cron wiring authorization (broker ruling §§1–4, 2026-07-02).
**By:** Claude Code (engineering), 2026-07-02. Repo HEAD `main` (post-#137).

---

## §1 — Correction adopted
The prior D1 line "the ack cron already emails requesters" is **retracted**. As-built (pre-this-PR): `privacy-ack-send` logged `[privacy-ack] would send acknowledgement …`, marked the row `acknowledged`, and **sent no email** — a CCPA §1798.130(a)(2) receipt-acknowledgment gap. This PR closes it.

## §2 — What shipped
- **`lib/email/resend.ts`** — `send()` now supports `Reply-To`; added **`sendPrivacyAckEmail(to, submittedAtISO)`**: body = locked **`PRIVACY_ACK_CCPA_TIMELINE_EN`** with `[DATE]` interpolated from `submitted_at` (formatted `Month D, YYYY` in **America/Los_Angeles**), sender `noreply@ownerpilot.ai`, **`Reply-To: privacy@ownerpilot.ai`** (`PRIVACY_ACK_REPLY_TO`). No other PII to Resend.
- **`app/api/cron/privacy-ack-send/route.ts`** — stub removed; now calls `sendPrivacyAckEmail(contact_email, submitted_at)` (added `submitted_at` to the select). Row is marked `acknowledged` **only if the send succeeds** (a throw leaves it for the next tick — no more "marked without sent").
- **`docs/compliance/locked_prose_manifest_phase2_assembly.json`** — new Shape-B entry `PRIVACY_ACK_CCPA_TIMELINE_EN` (verbatim broker copy per §3.1, hash `f9f6a69a1bef40d0600daed2d7aece6f2a9698b3b5ef0968d86d33fcf26e2905`, tier A). Manifest now 55 Shape-B entries.
- **`lib/email/__tests__/privacyAck.test.ts`** — the §3.3-item-4 unit test.

**§3.2 request-type differentiation:** kept **generic** (single template). The locked copy ("your privacy request") + the 45-day SLA apply uniformly to all five request types; a per-type sub-line would force branching without compliance benefit — engineering call per the ruling.

## §3 — Verification (§3.3)
| # | Requirement | Result |
|---|---|---|
| 1 | `tsc --noEmit` | ✓ exit 0 |
| 2 | `verify-locked-prose`: `PRIVACY_ACK_CCPA_TIMELINE_EN` present, no dangling | ✓ PASS (107 entries; hash matches; `// LockedKey` resolves) |
| 3 | `verify-banned-terms` clean on new copy | ✓ OK |
| 4 | Unit test: Resend called with from/to/subject/reply_to + locked body | ✓ **10/10** (from=noreply@ownerpilot.ai, to=requester, reply_to=privacy@ownerpilot.ai, body=locked copy with date interpolated, no `[DATE]` left, cites §1798.130, directs to privacy@) |
| — | `verify-fetch-binding` / `verify-no-operator-secrets` (touched files) | ✓ |
| 5 | **Preview submit → real ack email lands, correct Reply-To** | **Deploy-run — pending Preview** (below) |
| 6 | **Screenshot of received ack showing `Reply-To: privacy@ownerpilot.ai`** | **Pending Preview** (below) |

Verification-env note: the sandbox's shared `node_modules` had macOS esbuild binaries (from the broker's `npm ci`); I added `@esbuild/linux-x64` via `--no-save` (gitignored; no repo change; no effect on the broker's Mac) so the tsx-based guards run here. CI (Linux) is unaffected.

## §4 — §3.4 Resend-key confirmation (broker-confirm)
Engineering **cannot read Vercel prod env** from its scope. `RESEND_API_KEY` **must** be set on Production — `sendClaimEmail` (magic-link) already ships from prod using it, so it should be present. **Broker: confirm `RESEND_API_KEY` is set on Production. If unset → Sev-1** (per §3.4), not a silent gap.

## §5 — Post-merge (items 5–6, deploy-run)
After merge → Preview: submit a real request via `/privacy-request`, run the `privacy-ack-send` cron (or wait for its tick), confirm the ack email lands in a broker-controlled inbox, and capture the received email's headers showing `Reply-To: privacy@ownerpilot.ai`. That + the broker's mailbox confirmation (`privacy@ownerpilot.ai` exists + monitored) = D1 genuinely enabled → broker countersign closes D1.

---

— Engineering (Claude Code) · Fork D1 ack-send wiring · 2026-07-02
