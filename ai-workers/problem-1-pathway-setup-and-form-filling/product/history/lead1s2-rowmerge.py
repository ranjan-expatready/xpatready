#!/usr/bin/env python3
"""Resolve a conflicted records file by row: start from main's version (stage 3),
re-apply the PR's own changes (stage 2 vs base stage 1). Table rows are keyed by their
first cell; other lines by their text. Prints a warning when both sides changed one row."""
import subprocess, sys, re

def stage(n, path):
    r = subprocess.run(["git", "show", f":{n}:{path}"], capture_output=True, text=True)
    return r.stdout.splitlines() if r.returncode == 0 else []

def key(line):
    m = re.match(r"^\|\s*([^|]+?)\s*\|", line)
    if m and not set(m.group(1)) <= set("-: "):
        return "ROW:" + m.group(1)
    return "TXT:" + line

path = sys.argv[1]
base, ours, theirs = stage(1, path), stage(2, path), stage(3, path)
bk = {key(l): l for l in base}
ok = {key(l): l for l in ours}
res = list(theirs)
warn = []
# deletions made by the PR
for k, l in bk.items():
    if k not in ok:
        idx = [i for i, x in enumerate(res) if key(x) == k]
        for i in reversed(idx):
            if res[i] == l: del res[i]
            else: warn.append("PR deleted a row main changed: " + k[:60])
# changes and additions made by the PR
for j, l in enumerate(ours):
    k = key(l)
    if k in bk and bk[k] == l:
        continue  # unchanged by the PR
    idx = [i for i, x in enumerate(res) if key(x) == k]
    if idx:
        i = idx[0]
        if k in bk and res[i] != bk[k] and res[i] != l:
            warn.append("both changed: " + k[:60])
        res[i] = l
    else:
        # insert after the nearest earlier line of ours that is in res
        pos = len(res)
        for p in range(j - 1, -1, -1):
            pk = key(ours[p])
            hits = [i for i, x in enumerate(res) if key(x) == pk]
            if hits:
                pos = hits[0] + 1; break
        else:
            pos = 0
        res.insert(pos, l)
open(path, "w").write("\n".join(res) + "\n")
for w in warn: print("WARN", path, w)
print("resolved", path, len(res), "lines")
