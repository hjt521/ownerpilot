// lib/btrm/enr/provenance.test.ts — ENR-001 provenance classification (BTRM-001 spec §3.1, §12 self-critique #3).

import { classifyProvenance, provenanceRationale, HARD_RECORD_EVIDENCE_TYPES } from './provenance';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

check('missing verificationStatus is unknown', classifyProvenance({ verificationStatus: undefined as any, evidenceType: 'message' }) === 'unknown');
check('missing evidenceType is unknown', classifyProvenance({ verificationStatus: 'verified', evidenceType: undefined as any }) === 'unknown');

check('disputed is disputed_statement regardless of evidenceType', classifyProvenance({ verificationStatus: 'disputed', evidenceType: 'payment_record' }) === 'disputed_statement');

check('unverified is unverified_statement (weakest compatible default)', classifyProvenance({ verificationStatus: 'unverified', evidenceType: 'message' }) === 'unverified_statement');
check('unverified stays unverified_statement even for a hard-record evidenceType', classifyProvenance({ verificationStatus: 'unverified', evidenceType: 'payment_record' }) === 'unverified_statement');

check('verified + hard-record evidenceType is confirmed_fact', classifyProvenance({ verificationStatus: 'verified', evidenceType: 'payment_record' }) === 'confirmed_fact');
check('verified + non-hard-record evidenceType defaults to document_supported', classifyProvenance({ verificationStatus: 'verified', evidenceType: 'email' }) === 'document_supported');

check('every HARD_RECORD_EVIDENCE_TYPES entry yields confirmed_fact when verified', [...HARD_RECORD_EVIDENCE_TYPES].every(
  (evidenceType) => classifyProvenance({ verificationStatus: 'verified', evidenceType }) === 'confirmed_fact'
));

check('ENR-001 never assigns ai_inference or confirmed_fact-by-default', classifyProvenance({ verificationStatus: 'verified', evidenceType: 'photo' }) !== 'ai_inference');

check('rationale is non-empty for every provenance class', (
  ['unknown', 'disputed_statement', 'unverified_statement', 'document_supported', 'confirmed_fact', 'ai_inference'] as const
).every((p) => provenanceRationale({ verificationStatus: 'verified', evidenceType: 'email' }, p).length > 0));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
