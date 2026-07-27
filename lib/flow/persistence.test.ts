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

// ---------------------------------------------------------------------------
// CHARACTERIZATION OF KNOWN CURRENT GAP — NOT DESIRED TARGET BEHAVIOR
// Added 2026-07-27 per the OwnerPilot free-limited-beta repository audit and the
// Founder/Architect's test-only characterization PR authorization.
//
// Gap: a draft saved under a REAL prior DRAFT_VERSION (e.g. v2, the shape in
// effect before the Slice 4d `cachedResolverVerdict` bump) is silently discarded
// on load. There is no field-level migration and no user-visible warning that
// data was lost — loadDraft() simply returns null, indistinguishable from "no
// draft was ever saved." This is a deliberate design tradeoff per this file's own
// header comment ("a draft is cheap to re-enter, a crash is not"), not a defect,
// but it IS a real user-facing data-loss point for anyone returning mid-draft
// across a deploy that bumps DRAFT_VERSION, and the free-beta audit flagged it as
// a gap the Founder should see characterized explicitly.
//
// This test asserts CURRENT behavior and is intended to fail the moment that
// behavior changes (e.g. if a future revision adds migration or a visible
// warning) — at which point it must be deliberately updated, not silently left
// red. It must never be read as asserting this is how the system SHOULD behave.
// ---------------------------------------------------------------------------
console.log('\n=== Characterization: prior real-version envelope (v2) is discarded, no migration, no warning ===\n');
{
  const s = fakeStorage();
  // A realistic v2 payload: the actual pre-Slice-4d envelope shape (no
  // cachedResolverVerdict field on `data`), not a synthetic "v: DRAFT_VERSION + 1".
  const priorVersionEnvelope = {
    v: 2,
    savedAt: new Date().toISOString(),
    pageIndex: 2,
    data: {
      dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
      propertyAddress: '442 Fresno St, Fresno, CA 93701',
      tenantNames: ['Prior Version Tenant'],
      rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 }],
      paymentMethods: ['by_mail'],
      paymentBranch: 'mail_only',
    },
  };
  s.map.set(DRAFT_KEY, JSON.stringify(priorVersionEnvelope));
  const restored = loadDraft(s);
  check(
    'CHARACTERIZATION (known gap, 2026-07-27): a real v2 draft is discarded on load (returns null), not migrated',
    restored === null,
  );
  check(
    'CHARACTERIZATION (known gap, 2026-07-27): the discarded v2 payload is left untouched in storage (no destructive rewrite, but also no recovery path)',
    s.map.get(DRAFT_KEY) === JSON.stringify(priorVersionEnvelope),
  );
  // loadDraft() itself has no channel to signal "a draft existed but could not be
  // restored" versus "no draft was ever saved" — both return null. This is the
  // precise mechanism behind the "no visible warning" characterization; the
  // e2e-level user-visible consequence (no restore toast appears) is asserted
  // separately in e2e/beta-pathway-characterization.spec.ts, not duplicated here.
}

console.log('\n' + '-'.repeat(40));
console.log(`  ${passed} passed, ${failures.length} failed`);
console.log('-'.repeat(40) + '\n');
if (failures.length > 0) process.exit(1);
