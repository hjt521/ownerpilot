// lib/chat/clientTypes.ts
// AI-first /chat — shared client/server response shapes for the chat surface (pure types + a tiny pure helper).

import type { Refusal } from './intakeSchema';

/** Response body of POST /api/chat (mirrors the route's NextResponse.json). */
export interface ChatTurnResponse {
  reply: string;
  refusal: Refusal | null;
  routeToReview: boolean;
  missingFields: string[];
}

export interface ChatMessageVM {
  id: string;
  role: 'owner' | 'assistant';
  content: string;
  refusal: Refusal | null;
}

/** A refusal turn shows the route-to-counsel handoff. Pure so the UI + tests agree on the rule. */
export function showsCounselHandoff(refusal: Refusal | null): boolean {
  return refusal !== null;
}

/** The §2.2 chat disclaimer is appended below a legal_advice refusal (per Lane-3 Ruling 4 placement). */
export function appendsChatDisclaimer(refusal: Refusal | null): boolean {
  return refusal === 'legal_advice';
}
