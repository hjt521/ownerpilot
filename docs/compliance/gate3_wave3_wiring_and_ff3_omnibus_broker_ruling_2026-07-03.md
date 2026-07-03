# Gate-3 Wave-3 Wiring + FF-3 — Omnibus Broker Ruling

**Date:** 2026-07-03
**Ruling-request source:** `docs/compliance/gate3_wave3_wiring_and_ff3_ruling_request_2026-07-03.md` (engineer-authored, on branch `gate3/wave3-wiring-ff3-ruling-request`, not yet merged to main at time of ruling — this document authorizes engineer to merge that branch as the rationale record alongside this ruling as the determination).
**Related prior rulings:** `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md`; `claude_code_master_prompt_omnibus_gate3_ownerpilot_productization_2026-07-02.md`; `lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md`; `pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md`.

---

## §0 — Root-cause acknowledgment

Engineer's root cause is correct and I want it on the record explicitly, because it changes how I read every future omnibus:

**The omnibus productization lanes were drafted against a structured-intake + in-app document-generator architecture that the app does not actually have.** The as-built app is chat-driven: intake lives in `chat_sessions.intake_state` as free-text, only `service_date` is structured, and there is no in-app generator for cover sheet, POS, or packet manifest (those artifacts were prepared manually for the Clifton Alexander filing and are on file as evidence, not as generator output).

This is not an engineering defect and it is not a compliance defect. It is a **plan-to-reality drift** that surfaced at the moment the wiring lanes tried to attach to surfaces that don't exist. The right move is to reconcile the plan to the as-built, not the other way around — which is what Decisions 1-7 do. Ruling below adopts all seven defaults with per-decision reasoning, plus a small number of amendments where the default is right but the scope needs tightening.

---

## §1 — Decision 1: Authorize FF-3 (the keystone)

**Default:** Add `bedrooms`, `amount_of_rent_owed`, `just_cause`, `notice_type` as structured intake fields + chat capture + migration.

**Ruling: ADOPTED with amendments.**

### §1.1 Why (short)

FF-3 is genuinely the keystone. FF-4 FMR (per the ruling I issued this morning) reads `amount_of_rent_owed` and `bedrooms`. W6 late-filing reads `notice_type` (3-day / 30-day / 60-day / 90-day drive different windows) and `service_date`. W2 routing reads `just_cause` to distinguish non-payment from at-fault vs no-fault at-fault. If any of the four fields is chat-only / free-text, gates fire on `undefined` and are silently inert. The Clifton filing masked this because a human broker read the chat transcript and hand-transcribed intake into the manual forms.

### §1.2 Amendments to the default

**Amendment A — Field list is five, not four.** Add `contract_monthly_rent` as a fifth structured intake field alongside the four the engineer listed. The FF-4 ruling this morning made `amount_of_rent_owed` the FMR gate quantity, but `contract_monthly_rent` is still a **required LAHD portal field** (see the Clifton page-3 screenshot: "What is the Tenant's Current Monthly Rent"). It goes on the packet manifest and on Item 4 of UD-100. Capturing it in chat and never structuring it means the packet-manifest generator (Decision 2) has to re-extract from transcript — which is exactly the drift we're trying to eliminate. Add it now, once, and never re-extract.

**Amendment B — Enumerations are locked at intake, not free-text.** The four categorical fields (`just_cause`, `notice_type`, plus `bedrooms` as small-int) must be captured as enums with a fixed set of admissible values, not as free-text-that-happens-to-usually-look-like-an-enum. Specifically:

