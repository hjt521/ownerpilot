/**
 * Restricted internal executive-agent Preview preflight route.
 *
 * This thin adapter exposes only the testable contract in
 * lib/agents/executiveAgentsPreviewRouteContract.ts. It performs no provider
 * call, model execution, tool execution, persistence, external communication,
 * automatic continuation, or Production action.
 */

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET_ENV,
  evaluateExecutiveAgentsPreviewRoute,
} from '@/lib/agents/executiveAgentsPreviewRouteContract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(
  req: NextRequest,
): Promise<NextResponse> {
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
    return NextResponse.json(
      {
        ok: false,
        error:
          'payload_too_large',
      },
      {
        status: 413,
        headers:
          RESPONSE_HEADERS,
      },
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
    evaluateExecutiveAgentsPreviewRoute(
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
      },
      {
        authorizationHeader:
          req.headers.get(
            'authorization',
          ),
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
      status: evaluated.status,
      headers:
        RESPONSE_HEADERS,
    },
  );
}
