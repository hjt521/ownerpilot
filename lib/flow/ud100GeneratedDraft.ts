import preparationManifestJson from '../../docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/preparation-runtime-manifest.json';
import { CANONICAL_FILING_FACT_REFS, type FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import type { OfficialSourceHealth, OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeGenerationMapSnapshotId,
  evaluateOfficialFormGenerationBinding,
  type GenerationFactDependency,
  type GenerationFieldRule,
  type OfficialFormGenerationBindingEvaluation,
  type OfficialFormGenerationBindingSemantics,
} from './officialFormGenerationBinding';
import {
  evaluateOfficialFormGeneratedDraftCurrentness,
  generateOfficialFormGeneratedDraft,
  type FormPreparationAuthorization,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type OfficialFormGeneratedDraftResult,
  type OfficialGeneratedDraftDefinition,
  type PreparationRuntimeManifest,
} from './officialFormGeneratedDraft';
import { UD100_GENERATION_BINDING } from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export const UD100_GENERATED_DRAFT_IMPLEMENTATION_ID =
  'ownerpilot-stage-e1-ud100-generated-draft' as const;
export const UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION = '1.3.0' as const;
export const UD100_GENERATED_DRAFT_ARTIFACT_ROLE = 'OWNER_GENERATED_PREPARATION' as const;
export const UD100_GENERATED_TEXT_APPEARANCE = Object.freeze({
  colorSpace: 'DeviceRGB' as const,
  rgb: [0, 0, 1] as const,
  sizing: 'SHRINK_ONLY' as const,
  maxFontSize: 9,
});

if (UD100_GENERATION_BINDING.artifactRole !== UD100_GENERATED_DRAFT_ARTIFACT_ROLE) {
  throw new Error('Stage E.1 generated-draft artifact role drifted from the governed D.1 binding.');
}

export const UD100_PREPARATION_RUNTIME_PATH =
  'docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/UD-100.preparation-runtime.pdf' as const;
export const UD100_PREPARATION_RUNTIME_MANIFEST_PATH =
  'docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/preparation-runtime-manifest.json' as const;

export const UD100_PREPARATION_RUNTIME_MANIFEST_ID =
  'preparation-manifest:sha256:a542d0a690e92ca6cafdde13e3e74065584819d0d8766e52528147aa7c2779b8' as const;

export const UD100_PREPARATION_RUNTIME_MANIFEST =
  preparationManifestJson as PreparationRuntimeManifest;

export const UD100_PACKET_AWARE_GENERATION_BINDING_MAP_VERSION = '1.4.0' as const;
export const UD100_PACKET_AWARE_GENERATOR_CONTRACT_VERSION = 'ud100-field-write-plan-v4' as const;
export const UD100_PACKET_AWARE_GENERATION_PROFILE_ID = 'ud100-initial-prefiling-owner-preparation-v2' as const;
export const UD100_BOOTSTRAP_V3_COMPATIBILITY_MAP_VERSION = '1.3.0' as const;
export const UD100_BOOTSTRAP_V3_COMPATIBILITY_GENERATOR_CONTRACT_VERSION = 'ud100-field-write-plan-v3' as const;

const CONTROL = 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED' as const;
const ELECTION = 'CUSTOMER_CONFIRMED_LEGAL_ELECTION' as const;
const D = (ref: GenerationFactDependency['ref']): GenerationFactDependency => ({ ref, authorityClass: CONTROL });
const otherReliefDep: GenerationFactDependency = { ref: CANONICAL_FILING_FACT_REFS.otherReliefSelections, authorityClass: ELECTION };
const packetAgreementDep = D(CANONICAL_FILING_FACT_REFS.packetAgreement);
const packetNoticeDep = D(CANONICAL_FILING_FACT_REFS.packetNotice);
const packetProofDep = D(CANONICAL_FILING_FACT_REFS.packetProofOfService);
const packetAttachment10cDep = D(CANONICAL_FILING_FACT_REFS.packetAttachment10c);
const agreementDomain = ['EXHIBIT_1_ATTACHED','NOT_ATTACHED_LANDLORD_LACKS_POSSESSION','NOT_ATTACHED_SOLELY_NONPAYMENT','NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT'] as const;
const agreementWritableDomain = ['EXHIBIT_1_ATTACHED','NOT_ATTACHED_LANDLORD_LACKS_POSSESSION','NOT_ATTACHED_SOLELY_NONPAYMENT'] as const;
const noticeTransformDomain = ['EXHIBIT_2_ATTACHED','REQUIRED_NOTICE_SET_INCOMPLETE','UNRESOLVED'] as const;
const noticeProfileDomain = ['EXHIBIT_2_ATTACHED'] as const;
const proofDomain = ['EXHIBIT_3_ATTACHED','NOT_ATTACHED'] as const;
const selectedArgs = (allowed: readonly string[], selected: readonly string[]) => ({ property: 'kind', allowedValues: allowed.join('|'), selectedValues: selected.join('|') });

const b1AllOptionalReliefFalse = {
  fairRentalValue: false,
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
} as const;
const r2dHeldReliefProperties = new Set([
  'statutoryDamages',
  'relocationDamages',
  'forfeiture',
  'attorneyFees',
  'otherRelief',
  'otherAllegations',
]);

const b1CompatibilityFieldRules: readonly GenerationFieldRule[] = UD100_GENERATION_BINDING.fieldRules.map(rule => {
  if (rule.evidence.objectReference === '604 0 R') {
    return {
      disposition: 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE',
      evidence: rule.evidence,
      dependency: otherReliefDep,
      allowedValues: [false],
      reason: 'Explicit owner nonselection of fair-rental-value relief authorizes no amount write.',
      property: 'fairRentalValue',
    };
  }
  if (rule.evidence.objectReference === '896 0 R') {
    return {
      disposition: 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE',
      evidence: rule.evidence,
      dependency: otherReliefDep,
      allowedValues: [false],
      reason: 'Explicit owner nonselection of fair-rental-value relief authorizes no damages-from date.',
      property: 'fairRentalValue',
    };
  }
  return rule;
});

const b1CompatibilityProfileRequirements = (() => {
  const frozen: OfficialFormGenerationBindingSemantics['profileRequirements'][number][] = [];
  let insertedLegacyReliefRequirement = false;
  for (const requirement of UD100_GENERATION_BINDING.profileRequirements) {
    if (
      requirement.dependency.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections
      && requirement.property
      && r2dHeldReliefProperties.has(requirement.property)
    ) {
      if (!insertedLegacyReliefRequirement) {
        frozen.push({
          dependency: otherReliefDep,
          allowedValues: [b1AllOptionalReliefFalse],
          blockerCode: 'SELECTED_OPTIONAL_RELIEF_REQUIRES_EXACT_AMOUNT_TEXT_PREDICATE_BINDING',
        });
        insertedLegacyReliefRequirement = true;
      }
      continue;
    }
    frozen.push(requirement);
  }
  if (!insertedLegacyReliefRequirement) {
    throw new Error('R2-D compatibility decoupling could not locate the six held-relief profile requirements.');
  }
  return frozen;
})();

const b1CompatibilitySemantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: UD100_GENERATION_BINDING.generationSchemaVersion,
  mapId: UD100_GENERATION_BINDING.mapId,
  mapVersion: UD100_BOOTSTRAP_V3_COMPATIBILITY_MAP_VERSION,
  profileId: UD100_GENERATION_BINDING.profileId,
  generatorContractVersion: UD100_BOOTSTRAP_V3_COMPATIBILITY_GENERATOR_CONTRACT_VERSION,
  sourceIdentity: UD100_GENERATION_BINDING.sourceIdentity,
  artifactRole: UD100_GENERATION_BINDING.artifactRole,
  fieldRules: b1CompatibilityFieldRules,
  profileRequirements: b1CompatibilityProfileRequirements,
  fieldFamilyCoverage: UD100_GENERATION_BINDING.fieldFamilyCoverage,
};

