import { strict as assert } from 'node:assert';
import {
  CANONICAL_FILING_FACT_REFS,
  type Attachment10cPacketState,
  type CreatedNoticeFactIdentity,
  type FilingCanonicalFactRecord,
  type FilingCanonicalFactsProjection,
  type FilingFactProvenance,
  type NoticePacketState,
  type PacketArtifactBinding,
} from './filingCanonicalFacts';
import {
  buildUd100Attachment10cCompositionPlan,
  evaluateUd100Attachment10cReadiness,
  type Ud100Attachment10cLinkageRecord,
  type Ud100Attachment10cReadinessEvidenceInput,
  type Ud100Attachment10cServiceEventEvidence,
} from './ud100Attachment10cCompositionPlan';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function notEqual<T>(actual: T, expected: T, message: string) {
  assert.notEqual(actual, expected, message);
  passed += 1;
}

const createdNotice: CreatedNoticeFactIdentity = {
  generation: 'synthetic-generation-10c',
  createdAtISO: '2026-08-29T20:00:00.000Z',
};

function provenance(
  sourcePath: string,
  governed = false,
): FilingFactProvenance {
  return {
    createdNotice: { ...createdNotice },
    sourcePaths: [sourcePath],
    provenanceClass: governed ? 'GOVERNED_CONTROL_RESULT' : 'FROZEN_CUSTOMER_CONFIRMED',
    dependencies: [],
    ...(governed
      ? {
          governedControl: {
            controlId: 'ud100.packet-composition',
            controlVersion: '1.0.0',
            resultId: `${sourcePath}-current`,
            status: 'CURRENT' as const,
          },
        }
      : {}),
  };
}

function noticeArtifact(
  artifactId: string,
  hex: string,
): PacketArtifactBinding {
  return {
    artifactId,
    artifactRole: 'EXHIBIT_2_NOTICE',
    sha256: hex.repeat(64),
    byteLength: 2048,
    createdNotice: { ...createdNotice },
  };
}

interface ProjectionOptions {
  defendants?: readonly string[];
  attachmentKind?: Attachment10cPacketState['kind'];
  artifacts?: readonly PacketArtifactBinding[];
}

function projection(options: ProjectionOptions = {}): FilingCanonicalFactsProjection {
  const defendants = options.defendants ?? ['Synthetic Defendant A', 'Synthetic Defendant B'];
  const artifacts = options.artifacts ?? [
    noticeArtifact('notice-a', 'a'),
    noticeArtifact('notice-b', 'b'),
  ];
  const notice: NoticePacketState = {
    kind: 'EXHIBIT_2_ATTACHED',
    requiredNoticeCount: artifacts.length === 1 ? 1 : 2,
    artifacts,
  };
  const attachment: Attachment10cPacketState = {
    kind: options.attachmentKind ?? 'REQUIRED_BUT_UNSUPPORTED',
  };
  const facts: FilingCanonicalFactRecord = {
    [CANONICAL_FILING_FACT_REFS.defendantNames]: {
      state: 'KNOWN',
      value: [...defendants],
      provenance: provenance('createData.tenantNames'),
    },
    [CANONICAL_FILING_FACT_REFS.packetNotice]: {
      state: 'KNOWN',
      value: notice,
      provenance: provenance('packet.notice', true),
    },
    [CANONICAL_FILING_FACT_REFS.packetAttachment10c]: {
      state: 'KNOWN',
      value: attachment,
      provenance: provenance('packet.attachment10c', true),
    },
  };
  return {
    status: 'READY',
    createdNoticeIdentity: { ...createdNotice },
    facts,
  };
}

function serviceEvent(
  serviceEventId: string,
  defendantName: string,
  overrides: Partial<Ud100Attachment10cServiceEventEvidence> = {},
): Ud100Attachment10cServiceEventEvidence {
  return {
    serviceEventId,
    createdNotice: { ...createdNotice },
    serviceDate: serviceEventId === 'service-a' ? '2026-08-14' : '2026-08-15',
    method: 'personal',
    outcome: 'SUCCESS',
    recipient: { kind: 'NAMED_DEFENDANT', name: defendantName },
    provenance: {
      sourceId: `source-${serviceEventId}`,
      eventId: serviceEventId,
      eventType: 'SERVICE_ATTEMPT',
    },
    ...overrides,
  };
}

