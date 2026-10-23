# Splits the v5 concept page and the form filling engine page into two problem documents (AIW-D216, 17 Oct 2026, Lead).
# Every v5 block moves verbatim; only the page headers and footers are new. Run once; the inputs are read from the archive.
import re, shutil, os
AW = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/'
ARC = '/Users/ranjansingh/Desktop/Xpatready/archive/ai-workers/'
V5 = ARC + 'expat-ready-ai-concept-v5-2026-10-17.html'
ENG = ARC + 'form-filling-engine-v1-2026-10-17.html'
P1 = 'problem-1-pathway-setup-and-form-filling.html'
P2 = 'problem-2-ai-across-case-and-business.html'

# 1. Archive first (never lose): v5 page, its builder and styles, and the engine page.
for src, dst in [(AW + 'expat-ready-ai-concept.html', V5), (AW + 'tools/build_concept_page.py', ARC + 'build_concept_page-v5-2026-10-17.py'),
                 (AW + 'tools/concept-page.css', ARC + 'concept-page-v5-2026-10-17.css'), (AW + 'form-filling-engine.html', ENG)]:
    if os.path.exists(src) and not os.path.exists(dst):
        shutil.copy2(src, dst)

t = open(V5).read()
def cut(a, b):
    i = t.index(a); j = t.index(b, i) if b else len(t)
    return t[i:j]
B = lambda ident, cls='': '\n<div class="' + cls + '" id="' + ident + '"'
head = t[:t.index('<body>')]
header = cut('<body>', '<div class="returnbar"')
returnbar = cut('<div class="returnbar"', '\n<section id="cover">')
cover = cut('\n<section id="cover">', B('part-a', 'part a'))
part_a = cut(B('part-a', 'part a'), B('part-b', 'part b'))
part_b = cut(B('part-b', 'part b'), B('shared', 'part sh'))
shared = cut(B('shared', 'part sh'), B('appendices', 'part ap'))
apx_head = cut(B('appendices', 'part ap'), '\n<div class="apgroup" id="apx-part-a"')
apx_a = cut('\n<div class="apgroup" id="apx-part-a"', '\n<div class="apgroup" id="apx-part-b"')
apx_b = cut('\n<div class="apgroup" id="apx-part-b"', '\n<div class="apgroup" id="apx-part-s"')
apx_s = cut('\n<div class="apgroup" id="apx-part-s"', '\n<section id="readiness">')
readiness = cut('\n<section id="readiness">', '\n<footer>')
footer_tail = cut('\n<footer>', None)
pieces = [header, returnbar, cover, part_a, part_b, shared, apx_head, apx_a, apx_b, apx_s, readiness, footer_tail]
assert head + ''.join(pieces) == t, 'blocks must cover v5 exactly'

# 2. The engine page, scoped so its styles cannot touch the v5 styles.
e = open(ENG).read()
css = re.search(r'<style>(.*?)</style>', e, re.S).group(1)
css = re.sub(r'--([a-z-]+)', r'--e-\1', css)
def scope(block):
    out = []
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', block):
        sels = []
        for s in sel.split(','):
            s = s.strip()
            if not s: continue
            if s.startswith(':root'): s = '.eng'
            elif s in ('*', 'body', 'main'): s = '.eng' if s != '*' else '.eng *'
            else: s = '.eng ' + s
            sels.append(s)
        out.append(','.join(sels) + '{' + body + '}')
    return '\n'.join(out)
scoped = []
pos = 0
for m in re.finditer(r'@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}', css):
    scoped.append(scope(css[pos:m.start()]))
    q = m.group(1)
    if 'prefers-color-scheme' in q:
        scoped.append('@media' + q + '{' + scope(m.group(2)) + '}')
    else:
        scoped.append('@media' + q + '{' + scope(m.group(2)) + '}')
    pos = m.end()
scoped.append(scope(css[pos:]))
eng_css = '\n'.join(x for x in scoped if x.strip())
eng_css += '\n.eng{background:var(--e-bg);color:var(--e-ink);border-radius:16px;padding:24px 20px;margin:0 0 32px;border:1px solid var(--e-line)}\n.eng h2.eng-title{font-size:1.7rem;border-top:none;margin-top:.2em;padding-top:0}'
body = re.search(r'<main>(.*?)</main>', e, re.S).group(1)
body = body.replace('<h1>', '<h2 class="eng-title">', 1).replace('</h1>', '</h2>', 1)
engine = ('\n<section id="engine-overview" class="eng" aria-label="Executive view: the form filling engine">' + body +
          '</section>')
