import { strict as assert } from 'node:assert';

import {
  CAO_WORKBENCH_LABELS,
  validateCaoWorkbenchOutput,
} from './caoPreviewOutput';

const commit = 'a'.repeat(40);
const hash = 'b'.repeat(64);

function validOutput() {
  return {
    labels: CAO_WORKBENCH_LABELS,
    disposition: 'acceptable_with_revisions',
    executiveSummary: 'A bounded architecture recommendation.',
    objective: 'Complete the restricted CAO Preview workbench.',
    evidenceReviewed: [
      {
        path: 'docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md',
        sourceCommit: commit,
        sha256: hash,
        immutableReference:
          `github:hjt521/ownerpilot@${commit}:docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md`,
      },
    ],
    sourceCommit: commit,
    evidenceLimitations: ['PR #338 remains noncanonical.'],
    currentStateFindings: ['The current route accepts one evidence item.'],
    targetStateInterpretation: ['Use server-collected bounded evidence.'],
    architectureOptions: [
      {
        name: 'Server bundle',
        description: 'Collect approved files server-side.',
        tradeoffs: ['Requires bounded network reads.'],
        securityConsequences: ['No client token exposure.'],
        authorityConsequences: ['Read-only evidence only.'],
      },
      {
        name: 'Pasted packet',
        description: 'Continue browser-pasted evidence.',
        tradeoffs: ['Cannot verify repository provenance.'],
        securityConsequences: ['No repository read integration.'],
        authorityConsequences: ['Human remains evidence assembler.'],
      },
    ],
    tradeoffs: ['Reliability versus implementation size.'],
    recommendedArchitecture: 'Use the server bundle.',
    recommendationConfidence: 'moderate',
    confidenceRationale:
      'Repository evidence is sufficient but Preview acceptance remains pending.',
    securityAndAuthorityBoundaries: ['No repository writes.'],
    dependencies: ['Existing CAO Preview route.'],
    fileLevelImplementationMap: [
      {
        path: 'lib/agents/caoRepositoryEvidence.ts',
        action: 'add',
        purpose: 'Collect approved evidence.',
        dependencies: ['GitHub raw content endpoint.'],
      },
    ],
    testStrategy: ['Reject secret paths.'],
    rolloutPlan: ['Deploy to isolated Preview.'],
    rollbackPlan: ['Revert the bounded PR.'],
    risks: ['Unavailable GitHub evidence.'],
    unknowns: ['Final acceptance latency.'],
    dissentOrCompetingInterpretation: ['A static bundle may be simpler.'],
    founderDecisionsRequired: ['Accept or reject the completion packet.'],
    engineeringHandoff: ['No autonomous continuation.'],
    autonomousContinuationProhibited: true,
  } as const;
}

{
  const result = validateCaoWorkbenchOutput(validOutput());
  assert.equal(result.ok, true);
  assert.ok(result.value);
}

{
  const input = { ...validOutput(), labels: ['ADVISORY'] };
  const result = validateCaoWorkbenchOutput(input);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('labels:invalid'));
}

{
  const input = {
    ...validOutput(),
    autonomousContinuationProhibited: false,
  };
  const result = validateCaoWorkbenchOutput(input);
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.includes(
      'autonomousContinuationProhibited:must_be_true',
    ),
  );
}

{
  const input = {
    ...validOutput(),
    evidenceReviewed: [
      {
        ...validOutput().evidenceReviewed[0],
        sourceCommit: 'c'.repeat(40),
      },
    ],
  };
  const result = validateCaoWorkbenchOutput(input);
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.includes(
      'evidenceReviewed:source_commit_mismatch',
    ),
  );
}

{
  const input = {
    ...validOutput(),
    architectureOptions: [
      validOutput().architectureOptions[0],
    ],
  };
  const result = validateCaoWorkbenchOutput(input);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('architectureOptions:invalid'));
}

console.log('caoPreviewOutput tests passed');
