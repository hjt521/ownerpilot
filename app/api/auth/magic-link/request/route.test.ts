import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { POST } from './route'

const source = readFileSync(fileURLToPath(new URL('./route.ts', import.meta.url)), 'utf8')

assert.match(source, /signInWithOtp\s*\(/)
assert.match(source, /shouldCreateUser:\s*false/)
assert.match(source, /const CALLBACK_URL = 'https:\/\/www\.ownerpilot\.ai\/auth\/callback'/)
assert.match(source, /emailRedirectTo:\s*CALLBACK_URL/)

for (const forbidden of [
  'service_role',
  '.auth.admin',
  '.setSession(',
  'cookieStore.set(',
  '.from(',
  'checkpoint',
  'final-persistence',
]) {
  assert.equal(source.includes(forbidden), false, `forbidden auth-initiation binding: ${forbidden}`)
}

const malformed = await POST(
  new Request('https://www.ownerpilot.ai/api/auth/magic-link/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  }),
)
assert.equal(malformed.status, 400)
assert.deepEqual(await malformed.json(), { accepted: false })
assert.match(malformed.headers.get('cache-control') ?? '', /no-store/)

const missingEmail = await POST(
  new Request('https://www.ownerpilot.ai/api/auth/magic-link/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }),
)
assert.equal(missingEmail.status, 400)
assert.deepEqual(await missingEmail.json(), { accepted: false })
