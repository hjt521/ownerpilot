import type {
  CreatedNoticeArtifactEnvelope,
  NoticeFlowData,
  ServiceServerIdentity,
} from './noticeFlowState';
import { getSuccessfulAttempt } from './escalation';
import { restoreCreatedNoticeArtifact } from './createdNoticeArtifact';

export type ServiceTaskKind = 'prepared' | 'in_progress' | 'recorded';

export interface ServiceTaskDisplay {
  kind: ServiceTaskKind;
  attemptCount: number;
  statusLabel: string;
}

export interface ServiceTaskContext {
  artifact: CreatedNoticeArtifactEnvelope;
  noticeData: NoticeFlowData;
  serviceData: NoticeFlowData;
  display: ServiceTaskDisplay;
}

/**
 * Derived presentation state only. No persisted Matter/RiskPath status is created.
 */
export function deriveServiceTaskDisplay(data: NoticeFlowData): ServiceTaskDisplay {
  const attempts = data.serviceAttempts ?? [];
  if (getSuccessfulAttempt(data)) {
    return {
      kind: 'recorded',
      attemptCount: attempts.length,
      statusLabel: 'SERVICE RECORDED',
    };
  }
  if (attempts.length > 0) {
    return {
      kind: 'in_progress',
      attemptCount: attempts.length,
      statusLabel: `${attempts.length} ATTEMPT${attempts.length === 1 ? '' : 'S'} RECORDED · NOT SERVED`,
    };
  }
  return {
    kind: 'prepared',
    attemptCount: 0,
    statusLabel: 'PREPARED · NOT SERVED',
  };
}

/**
 * Restore the exact Created Notice identity, then overlay only the current
 * service-event fields needed by Service Log / Proof-of-Service outputs.
 * Mutable face fields never replace the exact Create-time face.
 */
export function restoreServiceTaskContext(
  currentData: NoticeFlowData,
): ServiceTaskContext | null {
  const artifact = restoreCreatedNoticeArtifact(currentData);
  if (!artifact) return null;

  const serviceData: NoticeFlowData = {
    ...artifact.createData,
    serviceAttempts: [...(currentData.serviceAttempts ?? [])],
    successfulServiceAttemptId: currentData.successfulServiceAttemptId,
  };

  return {
    artifact,
    noticeData: artifact.createData,
    serviceData,
    display: deriveServiceTaskDisplay(currentData),
  };
}

/** Same-Notice convenience only: prior server name/address, never eligibility. */
export function getPreviousServerCandidate(
  data: NoticeFlowData,
): Pick<ServiceServerIdentity, 'name' | 'address'> | null {
  const attempts = data.serviceAttempts ?? [];
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    const server = attempts[i]?.server;
    const name = server?.name?.trim() ?? '';
    if (!name) continue;
    return { name, address: server?.address?.trim() ?? '' };
  }
  return null;
}
