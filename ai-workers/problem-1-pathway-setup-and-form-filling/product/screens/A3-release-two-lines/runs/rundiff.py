#!/usr/bin/env python3
"""Step-by-step: run folder A (base) vs run folder B, <pack>.out.txt each. usage: rundiff.py <base dir> <new dir>"""
import os, re, sys
STEP = re.compile(r"^(PASS|FAIL|HELD|WAIT)\s+(C[\d.]+(?:-[\w.]+)?\b[^—]{0,0})")
def steps(p):
    out = {}
    for l in open(p, encoding="utf8"):
        m = re.match(r"^(PASS|FAIL|HELD|WAIT)\s+(\S+(?:\s\S+)?)", l)
        if m:
            key = l.split(" — ")[0][6:].strip()[:160]
            out.setdefault(key, m.group(1))
    return out
a, b = sys.argv[1:3]; worse = 0
for f in sorted(set(os.listdir(a)) & set(os.listdir(b))):
    if not f.endswith(".out.txt"): continue
    x, y = steps(os.path.join(a, f)), steps(os.path.join(b, f))
    cnt = lambda d: f"{sum(v == 'PASS' for v in d.values())}/{len(d)}"
    ch = [(k, x.get(k, "-"), y.get(k, "-")) for k in list(dict.fromkeys([*x, *y])) if x.get(k) != y.get(k)]
    bad = [c for c in ch if c[1] == "PASS" and c[2] != "PASS"]; worse += len(bad)
    print(f"{f[:-8]:8} main {cnt(x):7} branch {cnt(y):7} " + ("; ".join(f"[{k[:70]}] {p}→{q}" for k, p, q in ch) or "no step changes"))
print(f"pass → not pass: {worse}"); sys.exit(1 if worse else 0)
