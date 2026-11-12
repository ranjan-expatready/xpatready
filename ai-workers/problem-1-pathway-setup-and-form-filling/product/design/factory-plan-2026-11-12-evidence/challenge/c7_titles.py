import csv, json, re, collections
E='$REPO/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
flow={int(r['pr']):r for r in csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t')}
pulls={p['number']:p for p in json.load(open('$TMP/pulls.json'))}
cat=collections.Counter(); ex=collections.defaultdict(list); caps=collections.Counter()
early=collections.Counter(); late=collections.Counter()
for n,r in flow.items():
    t=pulls[n]['title']; b=pulls[n]['head']['ref']; s=t+' '+b
    cs=set(re.findall(r'\bC\d{1,2}\.\d{1,2}\b',s))
    if cs: k='names a capability row'; [caps.__setitem__(c,caps[c]+1) for c in cs]
    elif re.search(r'(?i)\bBK-?\d',s): k='backlog row BK-n'
    elif re.search(r'(?i)\bQA-?\d',s): k='qa bug QA-n'
    elif re.search(r'(?i)\bB\d{2,3}\b',s): k='pipeline/bake B-n'
    elif re.search(r'(?i)\bM[2-4]\b',s): k='milestone row'
    else: k='other'
    cat[k]+=1; ex[k].append(t[:70])
    (early if r['merged_ist_day']<='2026-11-06' else late)[k]+=1
print(cat); print('2-6 Nov',early); print('7-12 Nov',late)
print('distinct capability rows named',len(caps),'PRs per named row median',sorted(caps.values())[len(caps)//2], 'max',caps.most_common(5))
for k in ex: print('##',k, ex[k][:6])
