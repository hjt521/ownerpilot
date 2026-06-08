/**
 * Next.js instrumentation hook — runs once at server bootstrap (register()).
 *
 * Injects the production (Vercel KV) rate-limit store so H2 limits BIND on
 * serverless. Without this, getRateLimitStore() falls back to the DEV-ONLY
 * in-memory store (counters not shared across instances / reset on cold start),
 * which on serverless means limits do not bind at all. See lib/chat/rateLimitStore.ts
 * and the attorney rate-limit sign-off §2.2 gate.
 *
 * Prereqs (Jack / Vercel, see handoff §6B):
 *   - Vercel KV provisioned (sets KV_REST_API_URL / KV_REST_API_TOKEN env vars).
 *   - Redeploy after the env vars exist.
 *
 * Runtime note: register() can fire in both the edge and nodejs runtimes. The KV
 * store + @vercel/kv belong in the nodejs runtime, so we gate on NEXT_RUNTIME.
 * (import type is erased at compile time, so it adds no edge-runtime load.)
 */
import type { RedisLike } from '@/lib/chat/rateLimitStore';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { kv } = await import('@vercel/kv');
  const { RedisRateLimitStore, setRateLimitStore } = await import(
    '@/lib/chat/rateLimitStore'
  );

  // kv (VercelKV) is Upstash-backed and exposes eval(script, keys, args), which
  // structurally satisfies RedisLike. We wrap it in a thin adapter rather than
  // passing kv directly: the adapter always typechecks as long as kv.eval exists,
  // independent of @upstash/redis's generic signature for eval in the installed
  // version. If the assignability probe in the handoff notes confirms that
  // `const _p: RedisLike = kv` compiles, you may simplify to
  // `new RedisRateLimitStore(kv)` and drop the adapter.
  const adapter: RedisLike = {
    eval: (script, keys, args) => kv.eval(script, keys, args),
  };

  setRateLimitStore(new RedisRateLimitStore(adapter));
}
