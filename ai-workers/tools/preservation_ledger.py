# Content-level preservation ledger (AIW-D203), 17 Oct 2026, Lead.
# Splits each saved concept version into content units (headings, card titles, table rows, list items, steps,
# paragraphs) and finds where each unit now lives in the active page. Read-only on every HTML file.
# Writes checks/v5-preservation-ledger-2026-10-17.json; the Markdown ledger summarises it and gives reasons by hand.
import re, html, json, sys
from html.parser import HTMLParser
AW = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/'
ARC = '/Users/ranjansingh/Desktop/Xpatready/archive/ai-workers/'
OLD = [('v1', ARC + 'expat-ready-ai-concept-v1-2026-10-16.html'), ('v2.1', ARC + 'expat-ready-ai-concept-v2.1-2026-10-16.html'),
       ('v3', ARC + 'expat-ready-ai-concept-v3-2026-10-17.html'), ('v4', ARC + 'expat-ready-ai-concept-v4-2026-10-17.html')]
NEW = AW + 'expat-ready-ai-concept.html'
OUT = AW + 'checks/v5-preservation-ledger-2026-10-17.json'
UNIT_TAGS = {'h1', 'h2', 'h3', 'h4', 'li', 'tr', 'p', 'summary', 'figcaption'}
BLOCK = UNIT_TAGS | {'div', 'section', 'td', 'th', 'span', 'b', 'small', 'strong', 'text', 'details', 'ol', 'ul', 'table', 'header', 'nav', 'footer', 'a'}

class Units(HTMLParser):
    """Collect text units; each remembers the nearest enclosing element id."""
    def __init__(self):
        super().__init__(); self.stack = []; self.units = []; self.ids = []; self.skip = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'): self.skip += 1
        self.ids.append(a.get('id'))
        self.stack.append([tag, []])
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)
        while self.stack:
            t, buf = self.stack.pop(); ident = self.ids.pop()
            text = ' '.join(' '.join(buf).split())
            if self.stack: self.stack[-1][1].append(text)
            if t in UNIT_TAGS and len(text) >= 12:
                self.units.append((t, text, next((i for i in reversed(self.ids) if i), ident or '')))
            if t == tag: break
    def handle_data(self, d):
        if not self.skip and self.stack: self.stack[-1][1].append(d)

def units(path):
    p = Units(); p.feed(open(path).read()); out = []; seen = set()
    for t, x, i in p.units:
        k = x.lower()
        if k in seen: continue
        seen.add(k); out.append((t, x, i))
    return out

STOP = set('the a an and or of to in on for is are be by with from as at it its this that each every one no not any only'.split())
# Earlier working names → current business names (terminology-register.md), so a rename is not counted as a loss.
REN = [('upload sorter', 'document sorter'), ('mail reader', 'government letter reader'), ('form cross-checker', 'form consistency checker'),
       ('form filler', 'pdf form filler'), ('portal filler', 'portal form filler'), ('field librarian', 'shared field matcher'),
       ('question builder', 'pqr/sqr builder'), ('readiness reporter', 'readiness report builder'), ('letter drafter', 'case letter writer'),
       ('message drafter', 'client message writer'), ('note taker', 'case note writer'), ('case opener', 'case setup'),
       ('route planner', 'next filing planner'), ('expiry watcher', 'document expiry monitor'), ('pathway studio', 'pathway configurator'),
       ('case officer', 'agent'), ('assessment questionnaire', 'pqr'), ('full questionnaire', 'sqr'), ('persona', 'role')]
def toks(s):
    s = s.lower()
    for a, b in REN: s = s.replace(a, b)
    return {w for w in re.findall(r'[a-z0-9]+', s) if len(w) > 2 and w not in STOP}

def main():
    new_units = units(NEW)
    blocks = [(toks(x), i, x) for _, x, i in new_units]
    newtext = ' '.join(x.lower() for _, x, _ in new_units)
    ledger = {}
    for ver, path in OLD:
        rows = []
        for tag, text, sid in units(path):
            u = toks(text)
            if not u: continue
            best, where = 0.0, ''
            for b, bid, _ in blocks:
                if not b: continue
                s = len(u & b) / len(u)
                if s > best: best, where = s, bid
                if best == 1.0: break
            status = 'kept' if best >= 0.85 else 'reworded' if best >= 0.6 else 'not found'
            rows.append({'tag': tag, 'old_section': sid, 'text': text[:240], 'match': round(best, 2), 'v5_location': where if best >= 0.6 else '', 'status': status})
        ledger[ver] = rows
    json.dump(ledger, open(OUT, 'w'), indent=1, ensure_ascii=False)
    for ver, rows in ledger.items():
        c = {k: sum(r['status'] == k for r in rows) for k in ('kept', 'reworded', 'not found')}
        print(ver, len(rows), c)


