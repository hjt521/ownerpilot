import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  currentPreviewAuthBoundary,
  PREVIEW_AUTH_ERROR_PATH,
} from '@/lib/auth/previewAdminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const boundary = currentPreviewAuthBoundary(url.origin)
  if (!boundary.ok) return new NextResponse(null, { status: 404 })

  const originHeader = request.headers.get('origin')
  if (originHeader !== boundary.origin) {
    return new NextResponse(null, { status: 403 })
  }

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Logout remains bounded and redirects to the internal error surface.
  }

  return NextResponse.redirect(new URL(PREVIEW_AUTH_ERROR_PATH, boundary.origin), {
    status: 303,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  })
}
