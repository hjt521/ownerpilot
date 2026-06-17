import { evaluateDisputeScreen } from './gates';
import { DisputeScreen } from './noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}


console.log('\n=== Dispute screen ===');

console.log('\n1. All three "no" -> cleared, not blocked');
{
  const r = evaluateDisputeScreen({
    tenantFiledComplaint: 'no',
    tenantWrittenWithholding: 'no',
    tenantBankruptcy: 'no',
  });
  check('cleared', r.cleared === true);
  check('not blocked', r.blocked === false);
}

console.log('\n2. Unanswered -> NOT cleared, blocked (fails closed)');
{
  const r = evaluateDisputeScreen({ tenantFiledComplaint: 'no' });
  check('not cleared', r.cleared === false);
  check('blocked', r.blocked === true);
}

console.log('\n3. Empty screen -> blocked');
{
  const r = evaluateDisputeScreen({});
  check('blocked', r.blocked === true);
  check('not cleared', r.cleared === false);
}

console.log('\n4. Each "yes" clears and is flagged (soft-recommend; no hard block)');
{
  const a = evaluateDisputeScreen({ tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  const b = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'yes', tenantBankruptcy: 'no' });
  const c = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'yes' });
  check('complaint yes clears', a.cleared === true && a.blocked === false);
  check('withholding yes clears', b.cleared === true && b.blocked === false);
  check('bankruptcy yes clears', c.cleared === true && c.blocked === false);
  check('each yes is flagged', a.flagged && b.flagged && c.flagged);
}

console.log('\n4b. "I don\u2019t know" clears and flags (soft-recommend); only unanswered blocks');
{
  const cu = evaluateDisputeScreen({ tenantFiledComplaint: 'unknown', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  check('complaint-unknown CLEARS', cu.cleared === true);
  check('complaint-unknown flagged', cu.flagged === true);

  const wu = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'unknown', tenantBankruptcy: 'no' });
  check('withholding-unknown CLEARS', wu.cleared === true);
  check('withholding-unknown flagged', wu.flagged === true);

  const bu = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'unknown' });
  check('bankruptcy-unknown CLEARS', bu.cleared === true);
  check('bankruptcy-unknown flagged', bu.flagged === true);
  check('bankruptcy-unknown internal set', bu.bankruptcyUnknown === true);
}

console.log('\n4b-2. Unanswered ALWAYS blocks, even on the proceed-policy question');
{
  // complaint is the proceed-on-unknown question, but UNANSWERED still blocks.
  const r = evaluateDisputeScreen({ tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  check('unanswered complaint blocks', r.cleared === false && r.blocked === true);
  check('unanswered complaint flagged blocking', r.perQuestion.tenantFiledComplaint === 'blocking');
}

console.log('\n4c. yes + unknown together clears and flags (soft-recommend)');
{
  const r = evaluateDisputeScreen({ tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'unknown' });
  check('flagged when a yes present', r.flagged === true);
  check('clears (only unanswered blocks)', r.cleared === true);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);


// --- C5 soft-recommend safety screen (flag retired, soft is unconditional) --
console.log('\nC5. Safety screen soft-recommend (unconditional)');
{
  const base: DisputeScreen = { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' };
  const softYes = evaluateDisputeScreen({ ...base, tenantBankruptcy: 'yes' });
  check('bankruptcy yes flagged + cleared', softYes.flagged === true && softYes.cleared === true);
  const softUnk = evaluateDisputeScreen({ ...base, tenantWrittenWithholding: 'unknown' });
  check('unknown flags + cleared', softUnk.flagged === true && softUnk.cleared === true);
  const softUnanswered = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no' });
  check('unanswered blocks', softUnanswered.cleared === false);
  const softClean = evaluateDisputeScreen({ ...base });
  check('all no -> clean', softClean.flagged === false && softClean.cleared === true);
}
