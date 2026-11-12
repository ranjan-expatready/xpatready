import re, os, csv, subprocess, collections
exec(open("c10_span.py").read().split("both=0")[0]); flow=list(csv.DictReader(open(E+"flow-2026-11-02-to-12-app-flow.tsv"),delimiter="\t"))
LANE={'structure':'cfg-author','sources':'cfg-author','library':'cfg-author','questionnaire-design':'cfg-author','release':'cfg-release',
 'case-core':'case-people','case-questionnaire':'case-people','case-documents':'case-docs','case-forms':'case-forms','case-submission':'case-forms','platform':'platform','ai-gateway':'platform'}
span=collections.Counter(); pair=collections.Counter(); hubs=0
for r in flow:
    fl=subprocess.run(['git','-C',repo,'diff','--name-only',f"{hs[r['pr']]}^1",hs[r['pr']]],capture_output=True,text=True).stdout.split()
    app=[f.split(studio+'/',1)[1] for f in fl if APP.match(f)]
    ls=set()
    for f in app:
        b=os.path.splitext(os.path.basename(f))[0]
        if b in HUBS: continue
        m=mod(f)
        if m in LANE: ls.add(LANE[m])
    span[min(len(ls),4)]+=1
    for a in ls:
        for b in ls:
            if a<b: pair[(a,b)]+=1
print('lanes touched per app PR (hubs excluded):',dict(sorted(span.items())))
print(pair.most_common(6))
