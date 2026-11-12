import subprocess, re, collections
from datetime import datetime, timedelta, timezone
repo='$REPO'
F='ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/CAPABILITIES.md'
IST=timezone(timedelta(hours=5,minutes=30))
log=subprocess.run(['git','-C',repo,'log','origin/main','--first-parent','--reverse','--format=%H %cI','--',F],capture_output=True,text=True).stdout.split('\n')
prev={}; ever=set(); first={}; endofday={}; ms_of={}
for l in filter(None,log):
    h,t=l.split(); day=datetime.fromisoformat(t).astimezone(IST).date()
    txt=subprocess.run(['git','-C',repo,'show',f'{h}:{F}'],capture_output=True,text=True).stdout
    cur={}
    for row in txt.splitlines():
        m=re.match(r'^\|\s*(C\d+\.\d+)\s*\|[^|]*\|[^|]*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|',row)
        if m: cur[m.group(1)]=(m.group(2),m.group(3))
    for k,(ms,s) in cur.items():
        if s.startswith('Works') and k not in ever: ever.add(k); first[k]=day
        ms_of[k]=ms
    prev=cur; endofday[day]=dict(cur)
print('first commit',log[0][:60]); 
gone=[k for k in ever if k not in prev]; print('IDs that reached Works but are no longer in the file:',len(gone),gone[:10])
print('day | rows | Works | not-Works at end of day | first-time Works that day')
fd=collections.Counter(first.values())
for d in sorted(endofday):
    if str(d)<'2026-11-01': continue
    c=endofday[d]; w=sum(1 for v in c.values() if v[1].startswith('Works'))
    print(d,len(c),w,len(c)-w,fd.get(d,0))
print('milestones of non-Works now:',collections.Counter(ms_of[k] for k,v in prev.items() if not v[1].startswith('Works')))
print('first-time Works by milestone 2-11 Nov:',collections.Counter(ms_of[k] for k,d in first.items() if '2026-11-02'<=str(d)<='2026-11-11'))
