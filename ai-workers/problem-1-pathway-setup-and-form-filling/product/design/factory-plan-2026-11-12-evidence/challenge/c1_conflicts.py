# Re-check the conflict replay: which inner merges, what parent 2 is, which file groups conflicted, timing of first conflict.
import subprocess, sys, re, csv, json, collections, statistics as st
from datetime import datetime
repo='$REPO'
E=repo+'/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
S='ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/'
APP=re.compile(r'^(api/src|web/src|engine|prisma|contracts|samples|packages)/')
def g(*a):
    p=subprocess.run(['git','-C',repo,*a],capture_output=True,text=True); return p.returncode,p.stdout
flow={r['pr']:r for r in csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t')}
pulls={str(p['number']):p for p in json.load(open('$TMP/pulls.json'))}
ts=lambda s: datetime.fromisoformat(s.replace('Z','+00:00'))
_,log=g('log','origin/main','--first-parent','--merges','--since=2026-10-25','--format=%H %s')
hs={}
for l in log.splitlines():
    m=re.match(r'(\w+) Merge pull request #(\d+)',l)
    if m: hs[m.group(2)]=m.group(1)
_,mainlist=g('rev-list','--first-parent','origin/main')
mainset=set(mainlist.split())
stats=collections.Counter(); app_conf_prs=0; any_conf=0; only_rec=0
p2kind=collections.Counter(); msgkind=collections.Counter()
before=[];after=[]; octo=0
out=open('c1_out.tsv','w'); out.write('pr\tinner\tconf\tapp_conf\tp2_on_main\tfirst_conf_h_after_open\tconf_files\n')
for pr,r in flow.items():
    h=hs[pr]; _,inner=g('rev-list','--merges',f'{h}^1..{h}^2'); inner=inner.split()
    confs=[]; appc=False; p2m=0
    for mc in inner:
        _,ps=g('rev-list','--parents','-n1',mc); ps=ps.split()
        if len(ps)>3: octo+=1
        on_main = ps[2] in mainset
        p2m+=on_main; p2kind['p2 on main first-parent' if on_main else 'p2 elsewhere']+=1
        _,msg=g('log','-1','--format=%s',mc); 
        k='main' if re.search(r"branch 'main'|origin/main|remote-tracking branch 'origin/main'|of .*main",msg) else 'other'
        msgkind[(k,on_main)]+=1
        rc,mt=g('merge-tree','--write-tree','--name-only','--no-messages',ps[1],ps[2])
        if rc==1:
            fs=[x.replace(S,'') for x in mt.splitlines()[1:] if x.strip()]
            _,ct=g('log','-1','--format=%cI',mc)
            confs.append((ct.strip(),fs))
            if any(APP.match(f) for f in fs): appc=True
    if confs:
        any_conf+=1
        if appc: app_conf_prs+=1
        first=min(ts(c[0]) for c in confs); p=pulls[pr]
        b=(first-ts(p['created_at'])).total_seconds()/3600; a=(ts(p['merged_at'])-first).total_seconds()/3600
        before.append(b); after.append(a)
    out.write(f"{pr}\t{len(inner)}\t{len(confs)}\t{int(appc)}\t{p2m}\t{before[-1] if confs else ''}\t{';'.join(sorted(set(f for c in confs for f in c[1])))}\n")
print('app PRs',len(flow),'any conflict',any_conf,'conflict incl an app file',app_conf_prs)
print('inner merge parent-2:',dict(p2kind),'octopus',octo)
print('msg kind x on main:',dict(msgkind))
print('conflicted PRs: hours open before first conflicted merge median',round(st.median(before),2),'mean',round(st.mean(before),2),'sum',round(sum(before)),
      '| after first conflict to merge median',round(st.median(after),2),'sum',round(sum(after)))
