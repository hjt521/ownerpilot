# Workstream A — Fork A-2 (Reconciliation Discipline) Broker Ruling (2026-06-27)

**Author:** Jack Taglyan (broker).
**Date:** 2026-06-27.
**CalDRE / role:** B9445457 — California Licensed Real Estate Broker; sole compliance authority on OwnerPilot AI under Bus. & Prof. Code § 10131(b).
**Scope:** Resolves Fork A-2 of Workstream A (`cityOfLaZipsAuthoritative`, predicate 5 of `LA_PRODUCTION_DEPENDENCIES`).
**Governs:** the diff-surfacing discipline on every refresh of the authoritative LA City GIS ZIP set against the live in-repo set; the cutover-block / auto-apply rules per outcome class; the diff-packet structure.
**Honors:** Fork A-1 ruling (`workstream_a_fork_1_canonical_source_broker_ruling_2026-06-27.md`); kickoff scoping in `la_final_predicates_kickoff_prompt.md` (§"Workstream A"); §0 broker-scope-only posture (`broker_scope_internal_note_2026-06-09.md`); per-hit greenlight discipline from the jurisdiction-rules attribution ruling (`la_jurisdiction_attorney_framing_broker_ruling_response_2026-06-23.md` §5 step 4).

---

## §0 Posture

Broker compliance determination authored under broker-scope authority (Bus. & Prof. Code § 10131(b)). No attorney engagement on this project. This ruling determines the **procedural** discipline for diff reconciliation; it does not author the **substantive** §2.6 determination prose (criteria for what counts as a City-of-LA ZIP) — that is Fork A-3.

A-2 is the surfacing discipline; A-3 is the standard. A diff item makes it to the broker's desk under A-2; the broker rules the item against A-3.

---

## §1 — Ruling

**Hybrid posture, by outcome class:**

| Outcome class | Disposition | Rationale tier |
|---|---|---|
| **(a) ADD** — ZIP in authoritative, not in live in-repo set | **Auto-apply** (first-build posture, see §3) | Layered defense: A-3-attested source + runtime parcel-rail confirmation |
| **(b) REMOVE** — ZIP in live in-repo set, not in authoritative | **Broker-review-required**, cutover blocks | Silent narrowing of tenant protection is unrecoverable harm; review checkpoint required |
| **(c) CORPUS-IMPACT REMOVE** — REMOVE that breaks one or more v6 corpus test cases | **Broker-review-required**, cutover blocks, **build halts and surfaces test impact** | Compounds (b) with attested-test-fact breakage; not silently resolvable |
| **(d) NO-DIFF** — refresh produces no changes against live state | **Auto-attestation, no ruling needed** | No state change to rule on; cleanliness recorded for audit |

**On every refresh, the build emits a diff packet (per §4) regardless of outcome mix. ADDs are applied on packet emission; REMOVEs and corpus-impact REMOVEs block the cutover until broker rules them.**

---

## §2 — Rationale by outcome class

### §2.1 — ADD (auto-apply, first-build)

Direction of change: **expands RTC coverage**. A tenant in the newly-added ZIP becomes covered by the RTC overlay.

Failure mode if the ADD is wrong: OwnerPilot extends RTC overlay to a ZIP where the City of LA has no jurisdiction. This is the false-positive jurisdictional-claim category named in A-1 §2.2 as categorically worse than false-negatives on coverage. **Operationally significant — but materially mitigated by the system's layered defenses, all of which sit downstream of the dataset layer.**

The layered defenses that make ADD auto-apply structurally safe:

1. **The authoritative source is itself broker-attested.** Fork A-3 (next) authors the §2.6 determination prose, which includes the source provenance, currency, refresh cadence, and discrepancy policy. The trust delegated by A-2 to auto-apply ADDs is trust in the **source that A-3 attests** — not unbounded trust in any data the build happens to produce. If A-3 ever rules an authoritative source insufficient, that re-rules A-2 by structural implication; build holds ADDs for review until A-3 re-attests.

2. **Runtime resolution chain confirms at the address level before any notice is generated.** The ZIP set is a fast-path filter, not the final answer (A-1 §2.5). At produceability time, the parcel rails (ZIMAS / County) resolve the address-level municipal jurisdiction directly. An ADDed ZIP that turns out to be wrong gets caught at the parcel layer when the actual address surfaces — the false-positive at the ZIP level does not propagate to a false legal assertion in a generated notice, because ZIMAS overrules the ZIP-set filter at runtime for any address whose parcel resolves outside the City.