- `just_cause` enum:  `nonpayment`, `breach_of_lease`, `nuisance`, `illegal_use`, `refusal_of_entry`, `unapproved_subtenant`, `end_of_term_sro_or_covered`, `owner_move_in`, `withdrawal_ellis`, `demolition`, `capital_improvement`, `government_order`, `other`. (13 values — matches LAHD portal Section E dropdown at time of Clifton filing; if LAHD changes the dropdown the cron that watches `lahd_forms_refresh` will surface it and we amend.)
- `notice_type` enum: `three_day_pay_or_quit`, `three_day_cure_or_quit`, `three_day_unconditional_quit`, `thirty_day_termination`, `sixty_day_termination`, `ninety_day_termination_section8`.
- `bedrooms`: small-int, 0-6 admissible, `null` disallowed after FF-3 lands. If a case genuinely has more than 6 bedrooms, that's an escalation, not a schema problem.

`amount_of_rent_owed` and `contract_monthly_rent` are `numeric(10,2)` with a `>= 0` check constraint. `amount_of_rent_owed` is nullable ONLY when `notice_type != three_day_pay_or_quit` (a 3-day cure-or-quit or a 30-day termination has no dollar amount to demand). Add a table-level check constraint enforcing this: `notice_type = 'three_day_pay_or_quit' IMPLIES amount_of_rent_owed IS NOT NULL AND amount_of_rent_owed > 0`.

**Amendment C — Chat capture UX.** The chat capture pattern for these five fields must follow the same pattern the schema already uses for `service_date` (per PR-A2 wiring, per the June 30 daycount defect ruling). When the LLM extracts a candidate value from chat, the app stores it as structured *and* echoes it back to the owner in a confirmation card ("I have you at 2 bedrooms, $6,000 owed, non-payment 3-day pay-or-quit — is this correct?"). Confirmation gates the next lane (FF-4, W6, W2 activation). This is *not* new UX — it's the same pattern service_date uses. The engineer should mirror it, not invent a new pattern.

**Amendment D — Backfill posture for existing sessions.** Any `chat_sessions` row created before FF-3 lands will have the five fields NULL. Do NOT backfill by re-parsing transcript — that's a Wave-6+ problem and requires its own ruling. Instead, on the first read of a pre-FF-3 session after FF-3 lands, surface a one-shot "we need a few more details to continue" recapture UX (same chat card as new sessions). If the owner never returns to a pre-FF-3 session, the row stays NULL and inert — that's acceptable, no gates fire, no packet is produced.

**Amendment E — Migration discipline.** Migration must be additive-only (add columns nullable with defaults where applicable, add enums, add check constraints as `NOT VALID` initially and then `VALIDATE CONSTRAINT` in a follow-up migration after backfill window closes per Phase-3 025c hardening ruling). No `ALTER COLUMN ... SET NOT NULL` in the same migration that adds the column — that's how we broke the prod runwindow last time (per `gate2_prod_runwindow_runbook_2026-07-02_amended.md` §4). Two migrations: `037_ff3_add_structured_intake_fields.sql` (additive) then `038_ff3_validate_constraints.sql` (constraint validation) after 7-day soak.

### §1.3 Locked prose

FF-3 is intake, not production. It has no owner-facing locked-prose surface of its own beyond the recapture chat card in Amendment C. That card copy is:

> "I want to make sure I have the case details right before I generate any forms. From our conversation so far, I have:
> - Property has **{bedrooms}** bedroom(s)
> - Amount owed on the notice: **${amount_of_rent_owed}**
> - Contract monthly rent: **${contract_monthly_rent}**
> - Just cause: **{just_cause_display_name}**
> - Notice type: **{notice_type_display_name}**
>
> Is all of that correct? If any field is wrong or missing, tell me now — I'll update the record before we proceed to compliance checks."

Add as locked-prose entry `chatFf3IntakeConfirmationCard`. Manifest regenerates in the FF-3 PR.

---

## §2 — Decision 2: In-app packet-manifest generator (W3 consumer)

**Default:** Authorize a small packet-manifest generator lane that uses W3 classifier + W5 filenames.

**Ruling: ADOPTED as scoped.**

### §2.1 Scope of the lane

