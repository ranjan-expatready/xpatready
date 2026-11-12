#!/bin/bash
# w.sh <shot> '<js>' [chars] [width]
cd "$(dirname "$0")"
out=$(W=${4:-1440} node drive.mjs "$1" "$2" full)
N=${3:-2500}
printf '%s\n' "$out" | python3 -c '
import json,sys
raw=sys.stdin.read(); i=raw.find("{\n")
pre=raw[:i].strip()
if pre: print("PRE:",pre)
d=json.loads(raw[i:raw.rfind("}")+1])
print("URL",d["url"],"| title",d["title"],"| acting",d["acting"],"| dialog",d["dialog"],"|",d["ms"],"ms")
print("H",d["h"][:14]); print("ALERTS",d["alerts"]); print("BUTTONS",d["buttons"][:45])
print("TEXT",d["text"][:int(sys.argv[1])])' "$N"
