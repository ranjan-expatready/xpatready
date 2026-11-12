#!/usr/bin/env python3
"""Map app files to the proposed modules (module-map.tsv) and measure, per merged APP PR, how many modules it touched
and which module pairs were touched together. Also lists every current app file per module (size, count).
Usage: module_span.py <repo> <studio rel path> <module-map.tsv> <app-flow.tsv>"""
import re, sys, os, subprocess, collections, csv
repo, studio, mm, af = sys.argv[1:5]
rules = [(l.split('\t')[0], re.compile(l.split('\t')[1].strip())) for l in open(mm) if l.strip() and not l.startswith(('#', 'module\t'))]
def mod(path):
    rel = path.split(studio + '/', 1)[-1]
    if rel.startswith('prisma/'): return 'schema (shared)'
    b = os.path.splitext(os.path.basename(rel))[0]
    if '/features/checkpoint/' in '/' + rel: return 'demo-data'
    if '/features/placement/' in '/' + rel: return 'library'
    for name, rx in rules:
        if rx.match(b): return name
    return 'UNMAPPED'
# current files
cur = collections.defaultdict(lambda: [0, 0]); unm = []
for d in ('api/src', 'engine', 'web/src', 'contracts', 'samples'):
    for root, _, fs in os.walk(os.path.join(repo, studio, d)):
        for f in fs:
            if not f.endswith(('.ts', '.tsx', '.json')): continue
            p = os.path.join(root, f); m = mod(p); n = sum(1 for _ in open(p, errors='replace'))
            cur[m][0] += 1; cur[m][1] += n
            if m == 'UNMAPPED': unm.append(p.split(studio + '/', 1)[1])
print('module\tfiles\tlines')
for k, v in sorted(cur.items(), key=lambda kv: -kv[1][1]): print(f'{k}\t{v[0]}\t{v[1]}')
print('unmapped:', unm[:30])
APP = re.compile(r'^' + re.escape(studio) + r'/(api/src|web/src|engine|prisma|contracts|samples|packages)/')
hs = {}
for l in subprocess.run(['git', '-C', repo, 'log', 'origin/main', '--first-parent', '--merges', '--since=2026-10-25', '--format=%H %s'], capture_output=True, text=True).stdout.splitlines():
    m = re.match(r'(\w+) Merge pull request #(\d+)', l)
    if m: hs[m.group(2)] = m.group(1)
span = collections.Counter(); pairs = collections.Counter(); per = collections.Counter(); schema = 0; n = 0
for r in csv.DictReader(open(af), delimiter='\t'):
    fl = subprocess.run(['git', '-C', repo, 'diff', '--name-only', f"{hs[r['pr']]}^1", hs[r['pr']]], capture_output=True, text=True).stdout.split()
    ms = {mod(f) for f in fl if APP.match(f)} - {'demo-data'}
    if 'schema (shared)' in ms: schema += 1
    ms.discard('schema (shared)')
    n += 1; span[min(len(ms), 5)] += 1
    for a in ms: per[a] += 1
    for a in ms:
        for b in ms:
            if a < b: pairs[(a, b)] += 1
print(f'app PRs {n}; modules touched per PR (demo-data and schema not counted):', dict(sorted(span.items())))
print('PRs touching prisma/schema.prisma:', schema)
print('app PRs per module:', per.most_common())
print('top module pairs:', pairs.most_common(12))

# --- second pass: hub files excluded, and the coarse three-stream view ---
HUBS = {'main', 'core', 'studio', 'validate', 'render', 'routes-data', 'App', 'api', 'utils'}
COARSE = {'structure': 'configurator', 'sources': 'configurator', 'library': 'configurator', 'questionnaire-design': 'configurator',
          'release': 'configurator', 'case-core': 'case-delivery', 'case-questionnaire': 'case-delivery', 'case-documents': 'case-delivery',
          'case-forms': 'case-delivery', 'case-submission': 'case-delivery', 'platform': 'platform', 'ai-gateway': 'platform'}
sp2 = collections.Counter(); spc = collections.Counter(); hubpr = collections.Counter(); coarse_pairs = collections.Counter()
for r in csv.DictReader(open(af), delimiter='\t'):
    fl = subprocess.run(['git', '-C', repo, 'diff', '--name-only', f"{hs[r['pr']]}^1", hs[r['pr']]], capture_output=True, text=True).stdout.split()
    app = [f for f in fl if APP.match(f)]
    for f in app:
        b = os.path.splitext(os.path.basename(f))[0]
        if b in HUBS: hubpr[b] += 1
    ms = {mod(f) for f in app if os.path.splitext(os.path.basename(f))[0] not in HUBS} - {'demo-data', 'schema (shared)', 'UNMAPPED'}
    sp2[min(len(ms), 5)] += 1
    cs = {COARSE[m] for m in ms}
    spc[len(cs)] += 1
    if len(cs) > 1: coarse_pairs[tuple(sorted(cs))] += 1
print('hub files: app PRs touching each:', hubpr.most_common())
print('modules per PR with hub files excluded:', dict(sorted(sp2.items())))
print('coarse streams per PR (configurator / case-delivery / platform), hubs excluded:', dict(sorted(spc.items())), coarse_pairs.most_common())
