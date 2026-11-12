# Landmark comparison: a conflicted PR's time after its first conflicted merge vs the remaining time of
# conflict-free PRs (same size band) that were still open at the same age. Removes "long-lived PRs conflict more" bias.
import csv, statistics as st
rows=list(csv.DictReader(open('c1_out.tsv'),delimiter='\t'))
E='$REPO/ai-workers/problem-1-pathway-setup-and-form-filling/product/design/factory-plan-2026-11-12-evidence/'
flow={r['pr']:r for r in csv.DictReader(open(E+'flow-2026-11-02-to-12-app-flow.tsv'),delimiter='\t')}
def band(l): l=int(l); return 0 if l<200 else 1 if l<500 else 2 if l<1000 else 3
clean=[(float(flow[r['pr']]['open_to_merge_h']),band(flow[r['pr']]['app_lines'])) for r in rows if r['conf']=='0']
ex=[];exb=[];n_nomatch=0; naive=[]
for r in rows:
    if r['conf']=='0': continue
    a=float(r['first_conf_h_after_open']); tot=float(flow[r['pr']]['open_to_merge_h']); after=tot-a; b=band(flow[r['pr']]['app_lines'])
    rem=[t-a for t,bb in clean if t>a and bb==b]
    rem_any=[t-a for t,bb in clean if t>a]
    if len(rem)>=5: ex.append(after-st.median(rem))
    elif len(rem_any)>=5: ex.append(after-st.median(rem_any)); n_nomatch+=1
    else: n_nomatch+=1; ex.append(after)  # no comparator: count all as excess (upper bound)
print('conflicted PRs',len(ex),'without same-band comparator',n_nomatch)
print('landmark excess hours: sum',round(sum(ex)),'median per PR',round(st.median(ex),2),'sum of positives only',round(sum(x for x in ex if x>0)))
big=[r for r in rows if r['conf']!='0' and band(flow[r['pr']]['app_lines'])==3]
print('>1000-line conflicted PRs: after-first-conflict hours', [round(float(flow[r['pr']]['open_to_merge_h'])-float(r['first_conf_h_after_open']),1) for r in big])
