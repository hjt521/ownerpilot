import preparationManifestJson from '../../docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/preparation-runtime-manifest.json';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import type { OfficialSourceHealth, OfficialSourceIdentity } from './officialFormFieldMap';
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
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
  UD100_GENERATOR_CONTRACT_VERSION,
} from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export const UD100_GENERATED_DRAFT_IMPLEMENTATION_ID =
  'ownerpilot-stage-e1-ud100-generated-draft' as const;
export const UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION = '1.0.0' as const;

export const UD100_PREPARATION_RUNTIME_PATH =
  'docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/UD-100.preparation-runtime.pdf' as const;
export const UD100_PREPARATION_RUNTIME_MANIFEST_PATH =
  'docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/preparation-runtime-manifest.json' as const;

export const UD100_PREPARATION_RUNTIME_MANIFEST_ID =
  'preparation-manifest:sha256:dc29458b4962e4233d26f14bd4154a3a0255a22333f7e6b81fa8d8d63a0eb52b' as const;

export const UD100_PREPARATION_RUNTIME_MANIFEST =
  preparationManifestJson as PreparationRuntimeManifest;

const definition: OfficialGeneratedDraftDefinition = {
  generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  expectedSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  expectedPreparationManifestId: UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  expectedMapSnapshotId: UD100_GENERATION_BINDING.mapSnapshotId,
  expectedGeneratorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
  expectedPageCount: 4,
  expectedFieldCount: 186,
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

export function generateUd100GeneratedDraft(
  input: GenerateUd100DraftInput,
): Promise<OfficialFormGeneratedDraftResult> {
  return generateOfficialFormGeneratedDraft({
    definition,
    officialSourceIdentity: input.officialSourceIdentity,
    officialSourceHealth: input.officialSourceHealth,
    officialSourceBytes: input.officialSourceBytes,
    preparationAuthorization: input.preparationAuthorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes: input.preparationDerivativeBytes,
    facts: input.facts,
    preparedAtISO: input.preparedAtISO,
    evaluateBinding: () => evaluateUd100GenerationBinding(
      input.officialSourceIdentity,
      input.officialSourceHealth,
      input.facts,
    ),
  });
}

export function evaluateUd100GeneratedDraftCurrentness(
  draft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): GeneratedDraftCurrentness {
  return evaluateOfficialFormGeneratedDraftCurrentness(draft, {
    definition,
    officialSourceIdentity: input.officialSourceIdentity,
    officialSourceHealth: input.officialSourceHealth,
    officialSourceBytes: input.officialSourceBytes,
    preparationAuthorization: input.preparationAuthorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes: input.preparationDerivativeBytes,
    facts: input.facts,
    draftBytes: input.draftBytes,
    evaluateBinding: () => evaluateUd100GenerationBinding(
      input.officialSourceIdentity,
      input.officialSourceHealth,
      input.facts,
    ),
  });
}
