import {
  strict as assert,
} from 'node:assert';

import {
  CAO_EVIDENCE_MAX_FILE_BYTES,
  CAO_EVIDENCE_SCOPES,
  CaoEvidenceCollectionError,
  collectCaoRepositoryEvidence,
} from './caoRepositoryEvidence';

let passed = 0;
let failed = 0;

async function check(
  name: string,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
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

const scope =
  CAO_EVIDENCE_SCOPES.enterprise_workforce_recovery;

function response(
  content: string,
  status = 200,
): Response {
  return new Response(content, { status });
}

await check(
  'collects every approved file from the exact immutable commit',
  async () => {
    const requested: string[] = [];
    const packet = await collectCaoRepositoryEvidence(
      {
        scopeId: scope.id,
        sourceCommit: scope.sourceCommit,
        nowIso: '2026-08-04T20:00:00.000Z',
      },
      {
        fetchText: async url => {
          requested.push(url);
          return response(`content for ${url}`);
        },
      },
    );

    assert.equal(packet.repository, 'hjt521/ownerpilot');
    assert.equal(packet.sourceCommit, scope.sourceCommit);
    assert.equal(packet.fileCount, scope.paths.length);
    assert.equal(packet.unavailableEvidence, false);
    assert.equal(packet.truncated, false);
    assert.equal(requested.length, scope.paths.length);
    assert.ok(
      requested.every(url =>
        url.includes(scope.sourceCommit),
      ),
    );
    assert.ok(
      packet.files.every(file =>
        file.sha256?.length === 64 &&
        file.immutableReference.includes(scope.sourceCommit),
      ),
    );
  },
);

await check(
  'rejects an unapproved evidence scope before network access',
  async () => {
    let called = false;

    await assert.rejects(
      collectCaoRepositoryEvidence(
        {
          scopeId: 'arbitrary_repository',
          sourceCommit: scope.sourceCommit,
          nowIso: '2026-08-04T20:00:00.000Z',
        },
        {
          fetchText: async () => {
            called = true;
            return response('unexpected');
          },
        },
      ),
      (error: unknown) =>
        error instanceof CaoEvidenceCollectionError &&
        error.code === 'unapproved_scope',
    );

    assert.equal(called, false);
  },
);

await check(
  'rejects a source-commit mismatch before network access',
  async () => {
    let called = false;

    await assert.rejects(
      collectCaoRepositoryEvidence(
        {
          scopeId: scope.id,
          sourceCommit: 'a'.repeat(40),
          nowIso: '2026-08-04T20:00:00.000Z',
        },
        {
          fetchText: async () => {
            called = true;
            return response('unexpected');
          },
        },
      ),
      (error: unknown) =>
        error instanceof CaoEvidenceCollectionError &&
        error.code === 'source_commit_mismatch',
    );

    assert.equal(called, false);
  },
);

await check(
  'records unavailable evidence without substituting content',
  async () => {
    let index = 0;
    const packet = await collectCaoRepositoryEvidence(
      {
        scopeId: scope.id,
        sourceCommit: scope.sourceCommit,
        nowIso: '2026-08-04T20:00:00.000Z',
      },
      {
        fetchText: async () => {
          index += 1;
          return index === 1
            ? response('not found', 404)
            : response('available');
        },
      },
    );

    assert.equal(packet.unavailableEvidence, true);
    assert.equal(packet.files[0].availability, 'unavailable');
    assert.equal(packet.files[0].content, null);
    assert.equal(packet.files[0].sha256, null);
  },
);

await check(
  'truncates an oversized file and reports exact byte metadata',
  async () => {
    const oversized = 'x'.repeat(
      CAO_EVIDENCE_MAX_FILE_BYTES + 100,
    );
    let index = 0;
    const packet = await collectCaoRepositoryEvidence(
      {
        scopeId: scope.id,
        sourceCommit: scope.sourceCommit,
        nowIso: '2026-08-04T20:00:00.000Z',
      },
      {
        fetchText: async () => {
          index += 1;
          return response(index === 1 ? oversized : 'small');
        },
      },
    );

    assert.equal(packet.truncated, true);
    assert.equal(packet.files[0].truncated, true);
    assert.equal(
      packet.files[0].includedBytes,
      CAO_EVIDENCE_MAX_FILE_BYTES,
    );
    assert.equal(
      packet.files[0].originalBytes,
      CAO_EVIDENCE_MAX_FILE_BYTES + 100,
    );
  },
);

await check(
  'uses no credentials and only bounded text GET requests',
  async () => {
    const inits: RequestInit[] = [];

    await collectCaoRepositoryEvidence(
      {
        scopeId: scope.id,
        sourceCommit: scope.sourceCommit,
        nowIso: '2026-08-04T20:00:00.000Z',
      },
      {
        fetchText: async (_url, init) => {
          inits.push(init);
          return response('bounded');
        },
      },
    );

    assert.ok(inits.every(init => init.method === 'GET'));
    assert.ok(inits.every(init => init.cache === 'no-store'));
    assert.ok(
      inits.every(init => {
        const headers = new Headers(init.headers);
        return headers.get('authorization') === null;
      }),
    );
  },
);

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
