// lib/riskpath/noticeGenerationEvent.ts
// AI-first /chat rebuild — notice-generation write path for riskpath_records (lane-2 Option B).
// Writes the durable evidence record atomically at notice generation. Engineering wires; broker reviews.
//
// Anti-echo distinction (broker lane-4 note, confirmed): transcript_snapshot captures the CONVERSATIONAL
// transcript (model `reply` + owner messages; per lane-3 Ruling 1 the persona never echoes account-number
// digits), NOT the produced-document body. The produced PDF (which legitimately contains the full
// payee_account_number) lives in `documents` storage with its own access discipline and is on the
// lane-Q analytics/log denylist alongside intake_state.payee_account_number, transcript, transcript_snapshot.

import type { ChatSessionRow, RiskPathRecordRow, TranscriptTurn } from '../chat/dbTypes';

/** Minimal Supabase-insert surface (decoupled from the client lib for testability). */
export interface RiskPathInsert {
  user_id: string;
  chat_session_id: string;
  property_id: string | null;
  notice_document_id: string | null;
  current_state: string;            // see §7 note: initial state pending notice-rail integration confirmation
  captured_payload: ChatSessionRow['intake_state'];
  transcript_snapshot: TranscriptTurn[]; // conversational transcript ONLY (not the produced document body)
  transcript_snapshot_at: string;
  counsel_route_trigger: string | null;
}

export interface NoticeGenerationInput {
  session: Pick<ChatSessionRow, 'id' | 'user_id' | 'property_id' | 'intake_state' | 'transcript'>;
  noticeDocumentId: string | null;
  /** Initial RiskPath state at creation. Pending §7 confirmation w/ the existing notice rail. */
  initialState?: string;
}

/** Build the riskpath_records insert payload (Option B snapshot). Pure — caller performs the insert. */
export function buildRiskPathInsert(input: NoticeGenerationInput): RiskPathInsert {
  const { session, noticeDocumentId, initialState } = input;
  if (!session.user_id) {
    throw new Error('buildRiskPathInsert: session must be claimed (user_id required) before notice generation');
  }
  return {
    user_id: session.user_id,
    chat_session_id: session.id,
    property_id: session.property_id,
    notice_document_id: noticeDocumentId,
    current_state: initialState ?? 'notice_created', // §7 note: confirm vs. notice-rail status
    captured_payload: session.intake_state,
    transcript_snapshot: session.transcript,         // conversational transcript only
    transcript_snapshot_at: new Date().toISOString(),
    counsel_route_trigger: null,                      // set later if a trigger fires
  };
}

/** Compile-time guard: the insert shape stays assignable to the riskpath_records row columns it sets. */
export type _AssignableToRow = Pick<
  RiskPathRecordRow,
  'user_id' | 'chat_session_id' | 'property_id' | 'notice_document_id' | 'current_state'
  | 'captured_payload' | 'transcript_snapshot' | 'transcript_snapshot_at' | 'counsel_route_trigger'
>;
