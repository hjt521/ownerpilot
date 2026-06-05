# Close-Out Notes for Attorney Ratification

**Prepared by:** build side · 2026-06-05
**For:** reviewing attorney ratification (per consolidated-review ruling §2 — drafting authorized)
**Contents:** 2.1 Defect #1 schema close-out · 2.2 (held) · 2.3 older-items confirmation. Each drafted for one-paragraph ratification.

---

## 2.1 — Defect #1 (Stage-1 landlord-identity schema) close-out

**What landed.** Step 3 became a two-stage landlord-identity capture (individual vs entity → branch-specific fields). `landlordIdentity` (discriminated union) is the single source of truth for who the landlord is; `signerCapacity` is the canonical signer-capacity field.

**`signerRole` lifecycle.** Through Stage-1, a legacy derived `signerRole` was retained as a transitional value so the then-unchanged individual face renderer kept working while the canonical `signerCapacity` was introduced. Defect #3 then **fully removed** `signerRole`: the individual signature face now derives its role label directly from `signerCapacity` (`signerCapacityLabel`), the entity face renders the entity signature block, and the shared test fixture (`landlord.fixture.ts`) was updated once. No `signerRole` field, type, or derivation remains in the logic layer or the UI write path.

**Deferred link resolved.** The individual owner-name → Step-4 payee connection deferred from Defect #1 is resolved by the Defect #2 derivation: the §1161(2) payee line is composed from `landlordIdentity` (owner line or entity legal name), with the non-landlord override, via the single locked `derivePayeeName` helper.

**Net assessment.** The Stage-1 schema landed as designed; the two transitional items it created (`signerRole` retention, owner-name link) are both now closed by Defects #3 and #2 respectively.

**Requested ratification:** one paragraph confirming the schema-implementation review is accepted as described.

---

## 2.2 — gates.v4 test rewrite

**HELD.** Per ruling §2.2, this is folded into §1.2 (v4 HOW TO PAY sign-off reconstruction) and is not ratified separately. Disposition follows the §1.2 outcome:

- If §1.2 resolves to "a ruling exists, comments are clerical," the gates.v4 "valid config produces" rewrite is downstream of that and gets ratified in the same paragraph.
- If §1.2 resolves to "no verbatim sign-off exists," the rewrite reverts to asserting "blocked by pending sign-off" alongside whatever flag disposition you order.

No action requested here; see the separate reconstruction packet.

---

## 2.3 — Older items: confirmation from current code (for retire/confirm)

### EFT-not-sole guard (verbatim error string)

**Located, intact.** `lib/payments/validatePaymentBranch.ts`: the `EFT_REQUIRES_NON_EFT_PRIMARY` blocker (code declared line 55; pushed lines ~294–308) carries the verbatim error string ending "...previously established with the tenant (Cal. Code Civ. Proc. § 1161(2))." The rule — EFT may be an additional method only when previously established, never the sole method — is enforced as a fail-closed validator blocker, cross-referenced to the A1 countersign (2026-06-04) at line 285.

**Requested ratification:** confirm the EFT-not-sole guard is closed and may be formally retired from the open list.

### Review-step bank attestations (placement)

**Located, intact.** `components/notice-flow.tsx`: `BankDepositAttestations` (function at line ~939) is the single shared component rendering the two §1161(2) bank-deposit attestation labels — the paper-instrument confirmation ("check, money order, or cashier's check," line ~958) and the within-five-miles confirmation (line ~972). It is rendered from both the payment step and the Review step, writing the same flow-data fields, so the labels are byte-identical on both surfaces and the produce gate reads one source.

**Requested ratification:** confirm the Review-step attestation placement is closed and may be formally retired.

---

## Summary for ratification

| Item | Status | Asked of attorney |
|---|---|---|
| 2.1 Defect #1 schema close-out | Drafted | One-paragraph acceptance |
| 2.2 gates.v4 test rewrite | Held → §1.2 | None (follows §1.2) |
| 2.3 EFT guard + Review attestations | Confirmed in code | Confirm + formally retire both |

---

— Build side · close-out drafts for ratification · 2026-06-05