head1 = head.replace('</head>', '<style>\n' + eng_css + '\n</style>\n</head>')

# 3. Headers and footers: the only new wording.
def hdr(eyebrow, h1, thesis, nav):
    h = header
    h = re.sub(r'<div class="eyebrow">.*?</div>', '<div class="eyebrow">' + eyebrow + '</div>', h, count=1)
    h = h.replace('<h1>Expat Ready AI</h1>', '<h1>' + h1 + '</h1>', 1)
    h = re.sub(r'<p class="thesis2">.*?</p>', '<p class="thesis2">' + thesis + '</p>', h, count=1)
    h = re.sub(r'<nav class="read-index"[^>]*>.*?</nav>', '<nav class="read-index" aria-label="Reading order">' + nav + '</nav>', h, count=1, flags=re.S)
    return h
h1 = hdr('Expat Ready AI · Problem 1 of 2 · v6: v5 split by problem, nothing cut · internal · 17 Oct 2026',
         'Pathway Setup and Form Filling',
         'Problem 1: set up each pathway once, ask each fact once, fill every form and portal. Problem 2, AI across the case and business, is in <a href="' + P2 + '">its own document</a>.',
         '<a href="#engine-overview">Executive view</a><a href="#cover">Cover</a><a href="#part-a">Part A</a><a href="#shared">Shared part</a><a href="#appendices">Appendices</a><a href="#readiness">Readiness</a><a href="' + P2 + '">Problem 2 →</a>')
h2 = hdr('Expat Ready AI · Problem 2 of 2 · parked as it is for a later discussion · internal · 17 Oct 2026',
         'AI Across the Case and Business',
         'Problem 2: one assistant with small, named skills across the case and the business. Kept exactly as in v5. The cover, the shared part (trust, money, risks, decisions, questions, words) and shared appendices S1–S4 are in the <a href="' + P1 + '">Problem 1 document</a>.',
         '<a href="#part-b">Part B</a><a href="#appendices">Appendices</a><a href="' + P1 + '">← Problem 1</a>')
note1 = ('<footer><span>Problem 1 document, v6 (AIW-D216): the v5 cover, Part A, the shared part, Part A and shared appendices and the readiness section, '
         'plus the form filling engine page as the executive view, moved unchanged on 17 Oct 2026. v5 is archived as archive/ai-workers/expat-ready-ai-concept-v5-2026-10-17.html; '
         'the engine page as archive/ai-workers/form-filling-engine-v1-2026-10-17.html. ')
note2 = ('<footer><span>Problem 2 document, v6 (AIW-D216): v5 Part B and its appendices, moved unchanged on 17 Oct 2026, parked for a later discussion. '
         'v5 is archived as archive/ai-workers/expat-ready-ai-concept-v5-2026-10-17.html. ')
f1 = footer_tail.replace('<footer><span>', note1, 1)
f2 = footer_tail.replace('<footer><span>', note2, 1)
doc1 = head1.replace('<title>', '<title>Problem 1: ', 1) if False else head1
doc1 = re.sub(r'<title>.*?</title>', '<title>Pathway Setup and Form Filling</title>', head1, count=1, flags=re.S)
doc2 = re.sub(r'<title>.*?</title>', '<title>AI Across the Case and Business</title>', head, count=1, flags=re.S)
doc1 += h1 + returnbar + engine + cover + part_a + shared + apx_head + apx_a + apx_s + readiness + f1
doc2 += h2 + returnbar + part_b + apx_head + apx_b + f2

# 4. Links between the two documents.
ids = lambda s: set(re.findall(r'\bid="([^"]+)"', s))
i1, i2 = ids(doc1), ids(doc2)
def relink(doc, mine, other, other_file):
    def fix(m):
        x = m.group(1)
        return m.group(0) if x in mine or x not in other else 'href="' + other_file + '#' + x + '"'
    return re.sub(r'href="#([^"]+)"', fix, doc)
doc1 = relink(doc1, i1, i2, P2); doc2 = relink(doc2, i2, i1, P1)
open(AW + P1, 'w').write(doc1); open(AW + P2, 'w').write(doc2)
dead = [(n, x) for n, d, mine in [(P1, doc1, i1), (P2, doc2, i2)] for x in re.findall(r'href="#([^"]+)"', d) if x not in mine]
print('written', len(doc1), len(doc2), 'dead in-page links:', dead[:10], len(dead))
