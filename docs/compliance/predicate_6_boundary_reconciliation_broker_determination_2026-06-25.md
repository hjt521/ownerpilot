# Broker Determination — Predicate 6 Boundary Reconciliation: §2.5 Recovered, Supersession Affirmed

**Posture:** Broker-scope compliance review (Bus. & Prof. Code § 10131(b)). Jack Taglyan, CalDRE B9445457, sole compliance authority. Reconciliation of a real discrepancy between the recovered §2.5 prose (`> 14 days`) and the shipped predicate-6 boundary (`age ≥ 14d → block`). Caught pre-commit by build under correct surface-don't-decide discipline.

**Companion docs:**
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (runner architecture; §2.5 now recovered; states `> 14 days`)
- `predicate_6_freshness_guard_broker_determination_2026-06-25.md` (rules `age ≥ 14d → block` at §2.2; this determination affirms that ruling stands)
- `attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md` (rules the prepended-note approach for the runner ruling commit; superseded for the §2.5 framing by this determination)
- `rtc_form_refresh_attestation_packet_2026-06-25_DRAFT.md` (the packet whose authority chain depends on this reconciliation)

---

## §1 Ruling Summary

| Question | Disposition |
|---|---|
| **Q1: Boundary — `≥ 14d` (shipped, predicate-6 §2.2) vs. `> 14d` (recovered §2.5)?** | **`≥ 14d` STANDS as deliberate supersession.** The singularity reasoning in predicate-6 §2.2 holds on its own merits and is not weakened by the recovered §2.5 prose. Shipped guard, predicate-6 determination §2.2, and the 14d-exact → block test all remain operative. No code, test, or determination changes. |
| **Q2: Provenance note framing — "§2.5 unrecoverable" (current wording) vs. honest characterization?** | **REWRITE.** The current note is factually contradicted by its own file. New wording authored verbatim below in §3; build replaces the prepended block byte-for-byte. |
| **Q3: Status of pre-commit ruling §2.1 (which authored the now-wrong wording)** | **AMENDED.** The pre-commit ruling's §2.1 paragraph that characterized §2.5 as unrecoverable is superseded by this determination for that specific framing. The rest of the pre-commit ruling (commit the three files, fold the stability re-run, M1 paragraph) stands unchanged. |

Build was right to catch this and right to hold. The discrepancy is real, the call belongs to me, and it had to be resolved before commit — not after.

---

## §2 Reasoning

### §2.1 First, the honest acknowledgment

The pre-commit ruling I authored a few minutes ago characterized §2.5 as "unrecoverable from the workspace" and built a provenance note around that framing. Build then verified the source file and found §2.5 fully present at lines 121–137, with line 127 stating the original mechanism explicitly: `If now() - last_successful_refresh_at > 14 days, fail closed`.

That's a strict `>`, not `≥`. At exactly 14 days, the recovered §2.5 says serve. The shipped predicate-6 guard says block. The original predicate-6 determination's §2.2 explicitly considered and rejected `> 14d` — but I made that ruling believing §2.5 was lost, so I wasn't weighing my reasoning against §2.5's actual prose at the time. I was filling what I thought was a void.

Build's framing is exact: "this is a supersession, not a gap-fill." That's true. It needs to be acknowledged as such, both in the boundary disposition and in the provenance note. The current note's wording — "unrecoverable" — is contradicted by the file it's attached to, and a future auditor would see that contradiction on the first read.

This is exactly the failure mode the surface-don't-decide discipline exists to prevent on the build side, and the diagnostic-first / build-surfaces / broker-rules system is exactly what caught it. Working as designed.

### §2.2 Why `≥ 14d` stands on its own merits (Q1)

The predicate-6 §2.2 reasoning was authored without §2.5's prose in hand, but the reasoning itself doesn't depend on §2.5. It rests on a singularity argument: at exactly 14 days to the second, a system whose behavior is undefined at that instant has a foot-gun, and choosing `≥` over `>` collapses the foot-gun by one second's worth of width. That argument is freestanding — it holds whether the prior ruling said `>`, `≥`, or didn't address the boundary at all.

