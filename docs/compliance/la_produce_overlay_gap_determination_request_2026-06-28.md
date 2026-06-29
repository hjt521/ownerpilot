# Determination Request — LA Notice Production Gap (confirmed_la Cannot Produce)

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker / compliance officer ruling)
**Status:** OPEN — prerequisite to Decision 2 "confirmed → produce" and, more broadly, to LA notice production.
**Severity:** High. The resolver now confirms City-of-LA addresses, but the wizard cannot *produce* an LA notice, and the Right-to-Counsel overlay is not wired into the produce path.

---

## 1. What I found

Tracing the produce gate end-to-end for a `confirmed_la` address (e.g. 5537 La Mirada Ave):

1. `detectJurisdiction` routes any "Los Angeles" address to `NEEDS_CONFIRMATION` (by design — never proceed on a string guess).
2. `supersedeNeedsConfirmation` then maps a cached **`confirmed_la`** verdict to a **hard block**:
   - code `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE`
   - message (locked prose): *"This property is in the City of Los Angeles. The Los Angeles overlay isn't available in OwnerPilot yet, so a notice for this address can't be produced here. We'll let you know when LA support is live."*
3. `lib/produce/` (renderNotice / buildNoticeHtml / buildPacketHtml) contains **no** reference to RTC, Right-to-Counsel, `laOverlay`, `isLaProductionUnblocked`, or LAHD. The produce path does not attach the Right-to-Counsel notice or the LAHD filing prompt.

So `confirmed_la` does not produce — it swaps the "couldn't verify" message for an "LA overlay not available yet" hard block — and the produce path has no LA-overlay attachment to fall back on.

## 2. Why I did not "fix" it

Removing the `confirmed_la` block without first wiring the RTC overlay would let the wizard produce an LA notice **without** the Right-to-Counsel attachment + LAHD filing. That is precisely the dangerous non-compliant false-negative the jurisdiction system exists to prevent (`detectJurisdiction` SAFETY DIRECTION). Changing produce-gate behavior for a covered jurisdiction is a compliance disposition, not an engineering call — hence this request.

## 3. Implications

- **Predicate-6 "go-live" enabled detection, not production.** The system can now *confirm* an address is City-of-LA (resolver + parcel-health gate). It cannot yet *produce* a compliant LA notice, because the RTC/LAHD overlay is not built into the produce path. The morning trigger re-test verified the resolver returns `confirmed_la`; it did not (and could not) verify a notice produces.
- **Decision 2's "confirmed → produce" premise can't hold yet.** A broker confirming an address still resolves to `confirmed_la`, which hits the same `NOT_YET_AVAILABLE` block. The broker-confirm path therefore dead-ends at produce until the LA production path exists. (The Decision 2 backend + the rest of its client wiring remain valid; only the final "produce" step is blocked by this gap.)
- The `isLaProductionUnblocked()` predicate gate (all six flags true) is currently consulted by the **resolver invocation** path, not by the **produce/overlay** path.

## 4. The core question

Is the LA notice **production** path — attach the Right-to-Counsel notice + LAHD filing prompt at produce, gated on `confirmed_la` AND `isLaProductionUnblocked()` — (a) **built but not wired** into `lib/produce/`, or (b) a **not-yet-built workstream**?

- If (a): the `confirmed_la → NOT_YET_AVAILABLE` block is stale; the fix is to wire the existing overlay into produce and change the supersession so `confirmed_la` produces **with** the overlay. Still needs your ruling on the disposition + the produce-face requirements.
- If (b): the block is currently correct and protective; LA notice production is a prerequisite workstream that must be specced and built before either the morning produce goal or Decision 2 "confirmed → produce" can work.

## 5. Decisions requested

1. **(a) or (b)** — is the LA produce-overlay built-but-unwired, or not-yet-built?
2. **confirmed_la produce disposition** — once the overlay is wired, confirm that `confirmed_la` + `isLaProductionUnblocked()` should produce **with** the RTC notice + LAHD prompt attached (and remain blocked if the overlay can't attach — fail-closed).
3. **Produce-face requirements** for an LA notice — what must appear / attach (RTC notice form + which languages; LAHD filing prompt copy; any face changes). This is broker/attorney-authored compliance content; engineering builds to it.
4. **Sequencing** — confirm this LA-production workstream outranks finishing the Decision 2 client wiring (whose end state depends on it).

## 6. §0 note

Engineering will not alter the `confirmed_la` produce disposition or the locked `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` message without this ruling. Decision 2 item-1 (the verdict-type extension) is already built and is inert until "confirmed → produce" is enabled.

— Engineering, 2026-06-28
