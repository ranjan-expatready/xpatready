# Recount requirement IDs: classify each counted ID's first line by form, and flag merged/moved/superseded/pointer lines.
import re, os, glob, collections
D='$REPO/ai-workers/problem-1-pathway-setup-and-form-filling/domain/requirements-2026-11-02/02-functional-requirements/'
tot=collections.Counter(); per={}
GRP={'A':['SA-1','SA-1B','SA-5'],'B':['AG-3','AG-7','AG-8','AG-9','AG-15','AG-17','AG-19'],'C':['AG-2','AG-4','AG-5','AG-6','AG-10','AG-11','AG-12','AG-13','AG-14']}
for f in sorted(glob.glob(D+'*/*.md')):
    b=os.path.basename(f); m=re.match(r'(AG|SA)-0?(\d+)(B?)-',b)
    if not m: continue
    pre=f'{m.group(1)}-{int(m.group(2))}{m.group(3)}'
    live={}; wd=set(); allids=set()
    for line in open(f,encoding='utf-8',errors='replace'):
        allids.update(re.findall(rf'\b{re.escape(pre)}-\d+[a-z]?\b',line))
        mm=re.match(rf'^\s*(?:[-*]\s+|\|\s*|#{{2,4}}\s+)?(~~)?\**({re.escape(pre)}-\d+[a-z]?)\b',line)
        if not mm: continue
        fid=mm.group(2)
        if mm.group(1) or re.search(r'\bWithdrawn\b',line[:200]): wd.add(fid); continue
        live.setdefault(fid,line)
    for k in wd: live.pop(k,None)
    c=collections.Counter()
    for fid,l in live.items():
        s=l.strip()
        if re.search(r'(?i)\b(merged into|moved to|superseded|removed|retired|replaced by|folded into)\b',s[:250]): c['merged/moved']+=1
        elif re.search(r'(?i)\(pointer|pointer\)|pointer to|\bpointer\b',s[:120]): c['pointer']+=1
        elif s.startswith('|'): c['table row']+=1
        elif s.startswith('#'): c['card heading']+=1
        elif re.search(r'\bSHALL\b',s): c['SHALL line']+=1
        else: c['other line']+=1
    per[pre]=(len(live),c,len(allids))
    tot.update(c)
print('TOTAL live',sum(v[0] for v in per.values()),dict(tot))
for g,ms in GRP.items():
    cc=collections.Counter(); n=0
    for mname in ms: n+=per[mname][0]; cc.update(per[mname][1])
    print(g,n,dict(cc))
for k,(n,c,a) in per.items(): print(k,n,dict(c),'distinct ids mentioned anywhere',a)
