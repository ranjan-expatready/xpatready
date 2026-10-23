# Builds Solution 1 v2 "The configuration engine": Part A (7 executive slides) + Part B (detailed solution and requirements),
# the Excel requirements workbook from the same data, and the standalone prototype page. Lead, 17 Oct 2026.
import os, re, shutil, html, sys
sys.path.insert(0, os.path.dirname(__file__))
from s2_data import COMPONENTS, USE_CASES, STORIES, RULES, COND_RULES, NFRS, SCREENS
AW = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/'
ARC = '/Users/ranjansingh/Desktop/Xpatready/archive/ai-workers/'
DIR = AW + 'problem-1-pathway-setup-and-form-filling/'
OUT = DIR + 'solution-1-pathway-setup-to-form-filling.html'
XLSX = DIR + 'solution-1-requirements.xlsx'
PROTO = DIR + 'solution-1-prototype.html'
T = os.path.dirname(__file__) + '/'

# archive Solution 1 v1 once
V1 = ARC + 'solution-1-pathway-setup-to-form-filling-v1-2026-10-17.html'
if not os.path.exists(V1) and os.path.exists(OUT) and 'Solution 1 · v1' in open(OUT).read():
    shutil.copyfile(OUT, V1); print('archived Solution 1 v1')

base = open(ARC + 'pathway-setup-and-form-filling-v8-2026-10-17.html').read()
head = base[:base.index('<header class="top">')]
e = lambda s: html.escape(str(s))

def table(cols, rows, cls='req'):
    h = '<div class="tbl"><table class="%s"><thead><tr>%s</tr></thead><tbody>' % (cls, ''.join('<th>%s</th>' % e(c) for c in cols))
    for r in rows: h += '<tr>' + ''.join('<td>%s</td>' % c for c in r) + '</tr>'
    return h + '</tbody></table></div>'

comp = table(['#','Stage','Component','Does','Output','AI or code'], [(e(a),e(b),'<b>%s</b>'%e(c),e(d),e(f),e(g)) for a,b,c,d,ip,f,g in COMPONENTS])
uc = ''
for i,n,actor,trig,pre,main,alt,post in USE_CASES:
    uc += ('<div class="uc"><div class="uc-h"><b>%s</b> %s</div><div class="uc-g"><div><span>Primary actor</span>%s</div><div><span>Trigger</span>%s</div><div><span>Precondition</span>%s</div><div><span>Result</span>%s</div></div>'
           '<div class="uc-f"><div><span>Main flow</span><ol>%s</ol></div><div><span>Alternate and exception</span><ul>%s</ul></div></div></div>') % (
           e(i), e(n), e(actor), e(trig), e(pre), e(post), ''.join('<li>%s</li>'%e(s) for s in main), ''.join('<li>%s</li>'%e(s) for s in alt))
uc = '<div class="ucs">' + uc + '</div>'
st = table(['ID','Epic','Story','Acceptance criteria','Priority','Trace'],
           [(e(i),e(ep),e(s),'<br>'.join(('<b>%s</b>'%e(x.split(' ',1)[0]))+' '+e(x.split(' ',1)[1]) for x in a.split(' | ')),e(p),e(t)) for i,ep,s,a,p,t in STORIES], 'req stories')
ru = table(['ID','Area','Rule'], [(e(a),e(b),e(c)) for a,b,c in RULES])
co = table(['When','Then','For whom','Source'], [(e(a),e(b),e(c),e(d)) for a,b,c,d in COND_RULES], 'req mini')
nf = table(['ID','Area','Requirement'], [(e(a),e(b),e(c)) for a,b,c in NFRS])
sc = table(['Screen','Who','Shows','Actions','Configured here'], [('<b>%s</b>'%e(a),e(b),e(c),e(d),e(f)) for a,b,c,d,f in SCREENS])

