#!/usr/bin/env python3
"""Count each requirement module's own functional requirements (FRs).
An FR is a line that STARTS with the module's own id (e.g. 'AG-8-12', 'SA-1B-7'), after an optional
list dash, table bar or heading marks, strikethrough and bold. Withdrawn = struck through or the word
'Withdrawn' on the line. Usage: count_frs.py <module .md files...>  (prints a TSV)"""
import re, sys, os
print('module\tfr_live\tfr_withdrawn\tfile')
tl = tw = 0
for f in sys.argv[1:]:
    b = os.path.basename(f); m = re.match(r'(AG|SA)-0?(\d+)(B?)-', b)
    if not m: continue
    pre = f'{m.group(1)}-{int(m.group(2))}{m.group(3)}'
    live, wd = set(), set()
    for line in open(f, encoding='utf-8', errors='replace'):
        mm = re.match(rf'^\s*(?:[-*]\s+|\|\s*|#{{2,4}}\s+)?(~~)?\**({re.escape(pre)}-\d+[a-z]?)\b', line)
        if not mm: continue
        fid = mm.group(2)
        (wd if (mm.group(1) or re.search(r'\bWithdrawn\b', line[:200])) else live).add(fid)
    live -= wd
    tl += len(live); tw += len(wd)
    print(f'{pre}\t{len(live)}\t{len(wd)}\t{b}')
print(f'TOTAL\t{tl}\t{tw}\t')
