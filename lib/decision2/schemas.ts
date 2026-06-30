// lib/decision2/schemas.ts
// Lane 5 Decision 2 — request body validators (zod). Master prompt §4. Reject anything not 'manual_review'.

import { z } from 'zod';

export const PRIOR_REVIEW_REASON = z.enum([
  'parcel_lookup_inconclusive', 'county_situs_gap', 'county_ambiguous',
]);

/** §4.1 POST /api/notice/broker-confirm */
export const submitSchema = z.object({
  addressRaw: z.string().min(5),
  requesterContact: z.string().email().optional(),
  priorResolverVerdict: z.literal('manual_review'),
  priorReviewReason: PRIOR_REVIEW_REASON,
  priorFailureMode: z.string().optional(),
});
export type SubmitBody = z.infer<typeof submitSchema>;

/** §4.3 POST /api/notice/broker-confirm/cancel */
export const cancelSchema = z.object({ token: z.string().min(1) });

/** §4.4 POST /api/notice/broker-confirm/resolve (broker-only) */
export const resolveSchema = z.object({
  requestId: z.string().uuid(),
  outcome: z.enum(['confirmed_la', 'not_la', 'inconclusive']),
  brokerActorId: z.string().min(1),
});
export type ResolveBody = z.infer<typeof resolveSchema>;
