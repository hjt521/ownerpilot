# Broker Ratification — OwnerPilot (2026-07-04)

**Date:** 2026-07-04
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering)
**Re:** Five-item ratification request grounded in repo state
**Request doc:** Engineering broker ratification request, 2026-07-04

---

## Executive summary

- **Item 1 (§8.3 illustration sign-off):** SIGNED OFF as delivered on main. No revisions.
- **Item 2 (Four P1 email locked-prose blocks):** RATIFIED as-is. Flip PROVISIONAL → ratified.
- **Item 3 (Four Spanish intake prompts):** REMOVE. Matches English-only v1 posture. Re-introduce via future ES-release ruling.
- **Item 4 (wip/broker-confirm-flow-rewrite):** DISCARD the branch. Reasoning below.
- **Item 5 (env provisioning):** AUTHORIZED. I'll set both on Vercel today.

**Bonus:** Yes, start the P1 trigger call-sites now. Autonomous build, PR-ready, stays dark until RESEND + ratified copy are live — that's exactly the right pattern.

Full disposition below.

---

## Item 1 — §8.3 sign-off on the four live site illustrations

**RULING: SIGNED OFF.**

All four illustrations on main/deployed meet §0 acceptance criteria:

- `hero_chat_first_flow` (16:9)
- `hero_chat_first_flow` (9:16 mobile)
- `feature_jurisdiction_check_v2`
- `feature_resolve_document`

**Verified against §0 acceptance criteria:**

- Warm palette — consistent with brand
- No legible text — auto-generated labels removed
- No people or faces — abstract illustration only
- No CalDRE numbers, firm logos, or attorney references — clean of attribution artifacts
- Cohesive style across all four

**No revisions requested.** Ship §8.3 as signed off.

**Housekeeping:** Add all four asset references to the locked-prose manifest as `_V1` illustration assets so any future replacement requires a broker ruling (parallel discipline to the email copy locking). If manifest doesn't currently accommodate binary asset references, note as a follow-up in the 07-10 queue rather than blocking this ratification.

---

## Item 2 — Ratify the four P1 transactional-email locked-prose blocks

**RULING: RATIFIED as-is. Flip PROVISIONAL → ratified.**

Blocks ratified:

1. `PACKET_DELIVERY_EMAIL_BODY_V1`
2. `BROKER_INTAKE_DIGEST_EMAIL_BODY_V1`
3. `LAHD_CONFIRMATION_FORWARD_EMAIL_BODY_V1`
4. `PACKET_DELIVERY_NOT_SERVICE_1162_DISCLAIMER`

**Verification (implicit — engineer confirmed against manifest state):**

- All four carry G3 disclaimer + G5 footer per guardrails
- No attorney attribution, no SBN
- Broker signature block matches locked format
- `PACKET_DELIVERY_NOT_SERVICE_1162_DISCLAIMER` uses the § 1162 language ratified in `omnibus_broker_ruling_2026-07-04` (item 6, Tightening 1)
- Naming discipline preserved (`_V1` suffix allows future `_V2` without ambiguity)

