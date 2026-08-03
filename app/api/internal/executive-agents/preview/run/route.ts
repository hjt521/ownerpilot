/**
 * Restricted administrator-only CAO Preview execution route.
 *
 * The route is ineffective outside exact Vercel Preview with the explicit
 * feature flag enabled. It returns only a validated draft or a sanitized
 * bounded failure and performs no persistence, tools, fallback, substitution,
 * continuation, orchestration, background work, or Production action.
 */

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  currentAdmin,
} from '@/lib/admin/isAdmin';

import {
  CAO_PREVIEW_GATEWAY_SECRET_ENV,
  CAO_PREVIEW_INPUT_PRICING_ENV,
  CAO_PREVIEW_OUTPUT_PRICING_ENV,
  executeCaoPreviewLiveRun,
} from '@/lib/agents/caoPreviewLiveRun';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET_ENV,
} from '@/lib/agents/executiveAgentsPreviewRouteContract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RESPONSE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  'Content-Type':
    'application/json; charset=utf-8',
  'Referrer-Policy':
    'no-referrer',
  'X-Content-Type-Options':
    'nosniff',
} as const;

function json(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        RESPONSE_HEADERS,
    },
  );
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse> {
  if (
    process.env.VERCEL_ENV !==
      'preview' ||
    process.env
      .EXECUTIVE_AGENTS_PREVIEW_ENABLED !==
      'true'
  ) {
    return json(
      {
        ok: false,
        error: 'not_found',
      },
      404,
    );
  }

  const {
    isAdmin,
    email,
  } = await currentAdmin();

  if (
    !isAdmin ||
    !email
  ) {
    return json(
      {
        ok: false,
        error: 'not_found',
      },
      404,
    );
  }

  const contentLength =
    req.headers.get(
      'content-length',
    );

  if (
    contentLength !== null &&
    (
      !/^\d+$/.test(
        contentLength,
      ) ||
      Number(contentLength) >
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES
    )
  ) {
    return json(
      {
        ok: false,
        error:
          'payload_too_large',
      },
      413,
    );
  }

  let rawBody: string;

  try {
    rawBody =
      await req.text();
  } catch {
    rawBody = '';
  }

  const evaluated =
    await executeCaoPreviewLiveRun(
      {
        deploymentEnvironment:
          process.env.VERCEL_ENV,
        previewEnabledValue:
          process.env
            .EXECUTIVE_AGENTS_PREVIEW_ENABLED,
        routeSecret:
          process.env[
            EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET_ENV
          ],
        sourceCommitSha:
          process.env
            .VERCEL_GIT_COMMIT_SHA,
        nowIso:
          new Date().toISOString(),
        authenticatedAdmin:
          isAdmin,
        authenticatedHumanIdentifier:
          email,
        gatewayApiKey:
          process.env[
            CAO_PREVIEW_GATEWAY_SECRET_ENV
          ],
        inputMicrosPerMillionTokens:
          process.env[
            CAO_PREVIEW_INPUT_PRICING_ENV
          ],
        outputMicrosPerMillionTokens:
          process.env[
            CAO_PREVIEW_OUTPUT_PRICING_ENV
          ],
      },
      {
        contentType:
          req.headers.get(
            'content-type',
          ),
        rawBody,
      },
    );

  return NextResponse.json(
    evaluated.body,
    {
      status:
        evaluated.status,
      headers:
        RESPONSE_HEADERS,
    },
  );
}