const eventA = serviceEvent('service-a', 'Synthetic Defendant A');
const eventB = serviceEvent('service-b', 'Synthetic Defendant B');
const links: readonly Ud100Attachment10cLinkageRecord[] = [
  {
    defendantOrdinal: 0,
    defendantName: 'Synthetic Defendant A',
    noticeArtifactId: 'notice-a',
    serviceEventId: 'service-a',
  },
  {
    defendantOrdinal: 1,
    defendantName: 'Synthetic Defendant B',
    noticeArtifactId: 'notice-b',
    serviceEventId: 'service-b',
  },
];

function readyPlan(
  p: FilingCanonicalFactsProjection = projection(),
  serviceEvents: readonly Ud100Attachment10cServiceEventEvidence[] = [eventA, eventB],
  linkages: readonly Ud100Attachment10cLinkageRecord[] = links,
) {
  const result = buildUd100Attachment10cCompositionPlan({
    projection: p,
    serviceEvents,
    linkages,
  });
  if (result.status !== 'PLAN_READY') {
    throw new Error(`Expected PLAN_READY, got ${result.status}: ${result.reasons.join('; ')}`);
  }
  return result.plan;
}

const notApplicable = buildUd100Attachment10cCompositionPlan({
  projection: projection({ attachmentKind: 'NOT_APPLICABLE' }),
});
equal(notApplicable.status, 'NOT_APPLICABLE', 'NOT_APPLICABLE with no composition evidence remains not applicable');

const contradictoryNotApplicable = buildUd100Attachment10cCompositionPlan({
  projection: projection({ attachmentKind: 'NOT_APPLICABLE' }),
  serviceEvents: [eventA],
  linkages: [links[0]!],
});
equal(contradictoryNotApplicable.status, 'BLOCKED', 'NOT_APPLICABLE plus supplied plan rows fails closed');

const validPlan = readyPlan();
equal(validPlan.schemaVersion, 1, 'valid plan has schemaVersion 1');
equal(validPlan.planVersion, '1.0.0', 'valid plan has frozen plan version');
ok(/^ud100-attachment10c-plan:sha256:[0-9a-f]{64}$/.test(validPlan.planId), 'valid plan is content-addressed by SHA-256');
equal(validPlan.pdfGeneration, 'NOT_PERFORMED', 'plan performs no PDF generation');
equal(validPlan.legalSufficiency, 'NOT_EVALUATED', 'plan performs no legal-sufficiency determination');
equal(validPlan.filingAuthority, 'NOT_AUTHORIZED', 'plan creates no filing authority');

const reorderedPlan = readyPlan(
  projection(),
  [eventB, eventA],
  [links[1]!, links[0]!],
);
assert.deepEqual(reorderedPlan, validPlan, 'input ordering must not affect canonical plan output');
passed += 1;

const crossSwap = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB],
  linkages: [{ ...links[0]!, defendantName: 'Synthetic Defendant B' }, links[1]!],
});
equal(crossSwap.status, 'BLOCKED', 'cross-defendant ordinal/name swap blocks');

const unknownNotice = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB],
  linkages: [{ ...links[0]!, noticeArtifactId: 'unknown-notice' }, links[1]!],
});
equal(unknownNotice.status, 'BLOCKED', 'unknown Notice artifact blocks');

const partialNotice = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB],
  linkages: [links[0]!, { ...links[1]!, noticeArtifactId: 'notice-a' }],
});
equal(partialNotice.status, 'BLOCKED', 'partial Notice artifact coverage blocks');

const missingDefendant = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, serviceEvent('service-c', 'Synthetic Defendant A')],
  linkages: [
    links[0]!,
    {
      defendantOrdinal: 0,
      defendantName: 'Synthetic Defendant A',
      noticeArtifactId: 'notice-b',
      serviceEventId: 'service-c',
    },
  ],
});
equal(missingDefendant.status, 'BLOCKED', 'missing canonical defendant coverage blocks');

const duplicateEvent = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventA, eventB],
  linkages: links,
});
equal(duplicateEvent.status, 'BLOCKED', 'duplicate service-event identity blocks');

const duplicateLink = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB],
  linkages: [links[0]!, links[0]!, links[1]!],
});
equal(duplicateLink.status, 'BLOCKED', 'duplicate linkage triple blocks');

