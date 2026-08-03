import 'server-only'

export const PREVIEW_SUPABASE_PROJECT_ID = 'uklahixoviheiydmiejl' as const
export const PRODUCTION_SUPABASE_PROJECT_ID = 'txpetdrfsmqnyooydmas' as const
export const PREVIEW_AUTH_CALLBACK_PATH = '/api/internal/auth/callback' as const
export const PREVIEW_AUTH_SUCCESS_PATH = '/internal/executive-agents/preview' as const
export const PREVIEW_AUTH_ERROR_PATH = '/internal/auth/error' as const

export type PreviewAuthBoundaryInput = {
  vercelEnv: string | undefined
  featureEnabled: string | undefined
  supabaseUrl: string | undefined
  configuredOrigin: string | undefined
  requestOrigin?: string
}

export type PreviewAuthBoundaryResult =
  | {
      ok: true
      origin: string
      callbackUrl: string
      projectId: typeof PREVIEW_SUPABASE_PROJECT_ID
    }
  | {
      ok: false
      reason:
        | 'not_preview'
        | 'feature_disabled'
        | 'missing_configuration'
        | 'invalid_origin'
        | 'origin_mismatch'
        | 'invalid_project_url'
        | 'production_project_rejected'
        | 'preview_project_mismatch'
    }

function projectIdFromSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const match = /^([a-z0-9]+)\.supabase\.co$/.exec(url.hostname)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function normalizedPreviewOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null
    }
    if (!url.hostname.endsWith('.vercel.app')) return null
    return url.origin
  } catch {
    return null
  }
}

export function evaluatePreviewAuthBoundary(
  input: PreviewAuthBoundaryInput,
): PreviewAuthBoundaryResult {
  if (input.vercelEnv !== 'preview') return { ok: false, reason: 'not_preview' }
  if (input.featureEnabled !== 'true') {
    return { ok: false, reason: 'feature_disabled' }
  }
  if (!input.supabaseUrl || !input.configuredOrigin) {
    return { ok: false, reason: 'missing_configuration' }
  }

  const origin = normalizedPreviewOrigin(input.configuredOrigin)
  if (!origin) return { ok: false, reason: 'invalid_origin' }
  if (input.requestOrigin && input.requestOrigin !== origin) {
    return { ok: false, reason: 'origin_mismatch' }
  }

  const projectId = projectIdFromSupabaseUrl(input.supabaseUrl)
  if (!projectId) return { ok: false, reason: 'invalid_project_url' }
  if (projectId === PRODUCTION_SUPABASE_PROJECT_ID) {
    return { ok: false, reason: 'production_project_rejected' }
  }
  if (projectId !== PREVIEW_SUPABASE_PROJECT_ID) {
    return { ok: false, reason: 'preview_project_mismatch' }
  }

  return {
    ok: true,
    origin,
    callbackUrl: `${origin}${PREVIEW_AUTH_CALLBACK_PATH}`,
    projectId: PREVIEW_SUPABASE_PROJECT_ID,
  }
}

export function currentPreviewAuthBoundary(
  requestOrigin?: string,
): PreviewAuthBoundaryResult {
  return evaluatePreviewAuthBoundary({
    vercelEnv: process.env.VERCEL_ENV,
    featureEnabled: process.env.EXECUTIVE_AGENTS_PREVIEW_ENABLED,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    configuredOrigin: process.env.PREVIEW_ADMIN_AUTH_ORIGIN,
    requestOrigin,
  })
}

export function isAllowlistedAdminEmail(
  email: string,
  allowlistValue = process.env.ADMIN_EMAILS,
): boolean {
  const normalized = email.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return new Set(
    (allowlistValue ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ).has(normalized)
}

export function isBoundedEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  )
}
