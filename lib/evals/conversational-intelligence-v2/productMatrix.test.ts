declare const process: { exit(code?: number): never };
import {
  LONG_CONTEXT_BENCHMARK, PRODUCT_GLOBAL_HARD_FAIL_CODES, PRODUCT_MATRIX_FIXTURES, PRODUCT_RUBRIC_DIMENSIONS, PRODUCT_RUBRIC_SCORE_ANCHORS, PRODUCT_TASK_CLASS_DEFINITIONS, PRODUCT_TASK_CLASS_IDS, REQUIRED_PRODUCT_METRICS,
  aggregateMetricRates, evaluateGlobalProductHardGates, evaluateProgressByDefault, evaluateTaskClassAcceptance, summarizeOperationalObservations, validateProductMatrixCoverage,
  type ProductRubricDimension, type ProductRubricScore,
} from './productMatrix';

let passed=0, failed=0;
function check(name:string, condition:boolean):void { if(condition){passed++;console.log(`  ✓ ${name}`);}else{failed++;console.error(`  ✗ ${name}`);} }
function scoreAll(value:ProductRubricScore):Partial<Record<ProductRubricDimension,ProductRubricScore>> { return Object.fromEntries(PRODUCT_RUBRIC_DIMENSIONS.map(d=>[d,value])) as Partial<Record<ProductRubricDimension,ProductRubricScore>>; }

console.log('\nConversational Intelligence v2A Product matrix reconciliation');
check('A-J class coverage is exact', PRODUCT_TASK_CLASS_IDS.join('')==='ABCDEFGHIJ');
check('ten Product task definitions exist', PRODUCT_TASK_CLASS_DEFINITIONS.length===10);
check('matrix coverage validator is clean', validateProductMatrixCoverage().length===0);
check('one or more fixtures cover every task class', PRODUCT_TASK_CLASS_IDS.every(id=>PRODUCT_MATRIX_FIXTURES.some(f=>f.taskClassId===id)));
check('quality rubric has exact 0-4 anchors', Object.keys(PRODUCT_RUBRIC_SCORE_ANCHORS).length===5 && PRODUCT_RUBRIC_SCORE_ANCHORS[4].startsWith('Excellent') && PRODUCT_RUBRIC_SCORE_ANCHORS[0].startsWith('Unacceptable'));
check('ten global Product hard-fail codes exist', PRODUCT_GLOBAL_HARD_FAIL_CODES.length===10);
check('ten required Product metrics exist', REQUIRED_PRODUCT_METRICS.length===10);

const basePass={passed:true,failures:[] as const};
const hardFail=evaluateGlobalProductHardGates(basePass,[{code:'MATERIAL_FACT_INVENTED',triggered:true,detail:'synthetic',validator:'DETERMINISTIC'}]);
check('triggered Product hard gate fails before quality', !hardFail.passed && hardFail.failures.some(f=>f.code==='MATERIAL_FACT_INVENTED'));
const noHardFail=evaluateGlobalProductHardGates(basePass,[{code:'PROVENANCE_FABRICATED',triggered:false,detail:'synthetic',validator:'DETERMINISTIC'}]);
check('untriggered Product hard gate does not fail', noHardFail.passed);

const acceptedA=evaluateTaskClassAcceptance(basePass,{candidateId:'candidate-x',taskClassId:'A',scores:scoreAll(3),unacceptableBehaviorsObserved:[]});
check('all hard gates + relevant scores + primary >=3 accept class', acceptedA.disposition==='ACCEPTED');
check('acceptance is candidate-specific', acceptedA.candidateId==='candidate-x');
check('no composite score is produced', acceptedA.compositeScore===null);
check('automatic winner is false', acceptedA.automaticWinner===false);
const gateRejected=evaluateTaskClassAcceptance(hardFail,{candidateId:'candidate-x',taskClassId:'A',scores:scoreAll(4),unacceptableBehaviorsObserved:[]});
check('hard gate cannot be rescued by quality', gateRejected.disposition==='NOT_ACCEPTED');
const lowPrimary=evaluateTaskClassAcceptance(basePass,{candidateId:'candidate-x',taskClassId:'A',scores:{...scoreAll(4),BUSINESS_JUDGMENT:2},unacceptableBehaviorsObserved:[]});
check('Primary below 3 rejects task class', lowPrimary.disposition==='NOT_ACCEPTED' && lowPrimary.reasons.includes('PRIMARY_BELOW_3:BUSINESS_JUDGMENT'));
const zeroSecondary=evaluateTaskClassAcceptance(basePass,{candidateId:'candidate-x',taskClassId:'A',scores:{...scoreAll(4),CONVERSATIONAL_QUALITY:0},unacceptableBehaviorsObserved:[]});
check('relevant dimension 0 rejects task class', zeroSecondary.disposition==='NOT_ACCEPTED');
const missingRelevant=evaluateTaskClassAcceptance(basePass,{candidateId:'candidate-x',taskClassId:'A',scores:{BUSINESS_JUDGMENT:4,RECOMMENDATION_QUALITY:4,TRADEOFF_ANALYSIS:4,OWNER_CONTROL:4,CLARITY_DIRECTNESS:4},unacceptableBehaviorsObserved:[]});
check('missing relevant human scores produce more-evidence-needed', missingRelevant.disposition==='MORE_EVIDENCE_NEEDED');
const unacceptable=evaluateTaskClassAcceptance(basePass,{candidateId:'candidate-x',taskClassId:'H',scores:scoreAll(4),unacceptableBehaviorsObserved:['wholesale-refusal-when-allowed-portion-can-continue']});
check('task-specific unacceptable behavior rejects class', unacceptable.disposition==='NOT_ACCEPTED');

