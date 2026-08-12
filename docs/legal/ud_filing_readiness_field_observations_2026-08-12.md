# California UD Filing Readiness — Field Observations and Verified Operational Guidance

**Date:** 2026-08-12  
**Status:** OBSERVATION / PRODUCT INPUT — NONCANONICAL  
**Scope:** California residential unlawful-detainer filing/readiness workflow.  
**PII posture:** No customer/live-case identifiers or case-specific filed artifacts belong in this repository record.

This memo preserves durable product-learning evidence from a real in-person unlawful-detainer filing and separates it from independently verified California Courts guidance. It is not a legal opinion, filing-readiness rule, or authorization to implement Phase C, form filling, filing, or court submission.

## Governing evidence distinction

- **Primary-source verified guidance** may inform future product requirements, subject to currentness and legal/product governance.
- **Single-case court-counter observations** are useful product evidence but do not become universal legal rules merely because a clerk accepted a filing.
- **Registry presence ≠ applicability ≠ requiredness ≠ legal sufficiency ≠ filing readiness ≠ execution authority.**

## 1. Copies / sets to take to court

Current California Courts Self-Help guidance for starting an eviction says the filer should have:

- the **original forms and attachments for the court**;
- **one copy for the landlord**; and
- **one copy for each tenant or other known occupant** who needs to receive the filed papers.

The filer should bring the original and copies to the clerk. The clerk stamps the forms, keeps the original, and returns the filed copies. The landlord keeps one copy and uses the other returned copy/copies for service.

Primary source:
- California Courts Self-Help — "Fill out forms to start an eviction case": https://selfhelp.courts.ca.gov/eviction-landlord/fill-out
- California Courts Self-Help — "File the eviction forms (Summons and Complaint)": https://selfhelp.courts.ca.gov/eviction-landlord/file

### Product wording for a one-defendant / one-service-copy case

> **Take 3 sets to court for stamping: the original filing set plus 2 copies.** The court keeps the original. Keep one stamped copy for your records and use the other stamped copy for service on the tenant.

Do **not** hard-code `3` as the universal quantity. Future Filing Readiness should calculate the required physical set count from the number of people who need a service copy plus the court original and landlord record copy.

Conceptually:

`total filing sets = 1 court original + 1 landlord record copy + service copy count`

## 2. Post-filing document state

The practical customer-facing transition should distinguish:

`SUBMITTED → COURT ORIGINAL RETAINED → FILED/CONFORMED COPIES RETURNED → SERVICE COPY IDENTIFIED → OWNER RECORD COPY IDENTIFIED → SERVICE PENDING`

A filed/conformed court artifact is a private Matter/case artifact. It must never be placed in `docs/legal/official-forms/**`, which is reserved for pristine reusable official blank source artifacts.

## 3. Who may serve the Summons and Complaint

Current California Courts Self-Help guidance states that the plaintiff cannot serve the Summons and Complaint personally. The server must:

- be **18 or older**; and
- **not be a party to the case**.

The server may be someone the plaintiff knows, the sheriff where available, or a professional process server. A licensed/registered professional process server is therefore **not mandatory merely to perform service**.

After service, the server completes `POS-010 — Proof of Service of Summons` and returns it to the plaintiff for filing.

Primary source:
- California Courts Self-Help — "Serve the Summons and Complaint forms": https://selfhelp.courts.ca.gov/eviction-landlord/serve

### Product implication

Future OwnerPilot service UX should present a factual server-eligibility gate rather than falsely requiring a professional process server:

- Adult 18+ and not a party to the case;
- Sheriff, where available; or
- Professional process server.

Service-method sequencing and legal sufficiency remain separately governed controls.

## 4. 2026-08-12 live filing observations — do not silently generalize

A private OwnerPilot pressure-test case was filed in person at Los Angeles Superior Court on 2026-08-12. The following facts are preserved as **single-case observations only**:

