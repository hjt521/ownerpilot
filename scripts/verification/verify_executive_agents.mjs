#!/usr/bin/env node
/**
 * Deterministic, read-only verification for executive-agent pull requests.
 *
 * This script:
 * - resolves an explicit base and head commit;
 * - verifies changed-file scope;
 * - checks stable Preview and Production-prohibition boundaries;
 * - checks added lines for authority expansion;
 * - runs git diff --check; and
 * - optionally writes a concise Founder review packet.
 *
 * It does not read secrets, modify repository state, call providers, deploy,
 * persist data, execute tools, or create Production eligibility.
 */

import {
  execFileSync,
} from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {
  pathToFileURL,
} from 'node:url';

const MODES = new Set([
  'all',
  'scope',
  'boundaries',
  'production',
  'packet',
]);

const ALLOWED_PATH_PATTERNS = [
  /^lib\/agents\//,
  /^lib\/ai\/modelRegistry\.ts$/,
  /^scripts\/agents\//,
  /^scripts\/verification\//,
  /^app\/api\/internal\/executive-agents\//,
  /^app\/internal\/executive-agents\//,
  /^\.github\/workflows\/executive-agents\.yml$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^docs\/(?:architecture|governance)\/executive-agents\//,
  /^docs\/agents\/cao_preview_workbench_acceptance_packet_\d{4}-\d{2}-\d{2}\.md$/,
];

const PROTECTED_PATH_PATTERNS = [
  /^constitution\//,
  /^docs\/legal\//,
  /^supabase\//,
  /^app\/api\/(?!internal\/executive-agents\/)/,
  /^app\/(?!api\/internal\/executive-agents\/|internal\/executive-agents\/)/,
];

const AUTHORITY_EXPANSION_PATTERNS = [
  {
    code: 'production_eligibility_enabled',
    pattern: /\bproductionEligible\s*:\s*true\b/,
  },
  {
    code: 'persistence_enabled',
    pattern: /\bpersistence(?:Allowed|Performed)\s*:\s*true\b/,
  },
  {
    code: 'tool_execution_enabled',
    pattern: /\btoolExecutionPerformed\s*:\s*true\b/,
  },
  {
    code: 'automatic_continuation_enabled',
    pattern: /\bautomaticContinuation(?:Allowed)?\s*:\s*true\b/,
  },
  {
    code: 'automatic_dispatch_enabled',
    pattern: /\bautomaticDispatch\s*:\s*true\b/,
  },
  {
    code: 'automatic_fallback_enabled',
    pattern: /\b(?:automaticFallbackAllowed|allowAutomaticPrimaryToFallback)\s*:\s*true\b/,
  },
  {
    code: 'automatic_provider_change_enabled',
    pattern: /\b(?:automaticProviderSubstitutionAllowed|allowAutomaticProviderChange)\s*:\s*true\b/,
  },
  {
    code: 'fallback_assignment_added',
    pattern: /\bfallbackModel\s*:\s*\{/,
  },
];

const CRITICAL_FILES = {
  registry: 'lib/agents/caoPreviewRegistry.ts',
  gate: 'lib/agents/executiveAgentsPreviewGate.ts',
  route: 'lib/agents/executiveAgentsPreviewRouteContract.ts',
  ui: 'lib/agents/executiveAgentsPreviewUiContract.ts',
  execution: 'lib/agents/caoPreviewExecution.ts',
};

function fail(message) {
  throw new Error(message);
}

function runGit(args, options = {}) {
  return execFileSync(
    'git',
    args,
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    },
  ).trim();
}

function parseArgs(argv) {
  const options = {
    base: null,
    head: null,
    mode: 'all',
    packet: null,
    checkResults: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (
      token === '--base' ||
      token === '--head' ||
      token === '--mode' ||
      token === '--packet' ||
      token === '--check-result'
    ) {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        fail(`${token} requires a value.`);
      }

      index += 1;

      if (token === '--check-result') {
        options.checkResults.push(value);
      } else {
        options[token.slice(2)] = value;
      }

      continue;
    }

    fail(`Unknown argument: ${token}.`);
  }

  if (!MODES.has(options.mode)) {
    fail(`Unknown mode: ${options.mode}.`);
  }

  return options;
}

function resolveCommit(candidate, fallback) {
  const requested = candidate || fallback;

  if (!requested) {
    fail('A Git commit reference is required.');
  }

  const resolved = runGit([
    'rev-parse',
    `${requested}^{commit}`,
  ]);

  if (!/^[0-9a-f]{40}$/.test(resolved)) {
    fail(`Could not resolve a full commit SHA for ${requested}.`);
  }

  return resolved;
}

function changedFiles(base, head) {
  const output = runGit([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    `${base}...${head}`,
  ]);

  return output
    ? output.split('\n').filter(Boolean)
    : [];
}

export function isAllowedPath(path) {
  return ALLOWED_PATH_PATTERNS.some(pattern => pattern.test(path));
}

export function isProtectedPath(path) {
  return PROTECTED_PATH_PATTERNS.some(pattern => pattern.test(path));
}

function addedLines(base, head) {
  const output = runGit([
    'diff',
    '--unified=0',
    '--no-color',
    `${base}...${head}`,
    '--',
    ...changedFiles(base, head),
  ]);

  return output
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1));
}

