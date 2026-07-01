# BROKER RULING — PR-A3 Produce-Handoff Fork Surface (Fork A + Fork B)

**Re:** `pr_a3_produce_handoff_fork_surface_2026-07-01.md` (engineering, 2026-07-01, PR-A3 build held)
**Precedent:** `broker_status_and_decision_request_omnibus_broker_ruling_2026-07-01.md` §§1.2–1.6 (D1); Phase 2d client-render ratification 2026-06-29; Decision 2 produce-gate reconciliation 2026-06-28; Lane 5 resumption 2026-06-29
**Ruling authority:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Ruling date:** 2026-07-01
**Disposition:** Both forks ruled. PR-A3 branch cleared to open with the scope defined below. Omnibus §1.2.3 is **corrected** in §4 of this ruling.

---

## §1 — Escalation acknowledged; §1.6 worked as designed

Engineering surfaced this exactly as §1.6 of the omnibus ruling directed. The evidence is clean:

- Ratified rail requires `{verdict:'confirmed_la', verdictSource, lahdCopyVersion, baseName}`.
- Chat flow resolves no verdict. Persona-side refusal of non-LA cities is not a verdict — it's a UX guardrail. There is no `confirmed_la` attested anywhere on the chat session.
- `from-chat` today flattens intake and POSTs to a non-existent root route.

This gap is **pre-existing** — a chat-integration hole that predates PR-A2/A3 and the day-count work. PR-A3 is going to have to close it, because the day-count invariant can't reach a produced notice through the chat path until the verdict handoff exists. That's fine and correct scope.

The escalation held the build. That was the right call. §1.6 exists for exactly this class of finding.

---

## §2 — Fork B (who calls the rail) · **RULED B(ii)**

### §2.1 Ruling

**Fork B: B(ii) — the Review step reuses `runLaProduceSequence` client-side.** No new server rail-caller. No duplication of `laProduceClient.ts`. The ratified, Phase-2d-tested path is the client sequence, and PR-A3 honors that.

`from-chat` **stops calling the rail** entirely. Its new server-side responsibilities are exactly three:

1. **G4 counsel hard-stop** (unchanged).
2. **Riskpath insert** (unchanged).
3. **`intendedServiceDate` validation** via PR-A2's `lib/produce/intendedServiceDate.ts` validator. No duplication of range/back-date logic.

That's it. `from-chat` returns a **produce-ready payload envelope** to the Review step, and the Review step calls `runLaProduceSequence` with the envelope + the resolved verdict (Fork A) + `intendedServiceDate` (already PR-A2-captured).

### §2.2 Why B(ii) and not B(i)