export const UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING = Object.freeze({
  ...b1CompatibilitySemantics,
  mapSnapshotId: computeGenerationMapSnapshotId(b1CompatibilitySemantics),
});

function packetCheckbox(
  original: GenerationFieldRule,
  dependency: GenerationFactDependency,
  allowed: readonly string[],
  selected: readonly string[],
  applicable?: readonly string[],
  reason = 'Governed packet state preserves official blank/no-write.',
): GenerationFieldRule {
  return {
    disposition: 'WRITE',
    evidence: original.evidence,
    writeKind: 'CHECKBOX',
    dependencies: [dependency],
    transform: { id: 'OBJECT_ENUM_CHECKBOX_V1', version: '1', args: selectedArgs(allowed, selected) },
    unresolvedPolicy: 'BLOCK',
    ...(applicable ? {
      condition: {
        dependency,
        property: 'kind',
        allowedValues: applicable,
        whenFalse: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
        reason,
      },
    } : {}),
  };
}

const packetFieldRules: readonly GenerationFieldRule[] = UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.fieldRules.map(rule => {
  switch (rule.evidence.fieldId) {
    case 'UD-100[0].Page2[0].List6[0].SubList6[0].Lie[0].SixE[0]':
      return packetCheckbox(rule, packetAgreementDep, agreementDomain, ['EXHIBIT_1_ATTACHED'], agreementWritableDomain, 'Oral/no-agreement packet state preserves Item 6e official blank.');
    case 'UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SixF[0]':
      return packetCheckbox(rule, packetAgreementDep, agreementDomain, ['NOT_ATTACHED_LANDLORD_LACKS_POSSESSION','NOT_ATTACHED_SOLELY_NONPAYMENT'], agreementWritableDomain, 'Oral/no-agreement packet state preserves Item 6f official blank.');
    case 'UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SubListf[0].Li2[0].SixF124[0]':
      return packetCheckbox(rule, packetAgreementDep, agreementDomain, ['NOT_ATTACHED_SOLELY_NONPAYMENT'], agreementWritableDomain, 'Oral/no-agreement packet state preserves Item 6f solely-nonpayment reason official blank.');
    case 'UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SubListf[0].Li1[0].SixF123[0]':
      return packetCheckbox(rule, packetAgreementDep, agreementDomain, ['NOT_ATTACHED_LANDLORD_LACKS_POSSESSION'], agreementWritableDomain, 'Oral/no-agreement packet state preserves Item 6f possession reason official blank.');
    case 'UD-100[0].Page3[0].List9[0].Item9[0].Lie[0].SevenE[0]':
      return packetCheckbox(rule, packetNoticeDep, noticeTransformDomain, ['EXHIBIT_2_ATTACHED']);
    case 'UD-100[0].Page3[0].List10[0].Item10[0].LI4[0].Eightd[0]':
      return packetCheckbox(rule, packetProofDep, proofDomain, ['EXHIBIT_3_ATTACHED']);
    case 'UD-100[0].Page3[0].List10[0].Item10[0].LI3[0].Eightc[0]':
      return {
        disposition: 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE',
        evidence: rule.evidence,
        dependency: packetAttachment10cDep,
        property: 'kind',
        allowedValues: ['NOT_APPLICABLE'],
        reason: 'Attachment 10c remains unsupported/deferred in B2 and requires exact NOT_APPLICABLE packet state.',
      };
    default:
      return rule;
  }
});

const packetAwareSemantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.generationSchemaVersion,
  mapId: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapId,
  mapVersion: UD100_PACKET_AWARE_GENERATION_BINDING_MAP_VERSION,
  profileId: UD100_PACKET_AWARE_GENERATION_PROFILE_ID,
  generatorContractVersion: UD100_PACKET_AWARE_GENERATOR_CONTRACT_VERSION,
  sourceIdentity: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.sourceIdentity,
  artifactRole: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.artifactRole,
  fieldRules: packetFieldRules,
  profileRequirements: [
    ...UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.profileRequirements,
    { dependency: packetAgreementDep, property: 'kind', allowedValues: agreementDomain, blockerCode: 'PACKET_AGREEMENT_PROFILE_UNRESOLVED' },
    { dependency: packetNoticeDep, property: 'kind', allowedValues: noticeProfileDomain, blockerCode: 'PACKET_NOTICE_PROFILE_UNRESOLVED_OR_INCOMPLETE' },
    { dependency: packetProofDep, property: 'kind', allowedValues: proofDomain, blockerCode: 'PACKET_PROOF_OF_SERVICE_PROFILE_UNRESOLVED' },
    { dependency: packetAttachment10cDep, property: 'kind', allowedValues: ['NOT_APPLICABLE'], blockerCode: 'PACKET_ATTACHMENT_10C_REQUIRED_OR_UNRESOLVED' },
  ],
  fieldFamilyCoverage: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.fieldFamilyCoverage,
};

