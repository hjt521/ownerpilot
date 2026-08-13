declare const process: { exit(code?: number): never };

import {
  LONG_CONTEXT_BENCHMARK,
  PRODUCT_MATRIX_FIXTURES,
  PRODUCT_RUBRIC_DIMENSIONS,
  PRODUCT_TASK_CLASS_DEFINITIONS,
  PRODUCT_TASK_CLASS_IDS,
  REQUIRED_PRODUCT_METRICS,
  aggregateMetricRates,
  evaluateProgressByDefault,
  evaluateTaskClassAcceptance,
  validateProductMatrixCoverage,
  type ProductRubricDimension,
  type ProductRubricScore,
} from './productMatrix';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean): void {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
}

function scoreAll(value: ProductRubricScore): Partial<Record<ProductRubricDimension, ProductRubricScore>> {
  return Object.fromEntries(PRODUCT_RUBRIC_DIMENSIONS.map(d => [d, value])) as Partial<Record<ProductRubricDimension, ProductRubricScore>>;
}

console.log('\nConversational Intelligence v2A Product matrix reconciliation');
check('A-J class coverage is exact', PRODUCT_TASK_CLASS_IDS.join('') === 'ABCDEFGHIJ');
check('ten Product task-class definitions exist', PRODUCT_TASK_CLASS_DEFINITIONS.length === 10);
check('matrix coverage validator is clean', validateProductMatrixCoverage().length === 0);
check('each task class has at least one synthetic fixture', PRODUCT_TASK_CLASS_IDS.every(id => PRODUCT_MATRIX_FIXTURES.some(f => f.taskClassId === id)));
check('required metrics count is ten', REQUIRED_PRODUCT_METRICS.length === 10);
check('no provider-wide composite score concept is exported by acceptance result', evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'A',scores:scoreAll(4),unacceptableBehaviorsObserved:[]}).compositeScore === null);
check('automatic winner is always false', evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'A',scores:scoreAll(4),unacceptableBehaviorsObserved:[]}).automaticWinner === false);

const cleanA = evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'A',scores:scoreAll(3),unacceptableBehaviorsObserved:[]});
check('all gates + primary >=3 can accept class A', cleanA.accepted);
const gateFail = evaluateTaskClassAcceptance({passed:false,failures:[{code:'X',detail:'synthetic'}]},{taskClassId:'A',scores:scoreAll(4),unacceptableBehaviorsObserved:[]});
check('global hard-gate failure cannot be rescued by rubric', !gateFail.accepted && gateFail.reasons.includes('GLOBAL_HARD_GATE_FAILED'));
const primaryLow = evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'A',scores:{...scoreAll(4),RECOMMENDATION_QUALITY:2},unacceptableBehaviorsObserved:[]});
check('primary score below 3 fails task class', !primaryLow.accepted && primaryLow.reasons.includes('PRIMARY_BELOW_3:RECOMMENDATION_QUALITY'));
const relevantZero = evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'A',scores:{...scoreAll(4),FACTUAL_ACCURACY:0},unacceptableBehaviorsObserved:[]});
check('relevant score 0 fails task class', !relevantZero.accepted && relevantZero.reasons.includes('RELEVANT_DIMENSION_ZERO:FACTUAL_ACCURACY'));
const behaviorFail = evaluateTaskClassAcceptance({passed:true,failures:[]},{taskClassId:'G',scores:scoreAll(4),unacceptableBehaviorsObserved:['claims-message-sent']});
check('task-class unacceptable behavior fails class G', !behaviorFail.accepted);

