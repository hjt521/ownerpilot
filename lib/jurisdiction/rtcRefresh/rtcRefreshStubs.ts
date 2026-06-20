/**
 * Non-persistent stub implementations for step (e).
 *
 * ⚠️ Build/test/dev only. In-memory; NOT a production store. §7 item 4 ratified
 * the typed interface + stub pattern; real Supabase wiring replaces these. The
 * typed contracts (RefreshStateStore, AlertSink) are the stable interfaces.
 */
import type { RtcLanguage } from '../laRtcRules';
import type {
  AlertSink,
  LanguagePin,
  LanguageRefreshState,
  RefreshRunResult,
  RefreshStateStore,
  RtcRefreshAlert,
} from './rtcRefreshTypes';

/** In-memory state store — NON-PERSISTENT. Replace with Supabase-backed store. */
export class InMemoryRefreshStateStore implements RefreshStateStore {
  private languageState = new Map<RtcLanguage, LanguageRefreshState>();
  private pins = new Map<string, LanguagePin>();
  public runs: RefreshRunResult[] = [];

  async getLanguageState(language: RtcLanguage): Promise<LanguageRefreshState> {
    return this.languageState.get(language) ?? { status: 'unblocked' };
  }
  async setLanguageState(language: RtcLanguage, state: LanguageRefreshState): Promise<void> {
    this.languageState.set(language, state);
  }
  async getPin(language: RtcLanguage, noticeId: string): Promise<LanguagePin | null> {
    const pin = this.pins.get(`${noticeId}:${language}`);
    return pin ?? null;
  }
  async setPin(noticeId: string, pin: LanguagePin): Promise<void> {
    this.pins.set(`${noticeId}:${pin.language}`, pin);
  }
  async recordRunResult(result: RefreshRunResult): Promise<void> {
    this.runs.push(result);
  }
}

/** Records emitted alerts in memory so tests can assert the Q5 taxonomy. */
export class RecordingAlertSink implements AlertSink {
  public emitted: RtcRefreshAlert[] = [];
  async emit(alert: RtcRefreshAlert): Promise<void> {
    this.emitted.push(alert);
  }
}
