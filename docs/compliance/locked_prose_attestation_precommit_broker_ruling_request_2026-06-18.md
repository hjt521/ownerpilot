# Build-side escalation — open questions before committing the guard live attestation

**File:** `locked_prose_attestation_precommit_broker_ruling_request_2026-06-18.md`
**Date:** 2026-06-18
**Authored by:** Build side (engineering) — escalation request for broker determination. Not a determination.
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Subject:** Decisions needed before any file is copied into `docs/compliance/` or any patch is run, to land `locked_prose_guard_live_attestation_2026-06-18.md` (+ manifest edit) under the new enforced PR flow.

**Posture:** Build-side question only. Build side authors no determination prose. All decisions and any verbatim text are left blank for the broker.

---

## 0. What is staged and waiting

- **Attestation file** `locked_prose_guard_live_attestation_2026-06-18.md` — authored by broker, uploaded. Ready to commit.
- **Manifest patch** `patch_manifest_live_attested_2026-06-18.py` — inserts the two §5 fields after `guard_status`, anchored on `guard_status == "live"`, aborts otherwise (per attestation §8). Sandbox-tested: applies on a `live` manifest, ABORTS on a `required-but-pending` one, idempotent, JSON-validated.
- **Evidence pack** `locked_prose_guard_live_evidence_pack_2026-06-18.md` — build-side authored. Built, hashed, not yet ruled in or out of the commit (see Q1).

Nothing has been copied into the repo or run yet. This escalation is the gate before that.

## 1. [BLOCKING] Does the evidence pack get committed in this PR?

The attestation references `locked_prose_guard_live_evidence_pack_2026-06-18.md` **four times** (lineage block, §0, §3, §8). The §7 checklist in the attestation lists only the attestation file + the manifest edit — it does not list the evidence pack.

If the evidence pack is not committed, those four links dangle to a file that exists nowhere in the repo — the same dangling-reference failure mode that drove the packet_test4 audit and the request/response in-tree ruling earlier this session.

Note: the locked-prose CI guard checks `// Source:` comments in `lib/` and `components/`, **not** markdown-to-markdown links in `docs/compliance/`. So a dangling link here would **not** turn the PR red. It would be a silent dangling reference, caught only by human review — which is precisely why it needs a deliberate ruling now.

**Ruling requested:**
- **(a) Commit it** (consistent with the request/response in-tree ruling: build-side-authored evidence as the question/evidence half of a pair). Resolves all four links.
- **(b) Leave it out** and accept the four links as external references to a working input. The attestation's §0/§3 reliance on it ("on the basis of the evidence in …") would then point out-of-tree.

## 2. [BLOCKING] Field placement in the manifest

The §5 JSON block is to be added "alongside the existing `manifest_version` and `guard_status` fields." Build side placed the two new fields **immediately after `guard_status`** (so the order is `manifest_version`, `generated_at`, `guard_status`, `live_attested`, `live_attested_determination`, `broker_authority`, …). This groups the attestation reference with the status it attests.

Confirm that placement is acceptable, or specify a different position. (This is purely cosmetic JSON-key ordering; it does not affect validity or the guard.)

## 3. [NON-BLOCKING] Commit scope / message

The §7 checklist suggests: `docs(compliance): broker attestation — locked-prose CI guard live as of 2026-06-18 (0dbeab4)`. If the evidence pack is included (Q1a), the message should arguably name it too. Confirm the message, or amend.

Also confirm the commit scope is exactly: attestation file (new), manifest edit (2 inserted lines), and — if Q1a — evidence pack (new). No other files.

## 4. [ACK] New landing motion — confirm understanding, not a decision

This is the first commit under the `main protection` ruleset. It cannot be a direct push. The flow is:

1. branch `docs/locked-prose-guard-live-attestation`
2. §8 re-verify: `git show origin/main:docs/compliance/locked_prose_manifest.json` reads `guard_status: "live"` (else the patch aborts by design)
3. copy files in, run manifest patch, verify `wc -c` + `sha256` against the expected values, run `npm run ci:verify-locked-prose` locally
4. push branch, open PR
5. wait for the three required checks (`verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`) to go green
6. merge the PR

No `git push origin main`. The attestation's §7 "branch -> PR -> green -> merge" line already anticipates this; this paragraph just confirms build side will drive it that way.

## 5. Expected verification values (for the §7 0-byte / hash guard)

```
attestation    11530 bytes   sha256 c13284761134d98a554aab5dc733dd3bd1d57aad67248026f73deeefad1ddda9
evidence pack   8825 bytes   sha256 adaa1c47ec2e5b649d43d9e351d77d1e345f03d7b7da688a608489ed6650ec46
```

(Attestation hash computed from the copy uploaded to build side; if the broker's local copy differs, it was edited post-upload — reconcile before commit. Evidence-pack hash is the build-side source; re-download before copying so the local copy matches.)

---

## Broker ruling

- **Q1 (evidence pack) — (a) commit / (b) leave out:**
- **Q2 (manifest field placement) — confirm after guard_status / specify other:**
- **Q3 (commit message + scope) — confirm / amend:**
- **Q4 (new PR motion) — acknowledged:**
- **Sign-off:**

---

— Awaiting broker ruling. No files copied, no patch run, nothing staged until the above is resolved.
