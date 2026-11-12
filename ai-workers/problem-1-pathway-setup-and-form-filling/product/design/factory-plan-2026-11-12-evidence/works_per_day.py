#!/usr/bin/env python3
"""Capabilities reaching Works per IST day, from the git history of qa/CAPABILITIES.md on a ref
(each commit's full table is parsed; a row 'reaches Works' on the first commit where its status is
Works after not being Works; demotions counted too). Usage: works_per_day.py <repo> <ref> <since>"""
import subprocess, sys, re, collections
from datetime import datetime, timedelta, timezone
repo, ref, since = sys.argv[1:4]
F = 'ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/CAPABILITIES.md'
IST = timezone(timedelta(hours=5, minutes=30))
log = subprocess.run(['git', '-C', repo, 'log', ref, '--first-parent', '--reverse', f'--since={since}', '--format=%H %cI', '--', F], capture_output=True, text=True).stdout.split('\n')
prev = {}; up = collections.Counter(); down = collections.Counter(); first = {}; ever = set()
for l in filter(None, log):
    h, t = l.split(); day = datetime.fromisoformat(t).astimezone(IST).date()
    txt = subprocess.run(['git', '-C', repo, 'show', f'{h}:{F}'], capture_output=True, text=True).stdout
    cur = {}
    for row in txt.splitlines():
        m = re.match(r'^\|\s*(C\d+\.\d+)\s*\|[^|]*\|[^|]*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|', row)
        if m: cur[m.group(1)] = (m.group(2), m.group(3))
    for k, (ms, s) in cur.items():
        was = prev.get(k, ('', ''))[1]
        if s.startswith('Works') and not was.startswith('Works'):
            up[day] += 1
            if k not in ever: first[k] = day; ever.add(k)
        if was.startswith('Works') and not s.startswith('Works'): down[day] += 1
    prev = cur
fd = collections.Counter(first.values())
print('ist_day\tfirst_time_works\tall_to_works\tworks_to_lower\tnet')
for d in sorted(set(up) | set(down)):
    print(f'{d}\t{fd.get(d,0)}\t{up[d]}\t{down[d]}\t{up[d]-down[d]}')
st = collections.Counter(v[1].split()[0] if v[1] else '' for v in prev.values())
print('# final', dict(st), 'rows', len(prev))
