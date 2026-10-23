# Checks the AIW-D216 split: every text unit of v5 and the engine page appears, word for word, in one of the two problem documents.
import re, html, json
from html.parser import HTMLParser
AW = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/'; ARC = '/Users/ranjansingh/Desktop/Xpatready/archive/ai-workers/'
UNIT = {'h1','h2','h3','h4','li','tr','p','summary','td','th','b','span','a','small','figcaption','div','text'}
class U(HTMLParser):
    def __init__(s): super().__init__(); s.st=[]; s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in ('script','style'): s.skip+=1
        s.st.append([t,[]])
    def handle_endtag(s,t):
        if t in ('script','style'): s.skip=max(0,s.skip-1)
        while s.st:
            tag,buf=s.st.pop(); txt=' '.join(' '.join(buf).split())
            if s.st: s.st[-1][1].append(txt)
            if tag in UNIT and txt: s.out.append(txt)
            if tag==t: break
    def handle_data(s,d):
        if not s.skip and s.st: s.st[-1][1].append(d)
def units(p):
    u=U(); u.feed(open(p).read()); return u.out
new=set(units(AW+'problem-1-pathway-setup-and-form-filling/pathway-setup-and-form-filling.html'))|set(units(AW+'problem-2-ai-across-case-and-business/ai-across-case-and-business.html'))
newtext=' '.join(new)
rep={}
for name,p in [('v5',ARC+'expat-ready-ai-concept-v5-2026-10-17.html'),('engine',ARC+'form-filling-engine-v1-2026-10-17.html')]:
    us=list(dict.fromkeys(units(p))); miss=[x for x in us if x not in new and x not in newtext]
    rep[name]={'units':len(us),'missing':miss}
    print(name,'units',len(us),'missing',len(miss)); [print('  -',m[:140]) for m in miss[:15]]
json.dump(rep,open(AW+'checks/v6-split-check-2026-10-17.json','w'),indent=1)