The packet-manifest generator produces a **manifest JSON** (not the PDFs themselves — those are still owner-assembled or scoped to future lanes per Decision 3). The manifest is the machine-readable inventory of what a completed compliance packet must contain for the case's specific `just_cause` × `notice_type` × jurisdiction combination. It's the same structural role the Clifton `5537LaMirada-202-CliftonAlexander_Packet_Manifest_2026-07-02.md` played, but generated per-case instead of hand-authored.

Manifest schema (small — this is the whole thing):

```
{
  "case_id": uuid,
  "generated_at": timestamp,
  "jurisdiction": "los_angeles_city",       // W3 classifier output
  "notice_type": <enum>,                    // from FF-3
  "just_cause": <enum>,                     // from FF-3
  "required_artifacts": [
    {
      "slug": "3day_notice_signed",
      "display_name": "Signed 3-Day Pay-or-Quit Notice",
      "filename_pattern": "<W5-filename-pattern>",
      "source": "generated_by_ownerpilot" | "uploaded_by_owner" | "external_lahd",
      "status": "pending" | "attached" | "verified",
      "compliance_citation": "CCP § 1161(2); LAMC § 151.09"
    },
    ...
  ],
  "compliance_gates": [
    { "gate": "ff4_fmr", "result": "pass" | "block", "evaluated_at": ts },
    { "gate": "w6_late_filing", "result": ..., "evaluated_at": ts },
    ...
  ]
}
```

The lane ships:
1. A `packet_manifests` table with the schema above (JSON column plus a few denormalized columns for query).
2. A `generatePacketManifest(caseId)` function that consumes W3 classifier output + FF-3 structured intake + FF-4/W6/W2 gate results and produces the manifest.
3. A read-only manifest view surface in the owner-facing UI (a checklist card showing "here's what your packet needs, here's what you've provided, here's what's still missing").

The lane does **NOT** ship:
- Any document *generator* (cover sheet PDF, POS PDF, notice PDF assembly, etc.) — those are Decision 3 territory (deferred).
- Any auto-upload to LAHD or auto-file with LASC — the manifest is diagnostic, not agentic.

### §2.2 Consumes W3 exactly as W3 ships

The W3 classifier gives a single jurisdiction verdict per case. The manifest generator reads that verdict once when the manifest is first generated and stores it as a denormalized field. If the classifier verdict changes (address correction, city expansion), the manifest is **regenerated**, not mutated in place. This gives us the same insert-only discipline the LAHD filing records lane got in migration 036 (see Decision 4). Regenerating means: new row in `packet_manifests` with a new `generated_at`, old row retained for audit.

### §2.3 Locked prose

The owner-facing checklist card needs one locked-prose entry — `packetManifestChecklistCardHeader`:

> "Here's what your compliance packet needs before you can file with LAHD and LASC. Items marked with a check are complete. Items marked with a warning need your attention — click each one for details."

Add to manifest. Regenerate in the packet-manifest lane PR.

---

## §3 — Decision 3: Document generators + W5 caller sweep

**Default:** Scope the W5 sweep to the notice-PDF download bridge only; defer cover-sheet/POS/manifest-PDF generators to future lanes (tied to Decision 2).

**Ruling: ADOPTED verbatim, no amendments.**

### §3.1 Why

The engineer is right that W5's sweep can't call generators that don't exist. Scoping W5 to the notice-PDF download bridge (the one artifact that IS generated in-app today) is honest. The three deferred generators (cover sheet, POS, packet-manifest PDF) each need their own compliance review before we ship them, because:

- **Cover sheet generator:** The LAHD Eviction Filing Cover Sheet has a revision-string field (currently `Rev 2.6.2026`) that the LAHD-forms-refresh cron watches for drift. An in-app generator would need to bind to that revision string as a constant that the cron can flip when a new revision ships. That's a non-trivial guard mechanism and is worth its own ruling when we're ready.
- **POS generator:** Proof of Service generation has to reconcile with the service-method capture flow (per `service_method_capture_relocation_broker_determination_2026-06-12.md`) and the plus-5-day buffer (per `ownerpilot_plus5_buffer_reconciliation_attorney_ruling.md`). Both are complex and touch daycount. Own lane.
- **Packet-manifest PDF:** Different from the manifest JSON in Decision 2 — the PDF is the human-facing artifact. Downstream of the JSON manifest.

