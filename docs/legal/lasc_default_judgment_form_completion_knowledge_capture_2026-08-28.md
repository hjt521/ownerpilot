# LASC Default-Judgment Form Completion — Observational Knowledge Capture

**Status:** OBSERVATION — NONCANONICAL. Not a legal opinion, not adopted product control, not filing authority, and not a customer precedent.

**Date captured:** 2026-08-28

## Purpose

Capture reusable document-generation lessons observed while preparing a private Los Angeles Superior Court unlawful-detainer default-judgment packet, without storing private matter PII or converting one case into a legal rule.

The governing boundary is:

`live-case observation != legal canon != product control != filing readiness != execution authority`

## Artifact separation

OwnerPilot should keep these identities distinct:

1. `OfficialBlankSourceIdentity` — exact blank court form/revision.
2. `FieldMapIdentity` — versioned map from canonical facts/selections to exact form fields and printable coordinates.
3. `MatterFactSnapshotIdentity` — exact case facts and provenance used for one generation.
4. `GeneratedDocumentIdentity` — rendered output bound to the source artifact, field map, and fact snapshot.
5. `FiledConformedIdentity` — court-filed/conformed artifact returned by the court.
6. `CourtIssuedIdentity` — artifact created/issued by the court.

A later correction to a generated form must not silently rewrite historical filed/conformed or court-issued evidence.

## Reusable rendering/field-map rules

- Preserve the official court form text as source content; case-specific values are an overlay.
- Founder-review drafts may use blue case-specific typed values and blue case-specific checkmarks while official preprinted form text remains black.
- Field maps must include print-safe coordinates/bounds. A semantically correct value that renders below a field cutoff is a document defect.
- Mutually exclusive checkbox groups must be represented explicitly. When a route changes (for example clerk judgment -> court judgment), obsolete selections must be cleared rather than layered over the prior state.
- Derived totals should be calculated deterministically from supported component amounts and fail closed on inconsistency.
- Sworn facts must remain pending until a human with knowledge confirms the current fact immediately before signature.
- Never copy a case number, party identity, military-status basis, rental-assistance fact, service fact, hearing date, court date, or dollar amount from a prior matter.

## Observed field-map patterns

These are **examples of field-map behavior**, not universal legal instructions.

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

## Product controls suggested by the observation

1. Version field maps against exact official-form identities/revisions.
2. Include printable coordinate bounds in the field-map contract.
3. Bind each generated value/checkmark to canonical fact provenance and verification state.
4. Encode checkbox exclusivity and path transitions explicitly.
5. Reconcile arithmetic fields deterministically before rendering.
6. Require a human-confirmation gate for sworn declarations.
7. Preserve live-case corrections as an observation stream; route any proposed legal/product rule through Product / Legal / Architecture governance before adoption.

## Privacy boundary

No private live-case names, addresses, phone numbers, case numbers, or other customer/matter PII belong in this public knowledge capture. The private matter record remains in the restricted case workspace.

## Relationship to official-form registry

The existing `docs/legal/official-forms/` registry stores pristine blank source artifacts only. This observation does **not** authorize placing completed/live-case PDFs into that registry. It instead informs the future `FieldMapIdentity` and generated-document layers described by the registry README.
