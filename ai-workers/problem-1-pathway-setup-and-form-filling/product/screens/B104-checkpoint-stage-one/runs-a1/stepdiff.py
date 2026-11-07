#!/usr/bin/env python3
"""Step-by-step comparison: the M3 plan's checkpoint baseline (packs-2026-11-06.md, main 50e47a6fd) vs a run folder of
<pack>.out.txt files (run-checkpoint.mjs). Prints, per pack, both counts and every step whose result changed.
usage: stepdiff.py <baseline.md> <run dir>"""
import os, re, sys

base_md, run = sys.argv[1], sys.argv[2]
STEP = re.compile(r"^(PASS|FAIL|HELD|WAIT)\s+(C[\d.]+-[\w.]+)")

def steps(lines):
    out = {}
    for l in lines:
        m = STEP.match(l.strip())
        if m: out.setdefault(m.group(2), m.group(1))
    return out

base, cur, sect = {}, None, False
for l in open(base_md, encoding="utf8"):
    if l.startswith("## "): sect = l.startswith("## Checkpoint pass"); cur = None; continue
    if sect and l.startswith("### "):
        name = l[4:].split(" — ")[0].strip()
        cur = {"C6.5 (whole pack)": "C6.5", "C6.5 (engine part)": None}.get(name, name)
        if cur: base[cur] = []
        continue
    if sect and cur: base[cur].append(l)
base = {k: steps(v) for k, v in base.items()}

worse = 0
for f in sorted(os.listdir(run)):
    if not f.endswith(".out.txt"): continue
    pack = f[:-8]
    now = steps(open(os.path.join(run, f), encoding="utf8"))
    b = base.get(pack, {})
    cnt = lambda d: f"{sum(v == 'PASS' for v in d.values())}/{len(d)}"
    changes = [(k, b.get(k, "-"), now.get(k, "-")) for k in sorted(set(b) | set(now), key=lambda s: [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]) if b.get(k) != now.get(k)]
    bad = [c for c in changes if c[1] == "PASS" and c[2] != "PASS"]
    worse += len(bad)
    print(f"{pack:16} base {cnt(b):7} now {cnt(now):7} " + ("; ".join(f"{k} {x}→{y}" for k, x, y in changes) or "no step changes"))
print(f"pass → not pass: {worse}")
sys.exit(1 if worse else 0)
