// Migration topology guard: keep staged 056/057 outside Supabase's active migration-discovery tree.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const activeRoot = join(root, 'supabase', 'migrations');

const staged = [
  {
    name: '056_owner_tables_grant_tidy.sql',
    path: join(root, 'supabase', 'staged-migrations', '056_owner_tables_grant_tidy.sql'),
    blobSha: '2071f466ef91ab24415a680d5b0a405c26b022ea',
  },
  {
    name: '057_btrm_enr_evidence_schema.sql',
    path: join(root, 'supabase', 'staged-migrations', '057_btrm_enr_evidence_schema.sql'),
    blobSha: '2de55447a541720cf27f9dd4d7e1bc789f73ac4f',
  },
] as const;

function gitBlobSha(path: string): string {
  const bytes = readFileSync(path);
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest('hex');
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out;
}

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const activeFiles = walkFiles(activeRoot);
const activeByName = new Set(activeFiles.map((path) => relative(activeRoot, path)));
const activeHashes = new Set(activeFiles.map(gitBlobSha));

console.log('\n=== Supabase staged-migration containment ===\n');

for (const migration of staged) {
  check(`${migration.name} exists in staged-migrations`, existsSync(migration.path));
  if (!existsSync(migration.path)) continue;

  const actual = gitBlobSha(migration.path);
  check(
    `${migration.name} remains byte-identical to its frozen source blob`,
    actual === migration.blobSha,
    `expected ${migration.blobSha}, got ${actual}`,
  );
  check(
    `${migration.name} is absent from the active migration tree by name`,
    !activeByName.has(migration.name),
  );
  check(
    `${migration.name} content is absent from the active migration tree`,
    !activeHashes.has(migration.blobSha),
  );
}

console.log(`\n${'-'.repeat(48)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(48)}\n`);
if (failed > 0) process.exit(1);
