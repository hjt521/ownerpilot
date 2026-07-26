// lib/btrm/enr/dedupe.test.ts — ENR-001 exact-duplicate detection (BTRM-001 spec §3.1).

import { dedupeEvidence } from './dedupe';
import type { EvidenceItem } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const base: EvidenceItem = {
  id: 'a',
  source: 'chat',
  timestamp: '2026-01-10T00:00:00Z',
  authorOrOrigin: 'owner:123',
  evidenceType: 'message',
  originalContentRef: 'ref-1',
  relatedMatter: 'matter-1',
  verificationStatus: 'unverified',
  accessPermissions: [],
};

check('a single item forms its own group', dedupeEvidence([base]).length === 1);

const exactDupe: EvidenceItem = { ...base, id: 'b' };
const dupeGroups = dedupeEvidence([base, exactDupe]);
check('exact duplicates (same source/author/type/timestamp/originalContentRef) merge into one group', dupeGroups.length === 1);
check('the merged group preserves both member ids', dupeGroups[0].memberIds.length === 2 && dupeGroups[0].memberIds.includes('a') && dupeGroups[0].memberIds.includes('b'));
check('the survivor is the first-occurrence item (stable, deterministic)', dupeGroups[0].survivor.id === 'a');

const differentSource: EvidenceItem = { ...base, id: 'c', source: 'email' };
check('differing source is NOT merged', dedupeEvidence([base, differentSource]).length === 2);

const differentContentRef: EvidenceItem = { ...base, id: 'd', originalContentRef: 'ref-2' };
check('differing originalContentRef is NOT merged (no evidence silently dropped)', dedupeEvidence([base, differentContentRef]).length === 2);

const differentTimestamp: EvidenceItem = { ...base, id: 'e', timestamp: '2026-01-11T00:00:00Z' };
check('differing timestamp is NOT merged', dedupeEvidence([base, differentTimestamp]).length === 2);

check('three items, one exact duplicate pair, yields two groups', dedupeEvidence([base, exactDupe, differentSource]).length === 2);

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
