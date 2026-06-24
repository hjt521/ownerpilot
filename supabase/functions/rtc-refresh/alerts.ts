/**
 * Console-stub AlertSink (Step 5) — Edge-native, pure transport.
 *
 * Per rtc_refresh_step5_alert_sink_decisions_broker_ruling (decision A): console-log-only
 * stub, mirroring the project-wide posture (scripts/audit_cliff_live.ts emitAlert; the
 * geocode and classifier sinks). Inherits the shared in_app+email transport when that lands;
 * see the Edge Function build-scope ruling §2.2 (project_email_transport_console_stub_gap).
 *
 * The channels: ['in_app','email'] field on the alert payload IS the intent expression; the
 * shared transport will honor it. This sink does NOT act on channels, severity, or shape — it
 * receives the already-built RtcRefreshAlert (severity/channels/title/body/source all decided
 * by the core's buildAlert) and serializes it. Decides nothing, suppresses nothing, adds nothing.
 *
 * The async signature is preserved even though console.error is synchronous, so the
 * shared-transport migration is a one-line change (console.error(...) -> transport.dispatch(alert))
 * with no shape change. The [ALERT rtc_refresh] prefix matches audit_cliff_live.ts byte-for-byte.
 */
import type { AlertSink, RtcRefreshAlert } from './_core/rtcRefreshTypes.ts';

export function createConsoleAlertSink(): AlertSink {
  return {
    async emit(alert: RtcRefreshAlert): Promise<void> {
      console.error('[ALERT rtc_refresh] ' + JSON.stringify(alert));
    },
  };
}
