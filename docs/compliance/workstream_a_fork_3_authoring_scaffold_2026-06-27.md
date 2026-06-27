# Workstream A — Fork A-3 Authoring Scaffold (2026-06-27)

**Status:** Build-authored structural scaffold. **NOT a ruling.** No compliance prose authored herein. This document exists to give the broker a clean section-list, broker-vs-build split, and identified candidate authoritative sources for each downstream A-3 ruling component, so the §2.6 determination prose can be authored without re-deriving the architecture.

**Author of scaffold:** Build (Claude), under §0 discipline (build identifies candidates, broker rules canonicality).
**Authoring target:** Broker — to be authored at `workstream_a_fork_3_authoritative_determination_broker_ruling_<date>.md` when the determination is committed.
**Governs:** the structural shape of A-3, not its content.
**Honors:** Fork A-1 ruling (`workstream_a_fork_1_canonical_source_broker_ruling_2026-06-27.md`); Fork A-2 ruling (`workstream_a_fork_2_reconciliation_discipline_broker_ruling_2026-06-27.md`); kickoff scoping in `la_final_predicates_kickoff_prompt.md` (§"Workstream A"); §0 broker-scope-only posture (`broker_scope_internal_note_2026-06-09.md`).

**Constraints A-3 must respect:**
- A-1 ruled: LA City GIS is sole canonical, USPS rejected, parcel rails own border cases.
- A-2 ruled: ADDs auto-apply (first-build), REMOVEs / corpus-impact REMOVEs broker-review-required, NO-DIFF auto-attests; A-3 supersedes A-2 on conflict (per A-2 §3 trigger 4).
- §0: broker authors all statutory/compliance prose; build flags forks, never decides silently.

---

## §0 — Posture (build-templated, broker-confirmable)

Standard broker-scope §0 footer. Same shape as A-1 §0 and A-2 §0. Build can template; broker confirms.

**Split:** Build-templated. No compliance content; reuse A-1/A-2 §0 verbatim with the scope statement updated to "substantive §2.6 determination."

---

## §1 — Ruling summary (broker-authored, after §§2–7 land)

One-paragraph statement of the §2.6 determination. The "topline" — what *authoritative* means for this predicate in one paragraph. Best authored last, once §§2–7 have been worked through.

**Split:** **Broker-authored.** Build provides no draft; the topline is the most load-bearing single piece of compliance prose in Workstream A.

---

## §2 — Source provenance

The substantive definition of which dataset, from which publisher, accessed how, treated as canonical.

### §2.1 — Publisher identity

Which institutional publisher is the canonical source. Per A-1 ruling, this is the City of LA GIS function — but the City has multiple GIS-publishing arms (Bureau of Engineering, City Planning, ITA / Geographic Information Systems Division). Determination identifies which arm is canonical.

**Build groundwork (candidates identified, broker chooses among them):**

