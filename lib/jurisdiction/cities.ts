// lib/jurisdiction/cities.ts
// Multi-city generalization (city-expansion prereq). Per-city config the resolver, supplement catalog, RTC packet,
// holiday overlay, and produce path key off — instead of LA-hardcoded branches. SM v1 settled in omnibus §5.
// NOTE: the resolver INTEGRATION (wiring detectJurisdiction to consume CITY_CONFIG) + the SM produce path are the
// GATED half — they land after Lane 5 merges + the resolver refactor. This file is the SSOT the refactor reads.

export type CityId = 'los_angeles' | 'santa_monica';

export interface CityConfig {
  id: CityId;
  label: string;
  /** Stable key used by the jurisdiction resolver + the broker-confirm address match. */
  resolverKey: string;
  /** Right-to-Counsel packet required at service? (LA yes; SM no in v1 — omnibus §5). */
  hasRtcPacket: boolean;
  /** Service-method statute the notice cites. */
  serviceMethodCitation: string;
  /** Broker-confirm SLA hours (SM reuses the LA SLA — omnibus §5). */
  slaHours: number;
  /** Does produce gate on a city rent-registration status check? (SM yes). */
  rentRegistrationGate: boolean;
  /** Holiday calendar source (SM reuses the LA/statewide judicial-holiday table — omnibus §5). */
  holidaySource: 'ca_judicial';
  /** Locked clause IDs available for this city's notice/termination forms. */
  clauseIds: string[];
}

export const CITY_CONFIG: Record<CityId, CityConfig> = {
  los_angeles: {
    id: 'los_angeles', label: 'City of Los Angeles', resolverKey: 'LA',
    hasRtcPacket: true, serviceMethodCitation: 'CCP § 1162', slaHours: 24,
    rentRegistrationGate: false, holidaySource: 'ca_judicial',
    clauseIds: [], // LA uses the Phase 2D notice rail + the R&D clauses (lib/documents/clauses.ts)
  },
  santa_monica: {
    id: 'santa_monica', label: 'City of Santa Monica', resolverKey: 'SM',
    hasRtcPacket: false,                 // omnibus §5: no SM RTC in v1
    serviceMethodCitation: 'CCP § 1162', // omnibus §5
    slaHours: 24,                        // omnibus §5: SM SLA = LA SLA
    rentRegistrationGate: true,          // omnibus §5: rent-registration gate
    holidaySource: 'ca_judicial',        // omnibus §5: reuse LA holiday calendar
    clauseIds: [
      'CLAUSE_SM_3DAY_PAY_OR_QUIT_OVERLAY_V1',
      'CLAUSE_SM_TERMINATION_JUST_CAUSE_V1',
      'CLAUSE_SM_RENT_CONTROL_STATUS_DISCLOSURE_V1',
    ],
  },
};

export function cityConfig(id: CityId): CityConfig { return CITY_CONFIG[id]; }
export function isSupportedCity(x: string): x is CityId { return x === 'los_angeles' || x === 'santa_monica'; }
