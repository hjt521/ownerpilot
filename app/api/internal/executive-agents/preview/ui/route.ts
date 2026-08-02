/**
 * Authenticated same-origin adapter for the restricted executive-agent
 * Preview UI.
 *
 * The browser never receives or submits the internal route secret, role,
 * model slot, approval reference, administrator identity, authority category,
 * registry entry, or tool posture. Those values are derived server-side and
 * evaluated by the existing fail-closed Preview contracts.
 *
 * This route performs no provider call, model execution, tool execution,
 * persistence, external communication, automatic continuation, or Production
 * action.
 */

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  currentAdmin,
} from '@/lib/admin/isAdmin';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET_ENV,
} from '@/lib/agents/executiveAgentsPreviewRouteContract';

import {
  EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES,
  evaluateExecutiveAgentsPreviewUi,
} from '@/lib/agents/executiveAgentsPreviewUiContract';

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
        EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES
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
    evaluateExecutiveAgentsPreviewUi(
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