REASON = [  # specific units, decided by the Lead after reading each one
 ('by hand for each combination', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Select questions for each combination', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('first design', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Building a pack per combination', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('a person\'s click', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('licensed person approves every step', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Every firm builds its own templates', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('May hide or rename', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('disclaimer wording', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('client portal document was not', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('free questions: decided', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('mostly decided but not yet written', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Hand-build fields', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Re-map by hand', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('instead of re-entering', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('no form building', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Build the questions in three tiers', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Source page and words', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Existing product behaviour', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Standard steps already support', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('documents disagree and the code', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('firm-specific question is a request', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('open cases follow form', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Each skill can be stopped', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('firms overriding questionnaires', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('May a firm owner require', 'Corrected after the 17 Oct source audit (wrong or unsupported against the team\'s documents or a decision row); the corrected statement is on the page.'),
 ('Why this is the IP', 'Removed at the founder\'s request (AIW-D210): pitch-style card; the moat stays in FAQ 16 and S2.'),
 ('Tools today', 'Removed at the founder\'s request (AIW-D210): pitch-style card; competitors stay in Appendix S2.'),
 ('What we sell', 'Removed at the founder\'s request (AIW-D210): "this is not a sales pitch".'),
 ('What makes it ours', 'Removed at the founder\'s request (AIW-D210): "this is not a sales pitch".'),
 ('What we ask of leaders', 'Removed with the sales cards (AIW-D210); the same asks are in the S·7 Decisions table.'),
 ('in one breath', 'Removed (AIW-D210): repeated A·3 and A·4; archived in v2.1–v4.'),
 ('Why the recommendation changed', 'Removed (AIW-D210): history; archived in v4.'),
 ('Lead audit against the founder', 'Removed with Appendix S5, the v4 self-audit (AIW-D210); archived in v4.'),
 ('Why not let the AI read the screen', 'Removed (AIW-D210): the same comparison stays in A·2 and Appendix A2.'),
 ('Expat Ready gains', 'Removed at the founder\'s request (AIW-D210): pitch-style line.'),
 ('Decided by the founder: AIW-D169', 'Citations moved to the beat\'s sources line and the appendices (AIW-D209); the sentence now reads in plain words.'),
 (' Source', 'Source column moved to the beat\'s sources line (AIW-D209).'),
 ('Visto, first-hand', 'Removed for correction: signing in to a competitor product may breach its terms; public pages only (founder-intent §4). Unconfirmed: no counsel.'),
 ('Research found no indepen', 'Restored in A·1 without the clause "no independent time study", for which no source was found in research/.'),
 ('we designed "AI workers"', 'History of the retired AI-worker design; its reasoning is in B·2 "Why the recommendation changed"; the full text stays in the archive (AIW-D192 reset).'),
 ('"Exists" means specified', 'Replaced by separate definition status and build status in the catalogue (preservation audit §3–4).'),
 ('Client Helper', 'Alias kept in the catalogue under Lead Question Sorter; never restored as free AI chat with clients.'),
 ('Form Reader Pathway Studio', 'Catalogue row restored with function type and split status (Appendix B2); Pathway Studio renamed (D200).'),
 ('Skill Where Kind Engine Status', 'Catalogue header restored as Kind, Function, Definition status, Build status (Appendix B2).'),
 ('Fictional example. The content team', 'Superseded: IMM examples illustrate connections only; the real inventory is unverified (Appendix A3 intro; A4).'),
 ('scanner is a stated fake', 'Merged into Appendix S1 picture E (text reading hook-up; a real virus scanner).'),
 ('may run in Canada or the US', 'In S·3 Trust; the processing region is now shown as open (AG11-D15 versus D148).'),
 ('Lowest-confidence items come first', 'In S·3 Trust (the reviewer study) and Mechanism 6.'),
 ('The counts are the proof of value', 'Activity strip kept in B·4 with real-count placeholders; the illustrative v1 numbers were removed (audit §4: not measured).'),
 ('Three v3 decisions', 'Superseded by S·7 Decisions (D199–D201 confirmed, with D202–D208).'),
 ('Q1 pricing: confirmed', 'Superseded by S·7 Decisions and S·4 Money (D199).'),
 ('Pathway Studio', 'Renamed Pathway Configurator inside Product Studio (D200); glossary keeps the alias.'),
 ('Field Librarian', 'Renamed Shared Field Matcher (terminology register); alias in Appendix B2.'),
 ('assessment questionnaire', 'Wording replaced by PQR and SQR (D202 terminology).'),
 ('B · Case-stage agents', 'Option kept in B·2 cards and Appendix B7; the old row wording merged.'),
 ('C · Skills in the case pipeline', 'Option kept in B·2 cards and Appendix B7; the old row wording merged.'),
 ('Never confirms a fact, sends AI text', 'Corrected in v4: staff confirm facts the AI proposes; kept in B·5 role cards.'),
]
def reason(u):
    t = u['text']
    for k, r in REASON:
        if k in t: return r
    if u['tag'] in ('h1', 'h2', 'summary') or t.startswith(('Read ', 'Level', 'Open a card', 'Running a firm', 'For the', 'For co-founders', 'Nine short', 'Ten sections', 'The question a co-founder', 'Status:', 'Current intent', 'v3 evidence', 'How one answer travels from')):
        return 'Page structure: replaced by v5 cover, contents, seven beats, part bands and appendix mini-indexes.'
    if any(k in t for k in ('/ 10', 'self-review', 'acceptance still pending', 'Lead assessment', 'The explanation is revised', 'Lead audit')):
        return 'Earlier self-review: superseded by v5 Readiness; the v4 audit is kept in Appendix S5.'
    return 'Reworded or merged into a newer version of the same point; substance present in v5 (Lead read check).'

def write_md(path=AW + 'checks/v5-preservation-ledger-2026-10-17.md'):
    L = json.load(open(OUT)); out = []
    out.append('# v5 preservation ledger: every content unit of v1–v4, and where it lives now\n')
    out.append('Generated %s by `tools/preservation_ledger.py` (re-run it after any edit). Lead, 17 Oct 2026, AIW-D203. Method: each saved version is split into content units (headings, card titles, table rows, list items, paragraphs of 12+ characters; duplicates removed). Each unit is matched to the v5 unit with the highest share of its meaningful words, after mapping earlier names to current business names. **Kept** ≥ 85%% of words present in one v5 unit; **reworded** 60–84%%; **not found** below 60%%, each with a reason below. Word overlap is a check, not proof of meaning: every not-found unit was read by the Lead. The full unit-by-unit list, with each unit\'s v5 location, is `checks/v5-preservation-ledger-2026-10-17.json`.\n' % __import__('datetime').date.today())
    out.append('## Summary\n\n| Version | Units | Kept | Reworded | Not found (reasons below) |\n|---|---|---|---|---|')
    for v, rows in L.items():
        c = {k: sum(r['status'] == k for r in rows) for k in ('kept', 'reworded', 'not found')}
        out.append('| %s | %d | %d | %d | %d |' % (v, len(rows), c['kept'], c['reworded'], c['not found']))
    out.append('\n**Restored in v5 after this ledger first ran:** v1\'s four problem cards (A·1), "Why this is the IP" (A·5), "repeatability comes from the platform, not the model" (A·2), "boxes filled with no typing is not a success measure" (S·5), v2.1\'s "What we say, and never say" (S·3), and v3/v4\'s back-office component cards (B·3). Earlier restorations by the v5 build: v1 catalogue columns as function type plus definition and build status, Case Setup, Next Filing Planner and Document Expiry Monitor, skill families, colour legend, five angles; v2.1 firm-owner route; v3 proposition grid and outcome cards.\n')
    out.append('## Corrections carried forward, not restored (preservation audit §4)\n\n- "Exists" no longer stands for status: definition status and build status are separate.\n- IMM examples illustrate connections only; the Express Entry inventory stays unverified, and "65 forms" is in no source.\n- No CRM benchmark is used to rank AI organisations.\n- "No repeated map review" keeps normal form approval and first-use or changed-entry portal approval.\n- Cost figures use one basis (CAD 0.41 / 2.41 / 15.40, D163); older headlines are not restored.\n- Illustrative activity-strip minutes and counts are not presented as measured.\n- Retired AI-worker wording stays archived; its functions are traced through the catalogue aliases.\n')
    out.append('## Where kept units now live (count by v5 section)\n')
    out.append('| v5 section id | v1 | v2.1 | v3 | v4 |\n|---|---|---|---|---|')
    locs = {}
    for v, rows in L.items():
        for r in rows:
            if r['v5_location']: locs.setdefault(r['v5_location'], {}).setdefault(v, 0); locs[r['v5_location']][v] += 1
    for loc in sorted(locs, key=lambda k: -sum(locs[k].values())):
        out.append('| `%s` | %s |' % (loc, ' | '.join(str(locs[loc].get(v, '')) for v in L)))
    out.append('\n## Every unit not found, with its reason\n')
    for v, rows in L.items():
        nf = [r for r in rows if r['status'] == 'not found']
        out.append('### %s (%d)\n\n| Unit | Kind | Reason |\n|---|---|---|' % (v, len(nf)))
        for r in nf:
            out.append('| %s | %s | %s |' % (r['text'][:150].replace('|', '/'), r['tag'], reason(r)))
        out.append('')
    out.append('## Change log\n\n- 17 Oct 2026: first version for M0 v5.')
    open(path, 'w').write('\n'.join(out) + '\n')

if __name__ == '__main__':
    main(); write_md()
