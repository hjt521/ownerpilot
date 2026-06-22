/**
 * Next.js instrumentation hook — runs once at server bootstrap (register()).
 *
 * Injects the production (Upstash Redis) rate-limit store so H2 limits BIND on
 * serverless. Without injection, getRateLimitStore() falls back to the DEV-ONLY
 * in-memory store, which on serverless means limits do not bind at all. See
 * lib/chat/rateLimitStore.ts and the attorney rate-limit sign-off §2.2 gate.
 *
 * Client: @upstash/redis (Vercel KV / @vercel/kv was deprecated Dec 2024 and
 * migrated to Upstash Redis). The store only needs eval(script, keys, args),
 * which @upstash/redis exposes in the same array form RedisLike requires.
 *
 * Env vars: the Upstash Marketplace integration injects REST credentials, but
 * the names vary — newer installs use KV_REST_API_URL / KV_REST_API_TOKEN,
 * Upstash-native naming is UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 * We accept either and fail loud (warn + no-inject) if neither is present, so a
 * misconfigured deploy is obvious rather than silently unprotected.
 *
 * Runtime note: register() can fire in edge and nodejs runtimes; the Redis store
 * belongs in nodejs, so we gate on NEXT_RUNTIME. (import type is erased, no
 * edge-runtime load.)
 */
import type { RedisLike } from '@/lib/chat/rateLimitStore';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

// Slice 3b (ruling §2.4 req 4): classifier-audit boot self-check, independent of
  // the rate-limit store below. No-op unless CLASSIFIER_AUDIT_LIVE; when live,
  // surfaces a missing hash key / deploy sha once at boot. Never blocks boot.
  const { classifierAuditStartupCheck } = await import('@/lib/chat/classifierAuditSink');
  classifierAuditStartupCheck();

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // eslint-disable-next-line no-console
    console.warn(
      '[rateLimit] Upstash REST credentials not found (looked for KV_REST_API_URL/' +
        'TOKEN and UPSTASH_REDIS_REST_URL/TOKEN). Rate-limit store NOT injected; ' +
        'falling back to DEV-ONLY in-memory store. Provision the Upstash integration ' +
        'and redeploy.'
    );
    return;
  }

  const { Redis } = await import('@upstash/redis');
  const { RedisRateLimitStore, setRateLimitStore } = await import(
    '@/lib/chat/rateLimitStore'
  );

  const client = new Redis({ url, token });
  const adapter: RedisLike = {
    eval: (script, keys, args) => client.eval(script, keys, args),
  };

  setRateLimitStore(new RedisRateLimitStore(adapter));
}
