import {
  strict as assert,
} from 'node:assert';

import {
  buildCaoPreviewEvidenceBundle,
} from './caoPreviewWorkbench';

import type {
  CaoRepositoryEvidencePacket,
} from './caoRepositoryEvidence';

const sourceCommit =
  'b4d183573352a3fed2c072dab9fffbfaf3c21eab';

const files: CaoRepositoryEvidencePacket['files'] =
  Array.from({ length: 11 }, (_, index) => ({
    repository: 'hjt521/ownerpilot' as const,
    sourceCommit,
    path: `docs/agents/evidence-${index + 1}.md`,
    immutableReference:
      `github:hjt521/ownerpilot@${sourceCommit}:docs/agents/evidence-${index + 1}.md`,
    classification:
      'approved_non_sensitive_repository_derived' as const,
    availability: 'available' as const,
    sha256: String(index + 1).repeat(64).slice(0, 64),
    originalBytes: 2_000,
    includedBytes: 2_000,
    truncated: false,
    content: `evidence-file-${index + 1}\n${'x'.repeat(1_980)}`,
  }));

const packet: CaoRepositoryEvidencePacket = {
  version: 'cao-repository-evidence-v1',
  scopeId: 'enterprise_workforce_recovery',
  repository: 'hjt521/ownerpilot',
  sourceCommit,
  collectedAt: '2026-08-05T02:20:00.000Z',
  fileCount: files.length,
  totalIncludedBytes: files.reduce(
    (total, file) => total + file.includedBytes,
    0,
  ),
  truncated: false,
  unavailableEvidence: false,
  files,
};

const bundle = buildCaoPreviewEvidenceBundle(packet);

assert.ok(
  bundle.length <= 4_000,
  `bundle length ${bundle.length} exceeded the legacy Preview item limit`,
);

for (const file of files) {
  assert.match(
    bundle,
    new RegExp(`FILE: ${file.path}`),
    `bundle omitted approved evidence path ${file.path}`,
  );
}

assert.match(bundle, /EVIDENCE MANIFEST/);
assert.match(bundle, new RegExp(sourceCommit));

console.log(
  '  ✓ CAO evidence bundle remains within 4 KB and references every approved file',
);
