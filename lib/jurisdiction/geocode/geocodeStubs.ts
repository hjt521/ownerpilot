/**
 * Non-persistent stub implementations of the geocode collaborators.
 *
 * ⚠️ These are for build + test + dev only. They hold state in memory and are
 * NOT a production manual-review surface. §2.1(4) requires a real persistent
 * surface (Supabase table / admin UI) before go-live; that wiring replaces
 * InMemoryManualReviewQueue. The typed contract (ManualReviewQueue) is the
 * stable interface; only the backing store changes.
 */
import type {
  BillingCapStatus,
  ManualReviewItem,
  ManualReviewQueue,
} from './geocodeTypes';

/** In-memory queue — NON-PERSISTENT. Replace with the Supabase-backed queue. */
export class InMemoryManualReviewQueue implements ManualReviewQueue {
  private items: ManualReviewItem[] = [];
  async enqueue(item: ManualReviewItem): Promise<void> {
    this.items.push(item);
  }
  async list(): Promise<ManualReviewItem[]> {
    return [...this.items];
  }
}

/** Cap status stub. Defaults to NOT exhausted; tests can force either state. */
export class StubBillingCapStatus implements BillingCapStatus {
  constructor(private exhausted = false) {}
  setExhausted(v: boolean): void {
    this.exhausted = v;
  }
  async isExhausted(): Promise<boolean> {
    return this.exhausted;
  }
}
