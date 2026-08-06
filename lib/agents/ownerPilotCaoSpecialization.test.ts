import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  CAO_EVIDENCE_SCOPES,
} from './caoRepositoryEvidence';

import {
  CAO_PREVIEW_ALLOWED_TASK_CLASSES,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_REGISTRY_ENTRY,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
} from './executiveAgentsPreviewRouteContract';

import {
  OWNERPILOT_CAO_SPECIALIZATION,
  OWNERPILOT_CAO_SPECIALIZATION_VERSION,
} from './ownerPilotCaoSpecialization';

const source = readFileSync(
  new URL(
    './ownerPilotCaoSpecialization.ts',
    import.meta.url,
  ),
  'utf8',
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION_VERSION,
  'ownerpilot-cao-specialization-v1',
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .enterpriseIdentity,
  'OwnerPilot',
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .executiveIdentity,
  'executive.chief_architecture_officer',
);

assert.deepEqual(
  OWNERPILOT_CAO_SPECIALIZATION
    .taskClasses
    .map(item => item.taskClass),
  [...CAO_PREVIEW_ALLOWED_TASK_CLASSES],
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .approvedEvidenceScopes[0]
    .scopeId,
  CAO_EVIDENCE_SCOPES
    .enterprise_workforce_recovery.id,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .approvedEvidenceScopes[0]
    .sourceReferences,
  CAO_EVIDENCE_SCOPES
    .enterprise_workforce_recovery.paths,
);

assert.deepEqual(
  OWNERPILOT_CAO_SPECIALIZATION
    .vocabulary
    .map(item => item.preferredLabel),
  [...EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS],
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .modelRequirements[0]
    .eligibleModelIdentifiers[0],
  CAO_PREVIEW_REGISTRY_ENTRY
    .primaryModel.modelId,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .environmentEligibility
    .find(item => item.environmentId === 'preview')
    ?.eligible,
  true,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .environmentEligibility
    .find(item => item.environmentId === 'production')
    ?.eligible,
  false,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .authoritySourceReferences[0],
  CAO_PREVIEW_APPROVAL_REFERENCE,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .authorityGrantingMode,
  'reference_only',
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .adapterGrantsAuthority,
  false,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .runtimeConstructionAllowed,
  false,
);

assert.equal(
  OWNERPILOT_CAO_SPECIALIZATION
    .automaticActivationAllowed,
  false,
);

for (const item of
  OWNERPILOT_CAO_SPECIALIZATION.taskClasses) {
  assert.equal(item.advisoryOnly, true);
  assert.equal(item.grantedByAdapter, false);
}

for (const item of
  OWNERPILOT_CAO_SPECIALIZATION
    .businessCapabilities) {
  assert.equal(item.grantedByAdapter, false);
}

for (const item of
  OWNERPILOT_CAO_SPECIALIZATION
    .environmentEligibility) {
  assert.equal(item.activatedByAdapter, false);
}

for (const pattern of [
  /^export\s+(?:async\s+)?function\s/m,
  /^export\s+class\s/m,
  /\bprocess\.env\b/,
  /\bfetch\s*\(/,
  /\bgenerateText\s*\(/,
  /\bcreateGateway\s*\(/,
  /from ['"]ai['"]/,
  /from ['"].*app\//,
  /from ['"].*supabase/,
  /from ['"].*vercel/,
]) {
  assert.doesNotMatch(
    source,
    pattern,
    `OwnerPilot specialization must remain nonexecuting: ${pattern}`,
  );
}

for (const pattern of [
  /\bAEDL\b/i,
  /\bAEOS\b/i,
  /\bAML\b/i,
  /\bOPML\b/i,
  /enterprise[- ]definition/i,
  /enterprise compiler/i,
  /manifest runtime/i,
  /code generation/i,
  /\bOPOS\b/i,
  /\bOPIL\b/i,
  /\bBTRM\b/i,
  /Recommendation Objects?/i,
  /Decision Graphs?/i,
]) {
  assert.doesNotMatch(
    source,
    pattern,
    `PR B must not adopt or classify future architecture: ${pattern}`,
  );
}

console.log(
  'ownerPilotCaoSpecialization tests passed',
);
