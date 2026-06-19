# Build-side escalation — broker compliance ruling requested

**Authored by:** Build side (engineering) — escalation request for broker determination.
**File:** `c7a_filestate_broker_ruling_request_2026-06-18.md`
**Date:** 2026-06-18
**From:** Build side (OwnerPilot AI engineering)
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Subject:** Ruling requested on the on-disk state of `c7a_multiselect_face_review_broker_determination_2026-06-15.md` before any commit.

**Posture:** This is a build-side question only. Build side authors no §1161(2) face text, no compliance-determination prose, and no replacement wording. The decision and any authored text below are left blank for the broker.

---

## 1. Verified disk facts (from broker's 2026-06-18 `grep` + `git diff`)

Against `docs/compliance/c7a_multiselect_face_review_broker_determination_2026-06-15.md` in `~/ownerpilot`:

- **Committed line 185** reads as the original determination: `Eleven combinations are valid. Five are disallowed (the four involving EFT-with-only-bank or EFT-with-only-in-person, and the two single-method-non-floor cases). See Section 7 for the EFT pairing rule.` — parenthetical present; "See Section 7"; no blanket-authorization sentence.
- **Line 280** reads `- Ten permitted combinations per the matrix in Section 4.` — this is the **only** working-tree change vs `origin/main` (`git diff` confirms a single hunk), and it is **uncommitted**.
- **Section 11** heading is still `## 11. What still needs separate attorney review (Section 11 of 2026-06-14 floor/ceiling)`.
- The reworked `…-3` document supplied separately (blanket-authorization framing, "Ten / blanket authority" line 183, no parenthetical, §11 = "Future amendment authority") is **not on disk** — not committed and not in the working tree.

## 2. Two consistency flags for the record

**Flag A — §8.5 describes a disk state that is not in the repo.** The §8.5 ruling in `packet_redesign_compliance_review_broker_determination_2026-06-18.md` is marked **APPLIED 2026-06-18** and states that the line-183 remainder ("…blanket authority to amend this matrix is broker-retained under Section 3 of the blanket authorization") "was already correct on disk" and that the "four involving EFT…" parenthetical "is not present in the current on-disk file." Both statements match the `…-3` rewrite, **not** the committed C7a file. The packet_redesign determination and the actual C7a file have diverged: §8.5 was authored against a draft state that never landed.

**Flag B — the parenthetical is the six-summing error §8.4 already named.** §8.4 acknowledges the line-185 parenthetical as "a separate prose error" that "summed to six." On disk it is present and live: it enumerates *four* (EFT cases) + *two* (single-method cases) = six, against a "Five are disallowed" headline and a five-row DISALLOWED matrix (`B`, `E`, `IE`, `BE`, `IBE`). A bare `Eleven`→`Ten` on line 185 would fix the headline count but leave this internal contradiction in place.

## 3. Ruling requested — choose one branch

**Branch A — keep this determination; surgical fix.**
Build side applies `Eleven`→`Ten` on line 185 and commits alongside the already-staged line-280 change, as one commit. This requires the broker to author **the exact, full, verbatim line 185** — including the disposition of the six-summing parenthetical (delete it, or rewrite it to enumerate the correct five). Build side transcribes verbatim; authors nothing.

**Branch B — adopt the `…-3` rewrite as the committed file.**
Build side replaces the file byte-for-byte from the broker-supplied `…-3` document (idempotent exact-replacement patch, sandbox-tested). This yields the clean line-185 form with no parenthetical. **Factual note, not a recommendation:** `…-3` is a wholesale posture rewrite, not only a count fix. It also (i) recasts the file under `broker_blanket_authorization_2026-06-15.md`, (ii) drops the "Not attorney sign-off. Not legal advice." posture line, and (iii) replaces §11 ("What still needs separate attorney review" / "an attorney pass remains advisable") with "Future amendment authority" ("No attorney is presently engaged… amendments do not require any external concurrence"). Selecting Branch B commits that posture change. Confirm that is intended, not incidental to the count fix.

## 4. Secondary item (only if Branch A is chosen)

If the determination stays in its current form, packet_redesign §8.5's "APPLIED" language and its description of the C7a disk state no longer match reality and may warrant a correcting note so the audit trail is honest about what actually landed (line 280 only) versus what §8.5 claims (the full `…-3` state). Build side authors no correction text. To check the committed state of that determination first:

```
git log --oneline -5 -- docs/compliance/packet_redesign_compliance_review_broker_determination_2026-06-18.md
grep -n "APPLIED 2026-06-18\|already correct on disk\|not present in the current on-disk file" docs/compliance/packet_redesign_compliance_review_broker_determination_2026-06-18.md
```

---

## Broker ruling

- **Branch chosen (A / B):**
- **If A — verbatim final line 185:**
- **If A — parenthetical disposition:**
- **§8.5 audit-trail reconciliation (action / none):**
- **Sign-off:**

---

— Awaiting broker ruling. No commit until the above is authored.