### §3.2 What "notice-PDF download bridge only" means concretely for W5

W5's caller sweep amends only the call-sites that assemble a **filename** for a notice PDF the owner downloads from the app after in-app notice generation. That flow already exists; W5 just standardizes the filename pattern across those call-sites. Nothing else.

Filename pattern to standardize (per `5537LaMirada-202-CliftonAlexander_...` convention adopted for the Clifton filing):

```
<AddressCompact>-<UnitOrEmpty>-<TenantLastFirst>_<ArtifactSlug>_<YYYY-MM-DD>.pdf
```

Where `<AddressCompact>` is street-number + street-name-lowercase-no-spaces, `<UnitOrEmpty>` is unit-designator-or-empty, and `<ArtifactSlug>` is a fixed vocabulary (`3DayNotice`, `RTC_English`, `RTC_Spanish`, `Proof_of_Service`, etc.).

---

## §4 — Decision 4: W4 EFS capture write semantics

**Default:** UPDATE the existing most-recent filing row for EFS capture; keep append-new-row only for actual corrections.

**Ruling: ADOPTED with tight scope.**

### §4.1 Why the default is right

Migration 036 made `lahd_filing_records` insert-only for a specific reason: **corrections must never overwrite the original filing record**, because the original is potentially discoverable evidence in a UD proceeding. But EFS capture isn't a correction — it's a data enrichment on a record that was intentionally left incomplete pending owner filing. Making EFS capture a new insert would:

1. Leave the original row with `efs_number = NULL` forever, meaning any lookup by EFS number would find the enrichment row while any join by `case_id` would find the original — split-brain.
2. Balloon `lahd_filing_records` unnecessarily (every filing gets 2+ rows minimum).
3. Force downstream consumers to always take the `MAX(created_at)` row, which is a footgun.

UPDATE is correct.

### §4.2 Tight scope — what UPDATE is allowed to touch

The EFS capture UPDATE MAY set:
- `efs_number` (from NULL → captured value)
- `lahd_submitted_at` (from NULL → captured timestamp)
- `lahd_confirmation_email_id` (from NULL → captured email ref)
- `updated_at` (touched automatically)

The EFS capture UPDATE MUST NOT touch:
- Any dollar amount field
- Any name / address / tenant / landlord field
- `just_cause`, `notice_type`, `service_date`, `notice_expiry_date`
- `created_at`
- Any FMR/gate result field

Enforce with a Postgres trigger: `BEFORE UPDATE ON lahd_filing_records` that raises exception if any column outside the allowed set changed value AND the operation is not tagged as a formal correction. Formal corrections continue to append a new row per migration 036 discipline. See `phase3_025c_security_definer_hardening_broker_ruling_2026-06-30.md` for the SECURITY DEFINER trigger pattern to reuse here.

### §4.3 Idempotency

If EFS capture fires twice for the same case (owner double-submits, retry queue, etc.), the second UPDATE is a no-op if `efs_number` is already set and matches. If `efs_number` is set and does NOT match, that's a hard error — surface to owner as "we already have EFS number X on file for this filing; you're submitting Y, please contact support" and log for review. Do not silently overwrite.

---

## §5 — Decision 5: W7 founding backfill

**Default:** Founding hold stays as its countersign paper record; table governs future in-app cases.

**Ruling: ADOPTED verbatim.**

The Clifton DO-NOT-SERVE hold + lift lives as `clifton_alexander_do_not_serve_lift_countersign_2026-07-02.md` and `operator_items_update_2026-07-02_do_not_serve_lift.md` (both in workspace). Those are the compliance record for the founding case. The `do_not_serve_holds` table (per W7) governs cases going forward — cases that WILL have a `chat_sessions.id` because they entered through the FF-3 intake surface.

