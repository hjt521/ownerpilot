# P6 — Intake Portal — Scope Fork + CAPTCHA Primitive — Attestation

**Date:** 2026-07-04
**Built under:** BROKER STANDING ORDER — Productization 2026-07-03 §2 P6.
**Author:** Engineering (Claude Code).

---

## §1 — HEADLINE FORK: "tenant intake portal" naming vs the described function

The order names P6 a "**tenant** intake portal," but its described behavior is the **landlord/owner** funnel: *"captures intake fields, runs the produce path, generates the packet, and emails/QRs it to the broker for review — the retail funnel."* OwnerPilot's entire product produces **eviction notices for landlords against tenants** (CLAUDE.md: "target users are 50+ property owners"). Two problems with a literal reading:

1. **A tenant-facing eviction-intake portal would be a serious compliance/UPL/consumer-harm problem** — a tenant entering data into a landlord's eviction tool makes no product sense and creates real exposure. I did **not** build that (per §4.4, paused pending your ruling).
2. **The owner intake funnel already exists** — `/chat` (verified: page title "3-Day Notice — OwnerPilot AI", role `owner`, prompt "Tell us what's happening with your tenant"). The described "public form that captures intake + runs produce + hands to broker" is substantially the existing `/chat` funnel.

**Engineer read:** "tenant intake portal" is a mis-name for the **owner retail funnel**, which is `/chat`. P6's real content is therefore either (a) **verify/harden the existing owner funnel** (add CAPTCHA + PII gate to `/chat`), or (b) build a **simpler non-chat public owner form** as an alternate retail entry. **A genuinely tenant-facing portal is NOT recommended** and needs an explicit, separate purpose ruling before any build.

**Broker to rule (omnibus §F19):** confirm P6 = harden `/chat` (owner funnel) + optional simple public owner form; NOT a tenant-facing tool.

## §2 — What shipped (unambiguous, reusable): CAPTCHA verification

`lib/safety/captcha.ts` — `verifyCaptchaToken(token, remoteIp?)` via Cloudflare Turnstile siteverify (REST, no dep). Any public funnel needs abuse throttling regardless of the §1 resolution.
- Unconfigured (no `TURNSTILE_SECRET_KEY`) → allow + `configured:false` (rollout-safe).
- Configured: valid → allow; missing/invalid → block; Cloudflare verify error → **fail-closed** block (a submission we can't verify isn't trusted).
- 7/7 tests (unconfigured allow, missing/invalid block, success allow, HTTP-error + network-throw fail-closed). tsc clean, banned-terms OK.

## §3 — As-built inventory for the funnel (verify, per §5)

- **Owner intake:** `/chat` ✅ (exists).
- **Rate-limit / abuse:** ✅ (wired into `/api/chat` in P4-Q4) + CAPTCHA now (this PR).
- **PII denylist (lane7 a15/a14):** ✅ `lib/safety/denylist.ts` (`enforceDenylist`, `scanFreeText`) — ready to gate any public form's input.
- **CAPTCHA:** ✅ this PR (the missing piece).

## §4 — `awaiting_broker_review` boundary (042-gated, per order)

The order acknowledges `awaiting_broker_review` is FF-3-042-gated. When the portal build proceeds (post §1 ruling), the review-routing boundary stubs to a **manual-review email** (P1's `sendBrokerIntakeDigestEmail`) until 042 lands and the real `awaiting_broker_review` resolution surface exists. No portal write-path built yet (held on §1).

## §5 — Held pending the §1 ruling

The portal page + its produce-path wiring + the CAPTCHA/PII gate integration are **not built** — they depend on the §1 scope resolution (harden `/chat` vs new owner form). Building a portal of unknown scope (or a tenant-facing one) would be wrong. CAPTCHA is the reusable primitive that plugs in once scope is set.

## §6 — Omnibus §F additions

- **F19 · P6 scope ruling** (§1) — confirm owner-funnel, not tenant-facing.
- **F20 · `TURNSTILE_SECRET_KEY`** (+ site key) on Vercel when CAPTCHA is enabled.

## §7 — Verification

CAPTCHA 7/7 · tsc clean · banned-terms OK · no dependency, no migration.

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P6) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code. Portal build held on the §1 scope ruling; CAPTCHA primitive shipped.
