import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('./route.ts', import.meta.url)), 'utf8')

assert.match(source, /auth\.getUser\s*\(\s*\)/)
assert.match(
  source,
  /type SessionProof = \{\s*authenticated: boolean\s*userId: string \| null\s*aud: string \| null\s*\}/s,
)
assert.match(source, /userId:\s*user\.id/)
assert.match(source, /aud:\s*typeof user\.aud === 'string' \? user\.aud : null/)
assert.match(source, /Cache-Control': 'private, no-store, max-age=0'/)

for (const forbidden of [
  'getSession(',
  'access_token',
  'refresh_token',
  'token_hash',
  'authorization code',
  'session id',
  '.from(',
  'checkpoint',
  'final-persistence',
  'service_role',
  '.auth.admin',
]) {
  assert.equal(source.includes(forbidden), false, `forbidden session-proof binding: ${forbidden}`)
}

assert.equal(/\bemail\s*:/.test(source), false)
