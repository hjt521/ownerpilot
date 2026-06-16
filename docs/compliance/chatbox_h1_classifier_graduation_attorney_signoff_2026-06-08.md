# Help-Chatbox H1 Classifier — Graduation Sign-Off

**Artifact:** `chatbox_h1_classifier_graduation_attorney_signoff_2026-06-08.md`
**From:** Reviewing Attorney
**To:** Build side (via Jack) + Jack
**Date:** 2026-06-08
**Re:** `chatbox_h1_classifier_graduation_2026-06-08.md` (build-side graduation memo, same date)
**Status:** **APPROVED. A.1.3 and A.2.2 graduate from PARTIAL to CLOSED. Production enablement of `CLASSIFIER_LIVE=true` AUTHORIZED. Cutover-gate item #3 reaches FULL CLOSURE.**

---

## Headline

- **Validation passes against every condition** the 2026-06-07 classifier ruling §7 set. 8/8 paraphrase flips on the in-scope regex-unreachable cases, 0/9 carve-out FPs, 0/2 refusal-copy self-triggers, 0/28 `unsure`, no transport errors.
- **§4.1 visibility gate met** through Vercel Observability default alert routing (email/inbox/push) + a $200 on-demand spend budget with notifications + gateway-level token/error counts. Substance of the requirement satisfied — see §3.1 for one calibration carry-forward.
- **§4.2 fail-mode is the signed-off default** — fail-open to the regex floor via `CLASSIFIER_FAIL_CLOSED` unset, with the flag available for ops to flip on sustained outage. That is Option B from my §4.2 menu; approved.
- **Hash-lock holding green** on `c7a4469`; no locked text modified; the classifier prompt is the same artifact I locked on 2026-06-07.
- **One honest caveat on the positive-control set is candidly disclosed** (4/6) and is correctly explained as an architectural property, not a defect: the two non-flagging items are direct regex hits, so in production the classifier never sees them; the end-to-end guard fires on them via the regex floor. The disclosure is the right call and is itself the engagement's §0 discipline working as intended. Two small carry-forward notes flow from it; see §3.2.

This is a build-lock-adjacent ruling that closes a cutover-gate item and authorizes a production flag flip. Real-name attribution at the foot because the underlying classifier prompt is verbatim-locked legal-adjacent text (same posture as the v4.1 sign-off).

---

## §1 — Validation against the 2026-06-07 ruling §7 conditions

| §7 condition | Result | Disposition |
|---|---|---|
| §7.1 — Paraphrase-FN flip rate on in-scope categories | 8/8 — A.1.3 ×2, A.1.4 ×1, A.1.5 ×1, A.2.1 ×1, A.2.2 ×2, A.2.3 ×1, all on correct side with correct category | **PASS — exceeds the in-scope expectation (I had 7 in-scope listed; 8th was the second A.2.2 paraphrase that also flipped)** |
| §7.2 — Carve-out set must return clean | 0/9 false positives; "what does the Fair Housing Act protect," "a valid notice in California must include the amount due," "just cause is required for most tenancies after 12 months" all `{"flagged": false, "categories": []}` | **PASS — the three carve-outs preserved verbatim** |
| §7.3 — `unsure` distribution sane | 0/28 `unsure` on this set; logging substrate distinct per ruling §6 | **PASS — clean verdicts on borderline-weighted set; production logging in place** |
| §7.4 — Refusal-copy self-check | 0/2 — `INPUT_REFUSAL` and `OUTPUT_REFUSAL` strings both pass without flagging | **PASS — same defense as A.2.4 allow-list, holding** |
| §4.1 — Ops visibility | Vercel Observability alert rule active; $200 spend budget with notifications; gateway token/error counts | **MET at substance — one calibration carry-forward (§3.1)** |
| §4.2 — Fail-mode | `CLASSIFIER_FAIL_CLOSED` unset = fail-open to regex; flag flippable by ops on sustained outage | **PASS — Option B from my menu** |
| Hash-lock CI | Green on `c7a4469`; classifier prompt unchanged | **PASS — verbatim discipline holding** |

