/**
 * Server-only Vercel AI Gateway adapter for the restricted CAO Preview path.
 *
 * This module constructs exactly one pinned primary model from one explicitly
 * supplied credential. It performs no environment lookup, provider call,
 * persistence, tool execution, fallback, substitution, automatic continuation,
 * Preview activation, external communication, or Production action.
 */

import {
  createGateway,
  type LanguageModel,
} from 'ai';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
} from './caoPreviewRegistry';

export const CAO_PREVIEW_GATEWAY_ADAPTER_VERSION =
  'cao-preview-gateway-adapter-v1' as const;

const MAXIMUM_CREDENTIAL_LENGTH = 4_096;

export type CaoPreviewGatewayFactory = (
  apiKey: string,
) => (
  modelId: string,
) => LanguageModel;

export interface CaoPreviewGatewayAdapterOptions {
  apiKey: string;
  createModelFactory?: CaoPreviewGatewayFactory;
}

export interface CaoPreviewGatewayAdapter {
  adapterVersion:
    typeof CAO_PREVIEW_GATEWAY_ADAPTER_VERSION;
  adapterId:
    typeof CAO_PREVIEW_ADAPTER_ID;
  providerId:
    typeof CAO_PREVIEW_PRIMARY_PROVIDER_ID;
  modelId:
    typeof CAO_PREVIEW_PRIMARY_MODEL_ID;
  pinnedModelVersion:
    typeof CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION;
  modelSlot: 'primary';
  model: LanguageModel;
  providerCallPerformed: false;
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  fallbackAllowed: false;
  substitutionAllowed: false;
  automaticContinuationAllowed: false;
  persistenceAllowed: false;
  productionEligible: false;
}

function requireCredential(
  value: string,
): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAXIMUM_CREDENTIAL_LENGTH ||
    value.trim() !== value ||
    /[\r\n\0]/.test(value)
  ) {
    throw new Error(
      'CAO Preview Gateway credential must be a nonempty bounded single-line value.',
    );
  }

  return value;
}

function defaultCreateModelFactory(
  apiKey: string,
): (
  modelId: string,
) => LanguageModel {
  const gateway = createGateway({
    apiKey,
  });

  return modelId =>
    gateway(modelId);
}

export function createCaoPreviewGatewayAdapter(
  options: CaoPreviewGatewayAdapterOptions,
): CaoPreviewGatewayAdapter {
  const apiKey = requireCredential(
    options.apiKey,
  );

  const createModelFactory =
    options.createModelFactory ??
    defaultCreateModelFactory;

  const modelFactory =
    createModelFactory(apiKey);

  const model =
    modelFactory(
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    );

  if (
    typeof model !== 'object' ||
    model === null
  ) {
    throw new Error(
      'CAO Preview Gateway model construction failed closed.',
    );
  }

  return {
    adapterVersion:
      CAO_PREVIEW_GATEWAY_ADAPTER_VERSION,
    adapterId:
      CAO_PREVIEW_ADAPTER_ID,
    providerId:
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    modelSlot: 'primary',
    model,
    providerCallPerformed: false,
    requestedTools: [],
    effectiveTools: [],
    toolCalls: [],
    fallbackAllowed: false,
    substitutionAllowed: false,
    automaticContinuationAllowed: false,
    persistenceAllowed: false,
    productionEligible: false,
  };
}
