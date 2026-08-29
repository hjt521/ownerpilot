# LASC Unlawful-Detainer Lifecycle & Default-Judgment Form Completion — Observational Knowledge Capture

**Status:** OBSERVATION — NONCANONICAL. Not a legal opinion, not adopted product control, not filing authority, and not a customer precedent.

**Date captured:** 2026-08-28

## Purpose

Capture reusable document-generation and lifecycle lessons observed in a private Los Angeles Superior Court unlawful-detainer pressure test, without storing private matter PII or converting one case into a legal rule. The learning path begins with the tenancy source record and notice/service chain and continues through complaint filing, post-filing service, default/judgment preparation, writ issuance, enforcement, and eventual resolution.

The governing boundary is:

`live-case observation != legal canon != product control != filing readiness != execution authority`

## Artifact separation

OwnerPilot should keep these identities distinct:

1. `OfficialBlankSourceIdentity` — exact blank court form/revision.
2. `EvidenceArtifactIdentity` — source evidence such as lease, notice, service evidence, local-agency confirmation, ledger, photograph, or mailing proof.
3. `FieldMapIdentity` — versioned map from canonical facts/selections to exact form fields and printable coordinates.
4. `MatterFactSnapshotIdentity` — exact case facts and provenance used for one generation.
5. `GeneratedDocumentIdentity` — rendered output bound to the source artifact, field map, and fact snapshot.
6. `PacketBindingIdentity` — exact composition/order of one filing or service packet.
7. `FiledConformedIdentity` — court-filed/conformed artifact returned by the court.
8. `CourtIssuedIdentity` — artifact created/issued by the court.

A later correction to a generated form must not silently rewrite historical source evidence, filed/conformed artifacts, or court-issued evidence.

## End-to-end unlawful-detainer learning path

The reusable workflow learned from the private pressure test is broader than default judgment:

1. **Lease / tenancy evidence intake.** Parse the executed lease and addenda for party/capacity identity, premises, rent, term, payment schedule, and other facts used downstream. Preserve contradictions between source documents instead of silently normalizing them.
2. **Notice generation.** Build the applicable notice only from current matter facts and current jurisdiction controls. Preserve the exact notice artifact used in the matter.
3. **Notice service evidence.** Record the actual notice-service method and preserve its proof/evidence. Posting photographs, mailing certificates/envelopes, server declarations, or other service evidence are separate artifacts. Notice-service proof is not the same artifact or event as later service of the Summons/Complaint.
4. **Local pre-filing compliance.** Preserve required local-agency filings/confirmations as independent evidence with their own dates and reference identities. Local compliance must not be inferred merely because a notice exists.
5. **Complaint filing packet.** Generate the applicable statewide and local filing forms from one canonical fact snapshot and bind supporting exhibits to exact evidence identities. In the observed LASC workflow the form/exhibit classes included UD-100, CM-010, LASC CIV 109, SUM-130, LASC CIV 312, the lease/addenda, the notice, notice-service evidence, and a local housing-agency confirmation. CP10.5 remains a separate applicability/service decision and must never be represented as served unless that fact is proven.
6. **Court filing and return intake.** Capture the actual filing event, assigned case identity, fee transaction, conformed forms, returned copies, and court-issued notices/orders as a new stage. Court-return artifacts can create downstream workflow facts but do not automatically create legal conclusions.
7. **Post-filing service packet.** Compose the service packet from the filed/conformed Summons/Complaint plus the local/court-issued materials actually required for that matter. Preserve the exact documents actually served, service method, server, address, and time/date.
8. **POS-010 completion and filing.** Generate proof of service from the completed service event, not from planned service. Preserve pre-service draft, signed proof, and filed/conformed proof as distinct states.
9. **Response/default gate.** Start default preparation only after the applicable response period and a fresh docket check. Reconfirm current sworn facts such as military-status basis, rental-assistance state, payments/credits, occupancy, and other matter facts rather than carrying them forward as reusable defaults.
10. **Default/judgment/writ preparation.** The downstream form classes observed include CIV-100, UD-110, UD-116, UD-120, MC-010/MC-011, and EJ-130. A route transition such as clerk/possession-only to court/money judgment must clear incompatible selections across all affected forms and deterministically reconcile amounts.
11. **Court-issued judgment/writ and enforcement.** A generated judgment or writ is not an issued judgment or writ. Enforcement workflows must bind to the actual court-signed/issued artifact before sheriff or other execution steps.
12. **Resolution capture.** Record possession, money recovery, settlement/dismissal if applicable, enforcement outcome, and final case status as later evidence. Do not infer closure from an earlier milestone.

The lifecycle model is:

`lease/source evidence -> notice -> notice service evidence -> local compliance -> complaint packet -> court filing/return -> post-filing service -> filed proof of service -> response/default gate -> judgment packet -> court-issued judgment/writ -> enforcement -> resolution`

## Evidence-to-form lineage learned from the complaint stage

The filing pressure test demonstrated that the filing forms are downstream views of earlier evidence. OwnerPilot should preserve at least these provenance links:

- `lease/addenda -> tenancy term, rent, party/capacity and premises facts`;
- `notice -> demand amount, notice type/date and termination-path facts`;
- `notice-service evidence -> UD-100 notice-service allegations`;
- `local-agency confirmation -> local pre-filing compliance evidence`;
- `canonical fact snapshot -> UD-100 + CM-010 + LASC CIV 109 + SUM-130 + LASC CIV 312`;
- `evidence registry -> exact complaint exhibits and exhibit order`;
- `court-filed/conformed return -> case number, filing date and later court-linked facts`;
- `actual post-filing service -> POS-010`;
- `docket/current declarations -> CIV-100 + UD-110 + UD-116 + UD-120`;
- `actual cost evidence -> MC-010/MC-011 and any supported cost fields`;
- `actual court-entered judgment -> later EJ-130 issuance/enforcement state`.

No later form should silently become the source of truth for an earlier historical fact when the source evidence still exists.

## Reusable rendering/field-map rules

- Preserve the official court form text as source content; case-specific values are an overlay.
- Founder-review drafts may use blue case-specific typed values and blue case-specific checkmarks while official preprinted form text remains black.
- Field maps must include print-safe coordinates/bounds. A semantically correct value that renders below a field cutoff is a document defect.
- Mutually exclusive checkbox groups must be represented explicitly. When a route changes (for example clerk judgment -> court judgment), obsolete selections must be cleared rather than layered over the prior state.
- Derived totals should be calculated deterministically from supported component amounts and fail closed on inconsistency.
- Sworn facts must remain pending until a human with knowledge confirms the current fact immediately before signature.
- Never copy a case number, party identity, military-status basis, rental-assistance fact, service fact, hearing date, court date, or dollar amount from a prior matter.
- Packet generation must bind each exhibit to verified evidence identity; selection by upload recency is not sufficient.

## Observed field-map patterns

These are **examples of field-map behavior**, not universal legal instructions.

### Complaint-stage packet

The observed LASC filing-pressure test required the generator to reason across the complete upstream chain, not only the UD-100:

- lease/addenda as the tenancy source evidence;
- 3-Day Notice as the demand/termination-path artifact;
- notice-service evidence, including posting/mailing evidence where used;
- local-agency filing confirmation where applicable;
- UD-100 as complaint;
- CM-010 as Civil Case Cover Sheet;
- LASC CIV 109 as local cover-sheet addendum/location form;
- SUM-130 as Summons—Eviction;
- LASC CIV 312 as defendant cellular-information form;
- exact exhibit ordering/binding;
- post-filing court return artifacts;
- later POS-010 based only on actual post-filing service.

The field map must trace facts backward to their evidence source. For example, tenancy term belongs to the lease source; notice amount and date belong to the notice; notice service method belongs to service evidence; complaint filing date belongs to the conformed filing/court record; later Summons/Complaint service belongs to POS-010 evidence.

### CIV-100 — Request for Entry of Default

Observed court-judgment configuration required the document generator to support:

- `Entry of Default` plus `Court Judgment` as an active route;
- clearing `Clerk's Judgment` when the route changes;
- populating item 1(d) with the target defendant for court judgment;
- clearing clerk-judgment subitems that no longer apply;
- separately populating principal/past-due amounts, supported costs, and the computed total;
- carrying supported cost totals into the memorandum-of-costs section when appropriate to the matter;
- recording military-status declarations only from the actual factual basis used by the declarant.

### UD-110 — Judgment—Unlawful Detainer

Observed field-map requirements included:

- supporting `By Court` versus `By Clerk` as mutually exclusive selections;
- supporting a court-money-judgment route distinct from `Possession Only`;
- selecting the applicable Court Judgment subroute;
- page-2 court/clerk selection must reconcile with page-1 route selection;
- past-due rent, costs, and total judgment are separate fields with deterministic reconciliation;
- party-name overlays must remain within visible printable bounds.

### UD-116 — Declaration for Default Judgment by Court

Observed field-map requirements included:

- exact plaintiff/capacity identity rather than a shortened or normalized name;
- mutually exclusive item 1(b) choices;
- explicit matter-dependent item 4 selection;
- the ability to clear a previously selected item 6(c) when not applicable;
- no prefilled factual declaration should survive without matter-specific evidence.

