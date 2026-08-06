import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  GENERIC_CAO_BUSINESS_ADAPTER_VERSION,
  GENERIC_CAO_BUSINESS_CONTEXT_CATEGORIES,
} from './genericCaoBusinessAdapter';

const source = readFileSync(
  new URL('./genericCaoBusinessAdapter.ts', import.meta.url),
  'utf8',
);

assert.equal(
  GENERIC_CAO_BUSINESS_ADAPTER_VERSION,
  'generic-cao-business-adapter-v1',
);

assert.deepEqual(
  [...GENERIC_CAO_BUSINESS_CONTEXT_CATEGORIES],
  [
    'enterprise_identity',
    'executive_identity',
    'governing_references',
    'role_charter',
    'task_classes',
    'approved_evidence_scope',
    'vocabulary',
    'business_capabilities',
    'legal_restrictions',
    'jurisdictional_restrictions',
    'model_requirements',
    'environment_eligibility',
    'audit_requirements',
    'human_approval_requirements',
  ],
);

for (const pattern of [
  /^import(?!\s+type\b)/m,
  /^export\s+(?:async\s+)?function\s/m,
  /^export\s+class\s/m,
  /\b(?:fetch|createGateway|generateText)\s*\(/,
  /\bprocess\.env\b/,
]) {
  assert.doesNotMatch(
    source,
    pattern,
    `Business adapter must remain nonexecuting: ${pattern}`,
  );
}

for (const pattern of [
  /OwnerPilot/i,
  /\blandlord\b/i,
  /\btenant\b/i,
  /\bCalifornia\b/i,
  /Los Angeles/i,
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
    `Business adapter crossed its neutrality boundary: ${pattern}`,
  );
}

for (const required of [
  "authorityGrantingMode: 'reference_only'",
  'adapterGrantsAuthority: false',
  'runtimeConstructionAllowed: false',
  'automaticActivationAllowed: false',
  'grantedByAdapter: false',
  'activatedByAdapter: false',
  'credentialsIncluded: false',
  'transportConfigurationIncluded: false',
]) {
  assert.ok(
    source.includes(required),
    `Missing adapter boundary invariant: ${required}`,
  );
}

console.log('genericCaoBusinessAdapter tests passed');