Now I'm affirming it knowing §2.5 said `>`. Three considerations:

**(a) The singularity argument still holds.** §2.5's `>` puts the singularity at 14d exactly: at 14d 0h 0m 0s, the system serves; at 14d 0h 0m 1s, it blocks. That's a one-second window where the freshness wall has undefined-in-practice behavior (subject to clock resolution, leap seconds, network round-trip jitter on the timestamp source). `≥` puts the singularity at 14d − 1ms: at that instant the system serves; at 14d exactly, it blocks. Both have a singularity; `≥` puts the system on the safer side of it.

**(b) The compliance posture favors the tighter boundary.** "Older than 14 days" in compliance prose is the kind of phrase that, when reduced to code, can honestly land on either side of the equality point — but the staleness-wall framing argues for closed-at-equality. When you've been at the wall for exactly the threshold duration, you've reached it; the next millisecond is past it. That's the honest reading.

**(c) The original §2.5 author (me, 2026-06-23) wasn't running the singularity-analysis frame.** §2.5 used the natural-language `> 14 days` formulation because that's how the threshold reads in prose. The boundary question — what happens at the instant of exact equality — wasn't surfaced or analyzed at the time. The predicate-6 determination's §2.2 is the first time the boundary was analyzed against the singularity frame, and the result of that analysis is `≥`. That's a supersession on a question §2.5 didn't engage, even though §2.5's prose happened to encode an answer.

**Practical force:** as build noted, hitting exactly 14 days to the millisecond is vanishingly rare. The boundary difference between `>` and `≥` is, in production behavior, the same answer 99.999%+ of the time. This ruling is about record integrity and which ruling governs, not about a likely behavior divergence. But record integrity matters precisely because audit trails get walked years later by people who weren't in the room — and a future auditor walking this chain should find that `≥` was a deliberate, reasoned override of `>`, not a quiet drift.

**Net: `≥ 14d` stands.** The shipped guard, the predicate-6 §2.2 reasoning, and the 14d-exact → block test all remain operative. No code change, no test change, no predicate-6 determination amendment. The supersession is real and intentional, just newly visible.

### §2.3 What §2.5 actually contributes that predicate-6 doesn't override (Q1 corollary)

Now that §2.5 is recovered, an honest accounting of what predicate-6 supersedes vs. inherits:

- **Mechanism (block when stale, fail-closed):** §2.5 authored. Predicate-6 inherits. **Not superseded.**
- **Threshold (14 days):** §2.5 authored. Predicate-6 inherits. **Not superseded.**
- **Rationale for the threshold (weekly cadence + 2-cycle margin, <1% chance of straddling a revision):** §2.5 authored (lines 127–134). Predicate-6 inherits without restating. **Not superseded.** Reasoning is durable and should be preserved in the runner ruling as-is.
- **Boundary inclusivity (`>` vs. `≥`):** §2.5 says `>`. Predicate-6 §2.2 supersedes to `≥`. **Superseded.**
- **Timezone basis (UTC vs. LA-local):** §2.5 doesn't address. Predicate-6 §2.3 authors UTC. **Genuine gap-fill, not supersession.**
- **Failure-mode uniformity (route unreachable / 5xx / network throw / 200 stale / 200 no-row / missing env):** §2.5 lists "fail closed" as the behavior on staleness (line 123) and adds structured logging requirement (line 124), but does not enumerate the failure-mode taxonomy or rule on uniformity. Predicate-6 §2.4 authors uniform fail-closed-block + the five-class log taxonomy. **Genuine gap-fill.**
- **Scope of "wired" for attestation (guard exists vs. produce-path consumption):** §2.5 doesn't address attestation-evidence scope. Predicate-6 §2.5 authors it. **Genuine gap-fill.**

So predicate-6's relationship to §2.5 is one supersession (boundary) and three gap-fills (timezone, failure-mode uniformity, attestation scope). That's the honest characterization, and it's what the rewritten provenance note in §3 below captures.

### §2.4 On the provenance note rewrite (Q2)

