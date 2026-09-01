import { strict as assert } from 'node:assert';
import {
  OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
  computeOfficialFormCompleteTerminalPlanSnapshot,
  computeOfficialFormGeneratedDraftAdmissionSnapshot,
  computeOfficialFormPreparationAuthorizationSnapshot,
  evaluateOfficialFormGeneratedDraftAdmission,
  type OfficialFormGeneratedDraftAdmissionEnvelope,
  type OfficialFormGeneratedDraftTargetIdentity,
  type OfficialFormPreparationRelevanceAuthorization,
} from './officialFormGeneratedDraftAdmission';

let passed = 0;
const ok=(v:unknown,m:string)=>{assert.ok(v,m);passed+=1;};
const equal=<T>(a:T,e:T,m:string)=>{assert.equal(a,e,m);passed+=1;};
const notEqual=<T>(a:T,e:T,m:string)=>{assert.notEqual(a,e,m);passed+=1;};
const deepEqual=(a:unknown,e:unknown,m:string)=>{assert.deepEqual(a,e,m);passed+=1;};

const target: OfficialFormGeneratedDraftTargetIdentity = {
  formId:'SYNTHETIC-FORM',formRevision:'2026-01',sourceSha256:'a'.repeat(64),
  fieldMapId:'synthetic-map',fieldMapVersion:'v1',fieldMapSnapshot:`sha256:${'b'.repeat(64)}`,
  generationBindingProfileId:'synthetic-binding',generationBindingProfileVersion:'v1',generationBindingProfileSnapshot:`sha256:${'c'.repeat(64)}`,
};
const context={generation:'synthetic-generation',createdAtISO:'2026-09-01T00:00:00.000Z'};
function auth(overrides:Partial<OfficialFormPreparationRelevanceAuthorization>={}):OfficialFormPreparationRelevanceAuthorization{
  const baseWithoutSnapshot={authorizationId:'auth-1',resultId:'result-1',controlId:'prep-relevance',controlVersion:'v1',status:'CURRENT',decision:'FORM_RELEVANT_FOR_PREPARATION',target,matterContextIdentity:context};
  const merged={...baseWithoutSnapshot,...overrides} as any;
  if (!overrides.authorizationSnapshot) merged.authorizationSnapshot=computeOfficialFormPreparationAuthorizationSnapshot({
    authorizationId:merged.authorizationId,resultId:merged.resultId,controlId:merged.controlId,controlVersion:merged.controlVersion,status:merged.status,decision:merged.decision,target:merged.target,matterContextIdentity:merged.matterContextIdentity,
  });
  return merged;
}
const plan=[
  {action:'WRITE_TEXT' as const,fieldId:'A',value:'Exact Value',canonicalFactRef:'fact.a',provenance:{source:'synthetic'}},
  {action:'PRESERVE_OFFICIAL_BLANK_NO_WRITE' as const,fieldId:'B',reason:'PROTECTED'},
  {action:'PRESERVE_OFFICIAL_BLANK_NO_WRITE' as const,fieldId:'C',reason:'UNUSED'},
];
function envelope(overrides:Partial<OfficialFormGeneratedDraftAdmissionEnvelope>={}):OfficialFormGeneratedDraftAdmissionEnvelope{
  return {schemaVersion:OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,target,expectedPageCount:1,expectedTerminalFieldCount:3,expectedTerminalFieldIds:['A','B','C'],protectedTerminalFieldIds:['B'],preparationAuthorization:auth(),matterContextIdentity:context,completeTerminalPlan:plan,governance:OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,...overrides};
}

