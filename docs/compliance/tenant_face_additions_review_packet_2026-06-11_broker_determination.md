# RiskPath Phase 1 — Tenant-Face Additions Review Packet — §6 Determination (Broker Compliance Review)

**Original packet:** `tenant_face_additions_review_packet_2026-06-11.md` (build side, engineering facts)
**Determination author:** Jack Taglyan, California Real Estate Broker, CalDRE license #B9445457
**Determination posture:** Broker compliance review against published primary sources and the broker-scope posture. Not attorney legal opinion. No California-licensed attorney has reviewed this determination. The product remains broker-scope under California Business & Professions Code § 10131(b); no attorney is engaged for the standing product. For any specific legal question arising from a notice produced by the engine, the user should consult a California licensed attorney of their choosing.
**Date:** 2026-06-11

---

## §6 Determination

### Threshold framing — scope coherence of the proposed additions

Before ruling on (a)–(e), one threshold point that the engineering packet does not fully resolve: the QR feature is described as Phase 1 placeholder, Phase 2 linking to "a public, non-case-specific tenant information page." What that page contains determines the scope analysis:

- **Version A (broker-scope coherent):** Phase 2 page contains *navigation to public government and nonprofit resources* — CA Courts self-help center, local rent assistance programs, statutory text on leginfo, CA Department of Real Estate consumer resources, qualifying legal aid organizations. The QR is a pointer to public help, not OwnerPilot-authored guidance.
- **Version B (UPL-adjacent, declined):** Phase 2 page contains *OwnerPilot-authored explanations of tenant rights, defenses, or recommended actions*, even labeled "general information." Authored content telling a tenant what to do starts looking like legal information bordering on legal advice. Broker scope does not authorize a broker to advise tenants on their rights against a landlord; broker scope is the landlord side of the transaction.
- **Version C (UPL, declined):** Phase 2 page provides *guidance personalized against the served notice* — "based on this notice, here are your defenses" or anything case-specific. This is unauthorized practice of law.

**The determination below assumes and requires Version A.** Version B or Version C are declined under broker scope and would require this packet to be reopened.

---

### (a) Determination on "TENANT SERVICE COPY" page label

**APPROVED with constraints.**

Statutory check: nothing in CCP §§ 1161–1162 prohibits non-content labeling on the served copy of a three-day notice. The notice content requirements govern what the notice must contain, not what additional labels the landlord may add. The label distinguishes the physical served copy from the owner's retained copy, which is a reasonable record-keeping convention.

**Constraints:**

