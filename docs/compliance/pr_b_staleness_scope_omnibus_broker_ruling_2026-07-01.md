# PR-B Serve-Time Stale-Facial-Dates Guard — Scope Omnibus (Broker Ruling)

**Re:** `pr_b_staleness_scope_fork_request_2026-07-01.md` (engineering, 2026-07-01)
**Parent rulings / precedent:**
- `pr_a3_produce_handoff_fork_ruling_2026-07-01.md` (Fork B(ii) client rail-caller + Fork A(iii) client verdict resolution)
- `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (produce-audit persistence — same class of compliance-artifact-shape decision)
- `broker_status_and_decision_request_omnibus_broker_ruling_2026-07-01.md` (D1: client-render preserved)
- `lane2e_persona_prose_broker_ruling_2026-07-01.md` (locked-prose authorship pattern)
- `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` (§8 as-built parity rule of construction)

**Disposition:** Ruled. Engineering's §7 recommendation ADOPTED WITH MODIFICATIONS. §S1.6(b) is not left unguarded — see §2 below.

---

## §1 — Frame

Two premises govern this ruling and I'm stating them up front because they change the shape of the answer:

1. **The wizard is not the compliance ceiling; it is the current implementation.** Wizard parity is a useful discipline for shape reuse (that's why `evaluateStaleness` reuse is correct), but the wizard's ephemeral localStorage snapshot + its "deferred D2 slice" for persistence are not compliance-endorsed patterns — they are known limitations engineering-flagged. A chat path that persists durably and closes a gap the wizard leaves open is not "over-building beyond parity"; it is closing a compliance gap that has been outstanding on the wizard side. Do not use "the wizard doesn't do this" as a reason to defer chat-side coverage on this ruling.

2. **The chat path serves the notice.** The moment the chat path renders a PDF (via `LaProducePanel` after `renderNotice`), an owner can save/print/serve that PDF using channels outside the app. The chat "no serve surface exists today" fact is a UX gap, not a compliance argument for leaving serve-side drift unguarded. Serve-time drift (§S1.6(b)) has legal consequence identical to re-produce drift: the notice's face is stale, but this time it has already been handed to a tenant. That's worse than re-produce drift, not equivalent.

Both premises push the ruling toward more coverage than engineering's §7 recommendation — specifically on §S1.6(b) and Fork 1.

## §2 — §S1.6 sub-fork: which scenarios PR-B guards — RULED

**Ruling: PR-B guards both scenario (a) AND scenario (b).**

- **(a) produce → edit intake → re-produce.** Guarded at the chat Review Generate action (Fork 2).
- **(b) produce → serve the PDF → later edit intake.** Guarded at the point the owner returns to the riskpath and takes any action that would be inconsistent with serving a stale-face notice (§4 below spells out the minimum surface).

**Rationale.** As stated in §1(2), the legal-consequence severity of (b) is at least as high as (a). The wizard leaves (b) uncovered because its "D2 slice" is deferred; that deferral has been outstanding, and the chat path is not obligated to inherit it. **Deferring (b) to PR-C or later would create a compliance gap that requires operator discipline to close** ("remember not to serve a PDF you produced before editing your intake") — and operator discipline is not a compliance instrument I'm willing to rely on when a code-level guard is achievable within PR-B scope.

**Concession to scope.** I am NOT ruling that PR-B must build a full chat Serve & Track surface analogous to the wizard's `serve-track.tsx`. I AM ruling that PR-B builds the *minimum riskpath surface* required to fire the staleness guard at any point the owner returns to a produced notice's riskpath row post-edit — see §4 for what that minimum looks like. This distinguishes "cover the compliance gap" (in scope) from "build feature parity with the wizard serve-track UX" (out of scope; belongs to a later slice).

## §3 — Fork 1: snapshot persistence — RULED

**Ruling: Option 1A — new `produce_snapshot jsonb` on the riskpath row.**

**Not 1B, despite the freeze guarantee holding.** Rationale:

1. **`toNoticeFlowData` drift is a real risk over time.** 1B reconstructs the prior snapshot each check by re-running `toNoticeFlowData(captured_payload)` and then `captureProductionSnapshot()`. If either function changes behavior in a future refactor (added field, renamed field, changed derivation), the derived snapshot moves — and the guard's comparison silently shifts against a moving reference. A CI guard can catch shape drift but not behavior drift. Durable persistence at produce time freezes the snapshot in the same shape the check runs against, permanently.
2. **Parallels §2 of the §5.2 countersign.** I ruled produce-audit persistence toward an explicit endpoint for the same reason (compliance-artifact durability trumps a viable-but-fragile derive-on-the-fly path). Consistency across the two compliance artifacts (produce_audit + produce_snapshot) matters — an operator reconciling a riskpath row against served output should find both durable, in the same place, with the same access posture.
3. **The wizard's asymmetry is being closed, not preserved.** Engineering correctly flagged that the wizard's snapshot is ephemeral localStorage. The chat path recording more than the wizard is the correct asymmetry: server-backed compliance artifacts should be durable. If wizard-side eventually persists (its deferred D2 slice), it will match this chat-side shape; if it doesn't, the wizard remains the weaker path — engineering-flagged limitation, not a compliance directive to weaken the chat side.
4. **Cost of 1A is one migration + one write per produce.** Both are trivial relative to the reconciliation-trail value.

### §3.1 — Design directive

- **Migration:** add `produce_snapshot jsonb null` to `riskpath_records` (or the equivalent table per repo conventions). Nullable because the column is unpopulated for rows produced before the migration lands.
- **Write path:** on chat produce (in the §5.2 `from-chat` insert flow, or on a subsequent step of the same request — engineer's call), compute `captureProductionSnapshot(noticeFlowData)` and store it on the row.
- **Read path:** the staleness guard reads `produce_snapshot` from the prior row and compares against the current session's derived `NoticeFlowData` via `evaluateStaleness`.
- **Backfill:** none required. Rows lacking `produce_snapshot` (pre-migration or from the wizard path if it ever writes to `riskpath_records` — which today it does not) bypass the guard with a defined fallback (§4.4).
- **Shape:** `ProductionSnapshot` type as defined in `lib/flow/escalation.ts`. Do not add or remove fields from the wizard's `captureProductionSnapshot` output — reuse verbatim.
- **CI-enforceable:** extend `verify_review_produce_parity.mjs` (or add a sibling) to assert (i) the chat produce path calls `captureProductionSnapshot` unchanged; (ii) writes the output onto `produce_snapshot`; (iii) the staleness guard reads from `produce_snapshot`, not from a derived-on-the-fly path. Failing any of the three fails CI. Add to branch-protection required-checks on first observed pass, same posture as `verify_review_produce_parity.mjs` (§3.3 of the §5.2 countersign).

## §4 — Fork 2: when the guard fires — RULED

**Ruling: Fire at both re-produce and at any post-serve return-to-riskpath action.**

Two firing surfaces, both required for PR-B.

### §4.1 — Surface 1: chat Review Generate (re-produce)

- The staleness guard runs when the chat Review Generate action is invoked and a prior produced row exists for this chat session where `produce_snapshot` differs from the current derived `NoticeFlowData` snapshot.
- **Behavior: warn-then-require-new-row.** The Generate action shows the ratified warning copy (§6) BEFORE proceeding. The owner may proceed, which produces a new riskpath row (the chat's insert-only model makes this natural — no schema change required; every produce is a new row today). The owner may cancel and edit further. Either way, the guard has fired and the drift is captured.
- **Not "block."** The wizard's warn semantics are the correct posture — an owner may legitimately want to proceed after acknowledging drift. Compliance requires acknowledgment, not prohibition.
- **Not "warn silently and produce."** The acknowledgment must be explicit (a click on a confirmation button after reading the warning). Same posture as the LAHD ack in `LaProducePanel` — the owner sees the warning, acknowledges, then proceeds. The acknowledgment itself is a compliance artifact (see §5).

### §4.2 — Surface 2: riskpath row post-serve return

- When the owner navigates to a specific produced riskpath row (via `/riskpath/[id]` or the equivalent dashboard drill-in) AND their current `chat_sessions.intake_state` differs from that row's `produce_snapshot`, the row surface renders the same ratified warning copy.
- **This does not require building a full chat Serve & Track UX.** It requires ONE addition to the existing riskpath row view: a banner/panel at the top of the row that renders the warning when staleness is detected. The owner can dismiss the banner (an acknowledgment click), or they can navigate to Review to re-produce. Both branches are captured (§5).
- **What "post-serve" means here.** The chat path has no explicit "mark as served" action today; the guard fires whenever the owner returns to the row's view, whether or not they have served the PDF. This is a superset of "post-serve" and is the correct posture: we don't know when the PDF has been served, so the guard fires whenever drift is detected on that row.
- **Not a new route.** Reuse the existing riskpath row surface. If no such surface renders a per-row detail view today, the smallest thing that satisfies this ruling is adding a banner to whatever surface the owner lands on when opening a specific row from `/riskpath`. Engineer's call on placement; the requirement is that the guard fires and the ratified copy renders.

### §4.3 — Why both surfaces are required

Scenario (a) is caught by Surface 1. Scenario (b) requires Surface 2. Neither surface alone closes the compliance gap. Both surfaces reuse the same `evaluateStaleness` engine and the same ratified copy — the incremental cost of Surface 2 over Surface 1 is one banner render + drift-detection query on the row view. This is proportionate to the compliance risk (b) creates.

### §4.4 — Fallback for rows lacking `produce_snapshot`

Rows without `produce_snapshot` (pre-migration; or, hypothetically, if the wizard ever inserts into `riskpath_records`) skip the staleness comparison and render a **neutral non-warning notice** on Surface 2: "This notice was produced before staleness tracking was enabled. If you have edited your details since producing it, please re-produce before serving." Engineer authors this fallback copy per repo conventions; it does not go into the locked-prose manifest (it is transitional). Once the migration lands and only new rows exist, this fallback is unreachable in practice.

## §5 — Acknowledgment as compliance artifact — RULED (new)

The owner's acknowledgment of a staleness warning is itself a compliance artifact and must be recorded. This was not explicitly in the memo's forks; I am adding it because it is downstream of the "warn-then-require-new-row" ruling in §4.1 and the "warn banner" ruling in §4.2 — a warning that leaves no trail is not a compliance instrument.

### §5.1 — What to record

For each acknowledgment (whether the owner clicks "proceed to re-produce" on Surface 1 or "dismiss" on Surface 2), record:

- `riskpath_id` (of the stale row)
- `chat_session_id` (of the current session)
- `acknowledged_at` (server timestamp)
- `staleness_reason` (`AMOUNT_CHANGED` | `FACE_FIELD_CHANGED`)
- `changed_fields` (the array `evaluateStaleness` returned)
- `action_taken` (`proceed_to_reproduce` | `dismiss_banner` | `cancel_at_generate`)

### §5.2 — Where it lives

New table `staleness_acknowledgments` (or the equivalent per repo conventions) — a child of `riskpath_records` keyed by `riskpath_id`. Insert-only; no updates. Same auth posture as the produce-audit endpoint.

### §5.3 — What it enables

A downstream reconciliation query can answer: "For this riskpath row, was the owner warned before the face drifted, and what did they do about it?" That is the compliance trail that makes the warn-not-block posture defensible.

### §5.4 — Endpoint

`POST /api/notices/[riskpathId]/staleness-ack` (name flexible). Called by both Surface 1 (before proceeding to produce a new row) and Surface 2 (on banner dismiss or on navigate-to-Review). Test coverage: unit for the endpoint; integration that each surface fires the endpoint on the correct action.

## §6 — Fork 4: stale-warning copy — RATIFIED (broker-authored, verbatim)

### §6.1 — Ruling: one block, two branches, one interpolated slot

- **Two branches** (`AMOUNT_CHANGED` vs `FACE_FIELD_CHANGED`) share the same block skeleton but differ on one inline phrase.
- **One slot:** `{{changedFields}}`, interpolated with the human-readable list of field labels `evaluateStaleness` returned. The parser produces the readable list on the server side (no LLM); engineer implements the label mapping (e.g., `payee.address` → "the payee's address").
- **No previous-vs-new value interpolation.** The copy tells the owner the face changed; the value diff is not exposed in the warning itself. This is deliberate: owners may confuse "new value" with "the value that should have been," and we do not want the warning copy to imply the current value is authoritative.
- **Render location:** Surface 1 (Review Generate, pre-produce modal) and Surface 2 (riskpath row banner) — same copy on both surfaces.

### §6.2 — Locked-prose blocks (Shape-A, flat string literals, hash-locked)

Add three entries to the locked-prose manifest:

**Block 1 — `chatStalenessWarningAmountChanged`:**

> This notice is out of date. Since you produced it, the amount demanded changed ({{changedFields}}). A notice can't be re-served after its face has changed — you'll need to produce a new notice with the updated details before serving.

**Block 2 — `chatStalenessWarningFaceChanged`:**

> This notice is out of date. Since you produced it, something on the notice changed ({{changedFields}}). A notice can't be re-served after its face has changed — you'll need to produce a new notice with the updated details before serving.

**Block 3 — `chatStalenessAckButton`:**

> I understand — take me to produce a new notice

### §6.3 — Notes for engineering

- Real em-dash `—` (U+2014), not two hyphens.
- Slot syntax `{{changedFields}}` is the flat-literal-guard-supported form.
- The block ends with a period after "before serving." — no trailing whitespace, no trailing newline in the constant.
- Reason branch selection is deterministic on `evaluateStaleness.reason` — no LLM in the copy-selection path (same posture as Lane 2E scripted capture: server emits verbatim).
- Ack button copy is the button label the owner clicks on both surfaces to record the acknowledgment (§5). No slot.
- **ES ratification:** ES translations for all three blocks are PROVISIONAL until the general ES ratification pass (same posture as Lane 2E ES).

### §6.4 — Manifest count effect

Three new Shape-A entries. Combined with the Lane 2E post-close count (43, per the Lane 2E omnibus §4.5) and assuming that count has already been appended: post-PR-B manifest count is **46** Shape-A entries. Guard re-run required after append. Engineer confirms the actual pre-PR-B count in the attestation (do not defer to the earlier "43" figure without verification — same discipline the Lane 2E attestation applied to correct "8/11" → 10).

## §7 — Fork 3: scope — RULED

**Ruling: Modified Option B+.**

- **Guard at re-produce (Surface 1)** — from Option B.
- **Warning UI on Review Generate + locked-prose copy** — from Option B.
- **Guard at riskpath row post-serve return (Surface 2) + banner UI** — pulled forward from Option C, minimum implementation only (banner on existing surface, not a new route, not full serve-track parity).
- **Staleness acknowledgment persistence + endpoint** — new per §5.
- **`produce_snapshot` column + migration + write path** — from Fork 1 ruling (§3).
- **CI parity check extension** — from §3.1.

**Not in PR-B:** a full chat Serve & Track surface (Option C in the memo's phrasing). PR-C or a later slice.

**Knock-on to PR-C:** PR-C (LAHD checklist + cron) remains scoped as previously discussed. If a future slice builds a full chat Serve & Track surface, the LAHD checklist may relocate onto it; that is a later decision, not a PR-B/PR-C entanglement.

**Test coverage minimum:**

- Unit: `captureProductionSnapshot` reuse (no wrapping); `evaluateStaleness` reuse (no wrapping); `produce_snapshot` write on chat produce; `produce_snapshot` read at guard time; label mapper for `{{changedFields}}`.
- Integration: Surface 1 fires warning + acknowledgment on drift-detected re-produce; Surface 1 does not fire on no-drift re-produce; Surface 2 fires banner on drift-detected row view; Surface 2 does not fire on no-drift row view; Surface 2 renders fallback copy on rows lacking `produce_snapshot`; acknowledgment endpoint writes correctly on each of the three `action_taken` values.
- Parity: extended `verify_review_produce_parity.mjs` (or sibling) confirms wizard-engine reuse.

## §8 — Sequencing after this ruling

1. Engineering wires PR-B per §§3, 4, 5, 6, 7 above. This includes: the `produce_snapshot` migration; the `captureProductionSnapshot` write on chat produce; Surface 1 (Review Generate warning) + Surface 2 (riskpath row banner); the three locked-prose blocks + manifest append; the `staleness_acknowledgments` table + endpoint; the CI parity check extension; test coverage per §7.
2. Engineering files the PR-B attestation. On receipt I countersign.
3. **PR-B merges** on the §5.2 core (+ any interim fast-follows) merged base.
4. I add the extended parity check to branch-protection required-checks (Path α), once observed passing in `main`.
5. **PR-C opens** on PR-B merge. LAHD checklist + cron scope unchanged.

## §9 — Deviations posture reaffirmed

- Shape divergences (import paths, storage details, migration mechanics) reconcile under as-built parity (§8 rule of construction from the Lane 2E omnibus).
- Compliance-behavior divergences (e.g., if the wizard's `evaluateStaleness` engine turns out to classify differently than expected on a real case) require §1.6 escalation. Do not reconcile inside the attestation.
- **Anti-defaulting discipline holds.** If a field is not in `ProductionSnapshot` today but is on the notice face and drifts, surface as an open item per the entityType precedent. Do not silently expand `captureProductionSnapshot`.

## §10 — Operator items (updated)

- Path α env provisioning §3.2 — in progress.
- Branch protection §3.3 — pending the extended CI check from §3.1 landing and observed passing.
- Prior standing items unchanged.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
