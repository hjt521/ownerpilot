# Omnibus Broker Ruling — OwnerPilot (2026-07-04)

**Date:** 2026-07-04
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering)
**Re:** Omnibus ruling on Part 1 (resolve now) + Part 2 acknowledgment
**Request doc:** Engineering omnibus ruling request, 2026-07-04

---

## Executive summary

**Part 1: FAST PATH — Adopt all engineer leans, with three amendments (items 1, 2, 6) and one confirmation (item 13).**

- **Item 1 (P6 scope):** ADOPT with clarifying amendment — P6 = harden /chat + optional public owner form. No tenant-facing eviction tool.
- **Item 2 (P3 §B.7 tenant-SMS):** KEEP §B.7. TCPA firewall stays. Reversal path defined but not authorized in this ruling.
- **Item 3 (P2 verification view + auth):** ADOPT authenticity-only via signed token, no login, no tenant PII.
- **Item 4 (P2 QR dependency):** ADOPT qrcode + @types/qrcode.
- **Item 5 (W2 routing scope):** ADOPT — pathway routing shipped in W2; artifact/overlay routing is packet-manifest lane.
- **Item 6 (P1 packet-delivery recipient policy):** AMEND — recipient-neutral is correct with the §1162 disclaimer, but with three tightenings that ship alongside.
- **Item 7 (Rate-limit config reconciliation):** KEEP ratified per-session config. Revise via separate ruling only if traffic warrants.
- **Item 8 (P5 staging domain):** ADOPT — deploy straight to ownerpilot.ai; Vercel preview is staging.
- **Items 9-11 (ratifications):** ADOPT as leaned.
- **Items 12-17 (broker-executed ops):** ADOPT. Item 13 ADMIN_EMAILS: confirmed value below.

**Part 2 (042-window items H1-H7):** Acknowledged. Batch as described. No early VALIDATE.

**Guardrails:** Reaffirmed in full. Broker-only attribution, FF-3 dark four-gate discipline, G3 + G5 on every user surface, FF3_CAPTURE_ENABLED prod flip requires separate ruling.

Full item-by-item disposition below.

---

## Part 1A — Decisions

### Item 1 — P6 scope (tenant intake portal mis-name)

**RULING: ADOPT with clarifying amendment.**

Engineer's read is correct. "Tenant intake portal" was my naming error carrying over from the P1-P6 draft; the actual function has always been the **owner/landlord retail funnel** — a public entry point that lets a landlord tell OwnerPilot about their property and situation, which then feeds `/chat` for produce-path handoff.

**Ship scope for P6:**

1. **Harden /chat** — the primary owner-facing surface. This is where the persona from Q1 vocabulary meets the produce path.
2. **Optional public owner form** — a lightweight pre-chat entry (property address, contact, one-line situation description) that pre-populates /chat context. Optional in the sense that /chat must also work as a direct entry point without the form.

**Explicitly out of scope for P6:**

- **No tenant-facing eviction tool.** OwnerPilot serves landlords and their agents. A tenant-facing product would be a different regulatory posture (fair-housing exposure, potential unauthorized-practice-of-law risk if it advises tenants on defenses, different data-handling obligations) and requires a separate purpose ruling before any code exists.
- **No tenant-facing anything** by default. If a future feature requires a tenant view (e.g., the P2 verification page — see item 3), it must be authenticity-only, minimal-surface, and separately ruled.

**Rename in all engineering copy:** "tenant intake portal" → "owner retail funnel" or "landlord funnel." Update the P1-P6 standing order references, any UI copy, and the productization prompt. This is not a code-behavior change; it is a naming-and-scope reconcile that prevents the wrong feature from being built.

---

### Item 2 — P3 §B.7 tenant-SMS reversal

**RULING: KEEP §B.7 in force. Reversal not authorized in this ruling.**

The ratified "owner-copy-only, no server→tenant SMS" TCPA firewall (§B.7) stays live. Broker-alert SMS and 2FA SMS remain the authorized server→user SMS channels; both are transactional, initiated by user action, and outside the TCPA-marketing framework that killed the tenant-SMS path in the first place.

**Why the firewall stays:**

