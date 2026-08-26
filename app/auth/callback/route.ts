import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const POST_AUTH_DESTINATION = 'https://www.ownerpilot.ai/'
const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const

function failClosed() {
  return NextResponse.json(
    { authenticated: false },
    {
      status: 400,
      headers: PRIVATE_NO_STORE_HEADERS,
    },
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (!tokenHash || type !== 'email') {
    return failClosed()
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      return failClosed()
    }
  } catch {
    return failClosed()
  }

  return NextResponse.redirect(POST_AUTH_DESTINATION, {
    status: 303,
    headers: PRIVATE_NO_STORE_HEADERS,
  })
}
