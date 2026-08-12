# California UD Post-Filing Court-Issued Artifact Observations

**Date:** 2026-08-12  
**Status:** OBSERVATION / PRODUCT INPUT — NONCANONICAL  
**Scope:** Los Angeles Superior Court limited-jurisdiction residential unlawful-detainer workflow.  
**PII posture:** This repository memo intentionally omits live-case names, addresses, case numbers, assigned judicial officer, transaction identifiers, and private filed artifacts.

This memo preserves product-learning evidence from an 11-page packet physically returned by Los Angeles Superior Court after acceptance of a real in-person unlawful-detainer filing on 2026-08-12. The source artifact is retained only in the private live-case archive.

This memo is not a legal opinion, adopted jurisdiction control, or authorization to implement filing, service, default, trial, or Production execution.

## Governing evidence distinction

The underlying packet is direct **court-issued case evidence**, not merely a user recollection. It is therefore stronger evidence of the post-filing workflow than counter recollection alone. It remains case-, jurisdiction-, court-, and time-scoped.

`court-issued artifact != reusable blank source != universal legal rule != execution authority`

Any runtime rule derived from these observations must still pass current-source, Legal/Product, and architecture governance.

## 1. Court-returned artifact classes observed

The court-returned packet contained these artifact types:

1. **Notice of Case Assignment — Limited Civil Case** (`LACIV ___ 001`, Rev. 03/17).
2. **Property Owner/Landlord Notice of Hearing re Failure to File Proof of Service** (`LACIV 240`, Rev. 10/17).
3. **Notice: Unlawful Detainer Settlement Services at Stanley Mosk Courthouse** (`SCLAC CIV 313 NEW 03/26`, mandatory use).
4. **Standing Order 2026-SJ-004-00** — Stanley Mosk limited-jurisdiction UD settlement pilot.
5. **Sixth Amended Standing Order 2026-SJ-002-00**, effective March 3, 2026 — limited-jurisdiction UD cases assigned to all LASC courthouses.
6. **Court filing-fee receipt** documenting the actual counter transaction.

These are materially different from the filing packet OwnerPilot prepares before filing. Some arise only after the court accepts the case.

## 2. Case assignment is a first-class post-filing event

The Notice of Case Assignment establishes new case-specific state after acceptance, including a case number and assigned judicial officer/department.

The notice also contains case-management instructions. Among them, the court-supplied notice states that complaints should be served and proof of service filed within 60 days after filing.

### Product implication

OwnerPilot needs an explicit post-filing event such as:

`court_case_assigned`

with provenance-bound factual fields such as:

- issuing court;
- courthouse;
- case number;
- assignment date;
- judicial officer;
- department/room where applicable;
- source artifact identity;
- received/captured timestamp;
- human-confirmation state.

This is **Matter state**, not blank-form registry metadata.

## 3. The court may create a proof-of-service follow-up event at filing

The court supplied `LACIV 240 — Property Owner/Landlord Notice of Hearing re Failure to File Proof of Service`.

The notice describes a future plaintiff-side hearing if the case has not already been dismissed, set for trial, or reduced to judgment. It states that the court may dismiss the case without prejudice if proof of service has not been filed within 60 days after filing the complaint.

### Product implication

OwnerPilot should not merely tell the owner “serve the tenant.” The post-filing workflow needs explicit factual tracking of:

- service pending;
- proof of service pending;
- court-set proof-of-service follow-up/hearing, if any;
- whether later case events make that hearing inapplicable/canceled;
- exact source artifact supporting the tracked event.

A parsed date or court notice may create a **proposed task**, but automatic deadline computation/action remains separately governed.

## 4. Filing packet and service packet are not the same artifact set

The court returned `SCLAC CIV 313 NEW 03/26 — Notice: Unlawful Detainer Settlement Services at Stanley Mosk Courthouse`.

The notice states that plaintiffs must serve it on all defendants together with the complaint, summons, and other required documents/forms.

Standing Order `2026-SJ-004-00`, filed March 17, 2026, establishes the Stanley Mosk settlement pilot effective March 16, 2026 and likewise requires service of SCLAC CIV 313 with the complaint, summons, and other required documents/forms.

The Sixth Amended Standing Order `2026-SJ-002-00` separately states that each plaintiff must serve a copy of that Standing Order on each defendant along with the summons and complaint and file proof of that service.

### Architectural consequence

OwnerPilot must model at least two separately bound packet identities:

`FILING_PACKET`

and

`SERVICE_PACKET`

The service packet may contain:

- filed/conformed summons and complaint;
- cover-sheet/local documents required to accompany service;
- court-issued settlement notice(s);
- applicable court-issued standing order(s);
- other jurisdiction/stage-controlled materials.

The system must never assume that the pre-filing packet can simply be photocopied and treated as the complete service packet.

## 5. Court-return intake is a missing lifecycle stage

The observed real workflow is better represented as:

`FILING PACKET PREPARED`

`-> OWNER FILES`

`-> COURT ACCEPTS / CASE NUMBER ISSUED`

`-> COURT RETURN PACKET CAPTURED`

`-> COURT ARTIFACTS REVIEWED & BOUND`

`-> SERVICE PACKET COMPOSED`

`-> SERVICE PENDING`

`-> SERVICE RECORDED`

`-> POS-010 READY / FILED`

`-> RESPONSE / DEFAULT / TRIAL TRACK`

This is a material product-model improvement over treating packet generation as the end of the filing workflow.

