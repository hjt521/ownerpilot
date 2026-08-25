import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeCompliancePeriod } from '../dates/computeCompliancePeriod';
import { captureCreatedNoticeArtifact, evaluateCreatedNoticeSemanticProvenance } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import { CANONICAL_FILING_FACT_REFS, projectFilingCanonicalFacts } from './filingCanonicalFacts';
import { FILING_PREPARATION_CURRENTNESS_MATERIAL_SCHEMA_VERSION } from './filingPreparationCurrentState';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import { OWNER_REVIEW_STATEMENT_ID, OWNER_REVIEW_STATEMENT_VERSION } from './officialFormOwnerReview';
import { createFlowState } from './noticeFlowState';
import { bindReviewApproval, reviewApprovalGeneration } from './reviewApproval';
import { produceCaptionOptionalFieldsControl, produceCaptionRouteSupport, produceLeaseApplicabilityControl, produceNoticeElectionConsistencyControl } from './ud100GovernedControls';
import { evaluateUd100GeneratedDraftCurrentness, generateUd100GeneratedDraft, UD100_PREPARATION_RUNTIME_PATH } from './ud100GeneratedDraft';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export const SYNTHETIC_QUALIFICATION_NAMESPACE = 'ownerpilot.synthetic-qualification.e2-3d1' as const;
export const SYNTHETIC_QUALIFICATION_PROFILE_VERSION = 'bootstrap-v2' as const;
export const SYNTHETIC_QUALIFICATION_PROFILE_ID = `${SYNTHETIC_QUALIFICATION_NAMESPACE}.${SYNTHETIC_QUALIFICATION_PROFILE_VERSION}` as const;
export const SYNTHETIC_LEGAL_CONTROL_NAMES = Object.freeze([
  'municipal-city-limits','plaintiff-standing-capacity','jurisdiction-support','tpa-classification',
  'local-rent-eviction-control','civil-classification','rental-assistance','uda-disclosure',
] as const);
const SERVICE_DATE = '2026-12-01' as const;
const OWNER = 'Synthetic Qualification Owner' as const;
const TENANTS = ['Synthetic Qualification Tenant One','Synthetic Qualification Tenant Two'] as const;
const PROPERTY_ADDRESS = '613 E Broadway' as const;
const PROPERTY_UNIT = '' as const;
const PROPERTY_CITY = 'Glendale' as const;
const PROPERTY_COUNTY = 'Los Angeles' as const;
const PROPERTY_STATE = 'CA' as const;
const PROPERTY_ZIP = '91206' as const;
const PAYEE_STREET_ADDRESS = '100 Synthetic Qualification Avenue' as const;
const PAYEE_CITY = 'Glendale' as const;
const PAYEE_STATE = 'CA' as const;
const PAYEE_ZIP = '91203' as const;
const RENT = 2500 as const;
const COURT = Object.freeze({county:'Los Angeles',streetAddress:'111 N Hill St',mailingAddress:'111 N Hill St',cityAndZip:'Los Angeles, CA 90012',branchName:'Stanley Mosk Courthouse'});
const CONTACT = Object.freeze({name:OWNER,streetAddress:PAYEE_STREET_ADDRESS,city:PAYEE_CITY,state:PAYEE_STATE,zip:PAYEE_ZIP,telephone:'5555550100',email:'synthetic-qualification@example.test',representationStatus:'SELF_REPRESENTED'});
const OTHER_RELIEF = Object.freeze({fairRentalValue:false,statutoryDamages:false,relocationDamages:false,forfeiture:false,attorneyFees:false,otherRelief:false,otherAllegations:false});
if(PAYEE_STREET_ADDRESS===PROPERTY_ADDRESS) throw new Error('Synthetic qualification payee/filer address must remain distinct from the premises address.');
export const SYNTHETIC_BOOTSTRAP_INTAKE_SNAPSHOT = Object.freeze({
  property_address:{value:PROPERTY_ADDRESS},property_unit:{value:PROPERTY_UNIT},property_city:{value:PROPERTY_CITY},property_county:{value:PROPERTY_COUNTY},
  tenant_names:{value:[...TENANTS]},rent_periods:{value:[{periodStartDate:'2026-08-01',periodEndDate:'2026-08-31',amount:RENT}]},
  landlord_name:{value:OWNER},service_date:{value:SERVICE_DATE},
});

