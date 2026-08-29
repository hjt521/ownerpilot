import {
  CANONICAL_FILING_FACT_REFS,
  readCanonicalFilingFact,
  type Attachment10cPacketState,
  type ComplaintServiceElection,
  type CreatedNoticeFactIdentity,
  type CustomerConfirmedLegalElectionInput,
  type FilingCanonicalFactsProjection,
  type GovernedControlInput,
  type NoticePacketState,
  type PacketArtifactBinding,
} from './filingCanonicalFacts';
import type { ServiceAttemptOutcome } from './noticeFlowState';
import type { ServiceMethod } from '../dates/computeCompliancePeriod';

export const UD100_ATTACHMENT_10C_PLAN_VERSION = '1.0.0' as const;

export type Ud100Attachment10cRecipient =
  | { kind: 'NAMED_DEFENDANT'; name: string }
  | { kind: 'OTHER_PERSON'; name: string };

export interface Ud100Attachment10cLifecycleProvenance {
  sourceId: string;
  eventId: string;
  eventType: string;
}

export interface Ud100Attachment10cServiceEventEvidence {
  serviceEventId: string;
  createdNotice: CreatedNoticeFactIdentity;
  serviceDate: string;
  method: ServiceMethod;
  outcome: ServiceAttemptOutcome;
  mailingDate?: string;
  recipient: Ud100Attachment10cRecipient;
  provenance: Ud100Attachment10cLifecycleProvenance;
}

export interface Ud100Attachment10cLinkageRecord {
  defendantOrdinal: number;
  defendantName: string;
  noticeArtifactId: string;
  serviceEventId: string;
}

export interface Ud100Attachment10cCompositionPlanInput {
  projection: FilingCanonicalFactsProjection;
  serviceEvents?: readonly Ud100Attachment10cServiceEventEvidence[];
  linkages?: readonly Ud100Attachment10cLinkageRecord[];
}

export interface Ud100Attachment10cCanonicalDefendant {
  ordinal: number;
  name: string;
}

export interface Ud100Attachment10cCanonicalServiceEvent {
  serviceEventId: string;
  createdNotice: CreatedNoticeFactIdentity;
  serviceDate: string;
  method: ServiceMethod;
  outcome: 'SUCCESS';
  mailingDate: string | null;
  recipient: Ud100Attachment10cRecipient;
  provenance: Ud100Attachment10cLifecycleProvenance;
}

export interface Ud100Attachment10cCompositionPlan {
  schemaVersion: 1;
  planVersion: typeof UD100_ATTACHMENT_10C_PLAN_VERSION;
  planId: string;
  createdNotice: CreatedNoticeFactIdentity;
  applicability: 'REQUIRED_BUT_UNSUPPORTED';
  applicabilityControl: {
    controlId: string;
    controlVersion: string;
    resultId: string;
    status: 'CURRENT';
  };
  defendants: readonly Ud100Attachment10cCanonicalDefendant[];
  noticeExhibits: readonly PacketArtifactBinding[];
  serviceEvents: readonly Ud100Attachment10cCanonicalServiceEvent[];
  linkages: readonly Ud100Attachment10cLinkageRecord[];
  pdfGeneration: 'NOT_PERFORMED';
  legalSufficiency: 'NOT_EVALUATED';
  filingAuthority: 'NOT_AUTHORIZED';
}

export type Ud100Attachment10cCompositionPlanResult =
  | { status: 'NOT_APPLICABLE'; plan: null; reasons: readonly string[] }
  | { status: 'NEEDS_INFORMATION'; plan: null; reasons: readonly string[] }
  | { status: 'BLOCKED'; plan: null; reasons: readonly string[] }
  | { status: 'PLAN_READY'; plan: Ud100Attachment10cCompositionPlan; reasons: readonly string[] };