equal(OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,'2026-09-01.r1','generic admission schema version frozen');
deepEqual(OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,{formApplicability:'NOT_EVALUATED',formRequiredness:'NOT_EVALUATED',legalSufficiency:'NOT_DETERMINED',documentGeneration:'NOT_PERFORMED',pdfMutation:'NOT_PERFORMED',databaseWrite:'NO',persistence:'NO',preparationCheckpointWrite:'NO',ownerReviewCheckpointWrite:'NO',checkpoint1:'HELD',filing:'NO',signing:'NO',serviceExecution:'NO',courtSubmission:'NO',stageF:'HELD',newProductionAuthority:'NO'},'generic governance frozen');
const baseline=evaluateOfficialFormGeneratedDraftAdmission(envelope());
equal(baseline.status,'ADMISSION_READY','valid exact input admitted');
if(baseline.status!=='ADMISSION_READY') throw new Error('baseline');
equal(baseline.completeTerminalPlan.length,3,'complete plan retained');
equal(baseline.expectedPageCount,1,'page count retained');
equal(baseline.expectedTerminalFieldCount,3,'terminal count retained');
equal(baseline.governance.documentGeneration,'NOT_PERFORMED','document generation not performed');
equal(baseline.governance.pdfMutation,'NOT_PERFORMED','pdf mutation not performed');
equal(baseline.governance.databaseWrite,'NO','database write no');
equal(baseline.governance.persistence,'NO','persistence no');
equal(baseline.governance.checkpoint1,'HELD','checkpoint held');
equal(baseline.governance.filing,'NO','filing no');
equal(baseline.governance.signing,'NO','signing no');
equal(baseline.governance.serviceExecution,'NO','service no');
equal(baseline.governance.courtSubmission,'NO','court submission no');
equal(baseline.governance.stageF,'HELD','stage F held');
equal(baseline.governance.newProductionAuthority,'NO','Production held');
equal(baseline.completeTerminalPlanSnapshot,computeOfficialFormCompleteTerminalPlanSnapshot(plan),'plan snapshot deterministic');
equal(baseline.admissionSnapshot,computeOfficialFormGeneratedDraftAdmissionSnapshot(envelope()),'admission snapshot deterministic');
ok(/^sha256:[0-9a-f]{64}$/.test(baseline.admissionSnapshot),'admission snapshot content addressed');

