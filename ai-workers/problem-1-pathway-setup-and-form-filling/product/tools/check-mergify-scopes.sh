#!/usr/bin/env bash
# Mergify scopes (P-715, design/mergify-parallel-scopes-2026-11-19.md): .mergify.yml's file scopes and barrier files
# stay true to the code. Each fenced module's scope holds its module card's own `paths:` (the cards are the one map of
# the modules, P-615), every scope and barrier pattern matches a tracked file, and the product and pipeline queues use
# one and the same "pipeline paths" pattern (P-717 (a)); the product queue waits for pr-rules (E6, P-772). Run by check-guards.sh. US$0, no network.
#   bash product/tools/check-mergify-scopes.sh
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"; ROOTD="$(cd "$TOOLS/../../../.." && pwd)"
python3 -I - "$ROOTD" <<'PY'
import os, re, subprocess, sys, yaml
root = sys.argv[1]; bad = []; n = 0
def braces(p):
    m = re.search(r"\{([^{}]*)\}", p)
    return [p] if not m else [x for a in m.group(1).split(",") for x in braces(p[:m.start()] + a + p[m.end():])]
def rx(g):
    o, i = "", 0
    while i < len(g):
        if g.startswith("**/", i): o += "(?:.*/)?"; i += 3
        elif g.startswith("**", i): o += ".*"; i += 2
        elif g[i] == "*": o += "[^/]*"; i += 1
        else: o += re.escape(g[i]); i += 1
    return re.compile(o + r"\Z")
cfg = yaml.safe_load(open(os.path.join(root, ".mergify.yml")))
files = subprocess.run(["git", "-C", root, "ls-files"], capture_output=True, text=True, check=True).stdout.split()
sc = (cfg.get("scopes") or {}); src = ((sc.get("source") or {}).get("files") or {})
CARDS = {"platform": "api-platform", "front-office": "api-front-office", "money": "api-client-money",
         "case-side": "api-cases", "forms-engine": "api-forms"}
for scope, card in CARDS.items():
    n += 1
    text = open(os.path.join(root, ".claude/rules/modules", card + ".md"), encoding="utf-8").read()
    want = {x for p in re.findall(r'^\s*-\s*"([^"]+)"\s*$', text.split("---")[1], re.M) for x in braces(p)}
    have = set((src.get(scope) or {}).get("include") or [])
    miss = sorted(want - have)
    if miss: bad.append(f"scope {scope}: lacks its card {card}'s paths {miss[:3]}{' …' if len(miss) > 3 else ''}")
for name, pats in [(k, (v or {}).get("include") or []) for k, v in src.items()] + [("barrier_files", (sc.get("barrier_files") or {}).get("include") or [])]:
    for g in pats:
        n += 1
        if not any(rx(g).match(f) for f in files):
            bad.append(f"{name}: {g} matches no tracked file")
conds = {q["name"]: [c for c in q.get("queue_conditions") or [] if isinstance(c, str)] for q in cfg.get("queue_rules") or []}
pp = [c.split("~=", 1)[1].strip() for c in conds.get("product", []) if c.replace(" ", "").startswith("files~=^(?!")]
pl = [c.split("~=", 1)[1].strip() for c in conds.get("pipeline", []) if c.replace(" ", "").startswith("-files~=^(?!")]
n += 1
if not (pp and pl and pp == pl): bad.append(f"the product and pipeline queues do not share one pipeline pattern: {pp} / {pl}")
else:
    r = re.compile(pp[0])
    for f, pipe in ((".github/workflows/ci.yml", True), ("ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/x.sh", True),
                    ("ai-workers/problem-1-pathway-setup-and-form-filling/product/STATE.md", False),
                    ("ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/api/src/core.ts", False)):
        n += 1
        if (r.search(f) is None) != pipe: bad.append(f"pipeline pattern: {f} is{'' if pipe else ' not'} pipeline work, read the other way")
# The pipeline scope and the pipeline pattern name the same paths (review, round 1).
    pinc = [rx(g) for g in (src.get("pipeline") or {}).get("include") or []]
    for f in (".github/workflows/ci.yml", ".githooks/pre-push", ".mergify.yml", ".claude/skills/next/SKILL.md", "AGENTS.md",
              "CLAUDE.md", "ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/x.sh"):
        n += 1
        if not any(p.match(f) for p in pinc): bad.append(f"pipeline scope: {f} is pipeline work by the queue pattern, not by the scope")
        if r.search(f) is not None: bad.append(f"pipeline pattern: {f} is in the pipeline scope, not pipeline work by the pattern")
# E6 (P-772): the product queue waits for a green pr-rules (body and size rules), as a plain top-level condition (inside an
# "or" another branch could satisfy it), next to ci. Undo with the .mergify.yml line, then this check.
n += 1
pc = [c.replace(" ", "") for c in conds.get("product", [])]
if "check-success=pr-rules" not in pc or "check-success=ci" not in pc:
    bad.append("the product queue does not wait for both check-success = pr-rules (E6, P-772) and check-success = ci")
# ... and pr-rules must then run on every PR that can reach that queue: its job never skips on a label read from the event
# (records-label.yml drops "records" on the same push that adds code; no run follows a GITHUB_TOKEN label change).
n += 1
pr = yaml.safe_load(open(os.path.join(root, ".github/workflows/pr-rules.yml"), encoding="utf-8"))
jif = str(((pr.get("jobs") or {}).get("pr-rules") or {}).get("if", ""))
if "label" in jif: bad.append(f"pr-rules.yml: the job skips on a label ({jif}), so a product PR can wait for a check that never runs")
for b in bad: print(f"FAIL  {b}")
print(f"{'PASS' if not bad else 'FAIL'}  mergify scopes: {n} checks")
sys.exit(1 if bad else 0)
PY