3. **ADDs are the operationally common, lowest-impact-per-item category.** ZIP-set refreshes will most commonly produce small numbers of ADDs from routine LA City GIS publication updates (boundary annexations, new ZIPs assigned to City service areas). Making this category broker-review-required would queue routine refreshes behind broker availability for no proportional safety gain — the review checkpoint catches nothing the layered defenses don't already catch, while costing operational responsiveness.

4. **The risk is asymmetric in favor of auto-apply for ADDs specifically.** A held ADD means a tenant in the newly-covered ZIP doesn't get RTC overlay during the review window — false-negative on coverage, the recoverable category. An auto-applied wrong ADD means RTC overlay extends to an out-of-jurisdiction ZIP — false-positive, caught at parcel-rail layer before any user-facing notice. The asymmetry that argued against auto-apply at the dataset layer in the first-pass deliberation **inverts** once the parcel-rail confirmation is taken as given, which it is by Workstream B's operational state.

**This posture is first-build and subject to re-ruling on observed evidence — see §3.**

### §2.2 — REMOVE (broker-review-required, cutover blocks)

Direction of change: **narrows RTC coverage**. A tenant in the removed ZIP loses RTC overlay.

Failure mode if auto-applied: the REMOVE is wrong (authoritative-source publication bug, missing cycle, layer regression). OwnerPilot silently stops asserting RTC for a ZIP where the City of LA actually has jurisdiction. A tenant loses a protection they were entitled to without any review checkpoint to catch it. **Unrecoverable in the produceability layer** — unlike ADDs, the parcel-rail confirmation doesn't catch this case, because the ZIP-set filter has already pre-excluded the address from the RTC path before parcel resolution runs.

This is the structural break in the layered-defense logic that justified ADD auto-apply: the parcel rails confirm the **positive** assertion (this address is in the City), but the ZIP-set filter gates whether the parcel rails are even consulted for RTC purposes. A REMOVEd ZIP exits the RTC path silently at the filter layer; the parcel rails never see it. The review checkpoint is therefore the only place where a wrong REMOVE can be caught.

Failure mode if broker-review-required: the REMOVE is correct, and we delay narrowing coverage for a ZIP that genuinely should have it removed. OwnerPilot continues to assert RTC for an address that isn't actually in the City of LA, until the review concludes. This is the same false-positive category A-1 §2.2 named — but **bounded by review-window time** (broker rules the REMOVE in days, not months) and **symmetric with pre-refresh steady state** (we were already asserting RTC for that ZIP yesterday; one more review window of the same assertion does not worsen the steady state, it just defers the correction).

Bounded-time false-positive (review window) is strictly better than unbounded-time false-negative (silent removal). REMOVEs to broker review.

**Cutover blocks on pending REMOVE review.** The prior in-repo state continues to serve during the review window — no in-flight produceability case loses RTC overlay because of a pending REMOVE; the system continues to treat the ZIP as covered until the broker rules. This is the operational answer to "what if the broker isn't available the day the refresh fires" — production keeps running on the prior attested state.

### §2.3 — CORPUS-IMPACT REMOVE (broker-review-required, cutover blocks, build halts and surfaces test impact)

Sub-case of REMOVE that additionally breaks one or more v6 corpus test cases. Compounds §2.2's harm category with attested-test-fact breakage: the v6 corpus is itself a broker-attested fact set (the 18/18 clean run referenced in the kickoff §"Workstream A"). Silently auto-resolving a test failure by deleting or modifying the test case would un-attest the corpus.

Three possible dispositions when a corpus-impact REMOVE surfaces, all broker-ruled:

1. **Corpus revision.** The test case was wrong in the first place — it asserted RTC for an address that the authoritative source now correctly identifies as outside the City. Update the corpus to match the authoritative source; document the prior corpus-assertion as a known-correction with provenance.
2. **Authoritative supplementation.** The authoritative source is missing a ZIP that the corpus has independent evidence belongs in the City of LA. The corpus stands; the authoritative source is investigated, re-pulled, layer-reconfirmed, or flagged back to LA City GIS as a publication-error report.
3. **Investigation.** Neither (1) nor (2) is obviously right; the case requires direct broker investigation against the runtime tools enumerated in A-3 (§"Tools available to the broker" — forthcoming).

Build's job on a (c) hit: **halt cutover, surface the affected test case(s) verbatim with the ZIP, the authoritative-source attribute set, and a build recommendation** (which of (1)/(2)/(3) build reads as most likely, with rationale). The recommendation is build's read; the ruling is broker's. Build does not auto-resolve.

