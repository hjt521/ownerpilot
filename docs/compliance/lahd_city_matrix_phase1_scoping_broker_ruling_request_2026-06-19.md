# Build-side Phase 1 scoping note — caJurisdictionMatrix + jurisdiction wrapper (pre-code)

**File:** `lahd_city_matrix_phase1_scoping_broker_ruling_request_2026-06-19.md`
**Date:** 2026-06-19
**Authored by:** Build side (engineering) — Phase 1 pre-build scoping note for broker confirmation. Not a determination. No legal wording authored by build.
**To:** Jack Taglyan, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Governing rulings:** `lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md` (remap, §2); `lahd_city_matrix_architecture_conflict_broker_ruling_response_2026-06-19.md` (A1 model, block-vs-render, attribution, geocode).
**Source read at:** `main` = `f46bebf`. Both source files committed and hash-verified (`8a54e770…`, `d82efe45…`).
**Posture:** Last gate before code. Build authors no legal prose, no matrix rows from memory — all row contents are transcribed verbatim from the committed matrix file. This note confirms *structure and routing*, not content.

---

## §0. Why one more note before code

The committed matrix (`f46bebf`) uses a real field vocabulary that differs from the implementation prompt's invented one, and it resolves the block-vs-render question per-jurisdiction in a way the prompt's flat `promptKey` model did not anticipate. Two divergences need your explicit confirm that the committed source governs (per the blockers ruling §2 supersession). Everything here is structure; the legal content is yours and already committed.

---

## §1. The committed matrix's real shape (what build will encode)

The matrix is a per-jurisdiction `Field | Value` table. The governing field is **`Branch state`**, with three values — this is the committed-shape answer to the architecture ruling §1-item-3's "`displayBehavior` (name to be set in the committed shape)":

- **`LIVE`** — ready to implement (statewide-only, or a confirmed no-filing carve-out).
- **`REQUIRED-BUT-PENDING`** — rule confirmed but blocked on geocode/calendar/form-refresh dependency.
- **`MONITOR`** — ordinance passed but effective date or legal validity uncertain (do not implement).

**Build will key the TypeScript type on this enum, NOT on the prompt's `promptKey: "lahd"|"city-matrix"|"none"` or `citationPullStatus: "verified"|"pending"|"flagged"`.** Those prompt names don't appear in the committed source. Per blockers-ruling §2, the committed source governs; build follows `Branch state`.

**The 23 jurisdictions and their committed branch states** (transcribed from §2.1–§2.23, verbatim states):

