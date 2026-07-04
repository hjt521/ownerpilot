# GitHub connector operation lock — engineering

**Actor:** Claude Code (engineering)
**Operation:** Gate-2 Preview-side runbook execution (Step 0 advisor baseline → P1–P5 predicate walks → §4.1–§4.4 reconciliation → ordered teardown)
**Scope:** Preview-side only. No prod DB migrations, no branch-protection PATCH, no Vercel prod writes (all §4.13 broker-reserved).
**Refs touched:** none on GitHub (read-only helper checks against already-merged main; Supabase Preview reads/writes only)
**Expected duration:** single session
**Purpose:** produce gate2_preview_runbook_evidence_packet_2026-07-01.md per §3 of gate2_prerequisites_complete_2026-07-01.md
**Lock model:** single lock across whole sequence (§3.3 — no concurrent broker/user-machine writes expected)
**Started:** 2026-07-01T22:10Z