- B(i) would build a second rail-caller (server-side `runLaProduceSequence` twin) that duplicates ratified client code. That's re-implementation of tested code with a new failure surface — precisely the surface PR-B (D3) would then have to reason about twice.
- B(ii) collapses to one rail-caller. PR-B's stale-facial-dates guard reads facial dates against `intendedServiceDate` at serve time; it reasons about one produced-notice surface, not two.
- Phase 2d ratified client-render on the record. Building a parallel server-render path (which is what a server rail-caller implies for anything past verify-la's assertion) supersedes that ratification without new compliance basis. I refused that in the omnibus §1.3; I refuse it again here.

### §2.3 Wizard parity requirement

The Review-step call site **must** be byte-identical in call shape to the wizard's `la-produce-panel.tsx` call site — same argument order, same option flags, same error-handling posture. If the wizard changes, the Review-step call changes with it in the same commit. Engineering: add a comment at the Review-step call site:

```
// runLaProduceSequence call site is intentionally byte-identical to la-produce-panel.tsx
// per broker ruling 2026-07-01 §2.3. Any drift is a §1.6 escalation, not a local edit.
```

---

## §3 — Fork A (where does the chat flow get the verdict) · **RULED A(iii) with an A(ii) fallback trigger**

### §3.1 Ruling

**Fork A: A(iii) — the Review step resolves the verdict client-side before it calls `runLaProduceSequence`.** It reuses the wizard's resolver — same code path, same `CachedResolverVerdict` shape (per Decision 2 produce-gate reconciliation 2026-06-28 §2 — `{outcome, source, resolved_at, address_normalized, broker_confirm_token?}`).

The chat's `property_address` becomes the resolver input. The resolver returns the `CachedResolverVerdict`. The Review step then:

- If `outcome === 'confirmed_la'` and `source === 'live_resolver'`: proceed straight to `runLaProduceSequence`.
- If `outcome === 'confirmed_la'` and `source === 'broker_confirm'`: proceed to `runLaProduceSequence` — the produce endpoint's `source === 'broker_confirm'` server cross-check (per Decision 2 produce-gate reconciliation §2.1) fires downstream and does its job. No PR-A3 change to that cross-check.
- If `outcome === 'not_la'`: Review step blocks with the `route_to_counsel` referral surface. This is the wizard's existing behavior; mirror it.
- If `outcome === 'inconclusive'` or `outcome === 'requires_broker_confirm'`: Review step surfaces the Decision 2 `BROKER_CONFIRM_REQUEST_PROMPT` locked-prose (Lane 5 resumption §2 constants). This is the Decision 2 broker-confirm entry point; PR-A3 wires it, doesn't rebuild it.

### §3.2 Why A(iii), not A(ii)

- A(ii) would add a migration to store verdict + source on `chat_sessions`. That's schema churn to preserve a value that (a) is derivable from `property_address` at Review time and (b) already lives address-keyed in `CachedResolverVerdict` per Decision 2. Two persisted copies of the same fact drift; one persisted copy plus a re-derivation is safer.
- A(iii) puts the resolution step where the wizard puts it — immediately upstream of `runLaProduceSequence` — which reuses Decision 2's produce-gate reconciliation exactly as ratified. No new surface for produce-gate to defend.
- A(iii) keeps `from-chat` free of jurisdiction concerns, matching §2.1 above (from-chat is guardrails + validation, not verdict resolution).

### §3.3 A(ii) fallback trigger (surface-as-fork, do not decide)

Engineer escalates rather than deciding if any of the following surface during PR-A3 build:

- The resolver has a client-side dependency (network call, external API, geocode fetch) whose latency makes Review-step click→resolve→produce feel broken to the user (>2s p95). If measured latency exceeds that budget, surface — I'll rule A(ii) with a resolution-at-intake migration.
- The resolver mutates state that Review-step can't safely mutate (writes to `broker_confirm_requests`, side-effects on session). Surface — I'll rule A(ii) or a hybrid.
- The `property_address` captured in intake is materially divergent in shape from what the wizard's resolver accepts (normalization gap that predates PR-A3). Surface — that's a Lane 5 normalization ruling, not a PR-A3 local decision.

If none of those surface, A(iii) is the ruled path and engineer builds it straight through.

### §3.4 Decision 2 intersection is intentional

Engineering noted Fork A "intersects the Decision 2 surface — not a trivial detect-city call." Correct, and that's fine. PR-A3 is where chat *starts using* Decision 2's produce-gate reconciliation. The intersection is a wiring intersection, not an architecture intersection. Decision 2's schema, cache shape, produce-gate cross-check, and broker-confirm surfaces all stand unchanged. PR-A3 just calls them from a new caller (Review-step from a chat session, instead of the wizard from a wizard session).

---

## §4 — Correction to omnibus ruling §1.2.3

The omnibus ruling 2026-07-01 §1.2.3 read:

> "…`from-chat` must call **directly into the ratified rail** — `verify-la` for assertion, `la-packet` for delivery. If `from-chat` currently uses an intermediary POST-to-root, remove the intermediary and inline the two ratified calls (or a thin server helper that fans out to them)."

That instruction was **wrong** on the caller side. `from-chat` (server) is not the correct rail-caller because the ratified rail is client-driven and the Phase 2d ratification bound the render posture to client-render. Fanning verify-la + la-packet from a server helper implies a server-side successor step (assemble/render) that Phase 2d refused.

**Corrected §1.2.3:** `from-chat` **does not call the rail.** The Review step reuses `runLaProduceSequence` (client) per §2.1 of this ruling. The dangling `/api/notice/produce` root POST call is deleted (this part of §1.2.3 stands). `from-chat`'s new responsibilities are the three server-side items enumerated in §2.1 above.

The verbatim citation comment specified in omnibus §1.4 for the deletion is amended to:

```
// Dangling POST to /api/notice/produce (no route) removed per broker ruling 2026-07-01 §1.2(3)
// as corrected by pr_a3_produce_handoff_fork_ruling_2026-07-01.md §4.
// Ratified rail is verify-la (POST) + la-packet (GET), called client-side by
// runLaProduceSequence from the Review step. No server rail-caller exists or will be created.
```

The other two verbatim citation comments in omnibus §1.4 stand unchanged.

---

## §5 — PR-A3 scope (final, cleared to open)

### §5.1 Server-side changes (`from-chat`)

1. **Add:** `intendedServiceDate` validation call — delegates to `lib/produce/intendedServiceDate.ts`.
2. **Preserve:** G4 counsel hard-stop, riskpath insert (no changes).
3. **Remove:** dangling POST to `/api/notice/produce` root (with the §4-corrected citation comment).
4. **Return:** produce-ready payload envelope to Review step. Envelope shape must include everything `runLaProduceSequence` needs *except* `verdict` + `verdictSource` (those come from §5.2 client-side resolution) and *except* `intendedServiceDate` (that's already in PR-A2's Review-step state).

### §5.2 Client-side changes (Review step)

1. **Add:** verdict resolution via the wizard's resolver, keyed on `property_address` from intake. Returns `CachedResolverVerdict`.
2. **Branch on `outcome`:**
   - `confirmed_la` → proceed to `runLaProduceSequence` with `{verdict:'confirmed_la', verdictSource: cachedVerdict.source, lahdCopyVersion, baseName, ...envelope, intendedServiceDate}`.
   - `not_la` → block with `route_to_counsel` referral (mirror wizard).
   - `inconclusive` / `requires_broker_confirm` → surface `BROKER_CONFIRM_REQUEST_PROMPT` locked-prose (Lane 5 constants).
3. **Add:** byte-identical `runLaProduceSequence` call site per §2.3, with the §2.3 citation comment.
4. **Add:** the omnibus §1.4 Review-step Generate handler citation comment (updated to reflect that Generate now triggers client-side resolve→produce, not a fetch to from-chat as its terminal step).

**Updated Review-step Generate citation comment:**

```
// Generate handler per broker ruling 2026-07-01 §1.2(1) as amended by
// pr_a3_produce_handoff_fork_ruling_2026-07-01.md §§2 + 3:
// (1) POST to from-chat for server-side validation (intendedServiceDate + guardrails);
// (2) on success, resolve jurisdiction verdict via wizard resolver keyed on property_address;
// (3) branch on outcome (confirmed_la → runLaProduceSequence; not_la → route_to_counsel;
//     inconclusive/requires_broker_confirm → BROKER_CONFIRM_REQUEST_PROMPT).
// GET-navigation to POST-only endpoint superseded. No server rail-caller.
```

### §5.3 Tests

1. **Playwright end-to-end trace** (per omnibus §1.2.5): chat intake → Review step with intendedServiceDate → Generate → verdict resolution → verify-la POST → la-packet GET → client-render body. All four boundaries traced with response codes + assertion outcomes captured.
2. **Verdict-branch tests** (new): three Playwright traces covering `confirmed_la`, `not_la`, and `inconclusive` outcomes. Each asserts the correct Review-step surface (produce vs referral vs broker-confirm prompt).
3. **Regression tests** (existing PR-A2 suite): triple-coherence invariant `Dated = serviceDate = intendedServiceDate` on every render path. No changes.
4. **B1-grep tombstone pass:** zero residual references to superseded behavior (unchanged from PR-A2).
5. **Wizard-parity assertion:** static grep/AST check that the Review-step `runLaProduceSequence` call site matches the wizard call site byte-for-byte on argument order + option flags. Fails CI if drift.

### §5.4 Locked prose

**No new locked prose ships in PR-A3.** The Decision 2 broker-confirm surfaces (`BROKER_CONFIRM_REQUEST_PROMPT` and neighbors, Lane 5 resumption §2) are **reused as-is** — they're already locked. PR-A3 wires them into the Review-step branch for `inconclusive`/`requires_broker_confirm` outcomes; it does not author new copy.

`intendedServiceDateExplainer` (PR-A2, hash `62872b7c…35a7b2`) is already inserted at Review-step. No touch.

`serveTimeStaleFacialDatesGuardBlock` (hash `d6684b26…cbf4f96d`) ships with PR-B, not PR-A3.

### §5.5 Surface-as-fork triggers (§1.6 posture retained)

Engineer escalates rather than deciding if any of the following surface:

- §3.3 A(ii) fallback triggers (resolver latency > 2s p95, resolver side-effects Review-step can't own, address-shape normalization gap).
- Wizard-parity CI check fails and the delta is intentional (e.g., the wizard adds a new argument that Review-step can't cleanly source). Surface — I'll rule whether Review-step needs a new upstream capture step or the wizard rolls back.
- Playwright trace passes verify-la but never reaches la-packet delivery when called from Review-step (would mean the delivery gate has a wizard-session-only dependency that the chat-session path can't satisfy).
- Any Decision 2 surface I ratified in 2026-06-28/2026-06-29 needs to be changed to accommodate the chat-session caller. Surface — that's a Decision 2 amendment ruling, not a PR-A3 local edit.

---

## §6 — Sequencing (unchanged from omnibus §7)

1. **PR-A2** — merged (#114) per engineering status.
2. **PR-A3** — cleared to open per this ruling. Scope: §5 above.
3. **Env provisioning** — proceeding in parallel on my side (D2 authorization).
4. **Branch protection** — I toggle after env provisioning completes.
5. **§3.4 re-attestation + G14 §6** — engineering files, I countersign on receipt if mechanism matches as-built.
6. **PR-B** — starts on PR-A3 merge.
7. **PR-C** — starts on PR-B merge; I file prose within 24h of tag.
8. **Cron `0abb46c4`** — I edit this week for `eviction_filing_cover_sheet`.
9. **Phase 3c reconciliation** — engineering files within 1–2 weeks; I rule on receipt.

---

## §7 — Ops sidebar: `verify-branch-protection.mjs` commit posture

Engineering noted the helper is in the working tree but **untracked**. I want it landed. Commit it to `main` under `scripts/verify-branch-protection.mjs` with a two-line header comment:

```
// Verifies 17 Required guards on main per broker ruling 2026-07-01 §7.
// Invoked by broker to confirm 17/17 after §3.3 branch-protection toggle.
```

Land it on the same PR as PR-A3 or on a small dedicated ops PR — whichever is faster. If dedicated, don't wait on PR-A3.

---

## §8 — Attestation posture reminder

Per §4.10 / §4.11 / §4.12 (standing rules) and omnibus §8: execute/verify separation, pre-gate readiness vs gate-closure separation, closure-artifact mechanism claims match as-built rail. PR-A3's attestation packet (when it lands) must state the client-side rail-caller posture explicitly and cite this ruling §§2–4 as the mechanism basis. I will not countersign a PR-A3 attestation whose mechanism section reads as if `from-chat` calls the rail.

---

## §9 — Explicit non-changes

To prevent scope creep in PR-A3, the following are **out of scope** and any change to them is a §1.6 escalation:

- `lib/produce/laProduceClient.ts` (`runLaProduceSequence`) — untouched. Reuse only.
- `verify-la` route handler — untouched.
- `la-packet` route handler — untouched.
- Decision 2 produce-gate cross-check for `source === 'broker_confirm'` — untouched.
- `CachedResolverVerdict` schema — untouched.
- PR-A2 intendedServiceDate UI + validator — untouched; only *called* from new sites.
- G4 counsel hard-stop + riskpath insert — untouched behavior in `from-chat`.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
