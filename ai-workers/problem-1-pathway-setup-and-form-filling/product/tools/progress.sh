#!/bin/bash
# Progress, counted (never estimated): capabilities per milestone by status, from qa/CAPABILITIES.md (status set only by
# the qa lane after testing). Used by the Lead's replies, PLAN.md and the Programme map. Usage: progress.sh [--md]
PH="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$PH/qa/CAPABILITIES.md" "$1" <<'EOF'
import re, sys, collections
names = {"M2": "M2 · Super Admin setup", "T": "R1 · thin runtime slice", "M3": "M3 · case, agent and client"}
order = ["Works", "Built, awaiting qa", "Partial", "Not tested", "Broken", "Not built"]
import os
built = {n[:-3] for n in os.listdir(os.path.join(os.path.dirname(sys.argv[1]), "built")) if n.endswith(".md")} if os.path.isdir(os.path.join(os.path.dirname(sys.argv[1]), "built")) else set()
c = collections.defaultdict(collections.Counter)
for line in open(sys.argv[1]):
    if re.match(r"^\| C\d", line):
        cells = [x.strip() for x in line.split("|")]
        st = cells[5].replace("*", "")
        # P-221: a builder marks a merged capability with qa/built/<ID>.md (one file each, so PRs never collide); qa deletes it when it re-scores
        if cells[1] in built and st != "Works": st = "Built, awaiting qa"
        c[cells[4]][st] += 1
md = len(sys.argv) > 2 and sys.argv[2] == "--md"
if md:
    print("| Milestone | Works | " + " | ".join(order[1:]) + " | Total |"); print("|---" * (len(order) + 2) + "|")
for m in ["M2", "T", "M3"]:
    n = sum(c[m].values()); w = c[m]["Works"]
    if md: print(f"| {names[m]} | **{w} of {n}** | " + " | ".join(str(c[m][s]) for s in order[1:]) + f" | {n} |")
    else: print(f"{names[m]}: {w} of {n} work ({100*w//max(n,1)}%) · " + " · ".join(f"{c[m][s]} {s.lower()}" for s in order[1:]))
EOF
