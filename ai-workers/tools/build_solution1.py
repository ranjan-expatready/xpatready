# Builds Solution 1, "Pathway Setup to Form Filling" (replaces the Problem 1 document; v8 and earlier are archived, not appended).
# Inputs: tools/solution1-main.html (sections 1-7), tools/solution1-prototype.html (section 8), tools/solution1-open.html (section 9).
# Styles: the base styles of the archived v8 page plus the Solution 1 styles below. Lead, 17 Oct 2026.
import os, re, shutil
AW = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/'
ARC = '/Users/ranjansingh/Desktop/Xpatready/archive/ai-workers/'
OLD = AW + 'problem-1-pathway-setup-and-form-filling/pathway-setup-and-form-filling.html'
V8 = ARC + 'pathway-setup-and-form-filling-v8-2026-10-17.html'
OUT = AW + 'problem-1-pathway-setup-and-form-filling/solution-1-pathway-setup-to-form-filling.html'

if not os.path.exists(V8):
    assert os.path.exists(OLD) and 'Problem 1 · v8 ·' in open(OLD).read(), 'v8 not found to archive'
    shutil.copyfile(OLD, V8); print('archived v8 →', V8)
v8 = open(V8).read()
head = v8[:v8.index('<header class="top">')]
head = re.sub(r'<title>[^<]*</title>', '<title>Solution 1 · Pathway Setup to Form Filling</title>', head, count=1)
css = """
<style>
/* Solution 1: one reading column, visuals first, helper text small */
.wrap{max-width:1180px}
.s1h{padding:8px 0 4px;border-bottom:1px solid var(--line);margin-bottom:8px}
.kick{font-family:var(--mono);font-size:12px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.s1h h1{font-size:40px;margin:6px 0 6px}
.sub{font-size:18px;color:var(--ink);margin:0 0 12px;max-width:820px}
.s1nav{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;margin-bottom:10px} .s1nav a{color:var(--flow);text-decoration:none} .s1nav a:hover{text-decoration:underline}
.keyrow{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.k{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid}
.k-s{background:var(--studio-bg);border-color:var(--studio);color:var(--studio)} .k-c{background:var(--flow-bg);border-color:var(--flow);color:var(--flow)} .k-ai{background:var(--sheet);border-color:var(--flow);color:var(--flow);border-style:dashed} .k-r{background:var(--rules-bg);border-color:var(--rules);color:var(--rules)} .k-p{background:var(--human-bg);border-color:var(--human);color:var(--human)}
.s1{display:grid;gap:14px;margin-top:44px;scroll-margin-top:20px}
.s1 h2{font-size:26px;display:flex;align-items:center;gap:12px}
.s1 h2 .n{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--paper);font-size:16px}
.s1 .lead{color:var(--muted);margin:0;max-width:860px}
.band-s{fill:var(--studio-bg);opacity:.55} .band-c{fill:var(--flow-bg);opacity:.45} .band-t{font-size:11.5px;font-weight:700;letter-spacing:.06em;fill:var(--muted)}
.nd rect{fill:var(--sheet);stroke:var(--line);stroke-width:1.4}
.nd.s rect{stroke:var(--studio);stroke-width:1.8} .nd.c rect{stroke:var(--flow);stroke-width:1.8} .nd.st rect{fill:var(--rules-bg);stroke:var(--rules);stroke-width:1.8}
.nd.ai rect{stroke:var(--flow);stroke-dasharray:6 4;stroke-width:1.6} .nd.p rect{fill:var(--human-bg);stroke:var(--human)} .nd.r rect{fill:var(--rules-bg);stroke:var(--rules)} .nd.out rect{fill:var(--soft);stroke:var(--rules)}
svg .t{font-weight:700;font-size:13px;fill:var(--ink)} svg .ai{fill:var(--flow)} svg .p{fill:var(--human)} svg .r{fill:var(--rules)} svg .m{fill:var(--muted);font-size:11px}
ol.callouts.two{columns:2;column-gap:28px;display:block;padding-left:22px} ol.callouts.two li{break-inside:avoid;margin-bottom:8px}
ul.helper{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px}
table.asis td:first-child,table.reqt td:first-child{white-space:nowrap}
table.asis td:nth-child(2){color:var(--muted)}
.nw{font-size:11.5px;font-weight:600;color:var(--human);background:var(--human-bg);padding:1px 6px;border-radius:4px;white-space:nowrap} .cf{font-size:11.5px;font-weight:600;color:var(--stop);background:var(--stop-bg);padding:1px 6px;border-radius:4px}
.scr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}
.scr{background:var(--sheet);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto}
.scr-top{background:var(--ink);color:var(--paper);font-size:12.5px;font-weight:600;padding:7px 12px}
.scr-body{padding:10px 12px;display:grid;gap:6px;font-size:12.5px;background:var(--paper)}
.scr dl{margin:0;padding:8px 12px;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px;border-top:1px solid var(--line)} .scr dt{color:var(--muted)} .scr dd{margin:0}
.m-row{display:grid;grid-template-columns:.9fr .7fr 1fr .8fr 1.6fr;gap:4px;padding:4px 6px;border-radius:5px;background:var(--sheet)} .m-row.h{background:transparent;color:var(--muted);font-size:11px;text-transform:uppercase}
.ch{font-style:normal;font-size:11px;border:1px solid var(--flow);color:var(--flow);border-radius:4px;padding:0 4px;margin-right:3px;white-space:nowrap} .ch.d{border-style:dashed}
.m-act{justify-self:end;font-size:11.5px;color:var(--flow);font-weight:600}
.m-q{background:var(--sheet);border-radius:6px;padding:6px 8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center} .m-q b{width:100%} .m-q small{width:100%;color:var(--muted);font-size:11px} .m-q.dim{color:var(--muted)}
.m-opt{border:1px solid var(--line);border-radius:999px;padding:1px 8px} .m-opt.on{background:var(--flow);color:#fff;border-color:var(--flow)}
.m-in{border:1px solid var(--line);border-radius:5px;padding:2px 8px;background:var(--sheet)}
.m-tabs{display:flex;gap:4px} .m-tabs span{border:1px solid var(--line);border-radius:5px;padding:1px 8px} .m-tabs .on{background:var(--rules);color:#fff;border-color:var(--rules)}
.m-sec{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.m-f{display:grid;grid-template-columns:1.2fr 1fr auto;gap:6px;background:var(--sheet);border-radius:5px;padding:4px 6px} .m-f i{font-style:normal;font-size:11px;color:var(--muted)} .m-f .ok,.m-q .ok{color:var(--ok)} .m-f .bad{color:var(--stop)} .m-f.bad{background:var(--stop-bg)}
.s1foot{margin-top:48px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
@media (max-width:760px){.s1h h1{font-size:30px} ol.callouts.two{columns:1} .m-row{grid-template-columns:repeat(3,1fr)} table.asis td:first-child,table.reqt td:first-child{white-space:normal}}
</style>
"""
head = head.replace('</head><body>', css + '</head><body>', 1)
main = open(AW + 'tools/solution1-main.html').read()
proto = open(AW + 'tools/solution1-prototype.html').read()
opn = open(AW + 'tools/solution1-open.html').read()
foot = ('<footer class="s1foot">Solution 1, v1, 17 Oct 2026. Replaces the Problem 1 document (AIW-D226). Earlier versions are archived whole in '
        '<code>archive/ai-workers/</code>: v6, v7 and v8 of <code>pathway-setup-and-form-filling</code>; v8 holds the full requirement set, the SA-01B change list and the evidence tables. '
        'Team sources: SA-01B v1.4, AG-02, AG-07, AG-15 and Doc-1 v1.3 (13 Oct snapshot); code of 15 Oct; frontend of 13 Oct. Legal points: Unconfirmed, no counsel (AIW-D94). Immigration values: the immigration specialist (D50).</footer>\n')
out = head + main + proto + opn + foot + '</div></body></html>\n'
open(OUT, 'w').write(out)
print('written', OUT, len(out), 'bytes')
