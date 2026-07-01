// lib/riskpath/stalenessAck.ts
// PR-B staleness acknowledgment — request validation (§5.1). The acknowledgment is a compliance artifact:
// insert-only record of every staleness warning the owner acknowledged, on either surface.
// Source: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §5.

import { z } from 'zod';

export const STALENESS_REASON = z.enum(['AMOUNT_CHANGED', 'FACE_FIELD_CHANGED']);
export const STALENESS_ACTION = z.enum(['proceed_to_reproduce', 'dismiss_banner', 'cancel_at_generate']);

export const stalenessAckBodySchema = z.object({
  staleness_reason: STALENESS_REASON,
  changed_fields: z.array(z.string()).default([]),
  action_taken: STALENESS_ACTION,
});
export type StalenessAckBody = z.infer<typeof stalenessAckBodySchema>;
