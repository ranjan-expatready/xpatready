import json,sys
raw=sys.stdin.read(); i=raw.find('\n{') if not raw.startswith('{') else -1
pre=raw[:i+1] if i>=0 else ''
if pre.strip(): print(pre.strip())
d=json.loads(raw[i+1:] if i>=0 else raw)
n=int(sys.argv[1]) if len(sys.argv)>1 else 1500
print(d['ms'],'ms',d['url'],'dialog' if d['dialog'] else '',d['acting'])
print('H:',d['h'][:12]); print('B:',d['buttons'][:40]); print('L:',d['links'][:40]); print('A:',d['alerts'])
print('T:',d['text'][:n])