const provenanceMismatch = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{
    ...eventA,
    provenance: { ...eventA.provenance, eventId: 'different-event' },
  }, eventB],
  linkages: links,
});
equal(provenanceMismatch.status, 'BLOCKED', 'provenance event-id mismatch blocks');

const staleEvent = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{
    ...eventA,
    createdNotice: { ...createdNotice, generation: 'stale-generation' },
  }, eventB],
  linkages: links,
});
equal(staleEvent.status, 'BLOCKED', 'stale Created Notice identity on event blocks');

const failedEvent = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{ ...eventA, outcome: 'FAILED' }, eventB],
  linkages: links,
});
equal(failedEvent.status, 'BLOCKED', 'FAILED service event blocks rather than being omitted or promoted');

const secondSuccess = serviceEvent('service-a-2', 'Synthetic Defendant A');
const ambiguousPair = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, secondSuccess, eventB],
  linkages: [
    links[0]!,
    { ...links[0]!, serviceEventId: 'service-a-2' },
    links[1]!,
  ],
});
equal(ambiguousPair.status, 'BLOCKED', 'two distinct successful events for the same defendant and Notice pair block as ambiguous');

const crossDefendantEvent = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA],
  linkages: [links[0]!, { ...links[1]!, serviceEventId: 'service-a' }],
});
equal(crossDefendantEvent.status, 'BLOCKED', 'one service event linked across defendant ordinals blocks as ambiguous');

const invalidDate = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{ ...eventA, serviceDate: '2026-02-30' }, eventB],
  linkages: links,
});
equal(invalidDate.status, 'BLOCKED', 'invalid calendar date blocks');

const invalidMethod = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{ ...eventA, method: 'invented' as never }, eventB],
  linkages: links,
});
equal(invalidMethod.status, 'BLOCKED', 'unknown runtime service method blocks');

const invalidOutcome = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{ ...eventA, outcome: 'MAYBE' as never }, eventB],
  linkages: links,
});
equal(invalidOutcome.status, 'BLOCKED', 'unknown runtime service outcome blocks');

const blankRecipient = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [{ ...eventA, recipient: { kind: 'NAMED_DEFENDANT', name: ' ' } }, eventB],
  linkages: links,
});
equal(blankRecipient.status, 'BLOCKED', 'blank recipient name blocks');

const orphanEvent = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB, serviceEvent('orphan-event', 'Synthetic Defendant A')],
  linkages: links,
});
equal(orphanEvent.status, 'BLOCKED', 'orphan service event blocks');

const orphanLink = buildUd100Attachment10cCompositionPlan({
  projection: projection(),
  serviceEvents: [eventA, eventB],
  linkages: [links[0]!, { ...links[1]!, serviceEventId: 'missing-event' }],
});
equal(orphanLink.status, 'BLOCKED', 'link to unknown service event blocks');

const blockedProjection = buildUd100Attachment10cCompositionPlan({
  projection: { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null },
  serviceEvents: [eventA, eventB],
  linkages: links,
});
equal(blockedProjection.status, 'BLOCKED', 'non-READY canonical projection blocks');

const needsEvidence = buildUd100Attachment10cCompositionPlan({ projection: projection() });
equal(needsEvidence.status, 'NEEDS_INFORMATION', 'required Attachment 10c with missing explicit evidence needs information');

