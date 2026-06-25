# Broker Ruling — Attestation Packet Pre-Commit Disposition

**Posture:** Broker-scope compliance review (Bus. & Prof. Code § 10131(b)). Jack Taglyan, CalDRE B9445457, sole compliance authority. Ruling on three §4/§5 judgment calls before the RTC form-refresh attestation packet commits.

**Companion docs:**
- `rtc_form_refresh_attestation_packet_2026-06-25_DRAFT.md` (the packet being ruled on)
- `predicate_6_freshness_guard_broker_determination_2026-06-25.md` (committed; cited as predicate 6 operative authority)
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (uncommitted; runner architecture; §2.5 prose unrecoverable)
- `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` (uncommitted; M-1(ii) reader auth)
- `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` (uncommitted; migration 016 SELECT policy)

---

## §1 Ruling Summary

| Item | Disposition |
|---|---|
| **§4 — Uncommitted authority docs** | **COMMIT THE THREE RECOVERABLE FILES** to `docs/compliance/` as part of the attestation packet PR. Consolidate the three inline rulings (read-route interface + caller-auth gating; parity M1; UA-string fix) into one committed file. Commit the runner-architecture ruling **with a header note** flagging the unrecoverable §2.5 prose and pointing to the predicate-6 determination as operative authority for the freshness edges. |
| **§5.2 — M1 clarification wording** | **Authored verbatim below in §3.** Drop into the packet intro unchanged. Locked prose. |
| **§5.4 — Stability re-run** | **FOLD INTO PACKET COMMIT** as supporting predicate-7 evidence. Untracked operational evidence cited in an attestation packet must be in-repo at attestation time. |

---

## §2 Reasoning

### §2.1 On the uncommitted authority docs (§4)

The attestation packet is the document that authorizes flipping a production gate. Every authority it cites should be readable by a future reviewer (an auditor, the next broker review cycle, a successor compliance officer) **from the repo alone**, without needing to recover broker-side files from a chat history or workspace artifact directory that may not survive.

The three recoverable files —

- `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` (M-1(ii))
- `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` (migration 016)
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (runner architecture)

— all exist in the workspace and are cited as load-bearing authority for predicates 5, 6, 7, and 8. They commit to `docs/compliance/` alongside the predicate-6 determination, under the same naming pattern.

**Two cases are different and need handling:**

**Inline rulings with no standalone file** — the read-route interface ruling, the parity-mechanism M1 ruling, and the UA-string ruling were delivered as inline messages, not as files. Three options for these:

- (a) Author standalone files for each now, retroactively.
- (b) Cite them as broker-held-by-reference, with the conversation date + ruling-subject as the locator.
- (c) Author a single consolidated "Inline broker rulings — RTC predicates 5/7/8 supporting decisions" file that captures all three verbatim in one document.

**Ruling: (c).** A single consolidated file is the right answer because (a) is busywork that creates three thin files for what's really a sequence of micro-decisions, and (b) leaves the auditor chasing a ruling subject across an unrecoverable conversation surface. Build authors the consolidation file (just transcript-copy the three inline rulings into one markdown with clear headers), I review and sign off in the §0 posture, it commits to `docs/compliance/` as part of the attestation packet PR. Filename: `rtc_predicates_5_7_8_inline_rulings_consolidated_2026-06-25.md`.

**Runner-architecture ruling with unrecoverable §2.5 prose** — this one's the awkward case. The file exists and is broadly cited, but its §2.5 (the freshness mechanism prose) is unrecoverable. Committing it without a flag would let a future reviewer pull §2.5 and find prose that the predicate-6 determination implicitly supersedes for the freshness edges. The fix: commit the file with a **prepended note block** at the top of the file (not edits to the body) reading roughly:

