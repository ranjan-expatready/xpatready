#!/bin/bash
# w.sh <shot> '<js>' [chars]  — run drive.mjs and print a compact summary
cd "$(dirname "$0")"
out=$(node drive.mjs "$1" "$2" full)
N=${3:-2500}
printf '%s\n' "$out" | python3 -c '
import json,sys
raw=sys.stdin.read(); i=raw.find("{\n")
pre=raw[:i].strip()
if pre: print("PRE:",pre)
d=json.loads(raw[i:raw.rfind("}")+1])
print("URL",d["url"],"| acting",d["acting"],"| dialog",d["dialog"],"|",d["ms"],"ms")
print("H",d["h"][:12]); print("ALERTS",d["alerts"]); print("BUTTONS",d["buttons"][:40])
print("TEXT",d["text"][:int(sys.argv[1])])' "$N"
