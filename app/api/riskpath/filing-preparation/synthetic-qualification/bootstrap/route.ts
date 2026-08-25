import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  createSyntheticQualificationPreview,
  deriveSyntheticBootstrapIdentities,
  exactSyntheticBootstrapRowMatch,
  extractBootstrapCeremonyAtISO,
  materializeSyntheticQualification,
} from '@/lib/flow/filingPreparationSyntheticQualification';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_KEYS=['action'] as const;
const COMMIT_KEYS=['action','reviewApprovalGeneration','createReviewConfirmed','fixedElectionProfileConfirmed'] as const;
const COLUMNS=['id','user_id','chat_session_id','property_id','notice_document_id','current_state','captured_payload','transcript_snapshot','transcript_snapshot_at','counsel_route_trigger','produce_snapshot','created_notice_artifact_id','created_notice_service_date','created_notice_generation','created_notice_semantic_binding_id','created_notice_finalized_at','e2e_run_id','synthetic_source','soft_deleted_at'].join(',');

type Client={auth:{getUser():PromiseLike<{data:{user:{id:string}|null}|null;error:unknown|null}>};from(table:string):any};
export type SyntheticBootstrapRouteDependencies={
  createUserScopedClient(token:string):Client;
  nowISO():string;
  createPreview():any;
  materialize(input:{authenticatedUserId:string;reviewApprovalGeneration:string;ceremonyAtISO:string}):Promise<any>;
};
const deps:SyntheticBootstrapRouteDependencies={
  createUserScopedClient(token:string):Client{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error('config');const sb=createSupabaseClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});return {auth:{getUser:()=>sb.auth.getUser(token)},from:(t:string)=>sb.from(t)} as Client;},
  nowISO:()=>new Date().toISOString(),createPreview:createSyntheticQualificationPreview,materialize:materializeSyntheticQualification,
};
function obj(v:unknown):v is Record<string,unknown>{return typeof v==='object'&&v!==null&&!Array.isArray(v);}
function exact(v:Record<string,unknown>,keys:readonly string[]):boolean{const a=Object.keys(v).sort(),b=[...keys].sort();return a.length===b.length&&a.every((k,i)=>k===b[i]);}
function json(status:number,body:Record<string,unknown>):Response{return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function bearer(r:Request):string|null{const h=r.headers.get('authorization');if(!h)return null;const m=/^Bearer ([^\s]+)$/i.exec(h);return m?.[1]||null;}
async function user(client:Client):Promise<string|null>{try{const x=await client.auth.getUser();const id=x.error===null&&x.data?.user?.id;return typeof id==='string'&&UUID.test(id)?id:null;}catch{return null;}}
async function read(client:Client,userId:string,id:string):Promise<{ok:true;row:any}|{ok:false}>{try{const x=await client.from('riskpath_records').select(COLUMNS).eq('id',id).eq('user_id',userId).limit(1).maybeSingle();return x.error===null?{ok:true,row:x.data??null}:{ok:false};}catch{return {ok:false};}}
async function insert(client:Client,row:any):Promise<'INSERTED'|'CONFLICT'|'ERROR'>{try{const x=await client.from('riskpath_records').insert(row).select('id').single();if(x.error!==null){return obj(x.error)&&x.error.code==='23505'?'CONFLICT':'ERROR';}return x.data?.id===row.id?'INSERTED':'ERROR';}catch{return 'ERROR';}}
function previewResponse(p:any):Response{return json(200,{status:'PREVIEW_READY',syntheticOnly:true,profileId:p.profileId,profileVersion:p.profileVersion,reviewApprovalGeneration:p.reviewApprovalGeneration,noticeReview:p.noticeReview,fixedElectionProfileReview:p.fixedElectionProfileReview,humanConfirmationRequired:true,statement:p.statement});}
function materialResponse(m:any,disposition:'INSERTED'|'IDEMPOTENT_EXISTING'):Response{return json(200,{status:'BOOTSTRAP_MATERIAL_READY',disposition,syntheticOnly:true,profileId:m.profileId,profileVersion:m.profileVersion,profileBindingId:m.profileBindingId,riskpathRecordId:m.riskpathRecordId,e2eRunId:m.e2eRunId,preparationSnapshot:m.preparationSnapshot,generatedDraft:m.generatedDraft,generatedDraftBytes:Array.from(m.generatedDraftBytes),currentnessMaterialBinding:m.currentnessMaterialBinding,renderedAcknowledgmentTemplate:m.renderedAcknowledgmentTemplate,reviewStatement:m.reviewStatement});}
async function existingMaterial(row:any,userId:string,generation:string,d:SyntheticBootstrapRouteDependencies):Promise<any|null>{const at=extractBootstrapCeremonyAtISO(row);if(!at)return null;const m=await d.materialize({authenticatedUserId:userId,reviewApprovalGeneration:generation,ceremonyAtISO:at});return exactSyntheticBootstrapRowMatch(row,m.riskpathInsert)?m:null;}

export async function handleSyntheticBootstrapRequest(request:Request,d:SyntheticBootstrapRouteDependencies=deps):Promise<Response>{
  const token=bearer(request);if(!token)return json(401,{error:'UNAUTHENTICATED'});
  let client:Client;try{client=d.createUserScopedClient(token);}catch{return json(503,{error:'SYNTHETIC_BOOTSTRAP_UNAVAILABLE'});}const userId=await user(client);if(!userId)return json(401,{error:'UNAUTHENTICATED'});
  let body:unknown;try{body=await request.json();}catch{return json(400,{error:'INVALID_SYNTHETIC_BOOTSTRAP_REQUEST'});}if(!obj(body)||typeof body.action!=='string')return json(400,{error:'INVALID_SYNTHETIC_BOOTSTRAP_REQUEST'});
  if(body.action==='PREVIEW'){if(!exact(body,PREVIEW_KEYS))return json(400,{error:'INVALID_SYNTHETIC_BOOTSTRAP_REQUEST'});try{return previewResponse(d.createPreview());}catch{return json(503,{error:'SYNTHETIC_BOOTSTRAP_UNAVAILABLE'});}}
  if(body.action!=='COMMIT'||!exact(body,COMMIT_KEYS))return json(400,{error:'INVALID_SYNTHETIC_BOOTSTRAP_REQUEST'});
  if(typeof body.reviewApprovalGeneration!=='string'||!body.reviewApprovalGeneration.trim()||body.createReviewConfirmed!==true||body.fixedElectionProfileConfirmed!==true)return json(400,{error:'HUMAN_SYNTHETIC_CONFIRMATION_REQUIRED'});
  let p:any;try{p=d.createPreview();}catch{return json(503,{error:'SYNTHETIC_BOOTSTRAP_UNAVAILABLE'});}if(body.reviewApprovalGeneration!==p.reviewApprovalGeneration)return json(409,{error:'SYNTHETIC_PREVIEW_GENERATION_MISMATCH'});
  const ids=deriveSyntheticBootstrapIdentities(userId,p.reviewApprovalGeneration);const before=await read(client,userId,ids.riskpathRecordId);if(!before.ok)return json(503,{error:'SYNTHETIC_BOOTSTRAP_UNAVAILABLE'});
  if(before.row!==null){try{const m=await existingMaterial(before.row,userId,p.reviewApprovalGeneration,d);return m?materialResponse(m,'IDEMPOTENT_EXISTING'):json(409,{error:'SYNTHETIC_BOOTSTRAP_IDENTITY_COLLISION'});}catch{return json(409,{error:'SYNTHETIC_BOOTSTRAP_MATERIALIZATION_BLOCKED'});}}
  let m:any;try{m=await d.materialize({authenticatedUserId:userId,reviewApprovalGeneration:p.reviewApprovalGeneration,ceremonyAtISO:d.nowISO()});}catch{return json(409,{error:'SYNTHETIC_BOOTSTRAP_MATERIALIZATION_BLOCKED'});}
  if(m.riskpathRecordId!==ids.riskpathRecordId||m.e2eRunId!==ids.e2eRunId||m.createdNoticeArtifactId!==ids.createdNoticeArtifactId)return json(409,{error:'SYNTHETIC_BOOTSTRAP_IDENTITY_MISMATCH'});
  const wrote=await insert(client,m.riskpathInsert);
  if(wrote==='INSERTED'){const after=await read(client,userId,m.riskpathRecordId);return after.ok&&after.row!==null&&exactSyntheticBootstrapRowMatch(after.row,m.riskpathInsert)?materialResponse(m,'INSERTED'):json(503,{error:'SYNTHETIC_BOOTSTRAP_ROUND_TRIP_FAILED'});}
  if(wrote==='ERROR')return json(503,{error:'SYNTHETIC_BOOTSTRAP_WRITE_FAILED'});
  const raced=await read(client,userId,m.riskpathRecordId);if(!raced.ok||raced.row===null)return json(503,{error:'SYNTHETIC_BOOTSTRAP_WRITE_FAILED'});try{const same=await existingMaterial(raced.row,userId,p.reviewApprovalGeneration,d);return same?materialResponse(same,'IDEMPOTENT_EXISTING'):json(409,{error:'SYNTHETIC_BOOTSTRAP_IDENTITY_COLLISION'});}catch{return json(409,{error:'SYNTHETIC_BOOTSTRAP_IDENTITY_COLLISION'});}
}
export async function POST(request:Request):Promise<Response>{return handleSyntheticBootstrapRequest(request);}