export function findAuthorityExpansion(lines) {
  const findings = [];

  for (const rule of AUTHORITY_EXPANSION_PATTERNS) {
    if (lines.some(line => rule.pattern.test(line))) {
      findings.push({
        code: rule.code,
      });
    }
  }

  return findings;
}

function verifyScope(base, head) {
  const files = changedFiles(base, head);
  const disallowed = files.filter(path => !isAllowedPath(path));
  const protectedFiles = files.filter(isProtectedPath);

  if (disallowed.length > 0) {
    fail(
      `Changed files exceed executive-agent scope: ${disallowed.join(', ')}`,
    );
  }

  if (protectedFiles.length > 0) {
    fail(
      `Protected files changed: ${protectedFiles.join(', ')}`,
    );
  }

  runGit([
    'diff',
    '--check',
    `${base}...${head}`,
  ]);

  return files;
}

function criticalFileEvidence(head) {
  const evidence = {};

  for (const [key, path] of Object.entries(CRITICAL_FILES)) {
    if (!existsSync(path)) {
      fail(`Missing critical executive-agent file: ${path}`);
    }

    evidence[key] = {
      path,
      bytes: Buffer.byteLength(readFileSync(path, 'utf8'), 'utf8'),
      head,
    };
  }

  return evidence;
}

function verifyBoundaries(base, head) {
  const findings = findAuthorityExpansion(addedLines(base, head));

  if (findings.length > 0) {
    fail(
      `Authority expansion detected: ${findings
        .map(item => item.code)
        .join(', ')}`,
    );
  }

  return {
    productionEligibilityAdded: false,
    persistenceEnablementAdded: false,
    toolEnablementAdded: false,
    automaticContinuationAdded: false,
  };
}

function verifyProduction(base, head) {
  return verifyBoundaries(base, head);
}

function parseCheckResults(values) {
  return values.map(value => {
    const separator = value.indexOf('=');

    if (separator <= 0 || separator === value.length - 1) {
      fail(`Invalid check result: ${value}`);
    }

    return {
      name: value.slice(0, separator),
      result: value.slice(separator + 1),
    };
  });
}

export function buildReviewPacket({
  branch,
  base,
  head,
  files,
  checkResults,
  authorityFindings,
}) {
  return [
    '# Executive-Agent Pull Request Review Packet',
    '',
    '## Identity',
    '',
    `- Branch: \`${branch}\``,
    `- Base: \`${base}\``,
    `- Head: \`${head}\``,
    '',
    '## Changed files',
    '',
    ...files.map(path => `- \`${path}\``),
    '',
    '## Verification results',
    '',
    ...checkResults.map(item =>
      `- ${item.name}: ${item.result}`,
    ),
    '',
    '## Authority findings',
    '',
    ...(authorityFindings.length > 0
      ? authorityFindings.map(item => `- ${item.code}`)
      : ['- None']),
    '',
    '## Required human posture',
    '',
    '- Human review required.',
    '- No automatic continuation.',
    '- No Production authority.',
    '- No repository-write authority for an agent.',
    '- No deployment authority for an agent.',
    '',
  ].join('\n');
}

function writePacket(path, packet) {
  writeFileSync(path, packet, 'utf8');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const base = resolveCommit(
    options.base,
    process.env.GITHUB_BASE_SHA,
  );
  const head = resolveCommit(
    options.head,
    process.env.GITHUB_SHA,
  );

  const branch = process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    'unknown';

  const files = changedFiles(base, head);
  const authorityFindings = findAuthorityExpansion(
    addedLines(base, head),
  );

  let boundaries = {
    productionEligibilityAdded: false,
    persistenceEnablementAdded: false,
    toolEnablementAdded: false,
    automaticContinuationAdded: false,
  };

  if (options.mode === 'scope' || options.mode === 'all') {
    verifyScope(base, head);
  }

  if (options.mode === 'boundaries' || options.mode === 'all') {
    boundaries = verifyBoundaries(base, head);
  }

  if (options.mode === 'production' || options.mode === 'all') {
    boundaries = verifyProduction(base, head);
  }

  if (options.mode === 'packet') {
    const packet = buildReviewPacket({
      branch,
      base,
      head,
      files,
      checkResults:
        parseCheckResults(options.checkResults),
      authorityFindings,
    });

    if (!options.packet) {
      fail('--packet is required in packet mode.');
    }

    writePacket(options.packet, packet);
  }

  if (options.mode !== 'packet') {
    criticalFileEvidence(head);
  }

  console.log('Executive-agent verification: PASS');
  console.log(`Mode: ${options.mode}`);
  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files: ${files.length}`);
  console.log(
    `Production eligibility added: ${String(
      boundaries.productionEligibilityAdded,
    )}`,
  );
  console.log(
    `Persistence enablement added: ${String(
      boundaries.persistenceEnablementAdded,
    )}`,
  );
  console.log(
    `Tool enablement added: ${String(
      boundaries.toolEnablementAdded,
    )}`,
  );
  console.log(
    `Automatic continuation added: ${String(
      boundaries.automaticContinuationAdded,
    )}`,
  );

  if (options.packet) {
    console.log(`Review packet: ${options.packet}`);
  }
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(
      `Executive-agent verification: FAIL — ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}
