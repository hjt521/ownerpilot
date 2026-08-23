import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  computeGeneratedDocumentId,
  sha256Bytes,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import {
  createFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import {
  createFilingPreparationCurrentStateSupabaseStore,
  type AppendFilingPreparationCurrentStateInput,
  type FilingPreparationCurrentStateSupabaseClient,
} from './filingPreparationCurrentStateSupabaseStore';

const USER = '11111111-1111-4111-8111-111111111111';
const RISKPATH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TABLE = 'filing_preparation_current_state_revisions';
let passed = 0;
const equal = <T>(actual:T, expected:T, message:string) => { assert.equal(actual, expected, message); passed += 1; };
const ok = (value:unknown, message:string) => { assert.ok(value, message); passed += 1; };

function draftFixture(bytes = Uint8Array.from([1,2,3,4])): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = {
    schemaVersion:1, artifactClass:'GENERATED_DRAFT', artifactRole:'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId:'synthetic:TEST', officialSourceSnapshotId:'sha256:synthetic', officialSourceSha256:'1'.repeat(64),
    sourceAdmissionPolicyId:'qpdf-dual-pass-linearization-isolation-v2', sourceAdmissionStatus:'SOURCE_ADMITTED_CLEAN',
    qpdfAssetIdentityDigest:'qpdf-asset:sha256:x', sourcePassACommandDigest:'qpdf-command:sha256:a', sourcePassAWarningInventoryDigest:'source-warning-inventory:sha256:a',
    sourcePassBCommandDigest:'qpdf-command:sha256:b', sourcePassBWarningInventoryDigest:'source-warning-inventory:sha256:b', sourceWarningInventoryDigest:'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256:'2'.repeat(64), xfaPolicyId:'acroform-fallback-xfa-disconnection-v1', xfaDigest:'xfa:sha256:x',
    preparationManifestId:'preparation-manifest:sha256:x', preparationSourceId:'preparation-source:sha256:x', preparationDerivativeSha256:'3'.repeat(64),
    preparationFieldEquivalenceDigest:'field-equivalence:sha256:x', preparationSemanticDeltaDigest:'semantic-delta:sha256:x',
    preparationAuthorizationSnapshotId:'preparation-authorization:sha256:x', mapSnapshotId:'map:sha256:x', referencedFactSnapshotId:'facts:sha256:x', generationInputId:'generation-input:sha256:x',
    generatorContractVersion:'synthetic-v1', generatorImplementationId:'synthetic', generatorImplementationVersion:'1.0.0', fieldWritePlanDigest:'field-write-plan:sha256:x',
    preparedAtISO:'2026-08-22T02:10:00.000Z', generatedPdfSha256:sha256Bytes(bytes), generatedByteLength:bytes.byteLength,
  };
  return { ...identity, generatedDocumentId:computeGeneratedDocumentId(identity) };
}
function snapshot(d:GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return {
    officialSourceArtifactId:d.officialSourceArtifactId, officialSourceSnapshotId:d.officialSourceSnapshotId, officialSourceSha256:d.officialSourceSha256,
    sourceAdmissionPolicyId:d.sourceAdmissionPolicyId, sourceAdmissionStatus:d.sourceAdmissionStatus, qpdfAssetIdentityDigest:d.qpdfAssetIdentityDigest,
    sourcePassACommandDigest:d.sourcePassACommandDigest, sourcePassAWarningInventoryDigest:d.sourcePassAWarningInventoryDigest,
    sourcePassBCommandDigest:d.sourcePassBCommandDigest, sourcePassBWarningInventoryDigest:d.sourcePassBWarningInventoryDigest, sourceWarningInventoryDigest:d.sourceWarningInventoryDigest,
    qpdfIntermediateSha256:d.qpdfIntermediateSha256, xfaPolicyId:d.xfaPolicyId, xfaDigest:d.xfaDigest, preparationManifestId:d.preparationManifestId,
    preparationSourceId:d.preparationSourceId, preparationDerivativeSha256:d.preparationDerivativeSha256, preparationFieldEquivalenceDigest:d.preparationFieldEquivalenceDigest,
    preparationSemanticDeltaDigest:d.preparationSemanticDeltaDigest, preparationAuthorizationSnapshotId:d.preparationAuthorizationSnapshotId,
    mapSnapshotId:d.mapSnapshotId, referencedFactSnapshotId:d.referencedFactSnapshotId, generationInputId:d.generationInputId, generatorContractVersion:d.generatorContractVersion,
    generatorImplementationId:d.generatorImplementationId, generatorImplementationVersion:d.generatorImplementationVersion, fieldWritePlanDigest:d.fieldWritePlanDigest,
  };
}
function bytea(bytes:Uint8Array|null):string|null { return bytes === null ? null : `\\x${Buffer.from(bytes).toString('hex')}`; }
function row(state:FilingPreparationCurrentState) {
  const { generatedDraftBytes, ...state_payload } = state;
  return { filing_preparation_current_state_id:state.filingPreparationCurrentStateId, user_id:state.authenticatedUserId, riskpath_record_id:state.riskpathRecordId, revision:state.revision, state_payload, generated_draft_bytes:bytea(generatedDraftBytes) };
}

