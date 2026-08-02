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

export function isAllowedPath(file) {
  return ALLOWED_PATH_PATTERNS.some(
    pattern => pattern.test(file),
  );
}

export function isProtectedPath(file) {
  return PROTECTED_PATH_PATTERNS.some(
    pattern => pattern.test(file),
  );
}

function changedFiles(base, head) {
  const output = runGit([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    base,
    head,
    '--',
  ]);

  return output
    .split('\n')
    .map(value => value.trim())
    .filter(Boolean);
}

function addedLines(base, head) {
  const diff = runGit([
    'diff',
    '--unified=0',
    '--no-color',
    base,
    head,
    '--',
  ]);

  return diff
    .split('\n')
    .filter(line => (
      line.startsWith('+') &&
      !line.startsWith('+++')
    ))
    .map(line => line.slice(1));
}

export function findAuthorityExpansion(lines) {
  const findings = [];

  for (const [index, line] of lines.entries()) {
    for (const rule of AUTHORITY_EXPANSION_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({
          code: rule.code,
          addedLine: index + 1,
          text: line.trim(),
        });
      }
    }
  }

  return findings;
}

function readAtCommit(commit, file) {
  try {
    return runGit([
      'show',
      `${commit}:${file}`,
    ]);
  } catch {
    fail(`Required verification file is unavailable at ${commit}: ${file}`);
  }
}

function requireText(text, value, file) {
  if (!text.includes(value)) {
    fail(`Missing required boundary in ${file}: ${value}`);
  }
}

function prohibitPattern(text, pattern, file, label) {
  if (pattern.test(text)) {
    fail(`Prohibited ${label} seam detected in ${file}.`);
  }
}

function verifyScope(files) {
  if (files.length === 0) {
    fail('No changed files were detected.');
  }

  const unexpected = files.filter(
    file => !isAllowedPath(file),
  );

  const protectedFiles = files.filter(
    isProtectedPath,
  );

  if (unexpected.length > 0) {
    fail(
      `Changed files exceed executive-agent scope: ${unexpected.join(', ')}`,
    );
  }

  if (protectedFiles.length > 0) {
    fail(
      `Protected paths changed without separate authorization: ${protectedFiles.join(', ')}`,
    );
  }
}

