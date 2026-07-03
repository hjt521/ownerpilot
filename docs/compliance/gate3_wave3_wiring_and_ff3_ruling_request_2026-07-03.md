# Gate-3 Wave-3 Wiring + FF-3 — Broker Ruling Request

**From:** Engineering (Claude Code), 2026-07-03
**To:** Broker of record
**Why:** Wave-3 pure gate logic is all built + tested (W6, FF-4, W4, W2, W3), but *wiring* those gates into the live flow — and starting Wave 4 — is blocked on decisions only the broker can make. Batching them so one ruling unblocks the whole remaining build. Each item has an engineering-recommended default; confirming the defaults is a valid ruling.

---

## Root cause (read first)
The omnibus productization lanes assume a **structured-intake + in-app document-generator** architecture. The as-built app is **chat-driven**: intake lives in `chat_sessions.intake_state` (free-text/jsonb), only `service_date` is a structured field, and there is **no in-app generator** for the cover sheet / POS / packet manifest (those were the broker's manual artifacts for the Clifton LIVE filing). Every decision below flows from this gap.

---

## Decision 1 — Authorize FF-3 (structured intake capture) — THE KEYSTONE
The gates I built (FF-4 FMR, W6 late-filing, W2 routing) and the Wave-4 §4.4 golden test all read fields that don't exist as structured intake: **`bedrooms`, `amount_of_rent_owed`, `just_cause`, `notice_type`**. The omnibus references "FF-3" as the lane that captures them, but FF-3 was never authorized.
- **Engineering recommendation:** Authorize **FF-3** = add these four fields to the intake schema + chat capture + a migration column set (or intake_state keys), so the gates have real inputs. Without it, every gate stays inert library code.
- **Broker rules:** ☐ Authorize FF-3 as recommended · ☐ Authorize with a different field set: __________ · ☐ Defer (gates stay inert) — reason: __________

## Decision 2 — In-app packet-manifest generator (W3 consumer)
W3 ships a disposition classifier (upload/retain/mail-only), but nothing in-app generates a packet manifest to consume it.
- **Engineering recommendation:** Authorize a small **packet-manifest generator lane** (renders a per-case manifest markdown using W3's classifier + W5's filenames). Otherwise W3 is a library with no caller.
- **Broker rules:** ☐ Authorize the generator lane · ☐ W3 classifier-only is sufficient for now (manifest stays a manual broker artifact) · ☐ Other: __________

## Decision 3 — Document generators + the W5 caller sweep
The W5 "caller sweep" (Convention A across cover-sheet / POS / manifest generators + the download-endpoint `Content-Disposition` bridge) assumes those generators exist. They don't — only the notice-PDF path and its owner-download filename exist.
- **Engineering recommendation:** Scope the W5 sweep to **what exists** now (the notice-PDF download bridge only) and treat cover-sheet/POS/manifest generators as **future lanes** (tie to Decision 2). Don't build a sweep across non-existent generators.
- **Broker rules:** ☐ Sweep = notice-PDF bridge only, defer the rest · ☐ Authorize building the cover-sheet/POS generators now (bigger scope) · ☐ Other: __________

## Decision 4 — W4 EFS capture write semantics
Migration 036 made `lahd_filing_records` **insert-only / append-mutable** ("a correction inserts a new row"). W4's EFS record capture adds `efs_record_number` to an existing filing — an update, not a new filing.
- **Engineering recommendation:** For EFS capture, **UPDATE the existing most-recent filing row** (it's enriching the same filing, not a correction), and keep the append-new-row convention only for actual filing corrections.
- **Broker rules:** ☐ Update-existing for EFS capture (recommended) · ☐ Always append a new row · ☐ Other: __________

## Decision 5 — W7 founding backfill (carried over)
No `chat_sessions` row exists for the portal-direct Clifton filing, so the DO-NOT-SERVE founding hold can't be backfilled against the NOT-NULL `case_id`.
- **Engineering recommendation:** The founding hold **stays as its countersign paper record**; the table governs future in-app cases.
- **Broker rules:** ☐ Paper record stands (recommended) · ☐ Later migration relaxing `case_id` to nullable for historical/paper holds · ☐ Other: __________

## Decision 6 — Wave-4 §4.4 integration test scope
The Clifton golden-path integration test (intake → FMR → notice → packet → hold) depends on Decisions 1–4.
- **Engineering recommendation:** Build Wave-4 **after** FF-3 (Decision 1) lands; scope it to the surfaces that exist post-FF-3 (the FMR-quantity assertion is already locked in the FF-4 test).
- **Broker rules:** ☐ Wave-4 after FF-3, real-surface scope (recommended) · ☐ Other: __________

## Decision 7 — Sequencing / posture (ties it together)
- **Engineering recommendation:** Treat **FF-3 + the packet-manifest generator as a foundation slice** that must precede the wave-3 wiring + wave-4 test. Approving Decisions 1–2 unblocks everything downstream; the pure gate PRs already merged are safe no-ops until wired.
- **Broker rules:** ☐ Approve foundation-first sequencing (recommended) · ☐ Other: __________

---

**If you just confirm all recommended defaults, I proceed as:** authorize FF-3 → wire FF-4/W6/W2 into produce → build the packet-manifest generator (consumes W3) → W4 EFS capture as update → Wave-4 golden test → W5 notice-PDF bridge. No further questions needed for that path.

— Engineering (Claude Code) · Wave-3 wiring + FF-3 ruling request · 2026-07-03
