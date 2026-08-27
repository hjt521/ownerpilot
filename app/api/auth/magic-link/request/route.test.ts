import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { POST } from './route'

const source = readFileSync(fileURLToPath(new URL('./route.ts', import.meta.url)), 'utf8')
const migration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../../supabase/migrations/20260826053000_e23d1r1_auth_compatibility_ceremony_lease.sql',
      import.meta.url,
    ),
  ),
  'utf8',
)
const TEST_DEPENDENCIES_KEY = Symbol.for(
  'ownerpilot.e23d1r1.auth-compatibility-ceremony-test-dependencies',
)
const OWNER_EMAIL = 'e2e-owner@ownerpilot.ai'
const ROUTE_URL = 'https://www.ownerpilot.ai/api/auth/magic-link/request'
const RAW_AUTHORITY = 'a'.repeat(64)
const AUTHORIZATION = `OwnerPilot-Ceremony ${RAW_AUTHORITY}`
const STORED_VERIFIER_HASH = createHash('sha256').update(RAW_AUTHORITY, 'utf8').digest('hex')

;(process.env as Record<string, string | undefined>).NODE_ENV = 'test'

type TestBindings = {
  verifierHash: string
  purpose: string
  ownerUserId: string
  email: string
  environment: string
  routeContext: string
  attemptLimit: number
}

type TestDependencies = {
  runtimeEnvironment: () => string | undefined
  consumeLease: (bindings: TestBindings) => Promise<boolean>
  sendMagicLink: (email: string) => Promise<void>
}

function installDependencies(dependencies: TestDependencies) {
  ;(globalThis as typeof globalThis & { [TEST_DEPENDENCIES_KEY]?: TestDependencies })[
    TEST_DEPENDENCIES_KEY
  ] = dependencies
}

function request(
  body: string = JSON.stringify({ email: OWNER_EMAIL }),
  authorization: string | null = AUTHORIZATION,
  url: string = ROUTE_URL,
  extraHeaders: Record<string, string> = {},
) {
  const headers = new Headers({ 'content-type': 'application/json', ...extraHeaders })
  if (authorization) headers.set('authorization', authorization)
  return new Request(url, { method: 'POST', headers, body })
}

function countingDependencies(options: {
  consume?: (bindings: TestBindings) => Promise<boolean>
  provider?: (email: string) => Promise<void>
  runtime?: string
} = {}) {
  const counters = { consume: 0, provider: 0 }
  const deps: TestDependencies = {
    runtimeEnvironment: () => options.runtime ?? 'production',
    consumeLease: async (bindings) => {
      counters.consume += 1
      return options.consume ? options.consume(bindings) : true
    },
    sendMagicLink: async (email) => {
      counters.provider += 1
      if (options.provider) await options.provider(email)
    },
  }
  installDependencies(deps)
  return counters
}

assert.match(source, /serviceClient\(\)\.rpc\(CONSUME_RPC/)
assert.match(source, /signInWithOtp\s*\(/)
assert.match(source, /shouldCreateUser:\s*false/)
assert.match(source, /const CALLBACK_URL = 'https:\/\/www\.ownerpilot\.ai\/auth\/callback'/)
assert.match(source, /const OWNER_USER_ID = '0981b2d6-9245-4387-9929-f6feb1c07903'/)
assert.match(source, /const OWNER_EMAIL = 'e2e-owner@ownerpilot\.ai'/)
assert.match(source, /const PURPOSE = 'E2\.3D1R1_AUTH_SESSION_COMPATIBILITY'/)
assert.match(source, /const ENVIRONMENT = 'production'/)
assert.match(source, /const ROUTE_CONTEXT = '\/api\/auth\/magic-link\/request'/)
assert.match(source, /process\.env\.VERCEL_ENV/)
assert.match(source, /\[0-9a-fA-F\]\{64\}/)
assert.match(source, /createHash\('sha256'\)/)
assert.match(
  source,
  /await deps\.consumeLease\(bindings\)[\s\S]*if \(!consumed\)[\s\S]*await deps\.sendMagicLink/,
)

for (const forbidden of [
  '.auth.admin',
  '.setSession(',
  'cookieStore.set(',
  'cookies.set(',
  'access_token',
  'refresh_token',
  '.from(',
  '.insert(',
  '.upsert(',
  'randomBytes(',
  'checkpoint',
  'final-persistence',
  'downstream-canary',
  'stage-f',
]) {
  assert.equal(source.includes(forbidden), false, `forbidden auth-initiation binding: ${forbidden}`)
}
assert.equal(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false)
assert.equal(source.includes('serviceClient().auth'), false)

let counters = countingDependencies()
let response = await POST(request('{'))
assert.equal(response.status, 400)
assert.deepEqual(await response.json(), { accepted: false })
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(request(undefined, null))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(
  request(undefined, null, ROUTE_URL, {
    origin: 'https://www.ownerpilot.ai',
    referer: 'https://www.ownerpilot.ai/',
    host: 'www.ownerpilot.ai',
    'sec-fetch-site': 'same-origin',
    'x-ownerpilot-ceremony': RAW_AUTHORITY,
  }),
)
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(request(JSON.stringify({ email: OWNER_EMAIL }), null))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(request(JSON.stringify({ email: 'customer@example.com' })))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(request(undefined, 'OwnerPilot-Ceremony not-64-hex'))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies({ runtime: 'preview' })
response = await POST(request())
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies()
response = await POST(request(undefined, AUTHORIZATION, 'https://www.ownerpilot.ai/api/auth/magic-link/wrong'))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 0, provider: 0 })

