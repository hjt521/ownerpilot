// lib/chat/dbTypes.ts
// AI-first /chat rebuild — hand-authored DB row types matching migrations 026-029.
// Regenerate authoritatively via `supabase gen types typescript` after the migrations apply.

export type ChatSessionStatus =
  | 'active' | 'intake_complete' | 'claimed' | 'abandoned' | 'expired';

export type RefusalValue =
  | 'legal_advice' | 'ud_filing' | 'settlement' | 'non_la_city' | 'security_concern';

export interface IntakeStateEntry {
  value: unknown;
  confidence: number;
  updated_at: string;
}

export interface TranscriptTurn {
  role: 'owner' | 'assistant';
  content: string;
  refusal: RefusalValue | null;
  extracted_fields: unknown[];
  ts: string;
  // Ruling 2: fine-grained persona category (e.g. 'settlement_negotiation'). Non-sensitive
  // categorical tag — ALLOWED in lane Q analytics; not redacted like `content`. See lib/chat/refusalBank.ts.
  // Lane 2E: `capture` carries the deterministic scripted-capture cursor (Fork A) on server-emitted
  // assistant turns — no new column; intake_state stays clean. See lib/chat/scriptedCapture.ts.
  metadata?: { refusal_category?: string; capture?: import('./scriptedCapture').CaptureCursor | null };
}

export interface ChatSessionRow {
  id: string;
  anon_token_hash: string;
  user_id: string | null;
  property_id: string | null;
  status: ChatSessionStatus;
  intake_state: Record<string, IntakeStateEntry>;
  intake_complete: boolean;
  transcript: TranscriptTurn[];
  last_refusal: RefusalValue | null;
  message_count: number;
  retention_class: string;
  legal_hold: boolean;
  legal_hold_ref: string | null;
  soft_deleted_at: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  expires_at: string;
}

export interface RiskPathRecordRow {
  id: string;
  user_id: string;
  chat_session_id: string | null;
  property_id: string | null;
  notice_document_id: string | null;
  current_state: string;                         // validated by lib/riskpath/transitions.ts
  state_history: Array<{ from: string; to: string; trigger: string; ts: string }>;
  captured_payload: Record<string, IntakeStateEntry>;
  transcript_snapshot: TranscriptTurn[] | null;  // Option B (LOCKED): frozen at notice generation
  transcript_snapshot_at: string | null;
  counsel_route_trigger: string | null;
  // PR-A3 §5.2 produce-audit (migration 034): LaProduceAuditFields blob persisted at LA produce time.
  produce_audit?: Record<string, unknown> | null;
  // PR-B (migration 035): ProductionSnapshot captured at produce time for the serve-time staleness guard.
  produce_snapshot?: Record<string, unknown> | null;
  retention_class: string;
  legal_hold: boolean;
  legal_hold_ref: string | null;
  soft_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourtesyReminderRow {
  id: string;
  riskpath_record_id: string;
  user_id: string;
  tone: 'friendly' | 'firm' | 'formal';          // RATIFIED per deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md §2
  message_text: string;
  channel: 'owner_copy' | 'sms_app_handoff';
  created_at: string;
}

export interface MagicLinkTokenRow {
  id: string;
  token_hash: string;
  email: string;
  chat_session_id: string | null;
  purpose: 'claim_session' | 'save_to_riskpath';
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}
