#!/usr/bin/env python3
"""Break APP-PR conflicts (from conflicts_from_git.py) down by file, and compute Little's-law WIP.
Usage: conflict_breakdown.py <prs.tsv> <app-flow.tsv> <pulls.json>"""
import csv, sys, collections, json
from datetime import datetime
prs, af, pj = sys.argv[1:4]
app = {r['pr'] for r in csv.DictReader(open(af), delimiter='\t')}
rows = [r for r in csv.DictReader(open(prs), delimiter='\t') if r['pr'] in app]
fc = collections.Counter(); prs_with = 0; total_files = 0
for r in rows:
    fs = [f for f in r['conflict_files'].split(';') if f]
    if fs: prs_with += 1
    for f in fs: fc[f] += 1
print('app PRs', len(rows), 'with a real conflict', prs_with)
def grp(f):
    if f.startswith('ai-workers/problem-1-pathway-setup-and-form-filling/product/') or f.endswith('.md'): return 'records/docs'
    if f.startswith(('tests/', 'acceptance/', 'evidence/')): return 'tests'
    if f.startswith(('api/src/', 'web/src/', 'engine/', 'prisma/', 'contracts/', 'samples/')): return 'app'
    return 'other'
g = collections.Counter(); 
for f, n in fc.items(): g[grp(f)] += n
print('conflict file-hits by group:', dict(g), 'total', sum(fc.values()))
appf = [(f, n) for f, n in fc.most_common() if grp(f) == 'app']
tot = sum(n for _, n in appf); run = 0
print('app files with conflicts:', len(appf), 'hits', tot)
for i, (f, n) in enumerate(appf[:15]):
    run += n; print(f'  {f}\t{n}\tcumulative {run/tot:.0%}')
ts = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00'))
pulls = {str(p['number']): p for p in json.load(open(pj))}
iv = [(ts(pulls[p]['created_at']), ts(pulls[p]['merged_at'])) for p in app]
t0 = min(a for a, _ in iv); t1 = max(b for _, b in iv); H = (t1 - t0).total_seconds() / 3600
wip = sum((b - a).total_seconds() / 3600 for a, b in iv) / H
lam = len(iv) / H; W = sum((b - a).total_seconds() / 3600 for a, b in iv) / len(iv)
print(f"Little's law over {H:.0f} h: throughput {lam:.2f} app PRs/h ({lam*24:.1f}/day), mean time in system W {W:.2f} h, mean WIP L {wip:.2f} (check L = lam*W = {lam*W:.2f})")