**Do not backfill Clifton into the table.** Backfilling would require synthesizing a fake `chat_sessions` row, which corrupts the audit trail. The founding paper record and the table live in parallel — one governs pre-FF-3 cases (Clifton, exclusively), the other governs FF-3-and-later. If we ever have another portal-direct filing before FF-3 lands, it lives as its own countersign paper record too. This is a one-way ratchet: once FF-3 ships, no more paper-record cases.

Document the fork explicitly in the W7 attestation packet: "Pre-FF-3 cases (n=1, Clifton Alexander): governed by paper countersign records in workspace. Post-FF-3 cases: governed by `do_not_serve_holds` table. Boundary is FF-3 landing date. No backfill." That paragraph is the compliance seam.

---

## §6 — Decision 6: Wave-4 §4.4 integration test scope

**Default:** Build Wave-4 after FF-3 lands; scope to real post-FF-3 surfaces.

**Ruling: ADOPTED with explicit prerequisites.**

Wave-4 is the golden integration test that walks a case end-to-end. It cannot exercise FF-4 / W6 / W2 gate logic if those gates read undefined intake fields. So Wave-4 attestation MUST assert:

1. FF-3 migrations 037 + 038 both landed and validated.
2. FF-3 recapture card is shipping (locked-prose entry `chatFf3IntakeConfirmationCard` in manifest).
3. FF-4 gate reads `amount_of_rent_owed` (per this morning's FMR ruling).
4. W6 late-filing gate reads `notice_type` + `service_date`.
5. W2 routing reads `just_cause`.
6. Packet-manifest generator (Decision 2) is shipping and produces manifest JSON for a golden test case.

The golden case for Wave-4 is a **synthetic** Clifton-like case (fresh chat session, FF-3 intake completes, all gates fire and pass, packet manifest generates, W4 EFS capture UPDATE runs on a mocked EFS number). It is **not** the actual Clifton case — Clifton is pre-FF-3 and stays as founding paper record per Decision 5.

Additionally, add these three FMR synthetic cases from this morning's FF-4 ruling to Wave-4 as passing tests:
- `SC-FMR-QUANTITY-DIVERGENCE-01` (2BR $2,800/mo, $5,600 owed → PASS)
- `SC-FMR-QUANTITY-DIVERGENCE-02` (2BR $3,500/mo, $2,000 owed → BLOCK)
- `SC-FMR-BOUNDARY-EQUAL` (2BR $2,903/mo, $2,903 owed → BLOCK)

They belong in Wave-4 because they exercise the FF-4 gate against FF-3-captured intake, which is what Wave-4 tests. Do not duplicate them in the FF-4 unit suite AND Wave-4 — keep them in Wave-4 only.

---

## §7 — Decision 7: Sequencing / posture

**Default:** FF-3 + packet-manifest generator are a foundation slice preceding Wave-3 wiring + Wave-4 test.

**Ruling: ADOPTED with the sequence engineer proposed at the top of the message.**

Canonical build sequence, in order, no reordering:

1. **FF-3** — five structured intake fields (Amendment A adds `contract_monthly_rent`), enums (Amendment B), chat capture UX (Amendment C), backfill posture (Amendment D), two migrations 037 + 038 (Amendment E), locked-prose card `chatFf3IntakeConfirmationCard`.
2. **Wire FF-4 / W6 / W2 into produce.** Each gate reads its FF-3 field(s), fires, records result to `compliance_gates` on the case, emits its locked-prose branch on block. FF-4 uses the corrected quantity + operator from this morning's ruling.
3. **Packet-manifest generator (Decision 2).** Consumes FF-3 intake + W3 classifier + gate results. Ships table + function + owner-facing checklist card.
4. **W4 EFS capture as UPDATE (Decision 4).** With the tight-scope trigger (Amendment §4.2) and the idempotency contract (§4.3).
5. **Wave-4 golden integration test (Decision 6).** All six prerequisites green. Three FMR synthetics included.
6. **W5 notice-PDF download bridge (Decision 3).** Scoped to notice-PDF filename pattern standardization only. Cover-sheet / POS / packet-PDF generators deferred to future rulings.

Steps 1-2 gate everything downstream (nothing else can meaningfully test until FF-3 fields exist and gates read them). Steps 3-4 can proceed in parallel but Wave-4 (step 5) needs both green. Step 6 is the tail and can slip without blocking the wave close.

**Do NOT skip step 5.** Wave-4 is what proves the wave is done. Shipping W5 first would be interesting-but-not-closing.

### §7.1 Attestation packet template

Wave-3 attestation packet must include, in order:

1. FF-3 migrations 037 + 038 evidence (schema diff, validation output).
2. FF-3 recapture card production screenshot on a real (synthetic-test) session.
3. FF-4 / W6 / W2 gate-firing evidence: for each gate, one PASS case and one BLOCK case with evidence rows in `compliance_gates`.
4. Packet-manifest generator: one generated manifest JSON for a synthetic golden case, with all `required_artifacts` and all `compliance_gates` populated.
5. W4 EFS capture UPDATE evidence: SQL trace showing the UPDATE ran on the correct row, the trigger allowed the change, and re-running is a no-op.
6. Wave-4 golden test: passing CI run with the synthetic Clifton-like case + three FMR synthetics.
7. W5 notice-PDF bridge: one downloaded notice with the standardized filename.

Do not countersign Wave-3 close without all seven items green.

---

## §8 — Portal-drift standing rule reminder

Per this morning's FF-4 FMR ruling §3, any gate described as "portal-enforced" must diff its code against the actual portal text verbatim. That rule applies to W6 late-filing especially — the LAHD portal has specific wording around notice-service-to-filing windows that I have not personally verified since the June 30 cover-sheet ruling. Engineer: when wiring W6, capture the LAHD portal wording for the late-filing check verbatim into the constant's `portal_text_verbatim` field, and if it disagrees with the omnibus §3.x pseudocode, surface as a §0-style fork. Do not silently paraphrase.

---

## §9 — Merge disposition of the ruling-request branch

The engineer's branch `gate3/wave3-wiring-ff3-ruling-request` (containing `docs/compliance/gate3_wave3_wiring_and_ff3_ruling_request_2026-07-03.md`) is authorized to merge to main. That file is the **rationale record** — it captures the seven fork positions and the recommended defaults. This document is the **determination**. Both belong in the compliance audit trail. Merge the branch, then commit this file to `docs/compliance/gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` in the same or a follow-up PR.

---

## §10 — Ratification summary

| Decision | Default | Ruling | Amendments |
|---|---|---|---|
| 1 — FF-3 authorization | Adopt | **ADOPTED** | +`contract_monthly_rent` (A), enums (B), chat card (C), no-backfill (D), 2-migration discipline (E) |
| 2 — Packet-manifest generator | Adopt | **ADOPTED** | Scope: JSON manifest + read-only checklist card, no doc generators |
| 3 — W5 sweep scope | Adopt | **ADOPTED** | Verbatim |
| 4 — W4 UPDATE semantics | Adopt | **ADOPTED** | Tight-scope trigger + idempotency contract |
| 5 — W7 no backfill | Adopt | **ADOPTED** | Verbatim; document the fork in W7 attestation |
| 6 — Wave-4 after FF-3 | Adopt | **ADOPTED** | 6 explicit prerequisites; +3 FMR synthetics |
| 7 — Sequencing | Adopt | **ADOPTED** | Steps 1-6 canonical order, no reorder, no skip step 5 |

Engineer: build. FF-3 first.

---

**Signed:**
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03