> **Provenance note added 2026-06-25:** §2.5 prose of this ruling is unrecoverable from the workspace. The mechanism it describes (block when `last_successful_refresh_at` older than 14 days; fail-closed) is paraphrased-but-authoritative; the operative prose for boundary inclusivity (`age ≥ 14d → block`), timezone basis (UTC), failure-mode uniformity, and predicate-6 scope of "wired" lives in `predicate_6_freshness_guard_broker_determination_2026-06-25.md`. All other sections of this ruling (runner architecture, P-B read path, R-4 Edge Function decision) remain operative as authored. — Jack Taglyan, CalDRE B9445457, 2026-06-25

Build prepends that note as a block at the top of the file (above the existing `# ...` heading) and commits. I'll re-sign by including the prepended note's authorship line. Future reviewer sees the flag immediately and follows the pointer.

**Why not just leave the three files broker-held by reference for the whole packet?** Because an attestation packet whose authority chain dead-ends at "ask the broker for the file" is a fragile attestation. The packet should stand on its own. The three recoverable files commit; the inline rulings consolidate into one committed file; the runner ruling commits with the provenance note. After this packet PR, every authority the attestation cites is in `docs/compliance/`, readable by anyone with repo access.

### §2.2 On the M1 clarification wording (§5.2)

The §5.2 distinction is real and the packet should memorialize it cleanly — not bury it, not overclaim it. The wording I'd drop into the packet intro is in §3 below.

The key honesty constraint: "parity confirmed" is true *for the fetcher*, which is the part that matters for the form-refresh job's content correctness. Deployed-runtime parity (Deno's behavior matching Node's at the network layer) is a separate question, was an explicit fork during the build (M1 vs. M2), and was ruled M1 — broker-run Node/tsx fetcher-parity — as sufficient for predicate 7. The packet shouldn't pretend that question wasn't asked; it should memorialize the ruling that resolved it.

### §2.3 On the stability re-run (§5.4)

Fold into the packet commit. The rule is simple: **evidence cited in an attestation packet must be committed at attestation time.** Leaving it working-tree-only means the attestation cites evidence that doesn't exist in the repo's view of the world — exactly the failure mode `git diff --exit-code`-style discipline exists to prevent.