class FakeClient implements FilingPreparationCurrentStateSupabaseClient {
  rows:any[] = [];
  authCalls = 0;
  insertCalls = 0;
  fromCalls:string[] = [];
  readonly auth = { getUser: async () => { this.authCalls += 1; return { data:{ user:{ id:USER } }, error:null }; } };
  from(table:string):any {
    this.fromCalls.push(table);
    return {
      insert: async (values:any) => {
        this.insertCalls += 1;
        if (this.rows.some(row => row.riskpath_record_id === values.riskpath_record_id && row.revision === values.revision)) return {data:null,error:{code:'23505'}};
        this.rows.push(structuredClone(values));
        return {data:null,error:null};
      },
      select: (_columns:string) => {
        const filters:Array<[string,string|number]> = [];
        let order:{column:string;ascending:boolean}|null = null;
        let limit = 1;
        const query:any = {
          eq:(column:string,value:string|number) => { filters.push([column,value]); return query; },
          order:(column:string,options:{ascending:boolean}) => { order={column,ascending:options.ascending}; return query; },
          limit:(count:number) => { limit=count; return query; },
          maybeSingle:async () => {
            let rows = this.rows.filter(row => filters.every(([column,value]) => row[column] === value));
            if (order) { const o=order as {column:string;ascending:boolean}; rows=[...rows].sort((a,b)=>o.ascending?Number(a[o.column])-Number(b[o.column]):Number(b[o.column])-Number(a[o.column])); }
            return {data:rows.slice(0,limit)[0] ?? null,error:null};
          },
        };
        return query;
      },
    };
  }
}

async function main() {
  {
    const client = new FakeClient();
    createFilingPreparationCurrentStateSupabaseStore(client);
    equal(client.authCalls,0,'store construction is inert');
    equal(client.fromCalls.length,0,'store construction performs no database access');
  }

  {
    const client = new FakeClient();
    const store = createFilingPreparationCurrentStateSupabaseStore(client);
    const d=draftFixture();
    const input:AppendFilingPreparationCurrentStateInput = { riskpathRecordId:RISKPATH, preparationSnapshot:snapshot(d), generatedDraft:null, generatedDraftBytes:null, currentnessMaterialBinding:null, ownerReviewEvidence:null };
    const result=await store.appendNext(input);
    equal(result.status,'INSERTED','preparation append succeeds with explicit null material');
    if(result.status==='INSERTED') {
      equal(result.currentState.schemaVersion,2,'all new durable writes use schema v2');
      if(result.currentState.schemaVersion===2) equal(result.currentState.currentnessMaterialBinding,null,'preparation append clears material binding');
    }
    equal(client.insertCalls,1,'preparation append performs exactly one insert');
    equal(client.fromCalls.every(table=>table===TABLE),true,'store addresses only accepted current-state table');
  }

  {
    const client=new FakeClient();
    const store=createFilingPreparationCurrentStateSupabaseStore(client);
    const bytes=Uint8Array.from([1,2,3,4]); const d=draftFixture(bytes);
    const malformed:any={schemaVersion:1,officialSourceHealth:'CURRENT',facts:{status:'READY',createdNoticeIdentity:{generation:'x',createdAtISO:'2026-08-22T00:00:00.000Z'},facts:{}},preparationAuthorization:{}};
    await assert.rejects(() => store.appendNext({riskpathRecordId:RISKPATH,preparationSnapshot:snapshot(d),generatedDraft:d,generatedDraftBytes:bytes,currentnessMaterialBinding:malformed,ownerReviewEvidence:null}),/Canonical current-state creation blocked/);
    passed += 1;
    equal(client.insertCalls,0,'invalid generated material blocks before insert');
  }

  {
    const client=new FakeClient();
    const store=createFilingPreparationCurrentStateSupabaseStore(client);
    const d=draftFixture();
    const bad:any={riskpathRecordId:RISKPATH,preparationSnapshot:snapshot(d),generatedDraft:null,generatedDraftBytes:null,currentnessMaterialBinding:null,ownerReviewEvidence:null,revision:99};
    await assert.rejects(() => store.appendNext(bad),/invalid shape|caller-authored authority/i);
    passed += 1;
    equal(client.authCalls,0,'caller-selected revision is rejected before authentication/database access');
  }

  {
    const client=new FakeClient();
    const d=draftFixture();
    const legacy=createFilingPreparationCurrentState({authenticatedUserId:USER,riskpathRecordId:RISKPATH,revision:4,preparationSnapshot:snapshot(d),generatedDraftBinding:null,generatedDraftBytes:null,ownerReviewBinding:null});
    if(legacy.status!=='CURRENT_STATE_REVISION') throw new Error('legacy fixture blocked');
    client.rows.push(row(legacy.currentState));
    const read=await createFilingPreparationCurrentStateSupabaseStore(client).readLatest(RISKPATH);
    equal(read?.schemaVersion,1,'historical v1 durable row remains readable without backfill');
  }

  {
    const source=readFileSync('lib/flow/filingPreparationCurrentStateSupabaseStore.ts','utf8');
    ok(source.includes('currentnessMaterialBinding: input.currentnessMaterialBinding'),'store binds exact material into server-selected revision creation');
    ok(source.includes("currentState.schemaVersion !== 2"),'store prohibits new legacy durable writes');
    for(const prohibited of ['.update(','.delete(','.upsert(','service_role','createClient(','process.env']) ok(!source.includes(prohibited),`store excludes prohibited write/admin token: ${prohibited}`);
  }

  console.log(`filingPreparationCurrentStateSupabaseStore R1 tests passed: ${passed}`);
}
main().catch(error=>{console.error(error);process.exit(1);});
