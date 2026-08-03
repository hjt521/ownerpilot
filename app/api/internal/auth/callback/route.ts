import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { currentAdmin } from '@/lib/admin/isAdmin'
import {
  currentPreviewAuthBoundary,
  PREVIEW_AUTH_ERROR_PATH,
  PREVIEW_AUTH_SUCCESS_PATH,
} from '@/lib/auth/previewAdminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function boundedRedirect(origin: string, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin), {
    status: 303,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const boundary = currentPreviewAuthBoundary(url.origin)
  if (!boundary.ok) return new NextResponse(null, { status: 404 })

  const code = url.searchParams.get('code')
  if (!code || code.length < 8 || code.length > 2048) {
    return boundedRedirect(boundary.origin, PREVIEW_AUTH_ERROR_PATH)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return boundedRedirect(boundary.origin, PREVIEW_AUTH_ERROR_PATH)
    }

    const admin = await currentAdmin()
    if (!admin.isAdmin) {
      await supabase.auth.signOut()
      return boundedRedirect(boundary.origin, PREVIEW_AUTH_ERROR_PATH)
    }

    return boundedRedirect(boundary.origin, PREVIEW_AUTH_SUCCESS_PATH)
  } catch {
    return boundedRedirect(boundary.origin, PREVIEW_AUTH_ERROR_PATH)
  }
}