export interface Ud100Attachment10cReadinessEvidenceInput {
  serviceEvents?: readonly Ud100Attachment10cServiceEventEvidence[];
  linkages?: readonly Ud100Attachment10cLinkageRecord[];
  serviceElection?: CustomerConfirmedLegalElectionInput<ComplaintServiceElection>;
  serviceElectionConsistencyControl?: GovernedControlInput<'CONSISTENT'>;
}

export type Ud100Attachment10cReadinessEvaluation =
  | { status: 'NOT_APPLICABLE'; plan: null; reasons: readonly string[] }
  | { status: 'NEEDS_INFORMATION'; plan: Ud100Attachment10cCompositionPlan | null; reasons: readonly string[] }
  | { status: 'BLOCKED'; plan: Ud100Attachment10cCompositionPlan | null; reasons: readonly string[] }
  | { status: 'READY'; plan: Ud100Attachment10cCompositionPlan; reasons: readonly string[] };

const LOWER_HEX_SHA256 = /^[0-9a-f]{64}$/;
const SERVICE_METHODS = new Set<ServiceMethod>(['personal', 'substituted', 'post_and_mail']);
const SERVICE_OUTCOMES = new Set<ServiceAttemptOutcome>(['SUCCESS', 'FAILED']);
const RECIPIENT_KINDS = new Set<Ud100Attachment10cRecipient['kind']>(['NAMED_DEFENDANT', 'OTHER_PERSON']);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validCreatedNoticeIdentity(
  value: unknown,
  expected?: CreatedNoticeFactIdentity,
): value is CreatedNoticeFactIdentity {
  if (!exactKeys(value, ['generation', 'createdAtISO'])) return false;
  const candidate = value as unknown as CreatedNoticeFactIdentity;
  if (!nonempty(candidate.generation) || !nonempty(candidate.createdAtISO)) return false;
  return !expected || (
    candidate.generation === expected.generation
    && candidate.createdAtISO === expected.createdAtISO
  );
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function currentControlIdentity(value: unknown): {
  controlId: string;
  controlVersion: string;
  resultId: string;
  status: 'CURRENT';
} | null {
  if (!isObject(value)) return null;
  if (value.status !== 'CURRENT'
    || !nonempty(value.controlId)
    || !nonempty(value.controlVersion)
    || !nonempty(value.resultId)) return null;
  return {
    controlId: value.controlId,
    controlVersion: value.controlVersion,
    resultId: value.resultId,
    status: 'CURRENT',
  };
}

function validPacketArtifact(
  value: unknown,
  createdNotice: CreatedNoticeFactIdentity,
): value is PacketArtifactBinding {
  if (!exactKeys(value, ['artifactId', 'artifactRole', 'sha256', 'byteLength', 'createdNotice'])) return false;
  const candidate = value as unknown as PacketArtifactBinding;
  return nonempty(candidate.artifactId)
    && candidate.artifactRole === 'EXHIBIT_2_NOTICE'
    && typeof candidate.sha256 === 'string'
    && LOWER_HEX_SHA256.test(candidate.sha256)
    && Number.isInteger(candidate.byteLength)
    && candidate.byteLength > 0
    && validCreatedNoticeIdentity(candidate.createdNotice, createdNotice);
}

function validRecipient(value: unknown): value is Ud100Attachment10cRecipient {
  if (!exactKeys(value, ['kind', 'name'])) return false;
  const candidate = value as unknown as Ud100Attachment10cRecipient;
  return RECIPIENT_KINDS.has(candidate.kind) && nonempty(candidate.name);
}

function validProvenance(
  value: unknown,
  serviceEventId: string,
): value is Ud100Attachment10cLifecycleProvenance {
  if (!exactKeys(value, ['sourceId', 'eventId', 'eventType'])) return false;
  const candidate = value as unknown as Ud100Attachment10cLifecycleProvenance;
  return nonempty(candidate.sourceId)
    && nonempty(candidate.eventId)
    && nonempty(candidate.eventType)
    && candidate.eventId === serviceEventId;
}

function validateServiceEvent(
  value: unknown,
  createdNotice: CreatedNoticeFactIdentity,
): string[] {
  if (!isObject(value)) return ['Attachment 10c service-event evidence must be an object.'];
  const hasMailingDate = Object.prototype.hasOwnProperty.call(value, 'mailingDate');
  const keys = hasMailingDate
    ? ['serviceEventId', 'createdNotice', 'serviceDate', 'method', 'outcome', 'mailingDate', 'recipient', 'provenance']
    : ['serviceEventId', 'createdNotice', 'serviceDate', 'method', 'outcome', 'recipient', 'provenance'];
  if (!exactKeys(value, keys)) {
    return ['Attachment 10c service-event evidence contains missing or unauthorized fields.'];
  }

  const candidate = value as unknown as Ud100Attachment10cServiceEventEvidence;
  const reasons: string[] = [];
  if (!nonempty(candidate.serviceEventId)) reasons.push('Attachment 10c service-event ID must be nonempty.');
  if (!validCreatedNoticeIdentity(candidate.createdNotice, createdNotice)) {
    reasons.push('Attachment 10c service-event evidence is stale or does not match the exact current Created Notice.');
  }
  if (!validDate(candidate.serviceDate)) reasons.push('Attachment 10c service date must be a strict valid YYYY-MM-DD date.');
  if (!SERVICE_METHODS.has(candidate.method)) reasons.push('Attachment 10c service method is outside the existing factual service vocabulary.');
  if (!SERVICE_OUTCOMES.has(candidate.outcome)) reasons.push('Attachment 10c service outcome is outside the existing factual outcome vocabulary.');
  if (candidate.outcome === 'FAILED') reasons.push('Failed service events cannot be used in Attachment 10c composition.');
  if (hasMailingDate && !validDate(candidate.mailingDate)) {
    reasons.push('Attachment 10c mailing date must be a strict valid YYYY-MM-DD date when supplied.');
  }
  if (!validRecipient(candidate.recipient)) {
    reasons.push('Attachment 10c recipient evidence must have a supported kind and exact nonempty name.');
  }
  if (!nonempty(candidate.serviceEventId) || !validProvenance(candidate.provenance, candidate.serviceEventId)) {
    reasons.push('Attachment 10c lifecycle provenance is missing, malformed, or not bound to the service-event ID.');
  }
  return reasons;
}

function validateLinkage(value: unknown): string[] {
  if (!exactKeys(value, ['defendantOrdinal', 'defendantName', 'noticeArtifactId', 'serviceEventId'])) {
    return ['Attachment 10c linkage contains missing or unauthorized fields.'];
  }
  const candidate = value as unknown as Ud100Attachment10cLinkageRecord;
  const reasons: string[] = [];
  if (!Number.isInteger(candidate.defendantOrdinal) || candidate.defendantOrdinal < 0) {
    reasons.push('Attachment 10c linkage defendant ordinal must be a nonnegative integer.');
  }
  if (!nonempty(candidate.defendantName)) reasons.push('Attachment 10c linkage defendant name must be nonempty.');
  if (!nonempty(candidate.noticeArtifactId)) reasons.push('Attachment 10c linkage Notice artifact ID must be nonempty.');
  if (!nonempty(candidate.serviceEventId)) reasons.push('Attachment 10c linkage service-event ID must be nonempty.');
  return reasons;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalNotices(artifacts: readonly PacketArtifactBinding[]): PacketArtifactBinding[] {
  return artifacts
    .map(artifact => ({
      artifactId: artifact.artifactId,
      artifactRole: artifact.artifactRole,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      createdNotice: {
        generation: artifact.createdNotice.generation,
        createdAtISO: artifact.createdNotice.createdAtISO,
      },
    }))
    .sort((a, b) => compareStrings(a.artifactId, b.artifactId) || compareStrings(a.sha256, b.sha256));
}

function canonicalServiceEvent(
  event: Ud100Attachment10cServiceEventEvidence,
): Ud100Attachment10cCanonicalServiceEvent {
  return {
    serviceEventId: event.serviceEventId,
    createdNotice: {
      generation: event.createdNotice.generation,
      createdAtISO: event.createdNotice.createdAtISO,
    },
    serviceDate: event.serviceDate,
    method: event.method,
    outcome: 'SUCCESS',
    mailingDate: event.mailingDate ?? null,
    recipient: { kind: event.recipient.kind, name: event.recipient.name },
    provenance: {
      sourceId: event.provenance.sourceId,
      eventId: event.provenance.eventId,
      eventType: event.provenance.eventType,
    },
  };
}

function uniqueSorted(reasons: readonly string[]): string[] {
  return [...new Set(reasons)].sort(compareStrings);
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) w[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(w[index - 15]!, 7) ^ rotateRight(w[index - 15]!, 18) ^ (w[index - 15]! >>> 3);
      const s1 = rotateRight(w[index - 2]!, 17) ^ rotateRight(w[index - 2]!, 19) ^ (w[index - 2]! >>> 10);
      w[index] = (w[index - 16]! + s0 + w[index - 7]! + s1) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + choice + k[index]! + w[index]!) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }
  return Array.from(h).map(value => value.toString(16).padStart(8, '0')).join('');
}