The stability re-run is a second independent observation that the parity check is non-flaky (the 9/9 result wasn't a one-shot). That's load-bearing evidence for predicate 7 — without it, an auditor could ask "is the 2026-06-24T22:23:35Z run reproducible or was it a fluke?" and the packet would have no answer in-repo. With it committed, the answer is "yes, see the stability report."

Commit it alongside the original parity report at `docs/compliance/rtc_parity_report_2026-06-24_stability.txt`. Predicate 7's evidence row gets a second artifact pointer; §2 inventory adds the stability file under the same case-78 lineage.

---

## §3 M1 Clarification — Verbatim Wording for Packet Intro (LOCKED PROSE)

Drop this in as a standalone subsection in the packet intro (between the existing intro paragraph and §1, or as part of §5 scope notes — your call on placement, the prose itself is locked):

> **Predicate 7 parity scope (M1 ruling, 2026-06-24).** The 9/9 parity result attests that the fetcher code (the module that constructs requests, parses responses, and produces the canonical form output) behaves identically across all 9 LAHD URLs when run broker-side under Node/tsx. This was an explicit ruling — the M1 path — chosen over M2 (a gate-bypass leg that would have run the parity check through the deployed Deno-runtime Edge Function). M2 was rejected on gate-semantics-change grounds: routing parity through a gate-bypass would alter the gate's meaning to satisfy an attestation evidence step, which inverts the relationship between gate and evidence. M1 is the authorized parity-evidence path; deployed-Deno-runtime parity is verified separately at first cron-leg run post-go-live, which is operational evidence (not attestation evidence) and is captured in the post-flip monitoring window, not this packet. Predicate 7's attestation is therefore: **fetcher code parity, confirmed via broker-run Node/tsx against live LAHD URLs**, with deployed-runtime confirmation deferred to first production run per M1.

That paragraph is intentionally explicit about what "parity confirmed" means and what it doesn't mean. An auditor reading it knows exactly what evidence the predicate rests on.

---

## §4 Action Items

**Build (next, to finalize the packet):**

- [ ] **Commit the three recoverable authority files** to `docs/compliance/`:
  - `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` — straight copy from workspace
  - `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` — straight copy from workspace
  - `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` — **with the §2.1 provenance note prepended** as a block above the existing heading (verbatim from §2.1 above)
- [ ] **Author the inline-rulings consolidation file** `docs/compliance/rtc_predicates_5_7_8_inline_rulings_consolidated_2026-06-25.md` — transcript-copy the three inline rulings (read-route interface + caller-auth gating; parity-mechanism M1; UA-string fix) into one markdown with clear `## §1 / §2 / §3` section headers naming each ruling, the subject, the disposition, and the conversation date. Surface for broker §0 sign-off before commit.
- [ ] **Fold the stability re-run** `docs/compliance/rtc_parity_report_2026-06-24_stability.txt` into the same commit. Update §1 predicate-7 evidence row to list both the original and stability reports. Update §2 inventory.
- [ ] **Drop the M1 clarification paragraph** (§3 above) into the packet intro verbatim. Recommend placement: as a standalone `### Predicate 7 parity scope (M1 ruling, 2026-06-24)` block within §5 scope notes, right after item 2.
- [ ] **Update §4 of the packet** to reflect the new committed-authority state: all four files (three new + predicate-6 determination already committed + the consolidation file) now under "Committed in `docs/compliance/`," with the inline-rulings note now reading "consolidated and committed in [filename]." Remove the "broker-held / unrecoverable" bullets that are now committed.
- [ ] **Surface the revised packet** + the prepended-note version of the runner-architecture ruling + the consolidation file draft for broker review before commit.

**Broker (me, after revised packet surfaces):**

- [ ] Read the revised packet against this ruling.
- [ ] Read the consolidation file for §0 sign-off on the verbatim transcript-copy of the three inline rulings.
- [ ] Read the prepended note on the runner-architecture ruling for sign-off on the provenance flag.
- [ ] Author §6 per-predicate verdicts + overall attestation + §0 posture footer + CalDRE signature line. This is the only section I author wholesale; everything above stays build-authored evidence-index per the authoring boundary in the packet header.

**After packet commits:**

- [ ] Gate-flip PR (the separate one) for `rtcFormRefreshJobBuilt` only. LA production stays closed on the other two conditions per §5.1.

---

## §5 What This Ruling Does Not Authorize

- **No flip of `rtcFormRefreshJobBuilt` yet.** That happens in the separate gate-flip PR after broker §6 sign-off lands.
- **No changes to the predicate definitions themselves.** The packet attests against the eight predicates as ruled; this ruling is about authority-document hygiene and intro clarity, not about widening or narrowing what the predicates demand.
- **No batch commit of unrelated workspace authority docs.** Only the three named files commit; other workspace rulings (e.g. earlier broker determinations on geocode, holiday calendar, etc.) are out of scope for this attestation packet and don't need to land here.
- **No rewriting of the runner-architecture ruling's body.** The §2.5 prose stays unrecoverable; the prepended provenance note flags it without pretending to reconstruct it.
- **No inline ruling for the §5.2 wording changes.** The M1 paragraph in §3 is verbatim-locked; build drops it in unchanged.

---

## §0 Posture Footer

OwnerPilot AI = broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, sole compliance authority. No attorney attribution attaches to this ruling. This ruling commits three recoverable authority files (one with a prepended provenance note marking §2.5's boundary supersession by the predicate-6 determination) plus a consolidated inline-rulings file to `docs/compliance/`, folds the stability re-run into the packet commit as supporting predicate-7 evidence, and locks the verbatim M1 clarification paragraph for the packet intro. The attestation packet's authority chain after this PR will be fully readable from the repo alone; no authority is left broker-held-by-reference. Note: §2.1 of this ruling, which originally characterized §2.5 as 'unrecoverable,' is superseded by `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` after recovery of §2.5's full text from the runner architecture ruling. All other dispositions in this pre-commit ruling stand unchanged.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
