# Defect A — Day-Count Verification (3-Day Notice Compliance Period)

**Date:** 2026-06-28
**Prepared by:** Engineering (verification requested by broker before authorizing Decision 2)
**Subject:** Broker-test "Defect A" — alleged off-by-one in the 3-day pay-or-quit compliance-period count
**Conclusion:** **No defect. The engine math is correct.** No code change made. Root cause of the report is a day-of-week misread in the test, not an engine error.

---

## 1. The claim

This morning's broker-test report ("Defect A") flagged the day-count as off by one, on the assumption that the service date **2026-06-28 was a Saturday**.

## 2. Method

Ran the production engine `lib/dates/computeCompliancePeriod.ts` directly (no mocks) against the verified California judicial-holiday set `lib/dates/holidays.ts` (`getVerifiedHolidaySetForSpan(2026, 2026)`), with `serviceMethod: 'personal'`. The engine implements: exclude the day of service (CCP § 12); count forward three days that are not Saturday, Sunday, or a judicial holiday (AB 2343; CCP §§ 12a, 135); the third such day is the expiration.

## 3. Day-of-week anchors (the crux)

```
2026-06-27 = Sat
2026-06-28 = Sun          ← the report assumed this was Saturday; it is Sunday
2026-06-29 = Mon
2026-06-30 = Tue
2026-07-03 = Fri  [JUDICIAL HOLIDAY — Independence Day observed, CRC 1.11]
2026-07-04 = Sat
```

The report's premise was wrong: **2026-06-28 is a Sunday**, not a Saturday (2026-06-27 is the Saturday). The perceived off-by-one is entirely explained by that one-day calendar misread.

## 4. Engine trace (actual output)

```
serve 2026-06-28 (Sun) -> counted [2026-06-29 Mon, 2026-06-30 Tue, 2026-07-01 Wed]  expires 2026-07-01 (Wed)
serve 2026-06-29 (Mon) -> counted [2026-06-30 Tue, 2026-07-01 Wed, 2026-07-02 Thu]  expires 2026-07-02 (Thu)
serve 2026-06-30 (Tue) -> counted [2026-07-01 Wed, 2026-07-02 Thu, 2026-07-06 Mon]  expires 2026-07-06 (Mon)
```

## 5. Cross-check against the live wizard

The live broker test served **2026-06-29** and the wizard's Deadline Preview showed: "3-day period begins June 30, 2026 / Pay or vacate by end of July 2, 2026 / Days counted: June 30, July 1, July 2." The engine trace for `serve 2026-06-29` produces **exactly** `[6/30, 7/1, 7/2], expires 7/2`. **Wizard face = engine = correct.**

## 6. Holiday handling confirmed (bonus)

The `serve 2026-06-30` case correctly **skips 2026-07-03** (judicial holiday), then 7/4 (Sat) and 7/5 (Sun), landing the third countable day on **2026-07-06 (Mon)**. AB 2343 weekend/holiday exclusion and CCP § 12a are functioning.

## 7. Disposition

- **No code change.** Changing the engine to match the report's premise would have *introduced* a real off-by-one (a facially-defective deadline on every notice). The engine is statutorily correct as written.
- **AB 2343 day-count trace:** §3–§6 above, reproduced from the live engine.
- Recommend the broker-test checklist note the day-of-week from a calendar (or the wizard's own preview) rather than by hand, to avoid this false-positive class.

— Engineering, 2026-06-28
