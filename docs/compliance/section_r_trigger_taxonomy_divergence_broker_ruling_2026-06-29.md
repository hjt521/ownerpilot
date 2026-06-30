# §R Trigger Taxonomy Divergence — Broker Ruling

**Filed:** 2026-06-29
**Scope:** Reconciliation of the two divergent 12-trigger enumerations that both claim to be canonical for `lib/riskpath/triggers.ts`.
**Status:** RULING — actionable, blocks `triggers.ts` from landing until executed.
**Relationship to existing artifacts:**
- Receives: §R amendment block pasted at 2026-06-29 17:15 PT (the block to be inserted into `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md`)
- Receives: engineering observation that `lib/riskpath/triggers.ts` was staged against a different 12-ID enumeration sourced from R&D-ruling §4
- Supersedes (in part): any reading of `master_prompt_section_R_amendment_2026-06-29.md` that treats the amendment's trigger names as authoritative without this reconciliation

---

## 1. The conflict in plain terms

Two documents in this workspace each claim to enumerate the canonical 12 counsel-route triggers. They share counts (12 triggers, 6 paths, 15 RiskPath enums, 5 disclaimers, 10 persona categories, 5 DB/Zod refusal enum values) and they share **two** trigger IDs (`bankruptcy_automatic_stay` at #11 and `tenant_death_or_successor` at #12, both promoted from PROPOSED_ADDITIONS per Lane 4 Fork 2). They disagree on the other **ten** trigger IDs.

### List A — §R amendment block (pasted today, 2026-06-29)

1. `protected_class_retaliation`
2. `disability_accommodation`
3. `domestic_violence_or_vawa`
4. `hud_section8_voucher_dispute` (excluded-tenancy bucket)
5. `mobilehome_or_sro` (excluded-tenancy bucket)
6. `commercial_tenancy` (excluded-tenancy bucket)
7. `criminal_activity_alleged`
8. `habitability_warranty_breach`
9. `partial_payment_acceptance_ambiguity`
10. `local_just_cause_overlay_conflict`
11. `bankruptcy_automatic_stay`
12. `tenant_death_or_successor`

### List B — what's coded in staged `lib/riskpath/triggers.ts` (per R&D-ruling §4)

1. `ud_case_filed`
2. `affirmative_defense_claimed`
3. `rent_amount_disputed`
4. `prohibited_agreement_terms`
5. `entity_landlord`
6. `party_represented_by_counsel`
7. `strategic_advice_requested`
8. `excluded_tenancy_category`
9. *(one slot not pinned in the engineering note — most likely a tenth member of the §4 enumeration; engineering to confirm at execution time)*
10. *(as above)*
11. `bankruptcy_automatic_stay`
12. `tenant_death_or_successor`

Only #11 and #12 are shared. Both lists are internally coherent. Both lists are 12 entries. Both lists route through the same `legal_advice` refusal enum without DB widening.

This is a genuine §0 fork: the two enumerations describe **different things**, not different names for the same thing. List A is a **subject-matter** taxonomy (what the tenant's situation is — protected class, disability, DV, criminal allegations, habitability defects, etc.). List B is a **procedural-posture** taxonomy (what stage and shape the legal matter is in — UD filed, defense raised, rent amount disputed, landlord is an entity, counsel involved, strategic advice sought).

A subject-matter trigger and a procedural-posture trigger are not interchangeable. A tenant raising a disability accommodation request (List A #2) is a different counsel-route signal than the same tenant being represented by counsel (List B #6). Both should probably route to broker review, but they route for **different reasons** and the broker needs the trigger ID to know which review packet to assemble.

## 2. Ruling

**Both lists are canonical for different layers. Neither supersedes the other. `triggers.ts` ships with a single unified taxonomy that is the union, deduplicated, and re-counted — not 12 entries, but the actual union count. The "12" surface count in the §R amendment is corrected to the unified count in the same PR that lands `triggers.ts`.**

### Why both, not one

List B (procedural posture) is what the production code needs to do its job. The chat path has to know whether a UD case is already filed (because that changes everything downstream — the chat must not coach on a filed case, broker review is mandatory) and whether counsel is already involved (because the chat must not interfere with represented parties). These are not subject-matter signals; they are state-of-the-matter signals. Dropping them to honor List A would create a compliance regression — the chat would lose its ability to detect "this tenant already has a lawyer" and would happily produce a notice anyway.

List A (subject matter) is what the broker review queue needs to triage. When a session is routed to broker review, the broker needs to know whether this is a disability accommodation question, a DV question, a habitability question, or a local-just-cause overlay conflict — because each one pulls a different review packet, cites different statutes, and has a different SLA. Dropping List A to honor List B would create a triage regression — every routed session would land in broker review with only a procedural label, and the broker would have to re-read the transcript to figure out the subject matter.

The §R amendment was authored from the triage / broker-review side of the system. The staged `triggers.ts` was authored from the production-detection side. Both authors did good work. Neither was wrong. They were enumerating **two orthogonal taxonomies that both feed the same routing decision**, and the surface count of "12" happened to land on each by coincidence.

### What ships

`lib/riskpath/triggers.ts` exports two named arrays and a unified type:

```ts
export const POSTURE_TRIGGERS = [
  'ud_case_filed',
  'affirmative_defense_claimed',
  'rent_amount_disputed',
  'prohibited_agreement_terms',
  'entity_landlord',
  'party_represented_by_counsel',
  'strategic_advice_requested',
  'excluded_tenancy_category',
  // engineering to confirm the remaining two posture IDs at execution time
  // against the R&D-ruling §4 enumeration; if §4 only enumerates 8 distinct
  // posture triggers plus the two shared promotions, POSTURE_TRIGGERS lands
  // at length 10 and the unified count adjusts accordingly
] as const

export const SUBJECT_TRIGGERS = [
  'protected_class_retaliation',
  'disability_accommodation',
  'domestic_violence_or_vawa',
  'hud_section8_voucher_dispute',
  'mobilehome_or_sro',
  'commercial_tenancy',
  'criminal_activity_alleged',
  'habitability_warranty_breach',
  'partial_payment_acceptance_ambiguity',
  'local_just_cause_overlay_conflict',
] as const

export const SHARED_TRIGGERS = [
  'bankruptcy_automatic_stay',
  'tenant_death_or_successor',
] as const

export const COUNSEL_ROUTE_TRIGGERS = [
  ...POSTURE_TRIGGERS,
  ...SUBJECT_TRIGGERS,
  ...SHARED_TRIGGERS,
] as const

export type CounselRouteTrigger = typeof COUNSEL_ROUTE_TRIGGERS[number]

export const TRIGGER_COUNT = COUNSEL_ROUTE_TRIGGERS.length
```

`TRIGGER_COUNT` is no longer `12`. It is `POSTURE_TRIGGERS.length + SUBJECT_TRIGGERS.length + SHARED_TRIGGERS.length`. Engineering reports the actual integer at PR time. The test that previously asserted `TRIGGER_COUNT === 12` is updated to assert the actual unified count and to additionally assert the three sub-array lengths so a future drift in either taxonomy is caught.

Both `POSTURE_TRIGGERS` and `SUBJECT_TRIGGERS` run as pre-flight gates before path selection (the §R amendment's pre-flight gate semantics extend to the union, not just the two promoted IDs). `SHARED_TRIGGERS` already run as pre-flight gates per Lane 4 Fork 2.

### What the §R block in the master prompt becomes

The §R amendment block is corrected before paste. The "Surface counts (LOCKED)" table changes the **Counsel-route triggers** row from **12** to the actual unified count, with a parenthetical: "(posture: N + subject: 10 + shared: 2 — `triggers.ts` is the SSOT, see `section_r_trigger_taxonomy_divergence_broker_ruling_2026-06-29.md`)".

The "Counsel-route triggers (12)" heading becomes "Counsel-route triggers (N)" and the body lists all three groups in order: posture first, subject second, shared last (#N-1 and #N). The numbered IDs preserve the §R amendment's IDs for #1–#10 of the subject group and for the two shared promotions; the posture IDs are inserted as #11 onward and the shared promotions are renumbered to the tail of the unified list.

Engineering produces the corrected §R block as part of the `triggers.ts` PR. The corrected block, not the originally pasted block, is what lands in `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md`.

### What `CATEGORY_TO_RR_TRIGGER` does

Lane 3's persona-category → trigger map (Lane 4 Fork 4 ruling) re-points at the unified `COUNSEL_ROUTE_TRIGGERS` SSOT. The keyword resolution rules from the §R amendment are preserved:

- bankruptcy keywords → `bankruptcy_automatic_stay` (shared)
- tenant-death / successor keywords → `tenant_death_or_successor` (shared)
- mobilehome / SRO / commercial / Section 8 keywords → the corresponding subject trigger (`mobilehome_or_sro`, `commercial_tenancy`, `hud_section8_voucher_dispute`) **not** the generic `excluded_tenancy_category` posture trigger

Resolution priority when a session matches both a posture trigger and a subject trigger: **both are recorded**. `riskpath_records.counsel_route_trigger` becomes a comma-separated list in the existing text column (no migration). The broker-review queue sorts by posture-trigger presence first (because posture triggers have a hard "do not produce" semantics) and surfaces all matched IDs in the review packet so triage can pick the right pack.

If only a posture trigger fires, the subject column is empty. If only a subject trigger fires, the posture column is empty. If neither fires but a shared trigger fires, only the shared ID is recorded. The text column convention is `posture:<id>;subject:<id>;shared:<id>` with empty segments omitted.

### What the DB/Zod refusal enum does

Unchanged. All counsel-route triggers — posture, subject, or shared — continue to route to the existing `legal_advice` refusal enum value when the chat refuses. The DB enum is not widened. The trigger ID is recorded separately in `riskpath_records.counsel_route_trigger`; the refusal-category enum is the user-facing taxonomy and remains the five values from §R.

### What the reservation-of-rights slot does

Unchanged. `RESERVATION_OF_RIGHTS_SLOT` remains inert with the `[BROKER ATTORNEY DRAFTING REQUIRED]` placeholder, flagged on every produce call. This is a separate §0 fork tracked elsewhere and not affected by this ruling.

## 3. Test coverage (LOCKED — supersedes §R amendment Test coverage section)

```ts
expect(POSTURE_TRIGGERS.length).toBe(N)            // engineering pins N at PR time
expect(SUBJECT_TRIGGERS.length).toBe(10)
expect(SHARED_TRIGGERS.length).toBe(2)
expect(TRIGGER_COUNT).toBe(POSTURE_TRIGGERS.length + 12)

// shared triggers run as pre-flight gates (Lane 4 Fork 2)
expect(isPreFlightGate('bankruptcy_automatic_stay')).toBe(true)
expect(isPreFlightGate('tenant_death_or_successor')).toBe(true)

// posture triggers run as pre-flight gates (this ruling, §2)
for (const t of POSTURE_TRIGGERS) {
  expect(isPreFlightGate(t)).toBe(true)
}

// subject triggers run as pre-flight gates (this ruling, §2)
for (const t of SUBJECT_TRIGGERS) {
  expect(isPreFlightGate(t)).toBe(true)
}

// CATEGORY_TO_RR_TRIGGER resolves with subject-priority for excluded tenancies
expect(CATEGORY_TO_RR_TRIGGER('bankruptcy keywords')).toBe('bankruptcy_automatic_stay')
expect(CATEGORY_TO_RR_TRIGGER('tenant died')).toBe('tenant_death_or_successor')
expect(CATEGORY_TO_RR_TRIGGER('Section 8 voucher')).toBe('hud_section8_voucher_dispute')
expect(CATEGORY_TO_RR_TRIGGER('mobilehome park')).toBe('mobilehome_or_sro')
expect(CATEGORY_TO_RR_TRIGGER('commercial lease')).toBe('commercial_tenancy')

// paths.ts unchanged
expect(DOCUMENT_PATHS.length).toBe(6)
expect(DOCUMENT_PATHS).not.toContain('payment_plan_breach')

// reservation-of-rights slot inert
expect(RESERVATION_OF_RIGHTS_SLOT.prose).toBe('[BROKER ATTORNEY DRAFTING REQUIRED]')
expect(RESERVATION_OF_RIGHTS_SLOT.emits).toBe(false)
```

## 4. Engineering execution checklist

1. Read this ruling in full.
2. Open the staged `lib/riskpath/triggers.ts` and confirm List B's actual member set — pin the two posture IDs marked `engineering to confirm` against R&D-ruling §4. Report the final `POSTURE_TRIGGERS.length` as `N` in the PR description.
3. Rewrite `lib/riskpath/triggers.ts` to export `POSTURE_TRIGGERS`, `SUBJECT_TRIGGERS`, `SHARED_TRIGGERS`, `COUNSEL_ROUTE_TRIGGERS`, `CounselRouteTrigger`, and `TRIGGER_COUNT` per §2 of this ruling.
4. Update `lib/riskpath/disclaimers.ts` — no surface changes; verify the 5 locked entries still resolve and `RESERVATION_OF_RIGHTS_SLOT` still emits inert.
5. Update `lib/riskpath/paths.ts` — no changes; verify the Payment Plan breach marker comment is intact.
6. Update Lane 3's `CATEGORY_TO_RR_TRIGGER` map per §2 (subject-priority for excluded tenancies; both posture and subject recorded when both fire).
7. Update tests per §3.
8. Rewrite the §R block in `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md` per §2 (Surface count corrected, three-group listing, cross-reference to this ruling).
9. Open the PR with title `lane5/riskpath: unify posture + subject + shared trigger taxonomy per §R taxonomy ruling`.
10. PR description includes the resolved `N`, the unified `TRIGGER_COUNT`, the test diff, the §R block diff, and a link to this ruling.
11. Broker countersigns before merge.

## 5. Why this matters for compliance

A counsel-route trigger is the chat's "I am refusing to produce a notice for a reason that has legal consequences" signal. If the trigger taxonomy is wrong — either too narrow (missing posture signals like "UD already filed") or too narrow in the other direction (missing subject signals like "disability accommodation") — the chat will produce notices it shouldn't, or it will route to broker review without the information the broker needs to triage. Both failure modes are compliance regressions that surface only after a tenant or court complains.

Picking one taxonomy and silently discarding the other would have produced exactly this regression. The §R amendment was authored in good faith from one viewpoint; the R&D-ruling §4 enumeration was authored in good faith from another. Reconciling them as a union — not as a winner — preserves both signals and keeps the chat's refusal behavior honest in both axes.

This is the kind of fork §0 exists to catch. Engineering surfaced it correctly. The paste was held until the ruling existed. That is the protocol working.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-29