- The court accepted the UD filing and returned a conformed complaint bearing a filing date and case number.
- For that filing, `UD-101` was **not required by the filing clerk**.
- For that filing, the filer reports that `LACIV109` items **6 and 11** had to be marked.
- The filing clerk did not request identification or verify that the physical presenter name matched the named filer/plaintiff.
- The filing fee actually paid at the counter was **$240**.
- For the one-defendant filing, three sets were presented; the court retained one and returned two stamped/conformed sets — one for service and one for the plaintiff's records.

These observations must remain distinguishable from reusable rules.

### UD-101

The live LASC filing demonstrates actual acceptance without UD-101 in this matter. That does **not** establish that UD-101 is never required. Other current California county packets still list UD-101, and the Judicial Council form remains published. Future Filing Readiness must determine requiredness from current jurisdiction/time/fact controls rather than form-registry presence or one case outcome.

### LACIV109

The observed requirement to mark items 6 and 11 should be treated as a research/validation input for the future Los Angeles Filing Readiness control set, not as silently adopted legal canon.

### Presenter identification

Observed absence of an ID check must not become a product rule that anyone may file for anyone else or that filer/presenter authority is irrelevant. `physical presenter identity check observed = false` is evidence about one counter transaction, not filing authority.

### Filing fee

The actual $240 transaction should be preserved as case evidence, but fee estimation must use current authoritative fee schedules/currentness controls. California Courts currently publishes different filing-fee bands based on the amount at issue. Actual transaction evidence and published schedule data must not overwrite one another when they disagree; the discrepancy should remain inspectable.

Primary source for current fee guidance:
- California Courts Self-Help — "File the eviction forms (Summons and Complaint)": https://selfhelp.courts.ca.gov/eviction-landlord/file
- Judicial Branch of California — Civil Fees / current statewide schedule: https://courts.ca.gov/news-reference/reports-publications/civil-fees

## 5. Filing Readiness requirements learned from the field event

Future Filing Readiness should be capable of representing at least:

- `REQUIRED_NOW`
- `CONDITIONALLY_REQUIRED`
- `REQUIRED_LATER`
- `NOT_APPLICABLE`
- `APPLICABILITY_UNRESOLVED`
- `SOURCE_STALE_OR_CHANGED`
- `HUMAN_CONFIRMATION_REQUIRED`

The following controls should remain separate:

1. **Official source artifact identity** — exact controlled blank binary/version.
2. **Current source health** — whether the issuing authority still publishes/recognizes that source.
3. **Jurisdiction/stage applicability** — whether the form participates in this matter now.
4. **Canonical facts** — verified/reported facts needed to populate or decide applicability.
5. **Field map** — exact versioned binding from canonical facts to a specific source artifact.
6. **Generated document identity** — exact produced artifact and provenance.
7. **Human review/confirmation** — what the customer actually reviewed and approved.
8. **Packet binding** — exact documents/components included in the filing set.
9. **Physical filing logistics** — copy/set count, court original, owner record copy, service copy/copies.
10. **Post-filing state** — filed/conformed identity, case number, service pending, proof-of-service later.

## 6. Product copy requirement

For a one-defendant in-person filing flow, the practical instruction should be simple and explicit:

> **Take 3 sets to court for stamping.** The court keeps the original. You get two stamped copies back: one to serve on the tenant and one to keep for your records.

The implementation must still derive the count dynamically when more than one tenant/occupant needs a service copy.

## 7. Governance

This memo records product-learning evidence. It does **not** authorize:

- form filling;
- Filing Readiness implementation;
- UD-100 workflow activation;
- Phase C activation;
- court filing/submission;
- e-filing;
- payment of court fees;
- customer data persistence;
- attorney routing;
- legal-rule or jurisdiction-rule changes;
- Production activation;
- autonomous execution.

Any conversion of these observations into runtime controls must proceed through the applicable Product / Legal / Architect governance path.
