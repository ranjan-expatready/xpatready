import subprocess, re, csv, collections
repo='$REPO'
E=repo+'/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
def g(*a): return subprocess.run(['git','-C',repo,*a],capture_output=True,text=True).stdout
flow=[r['pr'] for r in csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t')]
hs={}
for l in g('log','origin/main','--first-parent','--merges','--since=2026-10-25','--format=%H %s').splitlines():
    m=re.match(r'(\w+) Merge pull request #(\d+)',l)
    if m: hs[m.group(2)]=m.group(1)
mainset=set(g('rev-list','--first-parent','origin/main').split())
msgs=collections.Counter(); conf=collections.Counter(); prs=set()
for pr in flow:
    h=hs[pr]
    for mc in g('rev-list','--merges',f'{h}^1..{h}^2').split():
        ps=g('rev-list','--parents','-n1',mc).split()
        if ps[2] in mainset: continue
        s=g('log','-1','--format=%s',mc).strip()
        s2=re.sub(r'[0-9a-f]{7,}','<sha>',s); s2=re.sub(r"'[^']*'","'<x>'",s2)
        msgs[s2[:70]]+=1; prs.add(pr)
        rc=subprocess.run(['git','-C',repo,'merge-tree','--write-tree','--name-only','--no-messages',ps[1],ps[2]],capture_output=True).returncode
        conf[rc]+=1
        # is parent2 reachable from main at all (main ancestor but not first-parent)?
print('PRs with non-main merges',len(prs)); print(conf); 
for k,v in msgs.most_common(12): print(v,k)