1. The label must be rendered **outside the formal notice body**, in a position that does not interrupt or interleave with the required statutory content (per the spec's stated constraint — confirmed).
2. The label must not alter the legal character of the document. "TENANT SERVICE COPY" identifies which physical copy this is; it does not modify the notice or add legal language. Acceptable.
3. The label's visual treatment should be plain (header or footer, neutral font, not styled in a way that could be mistaken for required notice content). The spec's "outside the formal notice body" constraint covers this.
4. The label may ship in Phase 1 **independent of the QR footer block** — see (d).

### (b) Determination on tenant-facing QR footer block

**APPROVED IN PRINCIPLE for Phase 2, with conditions in (e). DECLINED FOR PHASE 1** — see (d) for the reason.

The QR mechanism itself is acceptable provided the Phase 2 destination is Version A. The disclaimer text proposed in the packet ("OwnerPilot does not represent you or your landlord. This information is not legal advice.") is the correct shape under broker scope.

The "approved in principle" framing means the structural decision is made, but the actual ship of the QR block on served notices requires the Phase 2 content to be live, content-reviewed under a fresh packet, and verified Version A before the served-copy footer renders the QR.

### (c) Approved footer wording, verbatim

The wording proposed in the packet is approved verbatim, with one [CONSIDER] addition:

- **Title (verbatim, locked):**

  > General Information About This Notice

- **Body (verbatim, locked) — user's 2026-06-11 revision adopted:**

  > Scan to learn more

  *(The user's shortening from the spec's longer original line is adopted. The shorter form makes no representations about what's on the other side beyond a generic invitation, which is the right posture under broker scope. The longer original was also acceptable but the shorter form is cleaner.)*

- **Disclaimer (verbatim, locked):**

  > OwnerPilot does not represent you or your landlord. This information is not legal advice.

- **[CONSIDER] Additional optional line — recommended but not required:**

  > Scanning is optional and has no effect on your rights or deadlines under this notice.

  *(This line closes a small gap: a tenant who doesn't have a phone, or who chooses not to scan, should not face any implication that they have foregone something material. Recommended to include; if engineering prefers to ship without it, the three locked strings above are sufficient on their own.)*

All three (or four, with the optional line) strings render verbatim as locked constants. Any future change to these strings requires a fresh review packet, consistent with the locked-constant change process.

### (d) Determination on placeholder QR / Phase 1 scope

**DECLINED. Do not print a placeholder or inactive QR on the served notice in Phase 1.**

Reasoning:

1. **Tenant experience.** A served three-day notice initiates the clock on a potential unlawful-detainer proceeding. A tenant who scans a dead QR during that clock has a worse experience than a tenant who sees no QR. The product surface should not invite an action that leads nowhere on a document with legal consequence.

2. **Face-validity risk.** If opposing counsel in a UD action points to a dead QR on the served notice and characterizes it as a deceptive scan-here link on the face of the notice, that becomes a face-validity question the broker would be defending. Empty or non-functional graphics on a legal document invite arguments; an empty graphic shaped like a tenant-information link is the wrong shape to invite arguments about.

3. **No upside.** A placeholder QR adds nothing functional. It only signals an intent for future functionality, which can be signaled equally well by the "TENANT SERVICE COPY" label shipping alone in Phase 1 and the QR block being added in Phase 2 when the destination is live.

**Phase 1 ships:**
- The "TENANT SERVICE COPY" page label (from determination (a)).
- **No QR footer block.** The footer-block component is built (per the spec) but is gated off the served-copy render until Phase 2.

**Phase 2 ships the QR footer block** when:
- The Phase 2 destination page is live.
- The destination is verified Version A (public-resource navigation only) under a fresh review packet.
- Conditions in (e) are satisfied.

### (e) Other conditions attached to Phase 2

Five conditions, all of which must hold before the QR footer block is enabled on served notices:

1. **Phase 2 content scope is Version A only.** Public government and nonprofit resource navigation. No OwnerPilot-authored tenant-rights guidance. No personalization. No case-specific data on the destination page.

2. **Phase 2 destination page carries the standard UPL-discipline disclaimer** in the exact phrasing used elsewhere in the product:

   > OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared notice produced under California Licensed Real Estate Broker supervision. For legal matters, consult a California licensed attorney of your choosing.

   This is the same disclaimer language used on the Step 1 ("Before we start") footer of the intake. Consistency across surfaces matters; the disclaimer should not vary in wording from one surface to another.

3. **No case-specific data in the QR encoding or destination URL.** The QR code must encode the same generic URL regardless of which notice it appears on. The destination URL must not carry query parameters or path segments derived from the notice (tenant name, premises address, amount due, dates, notice ID). The QR resolves to the same generic page for every served notice the engine produces.

4. **Phase 2 content is re-reviewed under a fresh packet** before going live. This determination covers the Phase 1 label decision, the Phase 1 placeholder-QR decision, the structural approval-in-principle for the Phase 2 QR mechanism, and the verbatim approval of the three footer strings. The Phase 2 content itself — what the destination page actually says, which resources it links to, how the disclaimer is positioned on that page — is its own determination.

5. **Server-side analytics on QR scans observe data minimization consistent with the chat transcript persistence policy.** Counting aggregate scans is acceptable. Logging individually-identifiable scan data tied to specific notices, tenant identities, or IP/device fingerprints is not, and would re-open the persistence-policy review.

### Determined by

Jack Taglyan
California Real Estate Broker, CalDRE license #B9445457
Broker compliance review against:
- California Code of Civil Procedure §§ 1161–1162 (text as currently in force)
- California Business & Professions Code § 10131(b) (broker scope)
- California Business & Professions Code §§ 6125–6126 (UPL framework)
- The OwnerPilot AI broker-scope internal note (`broker_scope_internal_note_2026-06-09.md`)
- The locked-constant change process applied to served-document face additions

Primary-source URLs:
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=10131.
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=6125.

### Signature / written-confirmation reference

**Jack Taglyan, Broker, CalDRE license #B9445457 · 2026-06-11**

This determination is broker compliance review and does not constitute legal advice. It is grounded in published California primary sources and the broker-scope posture; it does not require, claim, or imply attorney review. For any tenant or landlord who needs specific legal guidance on the contents of a particular notice or the response to a particular notice, the appropriate path is consultation with a California licensed attorney of their choosing.

---

## Disposition summary

| Question | Determination |
|---|---|
| (a) TENANT SERVICE COPY label | **APPROVED** with placement constraints — ships in Phase 1 |
| (b) QR footer block (structural) | **APPROVED IN PRINCIPLE** for Phase 2; declined for Phase 1 |
| (c) Footer wording (three strings) | **APPROVED VERBATIM** — locked constants; optional fourth line recommended |
| (d) Placeholder QR on Phase 1 | **DECLINED** — no QR on served notice until Phase 2 destination is live |
| (e) Phase 2 conditions | Five conditions enumerated; Phase 2 ship gated on satisfaction |

## Phase 1 build sheet (engineering-facing)

1. **Render** the "TENANT SERVICE COPY" label on the served copy, outside the formal notice body, neutral styling. ✓ ship.
2. **Build** the QR footer block component with the three locked strings (and optionally the fourth recommended line) from (c). ✓ build, do not enable.
3. **Gate** the QR footer block's render on a feature flag (e.g., `TENANT_QR_FOOTER_ENABLED = false` in Phase 1). The component exists in the codebase but does not render on served notices.
4. **Pin** the three (or four) footer strings as locked constants in the same module-header convention used for the 13 v4 HOW TO PAY constants. Module header should reference this determination file by name.
5. **Add an exact-equality test pin** for each of the locked footer strings, mirroring the existing pinned-string tests for the HOW TO PAY constants.
6. **Do not change** any of the 13 HOW TO PAY constants, the A1 Part D face text, the title-line statute citation, the forfeiture-election language, or the Proof of Service citations. The additions render around the existing notice body; no locked string is edited.

## Phase 2 gate

Before flipping `TENANT_QR_FOOTER_ENABLED` to `true`:
- A Phase 2 content review packet is filed for the destination page.
- The destination page is verified Version A.
- The five conditions in (e) are satisfied.
- This determination's signatory (or successor under the same broker-scope posture) signs off on the Phase 2 packet.

---

**End of §6 determination.**

Filed: `tenant_face_additions_review_packet_2026-06-11_broker_determination.md`
Companion to: `tenant_face_additions_review_packet_2026-06-11.md` (engineering packet)
