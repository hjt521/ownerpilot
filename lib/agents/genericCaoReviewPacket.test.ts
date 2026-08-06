import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const packet = readFileSync(
  new URL(
    '../../docs/architecture/executive-agents/generic_cao_boundary_pr_b_review_packet_2026-08-06.md',
    import.meta.url,
  ),
  'utf8',
);

const normalizedPacket = packet
  .replace(/\s+/g, ' ')
  .trim();

for (const required of [
  '# PR B Review Packet — Generic CAO Contract Boundary',
  '**Status:** DRAFT — Founder review required',
  '## 4. Layer A — Generic CAO Core',
  '## 5. Business-adapter boundary',
  '## 6. Layer B — OwnerPilot CAO Specialization',
  '## 7. Evidence-based component classification',
  '## 8. Universality test',
  '## 9. Layer C — Platform and security separation',
  '## 10. Runtime and behavior preservation',
  '## 11. Nonexecuting context-field analysis',
  '## 12. Future Enterprise-Definition Compatibility — Reservation Only',
  'No enterprise-definition language is selected.',
  'No AEDL or AML adoption is occurring.',
  'No compiler or generator is authorized.',
  'No manifest runtime is authorized.',
  'No executable enterprise construction is authorized.',
  'Future compatibility will require separate reconciliation against stable AEOS artifacts.',
  'OwnerPilot remains independently governed and operationally independent.',
  'No merge or Production deployment is authorized by this packet.',
]) {
  assert.ok(
    normalizedPacket.includes(required),
    `Missing required PR B review statement: ${required}`,
  );
}

for (const prohibited of [
  /^AEDL is adopted\\.?$/im,
  /^AML is adopted\\.?$/im,
  /^Enterprise Compiler is implemented\\.?$/im,
  /^Manifest runtime is authorized\\.?$/im,
  /^Executable enterprise construction is authorized\\.?$/im,
  /^Generic CAO grants authority\\.?$/im,
  /^Adapter grants authority\\.?$/im,
]) {
  assert.doesNotMatch(
    packet,
    prohibited,
    `PR B review packet contains an unauthorized claim: ${prohibited}`,
  );
}

console.log('genericCaoReviewPacket tests passed');
