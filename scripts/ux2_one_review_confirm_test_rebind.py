from pathlib import Path

p = Path('lib/flow/gates.v4.test.ts')
text = p.read_text()

replacements = [
    (
        "  bank.bankBranchWithinFiveMilesAttested = true;\n  const r2 = evaluateCanProduceV4(bank);",
        "  bank.bankBranchWithinFiveMilesAttested = true;\n  Object.assign(bank, bindReviewApproval(bank, '2026-08-10T00:01:00.000Z'));\n  const r2 = evaluateCanProduceV4(bank);",
    ),
    (
        "  Object.assign(e, entityLandlord('officer_member_trustee')); // entity + signerTitle 'Managing Member'\n  const r = evaluateCanProduceV4(e);",
        "  Object.assign(e, entityLandlord('officer_member_trustee')); // entity + signerTitle 'Managing Member'\n  Object.assign(e, bindReviewApproval(e, '2026-08-10T00:02:00.000Z'));\n  const r = evaluateCanProduceV4(e);",
    ),
    (
        "  d.authorityEvidenceOnFile = true;\n  const r = evaluateCanProduceV4(d);",
        "  d.authorityEvidenceOnFile = true;\n  Object.assign(d, bindReviewApproval(d, '2026-08-10T00:03:00.000Z'));\n  const r = evaluateCanProduceV4(d);",
    ),
]

for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f'expected one gate-test rebind marker, found {text.count(old)}: {old!r}')
    text = text.replace(old, new, 1)

p.write_text(text)
print('UX2 gate tests updated to reconfirm after material mutations')