## 6. Early-meeting / settlement-process evidence

The Sixth Amended Standing Order supplied by the court states, among other things, that:

- each plaintiff is ordered to contact each defendant within 10 days of service to discuss in good faith either potential informal resolution or, if settlement is not possible, preparation for trial;
- the Early Meeting should include discussion of evidence, witnesses, and preparation of required trial documents;
- the stated objective is resolution within 60 days of filing where possible.

The separate Stanley Mosk settlement notice describes the 2026 `We Are Los Angeles` settlement-services pilot and states that parties may request a Mandatory Settlement Conference.

### Product implication

OwnerPilot's post-service roadmap needs room for factual process states such as:

- `EARLY_MEETING_REQUIRED_OR_PENDING`
- `EARLY_MEETING_REPORTED_COMPLETED`
- `SETTLEMENT_SERVICE_INFORMATION_AVAILABLE`
- `MSC_REQUEST_REPORTED`

but settlement advice, negotiation execution, communications, and legal-effect determinations remain separately governed.

## 7. LASC CIV 312 is reinforced by the court-supplied standing order

The Sixth Amended Standing Order states that plaintiffs must, at the time of filing the complaint, file `LASC CIV 312` and include all known cellular telephone numbers for defendants.

This is stronger local workflow evidence than treating CIV 312 as merely a blank form found in the official-form registry.

### Product implication

Future Los Angeles Filing Readiness should bind:

`current local source / standing order -> stage applicability -> canonical defendant-specific phone facts -> exact CIV 312 source artifact -> generated document`

Unknown and unanswered telephone information must remain distinct states.

## 8. Trial-readiness obligations appear in the filing-day court packet

The same Sixth Amended Standing Order includes later jury/court-trial readiness requirements. It addresses evidence/witness exchange and lists joint trial documents for jury cases. It also points parties to `LACIV 244 — UD Jury Trial Readiness`.

### Product implication

OwnerPilot's Matter model should be able to retain future-stage obligations received at filing without prematurely presenting them as immediately due.

The filing-day parser therefore needs stage classification, for example:

- `REQUIRED_NOW`
- `REQUIRED_AFTER_SERVICE`
- `COURT_SET_FUTURE_EVENT`
- `TRIAL_STAGE_ONLY`
- `CONDITIONAL`
- `INFORMATIONAL`
- `APPLICABILITY_UNRESOLVED`

## 9. Actual fee evidence remains separate from fee rules

The court-return packet included a receipt confirming the actual transaction amount in the live filing.

The exact live-case transaction amount remains in the private case record. Public product code should preserve only the architectural lesson:

`published fee schedule != actual transaction receipt`

OwnerPilot should be able to capture both and preserve discrepancies without silently overwriting either source.

## 10. Required artifact taxonomy

Future filing architecture should keep these identities distinct:

- `OFFICIAL_BLANK_SOURCE`
- `GENERATED_DRAFT`
- `OWNER_REVIEWED_DOCUMENT`
- `FILED_CONFORMED`
- `COURT_ISSUED`
- `EVIDENCE_ATTACHMENT`
- `SERVICE_PACKET_COPY`
- `RECEIPT`

A court-issued artifact should be capable of carrying:

- stable artifact ID;
- issuing authority/court;
- document/form/order identifier where available;
- received date;
- case binding;
- source binary hash;
- extracted facts;
- human-confirmation status;
- derived/proposed task references;
- currentness/applicability metadata;
- provenance/audit trail.

## 11. Court Return / Issued Artifact Intake UX requirement

A future customer-facing post-filing flow should make the court-return step explicit:

> **Your case was filed. Add the documents the court gave you back.**

Conceptual experience:

1. Upload/scan the full returned court packet.
2. OwnerPilot separates each court-issued document.
3. OwnerPilot identifies proposed factual fields such as case number, assignment, hearing/event information, and documents that appear to need service.
4. The owner reviews and confirms extracted facts.
5. OwnerPilot binds each confirmed artifact to the Matter.
6. OwnerPilot composes the next-stage service checklist/packet from controlled rules and the confirmed court-return artifacts.
7. The owner chooses/records who will serve; service itself remains outside OwnerPilot execution unless separately authorized.
8. After service, OwnerPilot captures the server's factual information for POS-010 and tracks subsequent matter stages.

### Core UX principle

The owner should see **what the court gave back, what it appears to require next, what OwnerPilot knows, what remains unconfirmed, and what action belongs to the owner**.

Do not expose internal hash/digest plumbing as normal customer language.

## 12. Fail-closed requirements

The future backbone must fail closed when:

- a court-issued page cannot be classified;
- case identity conflicts across returned documents;
- a court-issued document appears to belong to another case;
- extracted event dates conflict;
- the source/currentness of a reusable rule is unresolved;
- a required service document is missing;
- an artifact hash/version changes without explicit rebinding;
- the system cannot distinguish a blank source from a filed/conformed or court-issued artifact.

## 13. Governance

This memo documents product learning only. It does not authorize:

- automatic or direct court filing/e-filing;
- filing-fee payment;
- OwnerPilot signature;
- automatic service;
- legal advice or legal-effect determinations;
- unvalidated deadline calculation;
- settlement execution;
- default requests;
- trial strategy;
- court representation;
- attorney routing;
- new database/Supabase/RLS deployment;
- Production activation;
- autonomous continuation.

Implementation should proceed only through the approved Product/UX -> Architect/ARB -> Engineer path.