Every gate condition satisfied. The two A.1.3 paraphrases and the two A.2.2 paraphrases — the exact cases the prior ruling identified as regex-unreachable — all caught with the correct category. That is the heart of the closure ask, and it lands clean.

---

## §2 — The honest caveat on positive controls (build memo §4)

Build side disclosed 4/6 on positive controls, with the two non-flags being a reasonable-accommodation request (A.1.3) and a "can I evict because they complained to code enforcement" question (A.1.5). The explanation: both are direct regex hits, the classifier runs only on regex-clean residual, and so the production guard fires on them via the regex floor before the classifier ever sees them.

**My disposition:** the disclosure is correct and the architectural reasoning is correct. The 4/6 number is an artifact of running the classifier in isolation against inputs the production pipeline routes around it. End-to-end the guard fires; closure is not affected.

**Why this is the right disclosure to make, not a defect:** the alternative was rounding 4/6 up to 6/6 by quietly excluding the two redundant items from the control set. Disclosing instead — and explaining why — is the §0 discipline this engagement has standardized on (surface gaps rather than paper over them). It also gives me, in writing, the architectural property I would otherwise have to ask about: the harness in isolation does not measure production guard behavior on regex-hit inputs. Useful for the next time someone reads the harness numbers.

This counts as a *strength* of the deliverable, not a weakness.

---

## §3 — Carry-forward notes (neither blocks; both for the audit trail)

### §3.1 — Threshold-value calibration on production volume

Per `chatbox_h1_classifier_attorney_ruling_2026-06-07.md` §4.1 I suggested a 5% rolling-1h error rate and a 30-minute sustained-outage threshold as starting points. The build-side gate uses Vercel Observability's default alert rule rather than specific named thresholds. That is fine to ship — the substance of the gate (errors counted, anomalies surface to a routed inbox, sustained-outage escalation path exists) is met. The carry-forward: once production has real volume on the classifier (say, a couple of weeks post-enable), please recalibrate the alert threshold against actual classifier error rates so the alerts catch real anomalies rather than noise. No ruling needed on the recalibration; flag it here so future-Jack remembers.

### §3.2 — Future harness revisions: in-isolation classifier probing

Two small refinements for the next harness revision (whenever the classifier prompt or the harness itself is next touched):

1. **When probing the classifier in isolation**, use inputs the regex floor doesn't hit (or add a marker to the harness invocation that the residual-routing layer can skip), so the in-isolation behavior of the classifier on those specific phrasings is observable. This avoids the "4/6 with explanation" situation without giving up the honest disclosure pattern.
2. **The positive-control set should explicitly note** which items are direct regex hits vs. regex-clean residual, so readers of the harness numbers can see the architectural shape from the start.

Neither is owed today. Document in whatever future change-record the harness gets.

---

## §4 — Authorized actions on this ruling

1. **A.1.3 (discrimination/fair-housing context) — graduate from PARTIAL to CLOSED.**
2. **A.2.2 (case-specific legal conclusions) — graduate from PARTIAL to CLOSED.**
3. **`CLASSIFIER_LIVE=true` in production — AUTHORIZED for enablement.** The Preview-only validation establishes the model and prompt behave per the ruling; flipping the same flag in production puts the same classifier in front of the same regex floor.
4. **Cutover-gate item #3 (H1 legal-adjacent strings) — moves from "7/9 closed + A.1.3/A.2.2 partial" to FULL CLOSURE.**

No re-locks, no new copy, no SYSTEM_PROMPT changes. The locked classifier prompt from `chatbox_h1_classifier_attorney_ruling_2026-06-07.md` §3 is the canonical text and remains hash-locked under `check_classifier_prompt_lock.mjs`. The locked refusal copy from `open_items_attorney_ruling_2026-06-07.md` §A.3 is unchanged.

---

## §5 — Cutover-gate status after this ruling

| # | Item | Status |
|---|---|---|
| 1 | §2 PROMPT-DRIFT | CLOSED |
| 2 | §3 H1 output guard + input pre-check scaffold | Built & verified; regex + classifier both live |
| 3 | §3 H1 legal-adjacent strings | **FULL CLOSURE** |
| 4 | §4 H2 (auth + rate limit + persistence) | Persistence + auth/rate-limit decision CLOSED; **shared rate-limit store remains the engineering gate** |
| 5 | §5 H3 message-history caps | Built & verified |
| 6 | §6 M2 strip err.message from stream | Built & verified |