const rowKeys = ['id','user_id','chat_session_id','property_id','notice_document_id','current_state','captured_payload','transcript_snapshot','transcript_snapshot_at','counsel_route_trigger','produce_snapshot','created_notice_artifact_id','created_notice_service_date','created_notice_generation','created_notice_semantic_binding_id','created_notice_finalized_at','e2e_run_id','synthetic_source','soft_deleted_at'] as const;
function plain(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function iso(v: string): boolean { const d=new Date(v); return Number.isFinite(d.getTime()) && d.toISOString()===v; }
function digest(v: unknown): string { return createHash('sha256').update(canonicalizeGenerationIdentity(v)).digest('hex'); }
function uuid(v: unknown): string { const b=Buffer.from(createHash('sha256').update(canonicalizeGenerationIdentity(v)).digest().subarray(0,16)); b[6]=(b[6]&15)|80; b[8]=(b[8]&63)|128; const h=b.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
function noticeData(): any { return {...createFlowState().data,dispute:{tenantFiledComplaint:'no',tenantWrittenWithholding:'no',tenantBankruptcy:'no'},propertyAddress:PROPERTY_ADDRESS,propertyUnit:PROPERTY_UNIT,propertyCity:PROPERTY_CITY,propertyCounty:PROPERTY_COUNTY,tenantNames:[...TENANTS],rentPeriods:[{periodStartDate:'2026-08-01',periodEndDate:'2026-08-31',amount:RENT}],landlordIdentity:{type:'individual',names:[OWNER]},landlordIdentityConfirmed:true,paymentMethods:['by_mail'],landlordContact:{phone:'5555550100',streetAddress:PAYEE_STREET_ADDRESS},paymentBranch:'mail_only',signerName:OWNER,signerCapacity:'owner',serviceDate:SERVICE_DATE,serviceMethod:'personal'}; }

export function createSyntheticQualificationPreview(): any {
  const d=noticeData();
  return {syntheticOnly:true,profileId:SYNTHETIC_QUALIFICATION_PROFILE_ID,profileVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,reviewApprovalGeneration:reviewApprovalGeneration(d),noticeReview:{propertyAddress:PROPERTY_ADDRESS,propertyUnit:PROPERTY_UNIT,propertyCity:PROPERTY_CITY,propertyCounty:PROPERTY_COUNTY,tenantNames:[...TENANTS],landlordName:OWNER,rentPeriod:{periodStartDate:'2026-08-01',periodEndDate:'2026-08-31',amount:RENT},serviceDate:SERVICE_DATE,paymentMethod:'MAIL_ONLY',payeeName:OWNER,payeePhone:'5555550100',payeeStreetAddress:PAYEE_STREET_ADDRESS,signerName:OWNER,signerCapacity:'OWNER'},fixedElectionProfileReview:{selectedFilingCourt:COURT,plaintiffRelationship:'OWNER',plaintiffType:'INDIVIDUAL_OVER_18',dbaUse:'NO_DBA',doeDefendantsIncluded:false,leaseStatus:'NO_AGREEMENT',noticeElection:'PAY_RENT_OR_QUIT_3_DAY',serviceElection:'PERSONAL_HAND_DELIVERY',fixedTermExpirationElection:'DO_NOT_SELECT',pastDueRentRelief:{selected:true,amount:RENT},otherReliefSelections:OTHER_RELIEF},humanConfirmationRequired:true,statement:'Synthetic qualification only. Confirm the fixed fictional Notice facts and filing-preparation election profile. No real matter, service, filing, or legal sufficiency is asserted.'};
}
export function deriveSyntheticBootstrapIdentities(userId: string, generation: string): any {
  const b={namespace:SYNTHETIC_QUALIFICATION_NAMESPACE,profileVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,userId,generation};
  return {riskpathRecordId:uuid({...b,purpose:'riskpath'}),e2eRunId:uuid({...b,purpose:'e2e'}),createdNoticeArtifactId:uuid({...b,purpose:'artifact'}),profileBindingId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.profile-binding:sha256:${digest(b)}`};
}
function conf(c:any,purpose:string): any { return {confirmationId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.confirmation.${purpose}:sha256:${digest({binding:c.binding,purpose})}`,confirmedAtISO:c.at}; }
function control(c:any,name:string,value:any,deps:string[]=[]): any { const controlId=`${SYNTHETIC_QUALIFICATION_NAMESPACE}.control.${name}`; return {state:'KNOWN',value,control:{controlId,controlVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,resultId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.result.${name}:sha256:${digest({binding:c.binding,controlId,value,deps})}`,status:'CURRENT'},dependencies:deps}; }
function event(c:any,purpose:string,eventType:string,value:any): any { return {state:'KNOWN',value,event:{sourceId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.lifecycle.${purpose}`,eventId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.event.${purpose}:sha256:${digest({binding:c.binding,eventType,value})}`,eventType}}; }
function supplemental(data:any,c:any): any {
  const relationship={state:'KNOWN',value:'OWNER'} as const; const ptype={state:'KNOWN',value:'INDIVIDUAL_OVER_18'} as const; const filer={state:'KNOWN',value:CONTACT} as const;
  const caption=produceCaptionRouteSupport({data,plaintiffRelationship:relationship,plaintiffType:ptype,filerContact:filer});
  const lease={state:'KNOWN',value:'NO_AGREEMENT'} as const;
  const noticeElection={state:'KNOWN',value:'PAY_RENT_OR_QUIT_3_DAY',confirmation:conf(c,'notice-election')} as const;
  const semantic=evaluateCreatedNoticeSemanticProvenance(data.createdNoticeArtifact); if(semantic.status!=='PROVEN') throw new Error('Created Notice semantics are not PROVEN.');
  const serviceFacts={defendantNames:[...TENANTS],serviceDate:SERVICE_DATE,noticeExpirationDate:data.createdNoticeArtifact.dates.compliancePeriodEndDate,serviceMethod:'PERSONAL_HAND_DELIVERY',noticeIncludedForfeiture:semantic.semantics.forfeitureElectionContentIncluded};
  return {propertyZip:{state:'KNOWN',value:PROPERTY_ZIP},propertyUnitConfirmation:{state:'KNOWN',value:'NO_UNIT'},preparation:{
    selectedFilingCourt:{state:'KNOWN',value:COURT,confirmation:conf(c,'court')},
    municipalClassification:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[0],'WITHIN_CITY_LIMITS',[CANONICAL_FILING_FACT_REFS.propertyCity,CANONICAL_FILING_FACT_REFS.propertyCounty]),
    initialComplaintLifecycle:event(c,'initial-complaint','SYNTHETIC_E2_3D1_INITIAL_PREFILING_V1','INITIAL_PREFILING'),
    captionRouteControl:caption.captionRouteControl,captionFormValueControl:caption.captionFormValueControl,
    jurisdictionSupportControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[2],'SUPPORTED_INITIAL_UD100',[CANONICAL_FILING_FACT_REFS.selectedFilingCourt,CANONICAL_FILING_FACT_REFS.municipalClassification,CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle]),
    plaintiffRelationship:relationship,plaintiffType:ptype,
    plaintiffStandingControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[1],'SUPPORTED',[CANONICAL_FILING_FACT_REFS.plaintiffRelationship,CANONICAL_FILING_FACT_REFS.plaintiffType]),
    dbaUse:{state:'KNOWN',value:'NO_DBA'},doeElection:{state:'KNOWN',value:{include:false},confirmation:conf(c,'doe')},filerContact:filer,
    captionOptionalFieldsControl:produceCaptionOptionalFieldsControl(caption.captionRouteControl),premisesAge:{state:'KNOWN',value:'1990'},
    tpaClassificationControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[3],'SUBJECT_AT_FAULT',[CANONICAL_FILING_FACT_REFS.premisesAge]),
    localControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[4],'NOT_SUBJECT',[CANONICAL_FILING_FACT_REFS.municipalClassification]),
    civilClassificationControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[5],'LIMITED_LE_10000',[CANONICAL_FILING_FACT_REFS.pastDueRentRelief,CANONICAL_FILING_FACT_REFS.otherReliefSelections]),
    leaseStatus:lease,leaseApplicabilityControl:produceLeaseApplicabilityControl(lease),noticeComplaintElection:noticeElection,
    noticeElectionConsistencyControl:produceNoticeElectionConsistencyControl({data,noticeComplaintElection:noticeElection}),
    serviceComplaintElection:{state:'KNOWN',value:'PERSONAL_HAND_DELIVERY',confirmation:conf(c,'service-election')},
    serviceElectionConsistencyControl:control(c,'service-election-consistency','CONSISTENT',[CANONICAL_FILING_FACT_REFS.serviceComplaintElection,CANONICAL_FILING_FACT_REFS.serviceFacts]),
    serviceFacts:event(c,'successful-service','SYNTHETIC_E2_3D1_SUCCESSFUL_CREATED_NOTICE_SERVICE_FACTS_V1',serviceFacts),
    rentDueAtService:{state:'KNOWN',value:RENT},fixedTermExpirationElection:{state:'KNOWN',value:'DO_NOT_SELECT',confirmation:conf(c,'fixed-term')},
    rentalAssistanceFacts:{state:'KNOWN',value:{item11aReceived:false,item11bReceived:false,item11cHas:false,item11dHas:false}},
    rentalAssistanceControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[6],'APPLICABLE',[CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts]),
    otherNoticesFact:{state:'KNOWN',value:'NO_OTHER_NOTICES'},pastDueRentRelief:{state:'KNOWN',value:{selected:true,amount:RENT},confirmation:conf(c,'past-due')},
    otherReliefSelections:{state:'KNOWN',value:OTHER_RELIEF,confirmation:conf(c,'other-relief')},udaDisclosureControl:control(c,SYNTHETIC_LEGAL_CONTROL_NAMES[7],'NO_COMPENSATED_ASSISTANT'),
  }};
}
function authorization(c:any,facts:any): any { const target={artifactId:UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,authorityKey:UD100_OFFICIAL_SOURCE_IDENTITY.authorityKey,formId:UD100_OFFICIAL_SOURCE_IDENTITY.formId,revisionEffective:UD100_OFFICIAL_SOURCE_IDENTITY.revisionEffective,sourceSnapshotId:UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId}; const b={binding:c.binding,target,createdNoticeIdentity:facts.createdNoticeIdentity}; return {authorizationId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.preparation-authorization:sha256:${digest({...b,purpose:'authorization'})}`,resultId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.preparation-relevance-result:sha256:${digest({...b,purpose:'result'})}`,controlId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.preparation-relevance`,controlVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,status:'CURRENT',decision:'FORM_RELEVANT_FOR_PREPARATION',target,createdNoticeIdentity:facts.createdNoticeIdentity}; }
function prepSnapshot(d:any): any { const {schemaVersion:_s,artifactClass:_c,artifactRole:_r,preparedAtISO:_p,generatedPdfSha256:_h,generatedByteLength:_l,generatedDocumentId:_i,...x}=d; return x; }

export async function materializeSyntheticQualification(input:{authenticatedUserId:string;reviewApprovalGeneration:string;ceremonyAtISO:string}):Promise<any>{
  if(!iso(input.ceremonyAtISO)) throw new Error('Synthetic qualification ceremony timestamp must be an exact UTC ISO value.');
  if(input.ceremonyAtISO.slice(0,10)>=SERVICE_DATE) throw new Error('Synthetic qualification ceremony must precede the fixed synthetic service date.');
  const base=noticeData(); const generation=reviewApprovalGeneration(base); if(input.reviewApprovalGeneration!==generation) throw new Error('Synthetic qualification preview generation mismatch.');
  const ids=deriveSyntheticBootstrapIdentities(input.authenticatedUserId,generation); const approved={...base,...bindReviewApproval(base,input.ceremonyAtISO)};
  const snapshot={...captureProductionSnapshot(approved),producedAtISO:input.ceremonyAtISO}; const dates=computeCompliancePeriod({serviceDate:SERVICE_DATE,serviceMethod:'personal',holidays:new Set<string>()});
  const artifact=captureCreatedNoticeArtifact(approved,input.ceremonyAtISO,{compliancePeriodStartDate:dates.commencementDate,compliancePeriodEndDate:dates.expirationDate});
  const data={...approved,productionSnapshot:snapshot,createdNoticeArtifact:artifact}; const sem=evaluateCreatedNoticeSemanticProvenance(artifact); if(sem.status!=='PROVEN') throw new Error('Synthetic qualification Created Notice semantic binding is not PROVEN.');
  const c={at:input.ceremonyAtISO,binding:{namespace:SYNTHETIC_QUALIFICATION_NAMESPACE,profileVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,authenticatedUserId:input.authenticatedUserId,riskpathRecordId:ids.riskpathRecordId,e2eRunId:ids.e2eRunId,createdNoticeArtifactId:ids.createdNoticeArtifactId,generation:artifact.generation,semanticBindingId:sem.semanticBindingId}};
  const facts=projectFilingCanonicalFacts(data,supplemental(data,c)); if(facts.status!=='READY') throw new Error(`Synthetic qualification canonical facts blocked: ${facts.reason}.`); const auth=authorization(c,facts);
  let source:Uint8Array, derivative:Uint8Array; try{source=new Uint8Array(readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath));derivative=new Uint8Array(readFileSync(UD100_PREPARATION_RUNTIME_PATH));}catch{throw new Error('Synthetic qualification controlled source material is unavailable.');}
  const gen=await generateUd100GeneratedDraft({officialSourceIdentity:UD100_OFFICIAL_SOURCE_IDENTITY,officialSourceHealth:'CURRENT',officialSourceBytes:source,preparationAuthorization:auth,preparationDerivativeBytes:derivative,facts,preparedAtISO:input.ceremonyAtISO}); if(gen.status!=='GENERATED_DRAFT') throw new Error(`Synthetic qualification generated draft blocked: ${gen.blockReason}.`);
  const cur=evaluateUd100GeneratedDraftCurrentness(gen.evidence,{officialSourceIdentity:UD100_OFFICIAL_SOURCE_IDENTITY,officialSourceHealth:'CURRENT',officialSourceBytes:source,preparationAuthorization:auth,preparationDerivativeBytes:derivative,facts,draftBytes:gen.bytes}); if(cur.status!=='CURRENT') throw new Error(`Synthetic qualification generated draft is not CURRENT: ${cur.reasons.join('; ')}`);
  const row={id:ids.riskpathRecordId,user_id:input.authenticatedUserId,chat_session_id:null,property_id:null,notice_document_id:null,current_state:'notice_created',captured_payload:structuredClone(SYNTHETIC_BOOTSTRAP_INTAKE_SNAPSHOT),transcript_snapshot:[],transcript_snapshot_at:input.ceremonyAtISO,counsel_route_trigger:null,produce_snapshot:structuredClone(snapshot),created_notice_artifact_id:ids.createdNoticeArtifactId,created_notice_service_date:SERVICE_DATE,created_notice_generation:artifact.generation,created_notice_semantic_binding_id:sem.semanticBindingId,created_notice_finalized_at:input.ceremonyAtISO,e2e_run_id:ids.e2eRunId,synthetic_source:'e2e',soft_deleted_at:null};
  return {syntheticOnly:true,profileId:SYNTHETIC_QUALIFICATION_PROFILE_ID,profileVersion:SYNTHETIC_QUALIFICATION_PROFILE_VERSION,profileBindingId:ids.profileBindingId,riskpathRecordId:ids.riskpathRecordId,e2eRunId:ids.e2eRunId,createdNoticeArtifactId:ids.createdNoticeArtifactId,riskpathInsert:row,preparationSnapshot:prepSnapshot(gen.evidence),generatedDraft:structuredClone(gen.evidence),generatedDraftBytes:new Uint8Array(gen.bytes),currentnessMaterialBinding:{schemaVersion:FILING_PREPARATION_CURRENTNESS_MATERIAL_SCHEMA_VERSION,officialSourceHealth:'CURRENT',facts:structuredClone(facts),preparationAuthorization:structuredClone(auth)},renderedAcknowledgmentTemplate:{renderedGeneratedDocumentId:gen.evidence.generatedDocumentId,renderedPdfSha256:gen.evidence.generatedPdfSha256,renderedByteLength:gen.evidence.generatedByteLength},reviewStatement:{statementId:OWNER_REVIEW_STATEMENT_ID,statementVersion:OWNER_REVIEW_STATEMENT_VERSION}};
}
export function extractBootstrapCeremonyAtISO(row:unknown):string|null{ if(!plain(row)||!plain(row.produce_snapshot))return null; const v=row.produce_snapshot.producedAtISO; return typeof v==='string'&&iso(v)?v:null; }
export function exactSyntheticBootstrapRowMatch(actual:unknown,expected:any):boolean{ if(!plain(actual))return false; return rowKeys.every(k=>k in actual&&canonicalizeGenerationIdentity(actual[k])===canonicalizeGenerationIdentity(expected[k])); }
