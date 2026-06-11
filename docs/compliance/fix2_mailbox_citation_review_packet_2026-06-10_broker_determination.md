# FIX 2 — Mailing-Citation Review Packet — §5 Determination (Broker Compliance Review)

**Original packet:** `fix2_mailbox_citation_review_packet_2026-06-10.md` (build side, engineering facts)
**Determination author:** Jack Taglyan, California Real Estate Broker, CalDRE license #[INSERT]
**Determination posture:** Broker compliance review against published primary sources. Not attorney legal opinion. No California-licensed attorney has reviewed this determination. If a user of OwnerPilot AI needs attorney review of any specific citation in a notice produced by the engine, they should consult a California licensed attorney of their choosing.
**Date:** 2026-06-10

---

## §5 Determination

### Determination

**NO CHANGE. FIX 2 closes as no-action.**

The current codebase is correct. Specifically:

1. **The Proof of Service header citation is already correct** as `§ 1162` in both render sites (`POS_PROSE.faceCitation` and `FORM_META.posFooterCitation`). Service of a three-day notice is governed by CCP § 1162, which enumerates the three valid service methods (personal, substituted, posting-and-mailing). The header is right.

2. **The page-1 mailbox-rule sentence citation is already correct** as `Cal. Code Civ. Proc. § 1161(2)`. The rule that a tenant's payment by mail in response to a three-day notice is deemed received on the date of posting (provided the tenant can show proof of mailing) is set out inside CCP § 1161(2) itself, not in CCP § 1013(a).

3. **The original FIX 2 spec (in `prompt_for_claude_fix1_fix2_2026-06-10`) was incorrect on the page-1 citation.** The spec assumed the page-1 mailing line cited § 1013(a) and instructed engineering to leave it unchanged. The codebase already correctly cited § 1161(2) under the A1 Part D countersign lock dated 2026-06-04. The spec's mental model was stale; the codebase was right. The build side correctly investigated before applying the spec verbatim and produced this review packet instead of making an incorrect change.

### Why § 1013(a) does not apply to the page-1 mailbox-rule sentence

CCP § 1013(a) governs **service of court papers by mail in litigation**. It is the statute that makes a paper "deemed served" the date it is deposited in the mail and that extends response deadlines by five calendar days when service is by mail. It applies to *parties serving litigation documents on other parties or counsel during a pending case.*

CCP § 1013(a) does **not** govern *tenant payment by mail in response to a pre-litigation three-day notice.* That rule is in CCP § 1161(2) itself, which is the unlawful-detainer statute governing the three-day notice and includes the deemed-received-on-mailing language for tenant payment.

A citation to § 1013(a) on the face of a three-day notice in connection with the tenant's payment-by-mail option would be a citation error. The codebase does not contain that error; the codebase cites § 1161(2), which is correct.

### Why my prior FIX 2 prompt was wrong

When I drafted FIX 2 in the Claude-prompt deliverable earlier today, I carried over a misremembered citation from earlier in the engagement record. I did not verify the citation against the actual codebase or against the current statutory text before issuing the spec. The build side caught the discrepancy by grepping the codebase against the spec's assumed strings, found no match, and stopped to ask rather than ship an incorrect change.

This is exactly the verification discipline I want preserved. The build side's instinct — investigate the actual codebase before applying a spec verbatim, especially when the spec touches a locked constant — is the right instinct. I'd rather receive a review packet flagging a spec error than have the spec applied verbatim and produce a regression. **This packet's existence is a good outcome, not an obstacle.**

### Replacement wording (verbatim, if any)

**None.** The current locked text stands unchanged:

> If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. § 1161(2).)

The Proof of Service header stands unchanged at:

> Declaration of Service · California Code of Civil Procedure § 1162

The Proof of Service footer stands unchanged at:

> Proof of Service · Cal. Code Civ. Proc. § 1162

### Other rendered citations — review status

I confirmed against published primary sources that the following citations elsewhere in the engine should also remain unchanged:

- **§ 1161(2)** as the title-line statute for the three-day notice to pay rent or quit — correct.
- **§ 1162** on the Proof of Service header and footer — correct.
- **§ 1174** for the forfeiture-election language ("The landlord hereby elects to declare a forfeiture…") — correct.
- **AB 2343 (codified at CCP § 1161(2)(C))** for the weekend/holiday exclusion in the day-count engine — correct.

If any other citation in the engine surfaces a question during future review, it gets its own packet.

### Determined by

Jack Taglyan
California Real Estate Broker, CalDRE license #[INSERT]
Broker compliance review against published California primary sources:
- California Code of Civil Procedure § 1161 (text as currently in force)
- California Code of Civil Procedure § 1162 (text as currently in force)
- California Code of Civil Procedure § 1013 (text as currently in force, for the negative determination that it does not govern tenant payment by mail in response to a three-day notice)

Primary-source URLs (for the audit trail):
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1013.

(Citations checked against the leginfo text on 2026-06-10. The CA 3-day statute watch task, ID `2a58382e`, monitors these sections for amendments twice a year.)

### Signature / written-confirmation reference

**Jack Taglyan, Broker, CalDRE license #[INSERT] · 2026-06-10**

This determination is broker compliance review and does not constitute legal advice. It is grounded in the published text of the California Code of Civil Procedure and does not require, claim, or imply attorney review.

---

## Disposition

- **FIX 2 closes as NO ACTION.** No code change. No template change. No test change.
- **The original FIX 2 prompt is superseded by this determination.** Any future spec that touches locked constants must check the actual codebase before issuing instructions to change verbatim-locked strings. I'll note this for myself going forward.
- **The build side's review-packet process is the correct response to a spec/codebase mismatch on a locked constant.** Preserve this discipline. If a future spec from me or anyone else asks for an edit to a locked constant and the spec doesn't match the codebase, produce a review packet first, ship nothing until §5 is filled in.
- **Build side may close FIX 2 as no-action** referencing this determination file. The original FIX 1 (LLC management-type intake) proceeds independently and is unaffected by this determination.

---

**End of §5 determination.**

Filed: `fix2_mailbox_citation_review_packet_2026-06-10_broker_determination.md`
Companion to: `fix2_mailbox_citation_review_packet_2026-06-10.md` (engineering packet)
