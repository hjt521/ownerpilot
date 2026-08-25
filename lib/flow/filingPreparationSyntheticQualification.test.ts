import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  SYNTHETIC_BOOTSTRAP_INTAKE_SNAPSHOT,
  SYNTHETIC_LEGAL_CONTROL_NAMES,
  SYNTHETIC_QUALIFICATION_NAMESPACE,
  SYNTHETIC_QUALIFICATION_PROFILE_ID,
  SYNTHETIC_QUALIFICATION_PROFILE_VERSION,
  createSyntheticQualificationPreview,
  deriveSyntheticBootstrapIdentities,
  exactSyntheticBootstrapRowMatch,
  extractBootstrapCeremonyAtISO,
  materializeSyntheticQualification,
} from './filingPreparationSyntheticQualification';
import { CANONICAL_FILING_FACT_REFS } from './filingCanonicalFacts';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import { createFlowState } from './noticeFlowState';
import { reviewApprovalGeneration } from './reviewApproval';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import { runSyntheticBootstrapRouteTests } from '../../app/api/riskpath/filing-preparation/synthetic-qualification/bootstrap/route.test';

const USER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const AT='2026-08-24T23:45:00.000Z';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let passed=0;
function ok(v:unknown,m:string){assert.ok(v,m);passed++;}
function eq(a:unknown,b:unknown,m:string){assert.deepEqual(a,b,m);passed++;}
function neq(a:unknown,b:unknown,m:string){assert.notEqual(a,b,m);passed++;}
function fact(m:any,ref:string):any{const f=m.currentnessMaterialBinding.facts;if(f.status!=='READY')throw new Error('READY facts required');return f.facts[ref];}
function legacyV1NoticeData():any{return {...createFlowState().data,dispute:{tenantFiledComplaint:'no',tenantWrittenWithholding:'no',tenantBankruptcy:'no'},propertyAddress:'100 Synthetic Qualification Avenue',propertyUnit:'Unit 4',propertyCity:'Glendale',propertyCounty:'Los Angeles',tenantNames:['Synthetic Qualification Tenant One','Synthetic Qualification Tenant Two'],rentPeriods:[{periodStartDate:'2026-08-01',periodEndDate:'2026-08-31',amount:2500}],landlordIdentity:{type:'individual',names:['Synthetic Qualification Owner']},landlordIdentityConfirmed:true,paymentMethods:['by_mail'],landlordContact:{phone:'5555550100',streetAddress:'100 Synthetic Qualification Avenue'},paymentBranch:'mail_only',signerName:'Synthetic Qualification Owner',signerCapacity:'owner',serviceDate:'2026-12-01',serviceMethod:'personal'};}
function legacyV1Uuid(v:unknown):string{const b=Buffer.from(createHash('sha256').update(canonicalizeGenerationIdentity(v)).digest().subarray(0,16));b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function legacyV1Ids(userId:string,generation:string){const b={namespace:SYNTHETIC_QUALIFICATION_NAMESPACE,profileVersion:'bootstrap-v1',userId,generation};const binding=createHash('sha256').update(canonicalizeGenerationIdentity(b)).digest('hex');return {riskpathRecordId:legacyV1Uuid({...b,purpose:'riskpath'}),e2eRunId:legacyV1Uuid({...b,purpose:'e2e'}),createdNoticeArtifactId:legacyV1Uuid({...b,purpose:'artifact'}),profileBindingId:`${SYNTHETIC_QUALIFICATION_NAMESPACE}.profile-binding:sha256:${binding}`};}

(async()=>{
  const p=createSyntheticQualificationPreview();
  eq(p.syntheticOnly,true,'preview synthetic only');
  eq(SYNTHETIC_QUALIFICATION_PROFILE_VERSION,'bootstrap-v2','profile version bumped to bootstrap-v2');
  eq(SYNTHETIC_QUALIFICATION_PROFILE_ID,'ownerpilot.synthetic-qualification.e2-3d1.bootstrap-v2','profile id bumped to bootstrap-v2');
  eq(p.profileId,SYNTHETIC_QUALIFICATION_PROFILE_ID,'fixed profile id');
  eq(p.profileVersion,'bootstrap-v2','preview exposes v2 profile');
  eq(p.humanConfirmationRequired,true,'human confirmation required');
  ok(p.reviewApprovalGeneration.startsWith('review-create-v1:'),'canonical review generation');
  eq(p.noticeReview.propertyAddress,'613 E Broadway','public Glendale premises');
  eq(p.noticeReview.propertyUnit,'','no synthetic unit');
  eq(p.noticeReview.propertyCity,'Glendale','premises city');
  eq(p.noticeReview.propertyCounty,'Los Angeles','premises county');
  eq(p.noticeReview.payeeStreetAddress,'100 Synthetic Qualification Avenue','payee remains synthetic contact');
  neq(p.noticeReview.payeeStreetAddress,p.noticeReview.propertyAddress,'payee/filer address distinct from premises');
  eq((SYNTHETIC_BOOTSTRAP_INTAKE_SNAPSHOT as any).property_address.value,'613 E Broadway','intake premises propagated');
  eq((SYNTHETIC_BOOTSTRAP_INTAKE_SNAPSHOT as any).property_unit.value,'','intake has no fake Unit 4');
  eq(p.noticeReview.landlordName,'Synthetic Qualification Owner','fictional owner');
  eq(p.noticeReview.serviceDate,'2026-12-01','fixed future synthetic service date');
  eq(p.noticeReview.paymentMethod,'MAIL_ONLY','fixed Notice payment method');
  eq(p.fixedElectionProfileReview.noticeElection,'PAY_RENT_OR_QUIT_3_DAY','fixed notice election');
  eq(p.fixedElectionProfileReview.serviceElection,'PERSONAL_HAND_DELIVERY','fixed service election');

  const legacyGeneration=reviewApprovalGeneration(legacyV1NoticeData());
  neq(legacyGeneration,p.reviewApprovalGeneration,'v1 and v2 review generations differ');
  const legacyIds=legacyV1Ids(USER,legacyGeneration);
  const ids=deriveSyntheticBootstrapIdentities(USER,p.reviewApprovalGeneration);
  const other=deriveSyntheticBootstrapIdentities(OTHER,p.reviewApprovalGeneration);
  ok(UUID.test(ids.riskpathRecordId),'RiskPath UUID');ok(UUID.test(ids.e2eRunId),'E2E UUID');ok(UUID.test(ids.createdNoticeArtifactId),'artifact UUID');
  neq(ids.riskpathRecordId,ids.e2eRunId,'purpose-separated ids');neq(ids.riskpathRecordId,ids.createdNoticeArtifactId,'purpose-separated artifact id');neq(ids.riskpathRecordId,other.riskpathRecordId,'owner-bound ids');
  neq(ids.riskpathRecordId,legacyIds.riskpathRecordId,'v2 RiskPath differs from v1');neq(ids.e2eRunId,legacyIds.e2eRunId,'v2 E2E id differs from v1');neq(ids.createdNoticeArtifactId,legacyIds.createdNoticeArtifactId,'v2 artifact id differs from v1');neq(ids.profileBindingId,legacyIds.profileBindingId,'v2 profile binding differs from v1');
  ok(ids.profileBindingId.startsWith(`${SYNTHETIC_QUALIFICATION_NAMESPACE}.profile-binding:sha256:`),'namespaced profile binding');

  await assert.rejects(()=>materializeSyntheticQualification({authenticatedUserId:USER,reviewApprovalGeneration:legacyGeneration,ceremonyAtISO:AT}),/preview generation mismatch/);passed++;
  await assert.rejects(()=>materializeSyntheticQualification({authenticatedUserId:USER,reviewApprovalGeneration:p.reviewApprovalGeneration+'x',ceremonyAtISO:AT}),/preview generation mismatch/);passed++;
  await assert.rejects(()=>materializeSyntheticQualification({authenticatedUserId:USER,reviewApprovalGeneration:p.reviewApprovalGeneration,ceremonyAtISO:'2026-12-01T00:00:00.000Z'}),/must precede the fixed synthetic service date/);passed++;

  const m=await materializeSyntheticQualification({authenticatedUserId:USER,reviewApprovalGeneration:p.reviewApprovalGeneration,ceremonyAtISO:AT});
  eq(m.syntheticOnly,true,'material synthetic only');eq(m.profileVersion,'bootstrap-v2','material v2 profile');eq(m.riskpathRecordId,ids.riskpathRecordId,'server-derived RiskPath');eq(m.e2eRunId,ids.e2eRunId,'server-derived E2E');eq(m.createdNoticeArtifactId,ids.createdNoticeArtifactId,'server-derived artifact');
  const r=m.riskpathInsert;
  eq(r.user_id,USER,'authenticated owner only');eq(r.synthetic_source,'e2e','server synthetic tag');eq(r.e2e_run_id,ids.e2eRunId,'exact E2E binding');eq(r.chat_session_id,null,'no chat link');eq(r.property_id,null,'no property link');eq(r.notice_document_id,null,'no document link');eq(r.soft_deleted_at,null,'nondeleted target');eq(r.created_notice_finalized_at,AT,'truthful finalization time');eq(r.produce_snapshot.producedAtISO,AT,'same production ceremony');eq(r.produce_snapshot.propertyAddress,'613 E Broadway','production snapshot premises propagated');eq(r.produce_snapshot.payeeStreetAddress,'100 Synthetic Qualification Avenue','production snapshot payee remains synthetic');neq(r.produce_snapshot.payeeStreetAddress,r.produce_snapshot.propertyAddress,'production snapshot separates payee and premises');eq(r.transcript_snapshot.length,0,'no transcript');eq(extractBootstrapCeremonyAtISO(r),AT,'retry ceremony recoverable');
  ok(exactSyntheticBootstrapRowMatch(structuredClone(r),r),'exact row reconciliation');
  const pg=structuredClone(r);pg.transcript_snapshot_at=AT.replace('Z','+00:00');pg.created_notice_finalized_at=AT.replace('Z','+00:00');ok(exactSyntheticBootstrapRowMatch(pg,r),'Postgres +00:00 timestamptz representation reconciles to exact instant');
  const drift=structuredClone(pg);drift.created_notice_finalized_at='2026-08-24T23:45:00.001+00:00';eq(exactSyntheticBootstrapRowMatch(drift,r),false,'timestamptz instant drift rejected');
  const invalid=structuredClone(pg);invalid.transcript_snapshot_at='not-a-timestamp';eq(exactSyntheticBootstrapRowMatch(invalid,r),false,'invalid timestamptz rejected');
  const invalidCalendar=structuredClone(pg);invalidCalendar.transcript_snapshot_at='2026-02-31T23:45:00.000+00:00';eq(exactSyntheticBootstrapRowMatch(invalidCalendar,r),false,'invalid calendar timestamp rejected');
  const bad=structuredClone(r);bad.synthetic_source='customer';eq(exactSyntheticBootstrapRowMatch(bad,r),false,'real/retagged row rejected');

  eq(m.currentnessMaterialBinding.schemaVersion,1,'currentness schema');eq(m.currentnessMaterialBinding.officialSourceHealth,'CURRENT','source CURRENT');eq(m.currentnessMaterialBinding.facts.status,'READY','canonical D.1 READY');eq(fact(m,CANONICAL_FILING_FACT_REFS.propertyStreetAddress).value,'613 E Broadway','canonical premises address');eq(fact(m,CANONICAL_FILING_FACT_REFS.propertyCity).value,'Glendale','canonical premises city');eq(fact(m,CANONICAL_FILING_FACT_REFS.propertyCounty).value,'Los Angeles','canonical premises county');eq(fact(m,CANONICAL_FILING_FACT_REFS.propertyZip).value,'91206','canonical premises ZIP');eq(fact(m,CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation).value.kind,'NO_UNIT','canonical no-unit representation');eq(fact(m,CANONICAL_FILING_FACT_REFS.filerContact).value.streetAddress,'100 Synthetic Qualification Avenue','canonical filer contact remains synthetic');neq(fact(m,CANONICAL_FILING_FACT_REFS.filerContact).value.streetAddress,fact(m,CANONICAL_FILING_FACT_REFS.propertyStreetAddress).value,'canonical filer contact distinct from premises');eq(m.generatedDraft.artifactClass,'GENERATED_DRAFT','canonical E.1 artifact');eq(m.generatedDraft.artifactRole,'OWNER_GENERATED_PREPARATION','canonical artifact role');eq(m.generatedDraft.generatedByteLength,m.generatedDraftBytes.byteLength,'draft evidence binds bytes');eq(m.reviewStatement.statementId,'owner-exact-rendered-document-review-v1','governed owner review statement');
  const a=m.currentnessMaterialBinding.preparationAuthorization;
  eq(a.status,'CURRENT','qualification authorization CURRENT');eq(a.decision,'FORM_RELEVANT_FOR_PREPARATION','fixed preparation decision');eq(a.target.artifactId,UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,'exact UD-100 artifact');eq(a.target.sourceSnapshotId,UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,'exact source snapshot');ok(a.controlId.startsWith(`${SYNTHETIC_QUALIFICATION_NAMESPACE}.preparation-relevance`),'synthetic preparation issuer');ok(a.authorizationId.includes('sha256:'),'bound preparation authorization');

  eq(SYNTHETIC_LEGAL_CONTROL_NAMES.length,8,'exactly eight synthetic legal controls');
  for(const ref of [CANONICAL_FILING_FACT_REFS.municipalClassification,CANONICAL_FILING_FACT_REFS.plaintiffStandingControl,CANONICAL_FILING_FACT_REFS.jurisdictionSupportControl,CANONICAL_FILING_FACT_REFS.tpaClassificationControl,CANONICAL_FILING_FACT_REFS.localControl,CANONICAL_FILING_FACT_REFS.civilClassificationControl,CANONICAL_FILING_FACT_REFS.rentalAssistanceControl,CANONICAL_FILING_FACT_REFS.udaDisclosureControl]){const v=fact(m,ref);eq(v.state,'KNOWN',`${ref} known`);ok(v.provenance.governedControl.controlId.startsWith(`${SYNTHETIC_QUALIFICATION_NAMESPACE}.control.`),`${ref} synthetic namespace`);eq(v.provenance.governedControl.status,'CURRENT',`${ref} current`);}
  for(const [ref,id] of [[CANONICAL_FILING_FACT_REFS.captionRouteControl,'ud100.caption-route'],[CANONICAL_FILING_FACT_REFS.captionFormValueControl,'ud100.caption-form-value'],[CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl,'ud100.caption-optional-fields'],[CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl,'ud100.lease-applicability'],[CANONICAL_FILING_FACT_REFS.noticeElectionConsistencyControl,'ud100.notice-election-consistency']] as const){eq(fact(m,ref).provenance.governedControl.controlId,id,`${ref} uses exact-main producer`);}
  const sf=fact(m,CANONICAL_FILING_FACT_REFS.serviceFacts);ok(sf.provenance.lifecycleEvent.sourceId.startsWith(`${SYNTHETIC_QUALIFICATION_NAMESPACE}.lifecycle.`),'synthetic service provenance');neq(sf.provenance.lifecycleEvent.sourceId,'ownerpilot.service-runtime','never impersonates service runtime');eq(sf.value.serviceMethod,'PERSONAL_HAND_DELIVERY','personal service branch');eq(sf.value.noticeExpirationDate,'2026-12-04','canonical compliance date');eq(sf.value.noticeIncludedForfeiture,true,'Created Notice semantic fact');
  ok(fact(m,CANONICAL_FILING_FACT_REFS.serviceElectionConsistencyControl).provenance.governedControl.controlId.startsWith(`${SYNTHETIC_QUALIFICATION_NAMESPACE}.control.service-election-consistency`),'synthetic service consistency');eq(fact(m,CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle).value,'INITIAL_PREFILING','synthetic initial lifecycle');

  const again=await materializeSyntheticQualification({authenticatedUserId:USER,reviewApprovalGeneration:p.reviewApprovalGeneration,ceremonyAtISO:AT});eq(again.generatedDraft.generatedDocumentId,m.generatedDraft.generatedDocumentId,'deterministic generated id');eq(Buffer.compare(Buffer.from(again.generatedDraftBytes),Buffer.from(m.generatedDraftBytes)),0,'byte-identical retry material');ok(exactSyntheticBootstrapRowMatch(again.riskpathInsert,r),'exact retry row');

  const source=readFileSync('lib/flow/filingPreparationSyntheticQualification.ts','utf8');ok(!source.includes("from('service_events')")&&!source.includes('service_evidence_assets'),'no ordinary service persistence');ok(!source.includes("from('riskpath_records')")&&!source.includes('.insert(')&&!source.includes('.upsert(')&&!source.includes('.delete('),'pure materializer has no DB writes');ok(!/service[_-]?role/i.test(source),'no service-role authority');ok(!source.includes("const ADDRESS =")&&!source.includes("const UNIT = 'Unit 4'"),'v1 shared premises/contact constants removed');
  console.log(`filingPreparationSyntheticQualification: ${passed} assertions passed`);

  const routeAssertions=await runSyntheticBootstrapRouteTests();
  assert.ok(routeAssertions>0,'bootstrap route adversarial suite must execute');
})().catch(e=>{console.error(e);process.exitCode=1;});