function verifyCriticalBoundaries(head) {
  const registry = readAtCommit(
    head,
    CRITICAL_FILES.registry,
  );
  const gate = readAtCommit(
    head,
    CRITICAL_FILES.gate,
  );
  const route = readAtCommit(
    head,
    CRITICAL_FILES.route,
  );
  const ui = readAtCommit(
    head,
    CRITICAL_FILES.ui,
  );
  const execution = readAtCommit(
    head,
    CRITICAL_FILES.execution,
  );

  requireText(registry, 'fallbackModel: null', CRITICAL_FILES.registry);
  requireText(registry, 'enabled: false', CRITICAL_FILES.registry);
  requireText(registry, "'preview'", CRITICAL_FILES.registry);
  requireText(registry, 'allowAutomaticPrimaryToFallback: false', CRITICAL_FILES.registry);
  requireText(registry, 'allowAutomaticProviderChange: false', CRITICAL_FILES.registry);

  for (const value of [
    'productionEligible: false',
    'persistenceAllowed: false',
    'automaticContinuationAllowed: false',
    'automaticFallbackAllowed: false',
    'automaticProviderSubstitutionAllowed:',
  ]) {
    requireText(gate, value, CRITICAL_FILES.gate);
  }

  for (const [file, text] of [
    [CRITICAL_FILES.route, route],
    [CRITICAL_FILES.ui, ui],
  ]) {
    for (const [pattern, label] of [
      [/\bgenerateText\s*\(/, 'model execution'],
      [/\bcreateGateway\s*\(/, 'provider construction'],
      [/\bfetch\s*\(/, 'direct network'],
      [/\.insert\s*\(/, 'database write'],
      [/\.upsert\s*\(/, 'database write'],
      [/\.delete\s*\(/, 'database write'],
      [/\bwriteFile\b/, 'filesystem persistence'],
    ]) {
      prohibitPattern(text, pattern, file, label);
    }

    for (const value of [
      'providerCallPerformed: false',
      'persistencePerformed: false',
      'toolExecutionPerformed: false',
      'productionActionPerformed: false',
    ]) {
      requireText(text, value, file);
    }
  }

  for (const [pattern, label] of [
    [/\bprocess\s*\.\s*env\b/, 'environment lookup'],
    [/\bcreateGateway\s*\(/, 'provider construction'],
    [/\bfetch\s*\(/, 'direct network'],
    [/\bcreateClient\b/, 'database client'],
    [/\bsupabase\b/i, 'database client'],
    [/\.insert\s*\(/, 'database write'],
    [/\.upsert\s*\(/, 'database write'],
    [/\bwriteFile\b/, 'filesystem persistence'],
  ]) {
    prohibitPattern(
      execution,
      pattern,
      CRITICAL_FILES.execution,
      label,
    );
  }

  for (const value of [
    'gatewayProviderRestriction',
    'requestedTools: []',
    'effectiveTools: []',
    'toolCalls: []',
    'automaticContinuation: false',
    'fallbackPerformed: false',
    'substitutionPerformed: false',
    'persistencePerformed: false',
    'productionEligible: false',
  ]) {
    requireText(execution, value, CRITICAL_FILES.execution);
  }
}

function verifyProductionProhibition(base, head) {
  const findings = findAuthorityExpansion(
    addedLines(base, head),
  );

  if (findings.length > 0) {
    fail(
      `Authority expansion detected: ${findings
        .map(item => `${item.code}:${item.text}`)
        .join(' | ')}`,
    );
  }
}

function verifyWhitespace(base, head) {
  execFileSync(
    'git',
    ['diff', '--check', base, head, '--'],
    {
      stdio: 'inherit',
    },
  );
}

function currentBranch() {
  return (
    process.env.GITHUB_HEAD_REF ||
    runGit(['branch', '--show-current']) ||
    'detached-head'
  );
}

function parseCheckResults(values) {
  return values.map(value => {
    const separator = value.indexOf('=');

    if (separator <= 0) {
      fail(`Invalid --check-result value: ${value}.`);
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
  const previewImpact = files.some(file => (
    file.startsWith('lib/agents/') ||
    file.startsWith('app/api/internal/executive-agents/') ||
    file.startsWith('app/internal/executive-agents/')
  ));

  const providerModelImpact = files.some(file => (
    /(?:Registry|Execution|evaluation|modelRegistry)/.test(file)
  ));

  const legalConstitutionalImpact = files.some(file => (
    file.startsWith('constitution/') ||
    file.startsWith('docs/legal/')
  ));

  const checks = checkResults.length > 0
    ? checkResults
        .map(item => `- ${item.name}: **${item.result}**`)
        .join('\n')
    : '- Results are reported by the associated GitHub Actions jobs.';

  const changed = files.length > 0
    ? files.map(file => `- \`${file}\``).join('\n')
    : '- None detected.';

  const unresolved = authorityFindings.length > 0
    ? authorityFindings
        .map(item => `- ${item.code}: \`${item.text}\``)
        .join('\n')
    : '- None detected by deterministic verification.';

  const recommendation = authorityFindings.length === 0
    ? 'Eligible for Founder review after all required GitHub checks pass.'
    : 'Do not merge until the reported authority-expansion findings are resolved.';

  return `# Executive-Agent Pull Request Review Packet

## Identity

- Branch: \`${branch}\`
- Base commit: \`${base}\`
- Head commit: \`${head}\`

## Changed files

${changed}

## Authorized scope

- Executive-agent contracts, tests, internal Preview surfaces, agent scripts, verification automation, the dedicated executive-agent workflow, and package command wiring.

## Excluded scope

- Production activation
- Persistence enablement
- Tool enablement
- Sensitive or customer data
- Autonomous continuation or dispatch
- New roles or authority categories
- Constitutional or legal-canon modification
- Unrelated public product routes or UI

## Checks

${checks}

## Impact assessment

- Production impact: **none authorized**
- Preview impact: **${previewImpact ? 'yes — restricted executive-agent Preview scope' : 'none'}**
- Persistence impact: **none authorized**
- Provider/model impact: **${providerModelImpact ? 'yes — review exact pinned assignments and restrictions' : 'none'}**
- Legal and constitutional impact: **${legalConstitutionalImpact ? 'present — separate authorization required' : 'none detected'}**

## Rollback

Revert the squash commit produced by this pull request. No database rollback, tool revocation, or Production rollback should be required unless separately introduced outside the authorized scope.

## Unresolved findings

${unresolved}

## Merge recommendation

${recommendation}
`;
}

function writePacket(path, packet) {
  writeFileSync(
    path,
    packet,
    {
      encoding: 'utf8',
      flag: 'w',
    },
  );
}

export function executeVerification(options) {
  const baseFallback = (
    process.env.GITHUB_BASE_SHA ||
    process.env.GITHUB_EVENT_BEFORE ||
    'HEAD^'
  );
  const headFallback = (
    process.env.GITHUB_HEAD_SHA ||
    process.env.GITHUB_SHA ||
    'HEAD'
  );

  const base = resolveCommit(
    options.base,
    baseFallback,
  );
  const head = resolveCommit(
    options.head,
    headFallback,
  );

  if (base === head) {
    fail('Base and head commits must differ.');
  }

  const files = changedFiles(base, head);
  const lines = addedLines(base, head);
  const authorityFindings = findAuthorityExpansion(lines);

  if (
    options.mode === 'all' ||
    options.mode === 'scope'
  ) {
    verifyScope(files);
    verifyWhitespace(base, head);
  }

  if (
    options.mode === 'all' ||
    options.mode === 'boundaries'
  ) {
    verifyCriticalBoundaries(head);
  }

  if (
    options.mode === 'all' ||
    options.mode === 'production'
  ) {
    verifyProductionProhibition(base, head);
  }

  const checkResults = parseCheckResults(
    options.checkResults,
  );

  if (options.packet) {
    const packet = buildReviewPacket({
      branch: currentBranch(),
      base,
      head,
      files,
      checkResults,
      authorityFindings,
    });

    writePacket(options.packet, packet);
  }

  return {
    base,
    head,
    files,
    authorityFindings,
    packet: options.packet,
  };
}

function main() {
  try {
    const options = parseArgs(
      process.argv.slice(2),
    );
    const result = executeVerification(options);

    console.log('Executive-agent verification: PASS');
    console.log(`Mode: ${options.mode}`);
    console.log(`Base: ${result.base}`);
    console.log(`Head: ${result.head}`);
    console.log(`Changed files: ${result.files.length}`);
    console.log('Production eligibility added: false');
    console.log('Persistence enablement added: false');
    console.log('Tool enablement added: false');
    console.log('Automatic continuation added: false');

    if (result.packet) {
      console.log(`Review packet: ${result.packet}`);
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    console.error(`Executive-agent verification: FAIL — ${message}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (invokedPath === import.meta.url) {
  main();
}