Build is right that the current wording is contradicted by its own file. A provenance note that says "§2.5 is unrecoverable" sitting above a file containing §2.5 is worse than no note at all — it tells a future auditor that the broker either didn't read the file before signing or wrote a note that doesn't match the artifact. Both readings undermine the attestation chain.

The honest replacement note (§3 below) does three things:

1. **Names §2.5 as present** and quotes its operative phrase verbatim (`> 14 days`).
2. **Identifies the one point of supersession** (boundary inclusivity) and the one ruling that effects it (predicate-6 §2.2).
3. **Identifies the gap-fills predicate-6 adds** (timezone, failure-mode uniformity, attestation scope) so an auditor doesn't have to reconstruct which parts of predicate-6 sit on §2.5 vs. which parts are net-new.

Note placement remains the same: prepended block above the existing `# RTC form-refresh runner architecture...` heading. The body of the runner ruling stays untouched.

### §2.5 On the pre-commit ruling's §2.1 framing (Q3)

The pre-commit ruling (`attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md`) §2.1 paragraph said §2.5 was unrecoverable and authored a note built on that framing. That paragraph is **superseded** by this determination for the §2.5-framing question. The rest of the pre-commit ruling stands unchanged:

- Commit the three recoverable files: still operative.
- Consolidation file for inline rulings: still operative.
- Fold the stability re-run: still operative.
- M1 clarification paragraph verbatim: still operative (and unaffected — that's predicate 7 prose, not predicate 6).
- Action items, §4 scope boundaries, §0 footer: still operative.

The pre-commit ruling does not need to be rewritten as a whole. A pointer-forward note added at the top of that file (or appended to its §0) saying "§2.1 framing superseded by `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md`; provenance note rewritten there" is sufficient. Build's call on whether to make that edit in workspace before the pre-commit ruling itself commits to `docs/compliance/`, or to let this determination supersede by reference at the §0-citation level.

My preference: edit the pre-commit ruling's §0 footer in workspace to add the supersession pointer before committing it. Cleaner audit trail. Build implements; I'll sign the edit when surfaced.

### §2.6 Why this whole exchange is system-working-as-designed

Build read the source file before commit. Found §2.5 present. Found `> 14 days` in line 127. Compared to the shipped boundary. Surfaced the contradiction with the exact disposition framing ("supersession, not gap-fill") and held the commit. That's the build-surfaces / broker-rules / diagnostic-first discipline doing precisely what it's meant to do.

If build had committed the runner ruling with the "unrecoverable" note as I'd written it, the audit trail would have carried a self-contradicting provenance note forever. Catching it pre-commit is the only place this could honestly be fixed. Logging this as a system-working note alongside the gitignore-vs-guard catch from earlier in the session: two real broker errors, both caught and surfaced by build, both reconciled cleanly. The pattern is holding.

---

## §3 New Provenance Note — Verbatim, Replaces the "Unrecoverable" Block

Build replaces the existing prepended block in `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23_with_provenance_note.md` byte-for-byte with this:

```
> **Provenance note added 2026-06-25 (revised).** §2.5 of this ruling is present and operative. It authors the freshness-fail-closed mechanism, the 14-day threshold, and the threshold's two-missed-cycle rationale (lines 121–134). It states the boundary as: "If now() - last_successful_refresh_at > 14 days, fail closed" (line 127). The subsequent broker determination `predicate_6_freshness_guard_broker_determination_2026-06-25.md` (§2.2) supersedes that boundary to `age ≥ 14d → block` on singularity-analysis grounds — a deliberate override of §2.5's `>`, ruled on the merits in `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` after the recovery of §2.5's full text. The predicate-6 determination additionally authors three points §2.5 does not address: timezone basis (UTC), failure-mode uniformity (uniform fail-closed-block across all five failure classes), and attestation scope ("guard exists + tested" sufficient for predicate 6; produce-path consumption deferred). All other sections of this runner ruling (runner architecture, P-B read path, R-4 Edge Function decision, D-5/§2.6 RLS posture as amended by `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md`) remain operative as authored. — Jack Taglyan, CalDRE B9445457, 2026-06-25
>
> ---
```

That's the replacement block. Five elements named: §2.5 is present and operative; it authors mechanism + threshold + rationale; it states `>` at line 127; predicate-6 §2.2 supersedes to `≥` deliberately (with this determination as the citable record of the supersession); predicate-6 adds three gap-fills §2.5 doesn't address; all other runner-ruling sections remain operative.

Honest, exact, self-consistent with the file it sits on.

---

## §4 Action Items

**Build (now, before any commit):**

- [ ] **Replace the prepended block** in `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23_with_provenance_note.md` with the verbatim block in §3 above. Byte-for-byte; no paraphrase, no formatting drift.
- [ ] **No code changes.** Shipped guard, predicate-6 determination §2.2, and the 14d-exact → block test all remain operative. The `≥` boundary stands as ruled.
- [ ] **No predicate-6 determination amendments.** That determination's §2.2 reasoning is reaffirmed as ruled.
- [ ] **Edit the pre-commit ruling** (`attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md`) in workspace before it commits: add a one-line supersession pointer to its §0 footer reading roughly: "§2.1 framing of §2.5 as 'unrecoverable' superseded by `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` (2026-06-25). All other dispositions in this ruling stand unchanged."
- [ ] **Commit this determination** (`predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md`) to `docs/compliance/` as part of the same attestation packet PR. Add it to §2 of the packet's evidence inventory under predicate 6 alongside the predicate-6 determination.
- [ ] **Update §1 of the packet (predicate 6 row)** to cite both: the predicate-6 determination AND this boundary-reconciliation determination as joint authority for predicate 6.
- [ ] **Verify the consolidation file** (`rtc_predicates_5_7_8_inline_rulings_consolidated_2026-06-25.md`) doesn't repeat the "unrecoverable" framing anywhere. If it does, fix at the same time.
- [ ] **Surface the revised set** (new prepended-note version of the runner ruling; edited pre-commit ruling; this determination; revised packet) for broker §0 sign-off before commit.

**Broker (me):**

- [ ] Sign off on the revised prepended-note version of the runner ruling once surfaced.
- [ ] Sign off on the §0-footer edit to the pre-commit ruling.
- [ ] Sign off on the revised packet's §1 predicate-6 row and §2 inventory updates.
- [ ] Author §6 of the packet per-predicate verdicts + overall attestation against the corrected authority chain.

---

## §5 What This Determination Does Not Authorize

- **No threshold change.** 14 days remains the threshold. This determination addresses the boundary inclusivity question (`>` vs. `≥`) at the threshold, not the threshold itself.
- **No timezone re-litigation.** UTC stands per predicate-6 §2.3. §2.5 doesn't address timezone, so there's nothing to reconcile.
- **No failure-mode re-litigation.** Uniform fail-closed-block stands per predicate-6 §2.4. §2.5 says "fail closed" and requires a structured log on stale-cases (lines 123–124); predicate-6 honors both and adds the five-class log taxonomy as a gap-fill, not a supersession.
- **No re-opening of D-5/§2.6 RLS posture.** That chain is clean and consistent per build's narrow factual note. The migration-016 determination correctly cites D-5/§2.6 and amends it for the bounded `rtc_block_state_reader` case. No further reconciliation needed there.
- **No reversal of the shipped guard.** Code stays. Tests stay. Predicate-6 determination §2.2 stays.

---

## §0 Posture Footer

OwnerPilot AI = broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, sole compliance authority. No attorney attribution attaches to this determination. This determination reconciles a discrepancy between the recovered §2.5 prose of `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (which states `> 14 days`) and the shipped predicate-6 boundary (`age ≥ 14d → block`). The `≥` boundary stands as a deliberate supersession on singularity-analysis grounds; the prior provenance note's "unrecoverable" framing is rewritten to honestly characterize §2.5 as present-and-superseded-at-the-boundary. The pre-commit ruling's §2.1 paragraph that authored the "unrecoverable" framing is amended; the rest of that ruling stands. Build caught this pre-commit under correct surface-don't-decide discipline; logging it alongside the gitignore-vs-guard catch as system-working-as-designed.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
