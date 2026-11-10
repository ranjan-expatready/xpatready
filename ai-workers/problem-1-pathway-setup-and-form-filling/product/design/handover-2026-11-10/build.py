#!/usr/bin/env python3
"""Assemble the handover page: head + main + appendix, capability table, fan-out figure."""
import html, re, sys, collections, os

caps_md, folder, out = sys.argv[1], sys.argv[2], sys.argv[3]

def clean(text):
    t = html.escape(text.strip(), quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    return t

rows, grid = [], collections.OrderedDict()
for line in open(caps_md, encoding='utf-8'):
    if not line.startswith('| C'):
        continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    cid, step, cap, m, status, tested = cells[:6]
    step = re.sub(r'\s*\(.*$', '', step)  # one row carries a note in its Step cell
    mkey = m.split(' ')[0].split('(')[0].strip()
    skey = {'Works': 'works', 'Partial': 'partial', 'Not built': 'notbuilt'}[status]
    grid.setdefault(step, collections.Counter())[skey] += 1
    rows.append(
        f'<tr data-m="{mkey}" data-s="{skey}"><td class="mono">{html.escape(cid)}</td>'
        f'<td>{html.escape(step)}</td><td>{clean(cap)}</td><td>{html.escape(mkey)}</td>'
        f'<td><span class="st st-{skey}">{html.escape(status)}</span></td>'
        f'<td class="mono dim">{html.escape(tested)}</td></tr>'
    )

grid_rows = []
for step, c in grid.items():
    total = sum(c.values())
    seg = ''.join(
        f'<span class="gseg g-{k}" style="flex:{c[k]}" title="{label}: {c[k]}"></span>'
        for k, label in (('works', 'Works'), ('partial', 'Partial'), ('notbuilt', 'Not built')) if c[k]
    )
    grid_rows.append(
        f'<tr><td>{html.escape(step)}</td><td class="num">{c["works"]}</td><td class="num">{c["partial"]}</td>'
        f'<td class="num">{c["notbuilt"]}</td><td class="num">{total}</td>'
        f'<td class="gcell"><span class="gbar" style="width:{total / 23 * 100:.1f}%">{seg}</span></td></tr>'
    )

# Figure 2: one fact fanning out to the boxes it fills (person.family_name, demo data 10 Nov 2026)
FAN = [('IMM 5406', 6), ('IMM 0008', 5), ('IMM 5707', 5), ('IMM 1344', 4), ('IMM 5646', 4),
       ('IMM 5562', 3), ('IMM 0008 DEP', 2), ('IMM 1294', 2), ('IMM 5257', 2), ('IMM 5476', 2),
       ('IMM 5532', 2), ('IMM 5669', 2), ('IMM 5710', 2), ('IMM 5257 SCH1', 1), ('IMM 5475', 1)]
assert sum(n for _, n in FAN) == 43 and len(FAN) == 15
svg = ['<svg viewBox="0 0 700 400" role="img" aria-label="Family name is asked once per person, stored as one fact, '
       'and fills 43 boxes on 15 IRCC forms.">',
       '<defs><marker id="f2a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
       '<path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>',
       '<rect class="bx" x="10" y="160" width="150" height="80" rx="4"/>',
       '<text class="t" x="22" y="185">Family name</text>',
       '<text class="s" x="22" y="205">asked once</text>',
       '<text class="s" x="22" y="221">per person</text>',
       '<path class="ar" d="M160 200H213" marker-end="url(#f2a)"/>',
       '<text class="m" x="187" y="192" text-anchor="middle">saved</text>',
       '<rect class="bx-a" x="215" y="160" width="170" height="80" rx="4"/>',
       '<text class="ma" x="227" y="185">person.family_name</text>',
       '<text class="s" x="227" y="205">one fact in the</text>',
       '<text class="s" x="227" y="221">shared library</text>']
for i, (form, n) in enumerate(FAN):
    y = 14 + 25 * i
    cy = y + 10
    svg.append(f'<path class="fan" d="M385 200C425 200 425 {cy} 462 {cy}"/>')
    svg.append(f'<text class="s" x="468" y="{cy + 4}">{form}</text>')
    for k in range(n):
        svg.append(f'<rect class="sq" x="{578 + 13 * k}" y="{cy - 5}" width="10" height="10" rx="1.5"/>')
    svg.append(f'<text class="m" x="690" y="{cy + 4}" text-anchor="end">{n}</text>')
svg.append('</svg>')

page = ''.join(open(os.path.join(folder, p), encoding='utf-8').read() for p in ('head.html', 'main.html', 'appendix.html'))
for ph in ('<!--CAPS_ROWS-->', '<!--GRID_ROWS-->', '<!--FIG_FANOUT-->'):
    assert page.count(ph) == 1, ph
page = (page.replace('<!--CAPS_ROWS-->', '\n'.join(rows))
            .replace('<!--GRID_ROWS-->', '\n'.join(grid_rows))
            .replace('<!--FIG_FANOUT-->', '\n'.join(svg)))
open(out, 'w', encoding='utf-8').write(page)
print(len(rows), 'capability rows;', len(page), 'bytes')
for step, c in grid.items():
    print(step, dict(c))