### §2.4 — NO-DIFF (auto-attestation)

Refresh produces no diffs against the live state. No broker ruling needed; build emits a refresh-clean attestation containing:

- Refresh timestamp (UTC)
- Authoritative source name, source URL, publication date, sha256
- Layer / assignment-rule choice in effect
- Live-state sha256 (unchanged from prior refresh)
- Cycle counter (informational)

Filed to the workspace and referenced by the next predicate-5 attestation packet. Symmetric with the parcel-health cron-slice §"No changes detected" pattern and the statute-watch cron's clean-cycle confirmation.

---

## §3 — First-build posture, re-ruling triggers

The ADD auto-apply disposition (§2.1) is **first-build**, not permanent. The reasoning rests on premises that must be validated by observed behavior before the auto-apply discipline is treated as steady-state. Per the standing optimize-for-observed-not-imagined discipline (cron-slice ruling §"Every 15 min — rejected"), the posture earns its standing through clean observed cycles, and is subject to re-ruling on any of the following triggers:

**Re-ruling triggers (any one of these surfaces an A-2 revision request):**

1. **An auto-applied ADD is later observed to be wrong** at the parcel-rail confirmation layer or at any broker spot-check. Any single instance triggers a re-rule consideration.
2. **The authoritative source produces an ADD diff that is anomalously large** (a single refresh producing significantly more ADDs than recent precedent, where "significantly more" is initially scoped as build's judgment surfaced for broker awareness; specific numeric threshold may be set in A-3 or in a future amendment). Auto-apply is suspended for that diff packet pending broker review of the anomaly.
3. **LA City GIS publishes a sourcing notice** indicating a known publication error, layer regression, or data quality incident affecting boundary-related layers in any window overlapping a refresh cycle. Auto-apply is suspended on the next refresh; broker reviews the diff explicitly.
4. **Fork A-3 ruling explicitly tightens the auto-apply discipline.** The A-3 §2.6 determination supersedes A-2 on any matter where the two conflict; A-2 is procedurally lighter and bows to substantive determination from A-3.
5. **Parcel-rail layer is degraded or offline for a sustained period** such that the layered-defense logic of §2.1 is materially weakened. Auto-apply is suspended until parcel rails return to live status (per Workstream B predicate 6).

**Re-ruling discipline:** any of these triggers produces a broker-issued A-2 amendment ruling that adjusts the posture. The default direction of adjustment is tightening (auto-apply → broker-review-required), not loosening. Tightening is reversible by future re-ruling on additional observed evidence; loosening from a broker-review-required baseline requires positive observed evidence over multiple refreshes.

**Cycle-count baseline for re-confirmation:** after the first **6 clean refresh cycles** with no re-ruling triggers fired, the ADD auto-apply posture is treated as **steady-state-confirmed** rather than first-build. (6 cycles is provisional — depends on A-3's refresh cadence determination. If A-3 sets quarterly cadence, 6 cycles is 18 months; if monthly, 6 months; the steady-state confirmation rides on observed time, not raw cycle count.) Until steady-state confirmation, every refresh's ADD application is itself a probationary observation; build flags any anomaly proactively rather than waiting for explicit threshold breach.

---

## §4 — Diff packet structure (every refresh)

Build emits one diff packet per refresh, regardless of outcome mix. Structure:

**Header (provenance):**
- Refresh timestamp (UTC)
- Authoritative source: name, source URL, publication date, sha256 of source file
- Layer / assignment-rule choice in effect (per Fork A-1a outcome)
- Prior live-state sha256
- Refresh cycle number (informational)

**Section §A — CORPUS-IMPACT REMOVEs (cutover-blocker, at top of packet always):**
For each affected ZIP:
- ZIP, attribute set from authoritative source showing it as outside boundary
- Affected v6 corpus test case(s): test name, asserted RTC-overlay state, line reference
- Build recommendation: (1) corpus revision, (2) authoritative supplementation, (3) investigation, with rationale
- Broker disposition field (blank, for ruling)

**Section §B — REMOVEs (cutover-blocker, broker-review-required):**
For each affected ZIP:
- ZIP, attribute set from authoritative source
- What made it appear in the prior in-repo set (historical commit reference if known, prior data source if known)
- Sample addresses in the ZIP (for sanity-check)
- Broker disposition field (blank, for ruling)

**Section §C — ADDs (auto-applied on emission, surfaced for awareness):**
For each affected ZIP:
- ZIP, attribute set from authoritative source including it
- The LA City GIS polygon's relation to the City Boundary (centroid inside, majority-area inside, etc., per Fork A-1a assignment rule)
- Sample addresses in the ZIP
- Status: **AUTO-APPLIED** (no disposition field; this is for record-keeping, not ruling)

**Section §D — Anomaly flags (build's proactive surfacing per §3 trigger 2):**
- Any build-side judgment that the diff is anomalous (size, pattern, source-side signal)
- If populated, ADDs in this packet are **NOT auto-applied** pending broker review

**Footer:**
- Cutover state: BLOCKED / READY-pending-ADD-apply / READY-with-anomaly-hold
- Next refresh scheduled (per A-3 cadence)
- Build's sha256 of the diff packet itself

**Packet is filed to the workspace at the path Fork A-3 specifies (or a default of `docs/compliance/zip_set_reconciliation/<YYYY-MM-DD>_refresh.md` until A-3 rules).**

Packet structure mirrors the §3.1 / §3.2 / §3.3 sectional pattern of the 2026-06-23 jurisdiction-rules ruling; this is the same per-hit-greenlight discipline applied to the dataset layer.

---

## §5 — Operational continuity during review

The cutover-block-on-pending-review posture from §1 explicitly **does not pause produceability**. Concretely:

- Live in-repo ZIP set continues serving every runtime classification request.
- Pending REMOVEs do not exit the live set until the broker rules them in. Until then, the live set still includes those ZIPs; RTC overlay continues to apply to them at the ZIP layer; parcel-rail confirmation still runs at the address layer for in-City addresses; the produceability path is unbroken.
- Pending corpus-impact REMOVEs additionally block the build's CI gate for any PR that touches the v6 corpus or the authoritative-set integration, but do not block runtime traffic.
- Auto-applied ADDs in the same refresh apply immediately; the broker-review-pending portion of the diff does not gate them, because their auto-apply disposition is itself the ruling.

The operational answer to "what if the broker isn't available the day the refresh fires" is: nothing breaks. Production continues on the prior attested state plus auto-applied ADDs. Broker rules the REMOVE / corpus-impact-REMOVE portion at the next available window. This is the same fail-coherent-during-degradation discipline as the parcel-health gate's stale-status-read-fails-closed posture, applied to the dataset layer.

---

## §6 — What this ruling does NOT address

- **Substantive criteria for whether a specific ZIP belongs in the authoritative set.** That is Fork A-3 (§2.6 determination prose). A-2 surfaces items to the broker; A-3 states the standard the broker applies.
- **Refresh cadence** (how often the authoritative source is re-pulled). Fork A-3.
- **Runtime resolution chain for in-flight produceability cases** (ZIMAS / County / direct LA City GIS parcel / LAHD / reverse-geocode / gate-closed-with-guidance). Fork A-3 enumerates; a future produceability-layer determination authors the user-facing fallback.
- **Tools available to the broker for ruling individual diff items.** Fork A-3 §"Tools available to the broker" enumerates the runtime resolution chain and the broker's investigation toolkit (ZIMAS browser lookup, LA City Council District lookup, LA County Assessor portal, NavigateLA, primary-source City Charter / Bureau of Engineering publications). Named here for tracking; authored in A-3.
- **Workstream A vs. Workstream B sequencing** (gate-opener choice). Separate broker call.

---

## §7 — Action items

- **[BROKER ACTION — DONE]** Author this ruling.
- **[BUILD ACTION — IMMEDIATE]** Acknowledge receipt; commit this file to the workspace; reference it on any A-2 reconciliation surface artifact.
- **[BUILD ACTION — DEFERRED to A-1a return]** Diff-packet emitter design (per §4 structure) rides with the loader build, surfaced for broker review when build's layer-and-assignment-rule reconnaissance returns.
- **[BUILD ACTION — DEFERRED to A-3]** Workspace path for diff packets; refresh cadence; substantive criteria for ruling items.
- **[BUILD ACTION — STANDING]** Surface anomaly flags (§3 trigger 2) proactively on every diff packet; do not wait for broker spot-check.
- **[BROKER ACTION — NEXT]** Fork A-3 ruling (§2.6 determination prose) — the substantive standard A-2 surfacing serves.
- **[BROKER ACTION — RECURRING]** Confirm steady-state ADD auto-apply posture after 6 clean refresh cycles (§3 cycle-count baseline), or earlier if any §3 trigger fires.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27
