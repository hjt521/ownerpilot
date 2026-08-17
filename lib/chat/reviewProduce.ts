// lib/chat/reviewProduce.ts
// PR-A3 §5.2 core — chat Review client produce orchestration (Fork B(ii) client rail-caller +
// Fork A(iii) client-side verdict resolution). Source: pr_a3_produce_handoff_fork_ruling_2026-07-01.md.
//
// This module is the TESTABLE core of the Review-step produce path: it turns the from-chat produce-ready
// envelope into a wizard-parity NoticeFlowData (via toNoticeFlowData — the SAME assembly source the wizard
// renders from), computes the facial dates, resolves the jurisdiction verdict client-side (reusing the wizard's
// runJurisdictionResolution — Fork A(iii)), and routes to the produce surface.

import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import type { IntakeState } from './intakeSchema';
import { toNoticeFlowData } from './toNoticeFlowData';
import { computeCompliancePeriod, type ServiceMethod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { runJurisdictionResolution, type BridgeRunResult, type BridgeDeps } from '@/lib/flow/jurisdictionBridge';
import type { ComputedNoticeDates } from '@/lib/produce/renderNotice';

/** The produce-ready envelope returned by POST /api/notice/produce/from-chat (§5.1). */
export interface ProduceEnvelope {
  ok: boolean;
  riskpathId: string;
  /** Opaque server-generated identity for this one prospective Created Notice generation event. */
  createdNoticeArtifactId: string;
  lahdCopyVersion: string;
  baseName: string;
  /** Flattened intake_state values + serviceDate (= intendedServiceDate). */
  payload: Record<string, unknown>;
}

/**
 * Unflatten the envelope payload into an IntakeState and build the wizard-parity NoticeFlowData.
 * toNoticeFlowData is the single assembly source (no defaulting; throws NoticeFlowMapError on a missing field).
 */
export function buildNoticeDataFromEnvelope(env: ProduceEnvelope): NoticeFlowData {
  const payload = env.payload ?? {};
  const serviceDate = payload.serviceDate;
  if (typeof serviceDate !== 'string' || serviceDate === '') {
    throw new Error('reviewProduce: envelope payload is missing serviceDate.');
  }
  const state: IntakeState = Object.fromEntries(
    Object.entries(payload)
      .filter(([k]) => k !== 'serviceDate')
      .map(([k, v]) => [k, { value: v, confidence: 1, updated_at: '' }]),
  ) as IntakeState;
  return toNoticeFlowData(state, serviceDate);
}

/** Facial compliance dates for the produced notice (renderNotice consumes these; never recomputes). */
export function computeDatesForData(data: NoticeFlowData): ComputedNoticeDates {
  const serviceDate = data.serviceDate;
  if (!serviceDate) throw new Error('reviewProduce: NoticeFlowData is missing serviceDate.');
  const holidays = getVerifiedHolidaySet(Number(serviceDate.slice(0, 4)));
  const p = computeCompliancePeriod({
    serviceDate,
    serviceMethod: data.serviceMethod as ServiceMethod,
    holidays,
  });
  return { compliancePeriodStartDate: p.commencementDate, compliancePeriodEndDate: p.expirationDate };
}

export type ProduceRoute =
  | { kind: 'la_overlay' }
  | { kind: 'stub'; reason: 'non_la' | 'broker_confirm' | 'unresolved' | 'gate_closed' };

export function routeForVerdict(r: BridgeRunResult): ProduceRoute {
  switch (r.kind) {
    case 'skipped_gate_closed':
      return { kind: 'stub', reason: 'gate_closed' };
    case 'skipped_no_address':
    case 'aborted':
      return { kind: 'stub', reason: 'unresolved' };
    case 'verdict':
      switch (r.verdict) {
        case 'confirmed_la':
          return { kind: 'la_overlay' };
        case 'not_la':
          return { kind: 'stub', reason: 'non_la' };
        case 'manual_review':
          return { kind: 'stub', reason: 'broker_confirm' };
        case 'resolution_failed':
        default:
          return { kind: 'stub', reason: 'unresolved' };
      }
  }
}

export interface ProducePlan {
  data: NoticeFlowData;
  dates: ComputedNoticeDates;
  route: ProduceRoute;
  baseName: string;
  lahdCopyVersion: string;
  riskpathId: string;
  createdNoticeArtifactId: string;
}

/** The opaque artifact ID follows the exact riskpathId through this plan; it is never derived by the client. */
export async function planProduce(env: ProduceEnvelope, deps: BridgeDeps): Promise<ProducePlan> {
  const data = buildNoticeDataFromEnvelope(env);
  const dates = computeDatesForData(data);
  const address = typeof env.payload.property_address === 'string' ? env.payload.property_address : undefined;
  const verdict = await runJurisdictionResolution(address, deps);
  return {
    data,
    dates,
    route: routeForVerdict(verdict),
    baseName: env.baseName,
    lahdCopyVersion: env.lahdCopyVersion,
    riskpathId: env.riskpathId,
    createdNoticeArtifactId: env.createdNoticeArtifactId,
  };
}
