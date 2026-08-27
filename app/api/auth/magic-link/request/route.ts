import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import { serviceClient } from '@/lib/chat/session'
import { createClient } from '@/lib/supabase/server'

const CALLBACK_URL = 'https://www.ownerpilot.ai/auth/callback'
const OWNER_USER_ID = '0981b2d6-9245-4387-9929-f6feb1c07903'
const OWNER_EMAIL = 'e2e-owner@ownerpilot.ai'
const PURPOSE = 'E2.3D1R1_AUTH_SESSION_COMPATIBILITY'
const ENVIRONMENT = 'production'
const ROUTE_CONTEXT = '/api/auth/magic-link/request'
const ATTEMPT_LIMIT = 1
const CEREMONY_SCHEME = 'OwnerPilot-Ceremony'
const CONSUME_RPC = 'consume_auth_compatibility_ceremony_lease'
const TEST_DEPENDENCIES_KEY = Symbol.for(
  'ownerpilot.e23d1r1.auth-compatibility-ceremony-test-dependencies',
)

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const

type CeremonyBindings = {
  verifierHash: string
  purpose: typeof PURPOSE
  ownerUserId: typeof OWNER_USER_ID
  email: typeof OWNER_EMAIL
  environment: typeof ENVIRONMENT
  routeContext: typeof ROUTE_CONTEXT
  attemptLimit: typeof ATTEMPT_LIMIT
}

type CeremonyDependencies = {
  runtimeEnvironment: () => string | undefined
  consumeLease: (bindings: CeremonyBindings) => Promise<boolean>
  sendMagicLink: (email: typeof OWNER_EMAIL) => Promise<void>
}

function jsonResponse(body: { accepted: boolean }, status: number) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  })
}

function verifierHashFromAuthorization(headerValue: string | null): string | null {
  if (!headerValue) return null

  const match = new RegExp(`^${CEREMONY_SCHEME} ([0-9a-fA-F]{64})$`).exec(headerValue)
  if (!match) return null

  return createHash('sha256').update(match[1], 'utf8').digest('hex')
}

const defaultDependencies: CeremonyDependencies = {
  runtimeEnvironment: () => process.env.VERCEL_ENV,
  consumeLease: async (bindings) => {
    const { data, error } = await serviceClient().rpc(CONSUME_RPC, {
      p_verifier_hash: bindings.verifierHash,
      p_purpose: bindings.purpose,
      p_owner_user_id: bindings.ownerUserId,
      p_email: bindings.email,
      p_environment: bindings.environment,
      p_route_context: bindings.routeContext,
      p_attempt_limit: bindings.attemptLimit,
    })

    return error === null && data === true
  },
  sendMagicLink: async (email) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: CALLBACK_URL,
      },
    })

    if (error) throw error
  },
}

function dependencies(): CeremonyDependencies {
  if (process.env.NODE_ENV === 'test') {
    const injected = (
      globalThis as typeof globalThis & {
        [TEST_DEPENDENCIES_KEY]?: CeremonyDependencies
      }
    )[TEST_DEPENDENCIES_KEY]

    if (injected) return injected
  }

  return defaultDependencies
}

export async function POST(request: Request) {
  let requestUrl: URL
  try {
    requestUrl = new URL(request.url)
  } catch {
    return jsonResponse({ accepted: false }, 400)
  }

  const verifierHash = verifierHashFromAuthorization(request.headers.get('authorization'))
  const deps = dependencies()

  if (
    requestUrl.pathname !== ROUTE_CONTEXT ||
    deps.runtimeEnvironment() !== ENVIRONMENT ||
    !verifierHash
  ) {
    return jsonResponse({ accepted: false }, 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ accepted: false }, 400)
  }

  const emailValue =
    body && typeof body === 'object' && 'email' in body
      ? (body as { email?: unknown }).email
      : undefined

  if (emailValue !== OWNER_EMAIL) {
    return jsonResponse({ accepted: false }, 403)
  }

  const bindings: CeremonyBindings = {
    verifierHash,
    purpose: PURPOSE,
    ownerUserId: OWNER_USER_ID,
    email: OWNER_EMAIL,
    environment: ENVIRONMENT,
    routeContext: ROUTE_CONTEXT,
    attemptLimit: ATTEMPT_LIMIT,
  }

  let consumed = false
  try {
    consumed = await deps.consumeLease(bindings)
  } catch {
    return jsonResponse({ accepted: false }, 403)
  }

  if (!consumed) {
    return jsonResponse({ accepted: false }, 403)
  }

  try {
    await deps.sendMagicLink(OWNER_EMAIL)
  } catch {
    return jsonResponse({ accepted: false }, 502)
  }

  return jsonResponse({ accepted: true }, 202)
}
