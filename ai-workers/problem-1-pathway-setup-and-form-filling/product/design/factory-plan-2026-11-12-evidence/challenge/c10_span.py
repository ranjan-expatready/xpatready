# For PRs touching configurator and case-delivery modules (hubs excluded, same map), what files carry the link?
import re, os, csv, subprocess, collections
repo='$REPO'
E=repo+'/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
studio='ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio'
rules=[(l.split('\t')[0],re.compile(l.split('\t')[1].strip())) for l in open(E+'module-map.tsv') if l.strip() and not l.startswith(('#','module\t'))]
def mod(rel):
    if rel.startswith('prisma/'): return 'schema'
    b=os.path.splitext(os.path.basename(rel))[0]
    if '/features/checkpoint/' in '/'+rel: return 'demo-data'
    if '/features/placement/' in '/'+rel: return 'library'
    for n,rx in rules:
        if rx.match(b): return n
    return 'UNMAPPED'
HUBS={'main','core','studio','validate','render','routes-data','App','api','utils'}
CONF={'structure','sources','library','questionnaire-design','release'}; CASE={'case-core','case-questionnaire','case-documents','case-forms','case-submission'}
APP=re.compile(r'^'+re.escape(studio)+r'/(api/src|web/src|engine|prisma|contracts|samples|packages)/')
hs={}
for l in subprocess.run(['git','-C',repo,'log','origin/main','--first-parent','--merges','--since=2026-10-25','--format=%H %s'],capture_output=True,text=True).stdout.splitlines():
    m=re.match(r'(\w+) Merge pull request #(\d+)',l)
    if m: hs[m.group(2)]=m.group(1)
both=0; snap=0; layer=collections.Counter(); confonly_layers=collections.Counter(); nfiles=[]
flow=list(csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t'))
single_layer_multi_mod=0; multi=0
for r in flow:
    fl=subprocess.run(['git','-C',repo,'diff','--name-only',f"{hs[r['pr']]}^1",hs[r['pr']]],capture_output=True,text=True).stdout.split()
    app=[f.split(studio+'/',1)[1] for f in fl if APP.match(f)]
    ms={}
    for f in app:
        b=os.path.splitext(os.path.basename(f))[0]
        if b in HUBS: continue
        m=mod(f)
        if m in ('demo-data','schema','UNMAPPED'): continue
        ms.setdefault(m,set()).add(f.split('/')[0] if not f.startswith(('api/','web/')) else '/'.join(f.split('/')[:2]))
    if len(ms)>=2:
        multi+=1
        # do modules differ only because one PR has api+web+engine pieces with different basenames?
    if set(ms)&CONF and set(ms)&CASE:
        both+=1
        if any(f.endswith('engine/snapshot.ts') or f.startswith('contracts/') for f in app): snap+=1
        nfiles.append(len(app))
print('app PRs',len(flow),'touch >=2 modules',multi,'both sides',both,'of which also touch engine/snapshot.ts or contracts/',snap)
import statistics as st; print('both-sides PRs: median app files',st.median(nfiles))