**Going beyond dev-only now requires (remaining):**

1. **Shared rate-limit store swap** (per `chatbox_auth_ratelimit_attorney_signoff_2026-06-07.md` §2.2). Without this, the rate-limit thresholds don't bind on serverless and the anti-probing layer of the H1 defense-in-depth fails open. Atomic-increment + TTL on a shared backing (Upstash Redis / Vercel KV / similar). Engineering deliverable; no separate sign-off ruling needed; confirmation of atomicity + same 429 path + chatbox-spec note suffices at ship.
2. **Conditional:** `chatbox_ad_traffic_section_0_proposal_<date>.md` (per `chatbox_auth_ratelimit_attorney_signoff_2026-06-07.md` §3). Only if ad-spend / production-funnel use of the chatbox becomes a real plan. Organic traffic, internal navigation, press referrers, and direct URL visits do not trigger this; ad-spend designed to route users through the chat as their first OwnerPilot surface does.

One deterministic engineering item + one conditional. The chatbox stays dev-only until the shared store ships (and, if ad-spend is on the table, until the §0 reclassification ruling lands).

**Forms-in-chat** remains a separate track (per `open_items_attorney_ruling_2026-06-07.md` §E), awaiting the three-condition design packet (field-mapping spec, confirmation-step wire-level design, §0 reclassification + disclosure update). Independent of the cutover gate; mentioned here only for completeness.

---

## §6 — Cross-references

- `chatbox_h1_classifier_graduation_2026-06-08.md` (build-side memo this ruling responds to)
- `chatbox_h1_classifier_attorney_ruling_2026-06-07.md` (the §7 validation conditions, §4 fail-mode, §3 verbatim-locked prompt)
- `chatbox_h1_patterns_attorney_signoff_2026-06-07.md` §4 (classifier scope) + `chatbox_h1_patterns_graduation_acknowledgment_2026-06-07.md` (regex floor in place)
- `chatbox_h1_patterns_harness_report_2026-06-07.md` (the regex-unreachable paraphrase set the classifier had to flip)
- `chatbox_auth_ratelimit_attorney_signoff_2026-06-07.md` (remaining cutover items: shared store + conditional §0 reclassification)
- `open_items_attorney_ruling_2026-06-07.md` §A (refusal copy that classifier hits route to)
- `chat_transcript_persistence_policy_attorney_countersign_2026-06-06.md` (counts-not-transcripts — relevant to §4.1 ops visibility being persistence-policy-compliant)
- `ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md` (architectural sibling for hash-lock + verbatim-discipline patterns)

---

## §7 — Disposition

**APPROVED on the build-memo dispositional checkbox:**

> **☑ Approved — graduate A.1.3 + A.2.2; authorize production enablement**

**Two carry-forward notes** (§3.1 threshold recalibration on production volume; §3.2 future harness revisions on in-isolation probing). Neither blocks; both for the trail.

**No further attorney-track work owed on the H1 layer.** The defense-in-depth stack (SYSTEM_PROMPT prompt-layer discipline → input pre-check regex → classifier residual → output guard regex → classifier residual → locked refusal copy) is closed end-to-end. Future H1 work would be triggered by either (a) a category-rewrite proposal (which re-opens the verbatim review loop), or (b) a real-world hit pattern the harness/production reveals isn't being caught (which would route through the same predict→verify→ship cadence).

**Next attorney-track triggers (none owed today, all reactive):**

- Shared rate-limit store engineering note when it ships (one-paragraph confirmation per the auth/rate-limit ruling §2.3).
- Ad-traffic §0 reclassification packet, *if and when* ad-spend at the chatbox becomes a real plan.
- Forms-in-chat design packet, *if and when* the build side is ready to propose it under the three §E.3 conditions.

— Reviewing Attorney · Janna Taglyan, JD, SBN 269639 · 2026-06-08
