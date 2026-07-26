// lib/btrm/rie/catalog.test.ts — RIE-001 ResolutionOptionType -> reversibility/materialConsequence fixed mapping
// (BTRM-001 spec §3.6, §6).

import {
  ALL_RESOLUTION_OPTION_TYPES,
  RESOLUTION_OPTION_REVERSIBILITY,
  RESOLUTION_OPTION_MATERIAL_CONSEQUENCE,
  reversibilityFor,
  isMaterialConsequence,
} from './catalog';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

check(
  'every closed-vocabulary option type has a reversibility mapping',
  ALL_RESOLUTION_OPTION_TYPES.every((t) => t in RESOLUTION_OPTION_REVERSIBILITY)
);
check(
  'every closed-vocabulary option type has a materialConsequence mapping',
  ALL_RESOLUTION_OPTION_TYPES.every((t) => t in RESOLUTION_OPTION_MATERIAL_CONSEQUENCE)
);

check(
  'clarification_request is fully reversible and not material',
  reversibilityFor('clarification_request') === 'fully_reversible' && !isMaterialConsequence('clarification_request')
);
check(
  'evidence_request is fully reversible and not material',
  reversibilityFor('evidence_request') === 'fully_reversible' && !isMaterialConsequence('evidence_request')
);
check(
  'reminder is fully reversible and not material',
  reversibilityFor('reminder') === 'fully_reversible' && !isMaterialConsequence('reminder')
);
check(
  'structured_commitment is partially reversible and not material',
  reversibilityFor('structured_commitment') === 'partially_reversible' && !isMaterialConsequence('structured_commitment')
);
check(
  'mediation_referral is partially reversible and not material (a referral is not itself binding)',
  reversibilityFor('mediation_referral') === 'partially_reversible' && !isMaterialConsequence('mediation_referral')
);
check(
  'payment_plan is partially reversible and material (financial concession)',
  reversibilityFor('payment_plan') === 'partially_reversible' && isMaterialConsequence('payment_plan')
);
check(
  'repair_and_rent_coordination is partially reversible and material (may bind rent terms)',
  reversibilityFor('repair_and_rent_coordination') === 'partially_reversible' && isMaterialConsequence('repair_and_rent_coordination')
);
check(
  'cure_agreement is partially reversible and material (settlement terms)',
  reversibilityFor('cure_agreement') === 'partially_reversible' && isMaterialConsequence('cure_agreement')
);
check(
  'mutual_move_out is not reversible and material (termination)',
  reversibilityFor('mutual_move_out') === 'not_reversible' && isMaterialConsequence('mutual_move_out')
);
check(
  'formal_notice_workflow is not reversible and material (formal notice)',
  reversibilityFor('formal_notice_workflow') === 'not_reversible' && isMaterialConsequence('formal_notice_workflow')
);
check(
  'escalation_to_filing_prep is not reversible and material (filing prep)',
  reversibilityFor('escalation_to_filing_prep') === 'not_reversible' && isMaterialConsequence('escalation_to_filing_prep')
);

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