function buildPlanId(payload: Omit<Ud100Attachment10cCompositionPlan, 'planId'>): string {
  return `ud100-attachment10c-plan:sha256:${sha256Hex(JSON.stringify(payload))}`;
}

function blocked(reasons: readonly string[]): Ud100Attachment10cCompositionPlanResult {
  return { status: 'BLOCKED', plan: null, reasons: uniqueSorted(reasons) };
}

export function buildUd100Attachment10cCompositionPlan(
  input: Ud100Attachment10cCompositionPlanInput,
): Ud100Attachment10cCompositionPlanResult {
  const projection = input.projection;
  if (projection.status !== 'READY') {
    return blocked(['Attachment 10c composition requires an exact READY canonical filing-facts projection.']);
  }
  const createdNotice = projection.createdNoticeIdentity;
  if (!validCreatedNoticeIdentity(createdNotice)) {
    return blocked(['Attachment 10c composition requires a valid exact Created Notice identity.']);
  }

  const defendantFact = readCanonicalFilingFact<readonly string[]>(projection, CANONICAL_FILING_FACT_REFS.defendantNames);
  if (!defendantFact || defendantFact.state !== 'KNOWN'
    || !Array.isArray(defendantFact.value)
    || defendantFact.value.length === 0
    || defendantFact.value.some(name => !nonempty(name))) {
    return blocked(['Attachment 10c composition requires the exact nonempty canonical defendant array.']);
  }
  const defendantNames = [...defendantFact.value];
  if (new Set(defendantNames).size !== defendantNames.length) {
    return blocked(['Attachment 10c canonical defendant identities are duplicate or ambiguous.']);
  }

  const noticeFact = readCanonicalFilingFact<NoticePacketState>(projection, CANONICAL_FILING_FACT_REFS.packetNotice);
  if (!noticeFact || noticeFact.state !== 'KNOWN'
    || noticeFact.value.kind !== 'EXHIBIT_2_ATTACHED'
    || currentControlIdentity(noticeFact.provenance.governedControl) === null) {
    return blocked(['Attachment 10c composition requires exact current governed EXHIBIT_2_ATTACHED Notice evidence.']);
  }
  const noticeArtifacts = noticeFact.value.artifacts;
  if (noticeArtifacts.length !== noticeFact.value.requiredNoticeCount
    || noticeArtifacts.some(artifact => !validPacketArtifact(artifact, createdNotice))) {
    return blocked(['Attachment 10c Notice Exhibit evidence is incomplete, stale, malformed, or not bound to the exact Created Notice.']);
  }
  if (new Set(noticeArtifacts.map(artifact => artifact.artifactId)).size !== noticeArtifacts.length
    || new Set(noticeArtifacts.map(artifact => artifact.sha256)).size !== noticeArtifacts.length) {
    return blocked(['Attachment 10c Notice Exhibit identities are duplicate or ambiguous.']);
  }

  const attachmentFact = readCanonicalFilingFact<Attachment10cPacketState>(projection, CANONICAL_FILING_FACT_REFS.packetAttachment10c);
  if (!attachmentFact || attachmentFact.state !== 'KNOWN') {
    return blocked(['Attachment 10c governed applicability is unresolved, malformed, stale, or unsupported.']);
  }
  const applicabilityControl = currentControlIdentity(attachmentFact.provenance.governedControl);
  if (!applicabilityControl) {
    return blocked(['Attachment 10c governed applicability control is not exact and CURRENT.']);
  }

  const serviceEvents = input.serviceEvents ?? [];
  const linkages = input.linkages ?? [];
  if (attachmentFact.value.kind === 'NOT_APPLICABLE') {
    if (serviceEvents.length > 0 || linkages.length > 0) {
      return blocked(['Attachment 10c is governed NOT_APPLICABLE; supplied composition evidence is contradictory.']);
    }
    return { status: 'NOT_APPLICABLE', plan: null, reasons: [] };
  }
  if (attachmentFact.value.kind !== 'REQUIRED_BUT_UNSUPPORTED') {
    return blocked(['Attachment 10c governed applicability is unresolved and cannot be inferred by R2-C.']);
  }
  if (serviceEvents.length === 0 || linkages.length === 0) {
    return {
      status: 'NEEDS_INFORMATION',
      plan: null,
      reasons: ['Attachment 10c requires explicit service-event evidence and explicit defendant-to-Notice-to-service linkage evidence.'],
    };
  }

  const reasons: string[] = [];
  const eventById = new Map<string, Ud100Attachment10cServiceEventEvidence>();
  for (const event of serviceEvents as readonly unknown[]) {
    reasons.push(...validateServiceEvent(event, createdNotice));
    if (!isObject(event) || !nonempty(event.serviceEventId)) continue;
    if (eventById.has(event.serviceEventId)) {
      reasons.push(`Attachment 10c service-event identity ${event.serviceEventId} is duplicated.`);
      continue;
    }
    eventById.set(event.serviceEventId, event as unknown as Ud100Attachment10cServiceEventEvidence);
  }

  const noticeById = new Map(noticeArtifacts.map(artifact => [artifact.artifactId, artifact] as const));
  const validLinks: Ud100Attachment10cLinkageRecord[] = [];
  const linkageTriples = new Set<string>();
  const eventDefendantOrdinal = new Map<string, number>();
  const defendantNoticeEvents = new Map<string, Set<string>>();
  const referencedEvents = new Set<string>();
  const coveredDefendants = new Set<number>();
  const coveredNotices = new Set<string>();

  for (const linkage of linkages as readonly unknown[]) {
    reasons.push(...validateLinkage(linkage));
    if (!isObject(linkage)) continue;
    const candidate = linkage as unknown as Ud100Attachment10cLinkageRecord;
    if (!Number.isInteger(candidate.defendantOrdinal) || candidate.defendantOrdinal < 0
      || !nonempty(candidate.defendantName)
      || !nonempty(candidate.noticeArtifactId)
      || !nonempty(candidate.serviceEventId)) continue;

    const canonicalName = defendantNames[candidate.defendantOrdinal];
    if (canonicalName === undefined || candidate.defendantName !== canonicalName) {
      reasons.push('Attachment 10c linkage defendant ordinal/name does not exactly match the canonical defendant array.');
    }
    if (!noticeById.has(candidate.noticeArtifactId)) {
      reasons.push(`Attachment 10c linkage references unknown Notice artifact ${candidate.noticeArtifactId}.`);
    }
    const event = eventById.get(candidate.serviceEventId);
    if (!event) reasons.push(`Attachment 10c linkage references unknown service event ${candidate.serviceEventId}.`);

    const triple = `${candidate.defendantOrdinal}\u0000${candidate.noticeArtifactId}\u0000${candidate.serviceEventId}`;
    if (linkageTriples.has(triple)) {
      reasons.push('Attachment 10c contains a duplicate defendant-to-Notice-to-service linkage triple.');
    } else {
      linkageTriples.add(triple);
    }

    const priorOrdinal = eventDefendantOrdinal.get(candidate.serviceEventId);
    if (priorOrdinal !== undefined && priorOrdinal !== candidate.defendantOrdinal) {
      reasons.push(`Attachment 10c service event ${candidate.serviceEventId} is linked across different defendant ordinals.`);
    } else if (priorOrdinal === undefined) {
      eventDefendantOrdinal.set(candidate.serviceEventId, candidate.defendantOrdinal);
    }

    const pair = `${candidate.defendantOrdinal}\u0000${candidate.noticeArtifactId}`;
    const pairEvents = defendantNoticeEvents.get(pair) ?? new Set<string>();
    pairEvents.add(candidate.serviceEventId);
    defendantNoticeEvents.set(pair, pairEvents);
    if (pairEvents.size > 1) {
      reasons.push('Attachment 10c has more than one distinct successful service event for the same defendant and Notice pair.');
    }

    if (event?.recipient.kind === 'NAMED_DEFENDANT'
      && canonicalName !== undefined
      && event.recipient.name !== canonicalName) {
      reasons.push('Attachment 10c named-defendant recipient does not exactly match the linked canonical defendant.');
    }

    if (canonicalName !== undefined
      && candidate.defendantName === canonicalName
      && noticeById.has(candidate.noticeArtifactId)
      && event) {
      coveredDefendants.add(candidate.defendantOrdinal);
      coveredNotices.add(candidate.noticeArtifactId);
      referencedEvents.add(candidate.serviceEventId);
      validLinks.push({
        defendantOrdinal: candidate.defendantOrdinal,
        defendantName: canonicalName,
        noticeArtifactId: candidate.noticeArtifactId,
        serviceEventId: candidate.serviceEventId,
      });
    }
  }

  for (let ordinal = 0; ordinal < defendantNames.length; ordinal += 1) {
    if (!coveredDefendants.has(ordinal)) reasons.push(`Attachment 10c does not cover canonical defendant ordinal ${ordinal}.`);
  }
  for (const artifact of noticeArtifacts) {
    if (!coveredNotices.has(artifact.artifactId)) reasons.push(`Attachment 10c does not cover exact Notice artifact ${artifact.artifactId}.`);
  }
  for (const eventId of eventById.keys()) {
    if (!referencedEvents.has(eventId)) reasons.push(`Attachment 10c contains orphan service event ${eventId}.`);
  }
  if (reasons.length > 0) return blocked(reasons);

  const canonicalEvents = [...eventById.values()]
    .map(canonicalServiceEvent)
    .sort((a, b) => compareStrings(a.serviceEventId, b.serviceEventId));
  const canonicalLinks = validLinks.sort((a, b) =>
    a.defendantOrdinal - b.defendantOrdinal
    || compareStrings(a.noticeArtifactId, b.noticeArtifactId)
    || compareStrings(a.serviceEventId, b.serviceEventId));
  const payload: Omit<Ud100Attachment10cCompositionPlan, 'planId'> = {
    schemaVersion: 1,
    planVersion: UD100_ATTACHMENT_10C_PLAN_VERSION,
    createdNotice: { ...createdNotice },
    applicability: 'REQUIRED_BUT_UNSUPPORTED',
    applicabilityControl,
    defendants: defendantNames.map((name, ordinal) => ({ ordinal, name })),
    noticeExhibits: canonicalNotices(noticeArtifacts),
    serviceEvents: canonicalEvents,
    linkages: canonicalLinks,
    pdfGeneration: 'NOT_PERFORMED',
    legalSufficiency: 'NOT_EVALUATED',
    filingAuthority: 'NOT_AUTHORIZED',
  };
  const plan: Ud100Attachment10cCompositionPlan = { ...payload, planId: buildPlanId(payload) };
  return { status: 'PLAN_READY', plan, reasons: [] };
}