Server→tenant reminder SMS reintroduces every TCPA and reassigned-number risk the original ruling closed. Tenants did not opt in to SMS from OwnerPilot — they opted in to a tenancy with a landlord. OwnerPilot texting a tenant, even a "reminder," is a third-party commercial contact under 47 U.S.C. § 227 and TCPA implementing regulations, and it exposes OwnerPilot to:

- Statutory damages ($500-$1,500 per message per recipient)
- Reassigned-number liability (the phone number in the lease may no longer belong to the tenant when the SMS fires)
- Aggregator/carrier deregistration risk on the 10DLC campaign

**Path to reversal (documented but not authorized here):**

If a future business need justifies opening a server→tenant SMS channel, the reversal requires all three of:

1. **Express written consent from the tenant, obtained directly by OwnerPilot** (not inherited from the lease). Consent must be TCPA-compliant: clear, conspicuous, specific to the sender (OwnerPilot), specific to the purpose (reminder SMS about their tenancy), and revocable via STOP.
2. **Double opt-in** — tenant provides the number, OwnerPilot sends a confirmation SMS, tenant replies YES/CONFIRM to activate. No SMS traffic to the number until the confirmation is received.
3. **Reassigned-number mitigation** — before every send, hit the FCC Reassigned Numbers Database (or a compliant equivalent) to verify the number has not been reassigned since consent was obtained. If reassigned or ambiguous, do not send.

Even with all three, the reversal is a **separate broker ruling**, not a §B.7 amendment. If engineering ever needs it, request the ruling explicitly with the business justification. Do not build the reversal path speculatively.

**No engineering action required for this item beyond confirming §B.7 remains enforced in code.**

---

### Item 3 — P2 verification view + auth

**RULING: ADOPT authenticity-only via signed token, no login, no tenant PII.**

The QR on the packet cover scans to a public verification page that answers exactly one question: **is this packet cover authentic and unaltered?** Nothing more.

**Verification page contents (approved, exhaustive):**

- Packet manifest SHA-256 hash (short display + full hash on hover/expand)
- Generation timestamp (UTC + PT)
- Packet type (e.g., "3-Day Pay-or-Quit + LAHD Filing Cover Sheet + UD-100 Packet")
- OwnerPilot verification badge / logo
- A short prose statement: "This confirms the packet cover was generated by OwnerPilot at the timestamp shown. It does not constitute service of process, legal advice, or an attestation of the packet's contents. See Cal. Code Civ. Proc. § 1162 for authorized service methods."
- G3 disclaimer banner + G5 footer (mandatory per guardrails)

**Not on the verification page:**

- Tenant name, address, phone, email, or any tenant-identifying detail
- Landlord name or entity name
- Premises address
- Rent amount, notice contents, or any packet-body data
- Session IDs, produce-path IDs, or any internal identifiers
- Anything requiring authentication

**Auth mechanism:**

Short-lived signed token embedded in the QR URL. Recommended parameters:

- HMAC-SHA256 signature over `{manifest_hash, generation_ts, packet_type, expiry_ts}`, keyed by `PACKET_VERIFY_SECRET` (env)
- Token expiry: 90 days from generation (long enough to survive typical eviction timeline, short enough to limit stale-URL exposure)
- URL format: `https://ownerpilot.ai/verify/<base64url_token>`
- Verification server validates the signature, checks expiry, renders the fixed content set above

**Rejected alternative (full-packet + login):**

- Full-packet view exposes tenant PII on a page reachable by anyone who scans the QR, which is the whole neighborhood if the notice is posted-and-mailed. Fair housing, § 1798.83 disclosure, and general PII exposure risk are all present.
- Login requirement defeats the purpose — the QR is meant for a court clerk, opposing counsel, or the tenant themselves to confirm authenticity quickly. Adding an auth wall makes it useless.

**No changes to /chat, produce path, or packet generation for this item — verification page is a new isolated route.**

---

### Item 4 — P2 QR dependency

**RULING: ADOPT qrcode + @types/qrcode.**

Standard, well-maintained library. No concerns.

---

### Item 5 — W2 routing scope

**RULING: ADOPT.**

Engineer's read is correct. §2.1 originally described three routing dimensions (just_cause / artifacts / overlays); the as-built W2 shipped **notice_type → pathway routing**, which is the highest-value dimension and the correct first cut.

**Adopted split:**