**Post-ratification discipline:** Any substantive change to any of the four (beyond typo/formatting) requires a new broker ruling with the proposed diff. Minor formatting fixes (whitespace, HTML entity escaping, template-variable rename that doesn't change rendered text) do not require a new ruling but MUST be captured in the PR description with before/after diff so I can spot-check.

**Flip authorized** — engineer proceeds without further broker touchpoint on this item.

---

## Item 3 — Disposition of four PROVISIONAL Spanish intake prompts

**RULING: REMOVE.**

Remove from manifest:

- `chatIntakeRentPeriodsPromptEs`
- `chatIntakeSignerCapacityPromptEs`
- `chatIntakePersonalDeliveryPromptEs`
- `chatIntakePreflightDisputePromptEs`

**Reasoning:**

The v1 posture is English-only. Shipping four unattested Spanish prompts creates three concrete risks:

1. **Provisional prose leaks to production.** Locked-prose discipline exists to prevent unratified compliance-adjacent language from reaching users. Even PROVISIONAL entries in the manifest can be reached by a code path if a locale flag or feature flag flips unexpectedly. Cleanest defense is deletion.
2. **Compliance drift between languages.** The English intake prompts are on their fifth-plus round of ratification (rent periods, signer capacity, personal delivery, preflight dispute — all trace back through the multi-week attorney/broker review sequence). The Spanish drafts have not gone through that discipline. If both languages are in the manifest and English drifts under future rulings, Spanish silently accumulates lag without any track for reconciling it.
3. **False signal to engineering.** Their presence in the manifest suggests Spanish is a supported near-term surface. It isn't. Removing them makes the roadmap honest.

**Path to re-introduction (documented but not authorized here):**

A future ES release would require a **dedicated ES ratification ruling** covering:

- Broker-approved translation of each ratified English prompt (not machine translation — reviewed prose)
- Legal-equivalence attestation that the Spanish prompt captures the same statutory concept as its English counterpart (particularly critical for the §1962 disclosure, §1946.2 just-cause framing, and any AB 12 / Civ. Code § 1950.5 references)
- A locale-routing plan (who sees ES: user-agent detect, explicit toggle, IP-geolocation) that is separately ratified
- Precedent: the LAHD RTC form pair (English + Spanish) already established that per-language ratification is required — see `la_rtc_form_revision_acceptance_english_2026-06-19` and `la_rtc_form_revision_acceptance_spanish_2026-06-19` which are separate rulings for the same form pair.

Do not restore these prompts speculatively. When ES demand justifies the workstream, request the ruling.

**Engineering action:** Remove the four entries from `locked_prose_manifest_phase2_assembly.json` in the same PR that lands other 07-04 rulings, or as a standalone if that's cleaner. Update any lookup call-sites that reference the keys (if any exist) to not depend on them.

---

## Item 4 — Go/no-go on wip/broker-confirm-flow-rewrite

**RULING: DISCARD the branch.**

**Reasoning:**

The branch has three characteristics that together push it to discard rather than deliberate-review:

1. **It's parked.** A branch that has sat as WIP long enough to accumulate divergence from main is a signal that the original design intent has decayed. Whatever justified the rewrite when it was started may or may not still be the right approach after everything that's shipped since (FF-3 discipline, produce-path gate ordering, jurisdiction-key resolution work).
2. **Its test is 3-red against the deployed normalizer.** The tests written for the branch fail against current behavior. That's not a merge-conflict problem that resolves with a rebase — it means the branch's `addressNormalize` implementation is semantically different from what's in production. Cutting it over would silently change the jurisdiction-key logic that routes real notices.
3. **It touches the routing keying.** `addressNormalize` is the input to jurisdiction resolution (LA City vs. LA County vs. Santa Monica vs. West Hollywood, etc., all keyed off normalized address). This is the single most compliance-sensitive normalization in the code. A silent change here is exactly the class of defect that produces a notice under the wrong ordinance — the failure mode we designed the jurisdiction cron and locked-prose discipline to prevent.

**Discard is safer than deliberate review** because:

- The deployed normalizer works. It's been through the address-normalizer reconstitution ruling (`lane5_address_normalizer_reconstitution_broker_ruling_2026-06-30`), the geocode resolver test-set findings (`la_geocode_resolver_testset_findings_broker_ruling_response_2026-06-20`), and the ZIMAS adapter diagnostic series through v6. It has real production standing.
- The WIP branch has none of that lineage. Bringing it forward means either (a) redoing all that ratification against the new implementation, or (b) shipping an unratified normalizer, neither of which is acceptable.
- If a specific improvement in the WIP branch is worth keeping (a bug fix, a performance optimization, a new normalization case), cherry-pick that specific change into a new branch off current main and ratify it on its own merits. Don't drag the whole rewrite along with it.

**Engineering action:**

1. Before deleting, do a one-pass review of the WIP branch diff and identify any specific commit that represents a discrete improvement worth cherry-picking. Save a brief note (workspace file, doesn't need broker sign-off) documenting: what the branch tried to do, why it's being discarded, and any specific changes worth extracting for a future targeted PR.
2. Delete the branch.
3. If any of the "worth extracting" items exist, open a new issue/task for each with clear scope. Do not spawn a rewrite off the deletion.

---

## Item 5 — Env provisioning authorization

**RULING: AUTHORIZED. I'll set both on Vercel today.**

**PACKET_VERIFY_SECRET** (unblocks P2 packet authenticity)

- Generate: 32-byte random, base64url-encoded (I'll use `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`)
- Scope: production environment on Vercel + preview environment (same value; verification tokens must validate on staging previews too)
- Rotation policy: annually, or on any suspected compromise, or on any engineer change with commit access to the verify route
- Storage: Vercel env only. Never committed to repo. Never logged.

**TURNSTILE_SECRET_KEY + site key** (unblocks P6 CAPTCHA)

- Generate via Cloudflare Turnstile dashboard under the ownerpilot.ai domain
- Two values produced: `TURNSTILE_SITE_KEY` (public, safe to expose in client bundle) and `TURNSTILE_SECRET_KEY` (server-only)
- Scope: production + preview
- Configure Turnstile widget for invisible/managed mode initially — friction-only-on-suspicion default. If we see abuse, tighten to always-visible per a separate ruling.

**Ack sequence:**

1. I generate PACKET_VERIFY_SECRET, set on Vercel prod + preview
2. I create Cloudflare Turnstile site under ownerpilot.ai, set both env vars on Vercel prod + preview
3. Confirm in this thread when both are populated
4. Engineering proceeds with P2 sign+embed and P6 widget wiring

**Recording:** I'll note the env-var names and rotation dates in a new workspace file (`env_var_registry_2026-07-04.md`) as a running record — not the values themselves, just the metadata (name, purpose, scope, rotation policy, last-rotated date). This is a lightweight version of what a formal secrets registry would provide, sufficient for our current scale.

---

## Bonus authorization — P1 trigger call-sites

**YES — start the P1 trigger call-sites now.**

This is exactly the right item to run autonomously in parallel with these rulings:

- **Scope is contained** — wire the broker-intake-digest + LAHD-confirmation sends into their trigger events. No new prose, no new locked-prose entries, no compliance-adjacent decisions.
- **Bodies are ratified as of item 2 above.** Copy is locked; you're only building the plumbing.
- **Stays dark until RESEND + ratified copy are live** — that's the correct gate discipline. Wire it, PR it, keep it flag-gated or environment-gated until the email pipeline is confirmed healthy post-2026-07-02 incident.
- **PR-ready hand-off** — I'll countersign the PR when it lands. Include in the PR description: which trigger events are wired, the flag/env gate keeping it dark, and a smoke-test plan for when we flip the gate live.

**No broker sign-off needed to start.** Land the PR when ready.

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`:

1. Broker-only attribution
2. FF-3 dark four-gate discipline (FF3_CAPTURE_ENABLED still requires its own ruling)
3. G3 disclaimer + G5 footer on every user surface
4. Address + tenant name file-naming pattern preserved
5. CAR forms discipline per P4 Q1 ruling
6. All 042-window items remain in the 07-10 co-batch — no early landing

---

## Ratification & signature

This ratification is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **broker_ratification_2026-07-04**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04
