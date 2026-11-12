import re, os, glob, random
D='$REPO/ai-workers/problem-1-pathway-setup-and-form-filling/domain/requirements-2026-11-02/02-functional-requirements/'
lines=[]
for f in glob.glob(D+'*/*.md'):
    b=os.path.basename(f); m=re.match(r'(AG|SA)-0?(\d+)(B?)-',b)
    if not m: continue
    pre=f'{m.group(1)}-{int(m.group(2))}{m.group(3)}'
    seen=set()
    for line in open(f,encoding='utf-8',errors='replace'):
        mm=re.match(rf'^\s*(?:[-*]\s+|\|\s*|#{{2,4}}\s+)?(~~)?\**({re.escape(pre)}-\d+[a-z]?)\b',line)
        if not mm or mm.group(1) or 'Withdrawn' in line[:200] or mm.group(2) in seen: continue
        seen.add(mm.group(2)); lines.append((pre,re.sub(r'\*|\(changed[^)]*\)|\(new[^)]*\)|\(added[^)]*\)','',line.strip())[:230]))
random.seed(502); s=random.sample(lines,40)
for i,(p,l) in enumerate(s): print(i,l)
print(len(lines))
