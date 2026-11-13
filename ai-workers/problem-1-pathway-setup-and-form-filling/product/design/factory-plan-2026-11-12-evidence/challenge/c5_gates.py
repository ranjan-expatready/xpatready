import csv, json, re, collections, statistics as st
from datetime import datetime, timedelta, timezone
IST=timezone(timedelta(hours=5,minutes=30))
E='$REPO/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
flow={int(r['pr']):r for r in csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t')}
ts=lambda s: datetime.fromisoformat(s.replace('Z','+00:00'))
pulls={p['number']:p for p in json.load(open('$TMP/pulls.json'))}
appr=collections.defaultdict(list); approvers=collections.Counter(); anyrev=collections.defaultdict(list)
for c in json.load(open('$TMP/comments.json')):
    n=int(c['issue_url'].rsplit('/',1)[1])
    if n not in flow: continue
    b=c['body'] or ''
    if re.search(r'Reviewer:\s*Approve',b): appr[n].append(ts(c['created_at']))
    if re.search(r'(?i)approve',b[:300]): anyrev[n].append(ts(c['created_at']))
ev=json.load(open('$TMP/events.json'))
evmin=min(ts(e['created_at']) for e in ev); print('events reach back to',evmin.astimezone(IST))
lab=collections.defaultdict(list)
for e in ev:
    n=e['issue']['number'] if e.get('issue') else None
    if n in flow and e['event']=='labeled' and e['label']['name']=='review: approved': lab[n].append(ts(e['created_at']))
both=[n for n in flow if appr[n] and lab[n]]
byday=collections.Counter(); tot=collections.Counter()
for n,r in flow.items():
    tot[r['merged_ist_day']]+=1
    if n in both: byday[r['merged_ist_day']]+=1
print('day  in-sample/all:',[(d[5:],byday[d],tot[d]) for d in sorted(tot)])
print('no Approve comment:',sum(1 for n in flow if not appr[n]),' no label event:',sum(1 for n in flow if not lab[n]),' loose approve text but no strict:',sum(1 for n in flow if anyrev[n] and not appr[n]))
h=lambda ns:[float(flow[n]['open_to_merge_h']) for n in ns]
rest=[n for n in flow if n not in both]
print('open->merge median: in-sample',round(st.median(h(both)),2),' others',round(st.median(h(rest)),2))
# approve after label? and approve->label distribution where label precedes approve
neg=sum(1 for n in both if min(lab[n])<min(appr[n])); print('label before first Approve (negative wait):',neg)
s2=sorted((min(lab[n])-min(appr[n])).total_seconds()/3600 for n in both)
print('neg waits clipped? min',round(s2[0],2))
# approve->label for PRs whose first approve was followed by a later approve (re-review) 
multi=[n for n in both if len(appr[n])>1]
print('PRs with >1 Approve comment',len(multi))
# alternative: last approve before first label -> first label
alt=[]
for n in both:
    l1=min(lab[n]); prior=[a for a in appr[n] if a<=l1]
    alt.append(((l1-max(prior)).total_seconds()/3600) if prior else 0)
print('last Approve before label -> label: median',round(st.median(alt),2),'excess>1h sum',round(sum(max(0,x-1) for x in alt)),'over 3h',sum(1 for x in alt if x>3))
print('first Approve->label excess>1h sum',round(sum(max(0,x-1) for x in s2)), 'excess>0 sum', round(sum(max(0,x) for x in s2)))
