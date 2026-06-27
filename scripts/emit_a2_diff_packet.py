#!/usr/bin/env python3
"""
emit_a2_diff_packet.py — Workstream A-2 reconciliation diff emitter.

Implements the A-2 reconciliation discipline (Fork A-2 ruling §2.1 / §2.2 / §2.3),
invoked by the §2.4 construction rail (build_la_authoritative_zips.py step 13) on
first-construction (baseline = provisional set) and on every refresh (baseline =
prior snapshot). Produces the diff packet the broker reviews.

Dispositions:
  - ADD (in candidate, not in baseline)           → auto_apply           (A-2 §2.1)
  - REMOVE (in baseline, not in candidate)         → broker_review        (A-2 §2.2)
  - CORPUS-IMPACT REMOVE/ADD (touches a corpus-    → build_halt           (A-2 §2.3)
    load-bearing ZIP whose change would flip a
    v6 resolver corpus assertion)

A ZIP's "set membership" is the authoritative in∪straddler union (the set the
runtime resolver treats as in-City-universe). The candidate bucket (in/straddler/out)
is carried on each diff row for broker context.

Usage:
  python scripts/emit_a2_diff_packet.py \
    --baseline <snapshot.json | provisional cityOfLaZips.ts> \
    --candidate <snapshot.json> \
    --corpus-zips 90401,91343,90017,90044 \
    --out a2_diff_packet.json
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, re, sys


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_membership(path: str) -> tuple[set[str], dict[str, str]]:
    """Return (in∪straddler membership set, {zip: bucket}) for a snapshot JSON or a
    provisional .ts (the latter has no bucket info → all members tagged 'provisional')."""
    if path.endswith(".json"):
        d = json.load(open(path))
        bucket: dict[str, str] = {}
        for z in d.get("zips_in", []):
            bucket[str(z)] = "in"
        for s in d.get("zips_straddler", []):
            bucket[str(s["zip"])] = "straddler"
        return set(bucket), bucket
    # provisional TypeScript set: scrape 5-digit string literals
    members = set(re.findall(r"['\"](9[0-1]\d{3})['\"]", open(path, encoding="utf-8").read()))
    return members, {z: "provisional" for z in members}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--corpus-zips", default="", help="comma-separated load-bearing ZIPs")
    ap.add_argument("--out", default="a2_diff_packet.json")
    ap.add_argument("--baseline-label", default=None)
    args = ap.parse_args()

    base_set, _ = load_membership(args.baseline)
    cand_set, cand_bucket = load_membership(args.candidate)
    corpus = {z.strip() for z in args.corpus_zips.split(",") if z.strip()}

    adds = sorted(cand_set - base_set)
    removes = sorted(base_set - cand_set)

    def row(zip5: str, kind: str) -> dict:
        impacts = zip5 in corpus
        return {
            "zip5": zip5,
            "candidate_bucket": cand_bucket.get(zip5, "out"),
            "disposition": (
                "build_halt" if impacts
                else ("auto_apply" if kind == "ADD" else "broker_review")
            ),
            "corpus_impact": impacts,
        }

    add_rows = [row(z, "ADD") for z in adds]
    remove_rows = [row(z, "REMOVE") for z in removes]
    corpus_impact = [r for r in (add_rows + remove_rows) if r["corpus_impact"]]

    packet = {
        "artifact": "workstream_a_A2_diff_packet",
        "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ruling_reference": "workstream_a_fork_2_reconciliation_discipline_broker_ruling_2026-06-27.md (§2.1/§2.2/§2.3)",
        "baseline": {
            "label": args.baseline_label or args.baseline,
            "path": args.baseline,
            "sha256": sha256_of(args.baseline),
            "member_count": len(base_set),
        },
        "candidate": {
            "path": args.candidate,
            "sha256": sha256_of(args.candidate),
            "member_count": len(cand_set),
        },
        "summary": {
            "add": len(add_rows),
            "remove": len(remove_rows),
            "corpus_impact": len(corpus_impact),
            "add_auto_apply": sum(1 for r in add_rows if r["disposition"] == "auto_apply"),
            "remove_broker_review": sum(1 for r in remove_rows if r["disposition"] == "broker_review"),
            "build_halt": len(corpus_impact),
        },
        "outcome": (
            "BUILD_HALT — corpus-impact diff requires broker three-disposition review (A-2 §2.3)"
            if corpus_impact else
            ("NO_DIFF — auto-attest (A-2 §2.3)" if not add_rows and not remove_rows else
             "REVIEW — ADDs auto-applied; REMOVEs await broker review (A-2 §2.1/§2.2)")
        ),
        "add": add_rows,
        "remove": remove_rows,
        "corpus_impact_rows": corpus_impact,
    }
    json.dump(packet, open(args.out, "w"), indent=2)
    print(f"wrote {args.out}")
    print(f"  ADD={packet['summary']['add']} REMOVE={packet['summary']['remove']} "
          f"CORPUS_IMPACT={packet['summary']['corpus_impact']}")
    print(f"  outcome: {packet['outcome']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
