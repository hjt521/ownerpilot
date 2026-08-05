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

function enabledLine(property) {
  return `${property}: ${String(true)},`;
}

console.log('\nExecutive-agent verification automation');

check(
  'accepts the dedicated automation, verifier, and bounded CAO packet paths',
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
    assert.equal(
      isAllowedPath(
        'docs/agents/cao_preview_workbench_acceptance_packet_2026-08-04.md',
      ),
      true,
    );
    assert.equal(
      isAllowedPath(
        'docs/agents/arbitrary_agent_document.md',
      ),
      false,
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
      enabledLine('productionEligible'),
      enabledLine('persistenceAllowed'),
      enabledLine('toolExecutionPerformed'),
      enabledLine('automaticContinuationAllowed'),
      enabledLine('allowAutomaticPrimaryToFallback'),
      ['fallbackModel:', '{'].join(' '),
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
      '## Verification results',
      '## Authority findings',
      '## Required human posture',
    ]) {
      assert.match(packet, new RegExp(section));
    }
  },
);

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