const noAuth=evaluateOfficialFormGeneratedDraftAdmission({...envelope(),preparationAuthorization:null} as any); equal(noAuth.status==='BLOCKED'?noAuth.blockerCode:'','PREPARATION_AUTHORIZATION_MISSING_OR_INVALID','missing auth blocks');
const stale=evaluateOfficialFormGeneratedDraftAdmission(envelope({preparationAuthorization:auth({status:'STALE'})})); equal(stale.status==='BLOCKED'?stale.blockerCode:'','PREPARATION_AUTHORIZATION_NOT_CURRENT','stale auth blocks');
const notRelevant=evaluateOfficialFormGeneratedDraftAdmission(envelope({preparationAuthorization:auth({decision:'FORM_NOT_RELEVANT_FOR_PREPARATION'})})); equal(notRelevant.status==='BLOCKED'?notRelevant.blockerCode:'','PREPARATION_AUTHORIZATION_NOT_RELEVANT','not relevant blocks');
const wrongTarget={...target,formId:'OTHER'}; const wrongTargetResult=evaluateOfficialFormGeneratedDraftAdmission(envelope({preparationAuthorization:auth({target:wrongTarget})})); equal(wrongTargetResult.status==='BLOCKED'?wrongTargetResult.blockerCode:'','PREPARATION_AUTHORIZATION_TARGET_MISMATCH','wrong target blocks');
const wrongContext={...context,generation:'other'}; const wrongContextResult=evaluateOfficialFormGeneratedDraftAdmission(envelope({preparationAuthorization:auth({matterContextIdentity:wrongContext})})); equal(wrongContextResult.status==='BLOCKED'?wrongContextResult.blockerCode:'','PREPARATION_AUTHORIZATION_CONTEXT_MISMATCH','wrong context blocks');
const badSnapshot=evaluateOfficialFormGeneratedDraftAdmission(envelope({preparationAuthorization:{...auth(),authorizationSnapshot:`sha256:${'0'.repeat(64)}`}})); equal(badSnapshot.status==='BLOCKED'?badSnapshot.blockerCode:'','PREPARATION_AUTHORIZATION_SNAPSHOT_MISMATCH','auth snapshot mismatch blocks');
const badPage=evaluateOfficialFormGeneratedDraftAdmission(envelope({expectedPageCount:0})); equal(badPage.status==='BLOCKED'?badPage.blockerCode:'','EXPECTED_PAGE_COUNT_INVALID','bad page count blocks');
const badCount=evaluateOfficialFormGeneratedDraftAdmission(envelope({expectedTerminalFieldCount:4})); equal(badCount.status==='BLOCKED'?badCount.blockerCode:'','EXPECTED_TERMINAL_COUNT_INVALID','bad terminal count blocks');
const omitted=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:plan.slice(0,2)})); equal(omitted.status==='BLOCKED'?omitted.blockerCode:'','TERMINAL_PLAN_INCOMPLETE','omitted destination blocks');
const duplicate=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:[plan[0],plan[1],plan[1]]})); equal(duplicate.status==='BLOCKED'?duplicate.blockerCode:'','DUPLICATE_TERMINAL_DESTINATION','duplicate destination blocks');
const unexpected=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:[plan[0],plan[1],{action:'PRESERVE_OFFICIAL_BLANK_NO_WRITE',fieldId:'X',reason:'X'}]})); equal(unexpected.status==='BLOCKED'?unexpected.blockerCode:'','UNEXPECTED_TERMINAL_DESTINATION','unexpected destination blocks');
const protectedWrite=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:[plan[0],{action:'WRITE_TEXT',fieldId:'B',value:'x',canonicalFactRef:'fact.b',provenance:{}},plan[2]]})); equal(protectedWrite.status==='BLOCKED'?protectedWrite.blockerCode:'','PROTECTED_DESTINATION_WRITE','protected write blocks');
const bytes=evaluateOfficialFormGeneratedDraftAdmission({...envelope(),pdfBytes:new Uint8Array([1,2,3])} as any); equal(bytes.status==='BLOCKED'?bytes.blockerCode:'','PDF_BYTES_NOT_ALLOWED','pdf bytes rejected');
const nestedBytes=evaluateOfficialFormGeneratedDraftAdmission({...envelope(),extra:{buffer:new Uint8Array([1])}} as any); equal(nestedBytes.status==='BLOCKED'?nestedBytes.blockerCode:'','PDF_BYTES_NOT_ALLOWED','nested bytes rejected');
const badGov=evaluateOfficialFormGeneratedDraftAdmission(envelope({governance:{...OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,documentGeneration:'PERFORMED'} as any})); equal(badGov.status==='BLOCKED'?badGov.blockerCode:'','GOVERNANCE_POSTURE_MISMATCH','performed generation posture blocks');
const badWrite=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:[{action:'WRITE_TEXT',fieldId:'A',value:'Exact Value',canonicalFactRef:'',provenance:{source:'synthetic'}},plan[1],plan[2]]})); equal(badWrite.status==='BLOCKED'?badWrite.blockerCode:'','MALFORMED_WRITE_DESTINATION','malformed write blocks');
const badNoWrite=evaluateOfficialFormGeneratedDraftAdmission(envelope({completeTerminalPlan:[plan[0],{action:'PRESERVE_OFFICIAL_BLANK_NO_WRITE',fieldId:'B',reason:''},plan[2]]})); equal(badNoWrite.status==='BLOCKED'?badNoWrite.blockerCode:'','MALFORMED_NO_WRITE_DESTINATION','malformed no-write blocks');
const snap1=computeOfficialFormCompleteTerminalPlanSnapshot(plan); const snap2=computeOfficialFormCompleteTerminalPlanSnapshot(plan); equal(snap1,snap2,'same plan same snapshot');
const changedPlan=[{...plan[0],value:'Different'},plan[1],plan[2]]; notEqual(snap1,computeOfficialFormCompleteTerminalPlanSnapshot(changedPlan),'plan value changes snapshot');
const auth1=auth(); const auth2=auth(); equal(auth1.authorizationSnapshot,auth2.authorizationSnapshot,'authorization snapshot deterministic');
const authChanged=auth({resultId:'result-2'}); notEqual(auth1.authorizationSnapshot,authChanged.authorizationSnapshot,'authorization result identity changes snapshot');

console.log(`officialFormGeneratedDraftAdmission: ${passed} assertions passed`);