const changedDate = readyPlan(projection(), [{ ...eventA, serviceDate: '2026-08-16' }, eventB], links);
notEqual(changedDate.planId, validPlan.planId, 'material service-date change changes planId');
const changedMethod = readyPlan(projection(), [{ ...eventA, method: 'substituted', mailingDate: '2026-08-14' }, eventB], links);
notEqual(changedMethod.planId, validPlan.planId, 'material service-method change changes planId');
const changedRecipient = readyPlan(projection(), [{ ...eventA, recipient: { kind: 'OTHER_PERSON', name: 'Synthetic Other Person' } }, eventB], links);
notEqual(changedRecipient.planId, validPlan.planId, 'material recipient change changes planId');
const changedProvenance = readyPlan(projection(), [{ ...eventA, provenance: { ...eventA.provenance, sourceId: 'different-source' } }, eventB], links);
notEqual(changedProvenance.planId, validPlan.planId, 'material lifecycle provenance change changes planId');
const changedNoticeProjection = projection({
  artifacts: [noticeArtifact('notice-a', 'c'), noticeArtifact('notice-b', 'b')],
});
const changedNotice = readyPlan(changedNoticeProjection);
notEqual(changedNotice.planId, validPlan.planId, 'material Notice binding change changes planId');
const changedDefendantProjection = projection({
  defendants: ['Synthetic Defendant A Changed', 'Synthetic Defendant B'],
});
const changedDefendantEventA = serviceEvent('service-a', 'Synthetic Defendant A Changed');
const changedDefendantLinks: readonly Ud100Attachment10cLinkageRecord[] = [
  { ...links[0]!, defendantName: 'Synthetic Defendant A Changed' },
  links[1]!,
];
const changedDefendant = readyPlan(changedDefendantProjection, [changedDefendantEventA, eventB], changedDefendantLinks);
notEqual(changedDefendant.planId, validPlan.planId, 'material canonical defendant change changes planId');

const currentConsistency: NonNullable<Ud100Attachment10cReadinessEvidenceInput['serviceElectionConsistencyControl']> = {
  state: 'KNOWN',
  value: 'CONSISTENT',
  control: {
    controlId: 'ud100.service-election-consistency',
    controlVersion: '1.0.0',
    resultId: 'synthetic-consistency-current',
    status: 'CURRENT',
  },
  dependencies: [],
};
const personalElection: NonNullable<Ud100Attachment10cReadinessEvidenceInput['serviceElection']> = {
  state: 'KNOWN',
  value: 'PERSONAL_HAND_DELIVERY',
  confirmation: {
    confirmationId: 'synthetic-personal-election',
    confirmedAtISO: '2026-08-29T20:30:00.000Z',
  },
};

const validReadiness = evaluateUd100Attachment10cReadiness(projection(), {
  serviceEvents: [eventA, eventB],
  linkages: links,
  serviceElection: personalElection,
  serviceElectionConsistencyControl: currentConsistency,
});
equal(validReadiness.status, 'READY', 'PLAN_READY plus exact personal election and CURRENT consistency advances only Attachment 10c readiness');

const missingElection = evaluateUd100Attachment10cReadiness(projection(), {
  serviceEvents: [eventA, eventB],
  linkages: links,
  serviceElectionConsistencyControl: currentConsistency,
});
equal(missingElection.status, 'NEEDS_INFORMATION', 'missing owner service election needs information and is never inferred');

const staleConsistency = evaluateUd100Attachment10cReadiness(projection(), {
  serviceEvents: [eventA, eventB],
  linkages: links,
  serviceElection: personalElection,
  serviceElectionConsistencyControl: {
    ...currentConsistency,
    control: { ...currentConsistency.control!, status: 'STALE' },
  },
});
equal(staleConsistency.status, 'BLOCKED', 'stale service-election consistency blocks');

const substitutedReadiness = evaluateUd100Attachment10cReadiness(projection(), {
  serviceEvents: [{ ...eventA, method: 'substituted', mailingDate: '2026-08-14' }, eventB],
  linkages: links,
  serviceElection: personalElection,
  serviceElectionConsistencyControl: currentConsistency,
});
equal(substitutedReadiness.status, 'BLOCKED', 'personal election cannot be inferred coherent from factual substituted service');

const otherRecipientReadiness = evaluateUd100Attachment10cReadiness(projection(), {
  serviceEvents: [{ ...eventA, recipient: { kind: 'OTHER_PERSON', name: 'Synthetic Other Person' } }, eventB],
  linkages: links,
  serviceElection: personalElection,
  serviceElectionConsistencyControl: currentConsistency,
});
equal(otherRecipientReadiness.status, 'BLOCKED', 'OTHER_PERSON recipient cannot satisfy current personal-election readiness profile');

const notApplicableReadiness = evaluateUd100Attachment10cReadiness(
  projection({ attachmentKind: 'NOT_APPLICABLE' }),
  {},
);
equal(notApplicableReadiness.status, 'NOT_APPLICABLE', 'NOT_APPLICABLE remains unchanged with empty R2-C evidence');

console.log(`${passed} R2-C Attachment 10c composition-plan assertions passed`);
