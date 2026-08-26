import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { GET } from './route'

const source = readFileSync(fileURLToPath(new URL('./route.ts', import.meta.url)), 'utf8')

assert.match(source, /auth\.verifyOtp\s*\(/)
assert.match(source, /token_hash:\s*tokenHash/)
assert.match(source, /type !== 'email'/)
assert.match(source, /import \{ createClient \} from '@\/lib\/supabase\/server'/)
assert.equal(source.includes("searchParams.get('next')"), false)

for (const forbidden of [
  'exchangeCodeForSession',
  '.setSession(',
  'cookieStore.set(',
  'cookies.set(',
  'service_role',
  '.auth.admin',
  'access_token',
  'refresh_token',
]) {
  assert.equal(source.includes(forbidden), false, `forbidden callback binding: ${forbidden}`)
}

const missingMaterial = await GET(new Request('https://www.ownerpilot.ai/auth/callback'))
assert.equal(missingMaterial.status, 400)
assert.deepEqual(await missingMaterial.json(), { authenticated: false })
assert.match(missingMaterial.headers.get('cache-control') ?? '', /no-store/)

const missingTokenHash = await GET(
  new Request('https://www.ownerpilot.ai/auth/callback?type=email'),
)
assert.equal(missingTokenHash.status, 400)
assert.deepEqual(await missingTokenHash.json(), { authenticated: false })
