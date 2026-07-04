// lib/intake/__tests__/noticePathwayGate.test.ts
// Lane W2 gate — FF-3-enum pathway routing + the drift fix (FF-3 enum values were misclassified as 'efs') +
// proposed Wave-4 synthetics.

import { evaluateNoticePathwayGate, W2_PATHWAY_SOURCE_AUTHORITY } from '../noticePathwayGate';
import { recognizedNoticePathway } from '../noticePathway';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// --- The drift fix: FF-3 enum termination values now route to Declaration (were 'efs' before) -------------------
check('recognizedNoticePathway sixty_day_termination → declaration_of_intent (was misrouting to efs)',
  recognizedNoticePathway('sixty_day_termination') === 'declaration_of_intent');
check('recognizedNoticePathway ninety_day_termination_section8 → declaration_of_intent',
  recognizedNoticePathway('ninety_day_termination_section8') === 'declaration_of_intent');
check('recognizedNoticePathway thirty_day_termination → declaration_of_intent',
  recognizedNoticePathway('thirty_day_termination') === 'declaration_of_intent');
check('recognizedNoticePathway three_day_pay_or_quit → efs',
  recognizedNoticePathway('three_day_pay_or_quit') === 'efs');
check('recognizedNoticePathway unknown → null (fail-closed, not defaulted to efs)',
  recognizedNoticePathway('purple_notice') === null);
// Legacy W2 labels still recognized (backward-compat).
check('recognizedNoticePathway legacy "60_day" still → declaration_of_intent',
  recognizedNoticePathway('60_day') === 'declaration_of_intent');
check('recognizedNoticePathway legacy "60-day" (spelling) still → declaration_of_intent',
  recognizedNoticePathway('60-day') === 'declaration_of_intent');

// --- Proposed Wave-4 synthetics --------------------------------------------------------------------------------
{
  // SC-W2-3DAY-ROUTES-EFS-01
  const g = evaluateNoticePathwayGate({ notice_type: 'three_day_pay_or_quit', evaluatedAt: '2026-07-03T12:00:00Z' });
  check('SC-W2-3DAY-ROUTES-EFS-01: three_day_pay_or_quit → efs', g.result === 'efs' && g.context.pathway === 'efs');
}
{
  // SC-W2-60DAY-ROUTES-DECLARATION-01 (the case the legacy core would have misrouted)
  const g = evaluateNoticePathwayGate({ notice_type: 'sixty_day_termination', evaluatedAt: '2026-07-03T12:00:00Z' });
  check('SC-W2-60DAY-ROUTES-DECLARATION-01: sixty_day_termination → declaration_of_intent', g.result === 'declaration_of_intent');
}
{
  // SC-W2-PREREQ-INCOMPLETE-01: null notice_type → fail-closed
  const g = evaluateNoticePathwayGate({ notice_type: null, evaluatedAt: '2026-07-03T12:00:00Z' });
  check('SC-W2-PREREQ-INCOMPLETE-01: null notice_type → prerequisite_incomplete', g.result === 'prerequisite_incomplete' && g.context.pathway === null);
}
{
  // SC-W2-UNKNOWN-TYPE-FAILCLOSED-01: unrecognized type → prerequisite_incomplete (NOT a silent efs default)
  const g = evaluateNoticePathwayGate({ notice_type: 'not_a_real_notice', evaluatedAt: '2026-07-03T12:00:00Z' });
  check('SC-W2-UNKNOWN-TYPE-FAILCLOSED-01: unknown → prerequisite_incomplete (not efs)', g.result === 'prerequisite_incomplete');
}

// --- gate shape ------------------------------------------------------------------------------------------------
{
  const g = evaluateNoticePathwayGate({ notice_type: 'thirty_day_termination', evaluatedAt: '2026-07-03T12:00:00Z' });
  check('gate id is w2_notice_pathway', g.gate === 'w2_notice_pathway');
  check('context stamps evaluated_at + source_authority + notice_type',
    g.context.evaluated_at === '2026-07-03T12:00:00Z' && g.context.source_authority === W2_PATHWAY_SOURCE_AUTHORITY && g.context.notice_type === 'thirty_day_termination');
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nW2 notice-pathway gate: all passed');
