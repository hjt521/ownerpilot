import {
  strict as assert,
} from 'node:assert';

import type {
  LanguageModel,
} from 'ai';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
} from './caoPreviewRegistry';

import {
  createCaoPreviewGatewayAdapter,
} from './caoPreviewGatewayAdapter';

let passed = 0;
let failed = 0;

function check(
  name: string,
  operation: () => void,
): void {
  try {
    operation();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

function rejects(
  operation: () => unknown,
  expected: string,
): boolean {
  try {
    operation();
    return false;
  } catch (error) {
    return (
      error instanceof Error &&
      error.message.includes(expected)
    );
  }
}

console.log(
  '\nCAO Preview Gateway adapter',
);

check(
  'constructs exactly one pinned primary Gateway model',
  () => {
    const credentials: string[] = [];
    const modelIds: string[] = [];
    const fakeModel = {
      specificationVersion: 'v3',
    } as unknown as LanguageModel;

    const adapter =
      createCaoPreviewGatewayAdapter({
        apiKey: 'synthetic-gateway-key',
        createModelFactory: apiKey => {
          credentials.push(apiKey);

          return modelId => {
            modelIds.push(modelId);
            return fakeModel;
          };
        },
      });

    assert.deepEqual(
      credentials,
      ['synthetic-gateway-key'],
    );
    assert.deepEqual(
      modelIds,
      [CAO_PREVIEW_PRIMARY_MODEL_ID],
    );
    assert.equal(
      adapter.model,
      fakeModel,
    );
    assert.equal(
      adapter.adapterId,
      CAO_PREVIEW_ADAPTER_ID,
    );
    assert.equal(
      adapter.providerId,
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    );
    assert.equal(
      adapter.modelId,
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    );
    assert.equal(
      adapter.pinnedModelVersion,
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    );
    assert.equal(
      adapter.modelSlot,
      'primary',
    );
  },
);

check(
  'retains the complete fail-closed authority posture',
  () => {
    const adapter =
      createCaoPreviewGatewayAdapter({
        apiKey: 'synthetic-gateway-key',
        createModelFactory: () =>
          () => ({
            specificationVersion: 'v3',
          } as unknown as LanguageModel),
      });

    assert.equal(
      adapter.providerCallPerformed,
      false,
    );
    assert.deepEqual(
      adapter.requestedTools,
      [],
    );
    assert.deepEqual(
      adapter.effectiveTools,
      [],
    );
    assert.deepEqual(
      adapter.toolCalls,
      [],
    );
    assert.equal(
      adapter.fallbackAllowed,
      false,
    );
    assert.equal(
      adapter.substitutionAllowed,
      false,
    );
    assert.equal(
      adapter.automaticContinuationAllowed,
      false,
    );
    assert.equal(
      adapter.persistenceAllowed,
      false,
    );
    assert.equal(
      adapter.productionEligible,
      false,
    );
  },
);

for (const [name, credential] of [
  ['empty', ''],
  ['leading whitespace', ' synthetic'],
  ['trailing whitespace', 'synthetic '],
  ['newline', 'synthetic\nkey'],
  ['carriage return', 'synthetic\rkey'],
  ['null byte', 'synthetic\0key'],
  ['oversized', 'x'.repeat(4_097)],
] as const) {
  check(
    `rejects ${name} credentials before model construction`,
    () => {
      let factoryCalls = 0;

      assert.equal(
        rejects(
          () =>
            createCaoPreviewGatewayAdapter({
              apiKey: credential,
              createModelFactory: () => {
                factoryCalls += 1;

                return () => ({
                  specificationVersion: 'v3',
                } as unknown as LanguageModel);
              },
            }),
          'nonempty bounded single-line value',
        ),
        true,
      );
      assert.equal(
        factoryCalls,
        0,
      );
    },
  );
}

check(
  'fails closed when the injected factory does not return a model',
  () => {
    assert.equal(
      rejects(
        () =>
          createCaoPreviewGatewayAdapter({
            apiKey: 'synthetic-gateway-key',
            createModelFactory: () =>
              () =>
                null as unknown as LanguageModel,
          }),
        'model construction failed closed',
      ),
      true,
    );
  },
);

console.log(
  `\n${'-'.repeat(72)}\n` +
  `  ${passed} passed, ${failed} failed\n` +
  `${'-'.repeat(72)}`,
);

if (failed > 0) {
  process.exit(1);
}
