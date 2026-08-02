#!/usr/bin/env node

import {
  strict as assert,
} from 'node:assert';

import {
  buildReviewPacket,
  findAuthorityExpansion,
  isAllowedPath,
  isProtectedPath,
} from './verify_executive_agents.mjs';

let passed = 0;
let failed = 0;

function check(name, operation) {
  try {
    operation();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

console.log('\nExecutive-agent verification automation');

check(
  'accepts the dedicated automation workflow and verifier paths',
  () => {
    assert.equal(
      isAllowedPath(
        '.github/workflows/executive-agents.yml',
      ),
      true,
    );
    assert.equal(
      isAllowedPath(
        'scripts/verification/verify_executive_agents.mjs',
      ),
      true,
    );
    assert.equal(
      isAllowedPath(
        'lib/agents/caoPreviewExecution.ts',
      ),
      true,
    );
  },
);

check(
  'rejects unrelated product and legal paths',
  () => {
    assert.equal(
      isAllowedPath(
        'app/chat/page.tsx',
      ),
      false,
    );
    assert.equal(
      isAllowedPath(
        'docs/legal/nonpayment.md',
      ),
      false,
    );
    assert.equal(
      isProtectedPath(
        'docs/legal/nonpayment.md',
      ),
      true,
    );
    assert.equal(
      isProtectedPath(
        'supabase/migrations/001.sql',
      ),
      true,
    );
  },
);

check(
  'detects Production, persistence, tool, continuation, and fallback expansion',
  () => {
    const findings = findAuthorityExpansion([
      'productionEligible: true,',
      'persistenceAllowed: true,',
      'toolExecutionPerformed: true,',
      'automaticContinuationAllowed: true,',
      'allowAutomaticPrimaryToFallback: true,',
      'fallbackModel: {',
    ]);

    assert.deepEqual(
      findings.map(item => item.code),
      [
        'production_eligibility_enabled',
        'persistence_enabled',
        'tool_execution_enabled',
        'automatic_continuation_enabled',
        'automatic_fallback_enabled',
        'fallback_assignment_added',
      ],
    );
  },
);

check(
  'does not flag explicit fail-closed values',
  () => {
    assert.deepEqual(
      findAuthorityExpansion([
        'productionEligible: false,',
        'persistencePerformed: false,',
        'automaticContinuation: false,',
        'fallbackModel: null,',
      ]),
      [],
    );
  },
);

check(
  'produces the required Founder review packet sections',
  () => {
    const packet = buildReviewPacket({
      branch:
        'automation/executive-agent-integration-workflow',
      base:
        '1111111111111111111111111111111111111111',
      head:
        '2222222222222222222222222222222222222222',
      files: [
        'scripts/verification/verify_executive_agents.mjs',
        '.github/workflows/executive-agents.yml',
      ],
      checkResults: [
        {
          name: 'scope',
          result: 'success',
        },
      ],
      authorityFindings: [],
    });

    for (const section of [
      '# Executive-Agent Pull Request Review Packet',
      '## Identity',
      '## Changed files',
      '## Authorized scope',
      '## Excluded scope',
      '## Checks',
      '## Impact assessment',
      '## Rollback',
      '## Unresolved findings',
      '## Merge recommendation',
    ]) {
      assert.equal(
        packet.includes(section),
        true,
      );
    }

    assert.equal(
      packet.includes(
        'Eligible for Founder review',
      ),
      true,
    );
  },
);

console.log(
  `\n${'-'.repeat(72)}\n` +
  `  ${passed} passed, ${failed} failed\n` +
  `${'-'.repeat(72)}`,
);

if (failed > 0) {
  process.exit(1);
}
