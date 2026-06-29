# Broker determination — Decision 2 carve-out from Phase 2D release

**Date:** 2026-06-29
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Subject:** Decision 2 scope inclusion in Phase 2D production release
**Status:** RULED — Decision 2 carved out; engineering may resume Phase 2D §0.B
**Supersedes:** Tooling-level scope selection of "Phase 2D + Decision 2" made earlier this session (not a verbatim ruling — engineering correctly flagged the conflict)

**Parent rulings:**
- `phase2d_client_wiring_ratification_and_attestation_packet_skeleton_broker_ruling_2026-06-29.md` (Decision 2 pause stands)
- `la_phase2d_production_attestation_2026-06-29.md` (Phase 2D attestation gate)
- `phase2d_section0b_engineering_runbook_2026-06-29.md` (§0.B runbook — Decision 2 absence implied throughout)
- `decision2_owner_facing_ui_slice_broker_signoff_2026-06-28.md` (Decision 2 prior signoff predates the pause)

---

## §0 — Acknowledgment of fork

**[FORK CORRECTLY SURFACED]** Engineering was right to stop. A tooling-level scope selection ("Phase 2D + Decision 2") is not a verbatim ruling, and it does contradict `phase2d_client_wiring_ratification_and_attestation_packet_skeleton_broker_ruling_2026-06-29.md`. This is exactly the §0 RECALIBRATION discipline working as intended — engineering caught a compliance-surfaced expansion of scope before it went live. Good catch.

This ruling supersedes my earlier tooling-level scope selection.

## §1 — Determination on the four questions

### Q1: Supersede the pause? **NO.**

**[DETERMINED]** Decision 2 stays paused. Phase 2D ships alone.

The pause in `phase2d_client_wiring_ratification_and_attestation_packet_skeleton_broker_ruling_2026-06-29.md` stands. It was written for exactly the reason engineering surfaced: Decision 2 carries its own compliance surface (PII intake, 90-day retention promise, attorney-referral copy, SLA cron) that needs its own attestation. The Phase 2D attestation (Tests A–D) does not cover any of that.

### Q2: Attestation posture for Decision 2's surface? **N/A given Q1.**

Since Decision 2 is excluded from this release, sub-options (a)/(b)/(c) don't apply. The path forward for Decision 2 is its own track — see §6 below.

### Q3: PII / retention sign-off? **DEFERRED to Decision 2 attestation.**

The 90-day email-retention promise in `brokerConfirmCopy.ts` is a written representation to the owner that must be operationally true before it ships. The Decision 2 attestation will need to verify:

- A retention-purge mechanism exists and runs (cron, scheduled job, or transactional cleanup)
- The 90-day clock starts at "request resolves" — engineering defines what "resolved" means in code, and that definition must match the locked copy
- Audit log proves a test request gets purged on schedule
- Privacy policy discloses the broker-confirm collection + 90-day retention (separate from GA4 privacy addendum)

None of that is in scope for the Phase 2D attestation. Cannot sign off in this release.

### Q4: CI guard for locked-prose manifest. **CARVE OUT, see §3.**

If Decision 2 source files (`routeToCounselCopy.ts`, `brokerConfirmCopy.ts`) stay in the branch but the locked-prose manifest entries get split, the CI guard fails. Conversely, if Decision 2 manifest entries are removed without removing the source files, no harm — but if the source files ship dormant, engineering should confirm they don't introduce dead-import warnings or unused-export lint failures in production builds.

**[DETERMINED]** Carve Decision 2 cleanly out of the Phase 2D commit — both manifest entries AND source files together. See §3 for mechanics.

## §2 — Why "ship Decision 2 dormant" is rejected

Engineering's non-binding recommendation (2a — ship dormant) is well-reasoned. Addressing why I'm still saying no:

**The "dormant if no main-flow entry point" claim is incomplete.** The endpoints, pages, and migrations being live means:

1. **Direct-URL reachability of `/broker-review/status` and `/route-to-counsel`** — search engines crawl, link previews resolve, anyone who shares a guessed URL can hit the pages and see attorney-referral copy and the fee-splitting disclaimer **before** that copy has been broker-attested as final
2. **`/api/notice/broker-confirm/route` accepting POST with email** — direct-URL or curl-callable. Once the endpoint exists in production, owner emails can land in our database. The 90-day retention promise becomes operationally binding the moment the first email is accepted, regardless of whether the wizard surfaces the path.
3. **SLA cron firing on deploy** — runs against a (likely empty) requests table, but the cron itself is now a production-running scheduled job that needs monitoring. New surface area for ops issues.
4. **Database migrations 023/024/025 are not dormant** — they execute on deploy. Schema changes are forward-only; rolling back Decision 2 later means a forward migration to drop or quiesce those tables, which is operationally more expensive than just not creating them yet.

The pattern "ship dormant backend, surface later" works for purely internal infrastructure (feature flags, internal admin tools, things behind auth). It does not work for **direct-URL-reachable owner-facing surfaces with PII intake.** This crosses both thresholds.

**[CONSIDER]** if Decision 2 reaches a point where its client wiring is complete AND attested, "ship behind feature flag" becomes viable — same pattern as Phase 2D. That's the correct dormancy model. Half-finished + direct-URL-reachable is not.

## §3 — Carve-out mechanics (engineering hygiene)

The current Phase 2D branch has four uncommitted workstreams. Carve them as follows:

### In Phase 2D PR (ships now)
- `lib/rtc/packet/` (PDFs + baseline.json)
- `next.config.ts` (outputFileTracingIncludes)
- Phase 2D server endpoints (`verify-la`, `la-packet`)
- `LaProducePanel` + supersession gate update + render swap
- Audit field additions for `laProduceAudit`
- Locked prose manifest additions for Phase 2D entries ONLY (the 6 entries: 2 jurisdiction overlays + 4 LAHD filing prompt)
- `.gitattributes`
- `rm _hashgen.mts`

### NOT in Phase 2D PR (stays on Decision 2 branch / new branch)
- Migrations `023_broker_confirm_requests.sql`, `024_broker_confirm_sla_cron.sql`, `025_broker_confirm_attestation_lookup.sql`
- `/api/notice/broker-confirm/*` endpoints
- `/broker-review/*` and `/route-to-counsel` pages
- `routeToCounselCopy.ts`, `brokerConfirmCopy.ts`
- ~20 Decision 2 entries in `locked_prose_manifest.json`
- `broker-confirm-sla` Edge function
- `ci:verify-broker-confirm-sla-sync` npm script
- Any other Decision 2-tagged files

### NOT in Phase 2D PR (stays for separate authoring)
- GA4 install (separate track — awaits the privacy-policy addendum)
- Leftover docs (engineering's call where they belong; not blocking)

### Mechanical approach

Engineering's choice between:

1. **Reset and re-stage** — `git reset HEAD`, then selectively `git add` only Phase 2D files per the list above
2. **Stash and apply** — `git stash -u`, branch the stash for Decision 2 / GA4 / docs work, then unstash only Phase 2D items
3. **Multiple branches from current head** — branch off three times (`phase2d`, `decision2`, `ga4-install`), checkout each, remove the files that don't belong, commit, push

Any of these is [RATIFIED] — engineering's call.

### Verification before commit

```bash
git diff --cached --stat | grep -E "(broker-confirm|routeToCounsel|broker-review|migrations/02[345])" && echo "FAIL: Decision 2 files in commit" || echo "PASS: clean Phase 2D scope"
git diff --cached --stat | grep -E "(GoogleAnalytics|gtag|G-83W9QCF4PQ)" && echo "FAIL: GA4 files in commit" || echo "PASS: GA4 not in scope"
```

If either grep returns a match, stop and re-stage.

## §4 — Locked prose manifest CI guard during carve-out

Confirming engineering's Q4 observation: if Decision 2 manifest entries stay in but source files leave, CI fails. The fix is to remove **both** the manifest entries AND the source files from the Phase 2D commit, together.

After carve-out, the Phase 2D commit's `locked_prose_manifest.json` should contain:

- All pre-existing entries that were already in the manifest before this branch
- The 6 Phase 2D additions (NOT_YET_AVAILABLE, ATTACHMENT_FAILED, LAHD header/body/channels/version)
- **Zero** Decision 2 entries

Engineering should run the locked-prose CI guard locally before pushing:

```bash
npm run ci:verify-locked-prose
```

If it passes, the manifest is internally consistent. If it fails, the carve-out isn't clean yet.

## §5 — No forks surfaced beyond the one engineering raised

Reviewed this determination itself for §0 fork triggers:

- No statutory/compliance prose authored silently ✓
- No tenant-defense consequence in the carve-out (Decision 2 path stays unchanged, just shipped separately) ✓
- Locked prose touched only by removal (Decision 2 entries carved out together with source files — no orphans) ✓
- Fail-closed posture preserved ✓
- PII / retention representation NOT made live ✓

## §6 — Updated path to LA go-live + Decision 2 + GA4 tracks

### LA / Phase 2D (resumes now)

1. **Engineering:** carve Decision 2 + GA4 + leftover docs out of Phase 2D commit
2. **Engineering:** verify with the two grep checks in §3
3. **Engineering:** run `ci:verify-locked-prose` locally — must pass
4. **Engineering:** execute §0.B runbook Steps 1–9
5. **Engineering:** sign §0.B, ping broker
6. **Broker:** run Tests A–D
7. **Broker:** §5 sign-off
8. **Engineering:** production flag-flip PR
9. **Broker:** countersign
10. **Production deploy + monitoring**

### Decision 2 (its own track)

1. **Engineering:** complete Decision 2 client wiring (`components/notice-flow.tsx` entry point)
2. **Broker:** author Decision 2 attestation packet (analogous to `la_phase2d_production_attestation_2026-06-29.md`) — covers broker-confirm flow, PII intake, 90-day retention verification, SLA cron behavior, referral copy byte-verification
3. **Broker:** author privacy policy addendum for broker-confirm PII intake (separate from GA4 privacy addendum)
4. **Engineering:** open Decision 2 PR with attestation packet checklist initialized
5. **Broker:** run Decision 2 tests
6. **Broker:** Decision 2 §5 sign-off
7. **Engineering:** Decision 2 production PR
8. **Broker:** countersign
9. **Production deploy + monitoring**

### GA4 (its own track)

1. **Broker:** author GA4 privacy policy addendum (on request)
2. **Engineering:** ship GA4 install per `ga4_install_broker_determination_2026-06-29.md` (carve out of any combined branch)
3. **Broker:** verify tag fires in production per §5 of the install ruling

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-29