export const UD100_PACKET_AWARE_GENERATION_BINDING = Object.freeze({
  ...packetAwareSemantics,
  mapSnapshotId: computeGenerationMapSnapshotId(packetAwareSemantics),
});

function agreementVerificationBlock(facts: FilingCanonicalFactsProjection): OfficialFormGenerationBindingEvaluation | null {
  if (facts.status !== 'READY') return null;
  const status = facts.facts[CANONICAL_FILING_FACT_REFS.leaseStatus];
  if (status?.state === 'KNOWN' && !status.provenance.customerVerification) {
    return {status:'BLOCKED',blockReason:'PROVENANCE_AUTHORITY_MISMATCH',detail:'Agreement classification lacks explicit customer-verification provenance.',formApplicability:'NOT_EVALUATED',formRequiredness:'NOT_EVALUATED',documentGeneration:'NOT_PERFORMED',pdfMutation:'NOT_PERFORMED',fieldWritePlan:[]};
  }
  if (status?.state === 'KNOWN' && status.value !== 'NO_AGREEMENT') {
    for (const ref of [CANONICAL_FILING_FACT_REFS.agreementTermDescription,CANONICAL_FILING_FACT_REFS.agreementRentAmount,CANONICAL_FILING_FACT_REFS.agreementRentFrequency,CANONICAL_FILING_FACT_REFS.agreementRentDue,CANONICAL_FILING_FACT_REFS.agreementForm,CANONICAL_FILING_FACT_REFS.agreementParty] as const) {
      const fact = facts.facts[ref];
      if (fact?.state === 'KNOWN' && !fact.provenance.customerVerification) {
        return {status:'BLOCKED',blockReason:'PROVENANCE_AUTHORITY_MISMATCH',detail:`${ref} lacks explicit customer-verification provenance.`,formApplicability:'NOT_EVALUATED',formRequiredness:'NOT_EVALUATED',documentGeneration:'NOT_PERFORMED',pdfMutation:'NOT_PERFORMED',fieldWritePlan:[]};
      }
    }
  }
  return null;
}

export function evaluateUd100BootstrapV3CompatibilityBinding(
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
): OfficialFormGenerationBindingEvaluation {
  const block = agreementVerificationBlock(facts);
  if (block) return block;
  return evaluateOfficialFormGenerationBinding(
    UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING,
    suppliedSourceIdentity,
    suppliedSourceHealth,
    facts,
    UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  );
}

export function evaluateUd100PacketAwareGenerationBinding(
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
): OfficialFormGenerationBindingEvaluation {
  const block = agreementVerificationBlock(facts);
  if (block) return block;
  return evaluateOfficialFormGenerationBinding(
    UD100_PACKET_AWARE_GENERATION_BINDING,
    suppliedSourceIdentity,
    suppliedSourceHealth,
    facts,
    UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  );
}

const legacyDefinition: OfficialGeneratedDraftDefinition = {
  generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  expectedSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  expectedArtifactRole: UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  expectedPreparationManifestId: UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  expectedMapSnapshotId: UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapSnapshotId,
  expectedGeneratorContractVersion: UD100_BOOTSTRAP_V3_COMPATIBILITY_GENERATOR_CONTRACT_VERSION,
  expectedPageCount: 4,
  expectedFieldCount: 186,
  generatedTextAppearance: UD100_GENERATED_TEXT_APPEARANCE,
};