| # | Jurisdiction | Branch state (committed) |
|---|---|---|
| 2.1 | City of Los Angeles | REQUIRED-BUT-PENDING (3 deps) |
| 2.2 | San Francisco | LIVE (Form 1007 attach) **+** MONITOR (File #251216) |
| 2.3 | San Jose | REQUIRED-BUT-PENDING |
| 2.4 | Mountain View | REQUIRED-BUT-PENDING |
| 2.5 | Richmond | REQUIRED-BUT-PENDING |
| 2.6 | Pasadena | REQUIRED-BUT-PENDING |
| 2.7 | Inglewood | REQUIRED-BUT-PENDING |
| 2.8 | Concord | REQUIRED-BUT-PENDING |
| 2.9 | East Palo Alto | REQUIRED-BUT-PENDING |
| 2.10 | Hayward | REQUIRED-BUT-PENDING |
| 2.11 | West Hollywood | REQUIRED-BUT-PENDING |
| 2.12 | Santa Monica | LIVE (no filing for nonpayment; just-cause-grounds-on-face for other grounds) |
| 2.13 | Beverly Hills | LIVE (3-day p-o-q) **+** REQUIRED-BUT-PENDING (90-day flow) |
| 2.14 | Glendale | LIVE |
| 2.15 | Long Beach | LIVE (statewide-only) |
| 2.16 | Antioch | LIVE (statewide-only) |
| 2.17 | Bell Gardens | LIVE (statewide-only) |
| 2.18 | Baldwin Park | REQUIRED-BUT-PENDING (15-day rule citation pull) |
| 2.19 | Healdsburg | LIVE (statewide-only; mobile-home only otherwise) |
| 2.20 | Sacramento | LIVE (statewide-only) |
| 2.21 | Berkeley | REQUIRED-BUT-PENDING |
| 2.22 | Oakland | REQUIRED-BUT-PENDING |
| 2.23 | Other CA (Culver City, Pomona, Alameda, Fremont, Maywood, Commerce, MV-MHRSO, Wheatland, Altadena) | (the DEFAULT / statewide-only set) |

---

## §2. [CONFIRM-1] Divergence: hard-block list (detectJurisdiction) vs. matrix branch states

The architecture ruling §2 said the hard-block cities (`detectJurisdiction.HARD_BLOCK_CITIES` = SF, Oakland, Berkeley, San Jose, Santa Monica, West Hollywood) stay **block-routed**. But the committed matrix assigns several of those a branch state that is NOT "block":

- **Santa Monica** → matrix says **LIVE** (no filing for nonpayment). But `detectJurisdiction` **hard-blocks** it.
- **San Francisco** → matrix says **LIVE** (Form 1007). But `detectJurisdiction` hard-blocks it.
- **Oakland, Berkeley, San Jose, West Hollywood** → matrix says REQUIRED-BUT-PENDING; `detectJurisdiction` hard-blocks them. (Consistent: pending ≈ blocked.)

So Santa Monica and SF are the conflict: matrix = LIVE, stub = BLOCK. Per the architecture ruling §1's stated principle ("**the matrix is never the authority on LA jurisdiction — `detectJurisdiction` is**") and §2 ("hard-block cities stay block-entirely **until each has its own broker determination explicitly authorizing notice production for that jurisdiction**"), build's read is:

**`detectJurisdiction`'s hard-block wins at runtime regardless of the matrix's LIVE state, until a per-city graduation determination flips it.** The matrix's `LIVE` is the *legal-research* finding (no filing required); it is NOT a runtime authorization to produce while the city is still in `HARD_BLOCK_CITIES`. The matrix row ships as data; the stub gates production.

**[CONFIRM-1]:** Is build's read correct — `detectJurisdiction.HARD_BLOCK_CITIES` block wins over a matrix `LIVE` state until a per-city graduation determination, so SF/Santa Monica ship dark (data present, block-routed) exactly like the pending cities? Or do you intend SF/Santa Monica's `LIVE` to authorize them out of the hard-block list now (which would require editing `detectJurisdiction`, currently forbidden by §3 D1-part-2)?

**Broker confirm (1):**

---

## §3. [CONFIRM-2] The DEFAULT / "Other CA" row

The prompt's §3 specified a `CA_JURISDICTION_DEFAULT` ("other CA cities", CCP §1161 only). The committed matrix §2.23 is that set, but it's a **list of named cities with notes**, plus §4's dispatch rule `UNKNOWN_OR_OUTSIDE -> apply statewide-only requirements`. Build's read: the DEFAULT row is a single synthetic entry (`jurisdictionId: "ca-default-statewide"`, branch state `LIVE`, no supplemental filing, CCP §1161 only), and the §2.23 named cities are encoded as explicit rows that *point at* DEFAULT (so "Culver City" resolves to statewide-only rather than falling through silently). Altadena (unincorporated LA County) is explicitly REQUIRED-BUT-PENDING per §2.23 + §6, so it routes to pending, not DEFAULT.

**[CONFIRM-2]:** Encode §2.23 as named rows → DEFAULT (build's read), or as a single DEFAULT with the named cities only in a comment? (Functional difference: named-rows lets a future citation pull graduate one city without touching others; build prefers it.)

**Broker confirm (2):**

---

## §4. What Phase 1 builds (structure only, ships dark)

1. **`lib/jurisdiction/caJurisdictionMatrix.ts`** — typed table, one row per §2.1–§2.23 + DEFAULT. Row shape (proposed):
   ```ts
   type BranchState = 'LIVE' | 'REQUIRED_BUT_PENDING' | 'MONITOR';
   interface JurisdictionOverlayRow {
     jurisdictionId: string;          // slug, e.g. "ca-los-angeles-city"
     displayName: string;             // verbatim from matrix header
     branchState: BranchState;        // the governing gate
     // verbatim-from-source content fields (NOT build-authored):
     authority: string;
     appliesTo: string;
     postServiceFiling: string;       // verbatim matrix cell
     consequence?: string;
     sources: { label: string; url: string }[];
     notes?: string;
     // routing:
     supplementalFilingRequired: boolean;  // derived from "Post-service filing" cell
   }
   ```
   Content fields are transcribed **verbatim** from the committed matrix cells — build types the structure, copies the strings. Where a row has a split state (SF, Beverly Hills), build encodes the 3-day-pay-or-quit-relevant state (the product's scope) and notes the other in `notes`.

2. **`lib/jurisdiction/resolveSupplementalDuty.ts`** (thin wrapper, §4a shape ii) — calls `detectJurisdiction` first; on `BLOCK_OVERLAY_CITY` or `NEEDS_CONFIRMATION` returns a block/confirm-routed value **with no matrix lookup**; on `NO_KNOWN_OVERLAY` consults the matrix for DEFAULT/statewide. **Throws** if invoked on an address that hasn't been through `detectJurisdiction` (§1-item-4 fail-closed). Never the authority on jurisdiction — `detectJurisdiction` is.

3. **Env flag** `LAHD_FILING_PROMPT_ENABLED` (default off) — declared, gates no rendered UI in Phase 1.

4. **Tests** (`lib/jurisdiction/*.test.ts`, `check()` harness per repo convention) — assert: hard-block cities → block-routed (per CONFIRM-1); pending cities → pending/no-render; LIVE-but-still-hard-blocked (SF/SM) → block-routed (per CONFIRM-1); DEFAULT cities → statewide-only; wrapper throws on unconfirmed address; **no test asserts an LA notice is produced**; post-production render tests `describe.skip`-gated on `isLaProductionUnblocked()`.

5. **PR description** — includes (a) blockers-§2 path-remap supersession ref, (b) architecture-§2 block-vs-render supersession ref, (c) §5 gap-list reconciliation mapping prompt §10 / matrix §6 open items to `laRtcRules.ts`'s three dep flags.

**Phase 1 ships zero user-visible UI. Zero attorney tokens. LA rule modules imported, never edited.**

---

## §5. [CONFIRM-3] Interim block-routed copy (§3 D1-part-2 exception)

The architecture ruling §3 D1-part-2 said: where `detectJurisdiction`'s `BLOCK_OVERLAY_CITY` message reads "talk to a California licensed **attorney**," the wrapper substitutes broker-authored copy — which build does not draft — and until that string is authored, build picks a no-attribution interim path and surfaces it.

Since Phase 1 ships **no UI**, the wrapper returns a *typed value*, not rendered copy — so no user-facing string is needed yet. Build proposes: the wrapper returns `{ route: 'blocked', reason: 'jurisdiction-not-yet-supported' }` with **no message string at all** in Phase 1. The user-facing copy is authored by you and wired in Phase 2 when UI lands. This sidesteps the interim-copy question entirely for now.

**[CONFIRM-3]:** Phase 1 wrapper returns a typed route with no user-facing message string (build's proposal), deferring the block-copy authoring to Phase 2? Or do you want the block-copy string authored now?

**Broker confirm (3):**

---

## §6. What build will NOT do in Phase 1

- Author no matrix row content — all transcribed verbatim from `f46bebf`'s committed matrix.
- Edit none of `detectJurisdiction.ts` / `laOverlay.ts` / `laRtcRules.ts` / `laCityCalendar.ts`.
- Render no UI; declare the flag but gate nothing visible.
- Implement no SF Ord. 18-22 or File #251216 (matrix §5.4 / MONITOR — build encodes SF's `MONITOR` sub-state as data only, never a render path).
- Compute no filing deadline date (§5.1 binds; `laCityCalendar` stays verified:false).
- No attorney tokens anywhere.

---

## §7. Confirm summary (broker)

- **(1)** Hard-block wins over matrix LIVE for SF/Santa Monica until per-city graduation — yes/no:
- **(2)** Encode §2.23 as named rows → DEFAULT — yes / single-DEFAULT:
- **(3)** Phase 1 wrapper returns typed route, no message string, block-copy deferred to Phase 2 — yes/no:
- **Sign-off to open the Phase 1 branch:**

---

Authored by build (Claude). Awaiting Broker Compliance Review under blanket authorization (`broker_blanket_authorization_2026-06-15`). No legal wording authored by Claude.