- **City of LA GeoHub** ([geohub.lacity.org](https://geohub.lacity.org/)) — the City's official open-data GIS portal, run by ITA. Publishes municipal boundary, ZIP, council district, parcel layers. Most directly relevant landing point; most likely the canonical-publisher answer.
- **Bureau of Engineering NavigateLA** ([navigatela.lacity.org](https://navigatela.lacity.org/)) — BoE's map portal; same data, different access surface, BoE-curated.
- **City Planning ZIMAS** ([zimas.lacity.org](https://zimas.lacity.org/)) — already a Workstream B probe target; City Planning's parcel-and-zoning system, not the ZIP-set publisher but uses the same underlying boundary data.

**Split:** **Broker rules** which publisher is canonical. **Build's recommendation:** GeoHub, on grounds that it is the City's designated open-data publication channel and the layers there are sourced upstream from the same authoritative boundary the other portals consume.

### §2.2 — Dataset identity within the publisher

Once the publisher is set, the specific dataset / layer name and stable identifier (GeoHub item ID, layer slug, FeatureServer endpoint URL). This is what A-1a's reconnaissance returns and what build wires the loader against.

**Build groundwork:** A-1a reconnaissance is the actionable next step. Build identifies candidate layers (City Boundary, ZIP polygons, derived ZIP-in-City sets if pre-published) and surfaces them with metadata (record count, last-published date, attribute schema, sample features).

**Split:** **Broker rules** the layer choice after build's A-1a surfacing. Per A-1 §3, broker rules on the assignment rule too (centroid, majority-area, any-intersection) if no pre-published ZIP-in-City set exists.

### §2.3 — Access method

How the dataset is consumed. Two architectures, broker chooses:

- **Snapshot-and-commit:** dataset downloaded once per refresh cycle, sha256-pinned, committed (or sha-manifested per `_core/` gitignore-vs-guard ruling §2.1), build consumes the local snapshot. Reproducible, auditable, immune to source-downtime mid-run.
- **Live-fetch:** dataset queried directly from publisher's FeatureServer at refresh time, no local snapshot. Always-current, but couples refresh cycles to source availability.

**Build groundwork:** snapshot-and-commit is the canonical pattern in this project (per `_core/` ruling, per rtc-refresh, per parcel-health). Live-fetch is unprecedented for compliance-bearing data here.

**Split:** **Broker rules.** **Build's recommendation:** snapshot-and-commit, sha256-pinned. Aligns with established discipline; immunizes refresh runs from source-side flakiness; produces an auditable artifact in workspace per refresh.

### §2.4 — Sourcing-rail mechanics

The handoff pattern from publisher to repo. Per kickoff §"Workstream A" build groundwork: externally-sourced data not authored by JT rides the sha256-verified file-handoff rail (manual download → shasum verify → cp into repo → wc -c).

**Split:** **Build-authored mechanics, broker confirms.** Standard pattern, low compliance variability.

### §2.5 — Authentication / API discipline

Whether the source requires auth. GeoHub open layers do not; FeatureServer endpoints may have rate limits that affect access pattern but no credential requirement.

**Split:** **Build-authored.** Compliance-trivial unless authentication-bearing endpoints become canonical (not anticipated).

---

## §3 — Currency

How recent the authoritative snapshot must be to be considered current; what happens when it ages.

### §3.1 — Currency window definition

The maximum age of the authoritative snapshot before it stops being usable. Parallel to parcel-health's §3 freshness window (30 min) — but at vastly different timescales because ZIP-set publication cadence is months/years, not seconds.

**Candidate windows broker may consider:**

- 6 months
- 12 months
- 18 months
- Tied to publisher publication cycle (e.g., "current snapshot must be the most recent published version, regardless of age")

**Build groundwork:** GeoHub publication cadence for the LA boundary / ZIP layers is empirically irregular — annexations are rare events, publications happen when changes occur, with quiet years between. A fixed-time window may produce false-stale flags during legitimately-stable periods.

**Split:** **Broker rules.** **Build's framing:** a "most-recent-published-version-from-canonical-publisher" rule is more honest than a fixed-time window, given the empirical cadence. But fixed-time has audit-trail advantages (a snapshot stale by N months is unambiguous). Broker chooses.

### §3.2 — Stale-snapshot disposition

What happens when the snapshot exceeds the currency window. Three postures, broker chooses:

- **Fail-closed:** predicate 5 evaluates false; RTC overlay disabled until refresh.
- **Fail-soft with alert:** predicate 5 evaluates true; alert fires to broker; refresh prioritized but service continues.
- **Hybrid by elapsed-stale-time:** alert at threshold N1, fail-closed at threshold N2.

**Build groundwork:** parcel-health's §3 stale-status posture is fail-closed (the gate read fails closed in that case). Consistent posture across predicates is defensible but not required.

**Split:** **Broker rules.** **Build's framing:** fail-closed has precedent (parcel-health) and is structurally honest (stale data is not authoritative data), but ZIP-set staleness is qualitatively different from parcel-endpoint staleness — a stale ZIP set is "the City has not changed its boundary in N months," which is operationally normal, whereas a stale parcel-health probe is "we don't know if endpoints are alive." The categories may justify different postures.

### §3.3 — Initial snapshot baseline

How the first authoritative snapshot is treated; whether it has a probationary period analogous to A-2's 6-cycle steady-state confirmation. Build-flag for broker awareness; broker may rule it inline in §3 or punt to a §3a amendment.

**Split:** **Broker rules.**

---

## §4 — Refresh cadence

How often the authoritative source is re-pulled and diffed against the live state. Sets the cycle-clock for A-2's 6-clean-cycles steady-state confirmation and for §3.1's currency window.

### §4.1 — Cadence choice

**Candidates:**

- **Quarterly** (4×/year). Light operational load; 6 cycles = 18 months to A-2 steady-state.
- **Semi-annually** (2×/year, e.g., Jan 1 + Jul 1). Matches statute-watch cron's cadence; 6 cycles = 3 years.
- **Monthly.** 6 cycles = 6 months; faster A-2 confirmation; more refresh artifacts.
- **Event-triggered.** Refresh fires when GeoHub publishes a new version of the canonical layer, detected by build's periodic check of publication metadata. Cycle-count semantics change (cycles become irregular).
- **Hybrid:** baseline cadence + event-triggered overlay.

**Build groundwork:** GeoHub publication is empirically irregular. A fixed cadence will most often produce NO-DIFF refreshes; an event-triggered cadence produces a diff packet on every refresh by construction. Hybrid is the technically richest option (catches both routine drift and unexpected republications) but adds build complexity.

**Split:** **Broker rules.** **Build's framing:** parcel-health is 30 min, statute-watch is semi-annually — there's no precedent for monthly or event-triggered cadences in this project. Quarterly is a reasonable middle. Event-triggered is the most operationally honest but the most engineering work. Tradeoff is broker's call.

### §4.2 — Cadence justification (axes)

Parallel to the parcel-health cron-slice ruling's three-axis reasoning (freshness coherence, attestation runway, load/politeness). For ZIP-set refresh:

- **Axis 1 — currency-window coherence:** cadence must be ≤ currency window (§3.1) for the same `cadence ≤ window` invariant reasoning.
- **Axis 2 — A-2 steady-state runway:** cadence determines time-to-confirm ADD auto-apply (A-2 §3 cycle baseline).
- **Axis 3 — load on publisher / engineering overhead:** GeoHub is fine under any of the candidates; engineering overhead is dominated by ruling-overhead, not technical overhead.

**Split:** **Broker authors the axis reasoning** (parallel to cron-slice ruling §§Axes 1–3). Build provides the cadence-runway math (cycles × cadence = elapsed time) on request.

### §4.3 — Cadence change discipline

How the cadence is changed later (mirrors cron-slice ruling §"Idempotent-update pattern"). Build-authored mechanics.

**Split:** **Build-authored, broker confirms.**

---

## §5 — Discrepancy policy

What happens when the authoritative source disagrees with itself or with reality.

### §5.1 — Intra-source discrepancy

Two layers from the same publisher disagree (e.g., a ZIP appears in one GeoHub item but not another). Broker rules which layer prevails; build wires the precedence.

**Build groundwork:** A-1a reconnaissance will surface whether intra-source discrepancies exist among GeoHub layers. If only one canonical layer exists, §5.1 is short.

**Split:** **Broker rules** precedence. Build surfaces.

### §5.2 — Cross-source corroboration (optional)

Whether secondary signals (LA County Assessor situs-city, LAHD jurisdictional lookup) are consulted for sanity-check, even though they are not canonical per A-1.

**Build groundwork:** A-1 ruled USPS out, but did not rule on whether non-USPS secondary sources are useful for diff sanity-checking. Open question for broker.

**Split:** **Broker rules** whether to consult; if yes, broker rules the consultation discipline (sanity-check only / broker-review trigger / etc.).

### §5.3 — Publisher-acknowledged-error response

What happens if LA City GIS publishes a notice of publication error or known data quality incident (per A-2 §3 trigger 3). Build-authored mechanics; broker confirms the response posture.

**Split:** **Build-authored mechanics, broker confirms posture.**

### §5.4 — Disagreement with broker direct lookup

If broker investigates a diff item using the runtime resolution chain (§6) and the result disagrees with the authoritative snapshot, broker direct-lookup prevails — but the discipline for memorializing the override (commit-with-rationale, exception list, etc.) is broker-ruled.

**Split:** **Broker rules** the override discipline. Build wires.

---

## §6 — Runtime resolution chain

The ordered chain of authoritative sources consulted at produceability time for City-of-LA jurisdiction at the address level, plus the broker's investigation toolkit.

### §6.1 — Chain definition (ordered)

**Build groundwork — candidate ordering, broker rules:**

1. **ZIP-set fast path** (this predicate, A-1-canonical LA City GIS ZIP set). Unambiguous in-City or unambiguous out-of-City → terminate, no further lookup.
2. **ZIMAS parcel lookup** ([zimas.lacity.org](https://zimas.lacity.org/)). Returns parcel's municipal jurisdiction directly. Workstream B probe target; rails already built; health-checked.
3. **LA County Assessor parcel lookup** ([assessor.lacounty.gov](https://assessor.lacounty.gov/)). Situs-city field; County records system. Workstream B probe target; rails already built; health-checked.
4. **LA City GIS direct parcel-layer lookup** (GeoHub parcel-level layer, not currently in parcel-health rails). Same publisher as authoritative ZIP set, different access surface. Build groundwork: addable as a third probe target if broker rules it canonical at runtime; would extend Workstream B's rails.
5. **LAHD jurisdictional lookup** ([housing.lacity.org](https://housing.lacity.org/) — LAHD's RSO / property-jurisdiction portal). RSO jurisdiction tracks RTC jurisdiction; informative but not direct. Public web UI; API stability uncertain.
6. **Reverse-geocode against City Boundary polygon** (point-in-polygon, lat/lng from existing geocode rail against the same City Boundary polygon that produces the authoritative ZIP set). Self-contained; depends only on the polygon's currency, not on any runtime endpoint. Build groundwork: implementable from the same A-1-sourced layer.
7. **Gate-closed-with-guidance** (terminal). Surface ordinance text + "we cannot confirm City of LA jurisdiction without parcel-level lookup, currently unavailable; retry or consult counsel."

**Split:** **Broker rules** the chain ordering and which signals are sufficient for which dispositions. Build wires.

**Build's framing on (4):** adding LA City GIS direct parcel-layer lookup to the parcel-health rails is engineering-feasible (mirrors Workstream B's existing two-probe pattern with a third probe). It adds redundancy at the same publisher, which is more useful than redundancy across publishers for cases where the question is specifically "what does LA City say." Broker may rule it in for the chain even if it's not built in initial scope.

### §6.2 — Chain termination semantics

When does a positive signal terminate the chain (no further lookup needed)? When does a single signal need corroboration?

**Build groundwork:**

- Positive ZIMAS (in-City) is arguably terminal on its own — City Planning's own system asserting jurisdiction.
- Positive County situs-city alone is weaker (situs-city is for tax assessment, not jurisdiction); may want corroboration before terminating.
- Negative signals (out-of-City) propagate down the chain to confirm; one negative is not necessarily terminal.

**Split:** **Broker rules** termination semantics per signal. Build wires.

### §6.3 — Tools available to the broker

The investigation toolkit (for ruling diff items, ambiguous runtime cases that surface for broker spot-check, attestation evidence-gathering).

**Build groundwork (candidates identified, broker may add):**

- **ZIMAS browser lookup** ([zimas.lacity.org](https://zimas.lacity.org/)) — parcel-level municipal-jurisdiction lookup, public, free, authoritative for City Planning's view.
- **LA City Council District lookup** ([cityclerk.lacity.org/councildistrict](https://cityclerk.lacity.org/councildistrict) or equivalent boundary portal) — properties in-City have CD 1–15; out-of-City have null. Independent cross-check on ZIMAS.
- **LA County Assessor portal** ([assessor.lacounty.gov](https://assessor.lacounty.gov/)) — situs-city field, parcel-level, County's view.
- **NavigateLA** ([navigatela.lacity.org](https://navigatela.lacity.org/)) — Bureau of Engineering's map portal with City Boundary, council districts, parcel overlay in one view. Strong for visual border-case confirmation.
- **LA City Charter + annexation ordinances** (primary source). For contested-boundary cases. Available via City Clerk's office and the City Charter's annexation-history records.
- **Bureau of Engineering annual municipal-boundary publication** — the canonical-source-of-the-canonical-source. Authoritative ground truth for boundary disputes.
- **LAHD RSO jurisdictional lookup** ([housing.lacity.org](https://housing.lacity.org/)) — same caveat as §6.1.5 (RSO ≈ RTC but not identical).

**Split:** **Broker confirms** the tool list; broker may add tools build hasn't identified. Build's groundwork is the inventory.

### §6.4 — Logging discipline for chain consultation

Each runtime chain consultation produces an audit record (which signals consulted, which terminated, final disposition). Mirrors Workstream B's audit-sink pattern. Build-authored mechanics; broker confirms what fields are logged.

**Split:** **Build-authored mechanics, broker confirms field list.**

### §6.5 — Gate-closed-with-guidance UX (named, deferred)

The terminal state when the chain exhausts without resolution. User-facing message content is a separate produceability-layer determination (per A-1 §2.6 and A-2 §6). §6.5 names it as the chain terminus and points to the future determination.

**Split:** **Broker rules** the pointer to the deferred determination; the user-facing prose is authored later in its own ruling.

---

## §7 — Data licensing / sourcing provenance (Fork A-4, ridden inline)

### §7.1 — License of canonical source

Most LA City GeoHub data is published under open licenses (the City's open-data policy supports broad reuse).

**Build groundwork:** confirm the specific layer's license terms before any commit. Most likely outcome: open license with attribution; broker rules whether attribution is required in-product, in-commit, or both.

**Split:** **Broker rules** attribution discipline. Build confirms license text.

### §7.2 — Broker-scope reliance statement

The Bus. & Prof. Code § 10131(b) reliance on the data — that the broker is relying on the City of LA's own published view of its municipal jurisdiction for RTC-overlay produceability. This is the load-bearing compliance statement for predicate 5.

**Split:** **Broker-authored.** Build provides no draft.

### §7.3 — Re-attestation discipline

Whether broker re-attests the source on a cadence (annually, every N refreshes, never until forced by a re-ruling trigger).

**Build groundwork:** parallel to Workstream B's attestation packet, but for the source itself rather than the runtime endpoint.

**Split:** **Broker rules.**

---

## §8 — Predicate attestation packet shape

What the predicate-5 attestation packet contains (parallel to Workstream B's predicate-6 attestation packet, parallel to the RTC form-refresh attestation packet).

**Build groundwork — predicate list candidates (broker confirms / amends):**

1. Canonical source identified and broker-attested (§2)
2. Currency window defined and broker-ruled (§3)
3. Refresh cadence defined and broker-ruled (§4)
4. Discrepancy policy defined and broker-ruled (§5)
5. Runtime resolution chain defined and broker-ruled (§6)
6. License / reliance posture defined and broker-ruled (§7)
7. First snapshot loaded and sha256-verified
8. v6 corpus passes against authoritative snapshot
9. A-2 diff packet emitter live and tested against a synthetic diff
10. NO-DIFF auto-attestation observed (first refresh, if a synthetic test isn't broker-acceptable)

**Split:** **Broker confirms / amends** the predicate list. Build assembles the packet against the confirmed list.

---

## §9 — What this ruling does NOT address

**Split:** **Broker-authored.** Standard out-of-scope footer; build can scaffold candidates (Workstream A vs. B sequencing; user-facing gate-closed-with-guidance prose; LA Municipal Code monitoring gap; etc.) — broker confirms / amends.

---

## §10 — Action items

**Split:** **Broker-authored.** Standard action-item closeout, mirroring A-1 §5 and A-2 §7.

---

## Signature

`— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · <YYYY-MM-DD>` (authoring date, not scaffold date).

---

## Authoring discipline notes (for the broker's reference)

A few patterns from A-1 and A-2 worth carrying forward into A-3:

- **§1 summary authored last.** Once §§2–7 settle, the topline is straightforward; trying to author it first risks anchoring on a framing the substance doesn't support.
- **Build groundwork in each section is provisional.** Where this scaffold names a "recommendation" or "framing," that's build's read for broker reference; the determination is broker's. If broker reads the groundwork and disagrees with build's framing on a specific section, push back before authoring — easier to correct framing than to unwind authored prose.
- **Identification of authoritative sources is build's job; ruling on their canonicality is broker's.** Every source named in this scaffold (GeoHub, ZIMAS, County Assessor, NavigateLA, LAHD, City Clerk, BoE publication) is **identified** as a candidate. None is **ruled** canonical until the broker authors the §2.6 prose that names it.
- **Cross-references to A-1 and A-2 should be explicit.** A-3 supersedes A-2 on any conflict (per A-2 §3 trigger 4); A-3 is constrained by A-1 (LA City GIS is canonical, USPS rejected, parcel rails own border cases). Explicit cross-references in the §§3–7 prose anchor the ruling chain.
- **Length budget.** A-3 will naturally be longer than A-1 or A-2 (the substantive standard is more involved than the canonical-source ruling or the surfacing-discipline ruling). Estimate: 25–35KB. The longer it is, the more important the §1 summary becomes as a reading entry point.

---

## Companion deliverable: A-1a reconnaissance trigger

A-3 §2.1 (publisher) and §2.2 (dataset within publisher) both depend on A-1a's reconnaissance return — build identifies candidate GeoHub layers, surfaces them with metadata, broker rules among them. The reconnaissance is authorized under A-1 §3 and can begin in parallel with broker authoring A-3 §§3–7 (which do not depend on A-1a's outcome).

**Suggested authoring sequence:**

1. Build runs A-1a reconnaissance (parallel track, no broker dependency).
2. Broker authors A-3 §§3–7 (currency, refresh cadence, discrepancy policy, runtime resolution chain, licensing) from the scaffold above. These sections are independent of A-1a outcome.
3. Once A-1a returns, broker authors A-3 §§2.1 / §2.2 (publisher / dataset) and §§5.1 (intra-source discrepancy) referencing the actual surfaced layers.
4. Broker authors §1 summary and §§8–10 last.
5. Commit A-3 ruling; build moves to loader-and-emitter scope under A-2 §4 packet structure.

This sequencing keeps broker authoring time productive while build's reconnaissance is in flight, and produces a self-consistent A-3 ruling that references the actual layers rather than abstract candidates.

---

*This is a scaffold, not a ruling. Authoring intent: broker uses this document as a template, fills the broker-authored sections with substantive prose, deletes / amends the build-groundwork commentary as appropriate, signs.*
