import { readFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import {
  E2_2_AUTHORITY_BOUNDARY,
  evaluateUd100FilingSupport,
  prepareUd100Filing,
  reviewUd100Filing,
  type FilingChoiceConfirmation,
  type Ud100PhaseASupportAnswers,
  type Ud100PhaseBCompletionInput,
  type Ud100PreparationContext,
} from '@/lib/flow/ud100FilingPreparation';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import type { GeneratedDraftEvidence } from '@/lib/flow/officialFormGeneratedDraft';
import type { RenderedGeneratedDocumentAcknowledgment } from '@/lib/flow/officialFormOwnerReview';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from '@/lib/flow/ud100FieldMapFoundation';
import { UD100_PREPARATION_RUNTIME_PATH } from '@/lib/flow/ud100GeneratedDraft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BrowserContextPayload {
  data?: NoticeFlowData | null;
  phaseA?: Ud100PhaseASupportAnswers;
  phaseB?: Ud100PhaseBCompletionInput;
}

interface SupportBody {
  action: 'support';
  context?: BrowserContextPayload;
}

interface PrepareBody {
  action: 'prepare';
  context?: BrowserContextPayload;
  filingChoiceConfirmation?: FilingChoiceConfirmation;
  preparedAtISO?: string;
}

interface ReviewBody {
  action: 'review';
  context?: BrowserContextPayload;
  generatedDraft?: GeneratedDraftEvidence;
  generatedBytesBase64?: string;
  renderedAcknowledgment?: RenderedGeneratedDocumentAcknowledgment;
  ownerConfirmedExactRenderedDocument?: boolean;
  reviewedAtISO?: string;
}

type RequestBody = SupportBody | PrepareBody | ReviewBody;

function noStore<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

function browserContext(payload: BrowserContextPayload | undefined): Ud100PreparationContext {
  // Deliberately do not deserialize authoritative governed-control evidence from
  // the browser. Those controls must come from separately governed server-side
  // producers/adapters. Until they exist, the pure orchestration fails closed.
  return {
    data: payload?.data ?? null,
    phaseA: payload?.phaseA ?? {},
    phaseB: payload?.phaseB,
  };
}

function exactIsoNow(): string {
  return new Date().toISOString();
}

function decodeBase64(value: string | undefined): Uint8Array | null {
  if (!value || value.trim() === '') return null;
  try {
    return new Uint8Array(Buffer.from(value, 'base64'));
  } catch {
    return null;
  }
}

async function generationRuntime() {
  const [officialSourceBytes, preparationDerivativeBytes] = await Promise.all([
    readFile(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath),
    readFile(UD100_PREPARATION_RUNTIME_PATH),
  ]);
  return {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT' as const,
    officialSourceBytes: new Uint8Array(officialSourceBytes),
    preparationDerivativeBytes: new Uint8Array(preparationDerivativeBytes),
  };
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return noStore({ status: 'BLOCKED', detail: 'Invalid filing-preparation request.' }, 400);
  }

  if (!body || typeof body !== 'object' || !('action' in body)) {
    return noStore({ status: 'BLOCKED', detail: 'Missing filing-preparation action.' }, 400);
  }

  if (body.action === 'support') {
    return noStore({
      ...evaluateUd100FilingSupport(browserContext(body.context)),
      authority: E2_2_AUTHORITY_BOUNDARY,
    });
  }

  if (body.action === 'prepare') {
    let runtimeInputs: Awaited<ReturnType<typeof generationRuntime>>;
    try {
      runtimeInputs = await generationRuntime();
    } catch {
      return noStore({
        status: 'BLOCKED',
        ownerState: 'Cannot continue',
        detail: 'The exact controlled UD-100 preparation source is unavailable.',
        authority: E2_2_AUTHORITY_BOUNDARY,
      }, 503);
    }

    const result = await prepareUd100Filing({
      context: browserContext(body.context),
      filingChoiceConfirmation: body.filingChoiceConfirmation,
      preparedAtISO: body.preparedAtISO ?? exactIsoNow(),
      runtime: runtimeInputs,
    });
    if (result.status !== 'GENERATED_DRAFT') {
      return noStore({ ...result, authority: E2_2_AUTHORITY_BOUNDARY });
    }
    return noStore({
      status: result.status,
      ownerState: result.ownerState,
      detail: result.detail,
      generatedDraft: result.generation.evidence,
      generatedBytesBase64: Buffer.from(result.generation.bytes).toString('base64'),
      generatedPdfSha256: result.generation.evidence.generatedPdfSha256,
      generatedByteLength: result.generation.evidence.generatedByteLength,
      ownerReview: result.generation.ownerReview,
      signing: result.generation.signing,
      filing: result.generation.filing,
      authority: E2_2_AUTHORITY_BOUNDARY,
    });
  }

  if (body.action === 'review') {
    const generatedBytes = decodeBase64(body.generatedBytesBase64);
    if (!generatedBytes || !body.generatedDraft || !body.renderedAcknowledgment) {
      return noStore({
        status: 'BLOCKED',
        ownerState: 'Cannot continue',
        detail: 'Exact generated bytes, generated identity, and render acknowledgment are required for owner review.',
        authority: E2_2_AUTHORITY_BOUNDARY,
      }, 400);
    }

    let runtimeInputs: Awaited<ReturnType<typeof generationRuntime>>;
    try {
      runtimeInputs = await generationRuntime();
    } catch {
      return noStore({
        status: 'BLOCKED',
        ownerState: 'Cannot continue',
        detail: 'The exact controlled UD-100 preparation source is unavailable.',
        authority: E2_2_AUTHORITY_BOUNDARY,
      }, 503);
    }

    const result = reviewUd100Filing({
      ...browserContext(body.context),
      ...runtimeInputs,
      generatedDraft: body.generatedDraft,
      generatedBytes,
      renderedAcknowledgment: body.renderedAcknowledgment,
      ownerConfirmedExactRenderedDocument: body.ownerConfirmedExactRenderedDocument === true,
      reviewedAtISO: body.reviewedAtISO ?? exactIsoNow(),
    });
    return noStore({ ...result, authority: E2_2_AUTHORITY_BOUNDARY });
  }

  return noStore({ status: 'BLOCKED', detail: 'Unsupported filing-preparation action.' }, 400);
}
