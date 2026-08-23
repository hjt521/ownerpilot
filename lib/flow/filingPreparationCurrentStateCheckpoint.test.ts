import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  createFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
  type FilingPreparationCurrentnessMaterialBinding,
} from './filingPreparationCurrentState';
import {
  createFilingPreparationCurrentStateCheckpoint,
  type GeneratedDraftCheckpointInput,
} from './filingPreparationCurrentStateCheckpoint';
import {
  computeGeneratedDocumentId,
  sha256Bytes,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import { OWNER_REVIEW_STATEMENT_ID, OWNER_REVIEW_STATEMENT_VERSION } from './officialFormOwnerReview';
import type {
  AppendFilingPreparationCurrentStateInput,
  AppendFilingPreparationCurrentStateResult,
  ExpectedFilingPreparationCurrentState,
} from './filingPreparationCurrentStateSupabaseStore';

const RISKPATH='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER='11111111-1111-4111-8111-111111111111';
let passed=0;
const equal=<T>(actual:T,expected:T,message:string)=>{assert.equal(actual,expected,message);passed+=1;};
const ok=(value:unknown,message:string)=>{assert.ok(value,message);passed+=1;};

function draftFixture(bytes=Uint8Array.from([1,2,3,4])):GeneratedDraftEvidence{
  const identity:GeneratedDraftIdentity={
    schemaVersion:1,artifactClass:'GENERATED_DRAFT',artifactRole:'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId:'synthetic:TEST',officialSourceSnapshotId:'sha256:synthetic',officialSourceSha256:'1'.repeat(64),
    sourceAdmissionPolicyId:'qpdf-dual-pass-linearization-isolation-v2',sourceAdmissionStatus:'SOURCE_ADMITTED_CLEAN',qpdfAssetIdentityDigest:'qpdf-asset:sha256:x',
    sourcePassACommandDigest:'qpdf-command:sha256:a',sourcePassAWarningInventoryDigest:'source-warning-inventory:sha256:a',sourcePassBCommandDigest:'qpdf-command:sha256:b',sourcePassBWarningInventoryDigest:'source-warning-inventory:sha256:b',sourceWarningInventoryDigest:'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256:'2'.repeat(64),xfaPolicyId:'acroform-fallback-xfa-disconnection-v1',xfaDigest:'xfa:sha256:x',preparationManifestId:'preparation-manifest:sha256:x',preparationSourceId:'preparation-source:sha256:x',preparationDerivativeSha256:'3'.repeat(64),preparationFieldEquivalenceDigest:'field-equivalence:sha256:x',preparationSemanticDeltaDigest:'semantic-delta:sha256:x',preparationAuthorizationSnapshotId:'preparation-authorization:sha256:x',mapSnapshotId:'map:sha256:x',referencedFactSnapshotId:'facts:sha256:x',generationInputId:'generation-input:sha256:x',generatorContractVersion:'synthetic-v1',generatorImplementationId:'synthetic',generatorImplementationVersion:'1.0.0',fieldWritePlanDigest:'field-write-plan:sha256:x',preparedAtISO:'2026-08-22T02:10:00.000Z',generatedPdfSha256:sha256Bytes(bytes),generatedByteLength:bytes.byteLength,
  };
  return {...identity,generatedDocumentId:computeGeneratedDocumentId(identity)};
}
function snapshot(d:GeneratedDraftEvidence):FilingPreparationCanonicalSnapshot{
  return {officialSourceArtifactId:d.officialSourceArtifactId,officialSourceSnapshotId:d.officialSourceSnapshotId,officialSourceSha256:d.officialSourceSha256,sourceAdmissionPolicyId:d.sourceAdmissionPolicyId,sourceAdmissionStatus:d.sourceAdmissionStatus,qpdfAssetIdentityDigest:d.qpdfAssetIdentityDigest,sourcePassACommandDigest:d.sourcePassACommandDigest,sourcePassAWarningInventoryDigest:d.sourcePassAWarningInventoryDigest,sourcePassBCommandDigest:d.sourcePassBCommandDigest,sourcePassBWarningInventoryDigest:d.sourcePassBWarningInventoryDigest,sourceWarningInventoryDigest:d.sourceWarningInventoryDigest,qpdfIntermediateSha256:d.qpdfIntermediateSha256,xfaPolicyId:d.xfaPolicyId,xfaDigest:d.xfaDigest,preparationManifestId:d.preparationManifestId,preparationSourceId:d.preparationSourceId,preparationDerivativeSha256:d.preparationDerivativeSha256,preparationFieldEquivalenceDigest:d.preparationFieldEquivalenceDigest,preparationSemanticDeltaDigest:d.preparationSemanticDeltaDigest,preparationAuthorizationSnapshotId:d.preparationAuthorizationSnapshotId,mapSnapshotId:d.mapSnapshotId,referencedFactSnapshotId:d.referencedFactSnapshotId,generationInputId:d.generationInputId,generatorContractVersion:d.generatorContractVersion,generatorImplementationId:d.generatorImplementationId,generatorImplementationVersion:d.generatorImplementationVersion,fieldWritePlanDigest:d.fieldWritePlanDigest};
}
function legacyState(mode:'PREP'|'GENERATED'='PREP'):FilingPreparationCurrentState{
  const bytes=Uint8Array.from([1,2,3,4]);const d=draftFixture(bytes);
  const built=createFilingPreparationCurrentState({authenticatedUserId:USER,riskpathRecordId:RISKPATH,revision:1,preparationSnapshot:snapshot(d),generatedDraftBinding:mode==='GENERATED'?{revision:1,generatedDraft:d}:null,generatedDraftBytes:mode==='GENERATED'?bytes:null,ownerReviewBinding:null});
  if(built.status!=='CURRENT_STATE_REVISION') throw new Error(`fixture blocked ${built.blockReason}`);
  return built.currentState;
}
function expected(state:FilingPreparationCurrentState):Extract<ExpectedFilingPreparationCurrentState,{status:'CURRENT'}>{return {status:'CURRENT',filingPreparationCurrentStateId:state.filingPreparationCurrentStateId,revision:state.revision};}

class FakeStore{
  latest:FilingPreparationCurrentState|null;
  appended:AppendFilingPreparationCurrentStateInput[]=[];
  constructor(latest:FilingPreparationCurrentState|null){this.latest=latest;}
  async readLatest(_riskpath:string){return this.latest;}
  async appendNextIfCurrent(_expected:Readonly<ExpectedFilingPreparationCurrentState>,input:AppendFilingPreparationCurrentStateInput):Promise<AppendFilingPreparationCurrentStateResult>{
    this.appended.push(input);
    return {status:'CONFLICT',reloadRequired:true,currentState:null};
  }
}

async function main(){
  {
    const current=legacyState('PREP');const store=new FakeStore(current);const checkpoint=createFilingPreparationCurrentStateCheckpoint(store as any);
    const changed={...current.preparationSnapshot,generatorImplementationVersion:'2.0.0'};
    await checkpoint.preparationCheckpoint({ownerAction:'PREPARATION_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(current),preparationSnapshot:changed});
    equal(store.appended.length,1,'material preparation change creates one append attempt');
    equal(store.appended[0].generatedDraft,null,'preparation change clears generated draft');
    equal(store.appended[0].generatedDraftBytes,null,'preparation change clears generated bytes');
    equal(store.appended[0].ownerReviewEvidence,null,'preparation change clears Owner Review');
    equal(store.appended[0].currentnessMaterialBinding,null,'preparation change clears currentness material binding');
  }
  {
    const current=legacyState('PREP');const store=new FakeStore(current);const checkpoint=createFilingPreparationCurrentStateCheckpoint(store as any);
    const result=await checkpoint.preparationCheckpoint({ownerAction:'PREPARATION_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(current),preparationSnapshot:current.preparationSnapshot});
    equal(result.status,'UNCHANGED','unchanged preparation performs no append');
    equal(store.appended.length,0,'UNCHANGED is zero write');
  }
  {
    const current=legacyState('PREP');const store=new FakeStore(current);const checkpoint=createFilingPreparationCurrentStateCheckpoint(store as any);
    const d=draftFixture();
    const binding={schemaVersion:1,officialSourceHealth:'CURRENT',facts:{status:'READY',createdNoticeIdentity:{generation:'synthetic',createdAtISO:'2026-08-22T00:00:00.000Z'},facts:{}},preparationAuthorization:{authorizationId:'a',resultId:'r',controlId:'c',controlVersion:'1',status:'CURRENT',decision:'FORM_RELEVANT_FOR_PREPARATION',target:{artifactId:'a',authorityKey:'a',formId:'f',revisionEffective:'r',sourceSnapshotId:'s'},createdNoticeIdentity:{generation:'synthetic',createdAtISO:'2026-08-22T00:00:00.000Z'}}} as FilingPreparationCurrentnessMaterialBinding;
    const input:GeneratedDraftCheckpointInput={ownerAction:'GENERATED_DRAFT_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(current),generatedDraft:d,generatedDraftBytes:Uint8Array.from([1,2,3,4]),currentnessMaterialBinding:binding};
    await checkpoint.generatedDraftCheckpoint(input);
    equal(store.appended.length,1,'generated checkpoint makes one CAS append attempt');
    equal(store.appended[0].currentnessMaterialBinding,binding,'generated checkpoint passes exact trusted binding object unchanged');
    equal(store.appended[0].ownerReviewEvidence,null,'generated checkpoint clears prior Owner Review');
  }
  {
    const current=legacyState('PREP');const checkpoint=createFilingPreparationCurrentStateCheckpoint(new FakeStore(current) as any);const d=draftFixture();
    const bad:any={ownerAction:'GENERATED_DRAFT_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(current),generatedDraft:d,generatedDraftBytes:Uint8Array.from([1,2,3,4])};
    await assert.rejects(()=>checkpoint.generatedDraftCheckpoint(bad),/trusted currentness material/i);passed+=1;
  }
  {
    const legacyGenerated=legacyState('GENERATED');const checkpoint=createFilingPreparationCurrentStateCheckpoint(new FakeStore(legacyGenerated) as any);const d=legacyGenerated.generatedDraftBinding!.generatedDraft;
    await assert.rejects(()=>checkpoint.ownerReviewCheckpoint({ownerAction:'OWNER_REVIEW_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(legacyGenerated),renderedAcknowledgment:{renderedGeneratedDocumentId:d.generatedDocumentId,renderedPdfSha256:d.generatedPdfSha256,renderedByteLength:d.generatedByteLength,renderedAtISO:'2026-08-22T02:11:00.000Z'},ownerConfirmedExactRenderedDocument:true,reviewedAtISO:'2026-08-22T02:12:00.000Z',reviewStatement:{statementId:OWNER_REVIEW_STATEMENT_ID,statementVersion:OWNER_REVIEW_STATEMENT_VERSION}}),/trusted currentness-material binding/i);passed+=1;
  }
  {
    const legacyGenerated=legacyState('GENERATED');const material={schemaVersion:1,officialSourceHealth:'CURRENT',facts:{status:'READY',createdNoticeIdentity:{generation:'synthetic',createdAtISO:'2026-08-22T00:00:00.000Z'},facts:{}},preparationAuthorization:{} } as any;
    const v2={...legacyGenerated,schemaVersion:2,currentnessMaterialBinding:material} as FilingPreparationCurrentState;
    const store=new FakeStore(v2);const checkpoint=createFilingPreparationCurrentStateCheckpoint(store as any);const d=v2.generatedDraftBinding!.generatedDraft;
    await checkpoint.ownerReviewCheckpoint({ownerAction:'OWNER_REVIEW_CHECKPOINT',riskpathRecordId:RISKPATH,expectedCurrent:expected(v2),renderedAcknowledgment:{renderedGeneratedDocumentId:d.generatedDocumentId,renderedPdfSha256:d.generatedPdfSha256,renderedByteLength:d.generatedByteLength,renderedAtISO:'2026-08-22T02:11:00.000Z'},ownerConfirmedExactRenderedDocument:true,reviewedAtISO:'2026-08-22T02:12:00.000Z',reviewStatement:{statementId:OWNER_REVIEW_STATEMENT_ID,statementVersion:OWNER_REVIEW_STATEMENT_VERSION}});
    equal(store.appended.length,1,'Owner Review makes one CAS append attempt');
    equal(store.appended[0].currentnessMaterialBinding,material,'Owner Review carries currentness material forward unchanged');
    equal(store.appended[0].generatedDraft,d,'Owner Review carries exact generated draft forward');
  }
  {
    const source=readFileSync('lib/flow/filingPreparationCurrentStateCheckpoint.ts','utf8');
    ok(source.includes("currentnessMaterialBinding: null"),'preparation checkpoint explicitly clears material');
    ok(source.includes('currentnessMaterialBinding: input.currentnessMaterialBinding'),'generated checkpoint binds caller-supplied trusted raw material');
    ok(source.includes('getFilingPreparationCurrentnessMaterialBinding(latest)'),'Owner Review reads only exact current revision binding');
    for(const prohibited of ['setTimeout(','setInterval(','appendNext(','service_role','createClient(','generatedDraftCurrentness']) ok(!source.includes(prohibited),`checkpoint excludes prohibited runtime/authority token: ${prohibited}`);
  }
  console.log(`filingPreparationCurrentStateCheckpoint R1 tests passed: ${passed}`);
}
main().catch(error=>{console.error(error);process.exit(1);});
