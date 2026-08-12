# OwnerPilot Official Court Form Registry

## Purpose

This directory stores pristine, public, issuing-authority court forms used as controlled source artifacts for OwnerPilot legal-product work.

These artifacts are **NON-PRODUCTION SOURCE ARTIFACTS**. Their presence in the repository does not activate a workflow, establish legal sufficiency, create filing authority, or authorize Production use.

## Separation rules

Only blank official forms belong here. Do not place any customer-completed form, live-case document, exhibit, signature, phone number, address, or other case-specific/PII artifact in this registry. In particular, the private Clifton Alexander live-case materials are not part of this directory.

Generated case documents must be treated as matter outputs and stored separately from reusable official source forms.

## Identity, source, and version controls

A form may enter this registry only when its identity, revision/effective date, page count, blankness, issuing-authority source, and SHA-256 are recorded in `manifest.json`.

- Artifact identity must be proven; filenames alone are not authoritative.
- The current issuing-authority binary is preferred for the reusable registry.
- A Founder-supplied candidate SHA-256 is preserved as provenance. When the current official download is byte-for-byte identical, that identity is recorded. When the issuing authority currently serves a different binary under the same published revision, the registry stores the current authoritative binary and explicitly records both hashes and the discrepancy; it must never be silently substituted.
- Every repository binary is independently checked for its expected form/page identity and blank AcroForm state before it is classified `official_blank`.
- Revised official forms receive a new version directory. Do not silently overwrite or mutate a prior published revision.
- Duplicate source uploads are deduplicated by content identity; they are not stored twice.
- Form metadata and workflow-stage labels are OwnerPilot control metadata, not a statement that a form is universally required or legally sufficient in every case.

## Registry layout

```text
official-forms/
  manifest.json
  california/
    judicial-council/
      <FORM-ID>/<REVISION>/<FORM-ID>.pdf
  los-angeles/
    superior-court/
      <FORM-ID>/<REVISION>/<FORM-ID>.pdf
```

## Current ingestion set

The initial set contains eight unique blank forms identified from the Founder-supplied source set on 2026-08-12:

- UD-100
- UD-101
- SUM-130
- CM-010
- POS-010
- CP10.5
- LACIV109
- LASC CIV 312

Seven repository binaries are byte-for-byte identical to the Founder-supplied blank candidates. LACIV109 remains published by LASC as Rev. 01/23, but the current issuing-authority download is a different binary from the two identical Founder-supplied LACIV109 candidates; the registry therefore stores the current LASC binary and preserves the Founder-supplied hash in `manifest.json` for provenance.

The two Founder-supplied LACIV109 files were byte-for-byte identical to each other and are represented once.

## Product boundary

Official PDFs are source templates only. OwnerPilot's canonical facts, document provenance, field mappings, jurisdiction controls, filing-readiness logic, stage rules, and final human-verifiable bindings must remain explicit, versioned product controls outside the PDF binary itself.
