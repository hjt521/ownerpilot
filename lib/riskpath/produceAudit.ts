// lib/riskpath/produceAudit.ts
// PR-A3 §5.2 produce-audit fast-follow — validation of the LA produce-audit blob written by the chat produce
// path. The shape MUST match the wizard's `laProduceAudit` (LaProduceAuditFields in lib/produce/laProduceClient.ts)
// so the two produce paths persist a compliance-equivalent record.
// Ruling: pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md §2.

import { z } from 'zod';
import type { LaProduceAuditFields } from '@/lib/produce/laProduceClient';

const hashPair = z.object({ english: z.string(), spanish: z.string() });

/** Mirrors LaProduceAuditFields exactly (wizard parity). */
export const laProduceAuditSchema = z.object({
  rtcFormHashes: hashPair.nullable(),
  rtcFormLastModified: hashPair.nullable(),
  rtcRefreshRunAt: z.string().nullable(),
  lahdFilingPromptCopyVersion: z.string().min(1),
  lahdFilingPromptAcknowledgedAt: z.string().min(1),
  isLaProductionUnblockedAtProduce: z.boolean(),
  cachedResolverVerdictSource: z.string().min(1),
});

/** Compile-time proof the schema output is assignable to the wizard's audit type (parity). */
export type _AuditParity = z.infer<typeof laProduceAuditSchema> extends LaProduceAuditFields ? true : never;
const _auditParity: _AuditParity = true;
void _auditParity;

/** The produce-audit POST body. */
export const produceAuditBodySchema = z.object({
  laProduceAudit: laProduceAuditSchema,
});
export type ProduceAuditBody = z.infer<typeof produceAuditBodySchema>;