const packetAwareDefinition: OfficialGeneratedDraftDefinition = {
  ...legacyDefinition,
  expectedMapSnapshotId: UD100_PACKET_AWARE_GENERATION_BINDING.mapSnapshotId,
  expectedGeneratorContractVersion: UD100_PACKET_AWARE_GENERATOR_CONTRACT_VERSION,
};

export interface GenerateUd100DraftInput {
  officialSourceIdentity: OfficialSourceIdentity;
  officialSourceHealth: OfficialSourceHealth | null | undefined;
  officialSourceBytes: Uint8Array;
  preparationAuthorization: FormPreparationAuthorization | null | undefined;
  preparationDerivativeBytes: Uint8Array;
  facts: FilingCanonicalFactsProjection;
  preparedAtISO: string;
}

export interface EvaluateUd100DraftCurrentnessInput
  extends Omit<GenerateUd100DraftInput, 'preparedAtISO'> {
  draftBytes: Uint8Array;
}

function generateWith(
  selectedDefinition: OfficialGeneratedDraftDefinition,
  evaluateBinding: () => OfficialFormGenerationBindingEvaluation,
  input: GenerateUd100DraftInput,
): Promise<OfficialFormGeneratedDraftResult> {
  return generateOfficialFormGeneratedDraft({
    definition: selectedDefinition,
    officialSourceIdentity: input.officialSourceIdentity,
    officialSourceHealth: input.officialSourceHealth,
    officialSourceBytes: input.officialSourceBytes,
    preparationAuthorization: input.preparationAuthorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes: input.preparationDerivativeBytes,
    facts: input.facts,
    preparedAtISO: input.preparedAtISO,
    evaluateBinding,
  });
}

function currentnessWith(
  selectedDefinition: OfficialGeneratedDraftDefinition,
  evaluateBinding: () => OfficialFormGenerationBindingEvaluation,
  draft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): GeneratedDraftCurrentness {
  return evaluateOfficialFormGeneratedDraftCurrentness(draft, {
    definition: selectedDefinition,
    officialSourceIdentity: input.officialSourceIdentity,
    officialSourceHealth: input.officialSourceHealth,
    officialSourceBytes: input.officialSourceBytes,
    preparationAuthorization: input.preparationAuthorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes: input.preparationDerivativeBytes,
    facts: input.facts,
    draftBytes: input.draftBytes,
    evaluateBinding,
  });
}

// Historical/default and bootstrap-v3-compatible APIs remain frozen to B1.
// Existing B2 packet-aware generation remains frozen to its released B1-derived semantics.
export function generateUd100GeneratedDraft(
  input: GenerateUd100DraftInput,
): Promise<OfficialFormGeneratedDraftResult> {
  return generateWith(legacyDefinition, () => evaluateUd100BootstrapV3CompatibilityBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), input);
}

export function evaluateUd100GeneratedDraftCurrentness(
  draft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): GeneratedDraftCurrentness {
  return currentnessWith(legacyDefinition, () => evaluateUd100BootstrapV3CompatibilityBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), draft, input);
}

export function generateUd100PacketAwareGeneratedDraft(
  input: GenerateUd100DraftInput,
): Promise<OfficialFormGeneratedDraftResult> {
  return generateWith(packetAwareDefinition, () => evaluateUd100PacketAwareGenerationBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), input);
}

export function evaluateUd100PacketAwareGeneratedDraftCurrentness(
  draft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): GeneratedDraftCurrentness {
  return currentnessWith(packetAwareDefinition, () => evaluateUd100PacketAwareGenerationBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), draft, input);
}

export function generateUd100BootstrapV3CompatibleDraft(
  input: GenerateUd100DraftInput,
): Promise<OfficialFormGeneratedDraftResult> {
  return generateWith(legacyDefinition, () => evaluateUd100BootstrapV3CompatibilityBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), input);
}

export function evaluateUd100BootstrapV3CompatibleDraftCurrentness(
  draft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): GeneratedDraftCurrentness {
  return currentnessWith(legacyDefinition, () => evaluateUd100BootstrapV3CompatibilityBinding(
    input.officialSourceIdentity,
    input.officialSourceHealth,
    input.facts,
  ), draft, input);
}