### EJ-130 — Writ of Execution

Observed field-map requirements included:

- route selection for the requested writ type;
- exact judgment-creditor/plaintiff identity;
- explicit support for intentionally blank court/date fields;
- complaint-filing date and county fields as separately sourced matter facts;
- court/clerk issue dates, signatures, seals, and comparable court-completion fields must remain controlled by actual court process/instructions.

### UD-120 — Verification by Landlord Regarding Rental Assistance

Do not treat substantive rental-assistance answers as reusable defaults. Require current matter-specific confirmation immediately before execution.

### MC-010 / MC-011 — Memorandum of Costs

Treat cost forms as evidence-backed schedules. Amounts must derive from the current matter's documented costs rather than a prior packet.

## Observed default-judgment counter / mail-return workflow

This section records one stage-specific LASC operational observation and must not be generalized into a universal court rule.

- At one Stanley Mosk default-judgment counter submission, staff requested only **CIV-100** and **UD-110** at that stage, despite a broader set of forms having been prepared upstream.
- The observed submission quantity was **two copies of each form**.
- The filer was required to provide a **large self-addressed stamped envelope** for the court's later response/return.
- **No receipt or conformed submission receipt** was provided at the counter.
- Staff gave an estimated turnaround of approximately **5–10 court days** for a mailed response.
- Staff instructed that, after the mailed court response is received, the filer should return to the same counter/room with **EJ-130** for court processing/stamping, and only then proceed to the courthouse Sheriff's office for the reported lock-out workflow.

Product implications from this observation:

1. Add a state such as `DEFAULT_JUDGMENT_SUBMITTED_AWAITING_MAIL_RETURN` that can exist without a receipt.
2. Preserve `PreparedDefaultPacketIdentity` separately from `SubmittedDefaultPacketIdentity`; stage-specific counter intake may accept only a subset of a broader prepared packet.
3. Record exact submission date/location, accepted documents, copy counts, return-envelope provision, estimated turnaround, and whether a receipt/conformed copy was returned.
4. Treat the returned envelope and enclosed court papers as a new `CourtReturnIdentity` and the authoritative trigger for the next state transition.
5. Do not advance to issued-writ/enforcement state based on elapsed time, clerk estimate, or a prepared/unstamped EJ-130.
6. A later court-stamped/processed EJ-130 must be preserved as its own court artifact before any sheriff workflow is represented as available.

## Filed-party / printed-signer identity rule

This rule captures reusable document-identity behavior, not a universal substantive legal rule.

- The exact filed party/capacity identity should be the authoritative source for downstream party-name fields and, when the declarant is that same party, the applicable `TYPE OR PRINT NAME` / declarant-name fields.
- Do not silently substitute a nickname, informal name, shortened caption, or convenience label for the filed identity.
- Signature execution is a separate state from printed-name completion. A generator may prefill a verified printed name but must not fabricate or imply a handwritten/electronic signature before actual execution.
- If a form specifically requires a natural-person signer, officer, authorized representative, attorney, agent, or another role distinct from the filed caption, capture that signer identity and capacity separately and populate according to the form instructions rather than forcing the caption string into the field.
- Suggested invariant: `filed party/capacity identity -> applicable downstream party-name + printed-signer-name fields`, with an explicit role/capacity override only when supported by current matter evidence and the exact form instructions.

## Product controls suggested by the observation

1. Version field maps against exact official-form identities/revisions.
2. Include printable coordinate bounds in the field-map contract.
3. Bind each generated value/checkmark to canonical fact provenance and verification state.
4. Encode checkbox exclusivity and path transitions explicitly.
5. Reconcile arithmetic fields deterministically before rendering.
6. Require a human-confirmation gate for sworn declarations.
7. Add an evidence/attachment registry so every lease, notice, service proof, agency confirmation, and exhibit slot has stable identity and provenance.
8. Add packet-binding identity so the exact filing set, service set, and later default set cannot be conflated.
9. Treat court-return intake as a first-class lifecycle transition; court-issued documents may alter downstream document/service requirements.
10. Preserve live-case corrections as an observation stream; route any proposed legal/product rule through Product / Legal / Architecture governance before adoption.

## Privacy boundary

No private live-case names, addresses, phone numbers, case numbers, or other customer/matter PII belong in this public knowledge capture. The private matter record remains in the restricted case workspace.

## Relationship to official-form registry

The existing `docs/legal/official-forms/` registry stores pristine blank source artifacts only. This observation does **not** authorize placing completed/live-case PDFs, leases, notices, service evidence, or other matter records into that registry. It instead informs future evidence identity, field-map, generated-document, packet-binding, court-return, and lifecycle layers described by the registry architecture.
