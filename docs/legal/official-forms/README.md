# OwnerPilot Official Court Form Registry

## Purpose

This directory stores pristine, public, issuing-authority court forms used as controlled source artifacts for OwnerPilot legal-product work.

These artifacts are **NON-PRODUCTION SOURCE ARTIFACTS**. Their presence in the repository does not activate a workflow, establish legal sufficiency, create filing authority, or authorize Production use.

## Separation rules

Only blank official forms belong here. Do not place any customer-completed form, live-case document, exhibit, signature, phone number, address, or other case-specific/PII artifact in this registry. Private live-case/customer materials are not part of this directory.

Generated case documents must be treated as matter outputs and stored separately from reusable official source forms.

## Identity, source, and version controls

A form may enter this registry only when its identity, revision/effective date, page count, blankness, issuing-authority source, and SHA-256 are recorded in `manifest.json`.

- Artifact identity must be proven; filenames and mutable remote URLs are not authoritative.
- `authority_key + form_id + revision_effective` identifies the issuing authority's published revision, but it does **not** uniquely identify exact PDF bytes.
- `source_snapshot_id` is content-addressed as `sha256:<repository_sha256>` and identifies the exact registered binary.
- `artifact_id` combines the authority, form, published revision, and exact source snapshot. SHA-256 therefore participates in exact artifact identity while published-revision identity remains separately addressable.
- The current issuing-authority binary is preferred for the reusable registry.
- A Founder-supplied candidate SHA-256 is preserved as provenance. When the current official download is byte-for-byte identical, that identity is recorded. When the issuing authority currently serves a different binary under the same published revision, the registry stores the current authoritative binary and explicitly records both hashes and the discrepancy; it must never be silently substituted.
- Every repository binary is independently checked for its expected form/page identity and blank AcroForm state before it is classified `official_blank`.
- Revised official forms receive a new version directory. Do not silently overwrite or mutate a prior published revision.
- If an issuing authority changes the binary after a form has already been registered while leaving the published revision unchanged, retain the prior registered binary and add the changed official binary as a new exact source snapshot. Never replace the prior registered artifact in place.
- Duplicate source uploads are deduplicated by content identity; they are not stored twice.
- Form metadata and workflow-stage labels are lifecycle/control metadata only. Registry presence and `workflow_stage` do not establish requiredness, applicability, filing readiness, legal sufficiency, or a timing obligation.

## Registry contract

`manifest.json` is the machine-consumable registry contract for this source-artifact layer.

- `registry_version` identifies the manifest contract. A future consumer must fail closed on an unsupported version instead of guessing field semantics.
- Every entry must carry stable artifact identity, authority/form/revision identity, source-snapshot identity, repository path, SHA-256, authoritative source URL, page count, artifact class, and repository verification status.
- `artifact_id` and `repository_path` must each be unique.
- Multiple entries may share the same published revision only when their exact source snapshots/hashes differ and every historical registered path remains immutable.
- A future consumer must fail closed on missing required fields, malformed hashes, duplicate identities/paths, unsupported artifact classes, or repository hash mismatch.
- Registry parsing must never infer legal applicability or requiredness from the presence of an artifact.

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

The first registered path for a published revision remains immutable. If the issuing authority later changes the bytes while keeping the same published revision, the additional exact binary must use:

```text
<FORM-ID>/<REVISION>/source-snapshots/sha256-<FULL_SHA256>/<FORM-ID>.pdf
```

under the same authority root, with a new manifest entry and new `artifact_id`/`source_snapshot_id`. Consumers must use the manifest identity/path; the path convention is storage organization, not identity authority.

## Retrieval and source-health boundary

The future controlled retrieval chain is:

```text
requested artifact_id
-> manifest repository_path
-> exact repository binary
-> SHA-256 verification against repository_sha256/source_snapshot_id
-> supported artifact_class
-> later field-map/document subsystem
```

A future artifact service should fail closed for at least `MISSING`, `HASH_MISMATCH`, `MALFORMED_ARTIFACT`, `UNSUPPORTED_ARTIFACT`, and `SOURCE_HEALTH_UNRESOLVED` rather than substituting another PDF.

Source health/currentness is separate from historical artifact identity. A future source-health control may classify a remote source as `CURRENT`, `STALE`, `CHANGED`, `UNAVAILABLE`, or `UNRESOLVED`, but those states must not rewrite, delete, or silently replace an already registered artifact.

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

## Future controlled binding seam

This registry is only the first link of a future controlled document chain. The minimum identities must remain distinct:

- `SourceArtifactIdentity` - exact official blank binary from this registry;
- `FieldMapIdentity` - separately versioned mapping from canonical facts to fields on one exact source artifact;
- `CanonicalFactIdentity / provenance` - Matter fact identity and source provenance outside this registry;
- `GeneratedDocumentIdentity` - one produced document instance bound to an exact source artifact, field map, and fact snapshot;
- `PacketBindingIdentity` - composition identity for an exact set of generated documents/artifacts.

PR #371 does not implement those later layers.

For LASC CIV 312, future canonical facts must preserve defendant-specific telephone-information state such as `KNOWN(value)` versus `UNKNOWN`; known is not unknown, unknown is not unanswered, and a defendant-specific telephone fact is not a Matter-global phone field. This is a future product dependency only and is not implemented in this registry.

## Product boundary

Official PDFs are source templates only. OwnerPilot's canonical facts, document provenance, field mappings, jurisdiction controls, filing-readiness logic, stage rules, generated-document identity, packet bindings, and final human-verifiable bindings must remain explicit, versioned product controls outside the PDF binary itself.

The governing invariant is:

**registry presence != applicability != requiredness != legal sufficiency != filing readiness != execution authority.**
