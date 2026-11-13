exec(open("c10_span.py").read().split("both=0")[0]); flow=list(csv.DictReader(open(E+"flow-2026-11-02-to-12-app-flow.tsv"),delimiter="\t"))
import collections
a=collections.Counter(); b=collections.Counter(); webonly=collections.Counter()
for r in flow:
    fl=subprocess.run(['git','-C',repo,'diff','--name-only',f"{hs[r['pr']]}^1",hs[r['pr']]],capture_output=True,text=True).stdout.split()
    app=[f.split(studio+'/',1)[1] for f in fl if APP.match(f)]
    ms=set(); msb=set()
    for f in app:
        bn=os.path.splitext(os.path.basename(f))[0]
        if bn in HUBS: continue
        m=mod(f)
        if m in ('demo-data','schema','UNMAPPED','platform'): continue
        ms.add(m)
        if not f.startswith('web/'): msb.add(m)
    a[min(len(ms),3)]+=1; b[min(len(msb),3)]+=1
print('excluding platform too: modules per PR',dict(sorted(a.items())),' >=2:',sum(v for k,v in a.items() if k>=2))
print('backend+engine+contracts only (web ignored), excl platform: ',dict(sorted(b.items())),' >=2:',sum(v for k,v in b.items() if k>=2))
