import sys, os, re
a, b = sys.argv[1], sys.argv[2]
def steps(f):
    # keyed by the step's text before " — " (some packs name every step only "C10.1:"), numbered when repeated
    d, seen = {}, {}
    for l in open(f).read().splitlines():
        m = re.match(r"^(PASS|FAIL)\s+(.*?)(?: — |$)", l)
        if not m: continue
        k = m.group(2)[:120]; seen[k] = seen.get(k, 0) + 1
        d[f"{k} #{seen[k]}" if seen[k] > 1 else k] = m.group(1)
    return d
for f in sorted(os.listdir(a)):
    if not f.endswith(".out.txt") or not os.path.exists(os.path.join(b, f)): continue
    x, y = steps(os.path.join(a, f)), steps(os.path.join(b, f))
    ch = [f"[{k[:70]}] {x.get(k,'-')}→{y.get(k,'-')}" for k in sorted(set(x) | set(y)) if x.get(k) != y.get(k)]
    p = lambda d: f"{sum(v=='PASS' for v in d.values())}/{len(d)}"
    print(f"{f[:-8]:16} {p(x):>6} → {p(y):<6} {'same' if not ch else '; '.join(ch)}")
