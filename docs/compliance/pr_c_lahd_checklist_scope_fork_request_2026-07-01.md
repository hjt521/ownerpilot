# FORK REQUEST MEMO (engineering → broker) — PR-C LAHD Filing Checklist + Cron

**Re:** PR-C scope, on the PR-B-merged base (`main` at `80aa356`).
**Parent rulings / precedent:** `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`; `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`; `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (produce-audit persistence); `pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md` (surface-minimum + insert-only ack precedent); `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` §8 (as-built parity).
**Posture:** Fork request, not a determination. Nothing implemented. The unusual thing about PR-C: much of the LAHD surface is **already built and advisory-only by prior ruling**, so PR-C's "checklist" is underdetermined — the memo asks the broker to *define what PR-C adds* on top of what exists, plus rule the forks. — Engineering, 2026-07-01.

---

## §1 — What already exists (reference; evidence)

The LAHD filing **prompt** is fully built and shipped on the chat path:
- **Copy:** `lahdFilingPromptHeader` / `lahdFilingPromptBody` / `lahdFilingChannelsList` / `lahdFilingPromptCopyVersion` — ratified by `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` §1, in the locked-prose manifest, in `lib/copy/lahd/lahdFilingPromptCopy.ts`.
- **Surface:** `components/la-produce-panel.tsx` renders header + body + channels + a persistent ack checkbox at produce time; the chat Review mounts it (§5.2 core).
- **Ack persistence:** the §5.2 produce-audit endpoint records `lahdFilingPromptAcknowledgedAt` + `lahdFilingPromptCopyVersion` on `produce_audit`.
- **The 2026-06-18 determination §3.4 explicitly bounds this prompt as advisory-only:** it does NOT compute a calendar deadline, does NOT track whether the owner filed, does NOT generate a cover sheet, does NOT block production.

Adjacent infrastructure already built:
- **RTC form pinning/refresh:** `lib/jurisdiction/rtcFormBaselines.ts` (`RTC_FORM_BASELINE_HASHES`, `RTC_FORM_LAST_MODIFIED`), `lib/jurisdiction/rtcRefresh/rtcRefreshJob.ts` (fetch + strict SHA-256 vs baseline), `rtcRefreshTypes.ts` (`pinnedHash`), `rtcPinAndVersion.ts` ("Q3c serve-time recheck: pinned hash MUST equal the served PDF's SHA-256"). `produce_audit` already records `rtcFormHashes`.
- **Packet cover sheet:** `lib/produce/buildPacketHtml.ts` `COVER_SHEET` / `coverSheetPage()` — but this is the **OwnerPilot packet cover**, NOT the **LAHD eviction-filing cover sheet** the mail-channel copy references (`lahdFilingChannelsList`: "with a printed LAHD cover sheet"). Distinct artifacts.
- **Jurisdiction matrix:** `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` is authoritative on per-jurisdiction supplemental-doc requirements; the §5.2 core stubbed `non_la` production.

## §2 — Chat-path reality

**Exists:** LAHD prompt + persistent ack at produce (LaProducePanel); `produce_audit` records the ack + RTC hashes; the riskpath row + the PR-B staleness banner surface.
**Does NOT exist:** filing-completion tracking (did the owner file within 3 business days?); a computed 3-business-day deadline date; the LAHD **eviction-filing cover sheet** artifact; supplemental-docs-matrix wiring into the chat produce path; any owner-side filing-evidence capture (receipt number / filed-PDF / filing date).

## §BLOCKER — the cover-sheet ruling is not in the workspace

`lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` (referenced in the PR-C briefing) is **not present** in `docs/compliance/` or anywhere in the repo. If PR-C's scope includes the eviction-filing cover sheet, I need that ruling's requirements (what the cover sheet contains, whether it's produced/pinned/filed) before building. Surfacing per §1.6 — I will not infer cover-sheet content.

## §S1.6 — SUB-FORK surfaced (produce-time vs post-service placement)

The 2026-06-18 determination §3.3 places the LAHD prompt **post-service** ("after the user has indicated the notice has been served, not at production time … Filing is keyed to the service date"). The chat path shows the LAHD ack at **produce** time (LaProducePanel, pre-serve), because the chat has **no serve surface** (the same gap PR-B navigated — the wizard's `serve-track.tsx` is localStorage-based and not reused). This is a compliance-behavior divergence between the ratified determination and the as-built chat placement. Surfacing, not reconciling: does PR-C move the LAHD checklist post-serve (which needs a chat serve surface, à la PR-B's Surface 2), or accept the produce-time placement as the chat-path reality?

## §3 — Scope-definition fork (the meta question)

Because the prompt is already built and advisory-only, "PR-C = LAHD checklist" must mean one or more NEW layers. Which is in PR-C is a broker call:
- **(A) Filing-completion tracking + evidence** — capture whether/when the owner filed (and evidence: receipt number, filed PDF upload, filing date). The 2026-06-18 determination §3.4 explicitly declined this for the prompt; PR-C would add it.
- **(B) The LAHD eviction-filing cover sheet artifact** — generate/provide the cover sheet the mail channel requires (blocked on the missing cover-sheet ruling).
- **(C) The 3-business-day deadline computation** — a calendar deadline date; blocked on the LA city business-day calendar (2026-06-18 §7 open item — not shipped; a separate citation pull).
- **(D) Cron pinning** — add `eviction_filing_cover_sheet` to the pinned-forms watch (broker's standing operator item).

## §4 — Forks (surface; do not reconcile)

1. **Checklist storage shape.** New `lahd_filing_checklist` child table on `riskpath_records` vs fold into `produce_audit` vs derive at read time. Parallels PR-B Fork 1 / the produce-audit ruling; the answer may differ because filing-completion is owner-mutable state over time (unlike the frozen produce-time snapshot).
2. **Cron scope.** The RTC refresh infra (`rtcRefreshJob` + baselines + `pinnedHash`) exists. Does PR-C **extend the pinned-forms set** to add `eviction_filing_cover_sheet` + wire cron behavior, add a **new** cron, or **read** the existing refresh output without adding cron behavior? Compliance consequence: whether the checklist is user-triggered only, cron-nudged, or both — and whether the checklist reads RTC hashes from the existing `produce_audit` trail (single source of truth) vs a fresh refresh read (two paths of truth — to avoid).
3. **Chat surface.** (a) a section on the riskpath row (extend PR-B Surface 2), (b) a produce-flow step between LaProducePanel and the PDF hand-off, (c) a standalone `/lahd-filing` route, or (d) other. Each implies different new locked-prose copy and interacts with §S1.6 (post-serve placement).
4. **Non-LA jurisdiction handling.** §5.2 stubbed `non_la`. Does PR-C's mechanism preclude non-LA, or is it generic so a later slice ratifies additional jurisdiction checklists from the supplemental-docs matrix? Decides whether locked-prose names use an `LA_`/`chatLahd*` prefix vs a jurisdiction-slot pattern.
5. **Owner-side filing evidence.** Checklist tick only vs uploaded filed-PDF / receipt-number / filing-date vs neither. Same class as PR-B §5 (ack trail vs evidence trail). If evidence includes an uploaded PDF, that's a storage-bucket + access-control surface (compliance-sensitive; the notice PDF already lives in `documents` with signed-URL access).

## §5 — Engineering recommendation (rule "adopt" / "adopt-with-modifications")

Given the missing cover-sheet ruling and the unshipped LA business-day calendar, I recommend **scoping PR-C to (A) filing-completion tracking + a light acknowledgment/status trail**, deferring (B) cover sheet and (C) deadline computation to later slices that unblock their dependencies:
- **Fork 1 → new `lahd_filing_records` child table** (owner-mutable filing status is not a frozen snapshot; keep it separate from `produce_audit`, consistent with keeping distinct compliance artifacts in distinct places).
- **Fork 2 → read-only against the existing RTC refresh output + `produce_audit` hashes** for this pass (no new cron behavior in PR-C); the broker's `eviction_filing_cover_sheet` pin lands with slice (B), so both arrive together.
- **Fork 3 → riskpath row section** (extend PR-B Surface 2; smallest surface, and it's where the owner returns post-serve — aligns with §S1.6's post-service intent without building a full serve surface).
- **Fork 4 → jurisdiction-slot-ready naming** (`chatLahdFiling*` with an LA-scoped guard now), so a later matrix slice adds jurisdictions without renaming locked prose.
- **Fork 5 → status trail now (filed / not-yet / filing-date), filed-PDF evidence upload deferred** to a slice that rules the storage/access posture. Flagging that this leaves "did they actually file" as owner-attested, not evidenced.

**Open honesty:** this recommendation defers the cover sheet, the deadline date, and hard filing evidence. If the broker judges any of those compliance-required for PR-C, PR-C is larger and (B)/(C) can't be deferred — and (B) is blocked until the cover-sheet ruling is in the workspace.

## §6 — What I need back (omnibus ruling)

Define PR-C's scope (§3 A/B/C/D), the §S1.6 placement, and Forks 1–5; place the cover-sheet ruling in the workspace if (B) is in scope; author any new locked-prose (I'll flag branches/slots on ruling, per the Lane 2E / PR-B copy pattern); and adopt §5 as recommended or with modifications. On receipt I build to the ruling and file the PR-C attestation.

— Engineering · fork request · 2026-07-01