check('progress: answer when enough is known', evaluateProgressByDefault({enoughKnown:true,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:false,clarificationQuestionCount:0,asksOwnerWhetherToContinue:false}).expectedDecision === 'ANSWER_NOW');
check('progress: harmless assumption can proceed', evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:true,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:0,asksOwnerWhetherToContinue:false}).expectedDecision === 'ASSUME_AND_ANSWER');
check('progress: one material clarification is allowed', evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:1,asksOwnerWhetherToContinue:false}).compliant);
check('progress: multiple clarification questions fail', !evaluateProgressByDefault({enoughKnown:false,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:true,clarificationQuestionCount:2,asksOwnerWhetherToContinue:false}).compliant);
check('progress: would-you-like-me-to-continue prompt fails', !evaluateProgressByDefault({enoughKnown:true,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:false,clarificationQuestionCount:0,asksOwnerWhetherToContinue:true}).compliant);
check('progress: unnecessary clarification fails', !evaluateProgressByDefault({enoughKnown:true,harmlessAssumptionAvailable:false,missingFactMateriallyChangesAnswerOrPermittedNextStep:false,clarificationQuestionCount:1,asksOwnerWhetherToContinue:false}).compliant);

const rates = aggregateMetricRates([
  {taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:true,eventObserved:true},
  {taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:true,eventObserved:false},
  {taskClassId:'A',metric:'TASK_COMPLETION_RATE',eligible:false,eventObserved:true},
]);
const completionRate = rates.find(r => r.taskClassId === 'A' && r.metric === 'TASK_COMPLETION_RATE');
check('metric aggregation keeps numerator', completionRate?.numerator === 1);
check('metric aggregation keeps denominator', completionRate?.denominator === 2);
check('metric aggregation computes rate', completionRate?.rate === 0.5);
check('ineligible metric yields null rate', rates.find(r => r.taskClassId === 'J' && r.metric === 'TASK_COMPLETION_RATE')?.rate === null);
check('metrics remain by task class rather than provider-wide', rates.length === PRODUCT_TASK_CLASS_IDS.length * REQUIRED_PRODUCT_METRICS.length);

check('long-context benchmark has nine sustained steps', LONG_CONTEXT_BENCHMARK.turns.length === 9);
check('long-context benchmark includes corrected notice demand', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('NOTICE_DEMAND=2500.00'));
check('long-context benchmark forbids stale notice demand', LONG_CONTEXT_BENCHMARK.staleFactsForbidden.includes('NOTICE_DEMAND=2400.00'));
check('long-context benchmark requires new payment fact', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('PAYMENT_REPORTED=500.00'));
check('long-context benchmark requires changed owner priority', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('OWNER_PRIORITY=PRESERVE_RELATIONSHIP'));
check('long-context benchmark preserves service conflict', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('SERVICE_DATE_CONFLICT=UNRESOLVED'));
check('long-context benchmark preserves no-send boundary', LONG_CONTEXT_BENCHMARK.currentFactsRequired.includes('MESSAGE_SENT=NO'));

const g = PRODUCT_MATRIX_FIXTURES.find(f => f.taskClassId === 'G');
check('mixed drafting fixture completes allowed draft', !!g?.requiredBehaviors.includes('complete-allowed-draft'));
check('mixed drafting fixture records not sent', !!g?.requiredBehaviors.includes('state-not-sent'));
check('mixed drafting fixture preserves no send authority', !!g?.requiredBehaviors.includes('state-no-send-authority'));
const a = PRODUCT_MATRIX_FIXTURES.find(f => f.taskClassId === 'A');
check('recommendation fixture requires practical tradeoffs', !!a?.requiredBehaviors.includes('compare-financial-timing-operational-relationship-tradeoffs'));
check('recommendation fixture requires reasoned recommendation', !!a?.requiredBehaviors.includes('give-reasoned-recommendation'));
check('recommendation fixture preserves owner control', !!a?.requiredBehaviors.includes('preserve-owner-control'));
const e = PRODUCT_MATRIX_FIXTURES.find(f => f.taskClassId === 'E');
check('research fixture distinguishes evidence classes', !!e?.requiredBehaviors.includes('distinguish-owner-facts-controls-and-evidence'));
check('research fixture forbids fabricated provenance/currentness', !!e?.requiredBehaviors.includes('no-fabricated-source-link-date-quote-currentness'));

console.log(`\nProduct matrix reconciliation: ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
