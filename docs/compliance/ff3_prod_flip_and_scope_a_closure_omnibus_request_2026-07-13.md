# Scope-A Closure — Omnibus Decision Request (Engineering → Broker) — 2026-07-13

**Status:** AWAITING BROKER RULING. One document consolidating every outstanding broker-owned decision from
`ownerpilot_go_live_readiness_audit_2026-07-13.md` (composite 63.6% → engineering-corrected 65.2%). The audit
found the drag is broker-process work, not build. This request surfaces all of it at once so it can be ruled in a
single pass rather than one turn at a time.

**Governance:** §4.13 — every Studio/Vercel/GitHub/branch-protection action remains broker-executed; engineering
builds + verifies + hands blocks. Each item carries **[RECOMMENDED]** where engineering has a view; sign §6 to
approve all defaults, or strike/amend any line. Nothing below authorizes a Production flip except §1.6 explicitly.

---

## §1 · FF-3 production-flip prerequisites (audit §2.3 — the 6.8% section, biggest lever)

Production `FF3_CAPTURE_ENABLED=true` is a separate future ruling. These six items are its gates. Ruling them now
lets engineering build the buildable parts during the F2 window so the flip is ready the moment soak clears.

**§1.1 — Preview soak window.** Define duration + "clean" criteria.
- ☐ **[RECOMMENDED]** Soak from Preview-live (2026-07-13) through **F2 expiry 2026-08-01** (~19 days, clears the
  14-day floor). "Clean" = no Sev-1/2 attributable to FF-3 in the C1 Sentry stream + all CI guards green + no
  `ff3_resume_scope_mismatch` / `ff3_resume_already_consumed` anomaly spikes. ☐ Other: ______

