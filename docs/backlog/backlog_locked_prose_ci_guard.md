# Backlog — Locked-Prose CI Guard + Hash Manifest (`BROKER_WORKFLOW_PRODUCTION_LIVE`)

**Status:** OPEN — not started
**Raised:** 2026-06-15 (during C7a multi-select close-out)
**Priority:** High — multiple shipped determinations name this control as the integrity mechanism for locked face prose; it does not yet exist.
**Owner:** JT (broker) for the locked-prose set definition + determination; build side for the guard/manifest implementation.

---

## 1. Why this exists

Several broker determinations and code source-comments assert that locked § 1161(2) face constants are protected by a CI guard named `BROKER_WORKFLOW_PRODUCTION_LIVE` and tracked in a "locked-prose hash manifest." **Neither the guard nor the manifest is built.** Today the only thing actually protecting the locked strings from drift is the exact-match patch-script discipline (every face edit goes through an exact-match-or-abort patch, reviewed before apply) — a process control, not an automated one.

This ticket is the place where that gap is tracked, with the determinations as its specification. Until it ships, determinations should describe the guard/manifest as **required-but-pending** (see the C7a inperson-layout determination, softened 2026-06-15), not as existing.

## 2. Determinations that depend on this control (the spec)

- `c7a_inperson_layout_broker_determination_2026-06-15.md` §3, §4 — names the guard as the protection for `inPersonOnlyLabel` / `inPersonAddressLabelVersion`, and the hash manifest as the gate for future label changes.
- `c7a_multiselect_face_review_broker_determination_2026-06-15.md` §8 — the two locked closure sentences (`inPersonOnlySentence`, `inPersonNoMailSentence`).
- `c1_pobox_scope_multiselect_broker_determination_2026-06-15.md` §3 — the verbatim P.O.-box error string.
- `system_prompt_drift_diff_attorney_correction_2026-06-07.md` — the original drift-diff / manifest concept (VERIFY this file exists in docs/compliance/; if absent, that is a separate dangling-reference flag to resolve).

## 3. What the control must do (drawn from the determinations above)

1. **Define the locked-prose set.** A single enumerated registry of every build-locked face constant that originates from a broker determination — at minimum, the `NOTICE_PROSE` constants in `lib/produce/renderNotice.ts` (labels + sentences) and the locked validator/gate error strings the determinations fix verbatim (e.g. the C1 P.O.-box string). Each entry: constant name, file, verbatim value, source determination + section, version stamp.

2. **Hash manifest.** A checked-in manifest mapping each locked constant to a hash of its verbatim value. The source of truth for "has any locked face string changed."

3. **CI guard (`BROKER_WORKFLOW_PRODUCTION_LIVE`).** A CI check that recomputes the hashes from source and fails the build if any locked constant's value differs from its manifest entry without a corresponding manifest update + (by policy) a determination reference in the same change. Net effect: a locked face string cannot change silently; a change forces an explicit manifest bump, which forces a determination citation.

4. **Version-stamp coupling.** Where a constant carries a version stamp (e.g. `inPersonAddressLabelVersion = 'v1'`), the guard should require the stamp to bump when the value changes.

## 4. Open design questions (for JT)

- Scope of the locked-prose set: face prose only, or also the locked compliance error strings (P.O.-box, paper-instrument, EFT-requires-mail)? The determinations imply both; confirm.
- Manifest format + location (e.g. `docs/compliance/locked_prose_manifest.json` vs. a generated artifact).
- Enforcement strictness: hard CI fail vs. warn-then-require-ack. Determinations say "fails the guard" — i.e. hard fail.
- Whether the guard also checks that each locked constant's source-comment cites a determination file that exists in `docs/compliance/` (this would have caught the `c7a_inperson_layout` dangling reference automatically).

## 5. Acceptance criteria

- [ ] Locked-prose set enumerated and checked in (JT confirms the membership).
- [ ] Hash manifest generated for the current locked values, checked in.
- [ ] `BROKER_WORKFLOW_PRODUCTION_LIVE` CI check fails the build on any unmanifested change to a locked constant.
- [ ] A deliberate test edit to a locked string (without a manifest bump) is shown to fail CI.
- [ ] Determinations that currently say "required-but-pending" are updated (or a follow-up determination notes the control is now live).
- [ ] Optional: guard also verifies every determination filename cited in `lib/` / `components/` source comments resolves to a file in `docs/compliance/`.

## 6. Until then (interim control of record)

The exact-match patch-script discipline is the active control: every change to a locked face constant goes through an exact-match-or-abort patch script, sandbox-tested and reviewed before apply, with the determination authored/ratified first. This is a process control and depends on discipline; the CI guard is what makes it automated and unbypassable. Treat the patch-script discipline as mandatory until the guard ships.
