import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  GENERIC_CAO_CONTRACT_VERSION,
  GENERIC_CAO_FAILURE_PHASES,
  GENERIC_CAO_LIFECYCLE_STATES,
  GENERIC_CAO_TERMINATION_REASONS,
} from './genericCaoContract';

const source = readFileSync(
  new URL('./genericCaoContract.ts', import.meta.url),
  'utf8',
);

assert.equal(
  GENERIC_CAO_CONTRACT_VERSION,
  'generic-cao-contract-v1',
);

assert.deepEqual(
  [...GENERIC_CAO_LIFECYCLE_STATES],
  [
    'draft',
    'awaiting_human_review',
    'approved_for_draft_use',
    'revision_required',
    'rejected',
    'terminated',
  ],
);

assert.deepEqual(
  [...GENERIC_CAO_FAILURE_PHASES],
  [
    'assignment_validation',
    'authority_validation',
    'evidence_intake',
    'deliberation',
    'output_validation',
    'human_review',
    'termination',
  ],
);

assert.deepEqual(
  [...GENERIC_CAO_TERMINATION_REASONS],
  [
    'completed_for_human_review',
    'invalid_assignment',
    'authority_not_established',
    'evidence_unavailable',
    'evidence_insufficient',
    'prohibited_action_required',
    'approval_required',
    'limit_reached',
    'execution_failure',
    'human_termination',
  ],
);

for (const pattern of [
  /^import\s/m,
  /^export\s+(?:async\s+)?function\s/m,
  /^export\s+class\s/m,
  /\b(?:fetch|createGateway|generateText)\s*\(/,
]) {
  assert.doesNotMatch(
    source,
    pattern,
    `Generic CAO contract must remain nonexecuting: ${pattern}`,
  );
}

for (const pattern of [
  /OwnerPilot/i,
  /\blandlord\b/i,
  /\btenant\b/i,
  /\bCalifornia\b/i,
  /Los Angeles/i,
  /\bbroker\b/i,
  /\battorney\b/i,
  /\bnotice\b/i,
  /\bpayment\b/i,
  /\bconstitutional\b/i,
  /\bADR-/i,
  /\bEA-/i,
  /\bOPOS\b/i,
  /\bOPIL\b/i,
  /\bBTRM\b/i,
  /\bRCO-/i,
  /\bDECG-/i,
  /\bAEDL\b/i,
  /\bAEOS\b/i,
  /\bAML\b/i,
  /\bOPML\b/i,
  /\bhjt521\b/i,
  /\bGitHub\b/i,
  /\bVercel\b/i,
  /\bSupabase\b/i,
  /\bOpenAI\b/i,
  /\bAnthropic\b/i,
  /\bGateway\b/i,
  /\bPreview\b/i,
  /\bProduction\b/i,
  /enterprise[- ]definition/i,
  /enterprise compiler/i,
  /manifest runtime/i,
  /code generation/i,
]) {
  assert.doesNotMatch(
    source,
    pattern,
    `Generic CAO contract crossed its neutrality boundary: ${pattern}`,
  );
}

for (const required of [
  "authorityGrantingMode: 'external_only'",
  'implementationAuthorityGranted: false',
  'autonomousContinuationAllowed: false',
  'retryAuthorized: false',
  'repairAuthorized: false',
  'continuationAuthorized: false',
  'implementationPerformed: false',
  'externalActionPerformed: false',
  'autonomousContinuationPerformed: false',
]) {
  assert.ok(
    source.includes(required),
    `Missing authority or termination invariant: ${required}`,
  );
}

console.log('genericCaoContract tests passed');