- **Pathway routing = W2 (shipped).** notice_type + jurisdiction → correct statutory pathway (3-day pay-or-quit, 3-day cure-or-quit, 30-day termination, 60-day termination, TPA no-fault, JCO/RSO, etc.).
- **Artifact routing = packet-manifest lane.** Which specific documents (RTC packet, LAHD cover sheet, Ellis-type filings, relocation-assistance calc) attach to a given produce-path run. Belongs with the packet-manifest work already in flight.
- **Overlay routing = packet-manifest lane.** Local-ordinance overlays (LAMC §§ 151/165, Santa Monica, West Hollywood, etc.) that layer on top of statewide TPA. Also packet-manifest territory.

Update W2 attestation to reflect scope: "W2 delivered pathway routing; artifact and overlay routing scoped to packet-manifest lane."

---

### Item 6 — P1 packet-delivery recipient policy

**RULING: AMEND. Recipient-neutral with §1162 disclaimer is correct, plus three tightenings.**

Engineer's lean is substantively right — restricting packet-delivery recipients to owner/counsel only would break legitimate use cases (broker sends to opposing counsel, broker sends courtesy copy to co-owner, broker sends to landlord's own attorney for review). Recipient-neutral is the right default.

**Adopted policy:** OwnerPilot's packet-delivery mechanism will send to any recipient the authorized user directs, subject to three tightenings.

**Tightening 1 — mandatory §1162 disclaimer on every delivery.**

Every packet-delivery email and every packet cover page includes verbatim:

> "**Not service of process.** This delivery is a copy of a landlord-tenant packet generated by OwnerPilot. It is not service under Cal. Code Civ. Proc. § 1162. Service must be effected by one of the methods enumerated in § 1162 (personal delivery, substituted service, or posting-and-mailing) by a person authorized to serve. Delivery of a copy by email, download link, or any other electronic means does not satisfy § 1162."

This disclaimer text is banned-term / locked-prose eligible — add to the locked-prose manifest so it cannot be modified without a broker ruling.

**Tightening 2 — sender verification.**

The authorized user (the landlord or landlord's agent operating under broker scope) must be authenticated at the point of triggering a delivery. Anonymous /chat sessions cannot trigger packet-delivery emails to arbitrary third parties. This is a spam-prevention + phishing-prevention control; without it, OwnerPilot's SMTP reputation and Twilio 10DLC campaign are both at risk.

**Tightening 3 — recipient logging.**

Every delivery event logs: sender (authenticated user ID), recipient email (SHA-256 hash + first 4 chars of local-part for debug), packet manifest hash, timestamp, delivery status. Log destination: existing audit sink. Purpose: broker review if a delivery is later contested ("I never authorized OwnerPilot to send this to X").

Do NOT log full recipient email addresses in plaintext — that's a PII overreach. Hash + prefix is enough to reconstruct in a broker-review scenario without creating a plaintext PII sink.

---

### Item 7 — Rate-limit config reconciliation

**RULING: KEEP ratified per-session config.**

The per-session config was ratified in `chatbox_ratelimit_store_attorney_signoff_2026-06-08` and confirmed in production. The per-IP / per-user numbers in the P4 ruling (Q4) were starting values for a new /api/chat wiring — not a replacement for the ratified store.

**Reconciliation:**

- **Ratified per-session config** — governs the existing /chat surface. Unchanged.
- **Per-IP / per-user buckets from P4 Q4** — treat as **additional layers** on top of the per-session config for the /api/chat route specifically. Per-session limits abuse from a single session; per-IP limits abuse across sessions from one network; per-user (when authenticated) limits abuse across sessions from one identity. All three can coexist and enforce different threat models.

If /api/chat is the same code path as the /chat surface (which I believe it is), then the per-session config is already enforced and Q4's wiring is redundant to that layer. In that case: **wire the per-IP and per-user buckets as additional layers**, do not remove the per-session enforcement.

**Revise via separate ruling** only if:
1. Real traffic shows per-session is insufficient (a specific abuse pattern crosses sessions), OR
2. Real traffic shows per-IP/per-user buckets are too tight and blocking legitimate use

Do not tune these in the P4 close-out.

---

### Item 8 — P5 staging domain

**RULING: ADOPT — deploy straight to ownerpilot.ai; Vercel preview is staging.**

The pplx.app reference was appropriate for pre-domain preview when DNS wasn't ready. DNS is ready (per Claude's P5 preflight); no reason to route production traffic through a Perplexity subdomain. Vercel's `*.vercel.app` preview URL serves as staging naturally — every preview branch gets one automatically.

