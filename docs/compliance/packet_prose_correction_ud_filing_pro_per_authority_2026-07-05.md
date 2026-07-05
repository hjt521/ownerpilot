# Packet Prose Correction — UD Filing Pro Per Authority

**Date:** 2026-07-05
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering) — packet assembly script + delivered document correction
**Re:** COMPLIANCE ATTESTATION prose on Combined Filing Packet cover page contains the same mandatory-attorney defect just corrected in the persona
**Companion ruling:** [`persona_correction_ud_filing_pro_per_authority_2026-07-05.md`](persona_correction_ud_filing_pro_per_authority_2026-07-05.md) (persona/system-prompt surface — this ruling covers the packet-assembly surface)
**Priority:** HIGH — defect is embedded in a document already delivered to the operator for the Clifton Alexander UD filing. Regeneration + re-share required before the packet is used at the Superior Court filing counter.

---

## The defect

The Combined Filing Packet delivered to the operator on 2026-07-03 (`5537LaMirada-202-CliftonAlexander_Combined_Packet_LAHD_and_UD_2026-07-03.pdf`, 58 pages) contains a **COMPLIANCE ATTESTATION** block on page 1 with the following verbatim prose:

> "This packet is broker-generated compliance workflow product, produced under the supervision of a California Licensed Real Estate Broker (CalDRE B9445457). **It is not legal advice; a licensed California attorney must review and sign the UD-100 complaint packet before filing with the Superior Court of California, County of Los Angeles.**"

The bolded sentence is the defect. It asserts an attorney-mandate for UD filing that does not exist under California law. Source location: `/home/user/workspace/rebuild_combined_packet.py` lines 53–56 (`attestation_lines` list in the `make_cover()` function).

This is the same class of defect the agent just corrected in the persona ruling (see companion), but embedded in delivered packet prose rather than persona output. Both must be corrected; this ruling handles the packet surface.

---

## The correct legal position

Same doctrinal foundation as the companion persona ruling — restated here so this ruling stands on its own for Claude:

- **Natural-person landlords** have an unqualified right to file UD complaints in Superior Court in pro per (Cal. Code Civ. Proc. § 1161 et seq.). No statute conditions UD filing on attorney involvement.
- **Entity landlords** (LLC, corporation, partnership, trust) generally must appear through counsel at contested hearings under [*Merco Constr. Engineers, Inc. v. Municipal Court* (1978) 21 Cal.3d 724](https://scholar.google.com/scholar_case?case=17020548681748301538) — **but** a natural person authorized to sign for the entity (managing member, officer, general partner, trustee) may prepare and sign filing documents. The Merco rule governs *appearance* at hearings; it does not gate *document preparation and filing* at the clerk's counter.
- **Licensed real estate brokers** (Cal. Bus. & Prof. Code § 10131(b)) may prepare landlord-tenant filings including UD-100 packets. This is OwnerPilot's operating authority under CalDRE B9445457.
- **Court filing itself** is administrative. The clerk does not verify attorney status.
- **Judicial Council of California Self-Help Center** ([selfhelp.courts.ca.gov/eviction-landlord](https://selfhelp.courts.ca.gov/eviction-landlord)) documents the pro per landlord path form-by-form for UD-100, SUM-130, CM-010, LACIV-109, and LASC CIV 312.

---

## The correction — replacement COMPLIANCE ATTESTATION prose

Replace the current `attestation_lines` block in `rebuild_combined_packet.py` (lines 53–67) with the following. Line breaks preserved for the PDF layout (10pt Helvetica, 0.6" left margin, ~7.5" text width):

```python
attestation_lines = [
    "This packet is broker-generated compliance workflow product, produced under the supervision of a",
    "California Licensed Real Estate Broker (CalDRE B9445457, Cal. Bus. & Prof. Code \u00a7 10131(b)). It is not",
    "legal advice. California landlords may file the UD-100 complaint packet and its supporting forms in",
    "Superior Court in pro per under Cal. Code Civ. Proc. \u00a7 1161 et seq. \u2014 no attorney is required to file.",
    "Natural-person landlords file directly. Entity landlords (LLC, corporation, partnership, trust) have their",
    "authorized signer (managing member, officer, general partner, trustee) prepare and sign the packet;",
    "whether the entity's signer or an attorney appears at contested hearings is a separate procedural",
    "question that does not affect the filing-readiness of this document set. An attorney may be advisable in",
    "specific circumstances (contested tenant defenses, wrongful-eviction counterclaims, subsidized-housing",
    "overlays, bankruptcy stays, complex fact patterns), but is not a filing prerequisite.",
    "",
    "The LAHD Pre-Filing Packet (Section 1) reflects documents actually served and filed on the dates shown;",
    "historical documents are preserved verbatim. See the Compliance Corrigenda page immediately following",
    "this cover for known premise-address drift between the served POS and the lease-corrected canonical",
    "address.",
    "",
    "Fields in the UD Complaint Packet (Section 2) tagged [BROKER-INPUT] require broker confirmation prior",
    "to filing:",
    "  (1) LASC branch (Stanley Mosk / Norwalk / Chatsworth / etc.)",
    "  (2) Court street address, city, and zip",
    "  (3) Signer of record address (pro per Jack Taglyan as Legally Authorized Signer for P tag L LLC)",
    "  (4) LLC Secretary of State name confirmation for 'P tag L LLC' (verbatim spelling per lease \u00a72)",
]
```

**Diff summary vs. current:**

1. Deleted: "a licensed California attorney must review and sign the UD-100 complaint packet before filing with the Superior Court of California, County of Los Angeles."
2. Inserted: A five-line block affirming pro per authority under § 1161 et seq., distinguishing natural-person from entity filing, naming who may sign for an entity, and preserving the "attorney may be advisable in specific circumstances" fact-specific framing.
3. Renamed [BROKER-INPUT] item (3) from "Attorney of record address" to "Signer of record address" — same reason: OwnerPilot packets are not attorney-of-record packets, they are broker-supervised pro per packets. "Attorney of record" is a term of art that only applies when an attorney has appeared; using it in a pro per packet is inconsistent with the corrected posture.

**Attestation block will grow from 15 lines to ~22 lines.** Verify the block still fits above the footer signature (line drawn at `H - 5.75*inch`, decrementing by `0.18*inch` per line → block bottom now sits at approximately `H - 5.75*inch - 22 * 0.18*inch ≈ H - 9.71*inch`). At LETTER (11" tall), that's within the 0.6" bottom margin above the footer at `y=0.6*inch`. If layout runs tight during regeneration, drop the vertical spacing between paragraphs from `0.18*inch` to `0.16*inch`, or move the [BROKER-INPUT] confirmation block to a second cover-continuation page.

---

## Engineering close-out

1. **Update `rebuild_combined_packet.py`** — replace lines 53–67 (`attestation_lines`) with the block above; rename [BROKER-INPUT] item (3) from "Attorney of record" to "Signer of record"
2. **Regenerate `5537LaMirada-202-CliftonAlexander_Combined_Packet_LAHD_and_UD_2026-07-03.pdf`** with corrected prose (re-share to operator under same asset name for version history)
3. **Add a lint step to the packet-assembly build** that greps the assembled PDF text output for the eight banned phrases enumerated in `persona_correction_ud_filing_pro_per_authority_2026-07-05.md` §"Runtime banned-phrase additions". This is the same list — reuse it. If any of those phrases appear in packet prose, the build fails with a compliance-drift error and the operator regenerates after correction. This closes the loop so a mandatory-attorney framing cannot silently re-enter delivered documents.
4. **Search-and-replace across all packet-assembly scripts and templates** for the eight banned phrases. Every hit is a defect; correct with the same posture as this ruling (pro per authority under § 1161 et seq., broker supervision under § 10131(b)).
5. **Add a test** that renders a synthetic cover page and asserts the rendered PDF text does not contain any of the eight banned phrases. Run in CI on every packet-assembly script change.

---

## Delivered-document remediation for Clifton Alexander

The specific packet already delivered to the operator for the Clifton Alexander filing is being regenerated by the agent immediately following this ruling, using the corrected `rebuild_combined_packet.py`, and re-shared under the same asset name (`5537LaMirada-202-CliftonAlexander_Combined_Packet_LAHD_and_UD_2026-07-03`) so the version history is preserved and the operator can toggle between the two versions.

The operator **should use the corrected version at the Superior Court filing counter.** The defective version should not be filed, because the "attorney must review and sign" language could invite clerk pushback or later mootness challenges based on the packet's own statement about attorney involvement (even though the underlying legal position — pro per filing — is correct, having a document that self-describes as requiring attorney sign-off and then being filed pro per is an unnecessary friction point).

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`, unchanged. Broker-only attribution; no attorney attribution anywhere in the corrected packet.

---

## Relationship to companion ruling

- **This ruling (packet prose)** corrects delivered-document text and the assembly script. Remediation is a script edit + regeneration + CI lint.
- **[`persona_correction_ud_filing_pro_per_authority_2026-07-05`](persona_correction_ud_filing_pro_per_authority_2026-07-05.md)** corrects the persona reference context + runtime output gate. Remediation is a system-prompt-lock update + banned-phrase gate additions.
- Both cite the same authorities and use compatible language. If future audit surfaces the same defect in a third surface (e.g., marketing copy, in-app tooltips), a third narrow ruling should be issued rather than expanding either of these — one surface per ruling keeps the audit trail clean and the engineering scope focused.

---

## Ratification & signature

This correction is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **packet_prose_correction_ud_filing_pro_per_authority_2026-07-05**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
