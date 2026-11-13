#!/usr/bin/env python3
"""Rough wait from a lane's PR comment asking for a nightly.yml dispatch to the next workflow_dispatch run (any branch).
Heuristic: comment matches 'dispatch|nightly.yml' AND a request word. Usage: dispatch_waits.py <comments.json> <nightly runs page json...>"""
import json, re, sys
from datetime import datetime
ts = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00'))
c = json.load(open(sys.argv[1])); runs = []
for f in sys.argv[2:]: runs += json.load(open(f)).get('workflow_runs', [])
disp = sorted(r['created_at'] for r in runs if r['event'] == 'workflow_dispatch')
asks = [x for x in c if re.search(r'(dispatch|nightly\.yml)', x['body'] or '', re.I) and re.search(r'(please|ask|need|request|could|can you|Question for the tech lead)', x['body'] or '', re.I)]
w = sorted((ts(n[0]) - ts(a['created_at'])).total_seconds() / 3600 for a in asks for n in [[d for d in disp if d >= a['created_at']]] if n)
print(f'nightly runs {len(runs)}, dispatched {len(disp)}; asks {len(asks)}; ask->next dispatch n={len(w)} median {w[len(w)//2]:.2f} h p90 {w[int(.9*len(w))]:.2f} h')