**Deploy target hierarchy:**

- **Production:** `ownerpilot.ai` (apex) + `www.ownerpilot.ai` (redirect to apex or serve directly, engineer's choice)
- **Staging:** `<branch>-ownerpilot.vercel.app` (auto-provisioned by Vercel per PR/branch)
- **No pplx.app deployment.** That was a fallback for a DNS-not-ready state that no longer applies.

DNS cutover checklist (item 16) proceeds as planned, preserving Resend DNS records for email.

---

## Part 1B — Ratifications

### Item 9 — P1 email copy (three provisional bodies)

**RULING: ADOPT.**

The three provisional bodies (`PACKET_DELIVERY_EMAIL_BODY_V1`, `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1`, `LAHD_CONFIRMATION_EMAIL_BODY_V1`) are ratified as v1. Standard broker close-out disciplines apply:

- Add all three to the locked-prose manifest with `_V1` suffix (allows future `_V2` without ambiguity)
- G3 disclaimer + G5 footer on every one
- No attorney attribution, no SBN
- §1162 disclaimer (per item 6, Tightening 1) on `PACKET_DELIVERY_EMAIL_BODY_V1` specifically

If engineering wants to substantively change the copy later, request a separate ruling with the proposed diff.

---

### Item 10 — FF-3 entry-13 text (chatFf3ResumeAfterBrokerReviewCard)

**RULING: Engineer drafts for countersign.**

Same pattern as the P4 Q1 vocabulary — engineering knows the surrounding UX context and locked-prose neighboring entries better than I do; I countersign the draft rather than authoring from scratch. Draft the entry text, mark `[VERIFY]` on any figure or citation you want me to check, and submit for countersign in the same batch as the 042 co-batch (H4 manifest insertion).

This is a mechanical drafting task; do not block on it.

---

### Item 11 — Wave-4 synthetics (4 W2 + 5 FF-4 call-site, catalog → ~21)

**RULING: ADOPT.**

Wave-4 synthetics catalog expansion (~21 total) is ratified. Confirm on delivery that the synthetics harness conformance (per `synthetic_a14_harness_conformance_broker_ruling_2026-06-30`) is preserved for the new entries. If any of the 9 new synthetics require harness changes, flag in the attestation.

---

## Part 1C — Broker-executed ops (do now)

### Item 12 — Branch protection: verify-route-body-parsing + 8 advisory guards

**RULING: I will do this.**

- Add `verify-route-body-parsing` to required checks on the protected branches
- Promote the 8 advisory guards to required status
- GitHub ruleset UI, not CLI (per the pattern established in `branch_protection_actual_baseline_2026-07-01`)

Ack when complete. If any of the 8 advisory guards have flaky-recent-runs, note which ones and I'll assess whether to defer.

---

### Item 13 — ADMIN_EMAILS on Vercel

**RULING: Confirmed value.**

**Set `ADMIN_EMAILS = jack@ownerpilot.ai,hjt521@gmail.com`** (comma-separated, no space).

Rationale: primary alias `jack@ownerpilot.ai` for the operating identity, backup `hjt521@gmail.com` so alerts still reach me if the ownerpilot.ai email pipeline itself is the incident (per the 2026-07-02 transactional-email prod incident). Two-email fanout is cheap and protects against the same-domain-outage failure mode.

I will set this on Vercel; ack when complete.

---

### Item 14 — Sentry: Data Scrubber + Scrub IP (org-level)

**RULING: I will do this.**

Both are org-level toggles in Sentry. Enable per `gate3_forkD1_privacy_sla_attestation_2026-07-02` privacy discipline. Ack when complete.

---

### Item 15 — cron_1_ca_statute_watch: add LAMC scope

**RULING: I will do this.**

Add to the CA 3-day statute watch cron (`2a58382e`):

- **LAMC § 151.09** — RSO just-cause reasons
- **LAMC § 165.05** — JCO just-cause reasons
- **LA City Ord. 188,681** — the ordinance that codified the current JCO framework

These join the 10 statewide statutes already watched. I'll update the cron definition directly via the standing cron edit path.

---

### Item 16 — P5 deploy + ownerpilot.ai DNS cutover

**RULING: I will do this** (with engineering handling the Vercel-side deploy trigger).

Sequence:
1. Engineering confirms preview build is green on the current main-branch preview URL
2. I flip DNS on the registrar (A record to Vercel apex, CNAME on www)
3. **Preserve Resend DNS records verbatim** — do not touch SPF, DKIM, DMARC entries for Resend. Email pipeline broke on 2026-07-02 because of a related regression; do not create a repeat.
4. Engineering triggers the Vercel prod deploy tied to ownerpilot.ai
5. Post-cutover: verify apex loads, www redirect works, Resend email still sends (test transactional path), Sentry captures a synthetic error to confirm hook is live

Ack when 1-5 complete.

---

### Item 17 — Env vars per enabled lane

**RULING: ADOPT per enabled lane.**

- **PACKET_VERIFY_SECRET** (P2) — I generate (32-byte random, base64url encoded), set on Vercel. Rotate annually or on compromise.
- **Twilio envs + 10DLC registration** (P3) — I have the Twilio account. Engineering provides the env-var list; I fill values. 10DLC campaign registration is my task; brand approval takes 1-5 business days, so start now even though production SMS traffic waits on other pieces.
- **TURNSTILE_SECRET_KEY** (P6) — I generate via Cloudflare Turnstile dashboard, set on Vercel.
- **Rate-limit Redis** (P4) — I confirm whether we're using Vercel KV (Redis-compatible) or a separate Upstash Redis. Recommend Vercel KV for simplicity unless engineering has a specific reason to prefer Upstash. Engineer, confirm choice; I'll provision.

Ack per lane as each env is populated.

---

## Part 2 — 042-window items (H1-H7)

**ACKNOWLEDGED.** Co-batch as one landing after 043 soak clears, no earlier than 2026-07-10 morning. No early VALIDATE authorized under any circumstance (item locked in `daycount_defect_workflow_fork_broker_ruling_2026-06-30` and re-locked in `gate2_prod_runwindow_countersign_2026-07-02`).

**Approved landing order within the co-batch:**

1. H1 — migration-042 VALIDATE
2. H7 — compliance_gates migration (depends on 042)
3. H2 — reconciliation call-site + entry-14
4. H3 — FF-4 hook (order: recon → FF-4 → W6 → W2) + verbatim_hash retrofit
5. H4 — entries 13/14 manifest insertion
6. H5 — awaiting_broker_review resolution surface
7. H6 — produce-gate chain

If any of H1-H7 develops a blocker before 07-10 that would prevent same-window landing, flag immediately — do not silently defer. If flagged, we reassess whether the blocker item forks out of the co-batch or delays the whole batch.

Countersign of the co-batch attestation happens in the 07-10 session per the pending countersign queue.

---

## Guardrails — reaffirmed

1. **Broker-only attribution.** No attorney signature, no SBN, no attorney persona anywhere in prose, code comments, prompt copy, or documentation. Signing block is fixed:
   > — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · YYYY-MM-DD

2. **FF-3 dark four-gate discipline.** Capture / classifier / broker-review / resume gates all remain dark until each is separately ratified. FF3_CAPTURE_ENABLED specifically does NOT flip in prod under this ruling.

3. **G3 disclaimer banner + G5 footer** on every user-facing surface. This is non-negotiable and applies to the new P2 verification page (item 3), P6 owner-funnel form (item 1), all P1 email bodies (item 9), and any other user surface added in this or future rulings.

4. **FF3_CAPTURE_ENABLED prod flip requires its own ruling.** Do not include in Part 1 or Part 2 co-batches. Separate broker ruling required, with the specific capture-scope, retention policy, and PII posture defined at ruling time.

5. **Address + tenant name file-naming pattern preserved.** All Clifton Alexander (and any future tenant matter) artifacts follow `5537LaMirada-202-CliftonAlexander_<descriptor>_<date>.<ext>` — no exceptions.

6. **CAR forms discipline (per P4 Q1 ruling):** No verbatim CAR clause language in persona output, no CAR form structure reproduction, no CAR form generation. Runtime banned-term gate scrubs CAR form identifiers. Landlords upload their own leases; OwnerPilot operates under first-sale + fair-use + agent-authorization.

---

## Ratification & signature

This ruling is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **omnibus_broker_ruling_2026-07-04**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04
