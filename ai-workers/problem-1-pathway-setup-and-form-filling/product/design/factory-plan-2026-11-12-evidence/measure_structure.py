#!/usr/bin/env python3
"""Measure the structure of a NestJS/Prisma/React code base (sizing only, no code copied).
Usage: python3 -I measure_structure.py <root> <api_src_rel> <prisma_dir_rel> <web_src_rel|-> <label>
Writes <label>-modules.tsv and prints a summary. Counts physical lines."""
import os, re, sys, statistics as st
root, api, prisma, web, label = sys.argv[1:6]
SRC = ('.ts', '.tsx')
TEST = re.compile(r'(\.test\.|\.spec\.|/__tests__/|/test/|/tests/|\.e2e\.)')
ROUTE = re.compile(r'@(Get|Post|Put|Patch|Delete|All|Head|Options)\(')
def files(base):
    for d, ds, fs in os.walk(base):
        ds[:] = [x for x in ds if x not in ('node_modules', 'dist', 'build', '.turbo', 'coverage')]
        for f in fs:
            if f.endswith(SRC): yield os.path.join(d, f)
def lines(p):
    with open(p, 'rb') as fh: t = fh.read().decode('utf-8', 'replace')
    return t, (0 if not t else len(t.splitlines()))
def pct(a, q):
    a = sorted(a); return a[min(len(a) - 1, int(q * len(a)))] if a else 0
out = []
apibase = os.path.join(root, api)
mods = {}
routes = ctrls = nestmods = 0
allsrc = []
for p in files(apibase):
    rel = os.path.relpath(p, apibase)
    top = rel.split(os.sep)[0] if os.sep in rel else '(top-level files)'
    t, n = lines(p)
    is_test = bool(TEST.search('/' + rel))
    m = mods.setdefault(top, dict(files=0, test=0, lines=0, maxl=0, routes=0, ctrl=0, nestmod=0))
    m['files'] += 1; m['lines'] += n
    if is_test: m['test'] += 1
    else:
        m['maxl'] = max(m['maxl'], n); allsrc.append((n, os.path.relpath(p, root)))
        r = len(ROUTE.findall(t)); m['routes'] += r; routes += r
        if '@Controller(' in t: m['ctrl'] += 1; ctrls += 1
        if re.search(r'@Module\(', t): m['nestmod'] += 1; nestmods += 1
models = 0
for d, ds, fs in os.walk(os.path.join(root, prisma)):
    if 'migrations' in d: continue
    for f in fs:
        if f.endswith('.prisma'):
            models += len(re.findall(r'^model\s+\w+', open(os.path.join(d, f)).read(), re.M))
with open(f'{label}-modules.tsv', 'w') as fh:
    fh.write('module\tfiles\ttest_files\tlines\tlargest_non_test_file\troutes\tcontrollers\tnest_modules\n')
    for k, v in sorted(mods.items(), key=lambda kv: -kv[1]['files']):
        fh.write(f"{k}\t{v['files']}\t{v['test']}\t{v['lines']}\t{v['maxl']}\t{v['routes']}\t{v['ctrl']}\t{v['nestmod']}\n")
sizes = [n for n, _ in allsrc]
print(f'[{label}] api: folders={len(mods)} files={sum(v["files"] for v in mods.values())} test_files={sum(v["test"] for v in mods.values())} lines={sum(v["lines"] for v in mods.values())}')
print(f'[{label}] api non-test files={len(sizes)} median_lines={st.median(sizes) if sizes else 0} p90={pct(sizes,.9)} max={max(sizes) if sizes else 0} over800={sum(1 for s in sizes if s>800)} over500={sum(1 for s in sizes if s>500)}')
print(f'[{label}] routes={routes} controllers={ctrls} nest_@Module={nestmods} prisma_models={models}')
fm = [v['files'] for k, v in mods.items() if k != '(top-level files)']
if fm: print(f'[{label}] files per folder: median={st.median(fm)} p90={pct(fm,.9)} max={max(fm)}')
print(f'[{label}] largest non-test api files:', sorted(allsrc, reverse=True)[:8])
if web != '-':
    ws = []; wt = 0; wl = 0; tops = {}
    for p in files(os.path.join(root, web)):
        rel = os.path.relpath(p, os.path.join(root, web)); t, n = lines(p); wl += n
        if TEST.search('/' + rel): wt += 1; continue
        ws.append((n, rel)); top = rel.split(os.sep)[0] if os.sep in rel else '(top)'; tops[top] = tops.get(top, 0) + 1
    s2 = [n for n, _ in ws]
    print(f'[{label}] web: non-test files={len(ws)} test files={wt} lines={wl} tsx={sum(1 for _,r in ws if r.endswith(".tsx"))} median={st.median(s2)} p90={pct(s2,.9)} max={max(s2)} over800={sum(1 for s in s2 if s>800)}')
    print(f'[{label}] web top folders:', sorted(tops.items(), key=lambda kv: -kv[1])[:25])
    print(f'[{label}] largest web files:', sorted(ws, reverse=True)[:6])
