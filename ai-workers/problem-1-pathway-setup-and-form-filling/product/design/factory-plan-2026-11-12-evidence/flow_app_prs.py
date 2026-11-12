#!/usr/bin/env python3
"""Join git-measured PR classes (conflicts_from_git.py output) with GitHub PR times (REST
/pulls?state=closed list saved as JSON) and report flow numbers for APP PRs only (P-500 sample).
Lines changed = app-folder lines (added+deleted) from git diff --numstat H^1 H.
Usage: flow_app_prs.py <repo> <prs.tsv> <pulls.json> <out prefix>"""
import csv, json, sys, subprocess, re, statistics as st, collections
from datetime import datetime, timedelta, timezone
repo, tsv, pj, out = sys.argv[1:5]
IST = timezone(timedelta(hours=5, minutes=30))
APP = re.compile(r'^ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/(api/src|web/src|engine|prisma|contracts|samples|packages)/')
pulls = {p['number']: p for p in json.load(open(pj))}
rows = [r for r in csv.DictReader(open(tsv), delimiter='\t')]
def ts(s): return datetime.fromisoformat(s.replace('Z', '+00:00'))
_, = [0]
merges = subprocess.run(['git', '-C', repo, 'log', 'origin/main', '--first-parent', '--merges', '--since=2026-10-25', '--format=%H %s'], capture_output=True, text=True).stdout
hfor = {}
for l in merges.splitlines():
    m = re.match(r'(\w+) Merge pull request #(\d+)', l)
    if m: hfor[int(m.group(2))] = m.group(1)
def applines(h):
    o = subprocess.run(['git', '-C', repo, 'diff', '--numstat', f'{h}^1', h], capture_output=True, text=True).stdout
    n = 0
    for l in o.splitlines():
        a, d, f = l.split('\t', 2)
        if APP.match(f) and a != '-': n += int(a) + int(d)
    return n
res = []
for r in rows:
    p = pulls.get(int(r['pr']))
    if not p or not p['merged_at'] or p['merged_at'] < '2026-11-01T18:30:00Z': continue
    c, m = ts(p['created_at']), ts(p['merged_at'])
    lines = applines(hfor[int(r['pr'])]) if r['class'] == 'app' else 0
    res.append(dict(pr=int(r['pr']), cls=r['class'], h=(m - c).total_seconds() / 3600, created=c, merged=m,
                    lines=lines, mom=int(r['merges_of_main']), conf=int(r['conflicted_merges']), branch=p['head']['ref']))
app = [x for x in res if x['cls'] == 'app']
def q(a, k): a = sorted(a); return round(a[min(len(a) - 1, int(k * len(a)))], 2) if a else None
with open(out + '-app-flow.tsv', 'w') as fh:
    fh.write('pr\tmerged_ist_day\topen_to_merge_h\tapp_lines\tmerges_of_main\tconflicted_merges\tbranch\n')
    for x in app: fh.write(f"{x['pr']}\t{x['merged'].astimezone(IST).date()}\t{x['h']:.2f}\t{x['lines']}\t{x['mom']}\t{x['conf']}\t{x['branch']}\n")
print('sample: merged PRs 2-12 Nov IST:', len(res), 'app:', len(app))
print('app open->merge h: median', q([x['h'] for x in app], .5), 'p75', q([x['h'] for x in app], .75), 'p90', q([x['h'] for x in app], .9))
print('app lines: median', q([x['lines'] for x in app], .5), 'p90', q([x['lines'] for x in app], .9), '>800:', sum(1 for x in app if x['lines'] > 800))
# per day
d = collections.defaultdict(list)
for x in app: d[x['merged'].astimezone(IST).date()].append(x)
print('day\tapp_merged\tmedian_h\tmedian_lines\twith_conflict')
for k in sorted(d): v = d[k]; print(f"{k}\t{len(v)}\t{q([x['h'] for x in v],.5)}\t{q([x['lines'] for x in v],.5)}\t{sum(1 for x in v if x['conf'])}")
# conflict cost, size matched
bands = [(0, 200), (200, 500), (500, 1000), (1000, 10**9)]
print('band\tn_noconf\tmed_h_noconf\tn_conf\tmed_h_conf\tn_mom_noconf\tmed_h_mom_noconf')
extra = 0
for lo, hi in bands:
    b = [x for x in app if lo <= x['lines'] < hi]
    nc = [x['h'] for x in b if x['mom'] == 0]; cf = [x['h'] for x in b if x['conf'] > 0]; mm = [x['h'] for x in b if x['mom'] > 0 and x['conf'] == 0]
    if nc and cf: extra += (st.median(cf) - st.median(nc)) * len(cf)
    print(f'{lo}-{hi}\t{len(nc)}\t{q(nc,.5)}\t{len(cf)}\t{q(cf,.5)}\t{len(mm)}\t{q(mm,.5)}')
print('size-matched extra hours on PRs with a real conflict (sum over bands of (median conf - median clean) x n_conf):', round(extra, 1))
# hour of day merges (IST)
hh = collections.Counter(x['merged'].astimezone(IST).hour for x in app)
print('app merges by IST hour:', [hh.get(i, 0) for i in range(24)])
hc = collections.Counter(x['created'].astimezone(IST).hour for x in app)
print('app PRs opened by IST hour:', [hc.get(i, 0) for i in range(24)])
