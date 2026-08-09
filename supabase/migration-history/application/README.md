# Historical application migration provenance

This directory is an audit archive outside Supabase's active `supabase/migrations/` discovery path.

- `recovered-production-ledger/` preserves the exact SQL recovered from the Production migration ledger for historical application timestamp rows whose `statements` values remain available.
- `legacy-lettered/` preserves the repository's former unsupported letter-suffixed migration source files byte-for-byte.
- `UNRECOVERABLE_LEDGER_STATEMENTS.md` records the three retained Production timestamp rows whose ledger `statements` are NULL.

Active compatibility topology:
- ordinary historical application timestamp identities are represented by comment-only compatibility files after their canonical numeric migrations create the current state;
- historical 025a/025b/025c/032a effects are represented by their authoritative Production timestamp versions, not unsupported letter-suffixed versions;
- no historical application SQL in this archive is automatically discovered or replayed.
