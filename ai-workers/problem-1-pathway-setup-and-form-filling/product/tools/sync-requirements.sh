#!/usr/bin/env bash
# Rebuild the name-free, read-only copy of the team's newest requirement snapshot.
#   sources/drive-snapshot-YYYY-MM-DD-HHMM/  (Mac only, never pushed)
#   -> ai-workers/problem-1-pathway-setup-and-form-filling/domain/requirements-YYYY-MM-DD/
# Copies every .md and .json (manifest included), turns each .pptx into <name>.pptx.md (slide text only),
# and replaces personal names with roles or Client letters (AGENTS rule 5) from tools/requirements-names.txt.
# requirements-names.txt holds real names: it is in .gitignore and stays on the Mac.
# Usage: zsh|bash product/tools/sync-requirements.sh [path/to/sources/drive-snapshot-...]
# Never writes under sources/. Does not commit or push.
set -euo pipefail

TOOLS="$(cd "$(dirname "$0")" && pwd)"
P1="$(cd "$TOOLS/../.." && pwd)"
ROOT="$(git -C "$P1" rev-parse --show-toplevel)"
NAMES="$TOOLS/requirements-names.txt"

[ -f "$NAMES" ] || { echo "missing $NAMES (real-name list, kept on the Mac only)" >&2; exit 1; }

SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(ls -d "$ROOT"/sources/drive-snapshot-* 2>/dev/null | sort | tail -1 || true)"
fi
[ -n "$SRC" ] && [ -d "$SRC" ] || { echo "no sources/drive-snapshot-* found" >&2; exit 1; }
SRC="$(cd "$SRC" && pwd)"
SNAP="$(basename "$SRC")"
DATE="$(echo "$SNAP" | sed -E 's/^drive-snapshot-([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/')"
DEST="$P1/domain/requirements-$DATE"

case "$DEST" in "$P1"/domain/requirements-*) ;; *) echo "refusing target $DEST" >&2; exit 1;; esac
rm -rf "$DEST"
mkdir -p "$DEST"

python3 -I - "$SRC" "$DEST" "$NAMES" "$SNAP" <<'PY'
import re, sys, json, zipfile, html, pathlib
from collections import Counter

snap = sys.argv[4]
src, dest, names_path = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])

phrases, emails, teams, clients, surnames = [], [], [], {}, {}
phrase_roles = []
for line in names_path.read_text().splitlines():
    if not line.strip() or line.lstrip().startswith('#'):
        continue
    kind, match, repl = line.split('|', 2)
    if kind == 'phrase': phrases.append((match, repl))
    elif kind == 'email': emails.append((match, repl))
    elif kind == 'team': teams.append((match, repl))
    elif kind == 'client': clients[match] = repl
    elif kind == 'surname': surnames[match] = repl
    elif kind == 'role': phrase_roles.append(match)
    else: raise SystemExit(f'unknown kind in names file: {line}')

counts = Counter()
role_counts = Counter()
alt = lambda ws: '|'.join(re.escape(w) for w in sorted(ws, key=len, reverse=True))
W = r'(?<![\w-])(%s)(?![\w-])'   # whole word; a hyphen also counts as part of a word

def starts_sentence(text, i):
    j = i - 1
    while j >= 0 and text[j] in ' \t*_>#`"[(-':
        j -= 1
    return j < 0 or text[j] in '\n.!?|'

email_re = [(re.compile(r'(?<![\w.+-])' + re.escape(l) + r'@', re.I), f'client-{x.lower()}@') for l, x in emails]
team_re = re.compile(W % alt([t for t, _ in teams])) if teams else None
team_map = dict(teams)
first_letters = clients
full_re = re.compile(r'(?<![\w-])(%s)\s+(%s)(?![\w-])' % (alt(clients), alt(surnames))) if surnames else None
person_map = {**clients, **surnames}
person_re = re.compile(W % alt(person_map))

def clean(text):
    for a, b in phrases:
        n = text.count(a)
        if n:
            counts['phrase (paths, context cases)'] += n
            text = text.replace(a, b)
            for r in phrase_roles:
                if r in b and r not in a:
                    role_counts[r] += n
    for rx, rep in email_re:
        text, n = rx.subn(rep, text); counts['email addresses'] += n
    if team_re:
        def tr(m):
            counts['team member names -> roles'] += 1
            role = team_map[m.group(1)]
            role_counts[role] += 1
            return role[0].upper() + role[1:] if starts_sentence(m.string, m.start()) else role
        text = team_re.sub(tr, text)
    if full_re:
        def fr(m):
            counts['sample names -> Client letters'] += 1
            return 'Client ' + first_letters[m.group(1)]
        text = full_re.sub(fr, text)
    def pr(m):
        counts['sample names -> Client letters'] += 1
        return 'Client ' + person_map[m.group(1)]
    return person_re.sub(pr, text)