**§1.2 — Production monitoring parity** (synthetics, dashboards, alerts, mirroring parcel-health's A14 harness).
- ☐ **[RECOMMENDED]** Authorize engineering to build FF-3 synthetics (produce-gate chain + reconciliation +
  resume-endpoint scope-check) on the existing synthetic-harness pattern, plus Sentry alerts for FF-3 500s and
  resume-scope-mismatch rate. Deliver as a monitoring attestation before the flip. ☐ Defer / ☐ Other: ______

**§1.3 — Rollback drill** (proven rollback of the flag under load).
- ☐ **[RECOMMENDED]** Engineering scripts + executes a Preview rollback drill: flip `FF3_CAPTURE_ENABLED=false`,
  assert the produce-gate chain no-ops (skip disposition) and no owner-facing surface renders, flip back, re-verify.
  Documented as evidence in the flip packet. ☐ Other: ______

**§1.4 — Data-volume review** (is Preview data enough to trust production behavior?).
- ☐ **[RECOMMENDED]** Preview coverage is sufficient: the gates are deterministic (no LLM in the FF-3 walk), the
  E2E exercised the mismatch → escalate → resolve → resume → produce + the negative scope-mismatch + the (2) pause
  branch, and the golden-catalog synthetics cover the chain permutations. No prod-scale data replay required.
  ☐ Require a seeded N-session Preview volume test first: N = ______

**§1.5 — On-call runbook update** (Sev-1/2/3 escalation paths for FF-3 defects).
- ☐ **[RECOMMENDED]** Engineering adds an FF-3 section to the runbook: reconciliation-gate 500s (Sev-2),
  resume-scope-mismatch spike (Sev-3 signal of client/replay bug), `ff3_resume_already_consumed` spike (Sev-3),
  awaiting-review backlog with no broker action (Sev-3). ☐ Other: ______

**§1.6 — Production flip authorization** (the ruling + attestation itself).
- ☐ **[RECOMMENDED]** Pre-authorize the **Production** flip to become effective **upon** engineering filing a
  prod-flip attestation showing §1.1–§1.5 satisfied + soak clean, countersigned on that packet. Mirrors the Gate-4
  conditional-countersign shape. ☐ Keep as a fully separate ruling after soak.
- **Carve-out (unchanged):** Production flip is LA-only; it does **not** authorize multi-city (Scope B) or UD
  self-filing (Scope C).

---

## §2 · Gate-3 closure items (audit §2.5)

**§2.1 — Waves 3–4 closure attestation.** Engineering confirmed (ratification §2) waves 3–4 are code-complete +
green + live in Preview via the produce-gate chain. Outstanding is your closure sign-off.
- ☐ **[RECOMMENDED]** Engineering files a waves-3–4 closure evidence note (gate files + green suites + the Gate-4
  live-in-Preview proof); broker countersigns closure. ☐ Other: ______

**§2.2 — Broker Sentry toggles** (Data Scrubber + Scrub IP + screenshot evidence). Broker-executed paperwork.
- ☐ **[RECOMMENDED]** Broker toggles both in Sentry, captures screenshots, files to the Gate-3 evidence set.

**§2.3 — CI guard Required-promotion** (`route-body-parsing` → Required in branch protection). The guard is built
and running green; only the branch-protection setting is pending.
- ☐ **[RECOMMENDED]** Broker promotes `verify-route-body-parsing` to a Required check in the ruleset (engineering
  confirms it's already in the CI run and passing). ☐ Other: ______

**§2.4 — Gate-3 closure predraft.** Item 10 is NOT-RULED (no closure draft yet).
- ☐ **[RECOMMENDED]** Broker drafts the Gate-3 closure predraft after F2 clean-expiry (2026-08-01); engineering
  supplies the drift-fire clean record + no-Sev-1 evidence on request.

---

## §3 · Deferred FF-3-adjacent seams (audit §2.4) — build now / defer / drop

All four are ruled-not-built and off the critical path. Decide disposition for each.

| Seam | Weight | Engineering recommendation |
|---|---|---|
| Reply-to-broker seam | 3 | ☐ **[RECOMMENDED] Defer** — post-flip fast-follow; entry-13 preserved for when it ships |
| Telemetry (§3.4 fast-follow) | 3 | ☐ **[RECOMMENDED] Defer** — analytics, consent-gated; not launch-blocking |
| `review@ownerpilot.ai` mailbox | 2 | ☐ **[RECOMMENDED] Build at FF-3 broker-intake-digest activation** (small; Google group like privacy@) |
| Production `ADMIN_EMAILS` | 1 | ☐ **[RECOMMENDED] Provision now** — one env var; makes `/admin/*` reachable in prod so a real broker can work the review queue after the prod flip |

- ☐ Approve the recommended dispositions above, or amend per-row: ______

---

## §4 · Process + security housekeeping

**§4.1 — §3.4 compliance-seam retrospective ruling.** Broker-owned; you flagged wanting it after Gate 4.
- ☐ **[RECOMMENDED]** Broker drafts; engineering supplies the factual timeline of the four stop-the-lines
  (rent_periods read defect, entry-13 reply-seam gap, resume/pause seam gap, NODE_ENV Preview gating) as raw material.

**§4.2 — Supabase service-role key rotation** (security — exposed in a pasted E2E command this session).
- ☐ **[RECOMMENDED]** Broker rotates the service_role key now (Supabase → Project Settings → API), updates it in
  Vercel wherever referenced, and confirms. Low-risk, do-immediately.

---

## §5 · Sequencing (engineering proposal)

1. **Now → 2026-08-01 (F2 window, broker-paced):** rule §1.1–§1.6; engineering builds §1.2 monitoring + §1.3
   rollback drill + §1.5 runbook in parallel; broker does §2.2 Sentry toggles, §4.2 key rotation, drafts §4.1.
2. **At/after 2026-08-01 (F2 clean-expiry):** broker files §2.4 Gate-3 closure predraft; broker promotes §2.3 CI
   guard; engineering files §2.1 waves-3–4 closure.
3. **Post-soak-clean:** engineering files the §1.6 prod-flip attestation; broker countersigns → **Production FF-3 live.**
4. **Fast-follows (post-flip, §3):** reply-to-broker, telemetry, review@ digest.

Estimated path to 100% Scope A: **5–8 weeks**, F2 as the constraint (matches the audit).

---

## §6 · Signature

☐ **Approve all [RECOMMENDED] defaults** (§§1–4), subject to the §1.6 Production carve-out (LA-only; no Scope B/C).
Amendments (if any): ____________________________________________

— Broker Compliance Review
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 · 2026-07-13
Authority: Cal. Bus. & Prof. Code § 10131(b)
