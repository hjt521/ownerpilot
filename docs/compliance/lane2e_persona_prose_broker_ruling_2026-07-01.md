# BROKER RULING — Lane 2E Persona Capture-Turn Prose (Manifest Entries #5–#8)

**Re:** engineering status message, 2026-07-01, Lane 2E merged (#116, `main` at 72c6617). Persona.ts + manifest entries #5–#8 held pending broker prose ruling per `pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md` §4.3 and `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §6.
**Precedent (persona voice + register):** `persona_and_schema_lane3_broker_ratification_2026-06-29.md` §1 (first-turn conversational shape, `SENSITIVE FIELDS` anti-echo, `LANGUAGE` directive); `bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md` §2 (byte-stable v1 English, no templating, CI-guarded); `marketing_copy_compliance_polish_broker_ruling_2026-06-28.md` §§1.4/2.2/3/4 (banned-term posture, no legalese, no "empowering"-class filler); `banned_term_audit_broker_ratification_2026-06-29.md` (CI lint scope covers `lib/chat/persona.ts`).
**Precedent (schema shape):** `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §§2–3 (tri-state `DisputeAnswer`, wizard-parity SignerCapacity arity); `pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md` §4.1 (four field categories).
**Ruling authority:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Ruling date:** 2026-07-01
**Disposition:** All four capture-turn prose blocks **ratified verbatim as v1** and cleared to wire into `lib/chat/persona.ts`. Manifest entries #5–#8 authorized in the shape specified in §6 below. Persona.ts re-locks on Lane 2E's PR to close this ruling.

---

## §1 — Ratification posture

The four prose blocks below are **byte-stable v1 English**, ratified verbatim under the same posture as the bank-deposit disclosure copy (2026-06-18): no templating, no interpolation of the prose itself, no i18n mutation pipeline, no paraphrase at render time. Any future edit requires a new broker ruling and a version bump.

**Interpolation slots are permitted for owner-supplied values only** (address, capacity, service method, dispute question wording — nothing else) and MUST be enclosed in the `{{value_slot}}` convention already used in the codebase. Interpolation slot values themselves are not part of the locked prose; the surrounding wording is.

Spanish (ES) versions ship as `// PROVISIONAL — pending native review` in `lib/chat/persona.ts`, matching Lane 3's ratified pattern for `refusalBank.ts`. Native review is a separate ruling before the ES strings graduate off `PROVISIONAL`.

---

## §2 — `chat_intake_rent_periods_prompt` (manifest entry #5)

**Semantic role:** Persona capture turn for dated rent periods. The persona asks per-period start date, end date, and amount; repeats until owner says they've listed every period they intend to include in the notice.

### §2.1 First-ask (EN, v1 — ratified verbatim)

```
Now I need the specific date range for each rent period you want on the notice. For each one, I need the day the period started, the day it ended, and how much rent is owed for it. Let's do them one at a time — what's the start date of the earliest period you want on this notice?
```

### §2.2 Per-period follow-ups (EN, v1 — ratified verbatim)

After start date captured:
```
Got it. What's the end date of that period?
```

After end date captured:
```
And how much rent is owed for {{period_start_date}} through {{period_end_date}}?
```

### §2.3 Continuation / termination prompt (EN, v1 — ratified verbatim)

After each period's amount is captured:
```
That period is recorded. Is there another period you want to include on this notice, or is this everything?
```

Owner responses that mean "another one" (yes, add one, one more, there's another, etc.) → repeat §2.1's per-period start-date question with wording:
```
Okay — what's the start date of the next period?
```

Owner responses that mean "that's everything" (no, that's it, done, nothing else, etc.) → persona proceeds to the next capture turn.

### §2.4 Guardrails (persona-side, not owner-facing)

- Persona MUST NOT accept a period with a start date after its end date. If the owner provides a start date later than the end date, persona replies with: `That start date is after the end date you gave me. Can you double-check the dates for this period?`
- Persona MUST NOT accept a `rent_period` label as a substitute for dated periods. If the owner says "monthly" or "May 2026" without giving dates, persona replies with: `I need the actual start and end dates for that period — the notice has to show the exact date range, not just the month name.`
- Persona MUST NOT accept a rent amount ≤ 0. If the owner provides one, persona replies with: `That amount doesn't look right. What's the actual amount owed for {{period_start_date}} through {{period_end_date}}?`

### §2.5 ES provisional

```
// PROVISIONAL — pending native review
Ahora necesito el rango de fechas específico para cada período de renta que quieras incluir en el aviso. Para cada uno, necesito el día en que empezó el período, el día en que terminó, y cuánto se debe. Vamos a hacerlos uno por uno — ¿cuál es la fecha de inicio del período más antiguo que quieres incluir en este aviso?
```

Per-period follow-ups and continuation prompts translate structurally; the native reviewer authors the ES versions when they review.

---

## §3 — `chat_intake_signer_capacity_prompt` (manifest entry #6)

**Semantic role:** Persona capture turn for signer capacity and the individual-vs-entity landlord distinction. Uses the wizard's 4-value `SignerCapacity` enum verbatim per `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §3.

### §3.1 Capacity question (EN, v1 — ratified verbatim)

After `landlord_or_owner_name` is captured:

```
Thanks. One more thing about who's signing the notice — are you signing as the individual owner yourself, or on behalf of a company, LLC, or trust that owns the property?
```

### §3.2 Branch — individual owner (EN, v1 — ratified verbatim)

Owner indicates individual → persona replies:
```
Got it. The notice will show you signing in your own name as the owner.
```
No further capture on this turn. Proceeds to the next capture turn.

### §3.3 Branch — entity (EN, v1 — ratified verbatim)

Owner indicates a company / LLC / trust / partnership → persona replies:
```
Okay — I need a few details about the entity. What's the full legal name of the company, LLC, or trust that owns the property?
```

After entity name captured:
```
And what's your title or role with {{entity_name}}? For example: Manager, Managing Member, Officer, Trustee, or authorized agent.
```

After title captured, persona MUST confirm the capacity classification in plain English before locking it in:
```
So I'll record you as signing on behalf of {{entity_name}} in your role as {{title}}. Is that right?
```

Owner confirms → capacity locked to the wizard-ratified enum value that matches the title/role owner supplied. Persona proceeds to the next capture turn.

Owner corrects → persona re-asks §3.3 title question and re-confirms.

### §3.4 Guardrails (persona-side)

- Persona MUST NOT infer entity type from the entity name alone (e.g., "Acme Properties" → LLC). It asks explicitly.
- Persona MUST NOT accept a signer role that the owner cannot articulate. If the owner says "I don't know my title" or equivalent, persona replies with: `That's okay — I need to know your role because California law requires the signer's authority to be shown on the notice. If you're not sure, the person who set up the {{entity_type_owner_used}} — or your attorney — can tell you. I can pause here and you can come back when you have it.` Persona then routes to the pause/save-and-resume flow; does not proceed to next capture turn.
- Persona MUST NOT collapse the entity/individual distinction. If the owner's response is ambiguous ("I own it, but it's under an LLC"), persona replies with: `Just to be sure — is the property owned by you personally, or is it owned by the LLC and you're signing for the LLC? Those are two different signatures.`

The corporate-landlord ruling chain (`corporate_landlord_attorney_ruling_2026-06-04` through `_round_3_2026-06-05` and `defect_3_entity_signature_attorney_countersign_2026-06-05`) governs how the captured capacity renders on the notice face. Persona.ts does not restate those rules — it captures the input the ratified signature-block logic consumes.

### §3.5 ES provisional

```
// PROVISIONAL — pending native review
Gracias. Una cosa más sobre quién va a firmar el aviso — ¿vas a firmar como propietario individual tú mismo, o en nombre de una compañía, LLC, o fideicomiso dueño de la propiedad?
```

Branch prompts and confirmation lines translate structurally under native review.

---

## §4 — `chat_intake_personal_delivery_prompt` (manifest entry #7)

**Semantic role:** Persona capture turn for personal-delivery days and hours. Conditional — asked **only when** `preferred_service_method === 'personal'` (or whatever the wizard's ratified enum constant is for personal delivery on `main` at branch cut, per `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §4.4).

### §4.1 First-ask (EN, v1 — ratified verbatim)

After service method captured as personal delivery:

```
Because you're planning to serve this notice in person, California requires the notice to say when someone can hand a rent payment back to you — the days of the week and the hours of the day. What days of the week are you available to accept payment in person? For example: Monday through Friday, or specific days.
```

### §4.2 Hours follow-up (EN, v1 — ratified verbatim)

After days captured:

```
And during those days, what hours are you available to accept payment? I need a start time and an end time — for example, 9:00 AM to 5:00 PM.
```

### §4.3 Confirmation (EN, v1 — ratified verbatim)

After hours captured:
```
So the notice will say you can accept payment in person {{days_summary}}, from {{hours_start}} to {{hours_end}}. Is that right?
```

Owner confirms → capture locked. Persona proceeds.

Owner corrects → persona re-asks §4.1 or §4.2 depending on which value the owner is correcting.

### §4.4 Guardrails (persona-side)

- Persona MUST NOT accept a zero-day availability ("no days" / "I'm not available" etc.). If the owner says they're never available, persona replies with: `California law requires the notice to name real days and hours when a tenant can hand you a payment in person. If there truly are no days when you're available, you'll need to choose a different service method — either substituted service through someone else at the property, or posting-and-mailing. Want to change the service method?`
- Persona MUST NOT accept an hours range where end time is at or before start time. If it does, persona replies with: `Those hours don't add up — the end time needs to be later than the start time. Can you give me the actual hours again?`
- Persona MUST NOT convert AM/PM to 24-hour or vice-versa in owner-facing responses. Whatever format the owner uses, persona echoes back in that format.

### §4.5 ES provisional

```
// PROVISIONAL — pending native review
Como piensas entregar este aviso en persona, California requiere que el aviso indique cuándo alguien puede entregarte un pago de renta en mano — los días de la semana y las horas del día. ¿Qué días de la semana estás disponible para aceptar el pago en persona? Por ejemplo: de lunes a viernes, o días específicos.
```

Hours follow-up and confirmation translate structurally under native review.

---

## §5 — `chat_intake_preflight_dispute_prompt` (manifest entry #8)

**Semantic role:** Persona capture turn for the three preflight dispute questions. Uses the wizard's tri-state `DisputeAnswer = 'yes' | 'no' | 'unknown'` verbatim per `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §2. `'unknown'` is first-class; persona MUST offer it explicitly as an option and MUST NOT collapse it to `'no'`.

### §5.1 Framing (EN, v1 — ratified verbatim)

Persona introduces the three questions together, not one at a time, so the owner sees them as a set:

```
Before I put the notice together, I need to check three quick things with you. These affect whether a 3-day notice is the right tool for this situation, or whether you should talk to a lawyer first. For each one, tell me yes, no, or "not sure" — "not sure" is a real answer, so please use it if you don't know.
```

### §5.2 The three questions (EN, v1 — ratified verbatim)

Persona asks them in this order, one at a time, and MUST wait for a tri-state answer to each before moving to the next:

**Question 1 — amount:**
```
Question 1: Has the tenant told you they disagree with the amount you're claiming they owe — either the dollar amount, the period, or that anything is owed at all? Yes, no, or not sure?
```

**Question 2 — services / offset:**
```
Question 2: Has the tenant told you they're withholding rent because of something the property is missing or something you agreed to provide but haven't — utilities, repairs, appliances, a service, anything like that? Yes, no, or not sure?
```

**Question 3 — habitability:**
```
Question 3: Has the tenant told you the property has a serious habitability problem — no heat, no hot water, mold, pests, a code violation, anything they've raised as making the place unlivable? Yes, no, or not sure?
```

### §5.3 Tri-state parsing (persona-side, not owner-facing)

- Answers that mean "yes" (yes, yeah, yep, they did, they said so, correct, etc.) → `DisputeAnswer = 'yes'`
- Answers that mean "no" (no, nope, they haven't, never, they haven't said anything, etc.) → `DisputeAnswer = 'no'`
- Answers that mean "unknown" (not sure, I don't know, maybe, I think so but I'm not sure, they might have, I can't remember, etc.) → `DisputeAnswer = 'unknown'`

If the owner's answer is genuinely ambiguous (a long explanation without a clear yes/no/unknown), persona replies with: `I want to make sure I've got this right — for this question, is the answer yes, no, or "not sure"?` Persona MUST NOT infer a value; the owner must pick one of the three.

### §5.4 G4 trigger behavior (unchanged from Lane 2E schema ruling §2.1)

- Any `'yes'` on any of the three questions → G4 counsel hard-stop fires as ratified. Persona does NOT proceed to produce.
- `'unknown'` on any question → the wizard's ratified produce-gate treatment applies downstream. Persona proceeds to the next intake step; the mapper and gate handle the `'unknown'` value per wizard behavior. Persona does NOT add its own G4 fire on `'unknown'`.
- All three `'no'` → persona proceeds to produce (subject to remaining intake completeness).

### §5.5 Guardrails (persona-side)

- Persona MUST NOT paraphrase, shorten, or reorder the three questions.
- Persona MUST NOT combine two questions into one owner-facing turn.
- Persona MUST NOT drop the "yes, no, or not sure" trailing clause.
- Persona MUST NOT accept a fourth answer type (e.g., "sometimes"). If offered one, it re-asks per §5.3.

### §5.6 ES provisional

```
// PROVISIONAL — pending native review
Antes de armar el aviso, necesito verificar tres cosas rápidas contigo. Estas afectan si un aviso de 3 días es la herramienta correcta para esta situación, o si deberías hablar con un abogado primero. Para cada una, dime sí, no, o "no estoy seguro" — "no estoy seguro" es una respuesta real, así que úsala si no sabes.
```

Three questions translate structurally under native review. Native reviewer specifically confirms that the ES rendering of `'unknown'` preserves first-class semantics — do not accept a translation that renders `'unknown'` as a weaker/dismissible option.

---

## §6 — Manifest entries #5–#8 (locked shape)

Engineering wires the four entries into `locked_prose_manifest.json` in this shape (matching entries #1–#4's schema):

```json
{
  "entry_id": 5,
  "constant": "chatIntakeRentPeriodsPrompt",
  "tier": "A",
  "file": "lib/chat/persona.ts",
  "verbatim": "<the concatenated ratified strings from §2.1 + §2.2 + §2.3 + §2.4 in the exact order specified there>",
  "hash": "<SHA-256 of the concatenated verbatim string, UTF-8, computed by engineering>",
  "version_stamp": "v1",
  "source_determination": "lane2e_persona_prose_broker_ruling_2026-07-01.md",
  "source_section": "§2"
}
```

Entries #6, #7, #8 follow the same shape with constant names `chatIntakeSignerCapacityPrompt`, `chatIntakePersonalDeliveryPrompt`, `chatIntakePreflightDisputePrompt`, referencing sections §3, §4, §5 respectively.

**Hash computation posture:**
- Concatenate all the ratified strings in each section (§2/§3/§4/§5) in the order they're presented, using `\n\n` between top-level ratified blocks. Preserve `{{value_slot}}` markers verbatim in the hashed content (they are structural, not substitutable at hash time).
- Compute SHA-256 on UTF-8 bytes, no trailing whitespace, no BOM.
- The hash goes into the manifest entry. Any drift in a ratified string changes the hash; the guard fires.

Engineering surfaces to me if the concatenation convention is ambiguous for any specific section. This is a §1.6 escalation trigger.

**Banned-term CI lint scope:** all four persona.ts blocks are added to the lint's owner-facing scan scope per `banned_term_audit_broker_ratification_2026-06-29.md`. Lint runs on both EN and PROVISIONAL ES strings.

---

## §7 — Wiring closure

Engineering wires:

1. The four ratified prose blocks into `lib/chat/persona.ts` (EN + PROVISIONAL ES).
2. The four capture-turn call sites in the persona flow calling into the ratified blocks (no interpolation into the prose itself; owner-slot values only).
3. Manifest entries #5–#8 per §6.
4. Persona.ts re-locks (`locked_prose_guard` runs green on all 8 entries).
5. `intakeIsComplete()` recognizes the four new field categories per Lane 2E schema (already landed at 72c6617).
6. Existing 16/0 schema test + 12/0 closure gate test still green.

**No new tests required for the prose itself** beyond the manifest hash verification (locked_prose_guard already does that). The persona-flow tests (Lane 2E §4.5.2) already cover the four capture turns' branching behavior; those tests exercise the wired call sites, not the prose bytes.

**On close of §7 wiring**, PR-A3 §5.2 (Review-step client port) resumes on the merged Lane 2E base per `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §7.

---

## §8 — Attestation posture

Lane 2E's final attestation packet (when engineering files it) cites this ruling §§2–5 as the source of the four ratified capture-turn prose blocks; states verbatim in the "Deviations from parent ruling" subsection the tri-state `DisputeAnswer` treatment per `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §2 (already ratified — re-cite for the record); states the SignerCapacity 4-value enum reuse per §3 of that same ruling; and lists the four manifest hashes as evidence that the prose is byte-stable at v1.

I will not countersign the packet if:
- Any of the four ratified strings are edited, paraphrased, or reformatted in `persona.ts`.
- `'unknown'` collapses to `'no'` anywhere in the persona, mapper, or gate paths.
- The persona.ts render pipeline templates or i18ns any of the four blocks at runtime.
- The Spanish PROVISIONAL versions ship as ratified rather than PROVISIONAL.

---

## §9 — Non-changes

- Existing 4 manifest entries (#1–#4). Untouched.
- Persona system prompt §D framing, `SENSITIVE FIELDS` anti-echo rule, `LANGUAGE` directive. Untouched.
- Refusal bank (`lib/chat/refusalBank.ts`). Untouched.
- G4 counsel hard-stop trigger behavior. Untouched. Fires on any dispute `'yes'`; does not fire on `'unknown'` at the persona layer.
- Wizard's `SignerCapacity` and `DisputeAnswer` types. Untouched.
- Marketing / homepage copy. Untouched. This ruling is scoped to persona.ts only.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