export function evaluateUd100Attachment10cReadiness(
  projection: FilingCanonicalFactsProjection,
  evidence: Ud100Attachment10cReadinessEvidenceInput,
): Ud100Attachment10cReadinessEvaluation {
  const planResult = buildUd100Attachment10cCompositionPlan({
    projection,
    serviceEvents: evidence.serviceEvents,
    linkages: evidence.linkages,
  });
  if (planResult.status === 'NOT_APPLICABLE') return { status: 'NOT_APPLICABLE', plan: null, reasons: [] };
  if (planResult.status === 'NEEDS_INFORMATION') {
    return { status: 'NEEDS_INFORMATION', plan: null, reasons: planResult.reasons };
  }
  if (planResult.status === 'BLOCKED') return { status: 'BLOCKED', plan: null, reasons: planResult.reasons };

  const plan = planResult.plan;
  const election = evidence.serviceElection;
  if (!election
    || election.state === 'UNANSWERED'
    || election.state === 'UNKNOWN'
    || election.state === 'REQUIRES_CONFIRMATION') {
    return {
      status: 'NEEDS_INFORMATION',
      plan,
      reasons: ['The owner complaint-side service election is missing or unanswered; factual service events cannot supply that legal election.'],
    };
  }
  if (election.state === 'CONFLICT') {
    return {
      status: 'BLOCKED',
      plan,
      reasons: ['The owner complaint-side service election is conflicting and cannot be inferred from factual service events.'],
    };
  }
  if (election.value !== 'PERSONAL_HAND_DELIVERY') {
    return {
      status: 'BLOCKED',
      plan,
      reasons: ['The current bounded R2-C readiness profile supports only the existing PERSONAL_HAND_DELIVERY owner election.'],
    };
  }

  const consistency = evidence.serviceElectionConsistencyControl;
  if (!consistency
    || consistency.state === 'UNANSWERED'
    || consistency.state === 'UNKNOWN'
    || consistency.state === 'REQUIRES_CONFIRMATION') {
    return {
      status: 'NEEDS_INFORMATION',
      plan,
      reasons: ['The existing service-election consistency control is missing or unresolved.'],
    };
  }
  if (consistency.state === 'CONFLICT') {
    return { status: 'BLOCKED', plan, reasons: ['The existing service-election consistency control is conflicting.'] };
  }
  if (consistency.value !== 'CONSISTENT' || currentControlIdentity(consistency.control) === null) {
    return {
      status: 'BLOCKED',
      plan,
      reasons: ['The existing service-election consistency control is stale, unsupported, malformed, or not CURRENT.'],
    };
  }

  const linksByEvent = new Map<string, Ud100Attachment10cLinkageRecord[]>();
  for (const link of plan.linkages) {
    const rows = linksByEvent.get(link.serviceEventId) ?? [];
    rows.push(link);
    linksByEvent.set(link.serviceEventId, rows);
  }
  for (const event of plan.serviceEvents) {
    if (event.method !== 'personal') {
      return {
        status: 'BLOCKED',
        plan,
        reasons: ['Factual non-personal service may be represented in the plan but cannot satisfy the current PERSONAL_HAND_DELIVERY readiness profile.'],
      };
    }
    if (event.recipient.kind !== 'NAMED_DEFENDANT') {
      return {
        status: 'BLOCKED',
        plan,
        reasons: ['A personal-service election cannot be advanced from an OTHER_PERSON factual recipient.'],
      };
    }
    const linked = linksByEvent.get(event.serviceEventId) ?? [];
    if (linked.length === 0 || linked.some(link => link.defendantName !== event.recipient.name)) {
      return {
        status: 'BLOCKED',
        plan,
        reasons: ['Personal-service recipient evidence is not exactly coherent with the linked canonical defendant.'],
      };
    }
  }

  return { status: 'READY', plan, reasons: [] };
}
