import subprocess, re, csv, collections, json, statistics as st
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
hs={}
for l in g('log','origin/main','--first-parent','--merges','--since=2026-10-25','--format=%H %s')[1].splitlines():
    m=re.match(r'(\w+) Merge pull request #(\d+)',l)
    if m: hs[m.group(2)]=m.group(1)
mainset=set(g('rev-list','--first-parent','origin/main')[1].split())
# approvals
appr=collections.defaultdict(list)
for c in json.load(open('$TMP/comments.json')):
    n=c['issue_url'].rsplit('/',1)[1]
    if n in flow and re.search(r'Reviewer:\s*Approve',c['body'] or ''): appr[n].append(ts(c['created_at']))
mainconf=0; mainappconf=0; nonmain_only=0; res={}
before_appr=0; after_appr=0
mom_clean_prs=0; mom_clean_merges=0
for pr in flow:
    h=hs[pr]; mc_conf=[]; nm_conf=0; clean_main=0
    for mc in g('rev-list','--merges',f'{h}^1..{h}^2')[1].split():
        ps=g('rev-list','--parents','-n1',mc)[1].split()
        rc,mt=g('merge-tree','--write-tree','--name-only','--no-messages',ps[1],ps[2])
        onm=ps[2] in mainset
        if rc==1:
            fs=[x.replace(S,'') for x in mt.splitlines()[1:] if x.strip()]
            ct=ts(g('log','-1','--format=%cI',mc)[1].strip())
            if onm: mc_conf.append((ct,fs))
            else: nm_conf+=1
        elif onm: clean_main+=1
    if mc_conf:
        mainconf+=1
        if any(APP.match(f) for c in mc_conf for f in c[1]): mainappconf+=1
        if appr[pr]:
            if min(c[0] for c in mc_conf) < min(appr[pr]): before_appr+=1
            else: after_appr+=1
    elif nm_conf: nonmain_only+=1
    if clean_main and not mc_conf and not nm_conf: mom_clean_prs+=1; mom_clean_merges+=clean_main
print('PRs with conflict on a merge of main:',mainconf,'; of which an app file:',mainappconf,'; PRs whose only conflicts were non-main merges:',nonmain_only)
print('first main-conflict before first Approve:',before_appr,'after:',after_appr)
print('PRs merging main only clean (no conflict at all):',mom_clean_prs,'merges',mom_clean_merges)
