import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluatePreviewAuthBoundary,
  isAllowlistedAdminEmail,
  isBoundedEmail,
  PREVIEW_SUPABASE_PROJECT_ID,
} from './previewAdminAuth'

const valid = {
  vercelEnv: 'preview',
  featureEnabled: 'true',
  supabaseUrl: `https://${PREVIEW_SUPABASE_PROJECT_ID}.supabase.co`,
  configuredOrigin:
    'https://ownerpilot-git-feat-isolated-preview-admin-auth-jt-s-projects3.vercel.app',
}

test('accepts only the dedicated Preview project and exact Preview origin', () => {
  const result = evaluatePreviewAuthBoundary({
    ...valid,
    requestOrigin: valid.configuredOrigin,
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.projectId, PREVIEW_SUPABASE_PROJECT_ID)
    assert.equal(
      result.callbackUrl,
      `${valid.configuredOrigin}/api/internal/auth/callback`,
    )
  }
})

test('rejects Production and non-Preview environments', () => {
  assert.deepEqual(
    evaluatePreviewAuthBoundary({ ...valid, vercelEnv: 'production' }),
    { ok: false, reason: 'not_preview' },
  )
  assert.deepEqual(
    evaluatePreviewAuthBoundary({
      ...valid,
      supabaseUrl: 'https://txpetdrfsmqnyooydmas.supabase.co',
    }),
    { ok: false, reason: 'production_project_rejected' },
  )
})

test('rejects external, protocol-relative-equivalent, and mismatched origins', () => {
  assert.equal(
    evaluatePreviewAuthBoundary({
      ...valid,
      configuredOrigin: 'https://example.com',
    }).ok,
    false,
  )
  assert.equal(
    evaluatePreviewAuthBoundary({
      ...valid,
      configuredOrigin: '//evil.example',
    }).ok,
    false,
  )
  assert.deepEqual(
    evaluatePreviewAuthBoundary({
      ...valid,
      requestOrigin: 'https://different-preview.vercel.app',
    }),
    { ok: false, reason: 'origin_mismatch' },
  )
})

test('normalizes allowlist matching without provisioning authority', () => {
  assert.equal(
    isAllowlistedAdminEmail(' Founder@OwnerPilot.ai ', 'founder@ownerpilot.ai'),
    true,
  )
  assert.equal(
    isAllowlistedAdminEmail('other@ownerpilot.ai', 'founder@ownerpilot.ai'),
    false,
  )
})

test('bounds email input', () => {
  assert.equal(isBoundedEmail('founder@ownerpilot.ai'), true)
  assert.equal(isBoundedEmail('not-an-email'), false)
  assert.equal(isBoundedEmail('a'.repeat(255) + '@example.com'), false)
})
