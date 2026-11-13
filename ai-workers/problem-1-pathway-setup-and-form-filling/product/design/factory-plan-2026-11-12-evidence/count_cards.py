#!/usr/bin/env python3
"""Count the team's requirement CARDS: lines that carry the team's own 'Status: Not built | Partly built | Built'
marker (each card is one headed, buildable unit with a decision trail). Distinct card ids per module where a card
heading names one. Usage: count_cards.py <module .md files...>"""
import re, sys, os, collections
print('module\tcards\tnot_built\tpartly_built\tbuilt\tfile')
T = collections.Counter()
for f in sys.argv[1:]:
    b = os.path.basename(f); m = re.match(r'(AG|SA)-0?(\d+)(B?)-', b)
    if not m: continue
    c = collections.Counter(); seen = set()
    for i, line in enumerate(open(f, encoding='utf-8', errors='replace')):
        s = re.search(r'Status:\s*\**\s*(Not built|Partly built|Built)\b', line)
        if not s: continue
        idm = re.search(r'\b((?:AG|SA)-\d+B?-\d+[a-z]?)\b', line)
        key = idm.group(1) if idm else f'line{i}'
        if key in seen: continue
        seen.add(key); c[s.group(1)] += 1
    n = sum(c.values()); T.update(c)
    print(f"{m.group(1)}-{int(m.group(2))}{m.group(3)}\t{n}\t{c['Not built']}\t{c['Partly built']}\t{c['Built']}\t{b}")
print(f"TOTAL\t{sum(T.values())}\t{T['Not built']}\t{T['Partly built']}\t{T['Built']}\t")
