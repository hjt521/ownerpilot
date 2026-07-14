# Scope-A Closure Omnibus — Broker Ruling

**Broker Compliance Review · 2026-07-13 (late evening PT)**

Ruling on [`ff3_prod_flip_and_scope_a_closure_omnibus_request_2026-07-13.md`](file:///home/user/workspace/uploaded_attachments/35871d4e55814d17a0d2cc9d68fa2a0d/ff3_prod_flip_and_scope_a_closure_omnibus_request_2026-07-13.md). Every §1–§4 item ruled in one pass so engineering isn't turn-gated during the F2 window.

**Governance preserved:** §4.13 — every Studio/Vercel/GitHub/branch-protection action stays broker-executed. §0 recalibration preserved — engineering builds/verifies/hands blocks. Nothing below authorizes a Production `FF3_CAPTURE_ENABLED=true` flip except §1.6 explicitly, and that authorization is conditional on the §1.6 attestation packet.

**Approve-all disposition:** ☒ All [RECOMMENDED] defaults approved, with the amendments in §7 below. Full rulings by section follow so the record is unambiguous.

---

## §1 · FF-3 production-flip prerequisites — RULED

### §1.1 Preview soak window — **APPROVED as recommended, with clarifications**

- **Duration:** 2026-07-13 (Preview-live) through **2026-08-01 14:53 PT** (F2 expiry). ~19 days, clears the 14-day floor.
- **"Clean" criteria (this is the record):**
  1. Zero Sev-1 attributable to FF-3 in the C1 Sentry stream.
  2. Zero Sev-2 attributable to FF-3, OR if a Sev-2 occurs, root cause is remediated + a broker-countersigned Sev-2 note is filed before the flip attestation.
  3. All existing CI guards remain green on `main` for the duration (locked-prose at 130, banned-terms, attorney-attribution, `tsc`, route-body-parsing).
  4. No anomaly spike in `ff3_resume_scope_mismatch` or `ff3_resume_already_consumed` — "spike" defined as >3× the baseline rate over any 24-hour window once baseline is established (engineering defines baseline in the §1.2 monitoring build).
  5. Manifest floor holds at 130. Any locked-prose amendment during soak requires its own ratification and does not automatically break soak; the amendment ruling states whether the soak clock continues or resets.
- **Soak-break policy:** any of (1) or (3) breaks soak. (2) requires the Sev-2 remediation note. (4) requires an engineering diagnostic memo but does not automatically break soak — I rule on continuation case-by-case.
- **Non-drift:** an FF-3-adjacent Sev-1 that is *not* attributable to FF-3 (e.g. parcel-health or LAHD-forms cron failure) does not break the FF-3 soak — those are their own compliance surfaces.

### §1.2 Production monitoring parity — **APPROVED**

- Engineering authorized to build FF-3 synthetics on the existing A14 harness pattern: produce-gate chain traversal, reconciliation-gate 500-detection, resume-endpoint scope-check happy + negative paths.
- Sentry alerts to add: FF-3 endpoint 500 rate, `ff3_resume_scope_mismatch` rate, `ff3_resume_already_consumed` rate, awaiting-review backlog age.
- **Deliverable:** monitoring attestation packet (`ff3_prod_monitoring_parity_attestation_YYYY-MM-DD.md`) filed to workspace before the §1.6 flip attestation. Attestation must include the baseline-rate numbers referenced in §1.1(4).
- Build during F2 window is authorized; no additional ruling required per synthetic.

### §1.3 Rollback drill — **APPROVED**

- Engineering scripts + executes the drill in Preview:
  1. Baseline: `FF3_CAPTURE_ENABLED=true`, run the E2E happy path, capture the FF-3 disposition record.
  2. Flip to `false`, re-run the same E2E path, assert produce-gate chain skip-disposition + no FF-3-scoped owner-facing surface renders + no residual state.
  3. Flip back to `true`, re-run the E2E, confirm parity with the baseline capture.
- **Deliverable:** rollback drill evidence (`ff3_rollback_drill_evidence_YYYY-MM-DD.md`) with the three E2E artifacts + short prose. Filed to workspace, referenced in the §1.6 flip attestation.
- **Amendment (mine, not from the recommendation):** the drill must be executed at least **twice** during soak — once early (within the first week) and once within 48 hours before the §1.6 attestation. Rollback confidence from a stale drill is not rollback confidence.

### §1.4 Data-volume review — **APPROVED as recommended**

- Preview coverage is sufficient. Rationale accepted verbatim: gates are deterministic (no LLM in the FF-3 walk), E2E exercises mismatch → escalate → resolve → resume → produce plus the two negative branches, golden-catalog synthetics cover chain permutations.
- **No prod-scale replay required.** This ruling closes item §1.4 without further evidence.

### §1.5 On-call runbook update — **APPROVED as recommended, with additions**

- FF-3 runbook section with the four Sev classifications engineering proposed:
  - Sev-2: reconciliation-gate 500s.
  - Sev-3: `ff3_resume_scope_mismatch` spike (client/replay bug signal).
  - Sev-3: `ff3_resume_already_consumed` spike.
  - Sev-3: awaiting-review backlog with no broker action >48 hours.
- **Add three more classifications:**
  - Sev-1: produce-gate chain silently skipping a disposition write (correctness-critical).
  - Sev-2: `/admin/ff3-review` unreachable while awaiting-review items exist.
  - Sev-3: locked-prose guard failure specifically on FF-3-scoped assertions during soak (soak-continuation implications).
- **Deliverable:** runbook diff or new section filed to workspace referenced by the §1.6 attestation.

### §1.6 Production flip authorization — **CONDITIONAL PRE-AUTHORIZATION**

- Production `FF3_CAPTURE_ENABLED=true` is **pre-authorized** to become effective upon engineering filing a Prod-Flip Attestation Packet demonstrating §1.1–§1.5 satisfied plus soak clean, and my countersign on that packet.
- **Mirrors the Gate-4 conditional-countersign shape** — my prior discipline stands. This is not a "flip now" authorization.
- **Prod-Flip Attestation Packet contents (this is the record — engineering can start building against this list today):**
  1. §1.1 soak evidence: Sentry stream extract for the window; CI-guard green history; anomaly-rate readouts; manifest history at 130.
  2. §1.2 monitoring parity attestation (its own file, referenced in the packet).
  3. §1.3 rollback drill evidence, both runs.
  4. §1.4 short affirmation citing this ruling.
  5. §1.5 runbook diff.
  6. Deploy plan: exactly which env in which environment gets flipped, in what order, with what smoke test on the other side.
  7. Rollback plan: who executes, what the failure signal is, how long to detect, how long to rollback.
- **LA-only carve-out:** the flip authorizes LA production only. It does not authorize Scope B (multi-city) or Scope C (UD self-filing). Any expansion beyond LA requires its own ruling chain.
- **Expiration:** if the Prod-Flip Attestation Packet is not filed within 45 days of F2 clean-expiry, this pre-authorization lapses and re-authorization requires a fresh ruling (soak evidence may go stale).

---

## §2 · Gate-3 closure — RULED

### §2.1 Waves 3–4 closure attestation — **APPROVED**

Engineering files a waves-3–4 closure evidence note (gate files + green suites + Gate-4 live-in-Preview proof). I countersign closure on that packet. Given engineering's ratification refresh confirmed all wave-3 components (W2, FF-4 FMR pre-check, W3, W4, W6) plus wave-4 golden regression are code-complete, tested, and Preview-live via `runProduceGateChain`, this closure should be short and evidence-heavy rather than prose-heavy.

### §2.2 Broker Sentry toggles — **ACKNOWLEDGED, broker-executed**

I toggle Data Scrubber + Scrub IP in Sentry, capture screenshots, file to the Gate-3 evidence set. On my queue.

### §2.3 CI guard Required-promotion — **APPROVED**

I promote `verify-route-body-parsing` to a Required check in the ruleset. Engineering has confirmed the guard is already in CI runs and passing green. Only the branch-protection setting is pending. On my queue.

### §2.4 Gate-3 closure predraft — **APPROVED — I draft after F2 clean-expiry**

I draft the Gate-3 closure predraft on/after 2026-08-01. Engineering supplies the drift-fire clean record + no-Sev-1 evidence on request. Predraft cannot be filed before F2 expiry — the closure depends on the timer running clean.

---

## §3 · Deferred FF-3-adjacent seams — RULED

Approve-all with engineering's per-row recommendations. Dispositions locked:

| Seam | Weight | Disposition |
|---|---|---|
| Reply-to-broker seam | 3 | **DEFER** — post-flip fast-follow. Entry-13 locked-prose slot preserved for when it ships. Not launch-blocking. |
| Telemetry (§3.4 fast-follow) | 3 | **DEFER** — consent-gated analytics, not launch-blocking. Sequences with the §4.1 retrospective. |
| `review@ownerpilot.ai` mailbox | 2 | **BUILD AT FF-3 broker-intake-digest activation.** Not now. When digest activation is authorized, provision as a Google Group modeled on `privacy@`. |
| Production `ADMIN_EMAILS` | 1 | **PROVISION NOW.** One env var; makes `/admin/*` reachable in prod so I can work the review queue immediately after the §1.6 flip. Broker-executed (Vercel). On my queue. |

---

## §4 · Process + security — RULED

### §4.1 §3.4 compliance-seam retrospective — **APPROVED — I draft**

I draft. Engineering supplies the factual timeline of the four stop-the-lines: (a) `rent_periods` read defect, (b) entry-13 reply-seam gap, (c) resume/pause seam gap, (d) NODE_ENV Preview gating. Raw material only — no editorial framing from engineering; that's my scope. Target: file during the F2 window, does not block the §1.6 flip.

### §4.2 Supabase service_role key rotation — **APPROVED — do-now**

I rotate the service_role key immediately (Supabase → Project Settings → API), update it in Vercel wherever referenced, confirm from a redeployed check. Given exposure in a pasted E2E command this session, do-now is the correct disposition. On my queue tonight or first thing tomorrow.

---

## §5 · Sequencing — RATIFIED with two adjustments

Engineering's proposed sequence is accepted, with two amendments:

1. **§4.2 key rotation runs first.** Before I do anything else on this queue, the exposed service_role key gets rotated. Security-hygiene items are not sequenced against build cadence.
2. **§1.3 rollback drill first-run within the first 7 days.** The recommendation was "during F2 window in parallel" — my amendment above (§1.3) narrows this: first drill by 2026-07-20, second drill within 48 hours before the §1.6 attestation. Engineering pace, but the window is explicit.

Rewritten sequence:

- **Immediately (tonight/tomorrow):** §4.2 key rotation. §3-row-4 prod `ADMIN_EMAILS` provisioning.
- **Now → 2026-07-20:** engineering builds §1.2 monitoring parity, executes §1.3 rollback drill (first run), files §1.5 runbook diff. Broker executes §2.2 Sentry toggles, drafts §4.1 retrospective. Engineering files §2.1 waves-3–4 closure evidence.
- **2026-07-20 → 2026-08-01 (F2 clean-expiry):** soak accrual. Engineering monitors, no new build required. Broker files §4.1 retrospective. Any Sev-2 remediation notes filed as they occur.
- **On 2026-08-01 clean:** broker promotes §2.3 CI guard to Required. Broker drafts §2.4 Gate-3 closure predraft. Engineering executes §1.3 rollback drill (second run).
- **After Gate-3 closure countersign:** engineering files the §1.6 Prod-Flip Attestation Packet. Broker countersigns. **Production `FF3_CAPTURE_ENABLED=true` becomes effective.**
- **Post-flip fast-follows (§3):** reply-to-broker, telemetry, review@ digest — sequenced individually with their own rulings.

**Estimated path to 100% Scope A: 5–8 weeks, F2 as the constraint.** Ratified.

---

## §6 · Amendments (record of what changed vs. approve-all defaults)

Four amendments, all mine:

1. **§1.1(4) anomaly-spike definition** — clarified to "3× baseline over any 24-hour window once baseline established."
2. **§1.3 rollback drill executed twice** — early + within 48h of §1.6 attestation. Not once.
3. **§1.5 runbook** — added three Sev classifications engineering hadn't proposed.
4. **§1.6 pre-authorization has a 45-day expiration** — soak evidence goes stale.

Everything else = approve-all defaults from the request.

---

## §7 · One question back to engineering — no other blockers

**Baseline-rate methodology for §1.1(4):** how do you propose establishing baseline for `ff3_resume_scope_mismatch` and `ff3_resume_already_consumed` rates during a 19-day soak where the total event volume may be low? Rolling 7-day median, first-week average, absolute-threshold fallback if volume < N? Not a blocker — you can propose in the §1.2 monitoring parity attestation. Flagging so it's not a surprise in the attestation review.

Everything else is ruled. Build what's buildable during F2. Nothing waits on me.

---

## §8 · Placement disposition (answer to your question)

Keep the omnibus request as a **standalone artifact** in workspace until this ruling is countersigned. **After my signature below, fold both documents into the docs PR trail (PR 221 or its successor)** as a pair: request + ruling, alongside the four freshly-shared FF-3 chain rulings. That gives `docs/compliance/` a clean instrument class — every filed doc is either a ruling, a countersign, or an attested packet.

---

## §9 · Signature

**☒ Approve all [RECOMMENDED] defaults, subject to §1.6 LA-only carve-out and the four §6 amendments.**

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-13
Authority: Cal. Bus. & Prof. Code § 10131(b)