counters = countingDependencies({
  consume: async (bindings) => {
    assert.deepEqual(bindings, {
      verifierHash: STORED_VERIFIER_HASH,
      purpose: 'E2.3D1R1_AUTH_SESSION_COMPATIBILITY',
      ownerUserId: '0981b2d6-9245-4387-9929-f6feb1c07903',
      email: OWNER_EMAIL,
      environment: 'production',
      routeContext: '/api/auth/magic-link/request',
      attemptLimit: 1,
    })
    return false
  },
})
response = await POST(request())
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 1, provider: 0 })

counters = countingDependencies({ consume: async () => false })
response = await POST(request())
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 1, provider: 0 })

counters = countingDependencies({ consume: async () => false })
response = await POST(request())
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 1, provider: 0 })

for (const consume of [
  async () => false,
  async () => {
    throw new Error('db unavailable')
  },
  async () => false,
]) {
  counters = countingDependencies({ consume })
  response = await POST(request())
  assert.equal(response.status, 403)
  assert.deepEqual(counters, { consume: 1, provider: 0 })
}

let consumed = false
counters = countingDependencies({
  consume: async () => {
    if (consumed) return false
    consumed = true
    await Promise.resolve()
    return true
  },
})
const concurrentResponses = await Promise.all([POST(request()), POST(request())])
assert.deepEqual(
  concurrentResponses.map((item) => item.status).sort(),
  [202, 403],
)
assert.deepEqual(counters, { consume: 2, provider: 1 })

counters = countingDependencies({
  consume: async (bindings) => bindings.verifierHash === STORED_VERIFIER_HASH,
})
response = await POST(request(undefined, `OwnerPilot-Ceremony ${STORED_VERIFIER_HASH}`))
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 1, provider: 0 })

const order: string[] = []
counters = countingDependencies({
  consume: async () => {
    order.push('consume')
    return true
  },
  provider: async () => {
    order.push('provider')
  },
})
response = await POST(request())
assert.equal(response.status, 202)
assert.deepEqual(order, ['consume', 'provider'])
assert.deepEqual(counters, { consume: 1, provider: 1 })

consumed = false
counters = countingDependencies({
  consume: async () => {
    if (consumed) return false
    consumed = true
    return true
  },
  provider: async () => {
    throw new Error('provider failure')
  },
})
response = await POST(request())
assert.equal(response.status, 502)
response = await POST(request())
assert.equal(response.status, 403)
assert.deepEqual(counters, { consume: 2, provider: 1 })

assert.equal(/\.rpc\(['"](?:issue|mint|create|refresh|reissue|replace)/i.test(source), false)
assert.equal(/serviceClient\(\)\.rpc\(/g.test(source), true)
assert.equal((source.match(/serviceClient\(\)\.rpc\(/g) ?? []).length, 1)
assert.equal((source.match(/signInWithOtp\s*\(/g) ?? []).length, 1)

assert.match(migration, /create table public\.auth_compatibility_ceremony_leases/)
assert.match(migration, /purpose text primary key/)
assert.match(migration, /verifier_hash text not null unique/)
assert.match(migration, /verifier_hash ~ '\^\[0-9a-f\]\{64\}\$'/)
assert.match(migration, /purpose = 'E2\.3D1R1_AUTH_SESSION_COMPATIBILITY'/)
assert.match(migration, /owner_user_id = '0981b2d6-9245-4387-9929-f6feb1c07903'::uuid/)
assert.match(migration, /email = 'e2e-owner@ownerpilot\.ai'/)
assert.match(migration, /environment = 'production'/)
assert.match(migration, /route_context = '\/api\/auth\/magic-link\/request'/)
assert.match(migration, /attempt_limit = 1/)
assert.match(migration, /expires_at <= created_at \+ interval '15 minutes'/)
assert.match(migration, /enable row level security/)
assert.match(
  migration,
  /revoke all on table public\.auth_compatibility_ceremony_leases from public, anon, authenticated/,
)
assert.match(migration, /grant select, insert, update, delete[\s\S]*to service_role/)
assert.match(migration, /create function public\.consume_auth_compatibility_ceremony_lease/)
assert.match(migration, /security invoker/)
assert.match(migration, /set search_path = ''/)
assert.match(migration, /update public\.auth_compatibility_ceremony_leases/)
assert.match(migration, /set consumed_at = now\(\)/)
assert.match(migration, /consumed_at is null/)
assert.match(migration, /expires_at > now\(\)/)
assert.match(migration, /select count\(\*\) = 1 from consumed/)
assert.match(
  migration,
  /revoke all on function public\.consume_auth_compatibility_ceremony_lease\([\s\S]*\) from public, anon, authenticated/,
)
assert.match(
  migration,
  /grant execute on function public\.consume_auth_compatibility_ceremony_lease\([\s\S]*\) to service_role/,
)
assert.equal(/\binsert\s+into\b/i.test(migration), false)
assert.equal(
  /\b(update|insert)\b[\s\S]*verifier_hash\s*=\s*(?:encode|digest|crypt|gen_random)/i.test(migration),
  false,
)
assert.equal((migration.match(/create function/gi) ?? []).length, 1)
assert.equal(/create function public\.(?:issue|mint|create|refresh|reissue|replace)/i.test(migration), false)