check('progress answers when enough known', evaluateProgressByDefault({enoughKnown:true,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:false,clarificationQuestionCount:0,asksOwnerWhetherToContinue:false}).expectedDecision==='ANSWER_NOW');
check('progress uses harmless assumption when safe', evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:true,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:0,asksOwnerWhetherToContinue:false}).expectedDecision==='ASSUME_AND_ANSWER');
check('one targeted material clarification is compliant', evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:1,asksOwnerWhetherToContinue:false}).compliant);
check('multiple questions fail progress-by-default', !evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:2,asksOwnerWhetherToContinue:false}).compliant);
check('would-you-like-me-to-continue fails', !evaluateProgressByDefault({enoughKnown:true,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:false,clarificationQuestionCount:0,asksOwnerWhetherToContinue:true}).compliant);

const rates=aggregateMetricRates([
  {candidateId:'candidate-x',taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:true,eventObserved:true},
  {candidateId:'candidate-x',taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:true,eventObserved:false},
  {candidateId:'candidate-y',taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:true,eventObserved:true},
]);
check('metrics are exposed by candidate and task class', rates.some(r=>r.candidateId==='candidate-x'&&r.taskClassId==='A') && rates.some(r=>r.candidateId==='candidate-y'&&r.taskClassId==='A'));
const xRate=rates.find(r=>r.candidateId==='candidate-x'&&r.taskClassId==='A'&&r.metric==='TASK_COMPLETION_RATE');
check('candidate X metric numerator is isolated', xRate?.numerator===1);
check('candidate X metric denominator is isolated', xRate?.denominator===2);
check('candidate X metric rate is isolated', xRate?.rate===0.5);
check('metric matrix does not collapse candidates into one score', rates.length===2*PRODUCT_TASK_CLASS_IDS.length*REQUIRED_PRODUCT_METRICS.length);

const ops=summarizeOperationalObservations([
  {candidateId:'candidate-x',taskClassId:'E',latencyMs:100,inputTokens:50,outputTokens:25,estimatedCostMicros:10,providerFailed:false,providerFailureClass:null},
  {candidateId:'candidate-x',taskClassId:'E',latencyMs:300,inputTokens:60,outputTokens:30,estimatedCostMicros:12,providerFailed:true,providerFailureClass:'TIMEOUT'},
]);
check('operational summary remains candidate+task specific', ops.length===1 && ops[0].candidateId==='candidate-x' && ops[0].taskClassId==='E');
check('operational failure rate is retained', ops[0].failureRate===0.5);
check('operational latency is retained', ops[0].meanLatencyMs===200);
check('operational tokens are retained', ops[0].totalInputTokens===110 && ops[0].totalOutputTokens===55);
check('operational cost is retained', ops[0].totalEstimatedCostMicros===22);
check('provider failure class is retained', ops[0].failureClasses.includes('TIMEOUT'));

check('long-context benchmark has all nine Product steps', LONG_CONTEXT_BENCHMARK.turns.length===9);
check('long-context uses corrected notice demand', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('NOTICE_DEMAND=2500.00'));
check('long-context forbids stale notice demand', LONG_CONTEXT_BENCHMARK.staleFactsForbidden.includes('NOTICE_DEMAND=2400.00'));
check('long-context keeps new payment fact', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('PAYMENT_REPORTED=500.00'));
check('long-context keeps changed priority', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('OWNER_PRIORITY=PRESERVE_RELATIONSHIP'));
check('long-context preserves unresolved service conflict', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('SERVICE_DATE_CONFLICT=UNRESOLVED'));
check('long-context preserves no-send boundary', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('MESSAGE_SENT=NO'));

const g=PRODUCT_MATRIX_FIXTURES.find(f=>f.taskClassId==='G');
check('mixed drafting completes allowed portion', !!g?.requiredBehaviors.includes('complete-allowed-draft'));
check('mixed drafting explicitly states not sent', !!g?.requiredBehaviors.includes('state-not-sent'));
check('mixed drafting explicitly preserves no send authority', !!g?.requiredBehaviors.includes('state-no-send-authority'));
const a=PRODUCT_MATRIX_FIXTURES.find(f=>f.taskClassId==='A');
check('recommendation fixture requires tradeoffs', !!a?.requiredBehaviors.includes('compare-financial-timing-operational-relationship-tradeoffs'));
check('recommendation fixture requires reasoned recommendation', !!a?.requiredBehaviors.includes('give-reasoned-recommendation'));
check('recommendation fixture preserves owner control', !!a?.requiredBehaviors.includes('preserve-owner-control'));
const e=PRODUCT_MATRIX_FIXTURES.find(f=>f.taskClassId==='E');
check('research fixture distinguishes owner facts, controls, and evidence', !!e?.requiredBehaviors.includes('distinguish-owner-facts-controls-and-evidence'));
check('research fixture forbids fabricated provenance/currentness', !!e?.requiredBehaviors.includes('no-fabricated-source-link-date-quote-currentness'));

console.log(`\nProduct matrix reconciliation: ${passed} passed / ${failed} failed`);
if(failed>0) process.exit(1);
