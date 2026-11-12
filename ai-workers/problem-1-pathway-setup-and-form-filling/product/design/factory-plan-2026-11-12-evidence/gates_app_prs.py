#!/usr/bin/env python3
"""Split each APP PR's open->merge time into serial stages, from GitHub REST data:
  build+own CI+review = created -> first 'Reviewer: Approve' comment
  approve -> label    = that comment -> first 'review: approved' label
  label -> merge      = LAST 'review: approved' label -> merged (queue wait + batch run + dequeues)
Also counts label removals (each one = a re-review loop). Sample: app PRs from flow_app_prs.py.
Usage: gates_app_prs.py <app-flow.tsv> <pulls.json> <comments.json> <events.json>"""
import csv, json, sys, re, collections
from datetime import datetime
af, pj, cj, ej = sys.argv[1:5]
ts = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00'))
app = {int(r['pr']): r for r in csv.DictReader(open(af), delimiter='\t')}
pulls = {p['number']: p for p in json.load(open(pj))}
appr = collections.defaultdict(list)
for c in json.load(open(cj)):
    n = int(c['issue_url'].rsplit('/', 1)[1])
    if n in app and re.search(r'Reviewer:\s*Approve', c['body'] or ''): appr[n].append(ts(c['created_at']))
lab = collections.defaultdict(list); unl = collections.Counter()
for e in json.load(open(ej)):
    n = e['issue']['number'] if e.get('issue') else None
    if n not in app: continue
    if e['event'] == 'labeled' and e['label']['name'] == 'review: approved': lab[n].append(ts(e['created_at']))
    if e['event'] == 'unlabeled' and e['label']['name'] == 'review: approved': unl[n] += 1
def q(a, k): a = sorted(a); return round(a[min(len(a) - 1, int(k * len(a)))], 2) if a else None
s1 = []; s2 = []; s3 = []; full = 0
for n in app:
    p = pulls[n]; c, m = ts(p['created_at']), ts(p['merged_at'])
    if appr[n] and lab[n]:
        a = min(appr[n]); l1 = min(lab[n]); ll = max(x for x in lab[n] if x <= m) if any(x <= m for x in lab[n]) else l1
        full += 1
        s1.append((a - c).total_seconds() / 3600); s2.append((l1 - a).total_seconds() / 3600); s3.append((m - ll).total_seconds() / 3600)
print('app PRs', len(app), 'with Approve comment and label', full)
for name, a in (('created->first Approve (build, own CI, review rounds)', s1), ('first Approve->first label', s2), ('last label->merged (queue, batch run, dequeues)', s3)):
    print(f'{name}: median {q(a,.5)} h, p75 {q(a,.75)}, p90 {q(a,.9)}, sum {round(sum(a),1)} h')
lr = [unl[n] for n in app]
print('label removals on app PRs:', sum(lr), 'PRs with >=1:', sum(1 for x in lr if x), 'with >=3:', sum(1 for x in lr if x >= 3))
# excess over the stage's mechanical floor: own CI after Approve ~1 h (full run p50 ~40-52 min), queue batch run 42 min (P-489)
ex2 = sum(max(0, x - 1.0) for x in s2); ex3 = sum(max(0, x - 0.7) for x in s3)
print(f'excess waiting beyond the mechanical floor: Approve->label {ex2:.0f} PR-h (n={len(s2)}, floor 1.0 h), label->merge {ex3:.0f} PR-h (floor 0.7 h)')
print('Approve->label over 3 h:', sum(1 for x in s2 if x > 3), 'of', len(s2))