exec_ = open(T + 's2_exec.html').read()
detail = open(T + 's2_detail.html').read()
journey = open(T + 'journey.html').read()
# journey after architecture; rendering section after "at case time"
detail = detail.replace('<section class="ds" id="b3">', journey.split('<section class="ds" id="bpop">')[0] + '<section class="ds" id="b3">', 1)
detail = detail.replace('<section class="ds" id="b14">', '<section class="ds" id="bpop">' + journey.split('<section class="ds" id="bpop">')[1] + '<section class="ds" id="b14">', 1)
detail = detail.replace('<a href="#b3">3 Read</a>', '<a href="#bj">Journey</a><a href="#b3">3 Read</a>', 1).replace('<a href="#b14">14 Case types</a>', '<a href="#bpop">Rendering</a><a href="#b14">14 Case types</a>', 1)
for k, v in {'{{COMPONENTS}}': comp, '{{USECASES}}': uc, '{{STORIES}}': st, '{{RULES}}': ru, '{{COND}}': co, '{{NFR}}': nf, '{{SCREENS}}': sc}.items():
    assert k in detail, k; detail = detail.replace(k, v)
exec_ = exec_.replace('<nav class="topnav">', '<nav class="topnav"><a href="solution-1-prototype.html">Working prototype</a>', 1)

css = open(T + 's2.css').read()
head2 = re.sub(r'<title>[^<]*</title>', '<title>Solution 1 · The configuration engine</title>', head, count=1).replace('</head><body>', '<style>' + css + '</style></head><body>', 1)
foot = '<footer class="docfoot">Solution 1, v2, October 2026 · Part A for decision, Part B for build · requirements also in <a href="solution-1-requirements.xlsx">solution-1-requirements.xlsx</a> · earlier versions archived · legal points unconfirmed, no counsel · immigration values confirmed by the immigration specialist</footer>'
open(OUT, 'w').write(head2 + exec_ + detail + foot + '</div></body></html>\n')
print('written', OUT, os.path.getsize(OUT))

# prototype page (from the Solution 1 v1 prototype fragment)
p = open(AW + 'tools/solution1-prototype.html').read()
v1css = re.search(r'css = """(.*?)"""', open(AW + 'tools/build_solution1.py').read(), re.S).group(1)
phead = re.sub(r'<title>[^<]*</title>', '<title>Solution 1 · Working prototype</title>', head, count=1).replace('</head><body>', v1css + '</head><body>', 1)
open(PROTO, 'w').write(phead + '<p style="margin:16px 0"><a href="solution-1-pathway-setup-to-form-filling.html">← Back to Solution 1</a></p>' + p + '</div></body></html>\n')
print('written', PROTO)

# Excel workbook
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
wb = Workbook(); wb.remove(wb.active)
def sheet(name, cols, rows, widths):
    ws = wb.create_sheet(name); ws.append(cols)
    for r in rows: ws.append([str(x) for x in r])
    for i, w in enumerate(widths, 1): ws.column_dimensions[chr(64 + i)].width = w
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='18222A')
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions
sheet('Components', ['ID','Stage','Component','Does','Input','Output','AI or code'], COMPONENTS, [6,9,22,50,40,40,18])
sheet('Use cases', ['ID','Name','Primary actor','Trigger','Precondition','Main flow','Alternate and exception','Result'],
      [(a,b,c,d,f,'\n'.join('%d. %s'%(i+1,s) for i,s in enumerate(g)),'\n'.join('- '+s for s in h),k) for a,b,c,d,f,g,h,k in USE_CASES], [7,26,22,22,26,60,40,26])
sheet('Stories', ['ID','Epic','Story','Acceptance criteria','Priority','Trace','Status'], [(a,b,c,d.replace(' | ','\n'),p,t,'To do') for a,b,c,d,p,t in STORIES], [7,18,50,60,9,16,9])
sheet('Business rules', ['ID','Area','Rule'], RULES, [7,14,90])
sheet('Conditional rules', ['When','Then','For whom','Source','Specialist sign-off'], [r + ('Pending',) for r in COND_RULES], [26,50,22,26,16])
sheet('Non-functional', ['ID','Area','Requirement'], NFRS, [8,16,90])
sheet('Screens', ['Screen','Who','Shows','Actions','Configured here'], SCREENS, [24,24,50,36,28])
wb.save(XLSX); print('written', XLSX)
