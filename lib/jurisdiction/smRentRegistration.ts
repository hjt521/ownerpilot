// lib/jurisdiction/smRentRegistration.ts
// SM v1 rent-registration gate (omnibus §5). SM produce requires the unit's rent-registration status. The actual
// data source (Santa Monica Rent Control Board registry) is an external lookup not yet wired — same posture as the
// LA parcel-health gate: PLUGGABLE + FAIL-CLOSED. Until the live source lands, the gate returns 'unknown' → blocks
// produce (fail-closed) and routes to broker review, never produces on an unverified registration status.

export type RentRegistrationStatus = 'registered' | 'exempt' | 'unknown';

export interface RentRegistrationResult { status: RentRegistrationStatus; canProduce: boolean; }

/** Pluggable lookup. Default impl is fail-closed ('unknown') until the SM RCB data source is wired. */
export type RentRegistrationLookup = (addressNormalized: string) => Promise<RentRegistrationStatus>;

const failClosedLookup: RentRegistrationLookup = async () => 'unknown';

/** Evaluate the SM rent-registration gate. canProduce only when registered/exempt (fail-closed on unknown). */
export async function evaluateRentRegistration(
  addressNormalized: string,
  lookup: RentRegistrationLookup = failClosedLookup,
): Promise<RentRegistrationResult> {
  const status = await lookup(addressNormalized);
  return { status, canProduce: status === 'registered' || status === 'exempt' };
}
