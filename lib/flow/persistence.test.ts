/**
 * Suite: lib/flow/persistence.test.ts (R2a, 2026-06-12)
 * Draft envelope roundtrip, version gating, and fail-soft behavior.
 * Self-contained harness; discovered by scripts/run_tests.mjs.
 */
import {
  DRAFT_KEY,
  DRAFT_VERSION,
  saveDraft,
  loadDraft,
  clearDraft,
  type StorageLike,
} from './persistence';
import { createFlowState } from './noticeFlowState';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean): void {
  if (cond) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failures.push(name);
    console.log(`  \u2717 ${name}`);
  }
}

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('boom');
  },
  setItem: () => {
    throw new Error('boom');
  },
  removeItem: () => {
    throw new Error('boom');
  },
};

console.log('=== Roundtrip ===\n');
{
  const s = fakeStorage();
  const data = createFlowState().data;
  data.propertyAddress = '345 Test Ave, Los Angeles, CA 90001';
  data.tenantNames = ['Alice Example', 'Bob Example'];
  const ok = saveDraft(2, data, s);
  check('saveDraft returns true on working storage', ok === true);
  const back = loadDraft(s);
  check('loadDraft returns a draft', back !== null);
  check('pageIndex roundtrips', back !== null && back.pageIndex === 2);
  check(
    'data roundtrips (address)',
    back !== null && back.data.propertyAddress === '345 Test Ave, Los Angeles, CA 90001',
  );
  check(
    'nested arrays roundtrip (tenant names)',
    back !== null &&
      Array.isArray(back.data.tenantNames) &&
      back.data.tenantNames.length === 2 &&
      back.data.tenantNames[1] === 'Bob Example',
  );
  check('savedAt is an ISO timestamp', back !== null && !Number.isNaN(Date.parse(back.savedAt)));
  const stored = JSON.parse(s.map.get(DRAFT_KEY) as string);
  check('stored envelope carries current version', stored.v === DRAFT_VERSION);
  const data2 = createFlowState().data;
  data2.propertyAddress = 'second draft';
  saveDraft(0, data2, s);
  const back2 = loadDraft(s);
  check(
    'save overwrites the previous draft',
    back2 !== null && back2.data.propertyAddress === 'second draft' && back2.pageIndex === 0,
  );
}

console.log('\n=== Rejection paths (all fail-soft to null) ===\n');
{
  const s = fakeStorage();
  check('no stored draft => null', loadDraft(s) === null);
  s.map.set(DRAFT_KEY, '{not json');
  check('corrupt JSON => null', loadDraft(s) === null);
  s.map.set(
    DRAFT_KEY,
    JSON.stringify({ v: DRAFT_VERSION + 1, savedAt: new Date().toISOString(), pageIndex: 0, data: {} }),
  );
  check('version mismatch => null', loadDraft(s) === null);
  s.map.set(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION, savedAt: 'x', pageIndex: 0 }));
  check('missing data => null', loadDraft(s) === null);
  s.map.set(
    DRAFT_KEY,
    JSON.stringify({ v: DRAFT_VERSION, savedAt: 'x', pageIndex: 'three', data: {} }),
  );
  check('non-numeric pageIndex => null', loadDraft(s) === null);
}

console.log('\n=== Hostile / absent storage (never throws) ===\n');
{
  let threw = false;
  let loaded: unknown = 'sentinel';
  let saved: unknown = 'sentinel';
  try {
    loaded = loadDraft(throwingStorage);
    saved = saveDraft(1, createFlowState().data, throwingStorage);
    clearDraft(throwingStorage);
  } catch {
    threw = true;
  }
  check('throwing storage never propagates', threw === false);
  check('throwing getItem => load null', loaded === null);
  check('throwing setItem => save false', saved === false);
  check('null storage (SSR) => load null, save false', loadDraft(null) === null && saveDraft(0, createFlowState().data, null) === false);
}

console.log('\n=== clearDraft ===\n');
{
  const s = fakeStorage();
  saveDraft(1, createFlowState().data, s);
  clearDraft(s);
  check('clearDraft removes the stored draft', loadDraft(s) === null && !s.map.has(DRAFT_KEY));
}

console.log('\n' + '-'.repeat(40));
console.log(`  ${passed} passed, ${failures.length} failed`);
console.log('-'.repeat(40) + '\n');
if (failures.length > 0) process.exit(1);
