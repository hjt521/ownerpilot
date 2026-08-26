import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const

type SessionProof = {
  authenticated: boolean
  userId: string | null
  aud: string | null
}

function proofResponse(proof: SessionProof) {
  return NextResponse.json(proof, {
    headers: PRIVATE_NO_STORE_HEADERS,
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return proofResponse({ authenticated: false, userId: null, aud: null })
    }

    return proofResponse({
      authenticated: true,
      userId: user.id,
      aud: typeof user.aud === 'string' ? user.aud : null,
    })
  } catch {
    return proofResponse({ authenticated: false, userId: null, aud: null })
  }
}
