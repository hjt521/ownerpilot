# FIX 2 — Mailing-Citation Review Packet (locked-constant change process)
Prepared: 2026-06-10 (Session 5). Engineering facts only.
The DETERMINATION section (§5) is intentionally blank. It must be completed by
a qualified source of the user's choosing. No legal wording or citation
determination in this document was authored by Claude.

---

## 1. What triggered this review

The FIX 2 spec instructed: change the Proof of Service header citation
"§1013 → §1162" and keep the page-1 mailing line at "§1013(a)".

Investigation of the actual renderer (2026-06-10, grep of `lib/produce` and
`components/notice-flow.tsx`) found the spec does not match the codebase:

- The string "1013" appears NOWHERE in the renderer or wizard.
- The Proof of Service header ALREADY cites §1162, in both places it renders:
  - `POS_PROSE.faceCitation` = "Declaration of Service · California Code of
    Civil Procedure § 1162" (lib/produce/renderNotice.ts, line ~211)
  - `FORM_META.posFooterCitation` = "Proof of Service · Cal. Code Civ. Proc.
    § 1162" (line ~70)
- The page-1 mailing line is `NOTICE_PROSE.mailboxRuleSentence` (line ~170).
  Its current verbatim text:

  > If you mail your payment to the name and address above, it is conclusively
  > presumed received on the date posted, provided you can show proof of
  > mailing. (Cal. Code Civ. Proc. § 1161(2).)

  It cites §1161(2), not the §1013(a) the spec assumed.

## 2. Lock status of the constant under review

`mailboxRuleSentence` is marked in source:

> LOCKED 2026-06-04 (A1 Part D countersign) — § 1161(2) mailbox-rule (deemed
> received on date posted).

It is one of the 13 v4 HOW-TO-PAY locked prose constants. The module header of
`lib/produce/renderNotice.ts` states that any string-level change to these
constants requires a fresh review packet. This document is that packet's
engineering half.

## 3. The question to be determined (by the qualified source)

For the mailbox-rule sentence on the face of a California 3-Day Notice to Pay
Rent or Quit:

a) Is the current citation "(Cal. Code Civ. Proc. § 1161(2).)" correct as the
   authority for the deemed-received-on-mailing statement?
b) If not, what is the correct citation (e.g., §1013(a), §1161(2), both, or
   other), and what is the EXACT replacement sentence, supplied verbatim?
c) Does any other rendered citation (POS header §1162; notice footer §1161(2))
   require change?

Context the source may want: the sentence was reviewed and locked under the
A1 Part D countersign dated 2026-06-04, which post-dates the FIX 2 spec's
assumptions. The spec may simply be stale.

## 4. What happens after determination

- If the determination is NO CHANGE: FIX 2 closes as no-action; record the
  determination below and file this packet.
- If the determination is a wording/citation change: the user supplies the
  exact replacement string; engineering wires it in verbatim via an
  exact-match-or-abort patch, updates the test pins, and records the fresh
  sign-off reference here. The change does not ship without §5 completed.

## 5. DETERMINATION (to be completed by the qualified source — leave blank otherwise)

Determination:

Replacement wording (verbatim, if any):

Determined by (name / qualification / date):

Signature or written-confirmation reference:
