import {
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  REGISTER_SCRIPT,
  ADD_TOKENS_SCRIPT,
  type RateLimitStore,
  type RedisLike,
} from './rateLimitStore';
import { RATE_LIMITS, decideFromCounts } from './rateLimit';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
const T = Date.UTC(2026, 5, 7, 12, 0, 0);
const DAY = 86_400_000;

// A faithful in-process fake of the two Lua ops, matched by script identity. Lets us
// verify the Redis store's cap enforcement AND its atomicity (one eval per op) without
// a live Redis.
class FakeRedis implements RedisLike {
  private z = new Map<string, { score: number; member: string }[]>();
  private s = new Map<string, number>();
  evalCount = 0;
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    this.evalCount += 1;
    if (script === REGISTER_SCRIPT) {
      const [now, win] = [Number(args[0]), Number(args[1])];
      const member = String(args[3]);
      let zset = this.z.get(keys[0]) ?? [];
      zset = zset.filter((e) => e.score > now - win);
      zset.push({ score: now, member });
      this.z.set(keys[0], zset);
      const burst = zset.length;
      const oldest = zset.length ? Math.min(...zset.map((e) => e.score)) : -1;
      const day = (this.s.get(keys[1]) ?? 0) + 1;
      this.s.set(keys[1], day);
      const tok = this.s.get(keys[2]) ?? 0;
      return [burst, String(oldest), day, String(tok)];
    }
    if (script === ADD_TOKENS_SCRIPT) {
      const n = (this.s.get(keys[0]) ?? 0) + Number(args[0]);
      this.s.set(keys[0], n);
      return n;
    }
    throw new Error('unknown script');
  }
}

async function runStoreSuite(label: string, make: () => RateLimitStore) {
  console.log(`\n=== ${label}: burst window ===\n`);
  {
    const store = make();
    let allowed = 0;
    for (let i = 0; i < RATE_LIMITS.burstMax; i++) {
      const c = await store.registerRequest('s1', T + i); // same 60s window
      if (decideFromCounts(c, T + i).allowed) allowed++;
    }
    check(`${label}: first burstMax requests allowed`, allowed === RATE_LIMITS.burstMax);
    const over = await store.registerRequest('s1', T + RATE_LIMITS.burstMax);
    const d = decideFromCounts(over, T + RATE_LIMITS.burstMax);
    check(`${label}: request over burst cap denied`, d.allowed === false && (d as { reason: string }).reason === 'burst');
    const afterWindow = await store.registerRequest('s1', T + RATE_LIMITS.burstWindowMs + 5_000);
    check(`${label}: burst window drains after 60s`, decideFromCounts(afterWindow, T + RATE_LIMITS.burstWindowMs + 5_000).allowed === true);
  }

  console.log(`\n=== ${label}: daily cap (burst-spaced) ===\n`);
  {
    const store = make();
    let allowed = 0;
    // Space requests > burst window apart so only the daily counter accumulates.
    for (let i = 0; i < RATE_LIMITS.dailyMax; i++) {
      const t = T + i * (RATE_LIMITS.burstWindowMs + 1_000);
      if (decideFromCounts(await store.registerRequest('s2', t), t).allowed) allowed++;
    }
    check(`${label}: first dailyMax requests allowed`, allowed === RATE_LIMITS.dailyMax);
    const t = T + RATE_LIMITS.dailyMax * (RATE_LIMITS.burstWindowMs + 1_000);
    const d = decideFromCounts(await store.registerRequest('s2', t), t);
    check(`${label}: request over daily cap denied`, d.allowed === false && (d as { reason: string }).reason === 'daily');
    const next = T + DAY + 1_000;
    check(`${label}: daily counter resets next UTC day`, decideFromCounts(await store.registerRequest('s2', next), next).allowed === true);
  }

  console.log(`\n=== ${label}: monthly token cap ===\n`);
  {
    const store = make();
    const c0 = await store.registerRequest('s3', T);
    check(`${label}: fresh session has 0 month tokens`, c0.monthTokens === 0);
    await store.addTokens('s3', T, RATE_LIMITS.monthlyTokenMax);
    const c1 = await store.registerRequest('s3', T + 70_000);
    const d = decideFromCounts(c1, T + 70_000);
    check(`${label}: at/over token cap denied`, d.allowed === false && (d as { reason: string }).reason === 'monthly');
    // new month → token bucket resets (different month key / lazy reset)
    const nextMonth = Date.UTC(2026, 6, 1, 0, 5, 0);
    const c2 = await store.registerRequest('s3', nextMonth);
    check(`${label}: token bucket resets next UTC month`, c2.monthTokens === 0 && decideFromCounts(c2, nextMonth).allowed === true);
  }

  console.log(`\n=== ${label}: token accumulation ===\n`);
  {
    const store = make();
    await store.addTokens('s4', T, 1000);
    await store.addTokens('s4', T, 500);
    const c = await store.registerRequest('s4', T + 70_000);
    check(`${label}: addTokens accumulates within month`, c.monthTokens === 1500);
    await store.addTokens('s4', T, -50); // negative clamped to 0
    const c2 = await store.registerRequest('s4', T + 140_000);
    check(`${label}: negative token deltas clamped`, c2.monthTokens === 1500);
  }
}

(async () => {
  await runStoreSuite('InMemory', () => new InMemoryRateLimitStore());

  const fake = new FakeRedis();
  await runStoreSuite('Redis', () => new RedisRateLimitStore(fake));

  console.log('\n=== Redis atomicity property ===\n');
  {
    const r = new FakeRedis();
    const store = new RedisRateLimitStore(r);
    const before = r.evalCount;
    await store.registerRequest('a', T);
    check('registerRequest is a single atomic round trip (1 eval, no read-then-write)', r.evalCount - before === 1);
    const b2 = r.evalCount;
    await store.addTokens('a', T, 10);
    check('addTokens is a single atomic round trip (1 eval)', r.evalCount - b2 === 1);
  }

  console.log('\n=== dev/prod parity ===\n');
  {
    const mem = new InMemoryRateLimitStore();
    const red = new RedisRateLimitStore(new FakeRedis());
    let parity = true;
    for (let i = 0; i < 8; i++) {
      const t = T + i * 1000;
      const dm = decideFromCounts(await mem.registerRequest('p', t), t);
      const dr = decideFromCounts(await red.registerRequest('p', t), t);
      if (dm.allowed !== dr.allowed) parity = false;
    }
    check('InMemory and Redis agree decision-for-decision on the same sequence', parity);
  }

  console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}\n`);
  if (failed > 0) process.exit(1);
})();
