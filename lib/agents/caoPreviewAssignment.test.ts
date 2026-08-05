import { strict as assert } from 'node:assert';

import {
  CAO_ASSIGNMENT_VERSION,
  validateCaoPreviewAssignment,
} from './caoPreviewAssignment';

import {
  CAO_EVIDENCE_SCOPES,
} from './caoRepositoryEvidence';

import {
  CAO_PREVIEW_APPROVAL_REFERENCE,
} from './caoPreviewRegistry';

function validAssignment() {
  return {
    version: CAO_ASSIGNMENT_VERSION,
    taskClass: 'architecture_analysis',
    runId: 'synthetic-cao-workbench-001',
    objective: 'Analyze the enterprise workforce recovery package and recommend the bounded next architecture.',
    evidenceScopeId: 'enterprise_workforce_recovery',
    sourceCommit: CAO_EVIDENCE_SCOPES.enterprise_workforce_recovery.sourceCommit,
    constraints: ['No implementation.', 'No Production action.'],
    knownDecisions: ['PR #338 remains Draft.'],
    unresolvedQuestions: ['When should the Repository Developer Operator begin?'],
    founderApprovalReference: CAO_PREVIEW_APPROVAL_REFERENCE,
    requestedOutputType: 'architecture_recommendation',
    explicitHumanInitiation: true,
    sensitiveContentPresent: false,
  } as const;
}

{
  const result = validateCaoPreviewAssignment(validAssignment());
  assert.equal(result.ok, true);
  assert.ok(result.value);
}

{
  const result = validateCaoPreviewAssignment({
    ...validAssignment(),
    sourceCommit: 'f'.repeat(40),
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('source_commit_mismatch'));
}

{
  const result = validateCaoPreviewAssignment({
    ...validAssignment(),
    evidenceScopeId: 'arbitrary_repository',
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('unapproved_evidence_scope'));
}

{
  const result = validateCaoPreviewAssignment({
    ...validAssignment(),
    founderApprovalReference: 'stale-approval',
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('missing_founder_approval_reference'));
}

{
  const result = validateCaoPreviewAssignment({
    ...validAssignment(),
    explicitHumanInitiation: false,
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('human_initiation_required'));
}

{
  const result = validateCaoPreviewAssignment({
    ...validAssignment(),
    arbitraryPath: '.env.production',
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('unknown_field'));
}

console.log('caoPreviewAssignment tests passed');