def pptx_text(p):
    out = [f'# {p.name} (slide text only)', '',
           f'Extracted from the binary {p.name}; layout, images and charts are not kept.', '']
    try:
        from pptx import Presentation
        for i, s in enumerate(Presentation(str(p)).slides, 1):
            out.append(f'## Slide {i}')
            for sh in s.shapes:
                if sh.has_text_frame:
                    out += [para.text for para in sh.text_frame.paragraphs if para.text.strip()]
                if getattr(sh, 'has_table', False) and sh.has_table:
                    for row in sh.table.rows:
                        out.append('| ' + ' | '.join(c.text.replace('\n', ' ') for c in row.cells) + ' |')
            out.append('')
    except ImportError:
        with zipfile.ZipFile(p) as z:
            slides = sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                            key=lambda n: int(re.search(r'(\d+)', n.rsplit('/', 1)[1]).group(1)))
            for n in slides:
                xml = z.read(n).decode('utf-8', 'replace')
                out.append(f'## Slide {re.search(r"(\d+)", n.rsplit("/",1)[1]).group(1)}')
                for para in re.findall(r'<a:p\b.*?</a:p>', xml, re.S):
                    t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', para))
                    if t.strip():
                        out.append(html.unescape(t))
                out.append('')
    return '\n'.join(out)

files = 0
for p in sorted(src.rglob('*')):
    if not p.is_file():
        continue
    rel = p.relative_to(src)
    if p.suffix in ('.md', '.json'):
        target, text = dest / rel, p.read_text(encoding='utf-8', errors='replace')
    elif p.suffix == '.pptx':
        target, text = dest / rel.with_name(rel.name + '.md'), pptx_text(p)
    else:
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(clean(text), encoding='utf-8')
    files += 1

letters = sorted(set(person_map.values()), key=lambda x: (len(x), x))
team_rows = '\n'.join(f'| team member | {r} | {n} |' for r, n in sorted(role_counts.items()) if n)
readme = f"""# Requirements {snap.split('-')[2]}-{snap.split('-')[3]}-{snap.split('-')[4]} (name-free copy)

Read-only copy of the team's requirement snapshot {snap} (captured {int(snap.split('-')[4])} {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(snap.split('-')[3])]} {snap.split('-')[2]}). Personal names replaced by roles or Client letters (AGENTS rule 5); the original stays on the Mac under sources/. Do not edit: refresh only with tools/sync-requirements.sh.

* Files: {files} (every .md and .json, manifest included; the .pptx is kept as its slide text in `<name>.pptx.md`, the binary is not copied).
* The original snapshot wins over this copy wherever a replacement changed meaning; ask the Lead to check `sources/` on the Mac.

## Name mapping

Team member names → roles: {counts['team member names -> roles']} replacements.
Sample names → Client {letters[0]}–{letters[-1]}: {counts['sample names -> Client letters']} replacements (same name, same letter, in every file; a full name "first last" becomes the first name's letter; a surname used alone has its own letter).
Personal email addresses → client-<letter>@<same domain>: {counts['email addresses']} replacements.
Names inside paths and context-specific lines (folder names, a team member named next to their role): {counts['phrase (paths, context cases)']} replacements.

| Who | Written as | Replacements |
|---|---|---|
{team_rows}
| sample client, family member or firm staff persona in examples | Client A, Client B, … Client {letters[-1]} | {counts['sample names -> Client letters']} |
| personal email address in examples | client-a@example.com style (domain kept) | {counts['email addresses']} |

Kept as written (not people): sample firm names (Maple, Maple Immigration, Maple Foods, Northern Foods, Northstar, Northwind, Acme), product and vendor names (Google, Microsoft, Stripe, Zoom, Jane, Calendly, Claude and others), law firms in citations (Norton Rose Fulbright, Gowling WLG), Victoria Day, the Mars/Phobos test value.
"""
(dest / 'README.md').write_text(readme, encoding='utf-8')
print(json.dumps({'files': files, **counts}, indent=1))
PY

echo "rebuilt $DEST from $SNAP"
echo "next: python3 product/tools/trace-requirements.py --refresh <previous requirements-* copy> $DEST (changed ids and the rows they hit, P-595)"
